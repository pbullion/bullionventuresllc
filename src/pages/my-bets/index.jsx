import { useEffect, useRef, useState } from "react";
import PnlChart from "../../components/PnlChart.jsx";
import EngineBlockedBanner from "../../components/EngineBlockedBanner.jsx";

const API_BASE = "https://sheline-art-website-api.herokuapp.com/kalshi";
// Second engine, second mount point — the crypto router is a sibling of
// /kalshi, not a path under it.
const CRYPTO_API_BASE =
  "https://sheline-art-website-api.herokuapp.com/kalshi-crypto";
const WEATHER_API_BASE =
  "https://sheline-art-website-api.herokuapp.com/kalshi-weather";

// Kalshi's own portfolio page, linked from the Portfolio figure in the header.
const KALSHI_PORTFOLIO_URL = "https://kalshi.com/portfolio";

/* Positions permanently dropped from the Open tab — dead futures markets that
 * are decided in practice but won't SETTLE for months, so Kalshi keeps
 * returning them as open and they clog the grid forever. Unlike the ✕ button
 * (per-browser localStorage, restorable via "Show all"), this is in code, so
 * it holds on every device and "Show all" won't bring them back.
 *
 * These are still real open positions with real money in them, so the header
 * totals deliberately keep counting them — this only removes the card.
 *
 * - KXNEXTTEAMNBA-26LJAM-MIA: "LeBron James Next Team = Miami", sitting at 1%
 *   and waiting on a signing that isn't coming (Patrick, 2026-07-25). */
const ALWAYS_HIDDEN_TICKERS = new Set(["KXNEXTTEAMNBA-26LJAM-MIA"]);

/* ─── Dark palette ─── */
const C = {
  bg: "#0b0e14", // page
  panel: "#151a24", // bet card
  card: "#151a24",
  border: "#252c3a", // neutral borders
  text: "#e8eaed",
  muted: "#8a93a6",
  green: "#22c55e",
  greenSoft: "#123021", // green-tinted fill for leg interiors
  greenBorder: "#2f7d55", // darker green border
  red: "#ef4444",
  redSoft: "#301416", // red-tinted fill
  redBorder: "#8a3a3d", // darker red border
  // A quieter green for the secondary money figures (profit). The bright
  // C.green is already carrying the chance % on the same row, and two of it
  // side by side compete; this is the dim end of the chanceColor ramp, so it
  // still reads as the same family. 4.7:1 on C.panel.
  greenDim: "#479463",
  amber: "#eab308", // a live tied game — "in play, dead heat"
  amberSoft: "#2a2410", // amber-tinted fill
  amberBorder: "#8a7420", // darker amber border
  accent: "#22c55e",
  chipBg: "#1c2430",
  legNeutral: "#1a2029", // undecided leg interior
  legNeutralBorder: "#303845",
  // A finished (settled) card is rendered darker than a live/open one.
  legFinishedGreen: "#0d1f16",
  legFinishedRed: "#210f11",
  legFinishedNeutral: "#12161e",
};

/* ─── Formatters ─── */
const usd = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(Number(n)) ? Number(n) : 0,
  );
// Format an ISO game time as "M/D · 5:40 PM CT" (Central only).
const formatKickoff = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const day = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: "America/Chicago",
  }).format(d);
  const time = (tz, label) =>
    `${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    }).format(d)} ${label}`;
  return `${day} · ${time("America/Chicago", "CT")}`;
};

/* A game's status text, guaranteed Central. ESPN's pre-game detail is an
 * Eastern-only string ("7/24 - 6:45 PM EDT"), so a scheduled game is always
 * reformatted from its ISO date; live/final details ("Top 4th", "Final") carry
 * no wall-clock time and pass through untouched. The regex catches any other
 * Eastern stamp ESPN slips in — a postponed-then-rescheduled game, say — so
 * nothing but Central ever reaches the screen. */
const looksEastern = (s) => /\b(?:E[DS]T|ET)\b/i.test(String(s || ""));
const gameDetail = (g) => {
  if (!g) return null;
  if (g.state === "pre" || looksEastern(g.detail))
    return formatKickoff(g.date) || g.detail || null;
  return g.detail || null;
};

// Format a settled-time ISO string as "Jul 19, 8:29 PM CT" for the history list.
const formatSettled = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(d)} CT`;
};

/* ─── Pace math (drives a total bet's "proj" figure) ─── */

// Regulation structure per league: how many periods and how many seconds each.
// Returns null for anything we don't model, so the projection is simply skipped.
const REGULATION = {
  wnba: { periods: 4, periodSecs: 600 }, // 4 x 10:00
  nba: { periods: 4, periodSecs: 720 }, // 4 x 12:00
  "mens-college-basketball": { periods: 2, periodSecs: 1200 }, // 2 x 20:00
  "womens-college-basketball": { periods: 2, periodSecs: 1200 },
};
const regulationFor = (league) => {
  const key = String(league || "").toLowerCase();
  if (!key.includes("basket") && !key.includes("nba")) return null;
  // Women's hoops (WNBA / college women) — Kalshi labels it "Pro Basketball (W)"
  // or "... women's ...". 4 x 10:00.
  if (key.includes("wnba") || key.includes("women") || /\(w\)/.test(key))
    return REGULATION.wnba;
  if (key.includes("college")) return REGULATION["mens-college-basketball"];
  // Default men's pro basketball ("Pro Basketball", NBA). 4 x 12:00.
  return REGULATION.nba;
};

/* Baseball keeps no clock — ESPN sends clock:0 and puts the inning in `period`,
 * naming the half in `detail`. "Top 6th" means 5 innings are complete; "Mid"/
 * "Bot" add the half now under way; "End 6th" means all 6 are done. Extras are
 * capped at a full game, where the projection stops meaning much anyway. */
const BASEBALL_INNINGS = 9;
const baseballElapsedFraction = (g) => {
  if (g.period == null) return null;
  const d = String(g.detail || "").toLowerCase();
  const half = d.startsWith("end")
    ? 1
    : d.startsWith("mid") || d.startsWith("bot")
      ? 0.5
      : 0;
  const frac = (Number(g.period) - 1 + half) / BASEBALL_INNINGS;
  return frac > 0 ? Math.min(frac, 1) : null;
};

// Fraction of the game elapsed. Null when we can't tell (unknown league,
// missing clock/inning, or basketball OT where extrapolating stops being
// meaningful) — the caller then just omits the projection.
const gameElapsedFraction = (g, league) => {
  const key = String(league || "").toLowerCase();
  if (key.includes("baseball") || key.includes("mlb"))
    return baseballElapsedFraction(g);
  const reg = regulationFor(league);
  if (!reg || g.period == null || g.clock == null) return null;
  if (g.period > reg.periods) return 1; // OT — treat as ~full regulation
  const total = reg.periods * reg.periodSecs;
  const elapsed = (g.period - 1) * reg.periodSecs + (reg.periodSecs - g.clock);
  const frac = elapsed / total;
  return frac > 0 && frac <= 1 ? frac : null;
};

// Fallback: parse combo title "yes Boston,yes San Antonio,..." into legs.
const parseTitleLegs = (title) =>
  String(title || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((leg) => {
      const m = leg.match(/^(yes|no)\s+(.*)$/i);
      if (m) return { side: m[1].toLowerCase(), label: m[2] };
      return { side: null, label: leg };
    });

/* Masonry geometry for the open grid. CSS Grid makes every row as tall as its
 * tallest card, so a 900px parlay slip sharing a row with 130px single-game
 * cards left a screen of dead space under the short ones. Fine-grained
 * implicit rows (1px) plus a measured per-card row span means each card
 * occupies only its own height, and auto-placement drops the next card into the
 * gap beneath a short one.
 *
 * 1px rows rather than something coarser so no card is padded up to a row
 * boundary; the span math is cheap either way. Row-major reading order is
 * preserved, which is why this isn't CSS multi-column — that packs perfectly
 * but fills top-to-bottom, and a grid sorted by chance then reads shuffled
 * across a row. */
const MASONRY_ROW = 1;
const MASONRY_GAP = 16;

/* ─── Styles ─── */
const S = {
  page: {
    minHeight: "100vh",
    backgroundColor: C.bg,
    color: C.text,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "0 0 56px",
    boxSizing: "border-box",
  },
  topbar: {
    borderBottom: `1px solid ${C.border}`,
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    // A phone can't fit brand + both cross-links + Refresh on one line, so the
    // bar wraps and `.mb-nav` (order: 3) takes the second row.
    flexWrap: "wrap",
    rowGap: 10,
    // rowGap alone left the cross-links flush against "My Bets" — measured 0px
    // between them — so the chips read as part of the title rather than as
    // secondary nav.
    columnGap: 14,
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logoDot: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: C.accent,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 800,
    fontSize: 16,
  },
  brandName: {
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: -0.2,
    whiteSpace: "nowrap",
  },
  // Cross-links to the other two betting screens. Same chip-link treatment as
  // the "🪙 crypto →" link on /totals-value — these tools are siblings and
  // there's no site nav here (my-bets is in App.jsx's hideChrome list).
  // Positioning/wrapping is the `.mb-nav` class (needs a media query).
  navLink: {
    fontSize: 12,
    fontWeight: 700,
    color: C.text,
    backgroundColor: C.chipBg,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "5px 12px",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  refreshBtn: {
    backgroundColor: C.accent,
    color: "#06210f",
    border: "none",
    borderRadius: 999,
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  // On phones this stays a comfortable single column; on desktop the
  // `mb-inner` class (see the injected media query) lets it fill the width.
  inner: { maxWidth: 720, margin: "0 auto", padding: "0 16px" },

  // Desktop: compact portfolio numbers inline in the top bar. `display` is
  // controlled by the .mb-topstats CSS class (per-breakpoint), so it's omitted
  // here — an inline display would override the media query and always show.
  topStats: {
    alignItems: "center",
    gap: 22,
    flex: 1,
    justifyContent: "flex-end",
    marginRight: 20,
  },
  topStat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    lineHeight: 1.2,
  },
  topStatLabel: {
    fontSize: 10,
    color: C.muted,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  topStatValue: { fontSize: 16, fontWeight: 800 },
  // Mobile: one slim line instead of the old tall hero. `display` is controlled
  // by the .mb-hero-mobile CSS class so the ≥900px media query can hide it.
  heroMobile: {
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 12,
    padding: "12px 4px 6px",
  },
  heroMobilePV: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5 },
  heroMobileStat: { fontSize: 13, fontWeight: 700, color: C.muted },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  /* Sort pills: one active at a time; the arrow on the active pill shows
     direction (click again to flip). */
  sortBar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  // Compact single-line sort control (replaces the wrapping pill row).
  sortRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    margin: "22px 0 16px",
  },
  sortBtn: (active) => ({
    background: active ? C.greenSoft : C.chipBg,
    border: `1px solid ${active ? C.greenBorder : C.border}`,
    color: active ? C.green : C.muted,
    borderRadius: 999,
    padding: "4px 11px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  }),
  /* Open / History tab toggle */
  tabs: {
    display: "flex",
    gap: 6,
    borderBottom: `1px solid ${C.border}`,
    marginTop: 8,
  },
  tab: (active) => ({
    background: "transparent",
    border: "none",
    borderBottom: `2px solid ${active ? C.accent : "transparent"}`,
    color: active ? C.text : C.muted,
    padding: "10px 6px",
    marginBottom: -1,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  }),
  /* History card bits */
  resultPill: (won) => ({
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    padding: "4px 10px",
    borderRadius: 999,
    color: won ? C.green : C.red,
    backgroundColor: won ? C.greenSoft : C.redSoft,
  }),
  /* Sold before the market resolved — a third outcome, not a shade of the
   * other two, so it gets its own color rather than borrowing won/lost. */
  cashedPill: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    padding: "4px 10px",
    borderRadius: 999,
    color: C.amber,
    backgroundColor: "rgba(234, 179, 8, 0.14)",
    whiteSpace: "nowrap",
  },
  histSub: { fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 6 },
  histLegs: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  histLeg: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  histLegPick: { fontSize: 14, fontWeight: 700, flexShrink: 0 },
  histLegMatchup: {
    fontSize: 13,
    color: C.muted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  histRecord: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    fontWeight: 800,
  },
  histRecordDash: { color: C.muted, fontWeight: 600 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: C.text,
    margin: "18px 4px 12px",
  },
  showHiddenBtn: {
    background: "transparent",
    border: `1px solid ${C.border}`,
    color: C.muted,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  bet: {
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
  },
  betHeader: { cursor: "pointer", userSelect: "none" },
  betTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  betTitleWrap: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  chevron: (open) => ({
    transition: "transform 0.15s ease",
    transform: open ? "rotate(90deg)" : "rotate(0deg)",
    color: C.muted,
    fontSize: 14,
    flexShrink: 0,
  }),
  betTitle: { fontSize: 14, fontWeight: 700, lineHeight: 1.3 },
  // Metrics area: a hero row (the big green numbers) stacked over a plain row,
  // so the emphasized cells never sit unevenly beside the plain ones.
  metrics: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  metricsPlain: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
  },
  mLabel: { fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 2 },
  mValue: { fontSize: 14, fontWeight: 700 },

  // Small "open on ESPN" cue on a clickable leg card.
  // Was espnArrow; a row now links to ESPN or to Kalshi, so the name shouldn't
  // claim one of them.
  linkArrow: { color: C.muted, fontSize: 12, fontWeight: 700 },
  check: (color) => ({
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: color,
    color: "#fff",
    fontSize: 12,
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  }),

  /* Live baseball situation: base diamond + count/outs */
  // columnGap/rowGap rather than one `gap`: the last-play line wraps to its own
  // row inside this container, and a shared gap gave it 12px of separation on
  // top of its own margin — enough that it floated free of the count/inning it
  // describes. Zero row gap tucks it directly underneath.
  sitRow: {
    display: "flex",
    alignItems: "center",
    columnGap: 12,
    rowGap: 0,
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px solid ${C.border}`,
    flexWrap: "wrap",
  },
  // Same situation block nested inside a parlay leg row. The row already draws
  // its own top hairline, so a second divider here would read as a fake split;
  // it just gets a little air under the matchup line instead.
  sitRowCompact: {
    display: "flex",
    alignItems: "center",
    columnGap: 10,
    rowGap: 0,
    marginTop: 8,
    flexWrap: "wrap",
  },
  // Rotated-square "diamond" that holds the three base pips.
  diamond: {
    position: "relative",
    width: 34,
    height: 34,
    flexShrink: 0,
  },
  base: (on, pos) => {
    const size = 11;
    const common = {
      position: "absolute",
      width: size,
      height: size,
      transform: "rotate(45deg)",
      // An empty base outlines in C.muted, not C.border. C.border is a hairline
      // colour meant for dividers against the page — on the card it measures
      // about 1.26:1, so the empty bases were effectively invisible and the
      // diamond read as blank space. C.muted is ~5.7:1 and still sits clearly
      // below an occupied base, which is filled green.
      border: `1.5px solid ${on ? C.green : C.muted}`,
      backgroundColor: on ? C.green : "transparent",
      borderRadius: 2,
    };
    // pos: second (top), third (left), first (right)
    if (pos === "second") return { ...common, top: 0, left: 11.5 };
    if (pos === "third") return { ...common, top: 11.5, left: 0 };
    return { ...common, top: 11.5, left: 23 }; // first
  },
  sitMeta: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },
  // Balls-strikes. Muted rather than C.text, and word-labelled below, because
  // an unlabelled bright "3-1" next to a diamond reads as a score.
  sitCount: { fontSize: 13, fontWeight: 800, color: C.muted },
  // The word "count" after the balls-strikes figure.
  sitCountLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: C.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  sitOuts: {
    fontSize: 12,
    fontWeight: 700,
    color: C.muted,
    display: "flex",
    alignItems: "center",
  },
  // Inning label (e.g. "Top 9th") shown where the "N out" words used to be.
  sitInning: {
    fontSize: 12,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  outDots: {
    display: "inline-flex",
    gap: 4,
    marginLeft: 6,
    verticalAlign: "middle",
  },
  outDot: (filled) => ({
    width: 7,
    height: 7,
    borderRadius: 999,
    display: "inline-block",
    backgroundColor: filled ? C.red : "transparent",
    // Same fix as the empty bases above — an unfilled dot outlined in C.border
    // was invisible, so "1 out" and "2 out" looked identical to "0 out".
    border: `1.5px solid ${filled ? C.red : C.muted}`,
  }),
  sitPlay: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
    // Own full-width row below the diamond/count. flexBasis 100% forces the wrap;
    // minWidth 0 overrides the flex default (min-width:auto) so the box can shrink
    // below its text width — without it the nowrap text refuses to shrink and the
    // ellipsis never triggers, spilling past the card edge.
    flex: "1 1 100%",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  /* ─── Grouped game cards (Kalshi mobile look) ─── */
  // Responsive card grid: one full-width column on a phone, as many ~360px
  // columns as fit on desktop (fills the widened .mb-inner). auto-fill +
  // min(360px,100%) means it never overflows a narrow screen, and align-items
  // start keeps a short card from stretching to a tall neighbor's height.
  // Masonry-packed (see useMasonry): 1px implicit rows and no row gap, with
  // each card given a measured `grid-row: span N` that already includes the
  // MASONRY_GAP. That's what lets a short card and a 900px parlay slip sit in
  // the same visual row without the short one leaving a screen of dead space
  // beneath it. On one column the spans just reproduce a normal 16px stack.
  gameList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(360px, 100%), 1fr))",
    columnGap: MASONRY_GAP,
    rowGap: 0,
    gridAutoRows: `${MASONRY_ROW}px`,
    alignItems: "start",
  },
  gameCard: {
    backgroundColor: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    padding: "18px 20px 4px",
  },
  gameHead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: -0.4,
    lineHeight: 1.2,
  },
  gameLeague: { fontSize: 13, color: C.muted, fontWeight: 600 },
  // League label and (for crypto) the window countdown share a line under the
  // title. Wraps rather than squeezing on a narrow card.
  gameSubRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 2,
    marginTop: 3,
  },
  countdown: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11.5,
    fontWeight: 700,
    color: C.text,
    backgroundColor: C.chipBg,
    // Longhand, not the `border` shorthand: countdownUrgent below overrides
    // borderColor, and React warns (and the colour can fail to apply) when a
    // shorthand and its longhand are mixed across a rerender — which this hits
    // every time the clock crosses the 60s threshold.
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: C.border,
    borderRadius: 999,
    padding: "2px 8px",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  countdownUrgent: {
    color: C.amber,
    borderColor: C.amberBorder,
    backgroundColor: C.amberSoft,
  },
  countdownDone: { color: C.muted },
  // Header of a card with no score/schedule line beneath it (a parlay): keeps
  // the league label off the first row's divider.
  gameHeadBare: { paddingBottom: 14 },
  gameHideBtn: {
    background: "none",
    border: "none",
    color: C.muted,
    fontSize: 15,
    cursor: "pointer",
    padding: 4,
    lineHeight: 1,
    flexShrink: 0,
  },
  scoreRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  scoreTeam: { fontSize: 14, fontWeight: 700, color: C.muted },
  // 20, not 16: the score has to out-shout the baseball count in the situation
  // row a few pixels below it, which is the number it was being confused with.
  scoreNum: { fontSize: 20, fontWeight: 800, letterSpacing: -0.3 },
  scoreDash: { fontSize: 14, color: C.muted },
  finalTag: {
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 4,
  },
  // Live clock/period tag ("Q3 5:23", "Top 9th", "Halftime") on the score line.
  liveTag: {
    fontSize: 11,
    fontWeight: 800,
    color: C.green,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 4,
  },
  schedRow: { fontSize: 14, color: C.muted, fontWeight: 600, marginTop: 12 },

  // One position within a game card. Every row carries a top hairline, so the
  // first row also draws the divider under the game header.
  posRow: {
    padding: "16px 0",
    borderTop: `1px solid ${C.border}`,
  },
  rowLine1: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  rowPick: { fontSize: 16, fontWeight: 600, minWidth: 0, lineHeight: 1.3 },
  sideYes: { color: C.green, fontWeight: 800 },
  sideNo: { color: C.red, fontWeight: 800 },
  rowDot: { color: C.muted, margin: "0 2px" },
  rowPickText: { color: C.text },
  rowChance: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 16,
    fontWeight: 700,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  rowArrow: { fontSize: 12 },
  rowLine2: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
    fontSize: 13,
    color: C.muted,
    fontWeight: 600,
    // Three figures on this line now (cost / profit / payout); wrap rather than
    // overflow the card when a big payout makes them too wide together.
    flexWrap: "wrap",
    rowGap: 2,
  },
  rowProfit: { color: C.greenDim },
  // Amber, not muted: this only renders when the sellable price disagrees with
  // the mark, which is a caveat about the number next to it rather than another
  // neutral stat. Muted would let it disappear into the row.
  rowCashOut: { color: C.amber, fontWeight: 600 },
  rowCashOutLine: { marginTop: 2, fontSize: 13, textAlign: "right" },
  // Parlay-only: the leg's game/matchup under the pick, and the ticket totals.
  rowSub: { fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 6 },
  // The live score inside that sub line. It used to be plain muted 12px text
  // ("Arizona vs Boston · 5–5"), which lost the prominence contest to the 13px
  // white count in the situation row right below it — so a 5–5 game read as a
  // 3-1 game (Patrick, 2026-08-19: "I keep confusing the count with the
  // score"). A bright bordered chip makes the score the loudest thing on the
  // leg, and nothing else on the card wears this treatment.
  rowScore: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 15,
    fontWeight: 800,
    color: C.text,
    letterSpacing: 0.2,
    padding: "1px 7px",
    borderRadius: 6,
    backgroundColor: C.chipBg,
    border: `1px solid ${C.border}`,
    // The chip is taller than the 12px line it sits in; keep the text baselines
    // aligned so the matchup words don't ride up.
    verticalAlign: "middle",
  },
  // "SCORE" tag inside the chip. Tiny and muted — it's there to say which pair
  // of numbers this is, not to compete with them.
  rowScoreLabel: {
    fontSize: 9,
    fontWeight: 800,
    color: C.muted,
    letterSpacing: 0.6,
  },
  /* A total bet's remaining-to-the-line + pace figures. Sits inside a position
     row, which already draws its own divider, so it carries no top border. */
  totalRow: { display: "flex", gap: 18, marginTop: 8, flexWrap: "wrap" },
  totalCell: { display: "flex", alignItems: "baseline", gap: 6 },
  totalNum: { fontSize: 15, fontWeight: 800, letterSpacing: -0.3 },
  totalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  parlayFoot: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px 18px",
    padding: "14px 0 16px",
    borderTop: `1px solid ${C.border}`,
    fontSize: 13,
    fontWeight: 700,
  },
  parlayFootItem: { color: C.muted, fontWeight: 600 },

  muted: { color: C.muted, fontSize: 14, padding: "8px 4px" },
  error: {
    backgroundColor: C.redSoft,
    border: `1px solid ${C.red}`,
    color: C.red,
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 14,
    margin: "12px 4px",
  },
};

/* Desktop-only width fill. Below 900px the inner column keeps its phone-
 * friendly 720px cap; at ≥900px it stretches nearly edge-to-edge so the bet
 * cards and parlay slips use the full screen. */
const MB_CSS = `
/* A parlay leg row that links out to the game's ESPN page. Inherits the row's
   own type colors; a faint wash marks it as hoverable. */
.mb-poslink { display: block; color: inherit; text-decoration: none; }
.mb-poslink:hover { background: rgba(255, 255, 255, 0.035); }
/* Portfolio numbers: inline in the top bar on desktop, a slim strip on mobile.
   Default (mobile-first) hides the desktop top-bar stats. */
.mb-topstats { display: none; }
.mb-hero-mobile { display: flex; }
/* Cross-links to /crypto-value and /totals-value. On a phone there's no room
   for brand + both chips + Refresh on one line, so they take a full-width
   second row of the (wrapping) top bar; order:3 pushes them below Refresh. */
.mb-nav { display: flex; gap: 8px; order: 3; width: 100%; }
@media (min-width: 900px) {
  .mb-topstats { display: flex; }
  .mb-hero-mobile { display: none; }
  /* Desktop has room — the links sit inline after the brand, behind a hairline
     so the grouping is deliberate instead of the chips just abutting the title.
     Scoped to this breakpoint: on a phone .mb-nav is its own full-width row,
     where a left border would read as a stray mark. */
  .mb-nav {
    order: 0;
    width: auto;
    padding-left: 14px;
    border-left: 1px solid ${C.border};
  }
  .mb-inner { max-width: 1800px !important; padding: 0 24px !important; }
  /* Row-major grid: the sort order reads the way people scan — left to
     right, then down. (CSS masonry columns filled top-to-bottom, which made
     a correct value sort LOOK shuffled when read across a row.)
     align-items:start keeps a short card from stretching to its row's
     tallest neighbor. Narrower tracks + a mild zoom render cards ~12%
     smaller on desktop so more fit per screen; mobile is untouched. */
  .mb-bets {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 10px;
    align-items: start;
  }
  .mb-bets > * {
    margin-bottom: 0 !important;
  }
  /* Desktop density: tighter paddings via !important (the only way to win
     over inline styles). No zoom/transform — both make grid row heights
     disagree with rendered content and boxes overlap. */
  .mb-bets .mb-card { padding: 10px 12px !important; }
  .mb-bets .mb-leg { padding: 8px 9px !important; }
  /* Inside a card the legs stack in one narrow column so the card stays a
     compact grid cell (instead of the wide 2-across leg slip). This is what
     lets a parlay slip sit in a normal ~360px grid track alongside the
     single-game cards, rather than needing a wider column of its own. */
  .mb-slip { grid-template-columns: 1fr !important; }
}
`;

/* Gives every card in the open grid a row span equal to its own height, which
 * is what turns the grid into a masonry pack (see MASONRY_ROW). Heights have to
 * be MEASURED rather than derived — a card's height depends on its leg count,
 * whether a live situation row is showing, and how the matchup text wraps.
 *
 * A ResizeObserver watches the container and every card, so a score arriving on
 * the 15s poll or a viewport change re-packs. The observer writes to the same
 * elements it observes, so spans are only assigned when the value actually
 * changes — otherwise every write would feed back in as another resize. */
function useMasonry(ref, deps) {
  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    let frame = 0;
    const apply = () => {
      for (const card of grid.children) {
        const h = card.getBoundingClientRect().height;
        if (!h) continue;
        const span = Math.ceil((h + MASONRY_GAP) / MASONRY_ROW);
        const next = `span ${span}`;
        // Only write on a real change: the observer below watches these same
        // elements, so an unconditional write would feed straight back in.
        if (card.style.gridRowEnd !== next) card.style.gridRowEnd = next;
      }
    };
    /* Measure twice: once synchronously, once on the next frame.
       - Synchronously, because requestAnimationFrame never fires in a hidden or
         background tab. Deferring everything to a frame left the spans unset
         there and every card stacked on row 1, overlapping.
       - Again next frame, because narrowing the viewport rewraps card text and
         a same-tick measurement reads the pre-rewrap height. That showed up as
         cards overlapping by ~25px after a resize, a stale span being shorter
         than the card that has to sit in it. */
    const run = () => {
      apply();
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          apply();
        });
      }
    };
    run();
    const ro =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(run);
    if (ro) {
      ro.observe(grid);
      for (const card of grid.children) ro.observe(card);
    }
    // The observer alone proved unreliable across a viewport change; the window
    // listener is the one that always fires for a resize or rotation. A
    // background tab delivers neither (nor rAF), so re-measure on the way back
    // to visible as well — otherwise a window resized while this tab was hidden
    // would show stale spans, and a stale span is shorter than its card, which
    // reads as overlapping cards rather than as a harmless gap.
    window.addEventListener("resize", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", run);
      document.removeEventListener("visibilitychange", run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
}

const pnlColor = (v) => (v > 0 ? C.green : v < 0 ? C.red : C.text);
const pnlStr = (v) => `${v > 0 ? "+" : ""}${usd(v)}`;

/* Sortable dimensions for the open grid. metric() reads the position's
 * display blob (+ legs); a null metric sinks to the bottom either direction.
 * Win % for a parlay is the joint probability — the product of leg prices. */
const SORTS = [
  {
    key: "value",
    label: "Value",
    metric: (d) => d.current_value_dollars ?? d.cost_dollars,
  },
  { key: "cost", label: "Cost", metric: (d) => d.cost_dollars },
  { key: "pnl", label: "P&L", metric: (d) => d.total_pnl_dollars },
  { key: "payout", label: "Payout", metric: (d) => d.max_payout_dollars },
  {
    key: "win",
    label: "Win %",
    metric: (d, legs) => {
      const ps = legs.map((l) => l.win_pct).filter((p) => p != null);
      if (!ps.length) return null;
      return ps.reduce((acc, p) => acc * (p / 100), 1);
    },
  },
];

/* Bumped from "mb_sort" when the default became Win %-descending: a browser
 * still holding the old preference would otherwise keep overriding the new
 * default, and one holding "Win % ascending" would look like the change never
 * landed. Reading a fresh key resets everyone to the new default once. */
const SORT_STORAGE_KEY = "mb_sort_v2";

/* Is the held side currently ahead? During a live game ESPN only sets `winner`
 * at the final whistle, so use the live score lead. For a NO team bet you're
 * winning when the pick team is behind, so flip the lead by side. Returns null
 * when the outcome can't be determined (no scores yet, or tied). */
const sideIsLeading = (g) => {
  if (!g || g.pick_score == null || g.opp_score == null) return null;
  if (g.pick_score === g.opp_score) return null; // tied -> neutral
  const pickAhead = g.pick_score > g.opp_score;
  return g.side === "no" ? !pickAhead : pickAhead;
};

/* A total whose line is already mathematically crossed is decided even mid-game
 * — points only go up, so once scored > line the over has won and the under has
 * lost, for good. Returns "won" | "lost" (from the held side) or null when not
 * yet crossed / not a total. Lets the UI treat a busted total as a final. */
const totalDecided = (leg) => {
  if (leg.market_type !== "total" || leg.line == null) return null;
  const g = leg.game;
  if (!g || g.pick_score == null || g.opp_score == null) return null;
  const scored = Number(g.pick_score) + Number(g.opp_score);
  if (scored <= Number(leg.line)) return null; // line not crossed yet
  const overWon = true; // scored is over the line
  const heldOver = leg.side === "yes";
  return heldOver === overWon ? "won" : "lost";
};

/* A live game that's currently tied on the scoreboard (both scores present and
 * equal, still in progress). Only meaningful for a straight winner bet — a
 * spread/total "tie" isn't a dead heat, so exclude those. */
const legIsLiveTie = (leg) => {
  const g = leg.game;
  if (!g || g.state !== "in") return false;
  if (g.pick_score == null || g.opp_score == null) return false;
  if (leg.market_type && leg.market_type !== "moneyline") return false;
  return Number(g.pick_score) === Number(g.opp_score);
};

/* Green when winning/won, red when losing/lost, amber on a live tie, neutral
 * otherwise. */
const legAccent = (leg) => {
  if (leg.state === "won") return C.green;
  if (leg.state === "lost") return C.red;
  // A busted/hit total is decided even before Kalshi settles — color it final.
  const decided = totalDecided(leg);
  if (decided) return decided === "won" ? C.green : C.red;
  // A live tied game reads as amber ("dead heat") rather than gray "no data".
  if (legIsLiveTie(leg)) return C.amber;
  // The backend computes an authoritative live lean per market type — a spread
  // or total can't be judged by "who's ahead" (a favorite up 3 still fails a
  // -9.5 spread), so trust live_lean when it's provided and only fall back to
  // the score-based heuristic for legs without it (older API responses).
  if (leg.live_lean === "win") return C.green;
  if (leg.live_lean === "lose") return C.red;
  if (
    leg.live_lean === null &&
    leg.market_type &&
    leg.market_type !== "moneyline" &&
    // Only once the game has started (or when no game matched at all): a
    // pre-game spread/total's price is just the odds you bought, not a
    // winning/losing signal — a -1.5 favorite at 39c would paint "losing"
    // red hours before first pitch. Pre-game cards stay neutral, like Kalshi.
    !(leg.game && leg.game.state === "pre")
  ) {
    // A spread/total can't be judged by the live score mid-game, so lean on the
    // market's own implied probability (win_pct = the held side's price):
    //   >= 53% clearly winning (green), <= 47% clearly losing (red), and the
    // 48-52% coin-flip band shows amber ("too close to call") rather than gray,
    // so a contested live leg still reads as in-play instead of "no data".
    if (leg.win_pct != null) {
      if (leg.win_pct >= 53) return C.green;
      if (leg.win_pct <= 47) return C.red;
      return C.amber;
    }
    return C.muted;
  }
  const g = leg.game;
  // Live OR final: color by the score. Kalshi often hasn't settled the market
  // right after a game ends (leg.state stays "open"), so a FINAL must still turn
  // green/red from the ESPN result instead of falling through to gray.
  if (g && (g.state === "in" || g.state === "post")) {
    const leading = sideIsLeading(g);
    if (leading !== null) return leading ? C.green : C.red;
    // No usable score. For a final, fall back to ESPN's winner flag (flipped for
    // a NO team bet — you win when the pick team did not win).
    if (
      g.state === "post" &&
      (g.pick_is_winner === true || g.opp_is_winner === true)
    ) {
      const pickWon = g.pick_is_winner === true;
      const sideWon = g.side === "no" ? !pickWon : pickWon;
      return sideWon ? C.green : C.red;
    }
    return C.muted; // tied or no score yet
  }
  return C.muted;
};

/* Classify a leg for coloring: which way it's leaning (win/lose/neutral) and
 * whether the game is finished (settled or ESPN post). Drives the card fill,
 * border, and the "finished = darker" treatment. */
const legKind = (leg) => {
  const g = leg.game;
  const finished =
    leg.state === "won" ||
    leg.state === "lost" ||
    totalDecided(leg) != null ||
    (g && (g.state === "post" || g.completed === true));
  const accent = legAccent(leg);
  const lean =
    accent === C.green
      ? "win"
      : accent === C.red
        ? "lose"
        : accent === C.amber
          ? "tie"
          : "neutral";
  return { finished, lean };
};

/* True when a leg's game is over (settled, ESPN post/completed, or a total
 * whose line is already crossed — decided even if the game clock runs on). */
const legIsFinished = (leg) => {
  const g = leg.game;
  return (
    leg.state === "won" ||
    leg.state === "lost" ||
    totalDecided(leg) != null ||
    (g && (g.state === "post" || g.completed === true))
  );
};

/* ─── Grouped (Kalshi-style) helpers ─── */

// The market label as Kalshi shows it: the raw pick minus the "Not " prefix a
// NO-side spread carries ("Not Toronto wins by over 1.5 runs" -> "Toronto wins
// by over 1.5 runs") and the "… to win" tail Kalshi omits ("Over 8.5 runs
// scored to win" -> "Over 8.5 runs scored", "Tampa Bay to win" -> "Tampa Bay").
const marketLabel = (leg) => {
  const raw = String(leg.pick || "").trim();
  const cleaned = raw
    .replace(/^not\s+/i, "")
    .replace(/\s+to win$/i, "")
    .trim();
  /* Kalshi's own subtitle for a crypto up/down market is the placeholder
   * "Target price: TBD", which the backend passes through verbatim (it builds
   * `pick` from yes_sub_title/no_sub_title). Every crypto leg therefore read
   * "Target price: TBD" and said nothing about which way the bet went. The side
   * carries that: the crypto engine maps yes->up, no->down (kalshiCrypto.js
   * "cand.side === 'yes' ? 'up' : 'down'"), and the actual target is already on
   * the sub-line directly beneath, so this states the direction rather than
   * parsing a number back out of the title. */
  if (/\bTBD\b/i.test(cleaned)) {
    return leg.side === "no" ? "Below target" : "Above target";
  }
  return cleaned || raw;
};

// Stable grouping key for a single-leg position: the ESPN gameId (shared by
// every market on the same game) when we matched one, else the game portion of
// the matchup ("Tampa Bay vs Toronto: Total Runs" -> "Tampa Bay vs Toronto"),
// else the market ticker so an unmatched position still stands alone.
/* Weather positions (KXHIGH*) group by DAY, then by city inside the card —
 * eight separate city-day cards scattered through the grid was unreadable
 * (Patrick, 2026-08-19: "combine them by DAYS and then city level"). */
const WEATHER_TICKER_RE = /^KXHIGH/;
const weatherDayChunk = (ticker) => {
  const m = /-(\d{2}[A-Z]{3}\d{2})/.exec(String(ticker || ""));
  return m ? m[1] : null;
};
const WEATHER_MONTHS = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};
const weatherDayLabel = (chunk) => {
  const m = /^(\d{2})([A-Z]{3})(\d{2})$/.exec(String(chunk || ""));
  if (!m || WEATHER_MONTHS[m[2]] == null) return chunk || "—";
  const d = new Date(2000 + Number(m[1]), WEATHER_MONTHS[m[2]], Number(m[3]));
  const label = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const same = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(d, today)) return `Today · ${label}`;
  if (same(d, tomorrow)) return `Tomorrow · ${label}`;
  return label;
};

const gameKeyOf = (leg) => {
  const link = leg.game && leg.game.link;
  if (link) return `g:${link}`;
  const game = String(leg.matchup || "")
    .split(":")[0]
    .trim();
  return game ? `m:${game}` : `t:${leg.market_ticker || Math.random()}`;
};

// The game-card title: the two-team game name without the market suffix.
const gameTitleOf = (leg, fallback) =>
  String(leg.matchup || "")
    .split(":")[0]
    .trim() ||
  fallback ||
  "Market";

/* Where a row links when there's no ESPN game behind it — which is every crypto
 * market, since those carry no `game` at all and so were the only positions on
 * the page you couldn't click through to monitor.
 *
 * Kalshi's event page is the event ticker lowercased; that's the same URL shape
 * /totals-value already links its value cards to. A single position carries
 * `market.event_ticker` outright. A parlay leg only knows its own market ticker,
 * and the event ticker is that minus the final market segment
 * (KXBTCD-26JUL3011-T64399.99 -> KXBTCD-26JUL3011, KXBTC15M-26JUL282300-00 ->
 * KXBTC15M-26JUL282300). */
/* Is this a Kalshi crypto market? Tested on the ticker, NOT on leg.league —
 * the backend labels the two horizons differently: a 15-minute market comes
 * through as league "Crypto" (KXXRP15M-…) but an hourly one as the bare asset,
 * "XRP" (KXXRPD-…). Gating on "Crypto" therefore silently skipped every hourly
 * position. Same pattern the Kalshi event links use, matched on the asset
 * rather than the horizon vocabulary so a new horizon can't fall out. */
const isCryptoTicker = (t) =>
  /^KX(BTC|ETH|XRP|SOL|DOGE)[A-Z0-9]*-/.test(String(t || ""));

const eventTickerOf = (market, marketTicker) => {
  if (market && market.event_ticker) return market.event_ticker;
  const t = String(marketTicker || "");
  const cut = t.lastIndexOf("-");
  return cut > 0 ? t.slice(0, cut) : null;
};
const kalshiEventUrl = (eventTicker) =>
  eventTicker
    ? `https://kalshi.com/events/${String(eventTicker).toLowerCase()}`
    : null;

/* Color for a "% chance", taken from the probability itself: green only once
 * the held side is a strong favorite (>= 75%), yellow across the merely-ahead
 * and coin-flip middle, red when the side isn't favored at all (< 48%).
 *
 * Green is deliberately expensive. At the old >52% cut a 54% leg was the same
 * hue as a 95% one — only fainter — so a card of near-toss-ups read as a card
 * of locks at a glance. 75% is the "I'd be surprised to lose this" line.
 *
 * legAccent keeps its own >=53/<=47 cut for the on-field lean, and that is not
 * the two disagreeing: the ▲/▼ says "winning right now", this color says "how
 * safe", so a 60% leg is legitimately a winning-but-not-safe yellow ▲.
 *
 * Every percentage gets a color, pre-game included. legAccent deliberately
 * withheld one whenever there was no game to judge — which left crypto legs
 * (no `game` at all) gray even at 0% and 100%, reading as "no data" when
 * they're the most decided numbers on the card. The tradeoff it was protecting
 * is real and now accepted: a pre-game underdog bought on purpose reads red
 * before first pitch, because the price is the odds you took, not a verdict.
 * The ▲/▼ arrow still comes from legAccent, so on-field winning/losing is
 * unchanged.
 *
 * Graded by confidence, so a 98% reads louder than a 78%: the hue is fixed per
 * side and saturation/lightness ramp with distance from the band edge. The
 * 48–74% band stays flat yellow — "ahead, but not safe" is one state, not a
 * gradient, and the same goes for a genuine toss-up. At the extremes the ramp
 * lands on the palette's own colors (hsl(142,71%,45%) ≈ C.green,
 * hsl(0,84%,60%) ≈ C.red), so a settled leg matches every green/red in the UI. */
const GREEN_AT = 75; // strong favorite; below this is yellow, never green
const RED_BELOW = 48; // not favored at all
const chanceColor = (pct) => {
  if (pct >= RED_BELOW && pct < GREEN_AT) return C.amber;
  const up = pct >= GREEN_AT;
  // 0 at the band edge, 1 at a fully decided 100% / 0%.
  const t = up
    ? (pct - GREEN_AT) / (100 - GREEN_AT)
    : (RED_BELOW - pct) / RED_BELOW;
  // Intensity is carried mostly by saturation, with only a narrow lightness
  // ramp: dimming by lightness alone put the low end under 3:1 against the
  // card (a 47% red measured 2.86, unreadable). These floors keep the faintest
  // green at 4.7:1 and the faintest red at 3.6:1, and t=1 lands on C.green /
  // C.red exactly, so a decided leg matches the rest of the palette.
  const hue = up ? 142 : 0;
  const sat = Math.round(up ? 34 + t * 37 : 40 + t * 44);
  const light = Math.round(up ? 43 + t * 2 : 52 + t * 8);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
};

// The "% chance" chip: implied probability of the held side, colored by that
// probability, plus a ▲/▼ marking whether the bet is currently winning or
// losing on the field. Neutral/pre-game legs get no arrow. Null with no price.
const chanceOf = (leg) => {
  if (leg.win_pct == null) return null;
  const pct = Math.round(Number(leg.win_pct));
  const lean = legKind(leg).lean;
  return {
    pct,
    color: chanceColor(pct),
    arrow: lean === "win" ? "▲" : lean === "lose" ? "▼" : "",
  };
};

// Whole-dollar money reads "$16" (Kalshi drops the .00 on payouts); anything
// with cents keeps them. Used for the "Pays out" figure.
const usd0 = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? `$${v}` : usd(v);
};

/* What the position clears if it wins: the gross payout less what it cost.
 * cost_dollars already includes the entry fee Kalshi charged, so this is the
 * net gain on a win. Distinct from the P&L on the parlay footer, which is
 * mark-to-market and moves with the price — this number is fixed the moment
 * the bet fills, and it's the one that answers "what am I playing for". */
const profitOf = (d) =>
  (Number(d.max_payout_dollars) || 0) - (Number(d.cost_dollars) || 0);

/* What selling right now would actually net — Kalshi's own "Cash out" figure.
 * Distinct from `current_value_dollars`, which is the mark: the backend derives
 * this from the executable BID (and for a parlay, the product of each leg's
 * sell price, since a combo ticker has no book of its own). On a thin market
 * the two diverge hard — a live 166-contract position marked at $24.90 would
 * only fetch $11.62. It is also NET of the taker fee owed to exit — settlement
 * is free on Kalshi, so only selling early pays that, and a gross figure would
 * quietly overstate what leaving the position puts back in the balance.
 *
 * Returns null when there's nothing worth saying: no live bid (the backend
 * sends null rather than a misleading $0), or the mark and the bid agree.
 * Showing "cash out" on every row would just double the numbers per card; the
 * 2c floor keeps it to the rows where the spread is real. */
const CASH_OUT_MIN_GAP_CENTS = 2;
const cashOutGap = (d) => {
  const co = d.cash_out_value_dollars;
  if (co == null) return null;
  const n = Number(co);
  if (!Number.isFinite(n)) return null;
  const value = Number(d.current_value_dollars) || 0;
  // Gate on the GROSS bid, display the NET. The exit fee ceils to a whole cent
  // per contract, so testing the net would clear 2c on any position of 2+
  // contracts and this filter would stop hiding anything. Falls back to the net
  // for payloads from a backend that predates the gross field.
  const gross = Number(d.cash_out_value_gross_dollars ?? co);
  // Compared in whole cents, not dollars: `5.02 - 5.00` is 0.019999… in binary
  // float, so an exact 2c gap failed a `>= 0.02` test and the row silently
  // hid a real spread.
  const gapCents = Math.round(gross * 100) - Math.round(value * 100);
  return Math.abs(gapCents) >= CASH_OUT_MIN_GAP_CENTS ? n : null;
};

/* A total bet read from the side actually held. `remaining` is whole runs/points
 * to the line — points needed for the over, cushion left for the under.
 * `projected` extrapolates the final total from current pace, and `onTarget`
 * says whether that projection favors the held side. Null when the leg isn't a
 * total, or has no line/score to work from; null pieces are omitted by the UI. */
const totalPaceOf = (leg) => {
  const g = leg.game;
  if (
    leg.market_type !== "total" ||
    leg.line == null ||
    !g ||
    g.pick_score == null ||
    g.opp_score == null
  )
    return null;
  const heldOver = leg.side === "yes"; // YES on a total = the over
  const line = Number(leg.line);
  const scored = Number(g.pick_score) + Number(g.opp_score);
  // Whole-number framing — runs/points come in integers, and an over must
  // EXCEED the line. At 6 scored vs a 9.5 line the over needs 4 (to reach 10),
  // not the raw 3.5 gap; the under's cushion is how many more can score while
  // still staying below the line (3).
  const remaining = heldOver
    ? Math.floor(line) + 1 - scored
    : Math.ceil(line) - 1 - scored;
  // Once the line is crossed the total is decided — no more pace guessing.
  const decided = scored > line;
  const frac =
    g.state === "in" && !decided ? gameElapsedFraction(g, leg.league) : null;
  const projected = frac ? Math.round(scored / frac) : null;
  // Under is on target if the projected final stays under the line; over is on
  // target if it clears it.
  const onTarget =
    projected == null ? null : heldOver ? projected > line : projected < line;
  return { line, scored, remaining, projected, onTarget, heldOver, decided };
};

/* Order legs so finished games sink to the bottom, leaving live/upcoming ones
 * (the ones still in play) up top. Stable within each group — preserves the
 * original leg order otherwise. */
/* Leg order inside a parlay slip: unsettled legs first, then by chance,
 * highest first, so a slip reads the same direction as the Win % sort above it
 * (it used to keep raw API order within each group, which showed as an
 * unsorted 59/95/63/61 column). Settled legs stay last on purpose even at
 * 100% — a decided leg is reference, not the live action. API order breaks
 * ties; a leg with no price sinks within its group. */
const sortLegs = (legs) =>
  legs
    .map((leg, i) => ({ leg, i, done: legIsFinished(leg) }))
    .sort(
      (a, b) =>
        a.done - b.done ||
        (b.leg.win_pct ?? -1) - (a.leg.win_pct ?? -1) ||
        a.i - b.i,
    )
    .map((x) => x.leg);

/* Does the leg have a baseball situation row (count/outs/runners) that will
 * render? Baseball shows its inning there; every other live sport (basketball,
 * etc.) has no situation row, so its status must stay in the top-right label. */
const hasLiveSituation = (leg) => {
  const g = leg.game;
  const sit = g && g.situation;
  if (!g || g.state !== "in" || !sit) return false;
  return (
    (sit.balls != null && sit.strikes != null) ||
    sit.outs != null ||
    sit.on_first ||
    sit.on_second ||
    sit.on_third
  );
};

/* Live baseball situation: base-runner diamond, count, and outs. `inning` is
 * the game's inning detail ("Top 9th") shown in place of the redundant "N out"
 * words — the out count is already conveyed by the dots. */
function LiveSituation({ sit, inning, compact }) {
  if (!sit) return null;
  const hasCount = sit.balls != null && sit.strikes != null;
  const hasOuts = sit.outs != null;
  // Nothing meaningful to show (e.g. between innings with no data)
  if (!hasCount && !hasOuts && !sit.on_first && !sit.on_second && !sit.on_third)
    return null;
  return (
    <div style={compact ? S.sitRowCompact : S.sitRow}>
      <div style={S.diamond} aria-label="Base runners">
        <span style={S.base(sit.on_second, "second")} />
        <span style={S.base(sit.on_third, "third")} />
        <span style={S.base(sit.on_first, "first")} />
      </div>
      <div style={S.sitMeta}>
        {hasCount ? (
          <span style={S.sitCount} aria-label={`Count ${sit.balls}-${sit.strikes}`}>
            {sit.balls}-{sit.strikes}
            <span style={S.sitCountLabel}>count</span>
          </span>
        ) : null}
        {/* Inning label (replaces the "N out" words) + the out dots. */}
        <span style={S.sitOuts}>
          {inning ? <span style={S.sitInning}>{inning}</span> : null}
          {hasOuts ? (
            <span style={S.outDots} aria-label={`${sit.outs} out`}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={S.outDot(i < sit.outs)} />
              ))}
            </span>
          ) : null}
        </span>
      </div>
      {sit.last_play ? <div style={S.sitPlay}>{sit.last_play}</div> : null}
    </div>
  );
}

/* One finished bet in the History tab — settled, sold early, or both (see the
 * merge in the page body). Collapsed shows the outcome + P&L; expanded lists
 * each leg's pick and whether it hit. */
function HistoryCard({ item, isOpen, onToggle }) {
  const legs = item.legs || [];
  const isCombo = legs.length > 1 || (item.legCount || 0) > 1;
  const cashed = item.outcome === "cashed";
  const pnl = Number(item.pnl) || 0;
  const title =
    item.title ||
    (isCombo
      ? `${legs.length || item.legCount}-Leg Parlay`
      : legs[0]?.matchup ||
        parseTitleLegs(item.rawTitle)[0]?.label ||
        item.rawTitle);
  // What the sale looked like: how much went out the door, and — for a position
  // that was gone before the market resolved — whether holding would have paid.
  const soldNote = item.sold
    ? [
        `sold ${Math.round(item.sold.contracts * 100) / 100} for ${usd(item.sold.proceeds)}`,
        item.pending
          ? "market hasn't settled yet"
          : cashed && item.marketWon != null
            ? item.marketWon
              ? "would have won"
              : "would have lost"
            : null,
        item.partial ? "rest held to settlement" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;
  return (
    <div style={S.bet}>
      <div
        style={S.betHeader}
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
      >
        <div style={S.betTop}>
          <div style={S.betTitleWrap}>
            <span style={S.chevron(isOpen)}>▶</span>
            <span style={S.betTitle}>{title}</span>
          </div>
          <div
            style={cashed ? S.cashedPill : S.resultPill(item.outcome === "won")}
          >
            {cashed ? "💰 Cashed out" : item.outcome === "won" ? "Won" : "Lost"}
          </div>
        </div>
        <div style={S.histSub}>
          {formatSettled(item.at)}
          {soldNote ? ` · ${soldNote}` : ""}
        </div>
      </div>

      {isOpen && legs.length ? (
        <div style={S.histLegs}>
          {legs.map((leg, i) => (
            <div style={S.histLeg} key={leg.market_ticker || i}>
              <span style={S.check(leg.state === "won" ? C.green : C.red)}>
                {leg.state === "won" ? "✓" : "✕"}
              </span>
              <span style={S.histLegPick}>{leg.pick}</span>
              <span style={S.histLegMatchup}>{leg.matchup}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div style={S.metrics}>
        <div style={S.metricsPlain}>
          <div>
            <div style={S.mLabel}>Cost</div>
            <div style={S.mValue}>
              {item.cost == null ? "—" : usd(item.cost)}
            </div>
          </div>
          <div>
            {/* One number either way: the market's payout, what we sold for, or
                the two added together on a partial. */}
            <div style={S.mLabel}>{cashed ? "Cashed out" : "Payout"}</div>
            <div style={S.mValue}>{usd(item.payout)}</div>
          </div>
          <div>
            <div style={S.mLabel}>P&L</div>
            <div
              style={{
                ...S.mValue,
                color: item.pnl == null ? C.muted : pnlColor(pnl),
              }}
            >
              {item.pnl == null ? "—" : pnlStr(pnl)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* The Yes/No side badge + market label that opens every position row, e.g.
 * "Yes · Over 8.5 runs scored" or "No · Toronto wins by over 1.5 runs". */
function RowPick({ leg }) {
  return (
    <div style={S.rowPick}>
      {leg.side ? (
        <>
          <span style={leg.side === "yes" ? S.sideYes : S.sideNo}>
            {leg.side === "yes" ? "Yes" : "No"}
          </span>
          <span style={S.rowDot}>·</span>
        </>
      ) : null}
      <span style={S.rowPickText}>{marketLabel(leg)}</span>
    </div>
  );
}

/* The right-aligned "6% chance ▼" chip, colored by the probability itself
 * (see chanceColor); the arrow marks the on-field lean. */
function Chance({ leg }) {
  const ch = chanceOf(leg);
  if (!ch) return null;
  return (
    <span style={{ ...S.rowChance, color: ch.color }}>
      {ch.pct}% chance
      {ch.arrow ? <span style={S.rowArrow}>{ch.arrow}</span> : null}
    </span>
  );
}

/* A total bet's live read: runs/points still needed (or cushion left) plus the
 * pace projection. Renders nothing for any other market, or before there's a
 * score to reason about. */
function TotalPace({ leg }) {
  const t = totalPaceOf(leg);
  if (!t) return null;
  // An under with a 0 cushion isn't busted — it just can't absorb another score.
  const stillLive = t.remaining > 0 || (!t.heldOver && !t.decided);
  const noCushion = !t.heldOver && t.remaining === 0;
  return (
    <div style={S.totalRow}>
      {stillLive ? (
        <span style={S.totalCell}>
          {/* Label leads, number trails: "over needs 4". */}
          <span
            style={{
              ...S.totalLabel,
              ...(noCushion ? { color: C.amber } : null),
            }}
          >
            {t.heldOver
              ? "over needs"
              : noCushion
                ? "no cushion — next score busts it"
                : "under cushion"}
          </span>
          {/* The no-cushion label is a full sentence, so it drops the trailing 0. */}
          {noCushion ? null : (
            <span
              style={{ ...S.totalNum, color: t.heldOver ? C.text : C.green }}
            >
              {t.remaining}
            </span>
          )}
        </span>
      ) : (
        // Line crossed: the over has already hit; the under is busted.
        <span style={S.totalCell}>
          <span style={S.totalLabel}>
            {t.heldOver ? "over the line" : "over — busted"}
          </span>
          <span style={{ ...S.totalNum, color: t.heldOver ? C.green : C.red }}>
            {Math.abs(t.remaining)}
          </span>
        </span>
      )}

      {t.projected != null ? (
        <span style={S.totalCell}>
          <span style={{ ...S.totalNum, color: t.onTarget ? C.green : C.red }}>
            {t.projected}
          </span>
          <span style={S.totalLabel}>
            proj · {t.onTarget ? "on target" : "off pace"}
          </span>
        </span>
      ) : null}
    </div>
  );
}

/* Game-card header: the matchup, its league, and — for a real (non-parlay)
 * game — the live/final score and, when in progress, the base/count situation.
 * Pre-game shows the scheduled time instead. */
/* Time left on a crypto window, ticking once a second.
 *
 * Card-level rather than per-leg on purpose: every leg of a crypto combo settles
 * on the same window (the engine only quotes combos inside one), verified
 * against a live 5-leg ticket whose legs were all KX…15M-26JUL311730-30 and
 * whose market.close_time was exactly that window's 21:30Z. Per-leg would print
 * the same clock five times.
 *
 * Recomputed from Date.now() every tick instead of decrementing a counter, so a
 * throttled or backgrounded tab resumes at the right number rather than however
 * far behind it fell. */
function CloseCountdown({ closeTime }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    /* A background tab throttles this interval to roughly once a minute, so the
       clock is frozen while you're away. Reading Date.now() each tick means it
       can't drift, but without this it would still show the stale number for up
       to a second after you come back — snap it on the way in. */
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  const end = new Date(closeTime).getTime();
  if (!Number.isFinite(end)) return null;
  const left = Math.round((end - now) / 1000);
  // Past the close the market is decided but Kalshi hasn't settled it yet — say
  // that rather than counting into negative numbers.
  if (left <= 0) {
    return (
      <span style={{ ...S.countdown, ...S.countdownDone }}>⏱ settling…</span>
    );
  }
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const label = h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
  // Under a minute the window is effectively resolving — make it obvious.
  const urgent = left <= 60;
  return (
    <span
      style={{ ...S.countdown, ...(urgent ? S.countdownUrgent : null) }}
      title={`Market closes ${new Date(closeTime).toLocaleTimeString()}`}
    >
      ⏱ {label}
    </span>
  );
}

function GameHeader({ grp, onHide }) {
  const g = grp.game;
  const live = !grp.isCombo && g && g.state === "in";
  const post = !grp.isCombo && g && g.state === "post";
  const pre = !grp.isCombo && g && g.state === "pre";
  const hasScore = g && g.away_score != null && g.home_score != null;
  const awayLead = hasScore && g.away_score > g.home_score;
  const homeLead = hasScore && g.home_score > g.away_score;
  const sit = g && g.situation;
  // A baseball-style situation (count / outs / runners) renders its own row
  // below — with the inning inside it — so we don't also stamp the inning on
  // the score line. Other live sports have no such row.
  const hasSit = !!(
    live &&
    sit &&
    ((sit.balls != null && sit.strikes != null) ||
      sit.outs != null ||
      sit.on_first ||
      sit.on_second ||
      sit.on_third)
  );
  // Live clock/period shown by the score (a basketball "Q3 5:23", or a baseball
  // "Top 9th" between innings). Skipped when the situation row carries it.
  const liveStatus = live && !hasSit ? g.detail || "Live" : null;
  // A parlay header has nothing under the title block (no score, schedule, or
  // situation row), so without this the first leg's hairline sits flush against
  // the league label.
  const bare = !pre && !hasScore && !live;
  return (
    <div style={bare ? S.gameHeadBare : undefined}>
      <div style={S.gameHead}>
        <div style={{ minWidth: 0 }}>
          <div style={S.gameTitle}>{grp.title}</div>
          <div style={S.gameSubRow}>
            {grp.league ? <span style={S.gameLeague}>{grp.league}</span> : null}
            {/* Crypto only. Sports positions carry a close_time too, but it's
                often days out and the live score/inning already says where the
                game is — a settlement countdown there would be noise. */}
            {grp.closeTime ? (
              <CloseCountdown closeTime={grp.closeTime} />
            ) : null}
          </div>
        </div>
        <button
          style={S.gameHideBtn}
          title="Hide this game"
          aria-label="Hide this game"
          onClick={onHide}
        >
          ✕
        </button>
      </div>
      {pre ? (
        <div style={S.schedRow}>{gameDetail(g) || "Scheduled"}</div>
      ) : hasScore ? (
        <div style={S.scoreRow}>
          <span style={S.scoreTeam}>{g.away_team}</span>
          <span style={{ ...S.scoreNum, color: awayLead ? C.text : C.muted }}>
            {g.away_score}
          </span>
          <span style={S.scoreDash}>–</span>
          <span style={{ ...S.scoreNum, color: homeLead ? C.text : C.muted }}>
            {g.home_score}
          </span>
          <span style={S.scoreTeam}>{g.home_team}</span>
          {post ? <span style={S.finalTag}>Final</span> : null}
          {liveStatus ? <span style={S.liveTag}>{liveStatus}</span> : null}
        </div>
      ) : live ? (
        // Live but no score matched yet — still surface that it's in play.
        <div style={S.schedRow}>{g.detail || "Live — score unavailable"}</div>
      ) : null}
      {hasSit ? <LiveSituation sit={sit} inning={g.detail} /> : null}
    </div>
  );
}

/* Live temp line for a weather-engine position — the weather card's version of
 * the score strip on a sports card. Data rides display.weather (latest scan
 * snapshot, <=10 min old): the station's current reading, today's running max
 * (the number the market literally settles on, so far), and the forecast high.
 * Renders nothing for every other market. */
function WeatherNow({ d, noCity = false }) {
  const w = d && d.weather;
  if (!w || (w.current_temp == null && w.obs_max == null)) return null;
  const deg = (v) => (v == null ? "—" : `${Math.round(Number(v))}°`);
  /* Label above value, so three temperatures read as three labelled figures
     instead of one run-on sentence ("Austin now 91° high so far 91° forecast
     102°" — Patrick, 2026-08-19: "fix the spacing"). Same stacked-stat idiom
     the portfolio strip and the game cards already use on this page. */
  const Stat = ({ label, value, bright }) => (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 1 }}>
      <span
        style={{
          color: C.muted,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: bright ? C.text : C.muted,
          fontSize: 14,
          fontWeight: 800,
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
    </span>
  );
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        alignItems: "flex-end",
        flexWrap: "wrap",
        // Sits under the city heading in a section (noCity), or on its own
        // line under the pick on an ungrouped card.
        marginTop: 8,
        marginBottom: noCity ? 4 : 0,
      }}
    >
      {!noCity && (
        <span style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>
          🌡 {w.city}
        </span>
      )}
      {/* "Now" is the only live figure, so it's the bright one. */}
      <Stat label="Now" value={deg(w.current_temp)} bright />
      {/* The number the market literally settles on, as of this moment. */}
      <Stat label="High so far" value={deg(w.obs_max)} />
      <Stat label="Forecast" value={deg(w.forecast_high)} />
    </div>
  );
}

/* A single-market position row: pick + chance on top, cost + payout below.
 * Clicking the row opens the game's ESPN page, or the Kalshi event page when
 * there's no game behind it (crypto), so every row is clickable. */
function SingleRow({ b, showWeather = true }) {
  const d = b.display || {};
  const leg = (d.legs || [])[0] || {};
  const link =
    (leg.game && leg.game.link) ||
    kalshiEventUrl(eventTickerOf(b.market, leg.market_ticker || b.ticker));
  const Row = link ? "a" : "div";
  const rowProps = link
    ? {
        href: link,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "mb-poslink",
      }
    : {};
  return (
    <Row style={S.posRow} {...rowProps}>
      <div style={S.rowLine1}>
        <RowPick leg={leg} />
        <Chance leg={leg} />
      </div>
      <TotalPace leg={leg} />
      {showWeather && <WeatherNow d={d} />}
      <div style={S.rowLine2}>
        <span>{usd(d.cost_dollars)} cost</span>
        <span style={S.rowProfit}>+{usd(profitOf(d))} profit</span>
        <span>
          Pays out {usd0(d.max_payout_dollars)}
          {link ? <span style={S.linkArrow}> ↗</span> : null}
        </span>
      </div>
      {/* Its own line ALWAYS (never the fourth flex-wrap item — that wrapped
          only on narrow cards, so half the cards showed it inline and half
          underneath). Right-aligned so it sits directly beneath "Pays out",
          and it carries its own profit: what selling RIGHT NOW nets against
          cost, which is a different number from the hold-to-win profit above
          it — Patrick, 2026-08-19. */}
      {cashOutGap(d) != null && (
        <div style={S.rowCashOutLine}>
          <span style={S.rowCashOut}>cash out {usd(cashOutGap(d))}</span>
          {(() => {
            const delta = cashOutGap(d) - (Number(d.cost_dollars) || 0);
            return (
              <span style={{ color: pnlColor(delta), fontWeight: 600 }}>
                {" "}
                ({pnlStr(delta)})
              </span>
            );
          })()}
        </div>
      )}
    </Row>
  );
}

/* A parlay (multi-game ticket): one row per leg — pick + chance, with the leg's
 * own game/score beneath — then a footer with the whole ticket's economics,
 * since cost/payout are ticket-level, not per-leg. */
function ParlayRows({ b }) {
  const d = b.display || {};
  const legs = sortLegs(Array.isArray(d.legs) ? d.legs : []);
  const pnl = Number(d.total_pnl_dollars) || 0;
  return (
    <>
      {legs.map((leg, i) => {
        const g = leg.game;
        // ESPN reports a scheduled game's competitors as 0, so a pre-game leg
        // would read "· 0–0 ·" hours before tip-off. Suppress the score until
        // the game starts and let the kickoff time carry the line instead —
        // the same rule the single-game header uses (pre ? schedule : score).
        const hasScore =
          g &&
          g.state !== "pre" &&
          g.away_score != null &&
          g.home_score != null;
        // Live leg: show the base/count/outs block. It carries the inning, so
        // the sub line drops the now-duplicated detail. Skipped once the leg is
        // decided — a settled leg's live clock is noise.
        const showSit = hasLiveSituation(leg) && !legIsFinished(leg);
        // Clicking the leg opens its ESPN game page, or its Kalshi event page
        // when there's no game behind it — a crypto leg inside a parlay only
        // knows its own market ticker, so the event ticker is derived from that.
        const link =
          (g && g.link) ||
          kalshiEventUrl(eventTickerOf(null, leg.market_ticker));
        const Row = link ? "a" : "div";
        const rowProps = link
          ? {
              href: link,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "mb-poslink",
            }
          : {};
        return (
          <Row style={S.posRow} key={leg.market_ticker || i} {...rowProps}>
            <div style={S.rowLine1}>
              <RowPick leg={leg} />
              <Chance leg={leg} />
            </div>
            <div style={S.rowSub}>
              {gameTitleOf(leg)}
              {hasScore ? (
                <>
                  {" "}
                  <span
                    style={S.rowScore}
                    aria-label={`Score ${g.away_score} to ${g.home_score}`}
                  >
                    <span style={S.rowScoreLabel}>SCORE</span>
                    {g.away_score}–{g.home_score}
                  </span>
                </>
              ) : (
                ""
              )}
              {!showSit && gameDetail(g) ? ` · ${gameDetail(g)}` : ""}
              {link ? <span style={S.linkArrow}> ↗</span> : null}
            </div>
            <TotalPace leg={leg} />
            {showSit ? (
              <LiveSituation sit={g.situation} inning={g.detail} compact />
            ) : null}
          </Row>
        );
      })}
      <div style={S.parlayFoot}>
        <span style={S.parlayFootItem}>Cost {usd(d.cost_dollars)}</span>
        <span style={S.parlayFootItem}>
          Value {usd(d.current_value_dollars)}
        </span>
        {cashOutGap(d) != null && (
          <span style={S.rowCashOut}>Cash out {usd(cashOutGap(d))}</span>
        )}
        <span style={S.parlayFootItem}>
          Pays out {usd0(d.max_payout_dollars)}
        </span>
        <span style={{ ...S.parlayFootItem, color: C.greenDim }}>
          Profit +{usd(profitOf(d))}
        </span>
        <span style={{ color: pnlColor(pnl) }}>P&amp;L {pnlStr(pnl)}</span>
      </div>
    </>
  );
}

export default function MyBets() {
  const [balance, setBalance] = useState(null);
  const [positions, setPositions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // "open" (live positions) or "history" (settled won/lost bets).
  const [tab, setTab] = useState("open");
  const [settlements, setSettlements] = useState(null);
  // Auto cash-out monitor: { config: {enabled, pct}, cashouts: [...] } from
  // GET /kalshi/cashouts. Fetched on mount (for the armed chip) and with the
  // History tab (a cashed-out position leaves the positions list and shows up
  // in the settlements feed as revenue $0 at best, so this is its real record).
  const [cashouts, setCashouts] = useState(null);
  // { sports, crypto } — each null when that engine has nothing wrong.
  const [engineBlocks, setEngineBlocks] = useState({
    sports: null,
    crypto: null,
    weather: null,
  });
  const [histLoading, setHistLoading] = useState(false);
  const [histExpanded, setHistExpanded] = useState(() => new Set());
  const toggleHist = (id) =>
    setHistExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // Bets the user has dismissed (e.g. an obvious loser). Persisted in the
  // browser so they stay hidden across refreshes; restorable via "Show all".
  const [hidden, setHidden] = useState(() => {
    try {
      const raw = localStorage.getItem("mb_hidden");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  const persistHidden = (set) => {
    try {
      localStorage.setItem("mb_hidden", JSON.stringify([...set]));
    } catch {
      /* ignore quota/availability errors — hiding still works this session */
    }
  };
  // Hide every position in a game card at once (the header ✕ dismisses the game).
  const hideBets = (ids) =>
    setHidden((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      persistHidden(next);
      return next;
    });
  const unhideAll = () =>
    setHidden(() => {
      persistHidden(new Set());
      return new Set();
    });

  // Sort control for the open grid. Every key defaults to big-first;
  // clicking the active key flips direction. Persisted like the hidden set.
  // Default is Win % highest-first (Patrick, 2026-07-29) — the chance is the
  // number you scan the grid for, so it leads unless you pick another key.
  const [sort, setSort] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(SORT_STORAGE_KEY) || "null");
      if (
        raw &&
        SORTS.some((s) => s.key === raw.key) &&
        (raw.dir === 1 || raw.dir === -1)
      ) {
        return raw;
      }
    } catch {
      /* fall through to the default */
    }
    return { key: "win", dir: -1 };
  });
  const pickSort = (key) =>
    setSort((prev) => {
      const next =
        key === prev.key ? { key, dir: -prev.dir } : { key, dir: -1 };
      try {
        localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* sorting still works this session */
      }
      return next;
    });

  /* Fetch positions + balance. Deliberately does NOT raise the `loading` flag on
   * the way in: `loading` starts true (so mount already reads as loading) and
   * the only other caller that wants the Refresh button to say "Loading…" is a
   * click handler, which raises it itself. Keeping the flag out of here means
   * calling load() from an effect never writes state synchronously.
   * background=true is the 15s auto-refresh: update data silently, and don't
   * replace good data's UI with an error if one poll blips. */
  const load = async ({ background = false } = {}) => {
    try {
      const [balRes, posRes] = await Promise.all([
        fetch(`${API_BASE}/balance`),
        fetch(`${API_BASE}/positions`),
      ]);
      if (!balRes.ok)
        throw new Error(`Balance request failed (${balRes.status})`);
      if (!posRes.ok)
        throw new Error(`Positions request failed (${posRes.status})`);
      setBalance(await balRes.json());
      const pos = await posRes.json();
      setPositions(pos);
      // Clear a stale failure banner once good data actually lands (rather than
      // optimistically at request start, which briefly hid live errors).
      setError("");
    } catch (e) {
      // Don't blow away good data on a transient background failure; only
      // surface errors from an explicit/initial load.
      if (!background)
        setError(e.message || "Something went wrong loading your bets.");
    } finally {
      if (!background) setLoading(false);
    }
  };

  /* Settled history — fetched lazily the first time the History tab opens, then
   * re-fetchable via the refresh button while on that tab. Like load(), it
   * leaves raising `histLoading` to its callers (both are click handlers). */
  const loadSettlements = async () => {
    try {
      // Cash-outs are fetched WITH the settlements, not after them: the history
      // list folds each sale into the settlement it belongs to, so landing the
      // two separately would flash every sold position as a total loss.
      const [res] = await Promise.all([
        fetch(`${API_BASE}/settlements`),
        loadCashouts(),
      ]);
      if (!res.ok) throw new Error(`History request failed (${res.status})`);
      const data = await res.json();
      setSettlements(data?.settlements || []);
    } catch (e) {
      setError(e.message || "Something went wrong loading your history.");
    } finally {
      setHistLoading(false);
    }
  };

  /* Why the engines aren't betting, if they aren't. This page is where a day
     with no new bets is actually NOTICED — it's the portfolio view — but it
     only ever asked Kalshi for money, so it could show an empty day with no
     way to tell "nothing worth betting" from "stopped since yesterday
     evening". Both statuses carry `blocked` (null when all is well).
     Best-effort like loadCashouts: a failure just means no banner. */
  const loadEngineBlocks = async () => {
    const read = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const body = await res.json();
        return body && body.blocked ? body.blocked : null;
      } catch {
        return null;
      }
    };
    const [sports, crypto, weather] = await Promise.all([
      read(`${API_BASE}/auto-bets/status`),
      read(`${CRYPTO_API_BASE}/auto-bets/status`),
      read(`${WEATHER_API_BASE}/auto-bets/status`),
    ]);
    setEngineBlocks({ sports, crypto, weather });
  };

  // Best-effort — the page works fine without it (older backend deploys don't
  // have the endpoint), so failures stay silent. Without it the History tab
  // falls back to what Kalshi alone reports, which books a sold position as a
  // total loss; the armed chip simply doesn't render.
  const loadCashouts = async () => {
    try {
      const res = await fetch(`${API_BASE}/cashouts`);
      if (res.ok) setCashouts(await res.json());
    } catch {
      /* chip doesn't render; history shows Kalshi's own numbers */
    }
  };

  useEffect(() => {
    // Kicked off inside an async wrapper so the fetch is unambiguously off the
    // effect's synchronous path — no state is written until the response lands.
    (async () => {
      await load();
    })();
    loadCashouts();
    (async () => {
      await loadEngineBlocks();
    })();
    // Auto-refresh every 15s so live scores/situations stay current.
    const id = setInterval(() => load({ background: true }), 15000);
    /* The engines' state is a much slower-moving thing than the scores, and
       two more requests every 15s is load on the same Kalshi-backed endpoints
       for no gain. 60s is still well inside "noticed it myself". */
    const blockId = setInterval(loadEngineBlocks, 60000);
    return () => {
      clearInterval(id);
      clearInterval(blockId);
    };
  }, []);

  // Opening the History tab. The lazy first fetch lives here rather than in an
  // effect on `tab` — it's user-triggered work, so the click handler is its
  // natural home (and React batches it with the tab switch).
  const openHistory = () => {
    setTab("history");
    if (settlements === null && !histLoading) {
      setHistLoading(true);
      loadSettlements();
    }
  };

  // Refresh button: whichever tab is showing, reloaded with its "Loading…" state.
  const refresh = () => {
    if (tab === "history") {
      setHistLoading(true);
      loadSettlements();
      return;
    }
    setLoading(true);
    load();
  };

  // Live games always lead (a position is live when any of its legs' games
  // are in progress — that's what needs watching); within the live and
  // pre-game groups the user-picked sort applies. Positions missing the
  // chosen metric sink to the bottom of their group in either direction.
  const isLive = (b) => {
    if ((b.display?.legs || []).some((l) => l.game && l.game.state === "in"))
      return true;
    /* Weather markets have no ESPN game, so the leg test can never fire — but
     * TODAY's high temp is resolving as you watch it (the station's running max
     * is climbing), which is exactly the "in progress" the sort is for.
     * Tomorrow's is not. */
    if (WEATHER_TICKER_RE.test(b.ticker || "")) {
      return weatherDayLabel(weatherDayChunk(b.ticker)).startsWith("Today");
    }
    return false;
  };
  const sortDef = SORTS.find((s) => s.key === sort.key) || SORTS[0];
  const metricOf = (b) => {
    const d = b.display || {};
    const legs = Array.isArray(d.legs) ? d.legs : [];
    const m = sortDef.metric(d, legs);
    const n = Number(m);
    return m == null || Number.isNaN(n) ? null : n;
  };
  const allBets = [...(positions?.market_positions || [])].sort((a, b) => {
    const liveDiff = isLive(b) - isLive(a);
    if (liveDiff) return liveDiff;
    const ma = metricOf(a);
    const mb = metricOf(b);
    if (ma == null && mb == null) return 0;
    if (ma == null) return 1;
    if (mb == null) return -1;
    return sort.dir * (ma - mb);
  });
  // Cards actually shown: everything the user hasn't dismissed, minus the
  // permanently-hidden dead markets. Totals below still count every position
  // (including both kinds of hidden) so the P&L/portfolio figures stay
  // accurate — that money is genuinely still tied up on Kalshi.
  const hideable = allBets.filter((b) => !ALWAYS_HIDDEN_TICKERS.has(b.ticker));
  const bets = hideable.filter((b) => !hidden.has(b.ticker));
  /* Re-pack the open grid whenever the card set or their order changes. The
     ResizeObserver inside catches height changes on its own (live scores), so
     these deps only cover cards appearing, disappearing or moving. Declared
     here rather than at the top of the component because `bets` is derived
     above — the call is still unconditional, which is all hook order needs. */
  const gridRef = useRef(null);
  useMasonry(gridRef, [bets.length, tab, sort.key, sort.dir]);
  // Counts only the user's own dismissals: "Show all" must not resurrect a
  // permanently-hidden card, so those aren't part of this count either.
  const hiddenCount = hideable.length - bets.length;
  const totalPnl = allBets.reduce(
    (acc, b) => acc + (Number(b.display?.total_pnl_dollars) || 0),
    0,
  );
  const positionsValue = allBets.reduce(
    (acc, b) => acc + (Number(b.display?.current_value_dollars) || 0),
    0,
  );
  // "In play" = money currently staked, i.e. what was paid for the open
  // positions (their cost basis) — not the mark. This is the capital tied up in
  // live bets until they settle or are cashed out.
  const totalCost = allBets.reduce(
    (acc, b) => acc + (Number(b.display?.cost_dollars) || 0),
    0,
  );
  // Best case: what every open position pays if it all hits (sum of the
  // cards' "Pays if won" / "Max payout" boxes).
  const maxPayoutTotal = allBets.reduce(
    (acc, b) => acc + (Number(b.display?.max_payout_dollars) || 0),
    0,
  );

  /* ── History: settled bets and cash-outs in ONE list ──
   * They were never two separate events. A position the monitor sold still
   * settles on Kalshi, and the settlements feed reports it with the contracts
   * we bought but revenue $0 — so every cash-out ALSO arrives as a settlement
   * that looks like a total loss (verified 2026-08-14: all 52 sales in the
   * loaded window had one). Listing the two feeds separately therefore showed
   * each sale twice, once as a full loss and once at its real P&L, and the
   * tab's own record summed the false losses: −$1,038.67 against a true
   * −$303.58 over the same 120 settlements.
   *
   * So a sale is folded into its settlement by ticker — payout = what the
   * market paid PLUS what we sold it for, against Kalshi's cost for the whole
   * position (which is why the folded number can differ by pennies from the
   * engine's own: Kalshi's cost_dollars includes the entry fee). A cash-out
   * only gets its own card when its market hasn't settled yet. */
  const soldByTicker = new Map();
  (cashouts?.cashouts || [])
    .filter((c) => c.status === "filled" || c.status === "partial")
    .forEach((c) => {
      const prev = soldByTicker.get(c.market_ticker) || {
        proceeds: 0,
        contracts: 0,
        cost: 0,
        costKnown: true,
        rows: [],
        matched: false,
      };
      prev.proceeds += Number(c.proceeds_net_dollars) || 0;
      prev.contracts += Number(c.sold_contracts) || 0;
      if (c.cost_basis_dollars == null) prev.costKnown = false;
      else prev.cost += Number(c.cost_basis_dollars);
      prev.rows.push(c);
      soldByTicker.set(c.market_ticker, prev);
    });

  const hist = (settlements || []).map((s) => {
    const d = s.display || {};
    const sale = soldByTicker.get(s.ticker);
    if (sale) sale.matched = true;
    const cost = Number(d.cost_dollars) || 0;
    const revenue = Number(d.payout_dollars) || 0;
    const proceeds = sale ? sale.proceeds : 0;
    const payout = revenue + proceeds;
    return {
      key: `bet:${s.ticker}`,
      at: d.settled_time || s.settled_time,
      title: null, // HistoryCard derives it from the legs / market title
      legs: Array.isArray(d.legs) ? d.legs : [],
      legCount: d.leg_count || 0,
      rawTitle: d.title,
      // Revenue $0 with proceeds means the position was gone before the market
      // resolved — "Lost" would be a lie about where the money went. When part
      // of it was held to settlement (revenue > 0) the win/loss still stands
      // and the sale is a footnote.
      outcome:
        proceeds > 0 && revenue === 0 ? "cashed" : d.won ? "won" : "lost",
      cost,
      payout,
      pnl: payout - cost,
      // `won` here is how the MARKET resolved for the side we held, which the
      // settlement row still reports after a sale — that's what makes it worth
      // showing on a cashed-out card: it says whether selling was the right
      // call, not whether we got paid.
      marketWon: !!d.won,
      sold: sale
        ? {
            contracts: sale.contracts,
            proceeds: sale.proceeds,
            rows: sale.rows,
          }
        : null,
      partial: proceeds > 0 && revenue > 0,
    };
  });

  // Sales whose market hasn't settled yet (or settled outside the loaded
  // window) have no card above, so they carry their own.
  soldByTicker.forEach((sale, ticker) => {
    if (sale.matched) return;
    const label = sale.rows.find((r) => r.label)?.label;
    hist.push({
      key: `sale:${ticker}`,
      at: sale.rows.reduce(
        (latest, r) =>
          String(r.created_at) > String(latest) ? r.created_at : latest,
        sale.rows[0]?.created_at,
      ),
      title: label || ticker,
      legs: [],
      legCount: 0,
      rawTitle: label || ticker,
      outcome: "cashed",
      // Cost is stamped at sale time and is genuinely unknowable for a manual
      // position or an un-backfilled fill_price — a dash beats a number that
      // would flatter the profit.
      cost: sale.costKnown ? sale.cost : null,
      payout: sale.proceeds,
      pnl: sale.costKnown ? sale.proceeds - sale.cost : null,
      marketWon: null,
      sold: {
        contracts: sale.contracts,
        proceeds: sale.proceeds,
        rows: sale.rows,
      },
      partial: false,
      pending: true,
    });
  });
  hist.sort((a, b) => String(b.at).localeCompare(String(a.at)));

  // Record across the merged list. A cash-out is its own outcome — folding it
  // into the losses is what made the old record read 0-for-everything on days
  // the monitor was busy.
  const histWins = hist.filter((h) => h.outcome === "won").length;
  const histLosses = hist.filter((h) => h.outcome === "lost").length;
  const histCashed = hist.filter((h) => h.outcome === "cashed").length;
  const histPnl = hist.reduce((acc, h) => acc + (Number(h.pnl) || 0), 0);

  // Portfolio = cash + the live mark of open positions. (This mark is distinct
  // from "In play" above, which is the cost staked, so Portfolio ≠ In play +
  // Available by design.)
  //
  // We used to PREFER Kalshi's `portfolio_value` here and fall back to our own
  // sum. That inverted on 2026-08-14: `/portfolio/balance` returns
  // `portfolio_value: 0` while a position is open and marked at $21.30, so the
  // `!= null` guard accepted the zero and Portfolio silently collapsed to the
  // cash balance — the header showed Portfolio $187.81 and Available $187.81,
  // the same number twice, against Kalshi's own $209.09.
  //
  // The open position at the time was an 8-market COMBO, which is the likely
  // reason: combos are invisible to several Kalshi surfaces (their books quote
  // empty, and the cash-out monitor cannot reach them through the public order
  // book). Whether `portfolio_value` is combo-blind or simply dead, preferring
  // our own sum is the right way round regardless — it comes from
  // `display.current_value_dollars`, the same field the P&L on this page and
  // the backend's equity snapshots already use, so all three now agree by
  // construction instead of by coincidence.
  //
  // Kalshi's reported value is kept only as a fallback for the case where the
  // positions request failed and we have nothing of our own to sum.
  const cashDollars =
    balance?.balance_dollars != null
      ? Number(balance.balance_dollars) || 0
      : (Number(balance?.balance) || 0) / 100;
  const reportedMark =
    balance?.portfolio_value != null
      ? (Number(balance.portfolio_value) || 0) / 100
      : 0;
  const positionsMark = positionsValue || reportedMark;
  const available = usd(cashDollars);
  const portfolioValue = usd(cashDollars + positionsMark);

  return (
    <div style={S.page}>
      {/* Inline styles can't hold media queries, so the desktop width-fill
          lives in a small injected stylesheet. The `.mb-inner` override widens
          the centered column on wide viewports; the parlay slip grid then
          auto-fills more leg columns on its own. */}
      <style>{MB_CSS}</style>
      <div style={S.topbar}>
        <div style={S.brand}>
          <div style={S.logoDot}>K</div>
          <div style={S.brandName}>My Bets</div>
        </div>
        <div className="mb-nav">
          <a href="/crypto-value" style={S.navLink}>
            🪙 crypto →
          </a>
          <a href="/weather-value" style={S.navLink}>
            🌡 weather →
          </a>
          <a href="/totals-value" style={S.navLink}>
            📈 sports →
          </a>
          {/* Account-wide auto cash-out: the backend sells ANY position once
              selling nets ≥ pct of its max payout. Armed state belongs on the
              page whose positions it will act on. */}
          {cashouts?.config?.enabled && (
            <span
              style={{
                ...S.navLink,
                color: C.green,
                cursor: "default",
              }}
              title="Positions are sold automatically once cashing out nets this share of the max payout (after exit fees)."
            >
              💰 auto {Math.round((cashouts.config.pct || 0) * 100)}%
            </span>
          )}
        </div>
        {/* Desktop: portfolio numbers live inline in the top bar (hidden on
            mobile via CSS — mobile gets the compact strip below instead). */}
        <div className="mb-topstats" style={S.topStats}>
          {/* Portfolio opens the real thing on Kalshi — this figure is the one
              you double-check against the source, so it's the natural handle. */}
          <a
            href={KALSHI_PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...S.topStat, textDecoration: "none", color: "inherit" }}
          >
            <span style={S.topStatLabel}>Portfolio ↗</span>
            <span style={S.topStatValue}>{portfolioValue}</span>
          </a>
          {/* Combined live mark of every open position — the sum of the
              cards' "Value" boxes (Portfolio = this + Available cash). */}
          <div style={S.topStat}>
            <span style={S.topStatLabel}>In play</span>
            <span style={S.topStatValue}>{usd(totalCost)}</span>
          </div>
          <div style={S.topStat}>
            <span style={S.topStatLabel}>If all win</span>
            <span style={{ ...S.topStatValue, color: C.green }}>
              {usd(maxPayoutTotal)}
            </span>
          </div>
          <div style={S.topStat}>
            <span style={S.topStatLabel}>Available</span>
            <span style={S.topStatValue}>{available}</span>
          </div>
          <div style={S.topStat}>
            <span style={S.topStatLabel}>Total P&L</span>
            <span style={{ ...S.topStatValue, color: pnlColor(totalPnl) }}>
              {pnlStr(totalPnl)}
            </span>
          </div>
          <div style={S.topStat}>
            <span style={S.topStatLabel}>Open</span>
            <span style={S.topStatValue}>{bets.length}</span>
          </div>
        </div>
        <button
          style={S.refreshBtn}
          onClick={refresh}
          disabled={tab === "history" ? histLoading : loading}
        >
          {(tab === "history" ? histLoading : loading) ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="mb-inner" style={S.inner}>
        {error ? <div style={S.error}>{error}</div> : null}

        {/* Directly under the portfolio numbers, because this is the page where
            a day with no new bets gets noticed, and "no bets" and "stopped
            betting" look identical from here otherwise. Both render null when
            the engine in question is fine, so a normal day shows nothing. */}
        <EngineBlockedBanner blocked={engineBlocks.sports} engine="Sports" />
        <EngineBlockedBanner blocked={engineBlocks.crypto} engine="Crypto" />
        <EngineBlockedBanner blocked={engineBlocks.weather} engine="Weather" />

        {/* Mobile-only compact summary (the big hero + the desktop top-bar
            strip are both hidden on the other breakpoint via CSS). */}
        <div className="mb-hero-mobile" style={S.heroMobile}>
          {/* Same link as the desktop Portfolio stat — the two breakpoints show
              different markup, so both need it. */}
          <a
            href={KALSHI_PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...S.heroMobilePV,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            {portfolioValue}
            <span style={S.linkArrow}> ↗</span>
          </a>
          <span style={S.heroMobileStat}>{usd(totalCost)} in play</span>
          <span style={{ ...S.heroMobileStat, color: C.green }}>
            {usd(maxPayoutTotal)} if all win
          </span>
          <span style={S.heroMobileStat}>{available} avail</span>
          <span style={{ ...S.heroMobileStat, color: pnlColor(totalPnl) }}>
            {pnlStr(totalPnl)}
          </span>
          <span style={S.heroMobileStat}>{bets.length} open</span>
        </div>

        {/* Open / History tabs */}
        <div style={S.tabs}>
          <button style={S.tab(tab === "open")} onClick={() => setTab("open")}>
            Open{bets.length ? ` (${bets.length})` : ""}
          </button>
          <button style={S.tab(tab === "history")} onClick={openHistory}>
            History
          </button>
        </div>

        {tab === "open" ? (
          <>
            <div style={S.sortRow}>
              <div style={S.sortBar}>
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    style={S.sortBtn(sort.key === s.key)}
                    onClick={() => pickSort(s.key)}
                  >
                    {s.label}
                    {sort.key === s.key ? (sort.dir < 0 ? " ↓" : " ↑") : ""}
                  </button>
                ))}
              </div>
              {hiddenCount > 0 ? (
                <button style={S.showHiddenBtn} onClick={unhideAll}>
                  {hiddenCount} hidden · Show all
                </button>
              ) : null}
            </div>

            {loading && !positions ? (
              <div style={S.muted}>Loading your bets…</div>
            ) : bets.length === 0 ? (
              <div style={S.muted}>
                {hiddenCount > 0
                  ? "All positions hidden. Use “Show all” to bring them back."
                  : "No open positions."}
              </div>
            ) : (
              (() => {
                // Group single-market positions by game — every Kalshi market on the
                // same matchup shares one card, as in the app — while each parlay is
                // its own card. Groups appear in the order their best position
                // surfaces from the active sort, so live games still lead.
                const groups = [];
                const byKey = new Map();
                for (const b of bets) {
                  const d = b.display || {};
                  const legs = Array.isArray(d.legs) ? d.legs : [];
                  const isCombo = legs.length > 1 || (d.leg_count || 0) > 1;
                  const leg0 = legs[0] || {};
                  const isWeather = WEATHER_TICKER_RE.test(b.ticker || "");
                  const wxDay = isWeather ? weatherDayChunk(b.ticker) : null;
                  const key = isWeather
                    ? `weather:${wxDay}`
                    : isCombo
                      ? `parlay:${b.ticker}`
                      : gameKeyOf(leg0);
                  if (!byKey.has(key)) {
                    byKey.set(key, groups.length);
                    groups.push({
                      key,
                      isCombo: isWeather ? false : isCombo,
                      isWeather,
                      game: isCombo ? null : leg0.game,
                      // Normalised, because the backend's league differs by horizon:
                      // "Crypto" for a 15m market but the bare asset ("XRP") for an
                      // hourly one, so the grid showed two different subtitles for
                      // the same kind of card. "Crypto" is the right one of the two
                      // — it's the category, matching how a sports card reads
                      // ("Pro Baseball", not the team), and the asset is already in
                      // the title on both ("XRP 15 min · …" / "XRP price at 5pm").
                      league: isWeather
                        ? "High Temperature"
                        : isCryptoTicker(leg0.market_ticker)
                          ? "Crypto"
                          : leg0.league || "",
                      // Crypto windows are 15m/1h, so a countdown to settlement is
                      // the useful clock. The TIME is read off the position's own
                      // market rather than parsed out of the ticker (verified they
                      // agree — KX…15M-26JUL311730-30 legs against a 21:30Z
                      // close_time — and a field beats re-deriving an ET timestamp
                      // from a string). Whether it IS crypto is judged from the
                      // ticker, because leg.league says "Crypto" for 15m but the
                      // bare asset for hourly; see isCryptoTicker.
                      closeTime:
                        isCryptoTicker(leg0.market_ticker) && b.market
                          ? b.market.close_time || null
                          : null,
                      title: isWeather
                        ? `🌡 High temps — ${weatherDayLabel(wxDay)}`
                        : isCombo
                          ? `${legs.length || d.leg_count}-Leg Parlay`
                          : gameTitleOf(leg0, d.title),
                      positions: [],
                    });
                  }
                  groups[byKey.get(key)].positions.push(b);
                }

                /* A CARD leads if ANY of its positions is live. Position-level
                 * live-first ordering wasn't enough: a group lands where its
                 * FIRST position surfaced, so a parlay whose live leg is its
                 * cheapest sank under a Cost sort while a settled card sat above
                 * it (Patrick, 2026-08-19: "always put games in progress at the
                 * top"). Stable sort keeps the chosen metric's order within each
                 * band, so this only ever lifts live cards. */
                const liveGroup = (g) => g.positions.some((p) => isLive(p));
                groups.sort(
                  (a, b) => Number(liveGroup(b)) - Number(liveGroup(a)),
                );

                const card = (grp) => (
                  <div className="mb-game" style={S.gameCard} key={grp.key}>
                    <GameHeader
                      grp={grp}
                      onHide={() =>
                        hideBets(grp.positions.map((p) => p.ticker))
                      }
                    />
                    {grp.isWeather ? (
                      /* City sections: one temps strip per city, then that
                         city's rows without their own (identical) strip. */
                      (() => {
                        const cities = [];
                        const cityIx = new Map();
                        for (const b of grp.positions) {
                          const w = (b.display || {}).weather || {};
                          const c = w.city || String(b.ticker).split("-")[0];
                          if (!cityIx.has(c)) {
                            cityIx.set(c, cities.length);
                            cities.push({ city: c, first: b, rows: [] });
                          }
                          cities[cityIx.get(c)].rows.push(b);
                        }
                        return cities.map((sec) => (
                          <div key={sec.city}>
                            {/* City on its own line, temps beneath it. Inline,
                                the unlabelled city hung level with the stat
                                VALUES while their labels floated above it, which
                                read as a fourth nameless figure (Patrick,
                                2026-08-19). Stacking gives the section a plain
                                heading and the temps a clean row. */}
                            <div
                              style={{
                                marginTop: 16,
                                paddingTop: 12,
                                borderTop: `1px solid ${C.rowBorder}`,
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 16,
                                  color: C.text,
                                  letterSpacing: 0.2,
                                }}
                              >
                                🌡 {sec.city}
                              </div>
                              <WeatherNow d={sec.first.display} noCity />
                            </div>
                            {sec.rows.map((b) => (
                              <SingleRow
                                b={b}
                                key={b.ticker}
                                showWeather={false}
                              />
                            ))}
                          </div>
                        ));
                      })()
                    ) : grp.isCombo ? (
                      <ParlayRows b={grp.positions[0]} />
                    ) : (
                      grp.positions.map((b) => (
                        <SingleRow b={b} key={b.ticker} />
                      ))
                    )}
                  </div>
                );

                // Straight sort order — no reshuffling by card type. Two earlier
                // attempts to stop a tall parlay slip from stranding space did
                // reshuffle (parlays in a fixed 380px right column, then all
                // singles ahead of all parlays), and both traded one gap for
                // another while pushing a 19% parlay below a 1% single. useMasonry
                // fixes the packing directly, so the grid can just show what the
                // sort asked for. Grouping is untouched — every single position on
                // the same matchup still shares one card.
                return (
                  <div className="mb-games" style={S.gameList} ref={gridRef}>
                    {groups.map(card)}
                  </div>
                );
              })()
            )}
          </>
        ) : (
          /* ─── History tab ─── */
          <>
            {/* Both engines on one axis — the settled-bet cards below are the
                per-bet detail behind this curve. */}
            <PnlChart title="Profit & loss over time" />

            <div style={S.sectionHeader}>
              <div style={S.sectionTitle}>Finished bets</div>
              {hist.length ? (
                <div style={S.histRecord}>
                  <span style={{ color: C.green }}>{histWins}W</span>
                  <span style={S.histRecordDash}>·</span>
                  <span style={{ color: C.red }}>{histLosses}L</span>
                  {histCashed > 0 ? (
                    <>
                      <span style={S.histRecordDash}>·</span>
                      <span style={{ color: C.amber }}>{histCashed} sold</span>
                    </>
                  ) : null}
                  <span style={S.histRecordDash}>·</span>
                  <span style={{ color: pnlColor(histPnl) }}>
                    {pnlStr(histPnl)}
                  </span>
                </div>
              ) : null}
            </div>

            {histLoading && settlements === null ? (
              <div style={S.muted}>Loading your history…</div>
            ) : hist.length === 0 ? (
              <div style={S.muted}>No finished bets yet.</div>
            ) : (
              <div className="mb-bets">
                {hist.map((item) => (
                  <HistoryCard
                    key={item.key}
                    item={item}
                    isOpen={histExpanded.has(item.key)}
                    onToggle={() => toggleHist(item.key)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
