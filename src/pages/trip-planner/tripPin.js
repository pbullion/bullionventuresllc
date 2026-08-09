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
