/* The weather screen's colour rules and bar geometry, ported from the bottom of
 * whiparound-firetv's ui/Weather.kt. A .js file because a .jsx may export only
 * components.
 */

import { T } from "../theme";

/// The hourly band's profile, in stage px. Shorter than it was: the type above
/// it grew and the bar is the element that can give height back without losing
/// a number.
export const BAR_FLOOR = 8;
export const BAR_RANGE = 38;

/// Rain is only worth colouring once it is worth planning around. The backend's
/// own SMS path draws its line at 29% for the same reason, so the two agree
/// about what counts as a wet hour. (accent and cool are the same hex today;
/// kept as two tokens because the Kotlin names two.)
export function rainColor(chance) {
  if (chance == null) return T.muted;
  if (chance >= 60) return T.accent;
  if (chance >= 29) return T.cool;
  return T.muted;
}

/// The National Weather Service bands: 8+ very high, 6+ high. UV is the one
/// number on the TODAY card that is advice rather than description.
export function uvColor(uv) {
  if (uv == null) return T.muted;
  if (uv >= 8) return T.hot;
  if (uv >= 6) return T.warm;
  return T.text;
}

/* Compose's `lerp(Color, Color, Float)` interpolates in OKLAB, not sRGB — a
 * straight RGB mix of cool blue and hot orange goes through a muddy grey in the
 * middle of the afternoon, and Compose's does not. Fraction clamped as there. */
function toLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function toByte(c) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

function hexToOklab(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = toLinear((n >> 16) & 255);
  const g = toLinear((n >> 8) & 255);
  const b = toLinear(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToCss([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const r = toByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = toByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const b = toByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return `rgb(${r}, ${g}, ${b})`;
}

export function lerpColor(startHex, stopHex, fraction) {
  const t = Math.min(1, Math.max(0, fraction));
  const a = hexToOklab(startHex);
  const b = hexToOklab(stopHex);
  return oklabToCss(a.map((v, i) => v + (b[i] - v) * t));
}
