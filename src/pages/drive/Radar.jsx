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
import Card from "./Card";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// One copy of the zoom-7 limit, shared with /gulf-hurricane. See the header
// comment in src/lib/rainviewer.js for why it exists.
import { RADAR_MAX_NATIVE_ZOOM } from "../../lib/rainviewer.js";
import { BASEMAP_URL, LABELS_URL } from "../../lib/basemap.js";

const FRAME_MS = 480;

/* `interactive` is off on the board and on in the expanded view. On the board a
 * pannable map is a trap — a stray finger moves it off the car's position and
 * nothing brings it back — but once the section is full screen, panning and
 * zooming are the whole point. */
function Radar({ coords, frames, interactive = false, onExpand }) {
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
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: false,
      doubleClickZoom: interactive,
      boxZoom: false,
      keyboard: false,
      tap: interactive,
      fadeAnimation: false,
    });
    if (interactive) L.control.zoom({ position: "bottomright" }).addTo(map);
    /* detectRetina on the basemap, and only on the basemap. It asks one
       question — is a CSS pixel more than one device pixel? — and fetches the
       next zoom level's tiles when it is, which is the right answer whether the
       ratio comes from a retina panel or from the Tesla browser's raised
       default zoom (dpr 1.53 since the 2026.26 summer update, on the same
       pane). Without it the dark canvas and especially its labels are upscaled
       ~1.5x in the car and read as soft. One extra ring of tiles, once, on a
       card that already fetches eleven radar frames a pass.

       The RADAR layers below must NOT have it: they are pinned to
       maxNativeZoom 7 because zoom 8 returns a "not supported" IMAGE at HTTP
       200, and detectRetina is a zoomOffset — it would ask for exactly that.
       They get their resolution from the /512/ retina path in the frame URL
       instead. */
    L.tileLayer(BASEMAP_URL, { maxZoom: 12, detectRetina: true }).addTo(map);
    L.tileLayer(LABELS_URL, {
      maxZoom: 12,
      detectRetina: true,
      opacity: 0.62,
      zIndex: 500,
    }).addTo(map);
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

  /* Recentre when the car moves — but never in the expanded view, where
   * yanking the map back mid-pan would make it unusable. */
  useEffect(() => {
    if (interactive) return;
    mapRef.current?.setView([coords.lat, coords.lon], 7, { animate: false });
  }, [coords.lat, coords.lon, interactive]);

  /* All frames are added up front at zero opacity and then cross-faded. Adding
   * and removing a tile layer per frame makes the loop stutter while each new
   * layer fetches its tiles; pre-loading trades a little memory for a smooth
   * animation, which is the whole value of a radar loop. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !frames?.length) return undefined;

    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = frames.map((f) =>
      // maxNativeZoom 7 — see the note on RADAR_MAX_NATIVE_ZOOM in src/lib/rainviewer.js.
      L.tileLayer(f.url, {
        opacity: 0,
        maxZoom: 12,
        maxNativeZoom: RADAR_MAX_NATIVE_ZOOM,
        zIndex: 400,
      }).addTo(map),
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

  const map = (
    <div className={`dradar${interactive ? " is-full" : ""}`}>
      <div ref={hostRef} className="dradar__map" />
      <div className="dradar__pin" />
      <div className="dradar__credit">Esri · RainViewer</div>
      {stamp && (
        <div className={`dradar__stamp${frame.forecast ? " is-forecast" : ""}`}>
          {frame.forecast ? `+${stamp}` : stamp}
        </div>
      )}
    </div>
  );

  if (interactive) {
    return (
      <div className="dradarfull">
        {map}
        {/* Scrubber. Only worth the space full screen; on the board the loop
            just runs and the timestamp says where it is. */}
        {frames?.length > 1 && (
          <div className="dscrub">
            {frames.map((f, i) => (
              <button
                key={f.time}
                type="button"
                aria-label={new Date(f.time * 1000).toLocaleTimeString()}
                className={`dscrub__tick${i === frameIdx ? " is-on" : ""}${
                  f.forecast ? " is-forecast" : ""
                }`}
                onClick={() => setFrameIdx(i)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card title="Radar" note={stamp ? undefined : "loading"} onExpand={onExpand}>
      {map}
    </Card>
  );
}

export default Radar;
