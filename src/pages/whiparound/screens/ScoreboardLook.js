/* The stadium board's own look — the constants and helpers from the top of
 * whiparound-firetv's ui/Scoreboard.kt, kept out of Scoreboard.jsx because a
 * .jsx file here may export only components.
 */

import { LINE, T } from "../theme";

/// The board's own surfaces, darker than the app's. A scoreboard reads as a
/// separate object hanging on the wall, not as another panel in the dashboard.
export const DECK = "#05070B";
export const GRID = "#1E2632";

/// The numerals. Amber on near-black is what a stadium board is, and the
/// highest-contrast pair on this palette at the distance these are read from.
/// Deliberately NOT the heat ramp — nothing here is ranked.
export const LAMP = T.amber;
export const LAMP_DIM = "#6B5A16";

/* MONOSPACED NUMERALS. A proportional font puts "11" and "1" at different
 * widths, so an inning column stops being a column and the eye has to read
 * every cell instead of scanning down one.
 *
 * Compose's FontFamily.Monospace is Droid Sans Mono on the stick; Noto Sans Mono
 * is its direct descendant (same 0.6em advance), so the cells measure the same.
 * Line height stays Roboto's via the stage, which is what the Kotlin boxes got.
 *
 * ONE GLYPH DIFFERS: Noto's zero is SLASHED and Droid's is plain. Measured
 * 2026-09-13 — no OpenType feature (zero, ss01/02, cv01/02, salt) un-slashes it,
 * Droid Sans Mono itself is not served by Google Fonts or any npm webfont
 * package, and every other Google mono is dotted or a different design. Do not
 * spend another afternoon on it. */
export const MONO = '"Noto Sans Mono", "Droid Sans Mono", "Roboto Mono", Menlo, Consolas, monospace';

// The face itself (900 only — nothing lighter uses it) is loaded by index.jsx
// beside Roboto, so it is in the document before the first stadium board comes
// round and leaves the shared <head> with the page.

/* A Compose Text with maxLines = N and the default Clip overflow — NOT Ellipsis.
 * It wraps at the width it was given and draws only the first N lines, so a
 * too-narrow "Q4 5:38" shows "Q4" rather than "Q4 5…". */
export function clipLines(size, lines = 1) {
  return { maxHeight: size * LINE * lines, overflow: "hidden", overflowWrap: "anywhere" };
}

/* The team's colour, if it can actually be seen.
 *
 * Half the teams in these leagues are navy or black, and Houston is #002D62 — a
 * rail in that colour on the #05070B deck is invisible, which reads as a rail
 * that failed to render. Below a Rec. 601 luma of 60 it falls back to the accent. */
export function railColor(hex) {
  const raw = hex?.replace(/^#/, "");
  if (!raw || !/^[0-9a-fA-F]{6}$/.test(raw)) return T.accent;
  const v = parseInt(raw, 16);
  const luma = Math.trunc((((v >> 16) & 255) * 299 + ((v >> 8) & 255) * 587 + (v & 255) * 114) / 1000);
  return luma < 60 ? T.accent : `#${raw}`;
}

/* Deck geometry. Weights rather than widths so that nine innings and thirteen
 * both fill the board and a 12-inning game cannot spill off the edge.
 *
 * WEIGHTS ARE RATIOS, NOT FRACTIONS: a 0.30 team block beside twelve cells of 1
 * is 0.30 parts of 12.75 — 2% of the row. The share is converted against however
 * many columns the sport actually has. */
export const TEAM_SHARE = 0.3;
export const CELL_WEIGHT = 1;
export const TOTAL_WEIGHT = 1.35;

export function teamWeight(board) {
  const cells = board.columns.length * CELL_WEIGHT + board.totals.length * TOTAL_WEIGHT;
  // A board with no columns at all would otherwise give the team block no width.
  if (cells <= 0) return 1;
  return (cells * TEAM_SHARE) / (1 - TEAM_SHARE);
}

/* Row heights that divide the space they were given: floor, ceiling, spacing.
 *
 * BIG PLAYS: two lines of 30pt text and its padding is the floor — a floor of one
 * line fit four plays and cut every one of them in half, and four truncated
 * plays are worth less than three whole ones. Beyond ~130 a play is a poster. */
export const PLAY_ROW_MIN = 100;
export const PLAY_ROW_MAX = 130;
export const PLAY_SPACING = 7;
/// THE MATCHUP (pregame): five categories at a fixed height left it half empty.
export const MATCHUP_ROW_MIN = 70;
export const MATCHUP_ROW_MAX = 118;
export const MATCHUP_SPACING = 6;

/// The even share of `height` for `n` rows, clamped — Kotlin's
/// `((maxHeight - spacing * (n - 1)) / n).coerceIn(min, max)`.
export function evenRow(height, n, spacing, min, max) {
  const even = (height - spacing * (n - 1)) / n;
  return Math.min(max, Math.max(min, even));
}
