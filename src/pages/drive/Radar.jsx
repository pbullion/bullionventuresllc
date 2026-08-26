/* Animated rain radar centred on the car.
 *
 * Leaflet is already a dependency of this repo (the HRW map). This file imports
 * it statically and is itself React.lazy()'d by index.jsx — the same shape
 * MapView.jsx uses — so leaflet stays out of the main bundle that every visitor
 * to bullionventuresllc.com downloads.
 *
 * Tiles: Esri's dark canvas + RainViewer radar composites. Both are keyless,
 * which is the point — nothing on this page should be one expired API key away
 * from a blank card in a car. NOT CARTO, which is what the HRW maps in this
 * repo still use: cartocdn now serves its free tiles with "API KEY REQUIRED"
 * printed across them, so they look broken rather than failing outright.
 *
 * The map is deliberately INERT: no dragging, no zoom, no scroll capture. A
 * live map inside a dashboard is a trap on a touchscreen, because a stray
 * finger pans it away from where you are and nothing brings it back. Tapping
 * opens the full radar on Windy instead. */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const FRAME_MS = 480;
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
// Esri serves these {z}/{y}/{x} — the row before the column, unlike most schemes.
const BASEMAP = `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
const LABELS = `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;

function Radar({ coords, frames }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const [frameIdx, setFrameIdx] = useState(0);

  // Built once, then recentred by the effect below rather than rebuilt.
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return undefined;

    const map = L.map(hostRef.current, {
      center: [coords.lat, coords.lon],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
      fadeAnimation: false,
    });
    L.tileLayer(BASEMAP, { maxZoom: 12 }).addTo(map);
    L.tileLayer(LABELS, { maxZoom: 12, opacity: 0.62, zIndex: 500 }).addTo(map);
    mapRef.current = map;

    /* Leaflet caches the container size at construction and does not notice it
     * changing, so a card that grows or shrinks — the phone breakpoint, or the
     * Tesla browser being resized — leaves the map rendering half a screen of
     * blank tiles until something forces a recalculation. */
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(hostRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.setView([coords.lat, coords.lon], 7, { animate: false });
  }, [coords.lat, coords.lon]);

  /* All frames are added up front at zero opacity and then cross-faded. Adding
   * and removing a tile layer per frame makes the loop stutter while each new
   * layer fetches its tiles; pre-loading trades a little memory for a smooth
   * animation, which is the whole value of a radar loop. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !frames?.length) return undefined;

    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = frames.map((f) =>
      L.tileLayer(f.url, { opacity: 0, maxZoom: 12, zIndex: 400 }).addTo(map),
    );
    setFrameIdx(0);

    return () => {
      layersRef.current.forEach((l) => map.removeLayer(l));
      layersRef.current = [];
    };
  }, [frames]);

  useEffect(() => {
    if (!frames?.length) return undefined;
    const id = setInterval(() => setFrameIdx((i) => (i + 1) % frames.length), FRAME_MS);
    return () => clearInterval(id);
  }, [frames]);

  useEffect(() => {
    layersRef.current.forEach((layer, i) => layer.setOpacity(i === frameIdx ? 0.78 : 0));
  }, [frameIdx]);

  const frame = frames?.[frameIdx];
  const stamp =
    frame ?
      new Date(frame.time * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <section className="dcard">
      <div className="dcard__head">
        <span className="dcard__title">Radar</span>
        <span className="dcard__spacer" />
        <span className="dcard__note">Tap for Windy</span>
      </div>
      <div className="dcard__body">
        <div
          className="dradar"
          onClick={() =>
            window.open(
              `https://www.windy.com/${coords.lat}/${coords.lon}?radar,${coords.lat},${coords.lon},8`,
              "_blank",
              "noopener",
            )
          }
        >
          <div ref={hostRef} className="dradar__map" />
          <div className="dradar__pin" />
          <div className="dradar__credit">Esri · RainViewer</div>
          {stamp && (
            <div className={`dradar__stamp${frame.forecast ? " is-forecast" : ""}`}>
              {frame.forecast ? `+${stamp}` : stamp}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Radar;
