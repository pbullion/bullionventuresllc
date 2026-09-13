/* THE RAIN — a port of `RadarFrame` in whiparound-firetv's Tracks.kt. The
 * other half of the radar screen, from a different place entirely: RainViewer,
 * keyless, straight from the browser rather than through our backend.
 *
 * THIS BOARD SHOWS ONE FRAME, the latest observed. /gulf-hurricane loops eleven;
 * a wall board is for somebody glancing, and what the glance needs is where the
 * rain is right now. So `radar.past`'s last entry, and never `nowcast` — those
 * are a forecast, and this frame is labelled "RAIN AT" a time.
 *
 * The frame paths change every ten minutes, so nothing may hardcode one. The
 * zoom ceiling and the error-image-at-200 trap are in src/lib/rainviewer.js.
 */

import { int, obj, arr, isObj, str } from "./wire";

/* /512/, WHERE THE STICK ASKS FOR /256/. Deliberate, and the one place the web
 * board differs from the stick: the stick draws every tile at double size with a
 * phone's memory, so a retina tile would be four times the heap to land at the
 * same size on the glass. A browser has the memory, and at 512 stage px a /512/
 * tile is drawn 1:1 on a 1080p monitor instead of upscaled. Same z/x/y either
 * way. Colour scheme 4 (Universal Blue), smoothed, snow on — the website's and
 * the stick's, so every screen agrees what heavy rain looks like. */
const TILE = "/512/{z}/{x}/{y}/4/1_1.png";

/// `{ time (epoch SECONDS, as RainViewer publishes it), template }`, or null
/// when the index has no observed frame — which the screen says in words.
export function parseRadarFrame(json) {
  const host = str(json, "host");
  if (host == null) return null;
  const past = arr(obj(json, "radar"), "past");
  if (!past || past.length === 0) return null;
  const latest = past[past.length - 1];
  if (!isObj(latest)) return null;
  const path = str(latest, "path");
  if (path == null) return null;
  return { time: int(latest, "time") ?? 0, template: `${host}${path}${TILE}` };
}

export function radarTileUrl(frame, z, x, y) {
  return frame.template.replace("{z}", z).replace("{x}", x).replace("{y}", y);
}
