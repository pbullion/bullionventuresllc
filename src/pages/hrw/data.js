/* Shared data access for the Houston Restaurant Weeks pages.
 *
 * The whole dataset — 385 restaurants and 9,127 dishes — is one static JSON
 * file built by scripts/build-hrw-data.mjs and served from public/. It is
 * 1.4 MB raw, ~280 KB over the wire once Amplify compresses it, which buys a
 * page that filters and searches every dish instantly with no backend, no API
 * key and no rate limit. Splitting the menus into a second lazy request was
 * considered and rejected: dish search is the point of the page, so the menus
 * are not optional payload.
 *
 * The fetch is memoised at module scope, so moving between the list and a
 * restaurant page — or between restaurants — costs nothing.
 */
const URL = "/data/hrw-2026.json";

let promise = null;

export function loadHrw() {
  if (!promise) {
    promise = fetch(URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .catch((e) => {
        // Don't cache a failure — a reload or a retry should get a fresh shot.
        promise = null;
        throw e;
      });
  }
  return promise;
}

/* The three HRW price points are the page's main visual key: they colour the
 * price chips on every card and the pins on the map. Cheapest first. */
export const TIERS = {
  25: { color: "#5eead4", label: "$25" },
  39: { color: "#e0b24c", label: "$39" },
  55: { color: "#fb7185", label: "$55" },
};
export const tierColor = (cost) => TIERS[cost]?.color || "#9ca3af";

export const MEALS = ["Lunch", "Brunch", "Dinner", "Togo"];
export const mealLabel = (m) => (m === "Togo" ? "To-go" : m);

/* Cuisine is a free-text, multi-value field and a few of its values are really
 * dietary flags. They deserve their own one-tap filter rather than being buried
 * in a 56-entry cuisine dropdown. */
export const DIETS = ["Vegan", "Vegetarian", "Gluten Free"];

export const phoneHref = (p) => `tel:${(p || "").replace(/[^\d+]/g, "")}`;
export const mapsHref = (r) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${r.name}, ${r.address || "Houston, TX"}`,
  )}`;

export const dishCount = (r) =>
  r.menus.reduce((n, m) => n + m.courses.reduce((c, x) => c + x.dishes.length, 0), 0);

/* Great-circle distance in miles — used by the "nearest first" sort. */
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

/* Favourites live in localStorage — the page has no accounts, and "the four
 * places I want to hit this year" is exactly the sort of list you build on your
 * phone and want back tomorrow. */
const FAVES_KEY = "hrw_faves";

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
