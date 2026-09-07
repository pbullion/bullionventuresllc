/* One pin, one restaurant — the "where actually is this" panel on /byob/:slug.
 *
 * Lazy-loaded like the full map view so Leaflet stays out of the first bundle.
 * Deliberately dumb: no popups, no fitBounds, and dragging is off so a scroll
 * down the page on a phone can't get captured by the map. Anyone who wants to
 * navigate has the Directions button above it.
 *
 * Tiles come from src/lib/basemap.js, shared with /drive and /gulf-hurricane —
 * see that file for why they are Esri's and not CARTO's, and for the {z}/{y}/{x}
 * row-before-column trap.
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C } from "./theme.js";
import { POLICY } from "./data.js";
import { BASEMAP_URL, LABELS_URL } from "../../lib/basemap.js";

// Esri's tiling scheme stops at zoom 16 and returns a small BLANK tile past it
// rather than a 404, so without maxNativeZoom a zoomed-in restaurant sits on an
// empty grey square. maxNativeZoom lets Leaflet upscale z16 instead.
const TILE = { maxZoom: 19, maxNativeZoom: 16 };

export default function MiniMap({ lat, lon, name, color = POLICY.fee.color }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (lat == null) return;
    const map = L.map(boxRef.current, {
      center: [lat, lon],
      zoom: 15,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    });
    L.tileLayer(BASEMAP_URL, {
      ...TILE,
      attribution:
        'Tiles © <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, © OpenStreetMap contributors',
    }).addTo(map);
    // Esri splits labels into their own layer, and a restaurant map with no
    // street names is useless.
    L.tileLayer(LABELS_URL, { ...TILE, opacity: 0.85, zIndex: 300 }).addTo(map);
    L.marker([lat, lon], {
      icon: L.divIcon({
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: `<div class="byob-pin" style="width:16px;height:16px;background:${color}"></div>`,
      }),
      interactive: false,
    }).addTo(map);
    // The panel is inside a lazy boundary, so Leaflet often measures the box
    // before the browser has laid it out.
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => {
      clearTimeout(t);
      map.remove();
    };
  }, [lat, lon, color]);

  // A restaurant that defeated both geocoders skips this panel rather than
  // showing an empty grey box.
  if (lat == null) return null;

  return (
    <div
      ref={boxRef}
      className="byob-map"
      style={{
        height: 190,
        marginTop: 22,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}
      aria-label={`Map of ${name}`}
    />
  );
}
