import { arr, bool, int, isObj, obj, objects, str } from "./wire";

/* College football — GET /whiparound/cfb. A port of whiparound-firetv's Cfb.kt
 * (the AP poll, the power conferences, one or two teams' seasons) and of the
 * `Mock.cfb` overlay in Mock.kt.
 *
 * A separate fetch from the slate on a separate cadence: a poll comes out once a
 * week and a schedule is fixed months ahead.
 *
 * EVERY PIECE IS INDEPENDENTLY NULLABLE. The backend catches its three upstream
 * fetches separately, so a poll outage costs the poll screen and nothing else —
 * and each screen's relevance predicate in slots.js reads its own piece.
 */

/// ESPN says UNRANKED with 99, not with an absent field. The backend already
/// cuts to 1..25; this is the same rule again so a regression there cannot put
/// "#99" on eleven of twelve schedule rows.
function rankOf(o, key) {
  const n = int(o, key);
  return n != null && n >= 1 && n <= 25 ? n : null;
}

/* Two teams CAN share a rank — the preseason AP poll had two at 14 and no 15.
 * That is a tie, not a parsing bug, so ranks are kept exactly as sent. */
function pollTeamFrom(t) {
  const rank = int(t, "rank");
  if (rank == null) return null;
  // Null in the preseason: there was no previous poll to have been unranked in.
  const previous = int(t, "previous");
  return {
    rank,
    previous,
    abbr: str(t, "abbr"),
    name: str(t, "name"),
    logo: str(t, "logo"),
    record: str(t, "record"),
    points: int(t, "points"),
    firstPlaceVotes: int(t, "first_place_votes"),
    trend: str(t, "trend"),
    previousLabel: previous == null ? null : `#${previous}`,
    // Places climbed, negative for a fall. The backend suppresses the
    // preseason's meaningless trend, so anything present here is real.
    moved: previous == null ? null : previous - rank,
  };
}

function pollFrom(o) {
  if (!isObj(o)) return null;
  const teams = objects(o, "teams").map(pollTeamFrom).filter(Boolean);
  if (teams.length === 0) return null;
  return { name: str(o, "name") ?? "POLL", week: str(o, "week"), teams };
}

function conferenceFrom(c) {
  const abbr = str(c, "abbr");
  if (abbr == null) return null;
  const teams = objects(c, "teams").map((t) => ({
    abbr: str(t, "abbr"),
    name: str(t, "name"),
    logo: str(t, "logo"),
    /* Null until games are played — ESPN publishes an unprefixed `wins` and no
     * matching losses in the preseason, so the table falls back to `overall`.
     * Do NOT pair `wins` with `divisionLosses` to fill the gap: that is a made-up
     * record that looks plausible all season. */
    conference: str(t, "conference"),
    overall: str(t, "overall"),
    streak: str(t, "streak"),
  }));
  if (teams.length === 0) return null;
  return { abbr, name: str(c, "name") ?? abbr.toUpperCase(), teams };
}

/// One game on the team's schedule, framed from THAT TEAM's point of view —
/// `at` is home/away/neutral for them, and the scores are theirs first.
function gameFrom(g) {
  const completed = bool(g, "completed", false);
  const at = str(g, "at");
  const opponentAbbr = str(g, "opponent_abbr");
  const opponentRank = rankOf(g, "opponent_rank");
  const myScore = int(g, "my_score");
  const theirScore = int(g, "their_score");
  // Present-and-not-null, then optBoolean — so garbage reads false, as on the stick.
  const won = g.won === undefined || g.won === null ? null : bool(g, "won", false);
  const prefix = won === true ? "W" : won === false ? "L" : "";
  return {
    status: str(g, "status"),
    // ESPN's UTC kickoff, "2026-09-13T00:08Z". See `whenLabel` in screens/Cfb.jsx.
    dateIso: str(g, "date"),
    completed,
    at,
    opponentAbbr,
    opponentName: str(g, "opponent_name"),
    opponentLogo: str(g, "opponent_logo"),
    opponentRank,
    myScore,
    theirScore,
    won,
    venue: str(g, "venue"),
    broadcast: str(g, "broadcast"),
    // "at AUB", "vs #12 BYU" — neutral sites read as "vs", because from the
    // couch the distinction that matters is who, not whose stadium.
    opponentLabel: `${at === "away" ? "at" : "vs"} ${
      opponentRank != null ? `#${opponentRank} ` : ""
    }${opponentAbbr ?? "—"}`,
    // "W 31–17" once played, and nothing before — or when either score is missing.
    scoreLabel:
      completed && myScore != null && theirScore != null
        ? `${prefix} ${myScore}–${theirScore}`.trim()
        : null,
  };
}

function teamFrom(o) {
  if (!isObj(o)) return null;
  const games = objects(o, "games").map(gameFrom);
  const name = str(o, "name");
  if (name == null) return null;
  return {
    abbr: str(o, "abbr"),
    name,
    logo: str(o, "logo"),
    colorHex: str(o, "color"),
    record: str(o, "record"),
    standing: str(o, "standing"),
    games,
    // The next game not yet played — what a team page is actually asked in the
    // preseason and on any Tuesday.
    next: games.find((g) => !g.completed) ?? null,
    played: games.filter((g) => g.completed),
  };
}

const EMPTY = {
  poll: null,
  conferences: [],
  team: null,
  teams: [],
  inSeason: false,
  playsToday: false,
};

export function parseCfb(json) {
  const o = isObj(json) ? json : {};
  const season = obj(o, "season");
  const list = arr(o, "teams");
  return {
    poll: pollFrom(obj(o, "poll")),
    conferences: objects(o, "conferences").map(conferenceFrom).filter(Boolean),
    // The first configured team, kept because that is what the older sticks read.
    team: teamFrom(obj(o, "team")),
    /* EVERY configured team, in the backend's order — at most two, enforced
     * there (slots.js takes two). A backend that predates `teams` still sends
     * `team`, so the list falls back to it rather than emptying the screen. */
    teams: list
      ? list.map((t) => teamFrom(t)).filter(Boolean)
      : [teamFrom(obj(o, "team"))].filter(Boolean),
    /* ABSENT MEANS NO. A payload with no season block is one the backend could
     * not reason about, and every CFB screen stands down: a wall showing an
     * eight-month-old poll in April is worse than one screen fewer. */
    inSeason: bool(season, "in_season", false),
    // THEIR game day, from the schedule in Central — not "is it Saturday".
    playsToday: bool(season, "plays_today", false),
  };
}

function logo(path, px = 96) {
  return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/${path}&w=${px}&h=${px}`;
}

/* Baylor, nine games in — what the team page cannot show in August: a record,
 * a standing, and results. Two ranked opponents so the "#12" prefix is
 * exercised, and two TBD kickoffs at ESPN's MIDNIGHT-EASTERN placeholder
 * (05:00Z on a Saturday): they must print SAT 11/7 and SAT 11/14, never FRI.
 * The BYU row is a real kickoff and converts to Central normally (2:30 PM). */
const CFB_TEAM = {
  abbr: "BAY",
  name: "Baylor Bears",
  logo: logo("ncaa/500/239.png", 128),
  color: "#154734",
  record: "7-2",
  standing: "2nd in Big 12",
  games: [
    { completed: true, at: "neutral", status: "Final", opponent_abbr: "AUB", opponent_name: "Auburn", opponent_rank: 14, opponent_logo: logo("ncaa/500/2.png"), my_score: 31, their_score: 24, won: true },
    { completed: true, at: "home", status: "Final", opponent_abbr: "PV", opponent_name: "Prairie View", opponent_logo: logo("ncaa/500/2504.png"), my_score: 52, their_score: 3, won: true },
    { completed: true, at: "home", status: "Final", opponent_abbr: "LT", opponent_name: "Louisiana Tech", opponent_logo: logo("ncaa/500/2348.png"), my_score: 38, their_score: 17, won: true },
    { completed: true, at: "home", status: "Final", opponent_abbr: "COLO", opponent_name: "Colorado", opponent_logo: logo("ncaa/500/38.png"), my_score: 24, their_score: 27, won: false },
    { completed: true, at: "away", status: "Final", opponent_abbr: "ASU", opponent_name: "Arizona State", opponent_logo: logo("ncaa/500/9.png"), my_score: 27, their_score: 20, won: true },
    { completed: true, at: "home", status: "Final/OT", opponent_abbr: "TCU", opponent_name: "TCU", opponent_logo: logo("ncaa/500/2628.png"), my_score: 35, their_score: 31, won: true },
    { completed: true, at: "away", status: "Final", opponent_abbr: "KU", opponent_name: "Kansas", opponent_logo: logo("ncaa/500/2305.png"), my_score: 17, their_score: 24, won: false },
    { completed: true, at: "away", status: "Final", opponent_abbr: "UCF", opponent_name: "UCF", opponent_logo: logo("ncaa/500/2116.png"), my_score: 41, their_score: 28, won: true },
    { completed: true, at: "home", status: "Final", opponent_abbr: "ISU", opponent_name: "Iowa State", opponent_logo: logo("ncaa/500/66.png"), my_score: 30, their_score: 23, won: true },
    { completed: false, at: "away", status: "SAT - 2:30 PM CT", date: "2026-10-31T19:30Z", opponent_abbr: "BYU", opponent_name: "BYU", opponent_rank: 12, opponent_logo: logo("ncaa/500/252.png"), venue: "LaVell Edwards Stadium", broadcast: "FOX" },
    { completed: false, at: "home", status: "TBD", date: "2026-11-07T05:00Z", opponent_abbr: "TTU", opponent_name: "Texas Tech", opponent_logo: logo("ncaa/500/2641.png") },
    { completed: false, at: "away", status: "TBD", date: "2026-11-14T05:00Z", opponent_abbr: "HOU", opponent_name: "Houston", opponent_logo: logo("ncaa/500/248.png") },
  ],
};

/* The real poll and conferences, with a mid-season Baylor dropped in and the
 * season forced open AND playing today. An OVERLAY: those two screens are
 * correct whenever CFB is in season, so inventing 25 ranked teams would be
 * fiction with no answer. If the real fetch has not landed, `real` is null and
 * they stand down exactly as in April while the team page is still previewed.
 *
 * It writes `teams`, not just `team` — the rotation renders `teams[0]`, and a
 * singular-only overlay once showed PRODUCTION data under the MOCK chip. A
 * configured second team is left alone: a copy of Baylor would put the same
 * page on the wall twice. */
export function mockCfb(real) {
  const team = teamFrom(CFB_TEAM);
  const base = real ?? EMPTY;
  if (!team) return { ...base, inSeason: true, playsToday: true };
  return {
    ...base,
    team,
    teams: [team, ...base.teams.slice(1)],
    inSeason: true,
    playsToday: true,
  };
}
