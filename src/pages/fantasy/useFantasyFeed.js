/* The fetch/poll/stale-guard both Fantasy screens share.
 *
 * Component-free on purpose (react-refresh/only-export-components), and
 * separate from theme.js because that file is palette and formatters. The two
 * screens hit different endpoints with identical mechanics, and duplicating
 * the sequence guard in both is exactly how the two tabs would drift.
 *
 * THE SEQUENCE GUARD (from src/pages/engine-limits/index.jsx:236). `focus`
 * fires in bursts when you app-switch on a phone, so answers can come back out
 * of order and an old one can overwrite a newer one. Only the newest request
 * is allowed to write.
 *
 * THE POLL. 60 s, which clears the repo's ">= 30 s for any new interval" floor
 * (CLAUDE.md). The backend caches for 60 s (standings) / 30 s (matchups)
 * anyway, so a faster poll would buy nothing and multiply Sleeper/ESPN load
 * across every open tab.
 *
 * WHAT COUNTS AS AN ERROR. The backend answers HTTP 200 even when everything
 * upstream is down — a per-league failure rides inside the payload and a total
 * failure comes back as {ok:false}. Checking res.ok alone would render an
 * outage as a calm empty page. So: transport failure, non-2xx, unparseable
 * body and ok===false are all errors here, and the per-league `error` field is
 * handled by the screens themselves.
 *
 * AND A TOP-LEVEL `error` IS AN ERROR WHATEVER `ok` SAYS. body.error is read
 * unconditionally, not only under ok===false. Sleeper league discovery is one
 * call with no league card to fail into: when it fails, five of the six
 * leagues are simply missing from the array and the page would otherwise show
 * one league, no banner, and look like a complete answer. The backend folds
 * that case into ok as well now — reading the field regardless is the belt to
 * that braces, and costs nothing when error is null.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "./theme.js";

const POLL_MS = 60000;

/* {code, message} from the backend's classifyError — but never trust the
 * shape: a bare string, a code with no message, or a null all have to come out
 * as either a readable sentence or null. */
function errorText(error) {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error !== "object") return String(error);
  return error.message || error.code || "the feed reported an upstream failure";
}

export function useFantasyFeed(path) {
  const [body, setBody] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const res = await fetch(`${API_BASE}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (mine !== seq.current) return;
      if (!json || typeof json !== "object") {
        throw new Error("the feed returned something that is not JSON");
      }
      if (json.ok === false) {
        /* Catastrophic upstream failure. Keep the payload — it still carries
         * `season`/`week` — but say plainly that this is not real data. */
        setBody(json);
        setErr(errorText(json.error) || "the feed reported a failure with no detail");
        return;
      }
      setBody(json);
      /* ok:true with a top-level error = a partial answer. The leagues that
       * came back are real and stay on screen; the banner says what is
       * missing. See the header. */
      setErr(errorText(json.error));
    } catch (e) {
      if (mine !== seq.current) return;
      setErr((e && e.message) || String(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    // Wrapped rather than called straight, so the first fetch is queued off
    // the effect body instead of running inside the render pass.
    (async () => {
      await load();
    })();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const id = setInterval(load, POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(id);
    };
  }, [load]);

  return { body, err, loading, reload: load };
}

/* Every league field is defensive on both screens: the backend promises these
 * invariants, but a page that hard-reads league.teams[0] is one bad deploy
 * from a white screen, and this app has no ErrorBoundary — a render throw
 * blanks the whole site, not this route. */
export function asArray(x) {
  return Array.isArray(x) ? x : [];
}
