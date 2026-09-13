/* GET /whiparound/games, ported from whiparound-firetv's Models.kt.
 *
 * Derived values (`line`, `subtitle`, `clockLabel`, the weather labels) are
 * computed once at parse time and carried as plain fields, where the Kotlin
 * has computed properties — same answers, and a screen never re-derives them.
 *
 * The backend has already sorted every list. Re-sorting here would be a second
 * opinion on the ranking, and there should only be one.
 */

import { bool, int, obj, objects, str, strings } from "./wire";

/* LEAGUES THE BACKEND SENDS AND THIS WALL DOES NOT WANT (Patrick, 2026-08-31:
 * "you dont need to show wnba in the whip around"). Filtered in the client, as
 * on the Fire TV, because turning a league off should not be a production
 * deploy of the shared API. Applied to live, upcoming AND final together so the
 * strip and every screen agree. Keep in step with HIDDEN in Models.kt. */
const HIDDEN = new Set(["wnba"]);

function parseTeam(o) {
  if (!o) return { abbr: "—", name: null, score: null, record: null, logo: null };
  return {
    abbr: str(o, "abbr") ?? "—",
    name: str(o, "name"),
    score: int(o, "score"),
    record: str(o, "record"),
    // Already resized by the backend. Null for a team ESPN has no art for.
    logo: str(o, "logo"),
  };
}

function parseSituation(o) {
  if (!o) return null;
  const s = {
    outs: int(o, "outs"),
    onFirst: bool(o, "on_first"),
    onSecond: bool(o, "on_second"),
    onThird: bool(o, "on_third"),
    balls: int(o, "balls"),
    strikes: int(o, "strikes"),
    down: int(o, "down"),
    isRedZone: bool(o, "is_red_zone"),
    possessionAbbr: str(o, "possession_abbr"),
  };
  s.hasBases = s.outs != null || s.onFirst || s.onSecond || s.onThird;
  s.count = s.balls != null && s.strikes != null ? `${s.balls}-${s.strikes}` : null;
  return s;
}

/* Baseball has no clock, and ESPN says so by sending "0:00" rather than
 * nothing — printed, "Top 8th · 0:00" reads as a game with no time left. */
function clockLabel(g) {
  if (g.sport === "baseball") return null;
  const c = g.clock;
  if (c == null || c === "0:00" || c === "0.0") return null;
  return g.status != null && g.status.includes(c) ? null : c;
}

export function parseGame(o) {
  const why = strings(o, "why");
  const prob = obj(o, "win_prob");
  const g = {
    id: str(o, "id") ?? "",
    league: str(o, "league") ?? "",
    leagueLabel: str(o, "league_label") ?? "",
    sport: str(o, "sport") ?? "",
    state: str(o, "state") ?? "pre",
    status: str(o, "status"),
    clock: str(o, "clock"),
    score: int(o, "score"),
    why,
    home: parseTeam(obj(o, "home")),
    away: parseTeam(obj(o, "away")),
    margin: int(o, "margin"),
    tied: bool(o, "tied"),
    leader: str(o, "leader"),
    situation: parseSituation(obj(o, "situation")),
    situationText: str(o, "situation_text"),
    broadcast: str(o, "broadcast"),
    homeWinPct: prob ? int(prob, "home") : null,
    tv: str(o, "tv"),
    start: str(o, "start"),
    // Pinned to the top by the backend because it is the configured college
    // team's game — carried so the hero can say WHY it is there.
    isMyTeam: bool(o, "is_my_team"),
  };
  g.isLive = g.state === "in";
  g.homeLeads = g.leader === "home";
  g.awayLeads = g.leader === "away";
  // "HOU 4 – 4 SEA". Away first, the way a scoreboard says it.
  g.line = `${g.away.abbr} ${g.away.score ?? "–"} – ${g.home.score ?? "–"} ${g.home.abbr}`;
  // The situation, or the reasons — never the league, which is already on the
  // chip beside it.
  g.subtitle = g.situationText ?? (why.length > 0 ? why.join(" · ") : "");
  g.clockLabel = clockLabel(g);
  return g;
}

function parseStandingRow(o, index) {
  const r = {
    rank: int(o, "rank") ?? index + 1,
    abbr: str(o, "abbr") ?? "—",
    name: str(o, "name"),
    wins: int(o, "wins"),
    losses: int(o, "losses"),
    pct: str(o, "pct"),
    gamesBehind: str(o, "games_behind"),
    streak: str(o, "streak"),
    lastTen: str(o, "last_ten"),
    playoffPct: str(o, "playoff_pct"),
    // NFL only. Printed only when it is not zero.
    ties: int(o, "ties"),
  };
  r.record = `${r.wins ?? "–"}-${r.losses ?? "–"}${(r.ties ?? 0) > 0 ? `-${r.ties}` : ""}`;
  // The leader shows a dash, not "0" — half a game back is "0.5".
  r.gbLabel = r.gamesBehind ?? "—";
  return r;
}

/* `groups` is on the wire and deliberately not parsed — the race screen is the
 * two divisions the wall's own teams play in. */
function parseStandings(o) {
  if (!o) return null;
  const teams = objects(o, "teams").map(parseStandingRow);
  if (teams.length === 0) return null;
  return { name: str(o, "name") ?? "STANDINGS", teams };
}

const CONDITION_GLYPHS = {
  Clear: "☀️",
  MostlyClear: "🌤️",
  PartlyCloudy: "⛅",
  MostlyCloudy: "🌥️",
  Cloudy: "☁️",
  Overcast: "🌥️",
  Drizzle: "🌦️",
  Rain: "🌧️",
  HeavyRain: "🌧️",
  Thunderstorms: "⛈️",
  IsolatedThunderstorms: "⛈️",
  ScatteredThunderstorms: "⛈️",
  Snow: "❄️",
  Sleet: "🌨️",
  FreezingDrizzle: "🌧️",
  FreezingRain: "🌧️",
  Hail: "🌨️",
  Foggy: "🌫️",
  Haze: "🌫️",
  Smoky: "🌫️",
  Windy: "💨",
  Breezy: "💨",
  Hot: "🥵",
  Frigid: "🥶",
};

export function conditionGlyph(code) {
  return CONDITION_GLYPHS[code] ?? "🌤️";
}

/// "MostlyClear" -> "Mostly Clear". An unknown code still renders as itself.
export function conditionText(code) {
  return code == null ? null : code.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function parseWeather(o) {
  if (!o) return null;
  const hourly = objects(o, "hourly")
    .filter((h) => str(h, "label") != null)
    .map((h) => ({
      label: str(h, "label"),
      temp: int(h, "temp"),
      rainChance: int(h, "rain_chance"),
      condition: str(h, "condition"),
    }));
  const daily = objects(o, "daily")
    .filter((d) => str(d, "label") != null)
    .map((d) => ({
      label: str(d, "label"),
      high: int(d, "high"),
      low: int(d, "low"),
      rainChance: int(d, "rain_chance"),
      condition: str(d, "condition"),
    }));
  const w = {
    city: str(o, "city") ?? "LOCAL",
    temp: int(o, "temp"),
    feelsLike: int(o, "feels_like"),
    high: int(o, "high"),
    low: int(o, "low"),
    rainChance: int(o, "rain_chance"),
    windMph: int(o, "wind_mph"),
    windDir: str(o, "wind_dir"),
    condition: str(o, "condition"),
    humidity: int(o, "humidity"),
    uvIndex: int(o, "uv_index"),
    sunrise: str(o, "sunrise_label"),
    sunset: str(o, "sunset_label"),
    hourly,
    daily,
  };
  // A block with no temperature and no high is a failed fetch that parsed.
  if (w.temp == null && w.high == null) return null;

  w.tempLabel = w.temp != null ? `${w.temp}°` : null;
  // "feels 92" only when it actually differs by 3 or more.
  w.feelsLabel =
    w.feelsLike != null && (w.temp == null || Math.abs(w.feelsLike - w.temp) >= 3)
      ? `feels ${w.feelsLike}°`
      : null;
  w.rangeLabel = w.high != null && w.low != null ? `H ${w.high} / L ${w.low}` : null;
  w.rainLabel = w.rainChance != null && w.rainChance > 0 ? `${w.rainChance}% rain` : null;
  w.windLabel =
    w.windMph == null
      ? null
      : w.windMph < 2
        ? "calm"
        : [`wind ${w.windMph}mph`, w.windDir].filter(Boolean).join(" ");
  w.detail = [w.feelsLabel, w.rangeLabel, w.rainLabel, w.windLabel].filter(Boolean);
  w.glyph = conditionGlyph(w.condition);
  w.conditionLabel = conditionText(w.condition);
  // The weather SCREEN stands down without a forecast rather than rendering
  // two empty panels that claim the sky is blank.
  w.hasForecast = hourly.length > 0 || daily.length > 0;
  return w;
}

export const EMPTY_SLATE = {
  live: [],
  upcoming: [],
  final: [],
  errors: {},
  tvMapConfigured: false,
  standings: null,
  nflStandings: null,
  weather: null,
};

export function parseSlate(o) {
  const games = (key) =>
    objects(o, key)
      .map(parseGame)
      .filter((g) => !HIDDEN.has(g.league));
  const errors = {};
  const e = obj(o, "errors");
  if (e) {
    for (const [k, v] of Object.entries(e)) errors[k] = typeof v === "string" && v ? v : "failed";
  }
  return {
    live: games("live"),
    upcoming: games("upcoming"),
    final: games("final"),
    errors,
    tvMapConfigured: bool(o, "tv_map_configured"),
    standings: parseStandings(obj(o, "standings")),
    // Null out of season and on failure — absent means no.
    nflStandings: parseStandings(obj(o, "nfl_standings")),
    weather: parseWeather(obj(o, "weather")),
  };
}
