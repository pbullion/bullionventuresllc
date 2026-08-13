/* One pin, one restaurant — the "where actually is this" panel on /hrw/:slug.
 *
 * Lazy-loaded like the full map view so Leaflet stays out of the first bundle.
 * Deliberately dumb: no clustering, no popups, no fitBounds, and dragging is off
 * so a scroll down the page on a phone can't get captured by the map. Anyone who
 * wants to actually navigate has the Directions button above it.
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C } from "./theme.js";
import { tierColor } from "./data.js";

export default function MiniMap({ restaurant: r }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (r.lat == null) return;
    const map = L.map(boxRef.current, {
      center: [r.lat, r.lon],
      zoom: 15,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    const cost = Math.min(...Object.values(r.prices), Infinity);
    L.marker([r.lat, r.lon], {
      icon: L.divIcon({
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: `<div class="hrw-pin" style="width:16px;height:16px;background:${tierColor(cost)}"></div>`,
      }),
      interactive: false,
    }).addTo(map);
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => {
      clearTimeout(t);
      map.remove();
    };
  }, [r]);

  // Nineteen of the 385 addresses defeated both geocoders; those pages just skip
  // this panel rather than showing an empty grey box.
  if (r.lat == null) return null;

  return (
    <div
      ref={boxRef}
      className="hrw-map"
      style={{
        height: 190,
        marginTop: 22,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}
      aria-label={`Map of ${r.name}`}
    />
  );
}
