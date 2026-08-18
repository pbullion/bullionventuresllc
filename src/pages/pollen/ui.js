/* Labels, colours and formatters for /pollen.
 *
 * The backend owns the numbers (routes/pollen.js, services/pollenModel.js); this
 * file owns only what they are called and how they look. Same split as
 * src/pages/prospects/ui.js.
 */

/* Level colours for the 0-5 None..Very High scale.
 *
 * Deliberately NOT a green-to-red ramp alone: a level is the single most
 * important thing on the page and roughly one man in twelve cannot separate the
 * middle of a red/green ramp. This runs green -> yellow -> amber -> deep orange
 * -> magenta, so the steps differ in lightness and in hue, and every level also
 * carries its own word ("High") next to it. Each fg is measured at 4.5:1 or
 * better against its own bg. */
export const LEVEL_COLOR = [
  { bg: "#12291d", fg: "#86efac", bar: "#22c55e" }, // 0 None
  { bg: "#132a20", fg: "#86efac", bar: "#4ade80" }, // 1 Very low
  { bg: "#1d2a16", fg: "#bef264", bar: "#a3e635" }, // 2 Low
  { bg: "#2b2410", fg: "#fde047", bar: "#facc15" }, // 3 Moderate
  { bg: "#33200f", fg: "#fdba74", bar: "#fb923c" }, // 4 High
  { bg: "#331226", fg: "#f9a8d4", bar: "#ec4899" }, // 5 Very high
];

export const levelColor = (level) =>
  LEVEL_COLOR[Math.max(0, Math.min(5, Math.round(level || 0)))];

/* The verdict is the page's headline answer, so its colours say what KIND of bad
 * a day is rather than how bad — pollen days and virus days are different
 * problems with different responses. */
export const VERDICT_STYLE = {
  allergy: { bg: "#331226", fg: "#f9a8d4", icon: "🌾", tone: "It's the pollen" },
  allergy_mild: { bg: "#2b2410", fg: "#fde047", icon: "🌾", tone: "Leaning pollen" },
  bug: { bg: "#0f2537", fg: "#7dd3fc", icon: "🦠", tone: "Bug weather" },
  bug_mild: { bg: "#132430", fg: "#93c5fd", icon: "🦠", tone: "Leaning viral" },
  both: { bg: "#331a12", fg: "#fca5a5", icon: "⚠️", tone: "Both at once" },
  unclear: { bg: "#232838", fg: "#c7d2fe", icon: "🤷", tone: "Could be either" },
  quiet: { bg: "#12291d", fg: "#86efac", icon: "✓", tone: "Clear" },
};
export const verdictStyle = (key) => VERDICT_STYLE[key] || VERDICT_STYLE.quiet;

export const GROUP_LABEL = {
  tree: "Trees",
  grass: "Grass",
  weed: "Weeds",
  mold: "Mold",
};
export const GROUP_EMOJI = { tree: "🌳", grass: "🌱", weed: "🌾", mold: "🍄" };

/* How the user describes a day, and the severity the backend stores. Four steps,
 * because a scale with more than that invites deliberation over a question that
 * has to be answered in one tap or it won't be answered at all. */
export const SEVERITY = [
  { value: 0, label: "Fine", emoji: "😀", color: "#4ade80" },
  { value: 1, label: "Sniffly", emoji: "😐", color: "#facc15" },
  { value: 2, label: "Rough", emoji: "😖", color: "#fb923c" },
  { value: 3, label: "Sick", emoji: "🤒", color: "#f87171" },
];

export const SYMPTOM_TAGS = [
  "sneezing",
  "itchy eyes",
  "stuffy nose",
  "runny nose",
  "scratchy throat",
  "sore throat",
  "cough",
  "headache",
  "sinus pressure",
  "fatigue",
  "fever",
  "body aches",
];

/* Symptoms that point one way or the other. Not a diagnosis — a fever and body
 * aches are not what pollen does, and itchy eyes are not what a cold does, and
 * saying so is more useful than a number. Anything not listed is genuinely
 * ambiguous and is left out on purpose. */
export const SYMPTOM_LEAN = {
  "itchy eyes": "allergy",
  sneezing: "allergy",
  "runny nose": "allergy",
  fever: "bug",
  "body aches": "bug",
  "sore throat": "bug",
};

// ── Dates ───────────────────────────────────────────────────────────────────
/* "YYYY-MM-DD" is parsed by hand rather than handed to new Date(), which reads a
 * bare date as UTC midnight and then renders the day before in US Central. The
 * same trap the backend's db/index.js documents for DATE columns. */
export function parseDay(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function dayLabel(iso, todayIso) {
  const d = parseDay(iso);
  if (!d) return iso;
  if (iso === todayIso) return "Today";
  const today = parseDay(todayIso);
  if (today) {
    const diff = Math.round((d - today) / 86400000);
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
  }
  return d.toLocaleDateString([], { weekday: "short" });
}

export const dayFull = (iso) => {
  const d = parseDay(iso);
  return d ? d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }) : iso;
};

export const hourLabel = (h) => {
  if (h == null) return "";
  const hr = ((h % 24) + 24) % 24;
  if (hr === 0) return "12a";
  if (hr === 12) return "12p";
  return hr < 12 ? `${hr}a` : `${hr - 12}p`;
};

export const hourRange = (from, to) => `${hourLabel(from)}–${hourLabel(to)}`;

// ── Numbers ─────────────────────────────────────────────────────────────────
export const fmtCount = (n) =>
  n == null ? "—" : n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n));

/* The NAB count band a level corresponds to, in words. Always prefixed with what
 * it IS — a reference range at a counting station, not a measurement this page
 * made — unless the level really did come from a feed that counts. */
export function bandText(band, measured) {
  if (!band || band.label === "none") return null;
  const range =
    band.high == null ? `${fmtCount(band.low)}+` : `${fmtCount(band.low)}–${fmtCount(band.high)}`;
  return measured ? `${range} grains/m³` : `≈ ${range} grains/m³ at a counting station`;
}

/* US AQI category, for the measured air-quality figures. These are the EPA's own
 * breakpoints, so unlike the pollen levels they need no hedging. */
export function aqiCategory(aqi) {
  if (aqi == null) return null;
  if (aqi <= 50) return { label: "Good", fg: "#86efac" };
  if (aqi <= 100) return { label: "Moderate", fg: "#fde047" };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", fg: "#fdba74" };
  if (aqi <= 200) return { label: "Unhealthy", fg: "#fca5a5" };
  if (aqi <= 300) return { label: "Very unhealthy", fg: "#f9a8d4" };
  return { label: "Hazardous", fg: "#f9a8d4" };
}

// ── Palette ─────────────────────────────────────────────────────────────────
// Matches the other full-screen tools here (/gulf-hurricane, /my-bets).
export const C = {
  bg: "#0b0f19",
  panel: "#0d1526",
  panel2: "#111827",
  line: "#1e2a44",
  line2: "#2a3b5e",
  text: "#eef2ff",
  dim: "#8892b0",
  dimmer: "#606a85",
  faint: "#5b6785",
  accent: "#7aa2ff",
};
