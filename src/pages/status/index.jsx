import { useCallback, useEffect, useRef, useState } from "react";

/* /status — is the shared backend alive, and is it about to stop being?
 *
 * WHY THIS PAGE EXISTS, AND WHY IT SHOWS WHAT IT SHOWS.
 *
 * On 2026-09-03 sheline-art-website-api spent ~40 minutes in an OOM
 * crash-loop and took all ~36 projects with it. What made that slow to spot is
 * that every INSTANTANEOUS check looked fine: /health returned 200 with
 * `db: up` whenever you happened to catch it between crashes, and the dyno
 * reported "up". The outage was only visible in two numbers:
 *
 *   - uptime_s, which kept RESETTING. A backend that has been up for 90
 *     seconds, again, is not a healthy backend.
 *   - rss_mb, which climbed toward the memory quota and then over it.
 *
 * So this page is deliberately not a green dot. It is those two numbers, over
 * time, with a strip of recent checks so a flap is visible as a flap. A single
 * red/green light would have said "fine" for most of that outage.
 *
 * It reads the same public /health the Heroku Scheduler health-check polls, and
 * calls it straight from the browser — no proxy — which matters: this page has
 * to keep working when the backend does not. It is hosted on Amplify and shares
 * nothing with the thing it is watching, so "the page loads and says DOWN" is a
 * meaningful answer rather than a blank screen.
 *
 * Unlisted and cardless, like everything else in privatePages.js, and — as ever
 * — that is obscurity, not access control. /health is a public endpoint.
 */

const HEALTH_URL = "https://sheline-art-website-api.herokuapp.com/health";

/* Slower than the betting pages' 15s on purpose. This watches a dyno that is
 * already memory-constrained, and a status page that adds meaningful load to
 * the thing it is measuring is worse than no status page. Every open tab
 * multiplies it. */
const POLL_MS = 20000;

/* A request that has not answered in this long is a symptom, not a wait. During
 * the 2026-09-03 outage a crashed dyno took ~4s to return Heroku's error page;
 * a hung one returns nothing at all, and the distinction matters here. */
const TIMEOUT_MS = 15000;

/* How many checks the strip remembers. At 20s a poll this is ~10 minutes of
 * history — long enough that a crash-loop with a ~2 minute period shows up as
 * several bars rather than one. Client-side only: nothing is persisted, so a
 * reload starts the history over, which is honest about what this page knows. */
const HISTORY = 30;

const QUOTA_MB = 1024; // Standard-2X. RSS above this is Heroku's R14.

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

const fmtClock = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function Status() {
  const [checks, setChecks] = useState([]);
  const [busy, setBusy] = useState(false);
  /* The poll is scheduled from inside itself rather than on a setInterval, so a
   * slow or timed-out check can never overlap the next one — which is the exact
   * stacking behaviour that caused the outage this page watches. */
  const timer = useRef(null);
  /* A generation counter, not an `alive` boolean.
   *
   * A single shared boolean is not enough under StrictMode's dev
   * setup→cleanup→setup double-invoke: the first mount's fetch is still in
   * flight when cleanup flips the flag, and the second mount flips it back to
   * true before that fetch resolves — so the stray result lands anyway. Bumping
   * a counter on teardown instead means each run compares against the value it
   * started with, and a superseded run can never commit. */
  const run = useRef(0);
  const inFlight = useRef(null);

  const check = useCallback(async () => {
    const myRun = run.current;
    setBusy(true);
    const startedAt = Date.now();
    let result;
    const controller = new AbortController();
    /* Held on a ref so unmount can actually abort it. Left as a local it was
     * unreachable from cleanup, and a request against a struggling dyno kept
     * running for up to TIMEOUT_MS after the user had navigated away. */
    inFlight.current = controller;
    const abort = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(HEALTH_URL, { signal: controller.signal, cache: "no-store" });
      const ms = Date.now() - startedAt;
      /* Heroku serves its own HTML error page with a 503 when the dyno is
       * crashed, so a non-JSON body is expected here, not exceptional — read it
       * as text first and only then try to parse. Calling .json() straight off
       * would throw and lose the status code, which is the one fact we have. */
      const text = await res.text();
      let body = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
      const up = res.ok && body?.ok === true;
      /* Every failure gets a reason. Keying the note off `res.ok` alone left a
       * whole class of failures explaining nothing: a captive-portal wifi login
       * answers 200 with an HTML page, which is not ok:true and so reads as
       * DOWN — and the banner rendered "Backend is DOWN" with no subline at
       * all. A status page that says something is wrong without saying what is
       * barely better than the blank screen it replaced. */
      result = {
        at: startedAt,
        ms,
        status: res.status,
        up,
        body,
        note: up
          ? null
          : !res.ok
            ? `HTTP ${res.status}`
            : body == null
              ? `HTTP 200 but the body was not JSON — something between you and the backend answered instead`
              : `HTTP 200 but the body did not say ok:true`,
      };
    } catch (err) {
      result = {
        at: startedAt,
        ms: Date.now() - startedAt,
        status: 0,
        up: false,
        body: null,
        note: err.name === "AbortError" ? `no answer in ${TIMEOUT_MS / 1000}s` : "unreachable",
      };
    } finally {
      clearTimeout(abort);
      if (inFlight.current === controller) inFlight.current = null;
    }
    if (myRun !== run.current) return; // superseded by a teardown
    setChecks((prev) => [...prev, result].slice(-HISTORY));
    setBusy(false);
  }, []);

  useEffect(() => {
    const myRun = run.current;
    let cancelled = false;
    const loop = async () => {
      await check();
      if (cancelled || run.current !== myRun) return;
      timer.current = setTimeout(loop, POLL_MS);
    };
    loop();
    document.title = "Backend status — Bullion Ventures LLC";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      cancelled = true;
      run.current += 1; // invalidate any result still in flight from this run
      inFlight.current?.abort();
      clearTimeout(timer.current);
      document.title = "Bullion Ventures LLC";
      meta.remove();
    };
  }, [check]);

  const latest = checks[checks.length - 1] || null;
  const mem = latest?.body?.mem || null;

  /* THE RESTART DETECTOR — the thing a plain up/down light cannot tell you.
   *
   * uptime_s going DOWN between two checks means the process we are talking to
   * is not the one we were talking to before. That is the signature of a
   * crash-loop, and during the 2026-09-03 outage it was true while /health was
   * returning a perfectly healthy 200. Counted across the whole visible window
   * rather than just the last pair, because at a 20s poll against a ~2 minute
   * crash period you will often sample two boots in a row and see neither the
   * crash nor the recovery. */
  let restarts = 0;
  let lastUptime = null;
  for (const c of checks) {
    const now = c.body?.uptime_s;
    if (!Number.isFinite(now)) continue; // a down check carries no uptime to compare
    /* Compare against the last uptime we actually SAW, not the previous array
     * slot. A crash-loop reads up(100) → down → down → up(15), and comparing
     * adjacent pairs finds nothing there because the middle entries have no
     * uptime at all — the one shape this is most meant to catch would score
     * zero. Carrying the last known value forward sees 100 → 15. */
    if (lastUptime != null && now < lastUptime) restarts += 1;
    lastUptime = now;
  }

  /* A failed check is itself evidence of instability, even if every uptime we
   * managed to read went up. Without this, sampling up → down → up ends with
   * `latest.up` true and restarts 0, and the banner would say "Backend is up"
   * seconds after recording a failure — which is the reassuring-but-wrong
   * answer this whole page exists to avoid giving. */
  const failures = checks.filter((c) => !c.up).length;

  const rss = mem?.rss_mb;
  const rssPct = Number.isFinite(rss) ? Math.round((rss / QUOTA_MB) * 100) : null;
  /* Three bands, and the middle one is the point. Heroku's R14 fires above the
   * quota, but a dyno at 90% is already on the path that ends in a crash-loop —
   * the whole lesson of 2026-09-03 is that this is worth seeing BEFORE it is an
   * outage, not after. */
  const rssTone = rssPct == null ? "idle" : rssPct >= 100 ? "bad" : rssPct >= 85 ? "warn" : "ok";

  const heapUsed = mem?.heap_used_mb;
  const heapLimit = mem?.heap_limit_mb;
  const heapPct =
    Number.isFinite(heapUsed) && Number.isFinite(heapLimit) && heapLimit > 0
      ? Math.round((heapUsed / heapLimit) * 100)
      : null;
  const heapTone = heapPct == null ? "idle" : heapPct >= 90 ? "bad" : heapPct >= 75 ? "warn" : "ok";

  const unstable = restarts > 0 || failures > 0;

  /* THE BANNER HAS TO KNOW ABOUT MEMORY.
   *
   * Derived from failures alone, this said "Backend is up — responding
   * normally, memory inside its quota" while the RSS card directly beneath it
   * read 104% and R14. That is the reassuring-but-wrong answer the whole page
   * exists to avoid: the banner is the one thing a person actually reads, and
   * on 2026-09-03 the dyno sat over quota for a long while BEFORE it started
   * failing checks. Being over quota is the story, not the epilogue. */
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
      : unstable
        ? "flapping"
        : strain !== "ok"
          ? "strained"
          : "up";
  const headline = {
    checking: "Checking…",
    up: "Backend is up",
    strained: strain === "bad" ? "Up, but over its memory quota" : "Up, but memory is climbing",
    flapping: "Up, but restarting",
    down: "Backend is DOWN",
  }[state];
  const subline = {
    checking: "Asking /health for the first time.",
    up: "Responding normally, memory inside its quota.",
    strained:
      `Answering every check, but RSS is ${rss} MB — ${rssPct}% of the ${QUOTA_MB} MB quota` +
      (heapPct != null && heapTone !== "ok" ? `, and the heap is at ${heapPct}% of its cap` : "") +
      `. ${strain === "bad" ? "Over quota is Heroku's R14." : "This is the climb that precedes a crash-loop."} Nothing has failed yet.`,
    flapping: `Answering right now, but not steadily: ${[
      restarts > 0 && `${restarts} restart${restarts === 1 ? "" : "s"}`,
      failures > 0 && `${failures} failed check${failures === 1 ? "" : "s"}`,
    ]
      .filter(Boolean)
      .join(" and ")} in the last ${checks.length}. A backend that keeps coming back up is still an outage.`,
    down: latest?.note ? `${latest.note} — every project on this backend is affected.` : "",
  }[state];

  return (
    <main style={S.page}>
      <style>{CSS}</style>
      <div style={S.shell}>
        <header style={S.head}>
          <div style={S.eyebrow}>Private</div>
          <h1 style={S.title}>Backend status</h1>
          <p style={S.note}>
            <code style={S.code}>sheline-art-website-api</code> — the one backend under roughly
            36 projects. This page is hosted separately, so it still answers when that does not.
          </p>
        </header>

        <section style={{ ...S.banner, ...BANNER[state] }} aria-live="polite">
          <div style={S.bannerDot} className={`bv-dot bv-dot-${state}`} />
          <div style={{ minWidth: 0 }}>
            <div style={S.bannerTitle}>{headline}</div>
            {subline && <div style={S.bannerNote}>{subline}</div>}
          </div>
          <button
            type="button"
            className="bv-refresh"
            onClick={check}
            disabled={busy}
            style={S.refresh}
          >
            {busy ? "Checking…" : "Check now"}
          </button>
        </section>

        <div style={S.grid}>
          <Stat
            label="Uptime"
            value={fmtUptime(latest?.body?.uptime_s)}
            tone={unstable ? "warn" : "idle"}
            foot={
              restarts > 0
                ? `${restarts} restart${restarts === 1 ? "" : "s"} seen since this page loaded`
                : failures > 0
                  ? `${failures} failed check${failures === 1 ? "" : "s"} since this page loaded`
                  : "since the current process started"
            }
          />
          <Stat
            label="Database"
            value={latest?.body?.db ? String(latest.body.db).toUpperCase() : "—"}
            tone={latest?.body?.db === "up" ? "ok" : latest ? "bad" : "idle"}
            foot={
              Number.isFinite(latest?.body?.db_ms) ? `${latest.body.db_ms} ms round trip` : "no answer"
            }
          />
          <Stat
            label="Response time"
            value={latest ? `${latest.ms} ms` : "—"}
            /* A failed check is not a fast success. Heroku's crashed-dyno
               error page comes back in ~4s, under the 5s threshold, which
               rendered this card green directly beneath a red DOWN banner. */
            tone={!latest ? "idle" : !latest.up ? "bad" : latest.ms > 5000 ? "warn" : "ok"}
            foot={latest ? `HTTP ${latest.status || "—"} at ${fmtClock(latest.at)}` : "—"}
          />
          <Stat
            label="Memory (RSS)"
            value={Number.isFinite(rss) ? `${rss} MB` : "—"}
            tone={rssTone}
            foot={rssPct == null ? "—" : `${rssPct}% of the ${QUOTA_MB} MB quota${rssPct >= 100 ? " — R14" : ""}`}
            bar={rssPct}
          />
          <Stat
            label="V8 heap"
            value={Number.isFinite(heapUsed) ? `${heapUsed} MB` : "—"}
            tone={heapTone}
            foot={
              heapPct == null ? "—" : `${heapPct}% of the ${heapLimit} MB cap — an OOM crash is this hitting 100%`
            }
            bar={heapPct}
          />
          <Stat
            label="Checks"
            value={String(checks.length)}
            tone="idle"
            foot={`one every ${POLL_MS / 1000}s, last ${HISTORY} kept`}
          />
        </div>

        <section style={S.histWrap}>
          <div style={S.groupLabel}>
            Recent checks
            <span style={S.groupCount}>{checks.length}</span>
          </div>
          <p style={S.histNote}>
            Oldest on the left. A run of red between greens is a crash-loop — the pattern a
            single status light hides.
          </p>
          {/* The label spells out the PATTERN, not just the count. This strip's
              whole claim is that a run of red between greens is a crash-loop —
              conveyed by bar colour and a hover-only tooltip, neither of which
              a screen reader or a touch user gets. So the shape goes in words:
              how many failed, and whether they were recent. */}
          <div
            style={S.hist}
            role="img"
            aria-label={
              checks.length === 0
                ? "No health checks yet"
                : `Last ${checks.length} health checks: ${checks.length - failures} up, ${failures} failed` +
                  (failures > 0
                    ? `. Most recent check ${latest?.up ? "succeeded" : "failed"}${restarts > 0 ? `, and the backend restarted ${restarts} time${restarts === 1 ? "" : "s"}` : ""}.`
                    : ". No failures.")
            }
          >
            {checks.length === 0 && <div style={S.histEmpty}>No checks yet.</div>}
            {checks.map((c) => (
              <div
                key={c.at}
                className={`bv-bar bv-bar-${c.up ? "ok" : "bad"}`}
                style={S.bar}
                title={`${fmtClock(c.at)} — ${c.up ? "up" : c.note || "down"} (${c.ms} ms)`}
              />
            ))}
          </div>
        </section>

        <p style={S.foot}>
          Reads the public <code style={S.code}>/health</code> endpoint directly from your
          browser. Nothing here can change anything — it is a read, and there are no controls.
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value, foot, tone = "idle", bar = null }) {
  return (
    <div style={S.card}>
      <div style={S.cardLabel}>{label}</div>
      <div style={{ ...S.cardValue, color: TONE[tone] }}>{value}</div>
      {bar != null && (
        <div style={S.track}>
          {/* Capped at 100% width so an over-quota reading fills the track
              rather than overflowing the card; the number above it still says
              the true figure, which is the one that matters. */}
          <div style={{ ...S.fill, width: `${Math.min(100, Math.max(0, bar))}%`, background: TONE[tone] }} />
        </div>
      )}
      {foot && <div style={S.cardFoot}>{foot}</div>}
    </div>
  );
}

const TONE = {
  ok: "#4ade80",
  warn: "#e0b24c",
  bad: "#f87171",
  idle: "#f4f4f7",
};

const BANNER = {
  checking: { borderColor: "#24242e" },
  up: { borderColor: "rgba(74, 222, 128, .45)" },
  strained: { borderColor: "rgba(224, 178, 76, .55)" },
  flapping: { borderColor: "rgba(224, 178, 76, .55)" },
  down: { borderColor: "rgba(248, 113, 113, .55)" },
};

const CSS = `
.bv-dot { border-radius: 999px; flex-shrink: 0; }
.bv-dot-up { background: #4ade80; }
.bv-dot-flapping, .bv-dot-strained { background: #e0b24c; }
.bv-dot-down { background: #f87171; }
.bv-dot-checking { background: #5f5f74; }
/* The pulse is decoration on top of a colour and a word, never the only cue. */
.bv-dot-down, .bv-dot-flapping, .bv-dot-strained { animation: bv-pulse 1.6s ease-in-out infinite; }
@keyframes bv-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }

.bv-bar { border-radius: 2px; }
.bv-bar-ok { background: #4ade80; }
.bv-bar-bad { background: #f87171; }

.bv-refresh {
  margin-left: auto;
  flex-shrink: 0;
  background: #17171e;
  border: 1px solid #24242e;
  color: #f4f4f7;
  border-radius: 9px;
  padding: 8px 13px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color .15s ease, border-color .15s ease;
}
.bv-refresh:hover:not(:disabled) { background: #1b1b23; border-color: rgba(224, 178, 76, .45); }
.bv-refresh:disabled { opacity: .55; cursor: default; }
.bv-refresh:focus-visible { outline: 2px solid #e0b24c; outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .bv-dot-down, .bv-dot-flapping, .bv-dot-strained { animation: none; }
  .bv-refresh { transition: none; }
}
`;

const S = {
  page: {
    flex: 1,
    background: "#0a0a0d",
    color: "#f4f4f7",
    padding:
      "36px max(18px, env(safe-area-inset-right)) calc(56px + env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left))",
    boxSizing: "border-box",
    // Flex item of App.jsx's column; min-width:auto refuses to shrink below
    // min-content, the same trap /jump and EnginePage document.
    width: "100%",
    minWidth: 0,
  },
  shell: { maxWidth: 940, margin: "0 auto" },
  head: { marginBottom: 22 },
  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#e0b24c",
    marginBottom: 6,
  },
  title: { margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "#f4f4f7" },
  note: { margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "#83839a", maxWidth: 620 },
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
    fontSize: 12.5,
    color: "#c9c9d6",
  },
  banner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#15151c",
    border: "1px solid #24242e",
    borderRadius: 13,
    padding: "14px 16px",
    marginBottom: 18,
    flexWrap: "wrap",
  },
  bannerDot: { width: 12, height: 12 },
  bannerTitle: { fontSize: 17, fontWeight: 800, color: "#f4f4f7" },
  bannerNote: { fontSize: 12.5, color: "#83839a", marginTop: 3, lineHeight: 1.5 },
  refresh: {},
  grid: {
    display: "grid",
    gap: 10,
    // min(220px, 100%) rather than a bare 220px — a bare fixed floor is the
    // track's minimum contribution and is NOT clamped to the container, so a
    // narrow phone pans sideways instead of wrapping. Same fix /jump carries.
    gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))",
    marginBottom: 26,
  },
  card: {
    background: "#15151c",
    border: "1px solid #24242e",
    borderRadius: 12,
    padding: "13px 14px",
    minWidth: 0,
  },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.13em",
    textTransform: "uppercase",
    color: "#5f5f74",
  },
  cardValue: {
    fontSize: 23,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    marginTop: 5,
    fontVariantNumeric: "tabular-nums",
  },
  track: {
    height: 4,
    borderRadius: 999,
    background: "#24242e",
    marginTop: 9,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999 },
  // #7a7a92 not #5f5f74: this line carries the actual numbers (percentages,
  // quotas, restart counts) and has to survive being read carefully. Same
  // reasoning as the path colour on /jump.
  cardFoot: { fontSize: 11.5, color: "#7a7a92", marginTop: 7, lineHeight: 1.45 },
  histWrap: { marginBottom: 26 },
  groupLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "0 0 8px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.13em",
    textTransform: "uppercase",
    color: "#5f5f74",
  },
  groupCount: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 0,
    color: "#5f5f74",
    background: "#15151c",
    border: "1px solid #24242e",
    borderRadius: 999,
    padding: "1px 7px",
  },
  histNote: { margin: "0 0 10px", fontSize: 12.5, color: "#83839a", lineHeight: 1.5, maxWidth: 560 },
  hist: {
    display: "flex",
    alignItems: "stretch",
    gap: 3,
    height: 34,
    background: "#15151c",
    border: "1px solid #24242e",
    borderRadius: 10,
    padding: 8,
    overflow: "hidden",
  },
  bar: { flex: 1, minWidth: 4 },
  histEmpty: { fontSize: 12.5, color: "#5f5f74", alignSelf: "center" },
  foot: { fontSize: 12, color: "#5f5f74", lineHeight: 1.55, margin: 0, maxWidth: 620 },
};
