import { C, chip, navLink } from "./theme.js";
import { ENGINE_PAGES } from "./pages.js";

/* The header row every betting screen wears: title, state pill, freshness,
 * error, and the links to its four siblings.
 *
 * These five pages are one set. Before 2026-08-31 each built this row by hand
 * and they had drifted apart in ways that were more than cosmetic — /gas-value
 * was missing from the nav on three of them, two pages had no state pill at
 * all, and the pill that did exist disagreed with itself about what a killed
 * engine looks like (see EnginePill). Build the row from here.
 */

/* One group, and it WRAPS. The links are pushed right by `marginLeft: auto`,
 * so on a wide header they sit on the title's row; grouping them keeps the
 * header's own flex-wrap moving them as a unit instead of stranding one link
 * on a line by itself. Five chips do not fit a phone, hence flexWrap here —
 * with four they were already at the edge and the fifth (gas) tipped it. */
const navGroup = {
  marginLeft: "auto",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "flex-end",
};

export function EngineNav({ self, children }) {
  return (
    <span style={navGroup}>
      {ENGINE_PAGES.filter((p) => p.key !== self).map((p) => (
        <a key={p.key} href={p.href} style={navLink}>
          {p.label} →
        </a>
      ))}
      {children}
    </span>
  );
}

/* The engine's own state, as one chip.
 *
 * KILLED IS CHECKED FIRST, and that is a fix rather than a preference.
 * /crypto-value used to test `enabled` first, so an engine killed from the page
 * while its env flag was still on rendered LIVE there and KILLED on
 * /weather-value and /gas-value — the same engine, two answers, and the wrong
 * one was the reassuring one.
 *
 * `paper` is a separate prop because `status.paper` is NOT the same field on
 * every engine: crypto sends a boolean (`!cfg.enabled_env`), while weather and
 * gas send their paper LEDGER object under that name. Reading it directly here
 * would have made every weather/gas page report paper mode by accident. Pass it
 * only from an engine whose status really carries the boolean; left out, a
 * not-killed, not-enabled engine is PAPER, which is what weather and gas have
 * always shown. */
export function EnginePill({ status, paper }) {
  if (!status) return null;
  if (status.killed) return <span style={chip(C.redSoft, C.red)}>KILLED</span>;
  if (status.enabled)
    return <span style={chip(C.greenSoft, C.green)}>LIVE</span>;
  if (paper === undefined || paper)
    return <span style={chip(C.paperSoft, C.amber)}>PAPER</span>;
  return <span style={chip(C.chipBg, C.muted)}>OFF</span>;
}

/* Crypto's loop evaluates continuously, so anything past 5 minutes is late and
 * 25 is that engine's own alarm threshold. The other engines scan on a CRON —
 * weather every 10 minutes, gas every 15 — where "6 minutes since the last
 * scan" is a perfectly healthy mid-cycle reading. Those pages pass their own
 * `config.scan_minutes` and the thresholds become multiples of it; hardcoding
 * 5/25 for everyone would have left /weather-value and /gas-value amber for
 * most of every cycle, which is the fastest way to teach someone to ignore the
 * colour. */
const DEFAULT_STALE_MINS = 5;
const DEFAULT_ALARM_MINS = 25;

/* Module-level, like EngineBlockedBanner's twin: reading the clock inside a
   component body is a render-purity lint error. */
const agoSecs = (iso) => {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 1000));
};

/* How long since the betting loop last did anything, in the loop's own terms.
 *
 * NOT the page's poll. GET /scan runs a scan on demand for the page and stamps
 * it "now", so a label built from it read "0s ago" through the entire 7h14m
 * crypto outage on 2026-08-04 — it was measuring this page's own request. Feed
 * this either `ageSecs` (crypto publishes `loop.eval_age_secs`) or `at` (the
 * weather and gas engines publish `last_scan.at`); both describe the background
 * loop. Amber past 5 minutes, red past the engines' own 25-minute alarm. */
export function EngineFreshness({
  status,
  ageSecs,
  at,
  scanMinutes,
  label = "engine",
}) {
  if (!status)
    return <span style={{ fontSize: 11, color: C.muted }}>loading…</span>;
  const age = ageSecs != null ? ageSecs : agoSecs(at);
  if (age == null)
    return <span style={{ fontSize: 11, color: C.muted }}>{label} —</span>;
  // A cron engine gets one missed scan of slack before amber, two before red.
  const staleMins = scanMinutes ? scanMinutes * 2 : DEFAULT_STALE_MINS;
  const alarmMins = scanMinutes ? scanMinutes * 3 : DEFAULT_ALARM_MINS;
  const mins = age / 60;
  const color =
    mins >= alarmMins ? C.red : mins >= staleMins ? C.amber : C.muted;
  const txt = age < 90 ? `${Math.round(age)}s` : `${Math.round(mins)}m`;
  return (
    <span style={{ fontSize: 11, color }}>
      {label} {txt} ago{mins >= alarmMins ? " — STALLED" : ""}
    </span>
  );
}

const headerRow = {
  display: "flex",
  alignItems: "baseline",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 12,
};

/* Title and subtitle are one block so the subtitle sits directly under the
 * title at every width. Ordering them as separate flex items instead needed the
 * subtitle to come after the nav chips on desktop (to keep the chips up on the
 * title's row) but before them on mobile (where the chips wrap) — which no
 * single order can do without a media query. Grouping sidesteps it. */
export function EngineHeader({
  title,
  subtitle,
  self,
  status,
  paper,
  ageSecs,
  at,
  scanMinutes,
  err,
  children,
}) {
  return (
    <div style={headerRow}>
      <div
        style={{
          minWidth: 0,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{title}</h1>
          {subtitle ? (
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        <EnginePill status={status} paper={paper} />
        {/* Whether the page OPTS IN, not whether it has a value yet: with a
            `!= null` test the chip vanished on first paint (status is null, so
            both are null) and EngineFreshness's own "loading…" state could
            never be reached. */}
        {(ageSecs !== undefined || at !== undefined) && (
          <EngineFreshness
            status={status}
            ageSecs={ageSecs}
            at={at}
            scanMinutes={scanMinutes}
          />
        )}
        {err ? (
          <span style={{ fontSize: 11, color: C.red }}>{String(err)}</span>
        ) : null}
      </div>
      <EngineNav self={self}>{children}</EngineNav>
    </div>
  );
}
