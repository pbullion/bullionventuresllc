import { useCallback, useEffect, useRef, useState } from "react";

/* One-line backend health strip for /morning-review.
 *
 * WHY THIS IS HERE AND NOT JUST A LINK TO /status.
 *
 * /morning-review is the first page opened each morning, and every number on
 * it comes from the same dyno that went into a 40-minute OOM crash-loop on
 * 2026-09-03. On a morning like that one the desks file nothing, the engine
 * strip reads "unreachable", and none of that says WHY. This strip answers
 * "is the shared backend fine?" before you read a word of the report, and
 * hands off to /status for the full history.
 *
 * It is a compressed version of /status, keeping the two facts that outage
 * proved matter and an instantaneous green dot misses:
 *   - uptime_s RESETTING (a crash-loop answers 200 the whole way through), and
 *   - rss_mb climbing toward the 1024 MB quota BEFORE anything starts failing.
 *
 * Deliberately NOT a green dot, for the same reason /status isn't one.
 */

const HEALTH_URL = "https://sheline-art-website-api.herokuapp.com/health";

/* Three times slower than /status's 20s. That page is opened to watch an
 * outage and closed again; this one sits open on a phone through breakfast, so
 * its poll is a standing cost on a dyno that is already memory-constrained.
 * Slow enough to be free, fast enough that a crash-loop still paints several
 * bars. Also skipped entirely while the tab is hidden — see the loop below. */
const POLL_MS = 60000;

/* A request that has not answered in this long is a symptom, not a wait. A
 * crashed dyno takes ~4s to return Heroku's error page; a hung one never
 * answers at all, and that difference is the whole signal. */
const TIMEOUT_MS = 15000;

/* Ten bars at a 60s poll is ~10 minutes of history — enough that a flap reads
 * as a flap. Client-side only: a reload starts over, which is honest about
 * what this strip actually knows. */
const HISTORY = 10;

const QUOTA_MB = 1024; // Standard-2X. RSS above this is Heroku's R14.

const C = {
  panel: "#151a24",
  border: "#252c3a",
  text: "#e8eaed",
  muted: "#8a93a6",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#eab308",
};

const TONE = { ok: C.green, warn: C.amber, bad: C.red, idle: C.muted };

const fmtUptime = (s) => {
  if (!Number.isFinite(s)) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
};

export default function BackendHealthStrip() {
  const [checks, setChecks] = useState([]);
  /* A generation counter rather than an `alive` boolean: under StrictMode's
   * setup→cleanup→setup double-invoke a shared boolean is flipped back to true
   * by the second mount before the first mount's fetch resolves, so the stray
   * result commits anyway. Each run compares against the value it started with. */
  const run = useRef(0);
  /* A Set, not one slot — the visibility handler can fire a check while the
   * poll already has one out, and a single ref would leave the first request
   * unabortable, which is the thing this ref exists to prevent. */
  const inFlight = useRef(new Set());
  const lastAt = useRef(0);

  const check = useCallback(async () => {
    const myRun = run.current;
    const startedAt = Date.now();
    lastAt.current = startedAt;
    const controller = new AbortController();
    inFlight.current.add(controller);
    const abort = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let result;
    try {
      const res = await fetch(HEALTH_URL, { signal: controller.signal, cache: "no-store" });
      /* Heroku serves its own HTML error page with a 503 when the dyno is
       * crashed, so a non-JSON body is expected here rather than exceptional.
       * Calling .json() straight off would throw and lose the status code,
       * which is the one fact a down check actually has. */
      const text = await res.text();
      let body = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
      result = { at: startedAt, up: res.ok && body?.ok === true, body };
    } catch {
      result = { at: startedAt, up: false, body: null };
    } finally {
      clearTimeout(abort);
      inFlight.current.delete(controller);
    }
    if (myRun !== run.current) return; // superseded by a teardown
    /* Sorted by START time, not appended in resolution order: two checks can
     * be in flight at once and the slower one resolves last regardless of
     * which began first. `latest` and the restart detector both read this as
     * chronological. */
    setChecks((prev) => [...prev, result].sort((a, b) => a.at - b.at).slice(-HISTORY));
  }, []);

  useEffect(() => {
    const myRun = run.current;
    const controllers = inFlight.current;
    let cancelled = false;
    let timer = null;
    const loop = async () => {
      /* Skipped, not stopped, while the tab is hidden. A phone left on this
       * page all day should cost the dyno nothing; the visibility handler
       * below catches it up the moment it comes back. */
      if (!document.hidden) await check();
      if (cancelled || run.current !== myRun) return;
      timer = setTimeout(loop, POLL_MS);
    };
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastAt.current >= POLL_MS) check();
    };
    document.addEventListener("visibilitychange", onVisible);
    loop();
    return () => {
      cancelled = true;
      run.current += 1; // invalidate any result still in flight from this run
      document.removeEventListener("visibilitychange", onVisible);
      for (const c of controllers) c.abort();
      controllers.clear();
      clearTimeout(timer);
    };
  }, [check]);

  const latest = checks[checks.length - 1] || null;
  const mem = latest?.body?.mem || null;

  /* THE RESTART DETECTOR — what an up/down light cannot tell you. uptime_s
   * going DOWN means the process answering now is not the one that answered
   * before: the signature of a crash-loop, and on 2026-09-03 it was true while
   * /health returned a healthy 200 throughout. Compared against the last
   * uptime actually SEEN rather than the previous array slot, because a
   * crash-loop reads up(100) → down → down → up(15) and adjacent pairs find
   * nothing there — the exact shape this is meant to catch would score zero. */
  let restarts = 0;
  let lastUptime = null;
  for (const c of checks) {
    const now = c.body?.uptime_s;
    if (!Number.isFinite(now)) continue; // a down check carries no uptime to compare
    if (lastUptime != null && now < lastUptime) restarts += 1;
    lastUptime = now;
  }
  /* A failed check is evidence of instability on its own. Without this,
   * up → down → up ends with latest.up true and restarts 0, and the strip
   * would read OK seconds after recording a failure. */
  const failures = checks.filter((c) => !c.up).length;

  const rss = mem?.rss_mb;
  const rssPct = Number.isFinite(rss) ? Math.round((rss / QUOTA_MB) * 100) : null;
  /* Three bands, and the middle one is the point: R14 fires above the quota,
   * but a dyno at 90% is already on the path that ends in a crash-loop. */
  const rssTone = rssPct == null ? "idle" : rssPct >= 100 ? "bad" : rssPct >= 85 ? "warn" : "ok";

  const heapUsed = mem?.heap_used_mb;
  const heapLimit = mem?.heap_limit_mb;
  const heapPct =
    Number.isFinite(heapUsed) && Number.isFinite(heapLimit) && heapLimit > 0
      ? Math.round((heapUsed / heapLimit) * 100)
      : null;
  const heapTone = heapPct == null ? "idle" : heapPct >= 90 ? "bad" : heapPct >= 75 ? "warn" : "ok";

  /* Memory has to reach the label. Derived from failures alone this said "OK"
   * while RSS sat at 104% — the reassuring-but-wrong answer. Being over quota
   * is the story, not the epilogue. */
  const strain =
    rssTone === "bad" || heapTone === "bad"
      ? "bad"
      : rssTone === "warn" || heapTone === "warn"
        ? "warn"
        : "ok";

  const state = !latest
    ? "checking"
    : !latest.up
      ? "down"
      : restarts > 0 || failures > 0
        ? "flapping"
        : strain !== "ok"
          ? "strained"
          : "up";

  const label = {
    checking: "CHECKING BACKEND…",
    up: "BACKEND OK",
    strained: strain === "bad" ? "BACKEND OVER QUOTA" : "BACKEND STRAINED",
    flapping: "BACKEND RESTARTING",
    down: "BACKEND DOWN",
  }[state];

  const tone = {
    checking: "idle",
    up: "ok",
    strained: strain,
    flapping: "warn",
    down: "bad",
  }[state];

  /* The one line under the label says why the label is what it is — a strip
   * that reports trouble without naming it is barely better than no strip. */
  const detail =
    state === "checking"
      ? "asking /health"
      : state === "down"
        ? "every project on this backend is affected"
        : state === "flapping"
          ? [
              restarts > 0 && `${restarts} restart${restarts === 1 ? "" : "s"}`,
              failures > 0 && `${failures} failed check${failures === 1 ? "" : "s"}`,
            ]
              .filter(Boolean)
              .join(" and ") + ` in the last ${checks.length}`
          : [
              `up ${fmtUptime(latest?.body?.uptime_s)}`,
              rssPct != null ? `RSS ${rss}/${QUOTA_MB} MB (${rssPct}%)` : null,
              heapPct != null && heapTone !== "ok" ? `heap ${heapPct}%` : null,
              latest?.body?.db && latest.body.db !== "up" ? `db ${latest.body.db}` : null,
            ]
              .filter(Boolean)
              .join(" · ");

  return (
    <a
      href="/status"
      aria-label={`Backend status: ${label.toLowerCase()}. ${detail}. Opens the full status page.`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${TONE[tone]}`,
        borderRadius: 12,
        padding: "10px 12px",
        marginBottom: 12,
        textDecoration: "none",
        color: C.text,
        minHeight: 44,
      }}
    >
      <span
        aria-hidden
        style={{
          flex: "none",
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: TONE[tone],
        }}
      />
      <span style={{ minWidth: 0, flex: 1 }} aria-live="polite">
        <span
          style={{
            display: "block",
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: 0.6,
            color: TONE[tone],
          }}
        >
          {label}
        </span>
        {detail && (
          <span style={{ display: "block", fontSize: 11.5, color: C.muted, marginTop: 2 }}>
            {detail}
          </span>
        )}
      </span>

      {/* One bar per check: height is RSS against the quota, colour is whether
        * the check answered at all. A failed check is a full-height red bar
        * because it has no memory reading to draw and is the worse news. */}
      {checks.length > 0 && (
        <span
          aria-hidden
          style={{ flex: "none", display: "flex", alignItems: "flex-end", gap: 2, height: 18 }}
        >
          {checks.map((c) => {
            const pct = Number.isFinite(c.body?.mem?.rss_mb)
              ? Math.min(100, Math.round((c.body.mem.rss_mb / QUOTA_MB) * 100))
              : null;
            return (
              <span
                key={c.at}
                style={{
                  display: "block",
                  width: 3,
                  borderRadius: 1,
                  height: c.up ? `${Math.max(12, pct ?? 12)}%` : "100%",
                  background: !c.up ? C.red : pct >= 85 ? C.amber : C.green,
                }}
              />
            );
          })}
        </span>
      )}

      <span style={{ flex: "none", fontSize: 11.5, color: C.muted }}>→</span>
    </a>
  );
}
