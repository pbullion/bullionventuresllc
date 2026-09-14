import { C, panelStyle } from "../../components/engine/theme.js";

/* What BestTicket.jsx and Record.jsx share: one way to call the Best N
 * endpoints, and one Central-time dialect.
 *
 * index.jsx keeps its own API_BASE and fetch code on purpose — the favorites
 * list and Create Bet predate Best N and are left byte-for-byte alone.
 */

export const API_BASE =
  "https://sheline-art-website-api.herokuapp.com/kalshi/quick-bets";

export const card = { ...panelStyle, borderRadius: 14, padding: 16 };

export const chipBtnStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: C.text,
  background: C.chipBg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
};

/* One request, classified so every caller can tell the four outcomes apart:
 *
 *   { kind: "ok", status, body }            HTTP 2xx and body.ok
 *   { kind: "not-deployed" }                a 404 that isn't one of OUR JSON
 *                                           answers — Express's HTML "Cannot
 *                                           POST", i.e. a backend without
 *                                           the route yet
 *   { kind: "error", status, body, message } anything else the server said
 *   { kind: "network", message }            no answer at all (offline, abort)
 *
 * A 404 that carries `{ok:false, ...}` is a deployed route saying "not found"
 * and stays an error. A body that isn't JSON (a Heroku H12 page) comes back as
 * an error with `body: null`, which Buy treats as "may have gone through". */
export async function callApi(path, { body, timeoutMs = 35000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const init =
    body === undefined
      ? { signal: ctrl.signal }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        };
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch (e) {
    clearTimeout(timer);
    return {
      kind: "network",
      message: e && e.name === "AbortError" ? "timed out" : String(e && e.message),
    };
  }
  // A body that isn't JSON (an HTML 404, a Heroku error page) reads as null.
  const json = await res.json().catch(() => null);
  clearTimeout(timer);
  const isObj = json != null && typeof json === "object" && !Array.isArray(json);
  if (res.status === 404 && !(isObj && "ok" in json)) {
    return { kind: "not-deployed" };
  }
  if (res.ok && isObj && json.ok) {
    return { kind: "ok", status: res.status, body: json };
  }
  return {
    kind: "error",
    status: res.status,
    body: isObj ? json : null,
    message:
      isObj && json.error
        ? String(json.error)
        : `The server answered HTTP ${res.status}.`,
  };
}

/* ─── Central time ─────────────────────────────────────────────────────────
 * Every time on these cards is Central, labelled, whatever zone the phone is
 * in — the slate itself is defined in America/Chicago. */
const CT = "America/Chicago";
const startFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: CT,
});
const stampFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: CT,
});
const clockFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: CT,
});
// A slate date is a calendar day, not an instant: formatted in UTC from its
// own parts, or "2026-09-14" would read as Sunday 9/13 in Central.
const dayFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

const validDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "Mon 6:40 PM" — a game's start, in a column already headed CT. */
export const ctStart = (iso) => {
  const d = validDate(iso);
  return d ? startFmt.format(d) : "—";
};

/** "Mon, 9/14, 10:42 AM CT" */
export const ctStamp = (iso) => {
  const d = validDate(iso);
  return d ? `${stampFmt.format(d)} CT` : "—";
};

/** "10:42 AM CT" */
export const ctClock = (iso) => {
  const d = validDate(iso);
  return d ? `${clockFmt.format(d)} CT` : "—";
};

/** "2026-09-14" → "Mon, 9/14" */
export const slateDay = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ""));
  if (!m) return ymd ? String(ymd) : "—";
  return dayFmt.format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
};

/** 29.4 → "29.4%" — the API's percentages are 0–100 with one decimal. */
export const pct1 = (v) =>
  v == null || !Number.isFinite(Number(v)) ? "—" : `${Number(v).toFixed(1)}%`;

/** A combo price is often a fraction of a cent. */
export const comboCents = (v) => {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const c = Number(v) * 100;
  return `${c < 10 ? c.toFixed(2) : c.toFixed(1)}¢`;
};

/* How a graded leg or ticket is drawn everywhere on the page. */
export const RESULT_META = {
  won: { mark: "✓", label: "won", color: C.green, bg: C.greenSoft },
  lost: { mark: "✗", label: "lost", color: C.red, bg: C.redSoft },
  push: { mark: "push", label: "push", color: C.muted, bg: C.chipBg },
  void: { mark: "void", label: "void", color: C.muted, bg: C.chipBg },
  pending: { mark: "…", label: "pending", color: C.amber, bg: C.amberSoft },
};
export const resultMeta = (r) => RESULT_META[r] || RESULT_META.pending;
