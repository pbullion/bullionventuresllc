/* The map half of /byob. Lazy-loaded, because Leaflet is the heaviest thing on
 * the page and the list view doesn't need it.
 *
 * Pins are coloured by POLICY — mint for a place that charges nothing, gold for
 * a corkage fee, grey for a policy nobody has confirmed — which turns the map
 * into an answer to "where can I take this bottle for free tonight" at a
 * glance. Clicking one opens a card docked at the bottom of the map rather than
 * a Leaflet popup: the card is real React, so it can hold a router <Link> and a
 * tel: link and match the styling of the list, and on a phone a docked sheet is
 * easier to hit than a bubble anchored to a 12px dot.
 *
 * Coordinates are baked into the data file by scripts/build-byob-data.mjs, and
 * geocoding there is allowed to fail. The footnote below reports how many of the
 * CURRENT RESULTS have no pin rather than quietly dropping them — a filtered set
 * where half the matches are invisible is worse than a smaller map.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C } from "./theme.js";
import { POLICY, phoneHref, policyLabel, policyOf } from "./data.js";
import { BASEMAP_URL, LABELS_URL } from "../../lib/basemap.js";

// Esri stops at zoom 16 and serves a blank tile past it — see MiniMap.jsx.
const TILE = { maxZoom: 19, maxNativeZoom: 16 };

// Downtown Houston, for the empty-result case.
const CENTER = [29.7589, -95.3677];
const FIT = { padding: [34, 34], maxZoom: 14 };

export default function MapView({ restaurants, faveSet, here, onLocate }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const meRef = useRef(null);
  // Once someone has panned or zoomed deliberately, refitting the view on every
  // keystroke would yank the map out from under them.
  const touchedRef = useRef(false);
  // The SLUG, not the restaurant: `selected` is then derived during render, so
  // a card whose restaurant filters out from under it disappears on the same
  // render rather than needing an effect to notice and clear it a beat later.
  const [selectedSlug, setSelectedSlug] = useState(null);

  const pinned = useMemo(
    () => restaurants.filter((r) => r.lat != null),
    [restaurants],
  );
  const missing = restaurants.length - pinned.length;

  // Create the map once.
  useEffect(() => {
    const map = L.map(boxRef.current, {
      center: CENTER,
      zoom: 10,
      // Every control lives along the bottom edge. The page has a sticky filter
      // bar, and anything in the map's top corners ends up underneath it the
      // moment you scroll.
      zoomControl: false,
      // Trackpad/wheel zoom inside a scrolling page hijacks the scroll, so it
      // takes a deliberate ctrl/⌘-scroll or a pinch.
      scrollWheelZoom: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(BASEMAP_URL, {
      ...TILE,
      attribution:
        'Tiles © <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, © OpenStreetMap contributors',
    }).addTo(map);
    L.tileLayer(LABELS_URL, { ...TILE, opacity: 0.85, zIndex: 300 }).addTo(map);
    map.on("dragstart zoomstart", () => {
      touchedRef.current = true;
    });
    // Tapping bare map dismisses the docked card, the way tapping outside a
    // sheet does everywhere else.
    map.on("click", () => setSelectedSlug(null));
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw the pins whenever the filtered set changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const r of pinned) {
      const color = POLICY[policyOf(r)].color;
      const fave = faveSet.has(r.slug);
      L.marker([r.lat, r.lon], {
        icon: L.divIcon({
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          html: `<div class="byob-pin${fave ? " byob-pin-fave" : ""}" style="width:14px;height:14px;background:${color}"></div>`,
        }),
        title: r.name,
      })
        .on("click", (e) => {
          // Without this the map's own click handler fires straight afterwards
          // and closes the card you just opened.
          L.DomEvent.stopPropagation(e);
          setSelectedSlug(r.slug);
        })
        .addTo(layer);
    }
    if (!touchedRef.current && pinned.length) {
      map.fitBounds(
        L.latLngBounds(pinned.map((r) => [r.lat, r.lon])),
        FIT,
      );
    }
  }, [pinned, faveSet]);

  // "You are here", when the browser has told us.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (meRef.current) {
      map.removeLayer(meRef.current);
      meRef.current = null;
    }
    if (!here) return;
    meRef.current = L.circleMarker([here.lat, here.lon], {
      radius: 6,
      color: "#fff",
      weight: 2,
      fillColor: C.gold,
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
  }, [here]);

  const selected = useMemo(
    () => pinned.find((r) => r.slug === selectedSlug) || null,
    [pinned, selectedSlug],
  );

  return (
    <div>
      <div style={{ position: "relative" }}>
        <div
          ref={boxRef}
          className="byob-map"
          style={{
            height: "min(66vh, 620px)",
            border: `1px solid ${C.border}`,
            overflow: "hidden",
          }}
          aria-label="Map of BYOB restaurants"
        />
        {selected && <Docked r={selected} onClose={() => setSelectedSlug(null)} />}
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          color: C.muted,
          fontSize: 13,
        }}
      >
        {Object.entries(POLICY).map(([k, p]) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              className="byob-pin"
              style={{ width: 10, height: 10, background: p.color, display: "inline-block" }}
            />
            {p.label}
          </span>
        ))}
        {!here && (
          <button
            onClick={onLocate}
            className="byob-chip"
            style={{ marginLeft: "auto" }}
          >
            📍 Show me
          </button>
        )}
        {missing > 0 && (
          <span style={{ flexBasis: "100%" }}>
            {missing} of these {restaurants.length} has no pin yet — the address
            defeated both geocoders. They are all still in the list view.
          </span>
        )}
      </div>
    </div>
  );
}

/* The card docked at the bottom of the map. Real React rather than a Leaflet
 * popup, so it can hold a router link and a tel: link. */
function Docked({ r, onClose }) {
  const p = POLICY[policyOf(r)];
  return (
    <div
      className="byob-in"
      style={{
        position: "absolute",
        left: 10,
        right: 10,
        bottom: 10,
        zIndex: 700, // above Leaflet's own panes
        background: C.surfaceHi,
        border: `1px solid ${C.borderHi}`,
        borderLeft: `3px solid ${p.color}`,
        borderRadius: 12,
        padding: "13px 14px",
        boxShadow: "0 14px 34px -14px rgba(0, 0, 0, .9)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to={`/byob/${r.slug}`} style={{ fontWeight: 700, fontSize: 16 }}>
            {r.name}
          </Link>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
            {r.area} · {r.cuisines.join(", ")}
          </div>
          <div style={{ color: p.color, fontSize: 13, fontWeight: 700, marginTop: 6 }}>
            {policyLabel(r)}
          </div>
          {r.phone && (
            <a
              href={phoneHref(r.phone)}
              style={{ color: C.gold, fontSize: 13, fontWeight: 600 }}
            >
              {r.phone}
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "none",
            border: 0,
            color: C.muted,
            fontSize: 20,
            lineHeight: 1,
            cursor: "pointer",
            padding: 4,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
