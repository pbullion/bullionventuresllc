/* The map half of /hrw. Lazy-loaded, because Leaflet is the heaviest thing on
 * the page and the list view doesn't need it.
 *
 * Pins are coloured by the restaurant's cheapest prix-fixe price, which turns
 * the map into an answer to "what's a $25 lunch near me" at a glance. Clicking
 * one opens a card docked at the bottom of the map rather than a Leaflet popup:
 * the card is real React, so it can hold a router <Link> and match the styling
 * of the list, and on a phone a docked sheet is easier to hit than a bubble
 * anchored to a 12px dot.
 *
 * Coordinates are baked into the data file by scripts/build-hrw-data.mjs. A
 * handful of suburban addresses are in neither geocoder's database, so the
 * footnote below reports how many of the current results have no pin instead of
 * quietly dropping them.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C } from "./theme.js";
import { TIERS, dishCount, mealLabel, tierColor } from "./data.js";

const ESRI_CANVAS = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

// Downtown Houston, for the empty-result case.
const CENTER = [29.7589, -95.3677];

const cheapest = (r) => {
  const v = Object.values(r.prices);
  return v.length ? Math.min(...v) : null;
};

/* Restaurant Weeks reaches from Wallis to Conroe to Baybrook, about 55 miles
 * corner to corner, so fitting every pin zooms out until Houston is a smudge
 * and no street name is legible. The default view fits the middle 92% instead —
 * which in practice is everything inside Beltway 8 plus the near suburbs — and
 * the "Fit all" button is there for the genuine outliers. */
function bounds(list, trim) {
  const at = (sorted, p) => sorted[Math.round((sorted.length - 1) * p)];
  const lats = list.map((r) => r.lat).sort((a, b) => a - b);
  const lons = list.map((r) => r.lon).sort((a, b) => a - b);
  if (!trim || list.length < 12)
    return L.latLngBounds([at(lats, 0), at(lons, 0)], [at(lats, 1), at(lons, 1)]);
  return L.latLngBounds(
    [at(lats, 0.04), at(lons, 0.04)],
    [at(lats, 0.96), at(lons, 0.96)],
  );
}
const FIT = { padding: [34, 34], maxZoom: 14 };

export default function MapView({ restaurants, faveSet, here, onLocate }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const meRef = useRef(null);
  // Once someone has panned or zoomed deliberately, refitting the view on every
  // keystroke would yank the map out from under them.
  const touchedRef = useRef(false);
  const [selected, setSelected] = useState(null);

  const pinned = useMemo(() => restaurants.filter((r) => r.lat != null), [restaurants]);
  const missing = restaurants.length - pinned.length;

  // Create the map once.
  useEffect(() => {
    const map = L.map(boxRef.current, {
      center: CENTER,
      zoom: 11,
      // Every control lives along the bottom edge. The page has a sticky filter
      // bar, and anything in the map's top corners ends up underneath it the
      // moment you scroll.
      zoomControl: false,
      // Trackpad/wheel zoom inside a scrolling page hijacks the scroll, so it
      // takes a deliberate ctrl/⌘-scroll or a pinch.
      scrollWheelZoom: false,
      tap: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    // NOT CARTO. cartocdn still answers 200 for its free dark_all tiles, but it
    // now prints "API KEY REQUIRED" diagonally across every one of them, so the
    // map failed by looking broken rather than by erroring (seen live on this
    // page 2026-08-26). Esri's dark canvas is keyless and unbranded.
    //
    // Two things differ from CARTO and both matter:
    //   - Esri serves {z}/{y}/{x} — ROW before COLUMN.
    //   - its tiling scheme stops at zoom 16, where CARTO went to 19. Past 16
    //     the server returns a small blank tile rather than a 404, so without
    //     maxNativeZoom a zoomed-in restaurant sits on an empty grey square.
    //     maxNativeZoom lets Leaflet upscale z16 instead.
    L.tileLayer(`${ESRI_CANVAS}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      attribution:
        'Tiles © <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, © OpenStreetMap contributors',
      maxZoom: 19,
      maxNativeZoom: 16,
    }).addTo(map);
    // Esri splits labels into their own layer; CARTO's dark_all had them baked
    // in, and a restaurant map with no street names is useless.
    L.tileLayer(`${ESRI_CANVAS}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      maxNativeZoom: 16,
      opacity: 0.85,
      zIndex: 300,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on("dragstart zoomstart", (e) => {
      // Programmatic fitBounds fires these too; only a hard user gesture counts.
      if (e.hard !== false) touchedRef.current = true;
    });
    mapRef.current = map;
    // Leaflet measures its container on creation, and the container is inside a
    // freshly-mounted lazy chunk, so nudge it once layout has settled. Bring the
    // map under the filter bar at the same time, so switching to this view shows
    // the whole map instead of its top third.
    const t = setTimeout(() => {
      map.invalidateSize();
      boxRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 60);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw pins whenever the filtered set changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    for (const r of pinned) {
      const fave = faveSet.has(r.slug);
      const size = fave ? 15 : 12;
      const marker = L.marker([r.lat, r.lon], {
        title: r.name, // native tooltip; Leaflet sets this as an attribute, not HTML
        keyboard: true,
        icon: L.divIcon({
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          html:
            `<div class="hrw-pin${fave ? " hrw-pin-fave" : ""}" style="width:${size}px;` +
            `height:${size}px;background:${tierColor(cheapest(r))}"></div>`,
        }),
      });
      marker.on("click", () => setSelected(r));
      layer.addLayer(marker);
    }

    if (!pinned.length || touchedRef.current) return;
    map.fitBounds(bounds(pinned, true), FIT);
  }, [pinned, faveSet]);

  // A dot for "you are here", plus a first-time zoom to it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (meRef.current) {
      map.removeLayer(meRef.current);
      meRef.current = null;
    }
    if (!here) return;
    meRef.current = L.circleMarker([here.lat, here.lon], {
      radius: 7,
      color: "#fff",
      weight: 2,
      fillColor: "#3b82f6",
      fillOpacity: 1,
    }).addTo(map);
    map.setView([here.lat, here.lon], Math.max(map.getZoom(), 12));
    touchedRef.current = true;
  }, [here]);

  const fitAll = () => {
    touchedRef.current = false;
    if (mapRef.current && pinned.length)
      mapRef.current.fitBounds(bounds(pinned, false), FIT);
  };

  return (
    <div className="hrw-in">
      <div style={{ position: "relative" }}>
        <div
          ref={boxRef}
          className="hrw-map"
          style={{
            height: "min(72vh, 680px)",
            minHeight: 380,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
          }}
        />

        {/* Legend — the pin colours are the point of the map, so say what they
            mean. Yields to the selected-restaurant card, which shares this edge
            and would collide with it on a phone. */}
        <div
          hidden={!!selected}
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            zIndex: 500,
            display: "flex",
            gap: 10,
            alignItems: "center",
            background: "rgba(10,10,13,.86)",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "7px 11px",
            fontSize: 11.5,
            fontWeight: 600,
            color: C.dim,
            backdropFilter: "blur(6px)",
          }}
        >
          {Object.entries(TIERS).map(([cost, t]) => (
            <span key={cost} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: t.color,
                  display: "inline-block",
                }}
              />
              {t.label}
            </span>
          ))}
        </div>

        {/* Above Leaflet's own zoom control, which is in the same corner. */}
        <div
          style={{
            position: "absolute",
            right: 12,
            bottom: 92,
            zIndex: 500,
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          <MapButton onClick={fitAll}>⤢ Fit all</MapButton>
          <MapButton onClick={onLocate}>📍 Me</MapButton>
        </div>

        {selected && (
          <SelectedCard r={selected} fave={faveSet.has(selected.slug)} onClose={() => setSelected(null)} />
        )}
      </div>

      <p style={{ marginTop: 10, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
        {pinned.length} of {restaurants.length} results on the map.
        {missing > 0 &&
          ` ${missing} ${missing === 1 ? "address" : "addresses"} couldn't be located — switch to list view to see ${missing === 1 ? "it" : "them"}.`}{" "}
        Hold ⌘ or Ctrl while scrolling to zoom.
      </p>
    </div>
  );
}

function MapButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.surfaceHi,
        border: `1px solid ${C.borderHi}`,
        color: C.text,
        borderRadius: 9,
        padding: "7px 11px",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* The card that replaces a Leaflet popup — docked bottom-centre, full width on
 * a phone, so a tapped pin always produces something readable. */
function SelectedCard({ r, fave, onClose }) {
  return (
    <div
      className="hrw-in"
      style={{
        position: "absolute",
        zIndex: 600,
        left: 12,
        right: 12,
        bottom: 12,
        maxWidth: 420,
        margin: "0 auto",
        background: C.surfaceHi,
        border: `1px solid ${C.borderHi}`,
        borderRadius: 14,
        padding: "14px 15px",
        boxShadow: "0 18px 40px -16px rgba(0,0,0,.95)",
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 8,
          right: 10,
          background: "none",
          border: 0,
          color: C.muted,
          fontSize: 18,
          cursor: "pointer",
          padding: 4,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      <h3 style={{ margin: "0 26px 7px 0", fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>
        {fave ? "★ " : ""}
        {r.name}
      </h3>
      <p style={{ margin: "0 0 9px", fontSize: 12.5, color: C.muted, lineHeight: 1.45 }}>
        {r.cuisines.slice(0, 4).join(" · ")}
        {r.neighborhoods[0] ? ` — ${r.neighborhoods[0]}` : ""}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {r.mealTypes.map((m) => (
          <span
            key={m}
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(255,255,255,.05)",
              border: `1px solid ${C.border}`,
              color: tierColor(r.prices[m]),
            }}
          >
            {mealLabel(m)} ${r.prices[m]}
          </span>
        ))}
      </div>
      <Link
        to={`/hrw/${r.slug}`}
        style={{
          display: "block",
          textAlign: "center",
          background: C.gold,
          color: "#1a1405",
          borderRadius: 9,
          padding: "10px 14px",
          fontSize: 13.5,
          fontWeight: 800,
        }}
      >
        See all {dishCount(r)} dishes →
      </Link>
    </div>
  );
}
