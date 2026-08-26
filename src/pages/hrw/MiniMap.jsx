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

const ESRI_CANVAS = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

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
