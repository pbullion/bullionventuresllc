import { useEffect, useRef, useState } from "react";
import OpenBetsRail from "../../components/OpenBetsRail";

const API_BASE = "https://sheline-art-website-api.herokuapp.com/kalshi";

/* ─── Dark palette (matches my-bets) ─── */
const C = {
  bg: "#0b0e14",
  panel: "#151a24",
  border: "#252c3a",
  text: "#e8eaed",
  muted: "#8a93a6",
  green: "#22c55e",
  greenSoft: "#123021",
  greenBorder: "#2f7d55",
  red: "#ef4444",
  redSoft: "#301416",
  redBorder: "#8a3a3d",
  amber: "#eab308",
  chipBg: "#1c2430",
  rowAlt: "#1a2029",
};

/* Cross-link to a sibling betting screen. Kept identical to the counterpart
 * links on /crypto-value and /my-bets — these three pages are one set, so the
 * button should read the same on all of them. */
const navLink = {
  fontSize: 12,
  fontWeight: 700,
  color: C.text,
  background: C.chipBg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "5px 12px",
  textDecoration: "none",
  whiteSpace: "nowrap",
};
const navGroup = { marginLeft: "auto", display: "flex", gap: 8 };

const cents = (dollars) =>
  dollars == null ? "—" : `${Math.round(Number(dollars) * 100)}¢`;
const pct = (p) => (p == null ? "—" : `${Math.round(Number(p) * 100)}%`);
// Signed edge in cents: "+7¢" / "-3¢".
const edgeCents = (e) => {
  if (e == null) return "—";
  const v = Math.round(Number(e) * 100);
  return `${v >= 0 ? "+" : ""}${v}¢`;
};
// Remaining-time label. WNBA remaining is seconds ("8:24 left"); MLB remaining
// is innings ("4.5 inn left").
const remainingLabel = (game) => {
  const r = game.remaining_secs;
  if (r == null) return "";
  if (game.league === "mlb") {
    return `${Number(r) % 1 === 0 ? r : Number(r).toFixed(1)} inn left`;
  }
  const m = Math.floor(r / 60);
  const s = Math.round(r % 60);
  return `${m}:${String(s).padStart(2, "0")} left`;
};
// "6:40 PM CT" for an upcoming game's tip time.
const tipTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(d)} CT`;
};

/* A game's status text, guaranteed Central. ESPN's pre-game detail is an
 * Eastern-only string ("7/24 - 6:45 PM EDT"), so a scheduled game is always
 * reformatted from its ISO date; live/final details ("Top 4th", "Final") have no
 * wall-clock time and pass through. The regex catches any other Eastern stamp.
 * `state` lives on the scan item, not the nested ESPN game, so it's passed in. */
const looksEastern = (s) => /\b(?:E[DS]T|ET)\b/i.test(String(s || ""));
const detailCT = (g, state) => {
  if (!g) return "";
  if (state === "pre" || looksEastern(g.detail))
    return tipTime(g.date) || g.detail || "";
  return g.detail || "";
};

const edgeColor = (e) =>
  e == null ? C.muted : e >= 0.05 ? C.green : e >= 0 ? C.amber : C.red;

/* ─── Small pieces ─── */

function Chip({ children, color = C.muted, bg = C.chipBg, border = C.border }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        color,
        background: bg,
        border: `1px solid ${border}`,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function StateChip({ state, detail }) {
  if (state === "in")
    return (
      <Chip color={C.green} bg={C.greenSoft} border={C.greenBorder}>
        ● Live {detail ? `· ${detail}` : ""}
      </Chip>
    );
  if (state === "pre") return <Chip>{detail || "Upcoming"}</Chip>;
  if (state === "post") return <Chip color={C.muted}>Final</Chip>;
  return <Chip color={C.amber}>No game match</Chip>;
}

// The pick text for a row: totals read "Over 165.5"; margin markets carry a
// phrase label ("Indiana wins by over 6.5 points"), negated on the NO side.
const pickText = (bet, side) =>
  bet.label
    ? side === "over"
      ? bet.label
      : `No: ${bet.label}`
    : `${side === "over" ? "Over" : "Under"} ${bet.strike}`;

// American odds for a Kalshi price (0.67 → "−203"): how a sportsbook would
// quote the same bet.
const american = (p) => {
  const v = Number(p);
  if (!(v > 0 && v < 1)) return "";
  return v <= 0.5
    ? `+${Math.round((100 * (1 - v)) / v)}`
    : `−${Math.round((100 * v) / (1 - v))}`;
};

const abbrSame = (a, b) =>
  a && b && String(a).toLowerCase() === String(b).toLowerCase();

// Sportsbook-style pick for a scan row: "Guardians −1.5", "Twins ML",
// "Over 8.5". A NO on "<team> wins by over L" reads as the other team +L.
// Falls back to the Kalshi prose when team info isn't resolvable.
const sportsbookPick = (game, bet) => {
  const side = bet.best.side;
  const type = game.market_type || "total";
  if (type === "total")
    return `${side === "over" ? "Over" : "Under"} ${bet.strike}`;
  const gg = game.game || {};
  const away = gg.away || {};
  const home = gg.home || {};
  let pick = null;
  let opp = null;
  if (abbrSame(bet.pick_abbr, away.abbr)) {
    pick = away;
    opp = home;
  } else if (abbrSame(bet.pick_abbr, home.abbr)) {
    pick = home;
    opp = away;
  }
  if (!pick || !pick.team || !opp.team) return pickText(bet, side);
  if (type === "moneyline") return `${(side === "over" ? pick : opp).team} ML`;
  return side === "over"
    ? `${pick.team} −${bet.strike}`
    : `${opp.team} +${bet.strike}`;
};

// Big highlighted card for a recommended value bet.
function ValueBetCard({ game, bet }) {
  const side = bet.best.side;
  const sideP = side === "over" ? bet.p_over : 1 - bet.p_over;
  const kalshiUrl = game.event_ticker
    ? `https://kalshi.com/events/${game.event_ticker.toLowerCase()}`
    : null;
  const Wrapper = kalshiUrl ? "a" : "div";
  return (
    <Wrapper
      {...(kalshiUrl
        ? { href: kalshiUrl, target: "_blank", rel: "noreferrer" }
        : {})}
      style={{
        background: C.greenSoft,
        border: `1px solid ${C.greenBorder}`,
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        textDecoration: "none",
        color: C.text,
        cursor: kalshiUrl ? "pointer" : "default",
      }}
    >
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          {sportsbookPick(game, bet)} {bet.locked_over && "🔒"}
          {kalshiUrl && (
            <span style={{ color: C.green, fontSize: 12, marginLeft: 8 }}>
              Trade ↗
            </span>
          )}
        </div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
          {game.title}
          {detailCT(game.game, game.state)
            ? ` · ${detailCT(game.game, game.state)}`
            : ""}
        </div>
      </div>
      <div style={{ display: "flex", gap: 18, textAlign: "right" }}>
        <div>
          <div style={{ color: C.muted, fontSize: 11 }}>ODDS</div>
          <div style={{ fontWeight: 800 }}>
            {american(bet.best.buy_price_dollars)}
          </div>
          <div style={{ color: C.muted, fontSize: 11 }}>
            {cents(bet.best.buy_price_dollars)}
          </div>
        </div>
        <div>
          <div style={{ color: C.muted, fontSize: 11 }}>MODEL SAYS</div>
          <div style={{ fontWeight: 800 }}>{pct(sideP)}</div>
          <div style={{ color: C.muted, fontSize: 11 }}>
            fair {american(sideP)}
          </div>
        </div>
        <div>
          <div style={{ color: C.muted, fontSize: 11 }}>EDGE</div>
          <div style={{ fontWeight: 800, color: C.green }}>
            {edgeCents(bet.best.edge)}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

// The strike ladder for one game.
function Ladder({ game }) {
  const live = game.state === "in";
  const isMargin = game.market_type && game.market_type !== "total";
  const yesLabel = isMargin ? "YES" : "OVER";
  const noLabel = isMargin ? "NO" : "UNDER";
  const th = {
    textAlign: "right",
    padding: "6px 10px",
    color: C.muted,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
  };
  const td = {
    textAlign: "right",
    padding: "7px 10px",
    fontSize: 13,
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left" }}>LINE</th>
            <th style={th}>BID</th>
            <th style={th}>ASK</th>
            {live && <th style={th}>MODEL P({yesLabel})</th>}
            {live && <th style={th}>{yesLabel} EDGE</th>}
            {live && <th style={th}>{noLabel} EDGE</th>}
          </tr>
        </thead>
        <tbody>
          {game.markets.map((m, i) => {
            const rec = m.recommended;
            return (
              <tr
                key={m.ticker}
                style={{
                  background: rec ? C.greenSoft : i % 2 ? C.rowAlt : "transparent",
                  borderTop: `1px solid ${C.border}`,
                  outline: rec ? `1px solid ${C.greenBorder}` : "none",
                }}
              >
                <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>
                  {isMargin ? m.label : m.strike} {m.locked_over && "🔒"}
                  {rec && (
                    <span style={{ color: C.green, marginLeft: 6, fontSize: 11 }}>
                      {m.best.side === "over" ? `BUY ${yesLabel}` : `BUY ${noLabel}`}
                    </span>
                  )}
                </td>
                <td style={td}>{cents(m.yes_bid_dollars)}</td>
                <td style={td}>{cents(m.yes_ask_dollars)}</td>
                {live && (
                  <td style={{ ...td, fontWeight: 700 }}>{pct(m.p_over)}</td>
                )}
                {live && (
                  <td style={{ ...td, color: edgeColor(m.over_edge) }}>
                    {edgeCents(m.over_edge)}
                  </td>
                )}
                {live && (
                  <td style={{ ...td, color: edgeColor(m.under_edge) }}>
                    {edgeCents(m.under_edge)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GameCard({ game }) {
  const [open, setOpen] = useState(game.state === "in");
  const g = game.game || {};
  const away = g.away || {};
  const home = g.home || {};
  const live = game.state === "in";
  const hasScore = away.score != null && home.score != null;
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${live ? C.greenBorder : C.border}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>
            {hasScore && game.state !== "pre"
              ? `${away.team} ${away.score} – ${home.score} ${home.team}`
              : game.title}
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {game.league_label && <Chip color={C.text}>{game.league_label}</Chip>}
            {game.market_type && game.market_type !== "total" && (
              <Chip color={C.amber}>
                {game.market_type === "spread" ? "Spread" : "Moneyline"}
              </Chip>
            )}
            <StateChip
              state={game.state}
              detail={detailCT(g, game.state)}
            />
            {game.prior_source === "closing_line" && game.prior_total != null && (
              <Chip color={C.text}>Line {Number(game.prior_total).toFixed(1)}</Chip>
            )}
            {game.state === "pre" && away.probable && home.probable && (
              <Chip>SP {away.probable} v {home.probable}</Chip>
            )}
            {live && g.pitcher && <Chip>P: {g.pitcher}</Chip>}
            {live && game.projected_total != null && (
              <Chip color={C.text}>
                Proj total {game.projected_total.toFixed(1)} ± {game.sigma?.toFixed(1)}
              </Chip>
            )}
            {live && game.current_total != null && (
              <Chip color={C.text}>
                Now {game.current_total} · {remainingLabel(game)}
              </Chip>
            )}
            {game.value_bets.length > 0 && (
              <Chip color={C.green} bg={C.greenSoft} border={C.greenBorder}>
                {game.value_bets.length} value bet
                {game.value_bets.length === 1 ? "" : "s"}
              </Chip>
            )}
          </div>
        </div>
        <div style={{ color: C.muted, fontSize: 18 }}>{open ? "▾" : "▸"}</div>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <Ladder game={game} />
          <div style={{ padding: "8px 16px", display: "flex", gap: 16 }}>
            {game.event_ticker && (
              <a
                href={`https://kalshi.com/events/${game.event_ticker.toLowerCase()}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: C.green, fontSize: 12, fontWeight: 700 }}
              >
                Trade on Kalshi ↗
              </a>
            )}
            {g.link && (
              <a
                href={g.link}
                target="_blank"
                rel="noreferrer"
                style={{ color: C.muted, fontSize: 12 }}
              >
                View on ESPN ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Model performance (from the prediction log) ─── */

function Stat({ label, value, color = C.text }) {
  return (
    <div
      style={{
        background: C.chipBg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        minWidth: 110,
      }}
    >
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 18, color, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function PerformancePanel() {
  const [perf, setPerf] = useState(null);
  const [err, setErr] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/totals-value/performance`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setPerf)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return null; // endpoint not deployed yet — hide the panel
  if (!perf) return null;

  const rec = perf.recommended || {};
  const bets = rec.bets || 0;
  const roiPct = rec.roi != null ? `${(rec.roi * 100).toFixed(1)}%` : "—";
  const profit =
    rec.profit_per_contract_dollars != null
      ? `${rec.profit_per_contract_dollars >= 0 ? "+" : "−"}$${Math.abs(
          rec.profit_per_contract_dollars
        ).toFixed(2)}`
      : "—";
  const calBuckets = (perf.calibration || []).filter((b) => b.n > 0);
  const history = (rec.history || []).slice().reverse();

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        marginBottom: 22,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 15, flex: 1 }}>
          📊 Model Performance
          <span style={{ color: C.muted, fontWeight: 500, fontSize: 12, marginLeft: 8 }}>
            {perf.settled_games} game{perf.settled_games === 1 ? "" : "s"} settled ·{" "}
            {bets} alerted bet{bets === 1 ? "" : "s"}
          </span>
        </div>
        <div style={{ color: C.muted, fontSize: 18 }}>{open ? "▾" : "▸"}</div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Stat
              label="RECORD"
              value={bets ? `${rec.wins}–${rec.losses}` : "—"}
              color={rec.wins >= rec.losses ? C.green : C.red}
            />
            <Stat
              label="P/L PER $1"
              value={profit}
              color={(rec.profit_per_contract_dollars || 0) >= 0 ? C.green : C.red}
            />
            <Stat label="ROI" value={roiPct} />
            <Stat
              label="BRIER"
              value={perf.brier_score != null ? perf.brier_score.toFixed(3) : "—"}
            />
            {perf.closing_line && perf.closing_line.events > 0 && (
              <Stat
                label={`MARKET LINE MAE (${perf.closing_line.events})`}
                value={`±${perf.closing_line.mae_points.toFixed(1)} pts`}
              />
            )}
            <Stat
              label="LEARNED σ×"
              value={(() => {
                const learned = Object.entries(perf.model_state || {}).filter(
                  ([, s]) => Number(s.sample_n) > 0
                );
                if (!learned.length) return "not yet";
                return learned
                  .map(
                    ([lg, s]) =>
                      `${lg.toUpperCase()} ${Number(s.sigma_mult).toFixed(2)}`
                  )
                  .join(" · ");
              })()}
            />
          </div>

          {calBuckets.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                CALIBRATION — WHEN THE MODEL SAID X%, HOW OFTEN DID IT GO OVER?
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {calBuckets.map((b) => (
                  <div
                    key={b.bucket}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
                  >
                    <span style={{ width: 62, color: C.muted }}>{b.bucket}</span>
                    <div
                      style={{
                        flex: 1,
                        height: 10,
                        background: C.rowAlt,
                        borderRadius: 5,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${Math.round((b.realized || 0) * 100)}%`,
                          background: C.green,
                          opacity: 0.7,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: `${Math.round((b.predicted || 0) * 100)}%`,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          background: C.text,
                        }}
                      />
                    </div>
                    <span style={{ width: 90, textAlign: "right", color: C.muted }}>
                      {Math.round((b.realized || 0) * 100)}% ({b.n})
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
                Green bar = realized over-rate · white tick = model's average prediction
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                ALERTED BET HISTORY
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {history.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      alignItems: "center",
                      fontSize: 13,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: b.won ? C.greenSoft : C.redSoft,
                      border: `1px solid ${b.won ? C.greenBorder : C.redBorder}`,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>
                      {b.league ? `${b.league.toUpperCase()} · ` : ""}
                      {b.market_type === "spread"
                        ? `${b.side === "over" ? "" : "Not "}${b.pick_abbr} by ${b.strike}+`
                        : b.market_type === "moneyline"
                        ? `${b.pick_abbr} ML ${b.side === "over" ? "✓" : "✗"}`
                        : `${b.side === "over" ? "Over" : "Under"} ${b.strike}`}
                    </span>
                    <span style={{ color: C.muted, flex: 1, minWidth: 120 }}>{b.title}</span>
                    <span>{cents(b.buy_price_dollars)}</span>
                    <span style={{ color: b.won ? C.green : C.red, fontWeight: 800 }}>
                      {b.won ? "WON" : "LOST"}{" "}
                      {b.pnl_dollars >= 0 ? "+" : "−"}${Math.abs(b.pnl_dollars).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {perf.settled_predictions === 0 && (
            <div style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>
              No settled predictions yet — this fills in as games finish.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Auto-Bet panel (backend: routes/kalshi.js auto-bet section) ───
 * Three tiers: status header (pill + config + daily-stake meter + kill/enable
 * toggle), today's bets (the ledger), and the raw activity feed (every eval,
 * including skips with their reason — the "why did/didn't it bet" answer).
 * All read-only except the toggle. */

const timeAgo = (iso) => {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
};

const BET_STATUS_STYLE = {
  placed: { color: C.amber, label: "PENDING" },
  filled: { color: C.amber, label: "OPEN" },
  unfilled: { color: C.muted, label: "NOT PLACED" },
  error: { color: C.red, label: "ERROR" },
  settled: null, // colored by result below
};

// Skip reasons in plain sportsbook english for the activity feed.
const SKIP_REASON_TEXT = {
  disabled: "betting is off",
  league: "league not enabled",
  "edge<min": "edge too small",
  "not-recommended": "model guards",
  "spread-too-wide": "book too thin",
  "bad-price": "bad price",
  "price-too-low": "long shot — model can't price these",
  "opposite-direction": "already bet the other way on this total",
  "segment-paused": "paused by nightly review",
  "already-bet-today": "already bet this",
  "moneyline-mirror": "same bet, other side",
  "daily-cap": "daily limit reached",
  "event-cap": "game limit reached",
  "low-balance": "not enough cash",
  "order-error": "order rejected",
  "db-error": "internal error",
};

function AutoBetPanel({ games }) {
  const [status, setStatus] = useState(null);
  const [bets, setBets] = useState([]);
  const [activity, setActivity] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [review, setReview] = useState(null);
  const [open, setOpen] = useState(true);
  const [feedOpen, setFeedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showUnfilled, setShowUnfilled] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const [s, b, a, sc, rv] = await Promise.all([
        fetch(`${API_BASE}/auto-bets/status`).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
        ),
        fetch(`${API_BASE}/auto-bets`).then((r) => (r.ok ? r.json() : { bets: [] })),
        fetch(`${API_BASE}/auto-bets/activity?limit=40`).then((r) =>
          r.ok ? r.json() : { activity: [] }
        ),
        fetch(`${API_BASE}/auto-bets/scenarios`).then((r) =>
          r.ok ? r.json() : { games: [] }
        ),
        fetch(`${API_BASE}/auto-bets/review`).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);
      setStatus(s);
      setBets(b.bets || []);
      setActivity(a.activity || []);
      setScenarios(sc.games || []);
      setReview(rv && rv.report ? rv : null);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    // Async wrapper keeps the fetch off the effect's synchronous path — no state
    // is written until the response lands.
    (async () => {
      await load();
    })();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (err || !status) return null; // endpoint not deployed yet — hide the panel

  const mode = status.mode; // 'live' | 'paper' | 'off'
  const pill =
    mode === "live"
      ? { text: "● LIVE", color: C.green, bg: C.greenSoft, border: C.greenBorder }
      : mode === "paper"
      ? { text: "PAPER", color: C.amber, bg: "#2b2410", border: "#7a651f" }
      : { text: "OFF", color: C.muted, bg: C.chipBg, border: C.border };
  const t = status.today || {};
  const cfg = status.config || {};
  // The daily cap counts NET money lost (2026-08-03) — winnings offset losses,
  // so this goes negative on a winning day. Fall back to daily_stake so an
  // older backend still renders something sane. The number is printed with its
  // sign meaning intact; only the bar is floored at 0, since a negative width
  // renders as a broken element rather than as "up on the day".
  const capUsed = Number(t.daily_lost != null ? t.daily_lost : t.daily_stake) || 0;
  const stakePct = t.daily_cap
    ? Math.max(0, Math.min(100, Math.round((capUsed / t.daily_cap) * 100)))
    : 0;
  // "$45 up" beats "$-45 lost" — the minus sign is easy to miss, and misreading
  // it inverts the meaning of the line.
  const capUp = capUsed < 0;
  const capAmt = Math.abs(capUsed);

  const unfilledCount = bets.filter((b) => b.status === "unfilled").length;
  const shownBets = showUnfilled
    ? bets
    : bets.filter((b) => b.status !== "unfilled");

  /* Every auto-bet control is PIN-gated (kill, enable and cap) — Patrick's
   * call 2026-07-27, replacing the old open-kill asymmetry. The PIN is cached
   * in localStorage after the first success, so the emergency stop stays one
   * click on a browser that's been used before; only a fresh browser prompts.
   *
   * POSTs a PIN-gated control endpoint, retrying once with a fresh prompt on
   * 401. Returns the parsed body, or null if cancelled/failed. */
  const postWithPin = async (path, body = {}) => {
    let pin = window.localStorage.getItem("bv_autobet_pin") || "";
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!pin) {
        pin = window.prompt("Auto-bet PIN:") || "";
        if (!pin) return null;
      }
      setBusy(true);
      try {
        const r = await fetch(`${API_BASE}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, pin }),
        });
        if (r.status === 401) {
          window.localStorage.removeItem("bv_autobet_pin");
          pin = "";
          continue; // wrong pin — ask once more
        }
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          window.alert(e.error || `HTTP ${r.status}`);
          return null;
        }
        window.localStorage.setItem("bv_autobet_pin", pin);
        return (await r.json().catch(() => ({}))) || {};
      } catch {
        window.alert("request failed");
        return null;
      } finally {
        setBusy(false);
      }
    }
    window.alert("Wrong PIN.");
    return null;
  };

  // Change the daily cap from the UI. Server clamps to a hard ceiling.
  const changeCap = async () => {
    const cur = t.daily_cap != null ? `$${Math.round(t.daily_cap)}` : "";
    // daily_cap_ceiling is null when no server-side ceiling is armed —
    // the number you type is the limit.
    const ceilNote = t.daily_cap_ceiling
      ? `, ceiling $${t.daily_cap_ceiling}`
      : "";
    const raw = window.prompt(
      `New daily cap in dollars (currently ${cur}${ceilNote}).\nLeave blank to reset to the default.`
    );
    if (raw === null) return;
    const asked = raw.trim() === "" ? null : Number(raw);
    const next = await postWithPin("/auto-bets/daily-cap", { cap: asked });
    if (!next) return;
    setStatus(next);
    // The server clamps to the hard ceiling — say so instead of silently
    // "ignoring" a bigger number (raising the ceiling itself is an env
    // change: AUTOBET_MAX_DAILY_CEILING).
    const saved = next.today && next.today.daily_cap;
    if (asked != null && saved != null && asked > saved) {
      window.alert(
        `Saved at $${Math.round(saved)} — that's the ceiling. ` +
          `Raise it with the CEIL button first.`
      );
    }
  };

  // The STANDING ceiling the cap override clamps to — unlike the cap and
  // unit this does NOT lapse overnight. Server keeps the tighter of this and
  // AUTOBET_MAX_DAILY_CEILING, so it can't loosen an env-level bound.
  const changeCeiling = async () => {
    const raw = window.prompt(
      `New daily-cap CEILING in dollars (currently ${
        t.daily_cap_ceiling
          ? `$${t.daily_cap_ceiling}`
          : "none — cap edits are unbounded"
      }).\nStanding until changed (does NOT reset overnight).\n` +
        `Leave blank to remove the ceiling.`
    );
    if (raw === null) return;
    const asked = raw.trim() === "" ? null : Number(raw);
    if (asked != null && (!Number.isFinite(asked) || asked <= 0)) {
      window.alert("Ceiling must be a number > 0 (blank removes it).");
      return;
    }
    const next = await postWithPin("/auto-bets/daily-ceiling", {
      ceiling: asked,
    });
    if (next) setStatus(next);
  };

  // Change the dollar size of one betting unit, for today only. Same shape as
  // the cap: PIN-gated, server-clamped, and it lapses at midnight CT back to
  // AUTOBET_UNIT_DOLLARS — a resize for one heavy slate can't quietly become
  // the permanent stake.
  const changeUnit = async () => {
    const cur = cfg.unit_dollars != null ? `$${cfg.unit_dollars}` : "";
    const ceilNote = t.unit_ceiling ? `, ceiling $${t.unit_ceiling}` : "";
    const raw = window.prompt(
      `New bet unit in dollars (currently ${cur}${ceilNote}).\n` +
        `Sizing bets up to ${cfg.max_units}u, so this sets a $${cfg.unit_dollars}–` +
        `$${cfg.unit_dollars * cfg.max_units} range.\n` +
        `Applies to TODAY only — resets overnight. Leave blank to reset now.`
    );
    if (raw === null) return;
    const asked = raw.trim() === "" ? null : Number(raw);
    const next = await postWithPin("/auto-bets/unit", { unit: asked });
    if (!next) return;
    setStatus(next);
    const saved = next.config && next.config.unit_dollars;
    if (asked != null && saved != null && asked > saved) {
      window.alert(
        `Saved at $${saved} — that's the hard ceiling. ` +
          `Raising it takes a server config change (AUTOBET_UNIT_CEILING).`
      );
    }
  };

  const toggle = async () => {
    const killing = !status.killed;
    const msg = killing
      ? "Trip the auto-bet kill switch? No orders will be placed until re-enabled."
      : status.enabled_env
      ? "Re-enable auto-betting? Real orders will be placed while games are live."
      : "Clear the kill switch? (AUTOBET_ENABLED is still off on the server, so it stays in PAPER mode.)";
    if (!window.confirm(msg)) return;
    const next = await postWithPin(`/auto-bets/${killing ? "kill" : "enable"}`);
    if (next) setStatus(next);
  };

  const betRow = (b) => {
    const settled = b.status === "settled";
    const won = b.result === "won";
    const pnl = b.pnl_dollars != null ? Number(b.pnl_dollars) : null;
    const chip = settled
      ? { color: won ? C.green : C.red, label: won ? "WON" : "LOST" }
      : BET_STATUS_STYLE[b.status] || { color: C.muted, label: b.status };
    // Current game state from the page's own scan (same event ticker), so an
    // open bet shows the live score/clock instead of the score at bet time.
    const scanGame = (games || []).find(
      (g) => g.event_ticker === b.event_ticker
    );
    const gg = scanGame && scanGame.game;
    const liveLine =
      gg && gg.away && gg.home && gg.away.score != null && gg.home.score != null
        ? `${gg.away.abbr || gg.away.team} ${gg.away.score}–${gg.home.score} ${
            gg.home.abbr || gg.home.team
          }${
            detailCT(gg, scanGame.state)
              ? ` · ${detailCT(gg, scanGame.state)}`
              : ""
          }`
        : b.score_at
        ? `${b.score_at} at bet`
        : null;
    return (
      <div
        key={b.id}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          fontSize: 13,
          padding: "8px 10px",
          borderRadius: 8,
          background: settled ? (won ? C.greenSoft : C.redSoft) : C.rowAlt,
          border: `1px solid ${settled ? (won ? C.greenBorder : C.redBorder) : C.border}`,
        }}
      >
        <span style={{ fontWeight: 700 }}>
          {b.league ? `${String(b.league).toUpperCase()} · ` : ""}
          {b.pick_label}
        </span>
        <span style={{ color: C.muted, flex: 1, minWidth: 120 }}>
          {liveLine || b.title}
        </span>
        <span>
          Risk ${(b.filled_contracts != null && b.fill_price != null
            ? b.filled_contracts * b.fill_price
            : Number(b.stake_dollars)
          ).toFixed(2)}{" "}
          <span style={{ color: C.muted }}>
            to win $
            {((b.filled_contracts != null ? b.filled_contracts : b.contracts) -
              (b.filled_contracts != null && b.fill_price != null
                ? b.filled_contracts * b.fill_price
                : Number(b.stake_dollars))
            ).toFixed(2)}
          </span>
        </span>
        <span style={{ color: C.muted }}>
          {american(b.fill_price != null ? b.fill_price : b.limit_price)}
        </span>
        <span style={{ color: C.green }}>{edgeCents(b.edge)}</span>
        <span style={{ color: chip.color, fontWeight: 800 }}>
          {chip.label}
          {settled && pnl != null
            ? ` ${pnl >= 0 ? "+" : "−"}$${Math.abs(pnl).toFixed(2)}`
            : ""}
        </span>
      </div>
    );
  };

  const evalLine = (a) => {
    const when = new Date(a.ran_at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Chicago",
    });
    const what = `${a.league ? `${String(a.league).toUpperCase()} · ` : ""}${
      a.pick_label || a.market_ticker
    }`;
    const deco =
      a.decision === "placed"
        ? { icon: "🤖", color: C.green, text: `bet placed (${edgeCents(a.edge)} edge)` }
        : a.decision === "would-place"
        ? {
            icon: "📝",
            color: C.amber,
            text: `would bet — paper mode (${edgeCents(a.edge)} edge)`,
          }
        : {
            icon: "·",
            color: C.muted,
            text: `passed — ${SKIP_REASON_TEXT[a.skip_reason] || a.skip_reason}`,
          };
    return (
      <div
        key={a.id}
        style={{ display: "flex", gap: 8, fontSize: 12, padding: "3px 0" }}
      >
        <span style={{ color: C.muted, width: 66, flexShrink: 0 }}>{when}</span>
        <span style={{ flexShrink: 0 }}>{deco.icon}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          {what} —{" "}
          <span style={{ color: deco.color, fontWeight: 600 }}>{deco.text}</span>
        </span>
      </div>
    );
  };

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 15 }}>🤖 Auto-Bet</div>
        <Chip color={pill.color} bg={pill.bg} border={pill.border}>
          {pill.text}
        </Chip>
        <span style={{ color: C.muted, fontSize: 12, flex: 1 }}>
          {t.placed || 0} bet{(t.placed || 0) === 1 ? "" : "s"} today ·{" "}
          {capUp ? "up $" : "lost $"}
          {capAmt.toFixed(0)}
          {capUp ? ` · $${t.daily_cap} cap` : ` / $${t.daily_cap}`} ·{" "}
          {status.loop_running ? "loop live" : "idle"} · run{" "}
          {timeAgo(status.last_run_at)}
        </span>
        <div style={{ color: C.muted, fontSize: 18 }}>{open ? "▾" : "▸"}</div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 16 }}>
          {/* Tier 1: config + stake meter + toggle */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <span style={{ color: C.muted, fontSize: 12 }}>
              Bets ${cfg.unit_dollars}–${cfg.unit_dollars * cfg.max_units}{" "}
              (bigger edge = bigger bet) · max ${cfg.max_daily_dollars}/day, $
              {cfg.max_event_dollars}/game · needs a{" "}
              {Math.round((cfg.min_edge || 0) * 100)}¢+ edge and a liquid book
              {cfg.min_price
                ? ` · no long shots (<${Math.round(cfg.min_price * 100)}¢)`
                : ""}
              {cfg.cheap_price_max != null
                ? ` · <${Math.round(cfg.cheap_price_max * 100)}¢ ${
                    cfg.cheap_units > 0 ? `@ ${cfg.cheap_units}u` : "off"
                  }`
                : ""}{" "}
              · {(cfg.leagues || []).join(" + ").toUpperCase()} · checks every{" "}
              {cfg.interval_secs}s
            </span>
            {/* Amber when an override is in force today, so a resize you
                forgot about is visible at a glance rather than only in the
                bet sizes. */}
            <button
              onClick={changeUnit}
              disabled={busy}
              style={{
                marginLeft: "auto",
                padding: "6px 14px",
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                color: t.unit_override != null ? C.amber : C.text,
                background: C.chipBg,
                border: `1px solid ${t.unit_override != null ? C.amber : C.border}`,
                opacity: busy ? 0.5 : 1,
              }}
            >
              UNIT ${cfg.unit_dollars != null ? cfg.unit_dollars : "—"} ✎
            </button>
            <button
              onClick={changeCap}
              disabled={busy}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                color: C.text,
                background: C.chipBg,
                border: `1px solid ${C.border}`,
                opacity: busy ? 0.5 : 1,
              }}
            >
              CAP ${t.daily_cap != null ? Math.round(t.daily_cap) : "—"} ✎
            </button>
            {/* Amber while UNSET — no bound at all is the state worth
                noticing, the opposite polarity from the unit button. */}
            <button
              onClick={changeCeiling}
              disabled={busy}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                color: t.daily_cap_ceiling == null ? C.amber : C.text,
                background: C.chipBg,
                border: `1px solid ${
                  t.daily_cap_ceiling == null ? C.amber : C.border
                }`,
                opacity: busy ? 0.5 : 1,
              }}
            >
              CEIL{" "}
              {t.daily_cap_ceiling != null
                ? `$${Math.round(t.daily_cap_ceiling)}`
                : "∞"}{" "}
              ✎
            </button>
            <button
              onClick={toggle}
              disabled={busy}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                color: status.killed ? C.bg : "#fff",
                background: status.killed ? C.green : C.red,
                border: "none",
                opacity: busy ? 0.5 : 1,
              }}
            >
              {status.killed ? "ENABLE" : "KILL"}
            </button>
          </div>
          {(status.paused_segments || []).length > 0 && (
            <div style={{ color: C.amber, fontSize: 12, marginTop: 8 }}>
              ⏸ Paused by nightly review:{" "}
              {status.paused_segments.map((seg, i) => (
                <span key={seg}>
                  {i > 0 ? ", " : ""}
                  <span
                    onClick={async () => {
                      if (!window.confirm(`Resume betting on ${seg}?`)) return;
                      let pin =
                        window.localStorage.getItem("bv_autobet_pin") ||
                        window.prompt("Auto-bet PIN:") ||
                        "";
                      if (!pin) return;
                      const r = await fetch(`${API_BASE}/auto-bets/segments`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ segment: seg, action: "resume", pin }),
                      });
                      if (r.status === 401) {
                        window.localStorage.removeItem("bv_autobet_pin");
                        window.alert("Wrong PIN.");
                      } else if (r.ok) {
                        window.localStorage.setItem("bv_autobet_pin", pin);
                        setStatus(await r.json());
                      }
                    }}
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                  >
                    {seg} (resume)
                  </span>
                </span>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                height: 10,
                background: C.rowAlt,
                borderRadius: 5,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${stakePct}%`,
                  height: "100%",
                  background: stakePct >= 90 ? C.red : stakePct >= 60 ? C.amber : C.green,
                }}
              />
            </div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
              <b style={{ color: capUp ? C.green : C.text }}>
                ${capAmt.toFixed(2)}
              </b>
              {capUp ? " up on the day, against a $" : " lost of $"}
              {t.daily_cap} daily net-loss cap
              <span style={{ color: C.muted }}>
                {" "}
                · ${Number(t.daily_stake || 0).toFixed(2)} staked
              </span>
              {t.daily_cap_override != null && (
                <span style={{ color: C.amber }}> (override)</span>
              )}
              {mode === "paper" && (
                <span style={{ color: C.amber }}>
                  {" "}
                  · PAPER — evaluating only, would-place logged, no orders
                </span>
              )}
            </div>
          </div>

          {/* Yesterday's review: the nightly engine's narrative — what
              happened, what hurt, and the plan. */}
          {review && review.report && review.report.narrative && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                background: C.rowAlt,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
              }}
            >
              <div
                style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 6 }}
              >
                📋 NIGHTLY REVIEW — {review.review_date ? String(review.review_date).slice(0, 10) : "yesterday"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                {review.report.narrative.headline}
              </div>
              {(review.report.narrative.went_well || []).length > 0 && (
                <div style={{ fontSize: 12, marginBottom: 6 }}>
                  {review.report.narrative.went_well.map((l, i) => (
                    <div key={i} style={{ padding: "1px 0" }}>
                      <span style={{ color: C.green }}>✓</span> {l}
                    </div>
                  ))}
                </div>
              )}
              {(review.report.narrative.went_wrong || []).length > 0 && (
                <div style={{ fontSize: 12, marginBottom: 6 }}>
                  {review.report.narrative.went_wrong.map((l, i) => (
                    <div key={i} style={{ padding: "1px 0" }}>
                      <span style={{ color: C.red }}>✗</span> {l}
                    </div>
                  ))}
                </div>
              )}
              {(review.report.narrative.plan || []).length > 0 && (
                <div style={{ fontSize: 12, color: C.muted }}>
                  {review.report.narrative.plan.map((l, i) => (
                    <div key={i} style={{ padding: "1px 0" }}>
                      ▶ {l}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tier 2: today's bets */}
          <div style={{ marginTop: 16 }}>
            <div
              style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8 }}
            >
              TODAY'S BETS
            </div>
            {shownBets.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                {shownBets.map(betRow)}
              </div>
            ) : (
              <div style={{ color: C.muted, fontSize: 13 }}>
                {bets.length
                  ? `No filled bets today (${unfilledCount} unfilled).`
                  : "No bets placed today."}
              </div>
            )}
            {/* Unfilled IOC orders hold no position and risk nothing — hidden
                by default, still reachable. */}
            {unfilledCount > 0 && (
              <button
                onClick={() => setShowUnfilled((v) => !v)}
                style={{
                  marginTop: 6,
                  background: "transparent",
                  border: "none",
                  color: C.muted,
                  fontSize: 11.5,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showUnfilled ? "▾ hide" : "▸ show"} {unfilledCount}{" "}
                unfilled
              </button>
            )}
          </div>

          {/* Rooting guide: what each final result pays, per game with 2+ bets */}
          {scenarios.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  color: C.muted,
                  fontSize: 11,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                ROOTING GUIDE — WHAT EACH FINAL RESULT PAYS
              </div>
              {scenarios.map((g) => (
                <div key={g.key} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{g.title}</span>
                    <span style={{ color: C.muted }}>
                      {" "}
                      · root for{" "}
                      <span style={{ color: C.green, fontWeight: 700 }}>
                        {g.best.label}
                      </span>
                    </span>
                  </div>
                  {g.axes.map((ax, i) => {
                    const maxNet = Math.max(...ax.rows.map((r) => r.net));
                    const minNet = Math.min(...ax.rows.map((r) => r.net));
                    return (
                      <div key={i} style={{ display: "grid", gap: 2 }}>
                        {ax.rows.map((r, j) => (
                          <div
                            key={j}
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              fontSize: 12,
                              padding: "4px 8px",
                              borderRadius: 6,
                              background:
                                r.net === maxNet
                                  ? C.greenSoft
                                  : r.net === minNet
                                  ? C.redSoft
                                  : "transparent",
                            }}
                          >
                            <span style={{ flex: 1 }}>
                              {r.net === maxNet ? "▲ " : r.net === minNet ? "▼ " : ""}
                              {r.label}
                            </span>
                            <span style={{ color: C.muted }}>
                              {r.winners.length}/{r.of} bets win
                            </span>
                            <span
                              style={{
                                color: r.net >= 0 ? C.green : C.red,
                                fontWeight: 800,
                                width: 76,
                                textAlign: "right",
                              }}
                            >
                              {r.net >= 0 ? "+" : "−"}${Math.abs(r.net).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Tier 3: activity feed */}
          <div
            style={{
              marginTop: 16,
              borderTop: `1px solid ${C.border}`,
              paddingTop: 12,
            }}
          >
            <div
              onClick={() => setFeedOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <span style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>
                ACTIVITY
              </span>
              <span style={{ color: C.muted, fontSize: 11, flex: 1 }}>
                {t.skipped || 0} skips · {t.would_place || 0} would-place today
              </span>
              <span style={{ color: C.muted, fontSize: 14 }}>
                {feedOpen ? "▾" : "▸"}
              </span>
            </div>
            {feedOpen && (
              <div style={{ marginTop: 8 }}>
                {activity.length ? (
                  activity.map(evalLine)
                ) : (
                  <div style={{ color: C.muted, fontSize: 13 }}>
                    Nothing evaluated yet — the feed fills in while games are live.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */

const EDGE_OPTIONS = [0.03, 0.05, 0.08, 0.1];

export default function TotalsValue() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [minEdge, setMinEdge] = useState(0.05);
  const [updatedAt, setUpdatedAt] = useState(null);
  const timerRef = useRef(null);
  // Latest live-game count, readable from inside the polling closure (state
  // would be stale there — the effect only re-runs when minEdge changes).
  const liveCountRef = useRef(0);

  const load = async (edge) => {
    try {
      const res = await fetch(`${API_BASE}/totals-value?min_edge=${edge}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      liveCountRef.current = Number(j.live_count) || 0;
      setData(j);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message || "Failed to load");
    }
  };

  // Poll every 60s while a game is live, every 5s otherwise.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      await load(minEdge);
      if (cancelled) return;
      timerRef.current = setTimeout(
        tick,
        liveCountRef.current > 0 ? 60000 : 5000
      );
    };
    tick();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [minEdge]);

  const games = (data && data.games) || [];
  const valueBets = games.flatMap((g) =>
    g.value_bets.map((bet) => ({ game: g, bet }))
  );
  valueBets.sort((a, b) => b.bet.best.edge - a.bet.best.edge);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "20px 14px 60px",
      }}
    >
      {/* The 860px centering this page used to do inline now lives in
          .bv-shell (via --bv-main-w), so the open-bets rail can sit beside the
          column on a wide screen. */}
      <div className="bv-shell" style={{ "--bv-main-w": "860px" }}>
        <div className="bv-main">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              gap: 10,
              marginBottom: 4,
            }}
          >
            {/* Title and subtitle are one block so the subtitle sits directly
                under the title at every width. Ordering them as separate flex
                items instead needed the subtitle to come after the nav chips on
                desktop (to keep the chips up on the title's row) but before them
                on mobile (where the chips wrap) — which no single order can do
                without a media query. Grouping sidesteps it: the block is the
                left flex item, nav is the right one. */}
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
                📈 Totals Value
              </h1>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                Kalshi over/unders vs live pace model — WNBA · MLB · CBB · NFL ·
                CFB
                {updatedAt
                  ? ` · updated ${updatedAt.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      second: "2-digit",
                    })}`
                  : ""}
              </div>
            </div>
            {/* Counterparts to the links on /crypto-value. Wrapped in one
                group so the header's flex-wrap moves them as a pair —
                separately, the long subtitle pushed "my bets" onto its own
                line while "crypto" stayed up top. */}
            <span style={navGroup}>
              <a href="/crypto-value" style={navLink}>
                🪙 crypto →
              </a>
              <a href="/my-bets" style={navLink}>
                🎯 my bets →
              </a>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "10px 0 18px",
              color: C.muted,
              fontSize: 13,
            }}
          >
            Min edge:
            {EDGE_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setMinEdge(e)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: e === minEdge ? C.bg : C.text,
                  background: e === minEdge ? C.green : C.chipBg,
                  border: `1px solid ${e === minEdge ? C.green : C.border}`,
                }}
              >
                {Math.round(e * 100)}¢
              </button>
            ))}
          </div>

          <AutoBetPanel games={games} />
          <PerformancePanel />

          {error && (
            <div
              style={{
                background: C.redSoft,
                border: `1px solid ${C.redBorder}`,
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
              }}
            >
              Couldn’t load scan: {error}
            </div>
          )}
          {!data && !error && <div style={{ color: C.muted }}>Loading…</div>}

          {valueBets.length > 0 && (
            <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.green }}>
                VALUE BETS
              </div>
              {valueBets.map(({ game, bet }) => (
                <ValueBetCard key={`${bet.ticker}-${bet.best.side}`} game={game} bet={bet} />
              ))}
            </div>
          )}
          {data && valueBets.length === 0 && (
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>
              No bets clear a {Math.round(minEdge * 100)}¢ edge right now
              {data.live_count === 0
                ? " — no games are live (the model only prices live games)."
                : "."}
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {games.map((g) => (
              <GameCard key={g.event_ticker} game={g} />
            ))}
          </div>

        </div>
        <OpenBetsRail domain="sports" />
      </div>
    </div>
  );
}
