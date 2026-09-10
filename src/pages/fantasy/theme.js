/* Shared palette, style map and formatters for the four Fantasy Leagues screens
 * (/fantasy standings, /fantasy/sleeper, /fantasy/espn, /fantasy/guillotine).
 *
 * WHY THIS FILE HAS NO JSX. eslint's react-refresh/only-export-components
 * fails a file that exports constants beside a component, so the constants
 * live here and every component lives in ./ui.jsx. Both screens import from
 * both, which is what keeps the two tabs looking like one page.
 *
 * The palette is ffdraft's local dark palette (src/pages/ffdraft/index.jsx:24)
 * copied rather than imported — ffdraft exports no theme, and these pages are
 * chrome-less siblings of it, not of the engine screens.
 *
 * No env var on API_BASE on purpose: this repo has none, and local dev hits
 * production. Do NOT add a localhost:3001 switch — 3001 is the shared backend
 * port, not Vite, and there is no local script that serves /fantasy-football.
 */
export const ROOT = "https://sheline-art-website-api.herokuapp.com";
export const API_BASE = `${ROOT}/fantasy-football`;

export const C = {
  bg: "#0b0e14",
  panel: "#151a24",
  panel2: "#101520",
  border: "#252c3a",
  text: "#e8eaed",
  muted: "#8a93a6",
  green: "#22c55e",
  amber: "#eab308",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a78bfa",
  chipBg: "#1c2430",
};

/* PROVIDER NOW DECIDES WHICH SCREEN — and nothing else. Read this before
 * "fixing" it back to the old rule.
 *
 * Until 2026-09-10 provider was a label only, because one matchup screen showed
 * every league and the only thing that changed the SHAPE of a card was
 * league.format. Patrick then asked for the split explicitly ("do the two
 * sleeper leagues on one, espn on another, and the two guiltine on another
 * screen"), so which SCREEN a league lands on is now a provider/format
 * decision, made SERVER-SIDE by /fantasy-football/matchups/:group.
 *
 * What has not changed: inside a card, layout still branches on
 * league.format ('h2h' | 'guillotine') only. An ESPN h2h game and a Sleeper h2h
 * game render through the same Lineup component, and the only per-provider
 * differences are fields the backend normalises away (Sleeper has no `played`
 * and no bench, ESPN has no injury and no opponent). So: provider picks the
 * route, format picks the renderer, and neither one is allowed to fork the row
 * renderer. */
export const PROVIDER_LABEL = { sleeper: "Sleeper", espn: "ESPN" };

export const S = {
  shell: {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    /* Same safe-area string as src/components/engine/EnginePage.jsx:41 — these
     * pages are read on a phone first, and without the insets the tab strip
     * sits under the notch in landscape. `max()`/`calc()` make it a no-op on a
     * device with no insets. */
    padding:
      "max(16px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) calc(40px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
    WebkitTextSizeAdjust: "100%",
    /* App.jsx column-flexes every route, and a flex item's min-width:auto
     * refuses to shrink below min-content — the standings table would make
     * that ~600px and scroll the whole PAGE sideways on a phone. Pinning the
     * width makes it shrink; each table then scrolls inside its own
     * overflowX:auto wrapper. */
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  main: { maxWidth: 900, margin: "0 auto", width: "100%", minWidth: 0 },
  /* The three matchup screens only. S.main's maxWidth:900 is the single thing
   * standing between this page and "on desktop fill the screen width" — but
   * /fantasy standings is a 5-column table that reads correctly AT 900 and
   * would look stretched and thin at 1900, so this is a second style rather
   * than an edit to the first. Shell takes `wide` to pick between them. */
  mainWide: { maxWidth: "none", margin: "0 auto", width: "100%", minWidth: 0 },
  h1: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: -0.5,
    margin: 0,
  },
  headerRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  sub: { fontSize: 12.5, color: C.muted, marginTop: 4 },
  staleBanner: {
    fontSize: 12,
    color: C.amber,
    background: "rgba(234,179,8,0.08)",
    border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${C.amber}`,
    borderRadius: 8,
    padding: "7px 10px",
    margin: "10px 0 0",
  },
  tabs: {
    display: "flex",
    gap: 6,
    borderBottom: `1px solid ${C.border}`,
    marginTop: 12,
    marginBottom: 16,
    /* Four tabs measure ~263px, so they fit a 400px phone today. This is
     * insurance for the fifth: a wrapping tab strip would change the height of
     * the fixed chrome that the no-scroll row-height maths is derived from,
     * and every screen would silently start scrolling. Scroll the strip
     * instead. */
    overflowX: "auto",
    whiteSpace: "nowrap",
    WebkitOverflowScrolling: "touch",
  },
  tab: (active) => ({
    background: "transparent",
    border: "none",
    borderBottom: `2px solid ${active ? C.blue : "transparent"}`,
    color: active ? C.text : C.muted,
    padding: "10px 8px",
    marginBottom: -1,
    fontSize: 15,
    fontWeight: 700,
    textDecoration: "none",
    cursor: "pointer",
  }),
  card: {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  cardHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: 800, minWidth: 0 },
  chip: {
    background: C.chipBg,
    border: `1px solid ${C.border}`,
    color: C.muted,
    borderRadius: 999,
    padding: "2px 9px",
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  /* Amber left border = "this card is telling you something, not showing you
   * data": a per-league error, a pre-draft league, or an empty result. */
  statePanel: {
    background: C.panel2,
    border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${C.amber}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
    color: C.muted,
    lineHeight: 1.45,
  },
  tableWrap: { overflowX: "auto", WebkitOverflowScrolling: "touch" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    minWidth: 380,
  },
  th: {
    textAlign: "right",
    color: C.muted,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    padding: "6px 8px",
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: "nowrap",
  },
  thLeft: { textAlign: "left" },
  td: {
    textAlign: "right",
    padding: "8px",
    borderBottom: `1px solid ${C.panel2}`,
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
  tdLeft: { textAlign: "left", whiteSpace: "normal" },
  mineRow: { background: "rgba(59,130,246,0.10)" },
  deadRow: { opacity: 0.5 },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    flexShrink: 0,
    objectFit: "cover",
    background: C.chipBg,
  },
  gameCard: {
    background: C.panel2,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 8,
  },
  gameSide: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
    padding: "4px 0",
    minWidth: 0,
  },
  /* A card that is a GRID ITEM. S.card's 14px bottom margin is what separates
   * stacked cards on the standings screen; inside S.matchGrid the gap already
   * does that, and the leftover margin is 14px of the vertical budget the
   * matchup screens are trying not to spend. */
  cardFlush: { marginBottom: 0 },

  /* The outer grid on all three matchup screens. auto-fit + minmax means two
   * cards across above ~1134px and one below it — no media query, no resize
   * listener, and a phone gets a single column for free. min(560px,100%) is
   * what stops the 560px floor from forcing a horizontal scroll at 400px. */
  matchGrid: {
    display: "grid",
    gap: 14,
    alignItems: "start",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(560px,100%),1fr))",
    width: "100%",
    minWidth: 0,
  },

  /* ONE ROW PER STARTING SLOT, both lineups on it:
   *   my player | my live | my proj | SLOT | their proj | their live | their player
   * Stacking the two lineups instead would be 28 rows for a 14-slot dynasty
   * league and fits no desktop. It is also how Sleeper and ESPN both draw a
   * matchup, so it is the right shape rather than a concession.
   *
   * The height is `var(--fp-row)`, a viewport-derived clamp() that each screen
   * sets once on the grid container (see rowHeightVar). The fallback matters:
   * if a screen ever forgets to set it, rows are 34px and the page scrolls —
   * it must never collapse to 0. */
  lineupRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 44px 44px 54px 44px 44px minmax(0,1fr)",
    alignItems: "center",
    gap: 3,
    height: "var(--fp-row, 34px)",
    borderBottom: `1px solid ${C.panel2}`,
    fontSize: "clamp(11.5px, 1.45vh, 15px)",
  },
  /* Same seven columns, fixed 26px — it is part of the FIXED chrome the
   * row-height maths subtracts, so it must not inherit --fp-row. */
  lineupHead: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 44px 44px 54px 44px 44px minmax(0,1fr)",
    alignItems: "center",
    gap: 3,
    height: 26,
    borderBottom: `1px solid ${C.border}`,
    fontSize: 10,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  slotCell: {
    textAlign: "center",
    color: C.muted,
    fontSize: 9.5,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  /* Points and projections. tabular-nums so the two columns line up as scores
   * tick over during a game instead of jittering. */
  numCell: {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  playerCell: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  /* ESPN only, and dimmed: a bench row is context ("should I have started
   * him"), never the answer to "how am I doing". */
  benchRow: { opacity: 0.55 },
  refreshBtn: {
    background: C.chipBg,
    border: `1px solid ${C.border}`,
    color: C.muted,
    borderRadius: 8,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 700,
    minHeight: 32,
    cursor: "pointer",
  },
};

/* Points: always 2 dp, and an EM-DASH for null/undefined. Points-against is
 * null in every league until a week is scored (and never exists at all in a
 * guillotine league) — rendering that as 0.00 would read as "they were shut
 * out" rather than "nobody has played yet". 0 is a real score and prints. */
export function fmtPts(n) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toFixed(2);
}

/* A number to COMPARE with. null/undefined/NaN all become 0 so a "who is
 * winning" test can never be NaN — but note this is for comparisons only.
 * Never render score(); fmtPts is what distinguishes a real 0 from no data. */
export function score(n) {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/* Guillotine ordering: the living, by rank; then the eliminated, most recently
 * cut first. The server already ranks by points for — this only makes sure a
 * cut team never sits above a team still playing.
 *
 * Exported from HERE rather than living in a page, because /fantasy and
 * /fantasy/guillotine both render the same 18 teams and two copies of this
 * comparator is exactly how the two screens would come to disagree about who
 * is 1st. */
export function orderGuillotine(teams) {
  /* Non-objects are DROPPED, not sorted to the end. Both callers then read
   * t.alive / t.rank / t.teamId straight off every row, and with no
   * ErrorBoundary in this app one null in the array would blank the entire
   * site rather than one table. */
  return (Array.isArray(teams) ? teams : [])
    /* filter() already returns a new array, so sorting it in place does not
     * mutate the caller's payload — that is why there is no slice() here. */
    .filter((t) => t && typeof t === "object")
    .sort((a, b) => {
      const aliveA = a.alive !== false;
      const aliveB = b.alive !== false;
      if (aliveA !== aliveB) return aliveA ? -1 : 1;
      if (!aliveA) return (b.eliminatedWeek || 0) - (a.eliminatedWeek || 0);
      return (a.rank || 0) - (b.rank || 0);
    });
}

/* How many starting slots the taller side of a matchup has, and the same for
 * the bench. Lives here, not in Lineup.jsx, because a screen needs the count
 * BEFORE it renders anything (it feeds rowHeightVar) and because a non-
 * component export from a file full of components is a
 * react-refresh/only-export-components error.
 *
 * NEVER replace a call to these with a constant. BIGGER dynasty starts 14,
 * OG Dirtbag 12, the guillotines 8 and ESPN 9 — hardcoding any of them makes
 * the row height wrong for three of the four. */
export function slotCount(game) {
  if (!game) return 0;
  const of = (side) => {
    const s = side && side.lineup && side.lineup.slots;
    return Array.isArray(s) ? s.length : 0;
  };
  return Math.max(of(game.home), of(game.away));
}

export function benchCount(game) {
  if (!game) return 0;
  const of = (side) => {
    const b = side && side.lineup && side.lineup.bench;
    return Array.isArray(b) ? b.length : 0;
  };
  return Math.max(of(game.home), of(game.away));
}

/* THE NO-SCROLL KNOB, and the only piece of layout that knows about the
 * viewport. Returns an inline style holding one CSS custom property, which
 * every lineup/race row then reads as its height.
 *
 * Why a custom property and not a computed number: React sets custom
 * properties on inline styles natively, so one value on the grid container
 * reaches every descendant row with no CSS file, no media query and no resize
 * listener — the height re-resolves on rotate and on a window drag by itself.
 *
 * clamp(26px, …, 44px) is the whole trick. `fixed` is the page chrome that is
 * NOT rows (header + tab strip + card chrome + column header + padding),
 * measured from the real style objects on each screen; `rows` is taken from
 * the DATA, never hardcoded — a 14-slot dynasty league and a 9-slot ESPN
 * league need different heights and the taller card has to govern.
 *
 * The 44px cap stops a 1440p screen from rendering absurd 90px rows just
 * because it can; the 26px floor is what keeps a small laptop READABLE rather
 * than fitting. Below ~700px of viewport height the floor wins and the page
 * scrolls a little — that is the deliberate trade (a fixed-height grid too big
 * to shrink clips instead of scrolling, which is worse; see the /drive rule in
 * CLAUDE.md). */
export function rowHeightVar(fixed, rows) {
  const n = Math.max(1, Math.floor(Number(rows) || 0) || 1);
  const px = Math.max(0, Number(fixed) || 0);
  return { "--fp-row": `clamp(26px, calc((100vh - ${px}px) / ${n}), 44px)` };
}

export function fmtRecord(w, l, t) {
  const win = Number(w) || 0;
  const loss = Number(l) || 0;
  const tie = Number(t) || 0;
  return tie > 0 ? `${win}-${loss}-${tie}` : `${win}-${loss}`;
}

/* as_of is an ISO string from the server. Local short time is all that is
 * useful on a phone; a bad/missing value degrades to the raw string rather
 * than to "Invalid Date". */
export function fmtAsOf(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
