/* Shared data access for the two /byob pages.
 *
 * The whole dataset is one static JSON file built by scripts/build-byob-data.mjs
 * from the hand-maintained seed in scripts/byob-seed.json, and served from
 * public/. It is small — a few dozen restaurants, tens of KB — so the list, the
 * search and every filter run in the browser against the whole thing, and the
 * page keeps working on a bad connection in a car park while you decide where
 * to take the bottle in the back seat.
 *
 * The fetch is memoised at module scope, so moving between the list and a
 * restaurant page — or between restaurants — costs nothing.
 */
const URL = "/data/byob-houston.json";

let promise = null;

export function loadByob() {
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

/* The three states a row's policy can be in, and the one visual key the page
 * leans on. This is the distinction the whole dataset is organised around:
 * "free" and "fee" came from the restaurant or from a guide that quoted terms,
 * "call" means a directory listed the place as BYOB and nothing more. Rendering
 * those three the same way would be the page's central lie. */
export const POLICY = {
  free: { label: "No corkage", color: "#5eead4" },
  fee: { label: "Corkage", color: "#e0b24c" },
  call: { label: "Call ahead", color: "#9ca3af" },
};

export function policyOf(r) {
  if (!r.byob?.confirmed) return "call";
  return r.byob.free ? "free" : "fee";
}

/* What the card's headline chip says. A confirmed fee prints the number; an
 * unconfirmed row must never print one, because it doesn't have one. */
export function policyLabel(r) {
  const kind = policyOf(r);
  if (kind === "free") return "No corkage fee";
  if (kind === "call") return "Policy unconfirmed";
  const { from } = r.byob;
  if (from == null) return "Corkage fee";
  // from === 0 with confirmed:true and free:false means the cheapest way in is
  // free but the general case is not — beer under a six-pack at Jenni's, wine on
  // a Monday at Sao Lao. "Free" would overclaim and a dollar figure would be
  // wrong, so the chip says neither and the note carries the terms.
  if (from === 0) return "Free in some cases";
  return `From ${money(from)}`;
}

export const money = (n) =>
  n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;

/* Beer is its own question and the answer is not always the same as wine's:
 * Papa Amadeo's takes wine only, Sao Lao charges for wine and not for beer.
 * Worth a filter of its own rather than a line of small print. */
export const takesBeer = (r) =>
  Boolean(r.byob?.beer) && !/not permitted/i.test(r.byob.beer);

export const wineOnly = (r) => /not permitted/i.test(r.byob?.beer || "");

/* "Montrose, Houston" — the area is a neighbourhood and never repeats its own
 * city in the seed, so the two are composed here rather than being written out
 * twice in the data. Where the two are the same word (Katy, Pearland) there is
 * nothing to add. */
export const placeLine = (r) =>
  r.area && r.area !== r.city ? `${r.area}, ${r.city}` : r.city;

export const phoneHref = (p) => `tel:${(p || "").replace(/[^\d+]/g, "")}`;
export const mapsHref = (r) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${r.name}, ${r.address}`,
  )}`;

/* Great-circle distance in miles — used by the "nearest first" sort. Statute
 * miles, like every other distance on this site. */
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

/* Favourites live in localStorage — the page has no accounts, and "the three
 * places I'd take a good bottle" is exactly the sort of list you build on a
 * phone and want back next month. Same mechanism as /hrw, different key. */
const FAVES_KEY = "byob_faves";

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
