/* RainViewer's radar tile index — the one thing two pages in this repo share.
 *
 * `/drive` has animated rain radar over the car and `/gulf-hurricane` has it
 * under a hurricane's cone. Both need the same three non-obvious facts, and a
 * copy of them in each page would be two places to get the tile URL template
 * wrong:
 *
 *   1. The frame list is a manifest fetch, not a tile URL. `weather-maps.json`
 *      hands back a host plus a path per frame; the frame paths change every
 *      ten minutes, so nothing may hardcode one.
 *   2. RADAR IS ONLY SERVED TO ZOOM 7 — see RADAR_MAX_NATIVE_ZOOM below, which
 *      carries the two limits found by probing rather than from the docs.
 *   3. `nowcast` frames are a FORECAST. They are appended to the past frames
 *      because a radar loop that stops at "now" is half a loop, but a caller
 *      that presents them as observed radar is lying, hence the `forecast` flag
 *      on every frame.
 *
 * KEYLESS, like everything else these two pages use. No account, no quota, no
 * key rotation that can blank a car dashboard or a storm map.
 */

/* RainViewer serves radar composites up to zoom 7 and an error image above it.
 * Both limits below were found by probing, not from the docs:
 *   - Past zoom 7 the tile server stops returning radar and starts returning a
 *     constant-size "Zoom Level Not Supported" image, WITH A 200. It does not
 *     404, so Leaflet happily paints the error across the map — which is what
 *     /drive's full-screen view did at zoom 8. Pin every radar layer with
 *     `maxNativeZoom: RADAR_MAX_NATIVE_ZOOM` and let Leaflet upscale z7.
 *   - The /512/ endpoint below is a RETINA tile, not a bigger-area one: same
 *     z/x/y as /256/, twice the pixels. So it pairs with Leaflet's default 256
 *     tileSize and no zoomOffset, and it is what makes the upscaled frames
 *     legible. */
export const RADAR_MAX_NATIVE_ZOOM = 7;

const INDEX_URL = "https://api.rainviewer.com/public/weather-maps.json";

// Frames are 10 minutes apart, so 8 past frames is ~80 minutes of history and 3
// nowcast frames is ~30 minutes ahead — about what fits on a scrubber that has
// to stay readable on a phone.
const PAST_FRAMES = 8;
const NOWCAST_FRAMES = 3;

/* `{ time, url, forecast }[]`, oldest first, or null if the index is
 * unreachable or has no radar in it. Null rather than an empty array on
 * purpose: the caller draws a map with no radar on it and says so, which is a
 * different thing from a loop with zero frames. */
export async function fetchRadarFrames(timeout = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(INDEX_URL, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.host || !data?.radar?.past?.length) return null;

    const past = data.radar.past.slice(-PAST_FRAMES);
    const nowcast = (data.radar.nowcast || []).slice(0, NOWCAST_FRAMES);
    /* `/{size}/{z}/{x}/{y}/{scheme}/{smooth}_{snow}.png`, so this is colour
     * scheme 4 (Universal Blue) with smoothing ON and the snow overlay ON.
     *
     * The 512px variant is the retina tile — same z/x/y, twice the pixels —
     * because a 256px composite upscaled from zoom 7 to zoom 9 is mush. Note
     * whiparound-firetv deliberately requests /256/ from this same scheme: it
     * draws every tile at double size on a stick with a phone's memory, so it
     * spends the heap rather than the sharpness. */
    return [...past, ...nowcast].map((f) => ({
      time: f.time,
      url: `${data.host}${f.path}/512/{z}/{x}/{y}/4/1_1.png`,
      forecast: !past.includes(f),
    }));
  } catch (err) {
    /* Logged, not swallowed. /drive runs unattended in a car for hours, and
     * "the radar card is empty" with nothing in the console is the shape of
     * problem that gets misdiagnosed as the tile server. This warning is the
     * one it used to carry before this moved out of drive/data.js. */
    console.warn("[radar] frame index failed:", err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
