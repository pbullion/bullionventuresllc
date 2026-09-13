/* The map arithmetic behind screens/Radar.jsx — ported from the top half of
 * whiparound-firetv's ui/RadarMap.kt (projection, framing, tile list, colours).
 * Kept out of the .jsx because a component file may export only components.
 *
 * NO MAP LIBRARY, on either board: the whole requirement is "put Web Mercator
 * tiles on a box and draw four shapes over them", and a slippy-map library
 * brings pan, zoom and a lifecycle to a picture nobody touches.
 */

import { BASEMAP_URL } from "../../../lib/basemap";
import { RADAR_MAX_NATIVE_ZOOM } from "../../../lib/rainviewer";
import { T } from "../theme";
import { HOUSTON_LAT, HOUSTON_LON } from "../models/tracks";

/* Stage px per tile — TWICE the native 256, the decision the Kotlin rests on.
 * A 1920x1080 canvas needs ~40 tiles at 256 and ~12 at 512; the sharpness lost
 * upscaling is a county line nobody reads from ten feet. */
export const DRAW = 512;

/// Below this the Gulf is a smudge. The framing floor makes it unreachable in
/// practice, but a just-named storm can produce a very tight bound.
const MIN_ZOOM = 3;

/* ~5.5 degrees is ~380 miles: the Texas coast plus enough water to see a system
 * approach. Without a floor a storm sitting on Houston zooms in until there is
 * no coastline left to place it against. */
const MIN_SPAN_DEG = 5.5;

/* THE CORNER PANEL'S FOOTPRINT, RESERVED BY THE FRAMING. The panel is opaque
 * (it sits on live radar) and top-left, and a storm to the south-east — the
 * ordinary Gulf approach — pushes Houston into exactly that corner. Fitting the
 * geometry into the box MINUS this strip, then pushing it right of it, means
 * nothing lands under the panel by construction. */
const PANEL_INSET = 640;

/* Web Mercator in fractional TILE units: the tile a point is in is floor() of
 * its coordinate, and pixels happen once, in the projection. */
function tileX(lon, z) {
  return ((lon + 180) / 360) * 2 ** z;
}

function tileY(lat, z) {
  const r = (Math.min(85.05, Math.max(-85.05, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}

/// `{ zoom, originX, originY }` — the tile coordinate at the box's top-left.
export function projectionFor(tracks, fullW, h) {
  const w = Math.max(fullW - PANEL_INSET, fullW * 0.4);
  let minLat = HOUSTON_LAT;
  let maxLat = HOUSTON_LAT;
  let minLon = HOUSTON_LON;
  let maxLon = HOUSTON_LON;
  const extend = (lat, lon) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  };
  for (const t of tracks.tracks) {
    extend(t.lat, t.lon);
    for (const p of t.forecast) extend(p.lat, p.lon);
    for (const [lat, lon] of t.cone) extend(lat, lon);
  }
  for (const a of tracks.areas) for (const [lat, lon] of a.polygon) extend(lat, lon);

  // Grown around the CENTRE, not Houston, so the extra room lands on the side
  // the weather is on.
  const cLat = (minLat + maxLat) / 2;
  const cLon = (minLon + maxLon) / 2;
  if (maxLat - minLat < MIN_SPAN_DEG) {
    minLat = cLat - MIN_SPAN_DEG / 2;
    maxLat = cLat + MIN_SPAN_DEG / 2;
  }
  if (maxLon - minLon < MIN_SPAN_DEG) {
    minLon = cLon - MIN_SPAN_DEG / 2;
    maxLon = cLon + MIN_SPAN_DEG / 2;
  }

  /* Start at the ceiling and step DOWN until it fits — never up. One zoom too
   * high crops the cone, which is the failure that matters on this screen. The
   * ceiling is RainViewer's: above zoom 7 it paints an error image at HTTP 200. */
  let zoom = RADAR_MAX_NATIVE_ZOOM;
  while (zoom > MIN_ZOOM) {
    const spanX = (tileX(maxLon, zoom) - tileX(minLon, zoom)) * DRAW;
    const spanY = (tileY(minLat, zoom) - tileY(maxLat, zoom)) * DRAW;
    if (spanX <= w && spanY <= h) break;
    zoom -= 1;
  }

  const centreX = (tileX(minLon, zoom) + tileX(maxLon, zoom)) / 2;
  const centreY = (tileY(minLat, zoom) + tileY(maxLat, zoom)) / 2;
  return {
    zoom,
    // Centred in the strip left over, not in the whole box.
    originX: centreX - (fullW - w + w / 2) / DRAW,
    originY: centreY - h / 2 / DRAW,
  };
}

export function px(p, lon) {
  return (tileX(lon, p.zoom) - p.originX) * DRAW;
}

export function py(p, lat) {
  return (tileY(lat, p.zoom) - p.originY) * DRAW;
}

/// Every tile touching the box. Rows off the world are dropped; columns wrap,
/// so a storm near the date line cannot produce a negative index.
export function tilesFor(p, w, h) {
  const span = 2 ** p.zoom;
  const x0 = Math.floor(p.originX);
  const y0 = Math.floor(p.originY);
  const x1 = Math.floor(p.originX + w / DRAW);
  const y1 = Math.floor(p.originY + h / DRAW);
  const out = [];
  for (let ty = y0; ty <= y1; ty += 1) {
    if (ty < 0 || ty >= span) continue;
    for (let tx = x0; tx <= x1; tx += 1) {
      out.push({
        x: ((tx % span) + span) % span,
        y: ty,
        // Truncated like the Kotlin's IntOffset(px.toInt()).
        left: Math.trunc((tx - p.originX) * DRAW),
        top: Math.trunc((ty - p.originY) * DRAW),
      });
    }
  }
  return out;
}

/// Esri is {z}/{y}/{x} — ROW BEFORE COLUMN; the template in src/lib/basemap.js
/// carries that order, so this only fills it in.
export function basemapTileUrl(z, x, y) {
  return BASEMAP_URL.replace("{z}", z).replace("{y}", y).replace("{x}", x);
}

/* Storm colour, band for band with the website's `classColor`. CAT 3 is its own
 * orange (not the red a 4 and 5 get), and PTC — how NHC warns BEFORE a system is
 * a cyclone, the most consequential thing this screen can show — is purple
 * rather than falling through to the grey that Remnants get. Hexes are the
 * website's where the theme has no equivalent. */
const CAT3 = "#F97316";
const PTC = "#A78BFA";

export function stormColor(t) {
  if (t.classification === "HU" && (t.category ?? 0) >= 4) return T.hot;
  if (t.classification === "HU" && t.category === 3) return CAT3;
  if (t.classification === "HU") return T.warm;
  if (t.classification === "TS" || t.classification === "STS") return T.accent;
  if (t.classification === "PTC") return PTC;
  return T.muted;
}

/// NHC's own three bands for formation odds, so a blob here means what a blob
/// on hurricanes.gov means.
export function areaColor(a) {
  if (a.chance == null) return T.muted;
  if (a.chance >= 60) return T.hot;
  if (a.chance >= 40) return T.warm;
  return T.amber;
}

/// NHC draws the cone white; so does this board.
export const CONE = "#E2E8F0";
export const HOUSTON_PIN = "#22D3EE";
