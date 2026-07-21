import React, { useEffect, useState } from "react";

const API_BASE = "https://sheline-art-website-api.herokuapp.com/kalshi";

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
// Kalshi shows contract prices in cents (e.g. 57¢).
const cents = (dollars) => `${Math.round((Number(dollars) || 0) * 100)}¢`;

// Format an ISO game time as "M/D · 6:40 PM ET / 5:40 PM CT" so both zones show.
const formatKickoff = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const day = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(d);
  const time = (tz, label) =>
    `${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    }).format(d)} ${label}`;
  return `${day} · ${time("America/New_York", "ET")} / ${time("America/Chicago", "CT")}`;
};

// Format a settled-time ISO string as "Jul 19, 8:29 PM CT" for the history list.
const formatSettled = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(d);
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
  brandName: { fontSize: 17, fontWeight: 700, letterSpacing: -0.2 },
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

  hero: { padding: "28px 4px 20px" },
  heroLabel: { fontSize: 13, color: C.muted, fontWeight: 600, marginBottom: 6 },
  heroValue: { fontSize: 40, fontWeight: 800, letterSpacing: -1 },
  heroSub: { display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" },
  stat: {},
  statLabel: { fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: 700 },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
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
  betActions: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  hideBtn: {
    background: "transparent",
    border: `1px solid ${C.border}`,
    color: C.muted,
    borderRadius: 999,
    width: 26,
    height: 26,
    lineHeight: 1,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  bet: {
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  betTitle: { fontSize: 15, fontWeight: 700, lineHeight: 1.3 },
  sidePill: (side) => ({
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    padding: "4px 10px",
    borderRadius: 999,
    color: side === "no" ? C.red : C.green,
    backgroundColor: side === "no" ? C.redSoft : C.greenSoft,
  }),
  legChips: { display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 4px" },
  legChip: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 9px",
    borderRadius: 8,
    backgroundColor: C.panel,
    border: `1px solid ${C.border}`,
    color: C.text,
  },
  // Metrics area: a hero row (the big green numbers) stacked over a plain row,
  // so the emphasized cells never sit unevenly beside the plain ones.
  metrics: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  // Hero row: equal columns that stay side-by-side even on a phone.
  metricsHero: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  metricsPlain: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  mLabel: { fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 3 },
  mValue: { fontSize: 15, fontWeight: 700 },
  // Highlighted metric cell (Max payout, Value) — pops from the plainer stats.
  mCellHi: {
    backgroundColor: C.greenSoft,
    border: `1px solid ${C.greenBorder}`,
    borderRadius: 10,
    padding: "10px 12px",
  },
  mLabelHi: {
    fontSize: 11,
    color: C.green,
    fontWeight: 800,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 4,
    whiteSpace: "nowrap",
  },
  mValueHi: {
    fontSize: 19,
    fontWeight: 900,
    color: C.green,
    letterSpacing: -0.3,
    whiteSpace: "nowrap",
  },
  // Sub-line under "Value": the actual bid-side cash-out amount + price.
  cashOut: {
    fontSize: 12,
    fontWeight: 700,
    color: C.text,
    marginTop: 4,
    whiteSpace: "nowrap",
  },

  /* Expanded per-leg bet slip — 2 legs across, collapsing to 1 when narrow */
  slip: {
    marginTop: 14,
    paddingTop: 4,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 10,
  },
  // Colorized by state: darker border + light-tinted interior when leaning
  // win/lose; a finished game is rendered noticeably darker than a live one.
  legCard: ({ lean, finished }) => {
    let bg = C.legNeutral;
    let border = C.legNeutralBorder;
    if (lean === "win") {
      bg = finished ? C.legFinishedGreen : C.greenSoft;
      border = C.greenBorder;
    } else if (lean === "lose") {
      bg = finished ? C.legFinishedRed : C.redSoft;
      border = C.redBorder;
    } else if (lean === "tie") {
      // Live dead heat — amber (a tie only happens mid-game, never "finished").
      bg = C.amberSoft;
      border = C.amberBorder;
    } else if (finished) {
      bg = C.legFinishedNeutral;
    }
    return {
      border: `1.5px solid ${border}`,
      borderRadius: 12,
      padding: "12px 14px",
      backgroundColor: bg,
      opacity: finished ? 0.85 : 1,
    };
  },
  legTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  legLeague: {
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  legStatus: (state) => ({
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.3,
    color: state === "in" ? C.green : C.muted,
    textTransform: "uppercase",
    textAlign: "right",
    whiteSpace: "nowrap",
  }),
  legMatchup: { fontSize: 15, fontWeight: 700, marginBottom: 8 },
  pickRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pickLeft: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
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
  pickTeam: { fontSize: 14, fontWeight: 700 },
  winPct: { fontSize: 16, fontWeight: 800 },
  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px solid ${C.border}`,
    flexWrap: "wrap",
  },
  scoreTeam: (lead) => ({
    fontSize: 14,
    fontWeight: lead ? 800 : 600,
    color: lead ? C.text : C.muted,
  }),
  scoreNum: (lead) => ({
    fontSize: 15,
    fontWeight: 800,
    color: lead ? C.text : C.muted,
  }),
  scoreDash: { color: C.muted, fontWeight: 600 },
  delayed: {
    fontSize: 10,
    fontWeight: 800,
    color: C.muted,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "2px 6px",
    letterSpacing: 0.4,
    marginLeft: 4,
  },
  noGame: { fontSize: 12, color: C.muted, marginTop: 8, fontStyle: "italic" },
  /* Total bet: points remaining to the line, shown for under + over. */
  totalRow: {
    display: "flex",
    gap: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px solid ${C.border}`,
    flexWrap: "wrap",
  },
  totalCell: { display: "flex", alignItems: "baseline", gap: 6 },
  totalNum: { fontSize: 17, fontWeight: 800, letterSpacing: -0.3 },
  totalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  /* Live baseball situation: base diamond + count/outs */
  sitRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px solid ${C.border}`,
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
      border: `1.5px solid ${on ? C.green : C.border}`,
      backgroundColor: on ? C.green : "transparent",
      borderRadius: 2,
    };
    // pos: second (top), third (left), first (right)
    if (pos === "second") return { ...common, top: 0, left: 11.5 };
    if (pos === "third") return { ...common, top: 11.5, left: 0 };
    return { ...common, top: 11.5, left: 23 }; // first
  },
  sitMeta: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },
  sitCount: { fontSize: 13, fontWeight: 800, color: C.text },
  sitOuts: { fontSize: 12, fontWeight: 700, color: C.muted, display: "flex", alignItems: "center" },
  // Inning label (e.g. "Top 9th") shown where the "N out" words used to be.
  sitInning: {
    fontSize: 12,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  outDots: { display: "inline-flex", gap: 4, marginLeft: 6, verticalAlign: "middle" },
  outDot: (filled) => ({
    width: 7,
    height: 7,
    borderRadius: 999,
    display: "inline-block",
    backgroundColor: filled ? C.red : "transparent",
    border: `1.5px solid ${filled ? C.red : C.border}`,
  }),
  sitPlay: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

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
@media (min-width: 900px) {
  .mb-inner { max-width: 1600px !important; padding: 0 32px !important; }
  /* Bet cards flow into a multi-column grid so several parlays are visible at
     once without scrolling. auto-fill keeps as many ~420px columns as fit. */
  .mb-bets {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 12px;
    align-items: start;
  }
  .mb-bets > * { margin-bottom: 0 !important; }
  /* Inside a card the legs stack in one narrow column so the card stays a
     compact grid cell (instead of the wide 2-across leg slip). */
  .mb-slip { grid-template-columns: 1fr !important; }
}
`;

const pnlColor = (v) => (v > 0 ? C.green : v < 0 ? C.red : C.text);
const pnlStr = (v) => `${v > 0 ? "+" : ""}${usd(v)}`;

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
  // A live tied game reads as amber ("dead heat") rather than gray "no data".
  if (legIsLiveTie(leg)) return C.amber;
  // The backend computes an authoritative live lean per market type — a spread
  // or total can't be judged by "who's ahead" (a favorite up 3 still fails a
  // -9.5 spread), so trust live_lean when it's provided and only fall back to
  // the score-based heuristic for legs without it (older API responses).
  if (leg.live_lean === "win") return C.green;
  if (leg.live_lean === "lose") return C.red;
  if (leg.live_lean === null && leg.market_type && leg.market_type !== "moneyline") {
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
    if (g.state === "post" && (g.pick_is_winner === true || g.opp_is_winner === true)) {
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

/* True when a leg's game is over (settled, or ESPN post/completed). */
const legIsFinished = (leg) => {
  const g = leg.game;
  return (
    leg.state === "won" ||
    leg.state === "lost" ||
    (g && (g.state === "post" || g.completed === true))
  );
};

/* Order legs so finished games sink to the bottom, leaving live/upcoming ones
 * (the ones still in play) up top. Stable within each group — preserves the
 * original leg order otherwise. */
const sortLegs = (legs) =>
  legs
    .map((leg, i) => ({ leg, i, done: legIsFinished(leg) }))
    .sort((a, b) => a.done - b.done || a.i - b.i)
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

const StatusLabel = ({ leg }) => {
  const g = leg.game;
  // Pre-game: show scheduled time in both ET and CT instead of ESPN's EDT-only
  // string.
  if (g && g.state === "pre") {
    return formatKickoff(g.date) || g.detail || "Scheduled";
  }
  // Live: baseball shows its inning down in the situation row, so keep the
  // top-right empty to avoid duplicating it. Sports WITHOUT a situation row
  // (basketball, etc.) must still show their status here — quarter + clock,
  // "Halftime", etc. — otherwise a live game looks like it has no status.
  if (g && g.state === "in") {
    return hasLiveSituation(leg) ? null : g.detail || "Live";
  }
  if (g && g.detail) return g.detail; // final ("Final"), postponed, etc.
  if (leg.state === "won") return "Won";
  if (leg.state === "lost") return "Lost";
  return "Open";
};

/* Live baseball situation: base-runner diamond, count, and outs. `inning` is
 * the game's inning detail ("Top 9th") shown in place of the redundant "N out"
 * words — the out count is already conveyed by the dots. */
function LiveSituation({ sit, inning }) {
  if (!sit) return null;
  const hasCount = sit.balls != null && sit.strikes != null;
  const hasOuts = sit.outs != null;
  // Nothing meaningful to show (e.g. between innings with no data)
  if (!hasCount && !hasOuts && !sit.on_first && !sit.on_second && !sit.on_third)
    return null;
  return (
    <div style={S.sitRow}>
      <div style={S.diamond} aria-label="Base runners">
        <span style={S.base(sit.on_second, "second")} />
        <span style={S.base(sit.on_third, "third")} />
        <span style={S.base(sit.on_first, "first")} />
      </div>
      <div style={S.sitMeta}>
        {hasCount ? (
          <span style={S.sitCount}>
            {sit.balls}-{sit.strikes}
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

function LegSlip({ leg }) {
  const accent = legAccent(leg);
  const kind = legKind(leg);
  const g = leg.game;
  const isTotal = leg.market_type === "total";
  // For a total, "who's leading" is meaningless — don't highlight a team.
  const pickLead =
    isTotal
      ? false
      : g && g.pick_score != null && g.opp_score != null
        ? g.pick_score >= g.opp_score
        : leg.state === "won";
  // Points remaining to the total line: how much cushion the under (NO) still
  // has, and how many more points the over (YES) needs. Positive `remaining`
  // means the line hasn't been crossed yet.
  const totalInfo =
    isTotal &&
    leg.line != null &&
    g &&
    g.pick_score != null &&
    g.opp_score != null
      ? (() => {
          const scored = Number(g.pick_score) + Number(g.opp_score);
          const remaining = Number(leg.line) - scored;
          return { scored, remaining };
        })()
      : null;
  return (
    <div style={S.legCard(kind)}>
      <div style={S.legTopRow}>
        <span style={S.legLeague}>{leg.league || "Market"}</span>
        <span style={S.legStatus(g ? g.state : leg.state)}>
          <StatusLabel leg={leg} />
        </span>
      </div>
      <div style={S.legMatchup}>{leg.matchup}</div>

      <div style={S.pickRow}>
        <div style={S.pickLeft}>
          <span style={S.check(accent)}>✓</span>
          <span style={S.pickTeam}>{leg.pick}</span>
        </div>
        {leg.win_pct != null ? (
          <span style={{ ...S.winPct, color: accent }}>{leg.win_pct}%</span>
        ) : null}
      </div>

      {g && (g.pick_score != null || g.opp_score != null) ? (
        <div style={S.scoreRow}>
          {/* For a total, neither team "leads" — render both neutral. */}
          <span style={S.scoreTeam(isTotal ? false : pickLead)}>
            {g.pick_team}
          </span>
          <span style={S.scoreNum(isTotal ? false : pickLead)}>
            {g.pick_score ?? "-"}
          </span>
          <span style={S.scoreDash}>–</span>
          <span style={S.scoreNum(isTotal ? false : !pickLead)}>
            {g.opp_score ?? "-"}
          </span>
          <span style={S.scoreTeam(isTotal ? false : !pickLead)}>
            {g.opp_team}
          </span>
          {g.data_delayed ? <span style={S.delayed}>DATA DELAYED</span> : null}
        </div>
      ) : g ? (
        <div style={S.noGame}>{g.detail || "Not started"}</div>
      ) : (
        <div style={S.noGame}>Live score unavailable</div>
      )}

      {/* Total: points remaining to the line, framed for both sides. */}
      {totalInfo ? (
        <div style={S.totalRow}>
          {totalInfo.remaining > 0 ? (
            <>
              <span style={S.totalCell}>
                <span style={{ ...S.totalNum, color: C.green }}>
                  {totalInfo.remaining}
                </span>
                <span style={S.totalLabel}>under cushion</span>
              </span>
              <span style={S.totalCell}>
                <span style={{ ...S.totalNum, color: C.text }}>
                  {totalInfo.remaining}
                </span>
                <span style={S.totalLabel}>over needs</span>
              </span>
            </>
          ) : (
            // Line already crossed — the over has hit, the under is busted.
            <span style={S.totalCell}>
              <span style={{ ...S.totalNum, color: C.text }}>
                {Math.abs(totalInfo.remaining)}
              </span>
              <span style={S.totalLabel}>
                over the line ({totalInfo.scored} of {leg.line})
              </span>
            </span>
          )}
        </div>
      ) : null}

      {g && g.state === "in" ? (
        <LiveSituation sit={g.situation} inning={g.detail} />
      ) : null}
    </div>
  );
}

/* A settled (won/lost) bet in the History tab. Collapsed shows the result +
 * P&L; expanded lists each leg's pick and whether it hit. */
function HistoryCard({ item, isOpen, onToggle }) {
  const d = item.display || {};
  const legs = Array.isArray(d.legs) ? d.legs : [];
  const isCombo = legs.length > 1 || (d.leg_count || 0) > 1;
  const won = d.won;
  const pnl = Number(d.total_pnl_dollars) || 0;
  const title = isCombo
    ? `${legs.length || d.leg_count}-Leg Parlay`
    : legs[0]?.matchup || parseTitleLegs(d.title)[0]?.label || d.title;
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
          <div style={S.resultPill(won)}>{won ? "Won" : "Lost"}</div>
        </div>
        <div style={S.histSub}>{formatSettled(d.settled_time)}</div>
      </div>

      {isOpen && legs.length ? (
        <div style={S.histLegs}>
          {legs.map((leg, i) => (
            <div style={S.histLeg} key={leg.market_ticker || i}>
              <span
                style={S.check(leg.state === "won" ? C.green : C.red)}
              >
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
            <div style={S.mValue}>{usd(d.cost_dollars)}</div>
          </div>
          <div>
            <div style={S.mLabel}>Payout</div>
            <div style={S.mValue}>{usd(d.payout_dollars)}</div>
          </div>
          <div>
            <div style={S.mLabel}>P&L</div>
            <div style={{ ...S.mValue, color: pnlColor(pnl) }}>
              {pnlStr(pnl)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyBets() {
  const [balance, setBalance] = useState(null);
  const [positions, setPositions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  // "open" (live positions) or "history" (settled won/lost bets).
  const [tab, setTab] = useState("open");
  const [settlements, setSettlements] = useState(null);
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
  const hideBet = (id) =>
    setHidden((prev) => {
      const next = new Set(prev).add(id);
      persistHidden(next);
      return next;
    });
  const unhideAll = () =>
    setHidden(() => {
      persistHidden(new Set());
      return new Set();
    });

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // background=true for the 15s auto-refresh: update data silently without
  // toggling the loading state or clobbering which cards the user expanded.
  const load = async ({ background = false } = {}) => {
    if (!background) setLoading(true);
    setError("");
    try {
      const [balRes, posRes] = await Promise.all([
        fetch(`${API_BASE}/balance`),
        fetch(`${API_BASE}/positions`),
      ]);
      if (!balRes.ok) throw new Error(`Balance request failed (${balRes.status})`);
      if (!posRes.ok) throw new Error(`Positions request failed (${posRes.status})`);
      setBalance(await balRes.json());
      const pos = await posRes.json();
      setPositions(pos);
      // On the first (foreground) load, start with every bet card expanded.
      // Background refreshes leave the user's expand/collapse choices intact.
      if (!background) {
        setExpanded(new Set((pos?.market_positions || []).map((b) => b.ticker)));
      }
    } catch (e) {
      // Don't blow away good data on a transient background failure; only
      // surface errors from an explicit/initial load.
      if (!background) setError(e.message || "Something went wrong loading your bets.");
    } finally {
      if (!background) setLoading(false);
    }
  };

  // Settled history — fetched lazily the first time the History tab opens, then
  // re-fetchable via the refresh button while on that tab.
  const loadSettlements = async () => {
    setHistLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settlements`);
      if (!res.ok) throw new Error(`History request failed (${res.status})`);
      const data = await res.json();
      setSettlements(data?.settlements || []);
    } catch (e) {
      setError(e.message || "Something went wrong loading your history.");
    } finally {
      setHistLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh every 15s so live scores/situations stay current.
    const id = setInterval(() => load({ background: true }), 15000);
    return () => clearInterval(id);
  }, []);

  // Fetch history once when the user first switches to the History tab.
  useEffect(() => {
    if (tab === "history" && settlements === null && !histLoading) {
      loadSettlements();
    }
  }, [tab]);

  // Show highest-payout bets first. Single bets have no max payout, so fall
  // back to their current value to keep the ordering meaningful.
  const payoutOf = (b) =>
    Number(b.display?.max_payout_dollars) ||
    Number(b.display?.current_value_dollars) ||
    0;
  const allBets = [...(positions?.market_positions || [])].sort(
    (a, b) => payoutOf(b) - payoutOf(a),
  );
  // Cards actually shown: everything the user hasn't dismissed. Totals below
  // still count every position so the P&L/portfolio figures stay accurate.
  const bets = allBets.filter((b) => !hidden.has(b.ticker));
  const hiddenCount = allBets.length - bets.length;
  const totalPnl = allBets.reduce(
    (acc, b) => acc + (Number(b.display?.total_pnl_dollars) || 0),
    0,
  );
  const positionsValue = allBets.reduce(
    (acc, b) => acc + (Number(b.display?.current_value_dollars) || 0),
    0,
  );

  // History summary: W-L record and net realized P&L across settled bets.
  const hist = settlements || [];
  const histWins = hist.filter((s) => s.display?.won).length;
  const histLosses = hist.length - histWins;
  const histPnl = hist.reduce(
    (acc, s) => acc + (Number(s.display?.total_pnl_dollars) || 0),
    0,
  );

  const available =
    balance?.balance_dollars != null
      ? usd(balance.balance_dollars)
      : usd((Number(balance?.balance) || 0) / 100);
  const portfolioValue =
    balance?.portfolio_value != null
      ? usd((Number(balance.portfolio_value) || 0) / 100)
      : usd(positionsValue);

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
        <button
          style={S.refreshBtn}
          onClick={() => (tab === "history" ? loadSettlements() : load())}
          disabled={tab === "history" ? histLoading : loading}
        >
          {(tab === "history" ? histLoading : loading) ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="mb-inner" style={S.inner}>
        {error ? <div style={S.error}>{error}</div> : null}

        <div style={S.hero}>
          <div style={S.heroLabel}>Portfolio value</div>
          <div style={S.heroValue}>{portfolioValue}</div>
          <div style={S.heroSub}>
            <div style={S.stat}>
              <div style={S.statLabel}>Available balance</div>
              <div style={S.statValue}>{available}</div>
            </div>
            <div style={S.stat}>
              <div style={S.statLabel}>Total P&L</div>
              <div style={{ ...S.statValue, color: pnlColor(totalPnl) }}>
                {pnlStr(totalPnl)}
              </div>
            </div>
            <div style={S.stat}>
              <div style={S.statLabel}>Open bets</div>
              <div style={S.statValue}>{bets.length}</div>
            </div>
          </div>
        </div>

        {/* Open / History tabs */}
        <div style={S.tabs}>
          <button
            style={S.tab(tab === "open")}
            onClick={() => setTab("open")}
          >
            Open{bets.length ? ` (${bets.length})` : ""}
          </button>
          <button
            style={S.tab(tab === "history")}
            onClick={() => setTab("history")}
          >
            History
          </button>
        </div>

        {tab === "open" ? (
        <>
        <div style={S.sectionHeader}>
          <div style={S.sectionTitle}>Open positions</div>
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
          <div className="mb-bets">
          {bets.map((b) => {
            const d = b.display || {};
            // Finished games sink to the bottom so the still-in-play legs lead.
            const legs = sortLegs(Array.isArray(d.legs) ? d.legs : []);
            const isCombo = legs.length > 1 || (d.leg_count || 0) > 1;
            const chipLegs = legs.length
              ? legs.map((l) => ({
                  side: l.side,
                  label:
                    (l.game && l.game.pick_team) ||
                    String(l.pick || "").replace(/\s+to win$/i, ""),
                }))
              : parseTitleLegs(d.title);
            const pnl = Number(d.total_pnl_dollars) || 0;
            const isOpen = expanded.has(b.ticker);
            const title = isCombo
              ? `${legs.length || d.leg_count}-Leg Parlay`
              : legs[0]?.matchup || parseTitleLegs(d.title)[0]?.label || d.title;
            return (
              <div style={S.bet} key={b.ticker}>
                <div
                  style={S.betHeader}
                  onClick={() => toggle(b.ticker)}
                  role="button"
                  aria-expanded={isOpen}
                >
                  <div style={S.betTop}>
                    <div style={S.betTitleWrap}>
                      <span style={S.chevron(isOpen)}>▶</span>
                      <span style={S.betTitle}>{title}</span>
                    </div>
                    <div style={S.betActions}>
                      <div style={S.sidePill(d.side)}>
                        {d.side === "no" ? "No" : "Yes"}
                      </div>
                      {/* Dismiss this bet (stopPropagation so it doesn't also
                          toggle the card's expand/collapse). */}
                      <button
                        style={S.hideBtn}
                        title="Hide this bet"
                        aria-label="Hide this bet"
                        onClick={(e) => {
                          e.stopPropagation();
                          hideBet(b.ticker);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {isCombo && !isOpen ? (
                    <div style={S.legChips}>
                      {chipLegs.map((leg, i) => (
                        <span style={S.legChip} key={i}>
                          {leg.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {isOpen && legs.length ? (
                  <div className="mb-slip" style={S.slip}>
                    {legs.map((leg, i) => (
                      <LegSlip leg={leg} key={leg.market_ticker || i} />
                    ))}
                  </div>
                ) : null}

                <div style={S.metrics}>
                  <div style={S.metricsHero}>
                    <div style={S.mCellHi}>
                      <div style={S.mLabelHi}>{isCombo ? "Max payout" : "Avg price"}</div>
                      <div style={S.mValueHi}>
                        {isCombo ? usd(d.max_payout_dollars) : cents(d.avg_price_dollars)}
                      </div>
                    </div>
                    <div style={S.mCellHi}>
                      <div style={S.mLabelHi}>Value</div>
                      <div style={S.mValueHi}>{usd(d.current_value_dollars)}</div>
                      {/* Real sellable amount — what Kalshi's "Cash out" would
                          pay. For a parlay this is the product of each leg's
                          live sell price (the combo ticker has no book); for a
                          single market it's that market's bid. Shown under the
                          last-trade "Value" so the spread is visible. Hidden
                          when any leg has no live bid (nothing to sell into). */}
                      {d.cash_out_value_dollars != null ? (
                        <div style={S.cashOut}>
                          Cash out {usd(d.cash_out_value_dollars)}
                          {d.cash_out_price_dollars != null
                            ? ` · ${cents(d.cash_out_price_dollars)}`
                            : ""}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div style={S.metricsPlain}>
                    <div>
                      <div style={S.mLabel}>Cost</div>
                      <div style={S.mValue}>{usd(d.cost_dollars)}</div>
                    </div>
                    <div>
                      <div style={S.mLabel}>Contracts</div>
                      <div style={S.mValue}>{Math.round(d.count) || 0}</div>
                    </div>
                    <div>
                      <div style={S.mLabel}>P&L</div>
                      <div style={{ ...S.mValue, color: pnlColor(pnl) }}>
                        {pnlStr(pnl)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
        </>
        ) : (
          /* ─── History tab ─── */
          <>
            <div style={S.sectionHeader}>
              <div style={S.sectionTitle}>Settled bets</div>
              {hist.length ? (
                <div style={S.histRecord}>
                  <span style={{ color: C.green }}>{histWins}W</span>
                  <span style={S.histRecordDash}>·</span>
                  <span style={{ color: C.red }}>{histLosses}L</span>
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
              <div style={S.muted}>No settled bets yet.</div>
            ) : (
              <div className="mb-bets">
                {hist.map((item) => (
                  <HistoryCard
                    key={item.ticker}
                    item={item}
                    isOpen={histExpanded.has(item.ticker)}
                    onToggle={() => toggleHist(item.ticker)}
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
