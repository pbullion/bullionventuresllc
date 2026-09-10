/* Shared data access for /kids-eat-free.
 *
 * One static JSON file built by scripts/build-kids-eat-free-data.mjs from the
 * hand-maintained seed in scripts/kids-eat-free-seed.json, served from
 * public/. It is small, so the list, search and every filter run in the
 * browser against the whole thing — same pattern as /byob and /hrw.
 */
const URL = "/data/kids-eat-free-houston.json";

let promise = null;

export function loadKidsEatFree() {
  if (!promise) {
    promise = fetch(URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .catch((e) => {
        promise = null;
        throw e;
      });
  }
  return promise;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function todayIndex() {
  return new Date().getDay();
}

export const isOpenOn = (r, dayIdx) => r.daysOfWeek.includes(dayIdx);

/* "every day" reads better than seven ticked boxes; everything else lists the
 * short names in week order starting Sunday, which is how the day grid is
 * drawn. */
export function daysLabel(r) {
  if (r.daysOfWeek.length === 7) return "Every day";
  return r.daysOfWeek
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_SHORT[d])
    .join(", ");
}

export const placeLine = (r) =>
  r.area && r.area !== r.city ? `${r.area}, ${r.city}` : r.city;

export const phoneHref = (p) => `tel:${(p || "").replace(/[^\d+]/g, "")}`;
export const mapsHref = (r) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${r.name}, ${r.address}`,
  )}`;

/* Great-circle distance in statute miles — used by "nearest first" and by the
 * map's default center. Identical formula to /byob's milesBetween. */
export function milesBetween(a, b) {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* Centroid of ZIP 77018 (Garden Oaks / Oak Forest / Independence Heights),
 * used as the map's default center and the distance-sort fallback whenever
 * the browser hasn't shared a real location (denied, unsupported, or not
 * asked yet). Real geolocation always wins the moment it resolves — see
 * `here` state in index.jsx — so this is a same-neighborhood placeholder, not
 * a permanent stand-in. */
export const ZIP_77018 = { lat: 29.826, lon: -95.4171 };

const FAVES_KEY = "kef_faves";

export function readFaves() {
  try {
    const v = JSON.parse(localStorage.getItem(FAVES_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function writeFaves(slugs) {
  try {
    localStorage.setItem(FAVES_KEY, JSON.stringify(slugs));
  } catch {
    /* private browsing / full quota — favourites just won't persist */
  }
}
