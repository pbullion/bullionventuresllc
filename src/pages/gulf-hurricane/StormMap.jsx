/* The Gulf tracker's map: Houston, every active system, its forecast track and
 * cone, and NHC's disturbance areas — on one picture.
 *
 * This is the point of the page. "Is it coming here" is a question about two
 * places at once, and a stack of NOAA graphics centred on the storm cannot
 * answer it: none of them has Houston in a fixed spot, several do not have
 * Houston in frame at all, and the disturbances never appear on them because a
 * disturbance has no advisory to draw. So the map is anchored on Houston and
 * everything else is drawn around it.
 *
 * Leaflet is already a dependency (the HRW map, the /drive radar). This file is
 * React.lazy()'d by index.jsx — the same shape Radar.jsx uses — so leaflet stays
 * out of the bundle every bullionventuresllc.com visitor downloads.
 *
 * Tiles are Esri, NOT CARTO: cartocdn now serves its free tiles with "API KEY
 * REQUIRED" printed across them, so it fails by looking broken rather than by
 * erroring. Note Esri's tile path is {z}/{y}/{x} — row before column.
 */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  HOUSTON,
  category,
  chanceColor,
  classColor,
  disturbanceTitle,
  ktToMph,
  miles,
  stormTitle,
} from "./storms";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
const BASEMAP = `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
const LABELS = `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;

const FIT = { padding: [34, 34], maxZoom: 7 };

/* Two framings, because they answer different questions. "Near me" is the one
 * this page is for; "All systems" exists because a storm still three days out
 * in the open ocean is off the near view entirely, and not seeing it at all is
 * its own kind of wrong. */

// What counts as "in reach of Houston" for the near view. A system further out
// than this is left out of the framing entirely — including it would pull the
// zoom out to an ocean-wide view in which the thing you actually care about is
// four pixels across, which is what makes most storm maps useless from here.
const NEAR_RADIUS_MI = 1200;

// ...and a floor, so a storm sitting on top of Houston doesn't zoom in so far
// that there is no coastline left to place it against.
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
      `box-shadow:0 0 14px ${color}99${spin ? ";animation:gh-spin 6s linear infinite" : ""}">` +
      "🌀</div>",
  });
}

/* A forecast position. Deliberately small and unlabelled below Day 3 — the
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

export default function StormMap({ storms = [], disturbances = [], focus = null }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [scope, setScope] = useState("near"); // near | atlantic

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return undefined;

    const map = L.map(hostRef.current, {
      center: [HOUSTON.lat, HOUSTON.lon],
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
      // Scroll-wheel zoom is off: this map sits in the middle of a scrolling
      // page, and a map that eats the scroll traps the reader on it.
      scrollWheelZoom: false,
      worldCopyJump: true,
    });
    L.tileLayer(BASEMAP, { maxZoom: 12 }).addTo(map);
    L.tileLayer(LABELS, { maxZoom: 12, opacity: 0.6, zIndex: 500 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Leaflet caches its container size at construction and never notices it
    // changing, so a rotate or a breakpoint change leaves half a screen of
    // blank tiles until something forces a recalculation.
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(hostRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const points = [[HOUSTON.lat, HOUSTON.lon]];

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
          fillOpacity: 0.18,
        })
          .bindTooltip(
            `<b>${disturbanceTitle(area)}</b><br>` +
              `${area.chance2 != null ? `${area.chance2}% in 2 days · ` : ""}` +
              `${area.chance7 != null ? `${area.chance7}% in 7 days` : "formation chance n/a"}`,
            { sticky: true },
          )
          .addTo(layer);
        area.polygon.forEach((p) => points.push(p));
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

      if (Array.isArray(storm.cone) && storm.cone.length >= 3) {
        L.polygon(storm.cone, {
          color: "#e2e8f0",
          weight: 1,
          opacity: 0.55,
          fillColor: "#e2e8f0",
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(layer);
        storm.cone.forEach((p) => points.push(p));
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
        points.push([p.lat, p.lon]);
        if (p.current) continue; // the storm's own marker sits here
        L.marker([p.lat, p.lon], {
          interactive: true,
          icon: forecastIcon(p, color),
        })
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
        points.push([storm.lat, storm.lon]);
        L.marker([storm.lat, storm.lon], { icon: stormIcon(storm), zIndexOffset: 1000 })
          .bindTooltip(
            `<b>${stormTitle(storm)}</b>` +
              `${mph != null ? `<br>${mph} mph` : ""}` +
              `${storm.houston?.distanceMi != null ? `<br>${miles(storm.houston.distanceMi)} from Houston` : ""}`,
            { sticky: true },
          )
          .addTo(layer);
      }

      /* The closest-approach leg, drawn only for the system the page is leading
       * with. One thin line from Houston to the nearest point on the forecast
       * track turns an abstract mileage into a picture; drawing it for every
       * system turns the map into a starburst. */
      if (focus && focus === storm.id && storm.houston?.closest) {
        const c = storm.houston.closest;
        L.polyline(
          [
            [HOUSTON.lat, HOUSTON.lon],
            [c.lat, c.lon],
          ],
          { color: "#22d3ee", weight: 1.5, opacity: 0.8, dashArray: "3 5", interactive: false },
        )
          .bindTooltip(`Closest forecast approach — ${miles(c.distanceMi)}`, { sticky: true })
          .addTo(layer);
      }
    }

    L.marker([HOUSTON.lat, HOUSTON.lon], { icon: houstonIcon(), zIndexOffset: 2000 }).addTo(layer);

    // "Near me" always frames Houston and its surroundings even when the only
    // storm is off Africa, so the reader is never looking at an ocean with no
    // idea where they are on it.
    const bounds =
      scope === "near" ? nearBounds(points) : (
        points.reduce(
          (b, p) => b.extend(p),
          L.latLngBounds([HOUSTON.lat, HOUSTON.lon], [HOUSTON.lat, HOUSTON.lon]),
        )
      );
    map.fitBounds(bounds, FIT);
  }, [storms, disturbances, scope, focus]);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid #1e2a44",
        background: "#0d1526",
      }}>
      {/* Leaflet's own popup/tooltip chrome is light-themed; these two rules
          and the storm-marker spin are the only CSS this page needs. */}
      <style>{`
        @keyframes gh-spin { to { transform: rotate(360deg) } }
        /* Leaflet paints its container #ddd by default, so a slow or blocked
           tile server flashes a light-grey slab in the middle of a dark page —
           it reads as broken rather than as loading. */
        .gh-map.leaflet-container { background:#0d1526 }
        .gh-map .leaflet-tooltip {
          background:#0d1526; color:#eef2ff; border:1px solid #2a3b5e;
          box-shadow:0 6px 18px #0009; font-size:12px; line-height:1.45;
        }
        .gh-map .leaflet-tooltip::before { display:none }
        .gh-map .leaflet-control-zoom a {
          background:#152036; color:#eef2ff; border-color:#2a3b5e;
        }
      `}</style>
      <div ref={hostRef} className="gh-map" style={{ height: 420, width: "100%" }} />
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
          ["atlantic", "All systems"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setScope(key)}
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
          color: "#5b6785",
          textShadow: "0 0 4px #000",
        }}>
        Esri · NOAA/NHC
      </div>
    </div>
  );
}
