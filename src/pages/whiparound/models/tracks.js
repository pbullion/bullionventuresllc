/* GEOMETRY FOR THE RADAR SCREEN — a port of whiparound-firetv's Tracks.kt
 * (everything above RadarFrame; that half is ./radar.js). Where a storm is,
 * where it is going, and how wide the cone is. Not models/tropics.js, which is
 * the same storms as WORDS.
 *
 * THE ONE FEED THAT IS NOT A /whiparound/… ROUTE. It reads /nhc/current-storms
 * because it needs geometry (a cone is a polygon NHC drew) and no opinion, and
 * /whiparound/tropics carries no geometry at all.
 *
 * THE PAYLOAD IS BIG AND MOST OF IT IS NOT OURS (~45-120 KB, a cone is ~900+
 * vertices, and the East Pacific is in it too). Parsing throws away, in order:
 *   1. any system further than NEAR_MI from Houston — a hurricane off Baja is
 *      not this wall's business, and drawing it would zoom Houston off screen;
 *   2. every cone vertex but one in CONE_STRIDE — at this drawing size a
 *      900-point ring and a 120-point ring are the same shape.
 *
 * ABSENT MEANS NO: nothing near Houston is `any: false`, and the radar screen
 * leaves the rotation — which is what it is for most of the year.
 */

import { arr, bool, dbl, int, isObj, objects, str } from "./wire";

/// Houston — the same coordinates the backend and the website use. A wall in
/// Houston is the only reason this screen exists.
export const HOUSTON_LAT = 29.7604;
export const HOUSTON_LON = -95.3698;

/* Generous on purpose: a system just outside the frame is one you cannot see
 * at all. The backend's own NEARBY_MI is 900 and COUNTS systems for a headline;
 * a count wants to be conservative where a framing radius wants not to be.
 * Don't reconcile them — they answer different questions. */
const NEAR_MI = 1200;

const CONE_STRIDE = 8;

const MI_PER_DEG_LAT = 69;

/// Good enough for "is this near Houston" at Gulf latitudes, with no haversine
/// per vertex. The distances people actually read are computed on the backend.
export function roughMiles(lat1, lon1, lat2, lon2) {
  const dLat = (lat1 - lat2) * MI_PER_DEG_LAT;
  const scale = Math.max(0.2, Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180));
  const dLon = (lon1 - lon2) * MI_PER_DEG_LAT * scale;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

const near = (lat, lon) => roughMiles(lat, lon, HOUSTON_LAT, HOUSTON_LON) <= NEAR_MI;

export const EMPTY_TRACKS = { tracks: [], areas: [], any: false };

/// `optDoubleOrNull`: missing, null, unparseable and absurd are all null.
/// Zero is a real coordinate (the Gulf of Guinea), so it must never stand in
/// for "missing".
function coord(o, key) {
  const v = dbl(o, key);
  return v == null || Math.abs(v) > 1e6 ? null : v;
}

/* Saffir-Simpson, or null below hurricane strength. Same thresholds as the
 * website's `category()` — a storm must not be a 2 on the wall and a 3 in the
 * browser. */
function category(classification, windMph) {
  if (classification !== "HU" || windMph == null) return null;
  if (windMph >= 157) return 5;
  if (windMph >= 130) return 4;
  if (windMph >= 111) return 3;
  if (windMph >= 96) return 2;
  if (windMph >= 74) return 1;
  return null;
}

/* THE ORDER IS [lat, lon], NOT GeoJSON's [lon, lat] — the backend swaps it when
 * it parses NHC's KML so a consumer can hand the pairs to a map unthinkingly.
 * Backwards, the cone lands in the Indian Ocean instead of erroring.
 *
 * Sampled one in `stride`, and the FINAL vertex always kept: a ring that is only
 * sampled can lose its last point and leave a visible notch where it closes. */
function ring(list, stride) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const pair = (p) => {
    if (!Array.isArray(p) || p.length < 2) return null;
    const lat = Number(p[0]);
    const lon = Number(p[1]);
    // The Kotlin keeps a NaN pair (optDouble); SVG drops the WHOLE path on one
    // "NaN" in `d`, so a malformed vertex is skipped instead.
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
  };
  const out = [];
  for (let i = 0; i < list.length; i += stride) {
    const p = pair(list[i]);
    if (p) out.push(p);
  }
  const end = pair(list[list.length - 1]);
  const last = out[out.length - 1];
  if (end && !(last && last[0] === end[0] && last[1] === end[1])) out.push(end);
  return out;
}

export function parseTracks(json) {
  /* AN `error` PAYLOAD IS A FAILURE, AND IS THROWN.
   *
   * The route answers HTTP 200 with `{error, storms: []}` in exactly one case:
   * CurrentStorms.json was unreachable AND the dyno's process cache was cold.
   * Returned as empty it read as "the Atlantic is quiet", so one restart of the
   * shared dyno during an NHC outage would take a live hurricane off the wall.
   * Thrown, it lands in useBoard's catch, which keeps the last advisory — the one
   * place on this board a stale value beats no value. A payload that is not an
   * object at all is the same kind of failure. */
  if (!isObj(json)) throw new Error("nhc: not an object");
  if (json.error !== undefined && json.error !== null) {
    throw new Error(`nhc: ${String(json.error)}`);
  }

  const tracks = [];
  for (const s of objects(json, "storms")) {
    const lat = coord(s, "lat");
    const lon = coord(s, "lon");
    if (lat == null || lon == null || !near(lat, lon)) continue;
    const classification = str(s, "classification");
    const kt = dbl(s, "intensityKt");
    // Knots upstream; the same 1.15078 the website uses.
    const windMph = kt == null ? null : Math.round(kt * 1.15078);
    const forecast = [];
    for (const p of objects(s, "forecast")) {
      const plat = coord(p, "lat");
      const plon = coord(p, "lon");
      if (plat == null || plon == null) continue;
      forecast.push({ lat: plat, lon: plon, hour: int(p, "hour"), current: bool(p, "current") });
    }
    tracks.push({
      id: str(s, "id") ?? "",
      name: str(s, "name"),
      /// NHC's own code — HU, TS, TD, STS, STD, PTC, RM.
      classification,
      windMph,
      category: category(classification, windMph),
      inGulf: bool(s, "inGulf"),
      lat,
      lon,
      forecast,
      // Empty is normal for a system inside 12 hours of being designated.
      cone: ring(arr(s, "cone"), CONE_STRIDE),
    });
  }

  /* An undesignated system (an "invest") has an area and formation odds and
   * NOTHING ELSE — no track, no cone, no intensity, because NHC publishes none
   * for a system it has not named. */
  const areas = [];
  for (const d of objects(json, "disturbances")) {
    const polygon = ring(arr(d, "polygon"), CONE_STRIDE);
    if (polygon.length < 3) continue;
    // A shape, not a point: nearness is to its closest vertex, because a
    // formation area can be enormous.
    if (!polygon.some(([la, lo]) => near(la, lo))) continue;
    areas.push({
      invest: str(d, "invest"),
      chance: int(d, "chance7") ?? int(d, "chance2"),
      polygon,
    });
  }

  /* Gulf first, then nearest — the website's order, and the reason the lead
   * storm on the screen is the one the room cares about. The backend sorts the
   * whole Atlantic; once far systems are dropped the order must hold for what is
   * left. (Array.prototype.sort is stable.) */
  const miles = (t) => roughMiles(t.lat, t.lon, HOUSTON_LAT, HOUSTON_LON);
  tracks.sort((a, b) => (a.inGulf ? 0 : 1) - (b.inGulf ? 0 : 1) || miles(a) - miles(b));

  /// THIS is what puts the radar screen in the rotation (slots.js) — not a flag
  /// from another route, and not the calendar.
  return { tracks, areas, any: tracks.length > 0 || areas.length > 0 };
}
