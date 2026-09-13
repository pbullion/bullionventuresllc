/* Time on this board is CENTRAL, whatever the computer driving the monitor
 * thinks its timezone is — ported from the CENTRAL helpers in
 * whiparound-firetv's ui/Slate.kt and ui/Cfb.kt.
 *
 * `start` on the wire is UTC, and ESPN's own `status` label on a scheduled game
 * is EASTERN ("9/5 - 12:30 PM EDT"). This wall is in Houston, so every kickoff
 * is formatted here against an explicit America/Chicago. The browser's CLOCK
 * still matters (TODAY vs TOMORROW, and which games COMING UP keeps, are
 * questions about now); its TIMEZONE does not.
 */

const CENTRAL = "America/Chicago";
const EASTERN = "America/New_York";

const FORMATTERS = new Map();

function partsFormatter(zone) {
  let f = FORMATTERS.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    FORMATTERS.set(zone, f);
  }
  return f;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function zoneParts(ms, zone) {
  const out = {};
  for (const p of partsFormatter(zone).formatToParts(new Date(ms))) {
    if (p.type === "weekday") out.weekday = p.value;
    else if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  out.hour %= 24;
  return out;
}

/// { year, month (1-12), day, weekday ("Sun"), hour (0-23), minute, second } in Central.
export function centralParts(ms) {
  return zoneParts(ms, CENTRAL);
}

const pad2 = (n) => String(n).padStart(2, "0");

/* SimpleDateFormat, for the handful of patterns the Kotlin uses:
 * yyyy MMM MM M dd d EEE HH h mm a, and 'quoted' literals. Built from parts
 * rather than Intl's own time string, which puts a narrow no-break space before
 * AM/PM on current engines. */
function formatIn(ms, pattern, zone) {
  const p = zoneParts(ms, zone);
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return pattern.replace(/yyyy|MMM|MM|M|dd|d|EEE|HH|h|mm|a|'[^']*'/g, (tok) => {
    switch (tok) {
      case "yyyy":
        return String(p.year);
      case "MMM":
        return MONTHS[p.month - 1];
      case "MM":
        return pad2(p.month);
      case "M":
        return String(p.month);
      case "dd":
        return pad2(p.day);
      case "d":
        return String(p.day);
      case "EEE":
        return p.weekday;
      case "HH":
        return pad2(p.hour);
      case "h":
        return String(h12);
      case "mm":
        return pad2(p.minute);
      case "a":
        return p.hour < 12 ? "AM" : "PM";
      default:
        return tok.slice(1, -1);
    }
  });
}

export function formatCentral(ms, pattern) {
  return formatIn(ms, pattern, CENTRAL);
}

/// Minutes Central is ahead of UTC at that instant (-300 in summer, -360 in winter).
function offsetMinutes(ms) {
  const p = centralParts(ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/// The instant of 00:00 Central on a calendar date (month 1-12; day may overflow).
export function centralMidnight(year, month, day) {
  const guess = Date.UTC(year, month - 1, day);
  let t = guess - offsetMinutes(guess) * 60000;
  const second = guess - offsetMinutes(t) * 60000;
  if (second !== t) t = second;
  return t;
}

export function isSaturdayCentral(now) {
  return centralParts(now).weekday === "Sat";
}

/* ESPN's own format through the backend: "2026-08-23T23:00Z". Seconds and a
 * fraction are accepted too. Null when it does not parse — not a crash, but a
 * game that cannot be placed on a day, so COMING UP leaves it off (see
 * comingUpToday in screens/SlateLayout.js). */
export function startMillis(game) {
  const raw = game?.start;
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?Z$/.exec(raw);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
}

/* A GAME WITH NO KICKOFF TIME YET IS DATED, NOT TIMED.
 *
 * ESPN publishes a game whose time is not set with the status "TBD" and a
 * `start` of MIDNIGHT EASTERN on its date — 04:00Z in September, 05:00Z in
 * November. Read in Central that is 11 PM the night before, so a Monday game
 * with no time became a card saying SUN · 11:00 PM: the wrong day, and a time
 * nobody published. Such a game is on the Eastern date ESPN gave it, and its
 * time is the status itself. (Slate.kt's NO_TIME, 2026-09-13.)
 */
const NO_TIME = /^TB[AD]\b/i;

function noTime(game) {
  return game.status != null && NO_TIME.test(game.status);
}

/// The zone `start` has to be read in to land on the day the game is on.
function dayZone(game) {
  return noTime(game) ? EASTERN : CENTRAL;
}

/// The calendar day a scheduled game is on, as yyyyMMdd; null when `start` does not parse.
export function gameDay(game) {
  const ms = startMillis(game);
  return ms == null ? null : formatIn(ms, "yyyyMMdd", dayZone(game));
}

/* { day: "TODAY" | "TOMORROW" | "SUN 9/13", time: "7:00 PM" | "TBD" }, or null
 * when `start` does not parse. No "CT" — everything on this wall is Central. */
export function kickoff(game, now) {
  const ms = startMillis(game);
  if (ms == null) return null;
  const zone = dayZone(game);
  const date = formatIn(ms, "yyyyMMdd", zone);
  let day;
  if (date === formatCentral(now, "yyyyMMdd")) day = "TODAY";
  else if (date === formatCentral(now + 24 * 60 * 60 * 1000, "yyyyMMdd")) day = "TOMORROW";
  else day = formatIn(ms, "EEE M/d", zone).toUpperCase();
  const time = noTime(game) ? game.status.toUpperCase() : formatCentral(ms, "h:mm a").toUpperCase();
  return { day, time };
}

/// The same kickoff as one string — or the time alone, for a list that is all
/// today — falling back to ESPN's status verbatim.
export function kickoffLabel(game, now, withDay = true) {
  const k = kickoff(game, now);
  if (!k) return game.status ?? "";
  return withDay ? `${k.day} · ${k.time}` : k.time;
}
