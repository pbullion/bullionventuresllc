/* PIN-gated trip deletion, shared by the trip list (index.jsx) and the trip
 * detail page (Trip.jsx). Both had their own delete before this; keeping one
 * copy means the retry and caching behaviour can't drift between them.
 *
 * Deliberately NOT the betting pages' "bv_autobet_pin". Trip Planner is shared
 * with other families, and handing someone a trip PIN must never hand them the
 * PIN that arms and kills the live-money Kalshi engines. Different key here,
 * different env var (TRIP_PLANNER_PIN) server-side.
 */
const PIN_KEY = "bv_trip_pin";

/* ── Per-trip access PIN ──────────────────────────────────────────────────────
 *
 * Different thing from PIN_KEY above, which is the owner's admin PIN for
 * deleting. This is the PIN a trip is created with and everyone on the trip
 * types once to get in — one per trip, so being let into the beach trip doesn't
 * let you into anyone else's, and so rotating one doesn't sign you out of the
 * rest. Sent on every request as x-trip-access-pin; the server stores only a
 * salted hash and answers 401 { locked: true }.
 *
 * localStorage, not sessionStorage: this is a family shopping list on a phone
 * that gets opened once a day for a month. Being asked to retype the PIN every
 * visit is how people stop opening it. */
const ACCESS_KEY = (slug) => `bv_trip_access_${slug}`;

// Every accessor swallows storage errors — Safari private mode throws on read
// as well as write, and a thrown getItem would blank the whole trip screen.
export function getTripAccess(slug) {
  try {
    return window.localStorage.getItem(ACCESS_KEY(slug)) || "";
  } catch {
    return "";
  }
}

export function setTripAccess(slug, pin) {
  try {
    window.localStorage.setItem(ACCESS_KEY(slug), pin);
  } catch {
    /* private mode — the PIN still works for this visit, held in React state */
  }
}

export function clearTripAccess(slug) {
  try {
    window.localStorage.removeItem(ACCESS_KEY(slug));
  } catch {
    /* nothing to do */
  }
}

/* fetch() with the trip's access PIN attached. Every Trip.jsx call goes through
 * this rather than raw fetch — a single missed call site is a request that 401s
 * on a locked trip and looks to the user like a save that silently failed. */
export function tripFetch(slug, url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), "x-trip-access-pin": getTripAccess(slug) },
  });
}

/* Master switch for the delete UI, off at Patrick's request 2026-08-09 — the
 * planner is shared with other families and a visible trash can invites a
 * mistake no PIN prompt fully undoes.
 *
 * Only the AFFORDANCE is hidden. The server-side gate, the PIN, and
 * deleteTripWithPin below all stay live and tested, so flipping this to true
 * restores both entry points (the trash on the trip list and "Delete this trip"
 * on the detail page) with no other edits. Deleting a trip meanwhile is a curl
 * with the x-trip-pin header. */
export const TRIP_DELETE_VISIBLE = false;

/* Deletes a trip, prompting for the PIN and caching it on success. Cascades
 * server-side to meals, packing items, expenses and activities.
 *
 * Resolves to one of:
 *   { ok: true }                 deleted
 *   { cancelled: true }          user dismissed the prompt
 *   { error: "..." }             show this to the user
 *
 * Never throws — callers only branch on the shape.
 */
export async function deleteTripWithPin(apiBase, trip) {
  let pin = window.localStorage.getItem(PIN_KEY) || "";

  // Two passes: a cached-but-stale PIN gets exactly one reprompt, so a rotated
  // PIN costs one extra dialog rather than a dead button.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!pin) {
      pin = window.prompt(`PIN to delete “${trip.name}”:`) || "";
      if (!pin) return { cancelled: true };
    }
    try {
      const res = await fetch(`${apiBase}/trips/${trip.slug}`, {
        method: "DELETE",
        // Sent both ways on purpose: some proxies drop bodies on DELETE. Never
        // in the query string — Heroku's router logs full paths.
        headers: { "Content-Type": "application/json", "x-trip-pin": pin },
        body: JSON.stringify({ pin }),
      });

      if (res.status === 401) {
        window.localStorage.removeItem(PIN_KEY);
        pin = "";
        const body = await res.json().catch(() => ({}));
        // A missing server-side PIN is a config problem, not a typo. Reprompting
        // would send you hunting for the wrong thing.
        if (body.error && body.error.includes("not configured")) {
          return { error: body.error };
        }
        continue;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: body.error || `HTTP ${res.status}` };
      }
      window.localStorage.setItem(PIN_KEY, pin);
      return { ok: true };
    } catch {
      return { error: "Request failed — check your connection." };
    }
  }
  return { error: "Wrong PIN." };
}
