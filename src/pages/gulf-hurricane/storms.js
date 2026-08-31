/* Shared vocabulary for the Gulf tracker: intensity scales, colours and the
 * phrasings used to describe a system's position relative to Houston.
 *
 * The map and the cards both read from here so a system is the same colour in
 * both. A storm that is amber on the map and orange on its card reads as two
 * different systems.
 */

export const HOUSTON = { lat: 29.7604, lon: -95.3698 };

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export const compass = (deg) =>
  typeof deg === "number" && Number.isFinite(deg) ?
    COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]
  : null;

export const ktToMph = (kt) => (typeof kt === "number" ? Math.round(kt * 1.15078) : null);

// Saffir-Simpson category from sustained wind in mph (hurricanes only).
export function category(mph) {
  if (mph == null) return null;
  if (mph >= 157) return 5;
  if (mph >= 130) return 4;
  if (mph >= 111) return 3;
  if (mph >= 96) return 2;
  if (mph >= 74) return 1;
  return null;
}

export const CLASS_LABEL = {
  TD: "Tropical Depression",
  TS: "Tropical Storm",
  HU: "Hurricane",
  STD: "Subtropical Depression",
  STS: "Subtropical Storm",
  PTC: "Potential Tropical Cyclone",
  RM: "Remnants",
};

export function classColor(c, mph) {
  if (c === "HU") {
    const cat = category(mph);
    if (cat >= 4) return "#ef4444"; // red
    if (cat === 3) return "#f97316"; // orange
    return "#f59e0b"; // amber
  }
  if (c === "TS" || c === "STS") return "#38bdf8"; // blue
  if (c === "PTC") return "#a78bfa"; // purple
  return "#94a3b8"; // gray
}

/* NHC's own three-band colouring for formation chance on the tropical weather
 * outlook — yellow / orange / red at 40% and 60%. Matching it means the shaded
 * blobs on this map mean the same thing as the ones on hurricanes.gov, which is
 * worth more than a prettier ramp. */
export function chanceColor(pct) {
  if (pct == null) return "#94a3b8";
  if (pct >= 60) return "#ef4444";
  if (pct >= 40) return "#f97316";
  return "#eab308";
}

export function chanceLabel(pct) {
  if (pct == null) return "unknown";
  if (pct >= 60) return "high";
  if (pct >= 40) return "medium";
  return "low";
}

/* A storm's one-line name for the map and the headline. */
export function stormTitle(storm) {
  const mph = ktToMph(storm.intensityKt);
  const cat = storm.classification === "HU" ? category(mph) : null;
  if (cat) return `Cat ${cat} ${storm.name}`;
  const label = CLASS_LABEL[storm.classification] || storm.classification || "System";
  return `${label} ${storm.name}`;
}

export function disturbanceTitle(area) {
  if (area.invest) return `Invest ${area.invest}`;
  return area.name || "Disturbance";
}

/* Miles, with a thousands separator and no false precision. */
export function miles(n) {
  if (n == null) return null;
  return `${Math.round(n).toLocaleString()} mi`;
}

/* Forecast hours as something a person says out loud. NHC publishes on a 12- to
 * 24-hour cadence and the closest-approach hour is interpolated between those,
 * so it is rounded here — "in about 2 days" is the truthful resolution, and
 * "in 51 hours" implies an accuracy the forecast does not have. */
export function inHours(hour) {
  if (hour == null) return null;
  if (hour <= 1) return "now";
  if (hour < 24) return `in about ${Math.round(hour)} hr`;
  const days = hour / 24;
  if (days < 1.5) return "in about a day";
  return `in about ${Math.round(days)} days`;
}

/* How a system relates to Houston, as a sentence fragment. Returns null when
 * the feed had no position for it — the caller then says nothing rather than
 * printing "null mi". */
export function houstonPhrase(rel, { edge = false } = {}) {
  if (!rel) return null;
  const d = edge && rel.edgeMi != null ? rel.edgeMi : rel.distanceMi;
  if (d == null) return null;
  return `${miles(d)}${rel.compass ? ` ${rel.compass}` : ""} of Houston`;
}

/* Rank everything on the page by how much a Houston reader should care.
 *
 * Distance alone is wrong — a depression 200 miles away matters less than a
 * major hurricane forecast to pass 100 miles offshore in two days — so an
 * active storm's score uses its FORECAST closest approach when it has one, and
 * a disturbance is discounted by how unlikely it is to become anything. */
export function houstonScore(item) {
  const rel = item.houston;
  if (!rel) return Infinity;
  if (item.kind === "disturbance") {
    const near = rel.edgeMi ?? rel.distanceMi ?? Infinity;
    const chance = item.chance7 ?? item.chance2 ?? 0;
    // A 100%-chance area scores its true distance; a 20% one is pushed back as
    // though it were five times further away.
    return near / Math.max(0.2, chance / 100);
  }
  const closest = rel.closest?.distanceMi;
  return Math.min(rel.distanceMi ?? Infinity, closest ?? Infinity);
}
