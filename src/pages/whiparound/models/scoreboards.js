/* Wire types for /whiparound/scoreboards — a port of whiparound-firetv's
 * Scoreboards.kt, plus the Mock.kt scoreboard fixtures.
 *
 * One team, one game, the whole screen. Every field is nullable and every read
 * is tolerant: ESPN's summary drops the situation between innings, the box
 * score before first pitch and the leaders whenever it feels like it, and a
 * board that throws because a game had no scoring plays yet is worse than one
 * with a gap in it.
 *
 * ABSENT MEANS NO. A board outside every window is not sent at all, so the
 * rotation (slots.js) reads only `live` and each board's `key` / `relevance`,
 * and never guesses at a season.
 */

import { bool, int, isObj, obj, objects, str } from "./wire";

export const EMPTY_SCOREBOARDS = { live: false, boards: [] };

/// A name and the line beside it — "C. Walker" / "3-4, HR, 2 RBI". The same
/// shape carries a probable, a batter and a passing leader: somebody, and what
/// they have done. No name, no performer.
function performer(o) {
  const name = str(o, "name");
  return name == null ? null : { name, line: str(o, "line") };
}

/* An array of cells as strings. Kotlin reads these with `optString(i, "")`.
 * A JSON null reads as "" here rather than the literal "null" org.json would
 * coerce it to — a blank cell is the one answer a scoreboard can give for it. */
function cells(o, key) {
  const a = isObj(o) && Array.isArray(o[key]) ? o[key] : [];
  return a.map((v) => (v == null ? "" : typeof v === "object" ? "" : String(v)));
}

/* One side of the line score. `linescore` is SHORT of `columns` for innings not
 * yet batted — absent is NOT zero, and the grid draws the difference. */
function scoreSide(o) {
  if (!isObj(o)) {
    return {
      abbr: "—",
      name: null,
      logo: null,
      colorHex: null,
      score: null,
      record: null,
      hits: null,
      errors: null,
      linescore: [],
    };
  }
  return {
    abbr: str(o, "abbr") ?? "—",
    name: str(o, "name"),
    logo: str(o, "logo"),
    colorHex: str(o, "color"),
    score: int(o, "score"),
    record: str(o, "record"),
    hits: int(o, "hits"),
    errors: int(o, "errors"),
    linescore: cells(o, "linescore"),
  };
}

/// One comparison row. The backend drops a row only when NEITHER side has the
/// number, so a null side here means that team genuinely has no value.
function compareRow(o) {
  const label = str(o, "label");
  return label == null ? null : { label, away: str(o, "away"), home: str(o, "home") };
}

function leaderRow(o) {
  const label = str(o, "label");
  if (label == null) return null;
  const away = performer(obj(o, "away"));
  const home = performer(obj(o, "home"));
  // Nobody on either side is a category ESPN published empty; drawing it puts
  // a heading over two dashes.
  return away == null && home == null ? null : { label, away, home };
}

/* Something that changed the score. `kind` is the MARK, not the sentence —
 * "HR", "TD", "FG", and for basketball "LEAD" / "CHANGE", because the Rockets
 * board's big plays are LEAD CHANGES rather than baskets. */
function bigPlay(o) {
  const text = str(o, "text");
  if (text == null) return null;
  const awayScore = int(o, "away_score");
  const homeScore = int(o, "home_score");
  return {
    at: str(o, "when"),
    teamId: str(o, "team_id"),
    text,
    awayScore,
    homeScore,
    kind: str(o, "kind"),
    scoreLabel: awayScore != null && homeScore != null ? `${awayScore}–${homeScore}` : null,
  };
}

/* What is happening at this exact moment, every sport in one flat shape. The
 * bases come from ESPN's SCOREBOARD block, never the summary's situation (which
 * has no bases at all) — that is the backend's job, and nothing here may try to
 * fill them in from anywhere else. */
function boardNow(o) {
  if (!isObj(o)) return null;
  const balls = int(o, "balls");
  const strikes = int(o, "strikes");
  const now = {
    balls,
    strikes,
    outs: int(o, "outs"),
    onFirst: bool(o, "on_first", false),
    onSecond: bool(o, "on_second", false),
    onThird: bool(o, "on_third", false),
    batter: performer(obj(o, "batter")),
    pitcher: performer(obj(o, "pitcher")),
    dueUp: objects(o, "due_up").map(performer).filter(Boolean),
    downDistance: str(o, "down_distance"),
    spot: str(o, "spot"),
    isRedZone: bool(o, "is_red_zone", false),
    possessionAbbr: str(o, "possession_abbr"),
    lastPlay: str(o, "last_play"),
    count: balls != null && strikes != null ? `${balls}–${strikes}` : null,
  };
  // The board screen's own diamond takes this shape, so the bases mean the same
  // thing on both screens.
  now.asSituation = {
    outs: now.outs,
    onFirst: now.onFirst,
    onSecond: now.onSecond,
    onThird: now.onThird,
    balls,
    strikes,
    down: null,
    isRedZone: now.isRedZone,
    possessionAbbr: now.possessionAbbr,
  };
  return now;
}

/// Winning, losing and saving pitcher. Baseball only, and only once it is over.
function decisions(o) {
  if (!isObj(o)) return null;
  const rows = [
    ["W", performer(obj(o, "win"))],
    ["L", performer(obj(o, "loss"))],
    ["S", performer(obj(o, "save"))],
  ]
    .filter(([, who]) => who != null)
    .map(([mark, who]) => ({ mark, who }));
  return rows.length === 0 ? null : { rows };
}

function scoreboard(o) {
  const key = str(o, "key");
  if (key == null) return null;
  const state = str(o, "state") ?? "pre";
  return {
    key,
    leagueLabel: str(o, "label") ?? key.toUpperCase(),
    sport: str(o, "sport") ?? "",
    /* HOW LOUD THIS SCREEN SHOULD BE, decided in the backend from the schedule:
     * "live", "today" (before first pitch), "recent" (eighteen hours after) or
     * "upcoming" (up to eight days out). There is no fifth value — a board with
     * nothing to say is not sent. */
    relevance: str(o, "relevance") ?? "upcoming",
    eventId: str(o, "event_id") ?? "",
    teamId: str(o, "team_id"),
    /// "home" or "away" — which side of this game is ours.
    mySide: str(o, "my_side"),
    title: str(o, "title") ?? key.toUpperCase(),
    teamColorHex: str(o, "team_color"),
    state,
    status: str(o, "status"),
    clock: str(o, "clock"),
    period: int(o, "period"),
    venue: str(o, "venue"),
    broadcast: str(o, "broadcast"),
    /// "SUN, 9/13 · 7:20 PM CT", formatted by the backend in Central. ESPN's own
    /// label is Eastern; a wall in Houston should not do the arithmetic.
    startLabel: str(o, "start_label"),
    /// The inning or quarter numbers, then the totals ("R","H","E" or "T").
    columns: cells(o, "columns"),
    totals: cells(o, "totals"),
    /// "B7", "E3", "Q4". Null when the game is not being played.
    periodLabel: str(o, "period_label"),
    home: scoreSide(obj(o, "home")),
    away: scoreSide(obj(o, "away")),
    now: boardNow(obj(o, "situation")),
    bigPlays: objects(o, "big_plays").map(bigPlay).filter(Boolean),
    stats: objects(o, "stats").map(compareRow).filter(Boolean),
    leaders: objects(o, "leaders").map(leaderRow).filter(Boolean),
    decisions: decisions(obj(o, "decisions")),
    isLive: state === "in",
    isFinal: state === "post",
    isPregame: state === "pre",
  };
}

export function parseScoreboards(json) {
  if (!isObj(json)) return EMPTY_SCOREBOARDS;
  return {
    live: bool(json, "live", false),
    boards: objects(json, "boards").map(scoreboard).filter(Boolean),
  };
}

export function boardFor(scoreboards, key) {
  return scoreboards.boards.find((b) => b.key === key) ?? null;
}

/* THE COWBOYS TAKE THE WHOLE WALL WHILE THEY PLAY (Patrick, 2026-09-13: "if the
 * cowboys are playing only show/update that screen, nothing else"). THE WEB
 * BOARD'S ALONE — he asked for bvllc's by name, and the sticks still rotate
 * through a Cowboys game.
 *
 * Keyed on the TEAM, not on "the football board is live": WHIPAROUND_NFL_TEAM
 * can point the board at another club, and that club does not inherit the
 * takeover. ESPN's id first, the abbreviation of our side as a second opinion. */
const COWBOYS = { key: "nfl", teamId: "6", abbr: "DAL" };

/* Where the Cowboys' game stands, read off one /whiparound/scoreboards payload:
 *
 *   "live"    their board, in progress — halftime, overtime and a delay too.
 *   "over"    POSITIVE evidence the takeover should end: their board is final,
 *             or the football board is some other team's.
 *   "pre"     their board, not kicked off.
 *   "unknown" no payload, or no football board in it. NOT the same as over: the
 *             backend drops the board for its five-minute idle cache whenever
 *             one ESPN summary fetch times out, in the middle of a game.
 *
 * THE BOARD'S STATE OUTRANKS ITS RELEVANCE, both ways. A failed ESPN league feed
 * sends a game in progress as "recent" (the schedule fallback labels any past
 * kickoff that way), and a board built at the final whistle can be cached with
 * relevance "live" and state "post". */
export function cowboysPhase(scoreboards) {
  const b = scoreboards == null ? null : boardFor(scoreboards, COWBOYS.key);
  if (b == null) return "unknown";
  const ours = b.mySide === "home" ? b.home : b.mySide === "away" ? b.away : null;
  if (b.teamId !== COWBOYS.teamId && ours?.abbr !== COWBOYS.abbr) return "over";
  if (b.state === "post") return "over";
  if (b.state === "in" || b.relevance === "live") return "live";
  return "pre";
}

/// The slate's live games — /whiparound/games rows — include the Cowboys. Only a
/// hint to fetch the stadium boards early; the takeover itself waits for them.
export function cowboysInGames(games) {
  return games.some(
    (g) => g.league === COWBOYS.key && (g.away.abbr === COWBOYS.abbr || g.home.abbr === COWBOYS.abbr),
  );
}

/* ── Mock.kt's fixtures ─────────────────────────────────────────────────────
 *
 * JSON run through the real parser rather than hand-built objects, so a wire
 * change breaks the preview exactly as it would break production. Each one is
 * built to show a trap, not just to look busy:
 *
 *   - ASTROS, bottom of the 7th: the line score is SHORT of the columns (8 and
 *     9 blank on both rows — absent is not zero), Houston's #002D62 is below the
 *     luma floor so the rail falls back to the accent, and two out with runners
 *     on the corners at 2-2 gives the diamond, outs and count something to say.
 *   - COWBOYS, 1st & goal, 2:41 left: one total column, possession + spot + the
 *     RED ZONE chip, a silver team rail that DOES carry, and EIGHT stat rows —
 *     the count that would not fit before the stats panel was retuned.
 *   - ROCKETS, four minutes left, four points in it: inside basketball's
 *     one-possession unit of 6 so the margin draws hot; the line score runs to
 *     the quarter being played (ESPN's shape — three cells against a total of 98
 *     read as a board that cannot add); big plays are LEAD CHANGES.
 */
const logo = (path, px = 96) =>
  `https://a.espncdn.com/combiner/i?img=/i/teamlogos/${path}&w=${px}&h=${px}`;

const MLB_LIVE = {
  key: "mlb", label: "MLB", sport: "baseball",
  relevance: "live", state: "in",
  event_id: "mock-mlb", team_id: "18", my_side: "home",
  title: "Astros", team_color: "#002D62",
  venue: "Daikin Park", broadcast: "SCHN",
  status: "Bottom 7th", period_label: "B7", period: 7,
  columns: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  totals: ["R", "H", "E"],
  away: {
    abbr: "SEA", name: "Mariners",
    logo: logo("mlb/500/sea.png"), color: "#0C2C56",
    score: 3, record: "77-58", hits: 7, errors: 0,
    linescore: ["0", "1", "0", "0", "2", "0", "0"],
  },
  home: {
    abbr: "HOU", name: "Astros",
    logo: logo("mlb/500/hou.png"), color: "#002D62",
    score: 4, record: "78-57", hits: 9, errors: 1,
    linescore: ["1", "0", "0", "2", "0", "0", "1"],
  },
  situation: {
    balls: 2, strikes: 2, outs: 2,
    on_first: true, on_second: false, on_third: true,
    batter: { name: "Y. Alvarez", line: "2-3, 2B, RBI" },
    pitcher: { name: "A. Munoz", line: "0.1 IP, 1 H, 0 ER" },
    last_play: "Pitch 5 : Foul",
  },
  big_plays: [
    { when: "B7", team_id: "18", kind: "1B",
      text: "Altuve singled to left, Diaz scored, Paredes to third.",
      away_score: 3, home_score: 4 },
    { when: "T5", team_id: "12", kind: "HR",
      text: "Rodriguez homered to center (417 feet), Raleigh scored.",
      away_score: 3, home_score: 3 },
    { when: "B4", team_id: "18", kind: "2B",
      text: "Alvarez doubled to right center, Altuve scored and Bregman scored.",
      away_score: 1, home_score: 3 },
    { when: "T2", team_id: "12", kind: "SF",
      text: "Raleigh hit a sacrifice fly to right, Crawford scored.",
      away_score: 1, home_score: 1 },
    { when: "B1", team_id: "18", kind: "1B",
      text: "Pena singled to left, Altuve scored.",
      away_score: 0, home_score: 1 },
  ],
  stats: [
    { label: "HITS", away: "7", home: "9" },
    { label: "HOME RUNS", away: "1", home: "0" },
    { label: "WALKS", away: "2", home: "4" },
    { label: "STRUCK OUT", away: "9", home: "6" },
    { label: "EXTRA-BASE HITS", away: "2", home: "3" },
    { label: "AVERAGE", away: ".212", home: ".281" },
    { label: "ERRORS", away: "0", home: "1" },
  ],
  leaders: [
    { label: "BATTING",
      away: { name: "J. Rodriguez", line: "2-4, HR, 2 RBI" },
      home: { name: "Y. Alvarez", line: "2-3, 2B, RBI" } },
    { label: "PITCHING",
      away: { name: "L. Castillo", line: "6.0 IP, 7 H, 3 ER, 8 K" },
      home: { name: "F. Valdez", line: "6.2 IP, 6 H, 3 ER, 9 K" } },
  ],
};

const NFL_LIVE = {
  key: "nfl", label: "NFL", sport: "football",
  relevance: "live", state: "in",
  event_id: "mock-nfl", team_id: "6", my_side: "home",
  title: "Cowboys", team_color: "#869397",
  venue: "AT&T Stadium", broadcast: "FOX",
  status: "2:41 - 4th", period_label: "Q4", period: 4,
  columns: ["1", "2", "3", "4"],
  totals: ["T"],
  away: {
    abbr: "PHI", name: "Eagles",
    logo: logo("nfl/500/phi.png"), color: "#004C54",
    score: 27, record: "8-3",
    linescore: ["7", "3", "7", "10"],
  },
  home: {
    abbr: "DAL", name: "Cowboys",
    logo: logo("nfl/500/dal.png"), color: "#869397",
    score: 24, record: "7-4",
    linescore: ["0", "10", "7", "7"],
  },
  situation: {
    down_distance: "1st & Goal",
    spot: "PHI 7",
    is_red_zone: true,
    possession_abbr: "DAL",
    last_play: "D. Prescott pass short right to C. Lamb for 21 yards to the PHI 7.",
  },
  big_plays: [
    { when: "Q4", team_id: "21", kind: "FG",
      text: "J. Elliott 44 Yd Field Goal", away_score: 27, home_score: 24 },
    { when: "Q4", team_id: "6", kind: "TD",
      text: "C. Lamb 9 Yd pass from D. Prescott (B. Aubrey Kick)",
      away_score: 24, home_score: 24 },
    { when: "Q4", team_id: "21", kind: "TD",
      text: "S. Barkley 62 Yd Run (J. Elliott Kick)",
      away_score: 24, home_score: 17 },
    { when: "Q3", team_id: "6", kind: "TD",
      text: "J. Ferguson 4 Yd pass from D. Prescott (B. Aubrey Kick)",
      away_score: 17, home_score: 17 },
    { when: "Q3", team_id: "21", kind: "TD",
      text: "A. Brown 33 Yd pass from J. Hurts (J. Elliott Kick)",
      away_score: 17, home_score: 10 },
    { when: "Q2", team_id: "6", kind: "FG",
      text: "B. Aubrey 51 Yd Field Goal", away_score: 10, home_score: 10 },
    { when: "Q2", team_id: "6", kind: "TD",
      text: "R. Dowdle 2 Yd Run (B. Aubrey Kick)",
      away_score: 10, home_score: 7 },
  ],
  stats: [
    { label: "TOTAL YARDS", away: "398", home: "371" },
    { label: "PASSING", away: "241", home: "288" },
    { label: "RUSHING", away: "157", home: "83" },
    { label: "FIRST DOWNS", away: "21", home: "19" },
    { label: "THIRD DOWN", away: "6-13", home: "5-12" },
    { label: "TURNOVERS", away: "1", home: "0" },
    { label: "PENALTIES", away: "5-41", home: "7-63" },
    { label: "POSSESSION", away: "32:12", home: "27:48" },
  ],
  leaders: [
    { label: "PASSING",
      away: { name: "J. Hurts", line: "19/28, 241 YDS, 1 TD" },
      home: { name: "D. Prescott", line: "24/33, 288 YDS, 2 TD" } },
    { label: "RUSHING",
      away: { name: "S. Barkley", line: "18 CAR, 141 YDS, 1 TD" },
      home: { name: "R. Dowdle", line: "14 CAR, 61 YDS, 1 TD" } },
  ],
};

const NBA_LIVE = {
  key: "nba", label: "NBA", sport: "basketball",
  relevance: "live", state: "in",
  event_id: "mock-nba", team_id: "10", my_side: "home",
  title: "Rockets", team_color: "#CE1141",
  venue: "Toyota Center", broadcast: "SCHN",
  status: "4th Quarter", period_label: "Q4", period: 4,
  clock: "4:12",
  columns: ["1", "2", "3", "4"],
  totals: ["T"],
  away: {
    abbr: "DEN", name: "Nuggets",
    logo: logo("nba/500/den.png"), color: "#0E2240",
    score: 98, record: "41-22",
    linescore: ["24", "31", "27", "16"],
  },
  home: {
    abbr: "HOU", name: "Rockets",
    logo: logo("nba/500/hou.png"), color: "#CE1141",
    score: 102, record: "44-19",
    linescore: ["29", "22", "33", "18"],
  },
  big_plays: [
    { when: "Q4 5:38", team_id: "10", kind: "CHANGE",
      text: "Alperen Sengun makes 14-foot pullup jump shot",
      away_score: 96, home_score: 97 },
    { when: "Q3 1:04", team_id: "7", kind: "CHANGE",
      text: "Nikola Jokic makes free throw 2 of 2",
      away_score: 88, home_score: 87 },
    { when: "Q1 8:22", team_id: "10", kind: "LEAD",
      text: "Jabari Smith Jr. makes 25-foot three point jumper",
      away_score: 5, home_score: 6 },
  ],
  stats: [
    { label: "FIELD GOAL %", away: "45.2", home: "48.9" },
    { label: "3-POINT %", away: "36.1", home: "41.7" },
    { label: "FREE THROW %", away: "81.0", home: "72.4" },
    { label: "REBOUNDS", away: "44", home: "39" },
    { label: "ASSISTS", away: "27", home: "24" },
    { label: "TURNOVERS", away: "12", home: "9" },
  ],
  leaders: [
    { label: "POINTS",
      away: { name: "N. Jokic", line: "31 PTS" },
      home: { name: "A. Sengun", line: "28 PTS" } },
    { label: "REBOUNDS",
      away: { name: "N. Jokic", line: "14 REB" },
      home: { name: "S. Adams", line: "11 REB" } },
    { label: "ASSISTS",
      away: { name: "N. Jokic", line: "9 AST" },
      home: { name: "F. VanVleet", line: "8 AST" } },
  ],
};

/// All three boards, live — `live: true` is what gives each its live slot
/// length, so the preview shows the real cycle and not just the real screens.
export function mockScoreboards() {
  return parseScoreboards({ live: true, boards: [MLB_LIVE, NFL_LIVE, NBA_LIVE] });
}
