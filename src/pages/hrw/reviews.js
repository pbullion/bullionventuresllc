/* Reader reviews — the one part of /hrw that isn't a static file.
 *
 * Everything else on this page is served out of public/data/hrw-2026.json and
 * filtered in the browser. Reviews can't be: they're written by whoever is
 * reading, so they live in the shared Sheline backend (routes/hrw.js) and are
 * keyed by PLACE, not by restaurant row — see places.js for why twenty
 * Saltgrass rows are one place.
 *
 * There are no accounts here, matching the rest of the page. A browser gets a
 * random token the first time it writes, and that token is what lets it edit or
 * delete what it wrote. It is a handle, not a password: it identifies the review
 * to its author's own browser and protects nothing from anybody who has it.
 */
const API_BASE = "https://sheline-art-website-api.herokuapp.com";

const TOKEN_KEY = "hrw_reviewer";
const NAME_KEY = "hrw_reviewer_name";

/* Created on first use and reused forever after — clearing site data means
 * losing the ability to edit your old reviews, which is the accepted cost of
 * not asking anyone to sign up. */
export function reviewerToken() {
  try {
    let t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(TOKEN_KEY, t);
    }
    return t;
  } catch {
    // Private browsing: a per-session token still posts, it just can't be
    // recognised again on the next page load.
    return `anon-${Math.random().toString(36).slice(2, 14)}`;
  }
}

/* The name someone signed with last time, so the second review doesn't ask
 * again. Not sent anywhere except with a review they submit. */
export function readReviewerName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function writeReviewerName(name) {
  try {
    if (name) localStorage.setItem(NAME_KEY, name);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    /* nothing to do — the field just starts empty next time */
  }
}

async function call(path, options = {}) {
  const res = await fetch(`${API_BASE}/hrw${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-hrw-token": reviewerToken(),
      ...options.headers,
    },
  });
  // The backend's fallthrough error handler answers `{}` for an unhandled
  // throw, so an empty body is a real (if uninformative) failure mode.
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* Count and average for every reviewed place, for the badges on the list. One
 * request for all 385 cards, memoised until something is written (below) — the
 * list and a restaurant page share it, and it only feeds a "4.4 ★ (7)". */
let summaryPromise = null;

export function loadSummary() {
  if (!summaryPromise) {
    summaryPromise = call("/reviews").catch((e) => {
      summaryPromise = null; // don't cache a failure
      throw e;
    });
  }
  return summaryPromise;
}

export const loadReviews = (place) => call(`/reviews/${encodeURIComponent(place)}`);

/* Writing invalidates the memo — otherwise the badge on the list page keeps
 * showing the count from before you reviewed for as long as the tab is open,
 * which reads as "my review didn't save". The backend has its own 60s cache, so
 * the refetch can still be a few seconds behind; the restaurant page's own read
 * is uncached and always current. */
const invalidateSummary = () => {
  summaryPromise = null;
};

export const saveReview = async (review) => {
  const out = await call("/reviews", { method: "POST", body: JSON.stringify(review) });
  invalidateSummary();
  return out;
};

export const deleteReview = async (id) => {
  const out = await call(`/reviews/${id}`, { method: "DELETE" });
  invalidateSummary();
  return out;
};

/* "4.4" — one decimal, and no trailing ".0" on a clean average. */
export const formatAvg = (avg) =>
  avg == null ? "" : String(Math.round(avg * 10) / 10);

/* Five characters, filled to the nearest half. Text rather than SVG because it
 * has to sit inline in a card at 12px and stay legible. */
export function stars(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return "★★★★★".slice(0, Math.round(r)).padEnd(5, "☆");
}

export const ratingWord = (r) =>
  ["", "Poor", "Fair", "Good", "Great", "Excellent"][Math.round(r)] || "";
