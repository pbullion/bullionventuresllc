/* Shared palette, style map and formatters for the two Fantasy Leagues screens
 * (/fantasy standings and /fantasy/matchups).
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

/* Provider is a LABEL only. Every layout decision on both screens branches on
 * league.format ('h2h' | 'guillotine'), never on provider — an ESPN h2h league
 * and a Sleeper h2h league render through exactly the same code. */
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
