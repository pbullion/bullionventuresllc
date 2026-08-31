/* The betting screens' shared surface.
 *
 * /my-bets, /totals-value, /crypto-value, /weather-value and /gas-value are one
 * set of five pages that a reader moves between all day, so they have to look
 * like one product. Until 2026-08-31 each of them declared its own copy of this
 * palette and its own money/cents/percent formatters, and the copies had
 * drifted: three of the five were missing `redBorder`, two were missing
 * `rowAlt`, and the sibling nav on three pages had never been told /gas-value
 * exists. This module is the single copy. Import from here; don't re-declare.
 *
 * The values themselves are unchanged — this is the union of what the five
 * files already had, with my-bets' page-specific extras (leg fills, the settled
 * -card darks) kept alongside because they belong to the same ramp and a second
 * palette next to this one would just start the drift over.
 */

export const C = {
  bg: "#0b0e14", // page
  panel: "#151a24", // card / panel surface
  card: "#151a24", // alias my-bets uses for the same value
  border: "#252c3a", // neutral borders
  text: "#e8eaed",
  muted: "#8a93a6",

  green: "#22c55e",
  greenSoft: "#123021", // green-tinted fill
  greenBorder: "#2f7d55", // darker green border
  /* A quieter green for the secondary money figures (profit). The bright
   * C.green is already carrying the chance % on the same row, and two of it
   * side by side compete; this is the dim end of the chanceColor ramp, so it
   * still reads as the same family. 4.7:1 on C.panel. */
  greenDim: "#479463",

  red: "#ef4444",
  redSoft: "#301416", // red-tinted fill
  redBorder: "#8a3a3d", // darker red border

  amber: "#eab308", // paper mode; a live tied game
  amberSoft: "#2a2410", // amber-tinted fill
  amberBorder: "#8a7420", // darker amber border
  /* The PAPER pill's fill. Distinct from amberSoft on purpose — it was
   * hardcoded as "#332a12" on all three pages that had a pill, and matching
   * amberSoft instead would quietly restyle every one of them. */
  paperSoft: "#332a12",

  accent: "#22c55e",
  chipBg: "#1c2430",
  rowAlt: "#1a2029", // zebra stripe

  // my-bets parlay legs. Same ramp, page-specific roles.
  legNeutral: "#1a2029", // undecided leg interior
  legNeutralBorder: "#303845",
  legFinishedGreen: "#0d1f16",
  legFinishedRed: "#210f11",
  legFinishedNeutral: "#12161e",
};

/* ─── Formatters ───────────────────────────────────────────────────────────
 * One dialect across the five pages: money is "$1.23"/"-$1.23", prices and
 * edges are whole cents, probabilities are whole percents. EngineTuning's
 * fmtValue already speaks it for the knobs; these are the page-side twins.
 */

/* "-$4.20", not "$-4.20" — a minus wedged after the sign is easy to misread at
 * 11px, and reading a loss as a gain inverts the meaning of the line. */
export const money = (v) =>
  v == null
    ? "—"
    : `${Number(v) < 0 ? "-" : ""}$${Math.abs(Number(v)).toFixed(2)}`;

/* Grouped, currency-formatted money for the big header figures on /my-bets. */
export const usd = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(Number(n)) ? Number(n) : 0,
  );

export const cents = (v) =>
  v == null ? "—" : `${Math.round(Number(v) * 100)}¢`;

export const pct = (p) => (p == null ? "—" : `${Math.round(Number(p) * 100)}%`);

/* Signed edge in cents: "+7¢" / "-3¢". */
export const edgeCents = (e) => {
  if (e == null) return "—";
  const v = Math.round(Number(e) * 100);
  return `${v >= 0 ? "+" : ""}${v}¢`;
};

/* Compact wall clock in the viewer's own zone: "5:04p". */
export const clockTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, "0")}${h < 12 ? "a" : "p"}`;
};

/* ─── Style tokens ─────────────────────────────────────────────────────── */

export const chip = (bg, color) => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  background: bg,
  color,
});

export const panelStyle = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 14,
  marginBottom: 14,
};

export const h2Style = {
  margin: "0 0 10px",
  fontSize: 15,
  fontWeight: 700,
  color: C.text,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export const th = {
  textAlign: "left",
  padding: "4px 8px",
  fontSize: 11,
  color: C.muted,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

export const td = {
  padding: "5px 8px",
  fontSize: 12.5,
  color: C.text,
  whiteSpace: "nowrap",
};

/* The cross-page nav chip. Every betting screen wears the same one; the list of
 * pages it renders lives in ./pages.js. */
export const navLink = {
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
