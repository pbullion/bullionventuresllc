/* The map half of /kids-eat-free. Lazy-loaded, like /byob's, because Leaflet
 * is the heaviest thing on the page and the list view doesn't need it.
 *
 * Pins are colored mint when the place is open TODAY (given whatever day
 * filter is active) and gold otherwise — the map answers "who's open right
 * now, near me" at a glance. Clicking one opens a card docked at the bottom
 * of the map, same pattern as /byob's MapView.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C } from "./theme.js";
import {
  daysLabel,
  phoneHref,
  placeLine,
  todayIndex,
  ZIP_77018,
} from "./data.js";
import { BASEMAP_URL, LABELS_URL } from "../../lib/basemap.js";

const TILE = { maxZoom: 19, maxNativeZoom: 16 };
const FIT = { padding: [34, 34], maxZoom: 14 };

export default function MapView({ restaurants, here, onLocate }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const meRef = useRef(null);
  const touchedRef = useRef(false);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const today = todayIndex();

  const pinned = useMemo(
    () => restaurants.filter((r) => r.lat != null),
    [restaurants],
  );
  const missing = restaurants.length - pinned.length;
  const center = here || ZIP_77018;

  useEffect(() => {
    const map = L.map(boxRef.current, {
      center: [center.lat, center.lon ?? center.lng],
      zoom: 12,
      zoomControl: false,
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
    map.on("click", () => setSelectedSlug(null));
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const r of pinned) {
      const open = r.daysOfWeek.includes(today);
      const color = open ? C.mint : C.gold;
      L.marker([r.lat, r.lon], {
        icon: L.divIcon({
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          html: `<div class="kef-pin${open ? " kef-pin-today" : ""}" style="width:14px;height:14px;background:${color}"></div>`,
        }),
        title: r.name,
      })
        .on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedSlug(r.slug);
        })
        .addTo(layer);
    }
    if (!touchedRef.current && pinned.length) {
      map.fitBounds(L.latLngBounds(pinned.map((r) => [r.lat, r.lon])), FIT);
    }
  }, [pinned, today]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (meRef.current) {
      map.removeLayer(meRef.current);
      meRef.current = null;
    }
    if (!here) return;
    meRef.current = L.circleMarker([here.lat, here.lon ?? here.lng], {
      radius: 6,
      color: "#fff",
      weight: 2,
      fillColor: C.gold,
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
    if (!touchedRef.current) map.panTo([here.lat, here.lon ?? here.lng]);
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
          className="kef-map"
          style={{
            height: "min(66vh, 620px)",
            border: `1px solid ${C.border}`,
            overflow: "hidden",
          }}
          aria-label="Map of kids-eat-free restaurants"
        />
        {selected && (
          <Docked r={selected} onClose={() => setSelectedSlug(null)} />
        )}
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
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            className="kef-pin"
            style={{ width: 10, height: 10, background: C.mint, display: "inline-block" }}
          />
          Open today
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            className="kef-pin"
            style={{ width: 10, height: 10, background: C.gold, display: "inline-block" }}
          />
          Other day
        </span>
        {!here && (
          <button onClick={onLocate} className="kef-chip" style={{ marginLeft: "auto" }}>
            📍 Show me
          </button>
        )}
        {missing > 0 && (
          <span style={{ flexBasis: "100%" }}>
            {missing} of these {restaurants.length} has no pin yet — the address
            defeated both geocoders. Still in the list view.
          </span>
        )}
      </div>
    </div>
  );
}

function Docked({ r, onClose }) {
  return (
    <div
      className="kef-in"
      style={{
        position: "absolute",
        left: 10,
        right: 10,
        bottom: 10,
        zIndex: 700,
        background: C.surfaceHi,
        border: `1px solid ${C.borderHi}`,
        borderLeft: `3px solid ${r.daysOfWeek.includes(todayIndex()) ? C.mint : C.gold}`,
        borderRadius: 12,
        padding: "13px 14px",
        boxShadow: "0 14px 34px -14px rgba(0, 0, 0, .9)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{r.name}</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
            {placeLine(r)} · {r.cuisine}
          </div>
          <div
            style={{
              color: r.daysOfWeek.includes(todayIndex()) ? C.mint : C.gold,
              fontSize: 13,
              fontWeight: 700,
              marginTop: 6,
            }}
          >
            {daysLabel(r)}
          </div>
          <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>{r.terms}</div>
          {r.phone && (
            <a
              href={phoneHref(r.phone)}
              style={{ color: C.gold, fontSize: 13, fontWeight: 600, marginTop: 6, display: "inline-block" }}
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
