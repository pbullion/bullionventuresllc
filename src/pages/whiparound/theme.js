/* The Whip-Around palette and type rules, ported from whiparound-firetv's
 * Theme.kt. Same hexes on purpose — this page and the Fire TV sticks hang on
 * the same wall, and two boards that disagree about what a panel looks like
 * read as two unrelated products.
 *
 * THE UNITS ARE THE FIRE TV'S tvOS POINTS, 1:1. The page lays out a fixed
 * 1920x1080 stage and scales the whole stage to the monitor (see index.jsx), so
 * `34.pt` / `34.ptSp` in the Kotlin is `34` here and every measured width in
 * that repo's comments still holds. A RAW `1.dp` in the Kotlin (no `.pt`) is
 * TWO stage px — the stick renders at density 2.
 *
 * 34 IS THE FLOOR for anything a glance depends on: the board is read from
 * about ten feet on a ~27" monitor. Read "What the type is sized for" in
 * whiparound-firetv/CLAUDE.md before shrinking anything.
 */

export const STAGE_W = 1920;
export const STAGE_H = 1080;

export const T = {
  bg: "#0B0E14",
  panel: "#151A24",
  border: "#252C3A",
  text: "#E8EAED",
  muted: "#8A93A6",
  accent: "#1A93CF",
  amber: "#EAB308",
  chipBg: "#1C2430",
  // One step off `panel`: behind every other standings row.
  rowBand: "#192030",
  // The excitement ramp — cool to hot, NOT good to bad.
  hot: "#FF5C33",
  warm: "#F59E0B",
  cool: "#1A93CF",
  // Good-vs-bad, which the heat ramp deliberately is not.
  up: "#15A06A",
  down: "#E0574A",
};

/* Roboto, because every width the Kotlin comments measured ("UAPB at TNST"
 * ~310pt, a score at 220pt) was measured in it. index.jsx loads the weights
 * the board uses; the site's own link only carries 300-500. */
export const FONT = '"Roboto", system-ui, -apple-system, "Segoe UI", sans-serif';

/* Roboto's natural line height, which is what a Compose Text with no explicit
 * lineHeight gets — the Fire TV notes quote it ("a chip at 34pt is 51.8pt
 * tall: 34 × 1.171 + 6pt of padding twice"). */
export const LINE = 1.171875;

/// Compose FontWeight names, so a port reads like its source.
export const W = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

/* A Compose `.border(1.dp, …)` is drawn INSIDE the bounds and takes no layout
 * space; a CSS border takes both. An inset shadow draws the same line without
 * moving the content by two pixels a side. */
export function edge(color = T.border, width = 2) {
  return { boxShadow: `inset 0 0 0 ${width}px ${color}` };
}

/// `Color.copy(alpha = a)`.
export function alpha(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/// "W3" green, "L3" red, anything unparseable muted rather than guessed.
export function streakColor(s) {
  if (!s) return T.muted;
  const c = s[0].toUpperCase();
  if (c === "W") return T.up;
  if (c === "L") return T.down;
  return T.muted;
}

export function heat(score) {
  if (score == null) return T.muted;
  if (score >= 78) return T.hot;
  if (score >= 55) return T.warm;
  if (score >= 30) return T.cool;
  return T.muted;
}

/// Leader bright, trailer dimmed, a tie both bright.
export function side(isLeader, tied) {
  return tied || isLeader ? T.text : T.muted;
}
