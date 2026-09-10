/* Constants + formatters for the Fantasy Watch tabs (/fantasy/lineup and
 * /fantasy/waivers). Component-free — react-refresh/only-export-components
 * fails a file that exports both, same reason theme.js and ui.jsx are split.
 *
 * POS_COLOR is copied from src/pages/ffdraft/index.jsx:39-46 (the repo's only
 * other position-colour renderer) rather than imported — ffdraft exports
 * nothing. If a third page ever wants it, THAT is the time to lift it out.
 */

export const WATCH_BASE = "https://sheline-art-website-api.herokuapp.com/fantasy-watch";

export const POS_COLOR = { QB: "#ef6aa4", RB: "#22c55e", WR: "#3b82f6", TE: "#eab308", DST: "#a78bfa", DEF: "#a78bfa", K: "#8a93a6" };

/* Status dots on the Lineup tab. Anything not explicitly listed (a future
 * status string neither platform documents today) falls back to grey/UNKNOWN
 * rather than silently disappearing or throwing. */
export const STATUS_COLOR = {
  ACTIVE: "#22c55e",
  Q: "#eab308",
  D: "#f97316",
  OUT: "#ef4444",
  IR: "#ef4444",
  PUP: "#ef4444",
  SUS: "#ef4444",
  NA: "#ef4444",
  COV: "#ef4444",
  DNR: "#ef4444",
  BYE: "#ef4444",
  UNKNOWN: "#8a93a6",
};

export const STATUS_LABEL = {
  ACTIVE: "Active",
  Q: "Questionable",
  D: "Doubtful",
  OUT: "Out",
  IR: "IR",
  PUP: "PUP",
  SUS: "Suspended",
  NA: "NA",
  COV: "COVID",
  DNR: "DNR",
  BYE: "Bye",
  UNKNOWN: "Unknown",
};

/* Severity -> the accent colour + label the action strip and league cards use.
 * "info" is a locked flag (the game has already kicked) — same hue as low,
 * dimmer treatment is a CSS concern in the component, not a colour swap. */
export const SEVERITY_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#8a93a6", info: "#8a93a6" };

export const KIND_LABEL = {
  EMPTY_SLOT: "Empty slot",
  STARTER_OUT: "Ruled out",
  STARTER_BYE: "On bye",
  STARTER_DOUBTFUL: "Doubtful",
  Q_NEAR_KICK: "Questionable — kicks soon",
  LINEUP_UPGRADE: "Bench upgrade",
  SOURCE_DOWN: "Feed down",
};

const BID_LABEL_COLOR = { "must-have": "#ef4444", strong: "#f97316", solid: "#eab308", flyer: "#8a93a6", "free look": "#8a93a6" };
export function bidLabelColor(label) {
  return BID_LABEL_COLOR[label] || "#8a93a6";
}

/* Central time, short — same idiom as /engine-limits and /morning-review. */
export function fmtKickoff(epochMs) {
  if (!epochMs) return null;
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", hour: "numeric", minute: "2-digit" }) + " CT";
}

/* $0 is a real recommendation ("claim him for free"), not "no bid" — rendered
 * plainly rather than as a confusing "$0-$0" range. */
export function fmtBid(bid) {
  if (!bid) return null;
  if (bid.low === 0 && bid.high === 0) return "$0 · free claim";
  if (bid.low === bid.high) return `$${bid.low}`;
  return `$${bid.low}–${bid.high}`;
}

export function fmtPct(n) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
  return `${Math.round(Number(n))}%`;
}

/* Points/projections: 1 decimal, em-dash for anything not a finite number —
 * a null/undefined projection is a real "we don't know", never a false 0.0. */
export function fmtProj(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(1);
}
