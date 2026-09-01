/* Radar under the cone — the weather.com view, on one map.
 *
 * Asked for directly (Patrick, 2026-08-31, with a weather.com Houston radar
 * screenshot: the rain, the forecast track and the cone on the same picture).
 * That is a DIFFERENT map from the Houston-anchored one removed from this page
 * earlier the same day: that one drew the track over an empty basemap, so it
 * answered "where is the storm" — which the cards already answer in words —
 * and nothing else. Rain is the thing a picture can say and a card cannot.
 *
 * So the two layers are the whole point and neither is decoration:
 *
 *   RADAR   RainViewer composites, 80 minutes back and 30 forward, animated.
 *           Where the weather actually is right now.
 *   TRACK   NHC's forecast track and cone for every active system, plus the
 *           graphical-outlook formation areas. Where it is going.
 *
 * Everything here is KEYLESS — Esri basemap, RainViewer radar, NHC via our own
 * backend — for the same reason /drive is: a storm map that goes blank because
 * a key expired is worse than no storm map, and it would go blank on exactly
 * the week it is needed.
 *
 * Leaflet is already a dependency (/hrw, /drive). This file is React.lazy()'d by
 * index.jsx — the same shape /drive's Radar.jsx uses — so leaflet stays out of
 * the bundle every bullionventuresllc.com visitor downloads.
 *
 * The basemap and the radar frame index are both shared with /drive — see
 * src/lib/basemap.js and src/lib/rainviewer.js for the tile-server traps each
 * of them encodes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RADAR_MAX_NATIVE_ZOOM, fetchRadarFrames } from "../../lib/rainviewer.js";
import { BASEMAP_URL, LABELS_URL } from "../../lib/basemap.js";
import {
  CLASS_LABEL,
  HOUSTON,
  category,
  chanceColor,
  classColor,
  disturbanceTitle,
  ktToMph,
} from "./storms";

// Slower than /drive's 480ms. That loop plays under a driver's glance; this one
// is read against a cone, and a frame you cannot follow to the next is not a
// forecast you can follow either.
const FRAME_MS = 700;
// Radar over a dark basemap. Any more and the coastline it has to be placed
// against disappears underneath it.
const RADAR_OPACITY = 0.8;
// RainViewer publishes a new frame every 10 minutes; the page's own storm
// refresh is 5, so matching it keeps one clock on the card.
const FRAMES_REFRESH_MS = 5 * 60 * 1000;

const FIT = { padding: [30, 30], maxZoom: 8 };

/* Two framings, because they answer different questions. "Near me" is the one
 * this page is for; "All systems" exists because a storm three days out in the
 * open ocean is off the near view entirely, and not seeing it at all is its own
 * kind of wrong. */

// What counts as "in reach of Houston" for the near view. A system further out
// than this is left out of the framing entirely — including it would pull the
// zoom out to an ocean-wide view in which the thing you care about is four
// pixels across, which is what makes most storm maps useless from here. It is
// also what keeps an East Pacific hurricane (there were two on the day this was
// written) from zooming Houston off the screen.
//
// DELIBERATELY NOT the backend's NEARBY_MI (900, routes/nhc.js), which counts
// systems for a headline this page no longer has. A framing radius wants to be
// generous — a storm just outside it is a storm you cannot see at all — where a
// count wants to be conservative. If a "N systems near you" line ever comes
// back, it must not quote one number next to a map drawn with the other.
const NEAR_RADIUS_MI = 1200;
// ...and a floor, so a storm sitting on top of Houston doesn't zoom in past the
// coastline it has to be placed against.
const MIN_SPAN_MI = 520;

const MI_PER_DEG_LAT = 69;
const lonScale = (lat) => Math.max(0.2, Math.cos((lat * Math.PI) / 180));

function roughMiles(a, b) {
  const dLat = (a[0] - b[0]) * MI_PER_DEG_LAT;
  const dLon = (a[1] - b[1]) * MI_PER_DEG_LAT * lonScale((a[0] + b[0]) / 2);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/* Houston plus whatever is actually near it, never tighter than MIN_SPAN_MI. */
function nearBounds(points) {
  const home = [HOUSTON.lat, HOUSTON.lon];
  const bounds = L.latLngBounds(home, home);
  for (const p of points) {
    if (roughMiles(home, p) <= NEAR_RADIUS_MI) bounds.extend(p);
  }

  // Grow to the floor around the current centre rather than around Houston, so
  // the padding lands on the side the weather is on.
  const c = bounds.getCenter();
  const halfLat = MIN_SPAN_MI / 2 / MI_PER_DEG_LAT;
  const halfLon = halfLat / lonScale(c.lat);
  bounds.extend([c.lat - halfLat, c.lng - halfLon]);
  bounds.extend([c.lat + halfLat, c.lng + halfLon]);
  return bounds;
}

function stormTitle(storm) {
  const mph = ktToMph(storm.intensityKt);
  const cat = storm.classification === "HU" ? category(mph) : null;
  const label = cat ? `Category ${cat} Hurricane` : CLASS_LABEL[storm.classification] || "System";
  return storm.name ? `${label} ${storm.name}` : label;
}

function houstonIcon() {
  return L.divIcon({
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html:
      '<div style="position:relative">' +
      '<div style="width:14px;height:14px;border-radius:50%;background:#22d3ee;' +
      'border:2.5px solid #0b0f19;box-shadow:0 0 0 2px #22d3ee88,0 0 12px #22d3ee"></div>' +
      '<div style="position:absolute;left:19px;top:-3px;white-space:nowrap;font:700 11px/1 ' +
      "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e0f7ff;" +
      'letter-spacing:.08em;text-shadow:0 0 4px #000,0 0 8px #000">HOUSTON</div>' +
      "</div>",
  });
}

/* The storm's current position. Sized by category so a major hurricane reads as
 * bigger than a depression at a glance, and spun only when it is actually a
 * hurricane — an animated icon on a 35 mph depression overstates it. */
function stormIcon(storm) {
  const mph = ktToMph(storm.intensityKt);
  const cat = storm.classification === "HU" ? category(mph) : null;
  const size = cat ? 26 + cat * 4 : 22;
  const color = classColor(storm.classification, mph);
  const spin = storm.classification === "HU";
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html:
      `<div style="width:${size}px;height:${size}px;border-radius:50%;` +
      `background:${color}33;border:2px solid ${color};display:flex;align-items:center;` +
      `justify-content:center;font-size:${Math.round(size * 0.62)}px;line-height:1;` +
      `box-shadow:0 0 14px ${color}99${spin ? ";animation:ghr-spin 6s linear infinite" : ""}">` +
      "🌀</div>",
  });
}

/* A forecast position. Deliberately small, and labelled only from Day 1 — the
 * track is read as a shape, and a number on every point turns it into a
 * chart. */
function forecastIcon(point, color) {
  const day = point.hour != null ? Math.round(point.hour / 24) : null;
  const label = day && day >= 1 ? `${day}d` : "";
  return L.divIcon({
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    html:
      '<div style="position:relative">' +
      `<div style="width:11px;height:11px;border-radius:50%;background:${color};` +
      'border:2px solid #0b0f19"></div>' +
      (label ?
        `<div style="position:absolute;left:14px;top:-2px;font:700 10px/1 -apple-system,` +
        "BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#cbd5f5;" +
        `text-shadow:0 0 4px #000,0 0 8px #000">${label}</div>`
      : "") +
      "</div>",
  });
}

const clockTime = (epochSec) =>
  new Date(epochSec * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function RadarMap({ storms = [], disturbances = [] }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const stormLayerRef = useRef(null);
  /* frame.time -> tile layer. A Map rather than an array because a refresh
   * mostly hands back frames we already have: RainViewer's path for a given
   * timestamp never changes, so keying on the timestamp lets a refresh add the
   * one new frame and drop the one that aged out instead of tearing down and
   * refetching all eleven. */
  const radarLayersRef = useRef(new Map());
  /* The timestamp currently on screen, so the frame survives a refresh even
   * though its INDEX moves when the window slides. */
  const shownTimeRef = useRef(null);

  const [frames, setFrames] = useState(null);
  // null = still asking, false = asked and RainViewer had nothing for us.
  const [radarOk, setRadarOk] = useState(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scope, setScope] = useState("near"); // near | all

  /* ------------------------------------------------------------------ data */

  const aliveRef = useRef(true);
  useEffect(
    () => () => {
      aliveRef.current = false;
    },
    [],
  );

  const loadFrames = useCallback(async () => {
    const next = await fetchRadarFrames();
    // A 10-second fetch can outlive the page it was started from.
    if (!aliveRef.current) return;
    /* A refresh that fails keeps the frames already on screen. Radar an hour
     * old with the timestamp saying so beats an empty map, and RainViewer's
     * index is the one upstream here that is not behind our own backend. */
    if (next?.length) {
      setFrames(next);
      setRadarOk(true);
    } else {
      // Only downgrade to "no radar" if we never had any. A failed refresh with
      // frames already on screen keeps them.
      setRadarOk((prev) => prev === true);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadFrames();
    })();
    const id = setInterval(loadFrames, FRAMES_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadFrames]);

  /* ------------------------------------------------------------------- map */

  // Built once, then re-fitted by the effects below rather than rebuilt.
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return undefined;

    // Captured for the cleanup below: the Map is never reassigned, only
    // mutated, but reading a ref from a teardown is what the lint rule is for.
    const layers = radarLayersRef.current;
    const map = L.map(hostRef.current, {
      center: [HOUSTON.lat, HOUSTON.lon],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
      /* Scroll-wheel zoom is OFF: this map sits in the middle of a scrolling
       * page, and a map that eats the scroll traps the reader on it. Dragging
       * and pinch-zoom stay on — unlike /drive's board radar, this one is the
       * thing you came to the page for, so exploring it is the point. */
      scrollWheelZoom: false,
      worldCopyJump: true,
      fadeAnimation: false,
    });
    L.tileLayer(BASEMAP_URL, { maxZoom: 12 }).addTo(map);
    // zIndex only orders within the tile pane, which is where both of these and
    // the radar live — so labels sit above the radar, and the cone and track
    // (vectors, in the overlay pane) sit above all three.
    L.tileLayer(LABELS_URL, { maxZoom: 12, opacity: 0.62, zIndex: 500 }).addTo(map);
    stormLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    /* Leaflet caches its container size at construction and never notices it
     * changing, so a rotate or a breakpoint change leaves half a screen of
     * blank tiles until something forces a recalculation. */
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(hostRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      stormLayerRef.current = null;
      // map.remove() takes its layers with it; this just drops our handles.
      layers.clear();
    };
  }, []);

  /* Every frame is on the map at zero opacity and the loop cross-fades between
   * them. Adding and removing a tile layer per frame makes the loop stutter
   * while each new layer fetches its tiles; keeping them all mounted trades a
   * little memory for a smooth animation, which is the whole value of a loop.
   *
   * A REFRESH IS A DIFF, NOT A REBUILD — of the layers and of the play head.
   * Rebuilding both is the obvious thing and it is wrong twice over: it
   * refetches ~11 frames of tiles that have not changed, and it throws away the
   * frame the reader had scrubbed to. Someone comparing 40-minute-old radar
   * against the cone would have the map jump back to "now" under them every
   * five minutes, which is the same failure the map framing guards against
   * below. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !frames?.length) return undefined;

    const layers = radarLayersRef.current;
    const wanted = new Set(frames.map((f) => f.time));
    for (const [time, layer] of layers) {
      if (wanted.has(time)) continue;
      map.removeLayer(layer);
      layers.delete(time);
    }
    for (const f of frames) {
      if (layers.has(f.time)) continue;
      layers.set(
        f.time,
        L.tileLayer(f.url, {
          opacity: 0,
          maxZoom: 12,
          // Zoom 7 is all RainViewer serves; above it the tile server returns
          // an error IMAGE at HTTP 200. See src/lib/rainviewer.js.
          maxNativeZoom: RADAR_MAX_NATIVE_ZOOM,
          zIndex: 400,
        }).addTo(map),
      );
    }

    setFrameIdx(() => {
      // Same timestamp, new position in a slid window: stay on it.
      const held = frames.findIndex((f) => f.time === shownTimeRef.current);
      if (held >= 0) return held;
      /* First load, or the frame we were on has aged out of the window. Open on
       * the most recent OBSERVED frame — not frame zero and not the last
       * nowcast: "now" is what someone opening a radar map is asking about, and
       * the loop runs forward from there on its own. */
      return frames.reduce((best, f, i) => (f.forecast ? best : i), 0);
    });

    return undefined;
  }, [frames]);

  useEffect(() => {
    if (!playing || !frames?.length) return undefined;
    const id = setInterval(() => setFrameIdx((i) => (i + 1) % frames.length), FRAME_MS);
    return () => clearInterval(id);
  }, [playing, frames]);

  const frame = frames?.[frameIdx] ?? null;

  useEffect(() => {
    if (!frame) return;
    shownTimeRef.current = frame.time;
    const layers = radarLayersRef.current;
    frames.forEach((f, i) => layers.get(f.time)?.setOpacity(i === frameIdx ? RADAR_OPACITY : 0));
  }, [frame, frameIdx, frames]);

  /* ------------------------------------------- storms, tracks and cones */

  // Every point the framing has to consider, recomputed only when the feed
  // changes rather than on every frame of the radar loop.
  const points = useMemo(() => {
    const out = [[HOUSTON.lat, HOUSTON.lon]];
    for (const area of disturbances) {
      if (Array.isArray(area.polygon)) area.polygon.forEach((p) => out.push(p));
    }
    for (const storm of storms) {
      if (Array.isArray(storm.cone)) storm.cone.forEach((p) => out.push(p));
      for (const p of storm.forecast || []) {
        if (typeof p.lat === "number" && typeof p.lon === "number") out.push([p.lat, p.lon]);
      }
      if (typeof storm.lat === "number" && typeof storm.lon === "number") {
        out.push([storm.lat, storm.lon]);
      }
    }
    return out;
  }, [storms, disturbances]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = stormLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    // Disturbance areas go down first so an active storm's cone and track draw
    // on top of them.
    for (const area of disturbances) {
      const color = chanceColor(area.chance7 ?? area.chance2);
      if (Array.isArray(area.polygon) && area.polygon.length >= 3) {
        L.polygon(area.polygon, {
          color,
          weight: 2,
          dashArray: "5 4",
          fillColor: color,
          fillOpacity: 0.16,
        })
          .bindTooltip(
            `<b>${disturbanceTitle(area)}</b><br>` +
              `${area.chance2 != null ? `${area.chance2}% in 2 days · ` : ""}` +
              `${area.chance7 != null ? `${area.chance7}% in 7 days` : "formation chance n/a"}`,
            { sticky: true },
          )
          .addTo(layer);
      }
      if (area.center) {
        L.marker([area.center.lat, area.center.lon], {
          interactive: false,
          icon: L.divIcon({
            className: "",
            iconSize: [40, 14],
            iconAnchor: [20, 7],
            html:
              `<div style="font:800 11px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,` +
              `sans-serif;color:${color};text-align:center;letter-spacing:.04em;` +
              `text-shadow:0 0 4px #000,0 0 8px #000">${area.invest || "×"}</div>`,
          }),
        }).addTo(layer);
      }
    }

    for (const storm of storms) {
      const mph = ktToMph(storm.intensityKt);
      const color = classColor(storm.classification, mph);

      /* The cone is drawn as NHC draws it — white, translucent, unlabelled and
       * non-interactive. It is a 900-point polygon covering a large part of the
       * map, so making it clickable would swallow every tap meant for the radar
       * or the track underneath it. */
      if (Array.isArray(storm.cone) && storm.cone.length >= 3) {
        L.polygon(storm.cone, {
          color: "#e2e8f0",
          weight: 1,
          opacity: 0.6,
          fillColor: "#e2e8f0",
          fillOpacity: 0.13,
          interactive: false,
        }).addTo(layer);
      }

      const track = (storm.forecast || []).filter(
        (p) => typeof p.lat === "number" && typeof p.lon === "number",
      );
      if (track.length > 1) {
        L.polyline(
          track.map((p) => [p.lat, p.lon]),
          { color, weight: 3, opacity: 0.9, dashArray: "7 6" },
        ).addTo(layer);
      }
      for (const p of track) {
        if (p.current) continue; // the storm's own marker sits here
        L.marker([p.lat, p.lon], { icon: forecastIcon(p, color) })
          .bindTooltip(
            `<b>${p.hour != null ? `+${p.hour} hr` : "forecast"}</b>` +
              `${p.time ? `<br>${p.time}` : ""}` +
              `${p.intensityMph != null ? `<br>${p.intensityMph} mph` : ""}` +
              `${p.type ? `<br>${p.type}` : ""}`,
            { sticky: true },
          )
          .addTo(layer);
      }

      if (typeof storm.lat === "number" && typeof storm.lon === "number") {
        L.marker([storm.lat, storm.lon], { icon: stormIcon(storm), zIndexOffset: 1000 })
          .bindTooltip(
            `<b>${stormTitle(storm)}</b>` +
              `${mph != null ? `<br>${mph} mph` : ""}` +
              `${storm.movementDir != null && storm.movementSpeed ? `<br>moving ${storm.movementSpeed} mph` : ""}`,
            { sticky: true },
          )
          .addTo(layer);
      }
    }

    L.marker([HOUSTON.lat, HOUSTON.lon], { icon: houstonIcon(), zIndexOffset: 2000 }).addTo(layer);
  }, [storms, disturbances]);

  /* Framing, and ONLY when the framing actually needs to change.
   *
   * The page refetches every five minutes, which hands this component a brand
   * new `storms` array each time, so an effect that simply re-fits on every
   * change would yank the map back to the default view every five minutes —
   * out from under a reader who had panned or zoomed to look at something.
   *
   * So the fit is keyed on what a reader would notice: which systems are on the
   * map, and their extent rounded to a whole degree (~69 miles). A storm
   * crawling six miles between advisories keeps the view it is being read in; a
   * new system appearing, one dissipating, or the storm walking out of frame
   * re-frames the map, which is exactly when it should. */
  const appliedFitRef = useRef("");
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const home = [HOUSTON.lat, HOUSTON.lon];
    const bounds =
      scope === "near" ?
        nearBounds(points)
      : points.reduce((b, p) => b.extend(p), L.latLngBounds(home, home));

    /* Storm ids are NHC's (al052026) and stable. A disturbance's `id` is NOT —
     * the backend mints it as an array index and then re-sorts, so `two-1` means
     * "whichever area currently has the best odds", not a particular system.
     * Keyed on the area's own position instead, so the outlook swapping one area
     * for another re-frames the map rather than looking unchanged. */
    const ids = [
      ...storms.map((s) => s.id),
      ...disturbances.map((d) =>
        d.center ? `two:${d.center.lat.toFixed(1)},${d.center.lon.toFixed(1)}` : `two:${d.id}`,
      ),
    ]
      .sort()
      .join(",");
    const key = [
      scope,
      ids,
      Math.round(bounds.getSouth()),
      Math.round(bounds.getWest()),
      Math.round(bounds.getNorth()),
      Math.round(bounds.getEast()),
    ].join("|");
    if (appliedFitRef.current === key) return;
    appliedFitRef.current = key;
    map.fitBounds(bounds, FIT);
  }, [points, scope, storms, disturbances]);

  /* ------------------------------------------------------------------- ui */

  const stamp = frame ? clockTime(frame.time) : null;
  const nowIdx = frames ? frames.findIndex((f) => f.forecast) : -1;

  return (
    <section
      style={{
        margin: "4px 0 4px",
        background: "#111827",
        border: "1px solid #1e2a44",
        borderRadius: 14,
        overflow: "hidden",
      }}>
      <style>{`
        @keyframes ghr-spin { to { transform: rotate(360deg) } }
        /* Leaflet paints its container #ddd by default, so a slow or blocked
           tile server flashes a light-grey slab in the middle of a dark page —
           it reads as broken rather than as loading. */
        .ghr-map.leaflet-container { background:#0d1526 }
        .ghr-map .leaflet-tooltip {
          background:#0d1526; color:#eef2ff; border:1px solid #2a3b5e;
          box-shadow:0 6px 18px #0009; font-size:12px; line-height:1.45;
        }
        .ghr-map .leaflet-tooltip::before { display:none }
        .ghr-map .leaflet-control-zoom a {
          background:#152036; color:#eef2ff; border-color:#2a3b5e;
        }
      `}</style>

      <div style={{ padding: "11px 14px 9px" }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Radar &amp; Forecast Track</div>
        <div style={{ fontSize: 12, color: "#8892b0", marginTop: 2 }}>
          Live rain radar under NHC&apos;s cone and forecast track
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <div
          ref={hostRef}
          className="ghr-map"
          style={{ height: "clamp(320px, 58vh, 540px)", width: "100%" }}
        />

        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 500,
            display: "flex",
            gap: 4,
            background: "rgba(11,15,25,0.85)",
            border: "1px solid #2a3b5e",
            borderRadius: 999,
            padding: 3,
          }}>
          {[
            ["near", "Near me"],
            ["all", "All systems"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope(key)}
              aria-pressed={scope === key}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                background: scope === key ? "#2a3b5e" : "transparent",
                color: scope === key ? "#eef2ff" : "#8892b0",
              }}>
              {label}
            </button>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 10,
            zIndex: 500,
            fontSize: 10,
            color: "#7a86a6",
            textShadow: "0 0 4px #000, 0 0 8px #000",
          }}>
          Esri · RainViewer · NOAA/NHC
        </div>
      </div>

      {/* The timeline. A radar picture with no clock on it is unreadable — you
          cannot tell 40-minute-old rain from a forecast — so the stamp and the
          NOW divider are not decoration. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px 12px",
          borderTop: "1px solid #1e2a44",
        }}>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          disabled={!frames?.length}
          aria-label={playing ? "Pause radar loop" : "Play radar loop"}
          style={{
            flex: "0 0 auto",
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "1px solid #2a3b5e",
            background: "#152036",
            color: frames?.length ? "#eef2ff" : "#4b5573",
            fontSize: 14,
            cursor: frames?.length ? "pointer" : "default",
            lineHeight: 1,
          }}>
          {playing ? "❙❙" : "▶"}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {radarOk === false && !frame ?
            <div style={{ fontSize: 12.5, color: "#8892b0" }}>
              Radar unavailable right now — the track and cone below are still live.
            </div>
          : !frame ?
            /* Also covers the single render between a refresh shortening the
             * frame list and the effect below resetting the index. */
            <div style={{ fontSize: 12.5, color: "#8892b0" }}>Loading radar…</div>
          : <>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  fontSize: 12.5,
                  marginBottom: 6,
                }}>
                <span style={{ fontWeight: 700, color: frame.forecast ? "#c4b5fd" : "#eef2ff" }}>
                  {stamp}
                  {frame.forecast ? " · forecast" : ""}
                </span>
                <span style={{ color: "#606a85", fontSize: 11 }}>
                  {clockTime(frames[0].time)} → {clockTime(frames[frames.length - 1].time)}
                </span>
              </div>
              {/* 36px tall, not the 22px the bar looks like: this is the one
                  control on the card whose whole job is picking one frame out
                  of eleven, and on a phone each is only ~28px wide. The visible
                  bar is an inner div so the target can be bigger than it. */}
              <div style={{ display: "flex", alignItems: "stretch", gap: 3, height: 36 }}>
                {frames.map((f, i) => (
                  <button
                    key={f.time}
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setFrameIdx(i);
                    }}
                    aria-label={`${clockTime(f.time)}${f.forecast ? " forecast" : ""}`}
                    aria-current={i === frameIdx}
                    title={clockTime(f.time)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "7px 0",
                      cursor: "pointer",
                      background: "transparent",
                      // The divider between observed radar and nowcast. Weather
                      // that has happened and weather that is predicted must not
                      // look like one continuous strip.
                      border: "none",
                      borderLeft: i === nowIdx && nowIdx > 0 ? "2px solid #8892b0" : "none",
                    }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        background:
                          i === frameIdx ? (f.forecast ? "#a78bfa" : "#38bdf8")
                          : f.forecast ? "#2f2a4d"
                          : "#1e2a44",
                      }}
                    />
                  </button>
                ))}
              </div>
            </>
          }
        </div>
      </div>

      {/* A key, not an intensity scale. What needs explaining on this map is the
          three things WE draw on top of the radar; RainViewer's own dBZ ramp is
          its business and stating values for it here would be a guess. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 16px",
          padding: "0 14px 13px",
          fontSize: 11,
          color: "#8892b0",
        }}>
        <span>
          <span style={{ color: "#22d3ee" }}>●</span> Houston
        </span>
        <span>
          <span style={{ color: "#e2e8f0" }}>▨</span> NHC cone
        </span>
        <span>
          <span style={{ color: "#38bdf8" }}>┄</span> forecast track
        </span>
        <span>
          <span style={{ color: "#eab308" }}>▨</span> formation area
        </span>
      </div>
    </section>
  );
}
