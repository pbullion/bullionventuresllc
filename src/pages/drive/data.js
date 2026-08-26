/* Data layer for /drive — the in-car dashboard.
 *
 * EVERY SOURCE HERE IS BROWSER-REACHABLE WITH NO KEY AND NO NEW BACKEND ROUTE.
 * That is deliberate: the Tesla browser sits on LTE and this page is meant to
 * be typed into a car and forgotten, so it must not depend on anything that
 * needs a deploy to keep working. Two of the three hosts were CORS-verified
 * against this origin before the page was written (ESPN and RainViewer send
 * `access-control-allow-origin: *`; hn.algolia.com echoes this origin back).
 *
 * Sheline backend  -> weather (Apple WeatherKit, already keyed there) + Kalshi.
 * site.api.espn.com -> team next/live games and sports headlines.
 * hn.algolia.com    -> AI headlines.
 * api.rainviewer.com -> radar tile index.
 *
 * PAYLOAD IS A REAL CONSTRAINT. An ESPN league scoreboard is ~450 KB raw
 * (~31 KB gzipped, which is what a browser actually pulls). Polling all five
 * leagues every minute would be ~6 MB/hour of the car's connection for nothing,
 * so scoreboards are only polled for leagues that actually have one of these
 * teams playing inside a two-day window — see activeLeagues() below.
 */

export const API_BASE = "https://sheline-art-website-api.herokuapp.com";

/* Houston. Used until the browser hands over the car's real position, and as
 * the permanent fallback if it never does (geolocation denied, or the car has
 * no fix yet). */
export const FALLBACK_COORDS = { lat: 29.7604, lon: -95.3698, label: "Houston, TX" };

/* Patrick's teams, in the order he named them. `espnId` is the numeric team id
 * used to find this team inside a league-wide scoreboard payload; `slug` is the
 * path segment for the single-team endpoint (an abbreviation works for the pro
 * leagues, college wants the number). */
export const TEAMS = [
  {
    key: "astros",
    label: "Astros",
    sport: "baseball",
    league: "mlb",
    slug: "hou",
    espnId: "18",
    logo: "https://a.espncdn.com/i/teamlogos/mlb/500/hou.png",
    accent: "#EB6E1F",
  },
  {
    key: "cowboys",
    label: "Cowboys",
    sport: "football",
    league: "nfl",
    slug: "dal",
    espnId: "6",
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png",
    accent: "#7F9695",
  },
  {
    key: "rockets",
    label: "Rockets",
    sport: "basketball",
    league: "nba",
    slug: "hou",
    espnId: "10",
    logo: "https://a.espncdn.com/i/teamlogos/nba/500/hou.png",
    accent: "#CE1141",
  },
  {
    key: "baylor-fb",
    label: "Baylor FB",
    sport: "football",
    league: "college-football",
    slug: "239",
    espnId: "239",
    logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/239.png",
    accent: "#1E9E5A",
  },
  {
    key: "baylor-bb",
    label: "Baylor MBB",
    sport: "basketball",
    league: "mens-college-basketball",
    slug: "239",
    espnId: "239",
    logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/239.png",
    accent: "#FFB81C",
  },
];

const ESPN = "https://site.api.espn.com/apis/site/v2/sports";

/* Every fetch on this page goes through here. Two reasons:
 *   - a hung request must never wedge a poller, so everything has a timeout;
 *   - a single dead upstream must never blank the dashboard, so failures
 *     resolve to null and each card decides how to degrade. A card that keeps
 *     showing its last good value is better in a car than a card that empties.
 */
async function get(url, timeout = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    // fetch only rejects on a network error, so a 503 from an endpoint with no
    // credentials configured has to be turned into one by hand.
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[drive] fetch failed:", url, err?.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------- weather */

export const cToF = (c) => (c == null ? null : Math.round((c * 9) / 5 + 32));

export function fetchWeather(lat, lon) {
  return get(`${API_BASE}/patrick/tesla-dashboard-weather?lat=${lat}&lon=${lon}`, 15000);
}

/* Reverse geocode for the "where am I" line under the clock. Nominatim is
 * keyless and CORS-open; it is the only cosmetic source on the page, so a
 * failure just leaves the coordinates showing. */
export async function fetchPlaceName(lat, lon) {
  const data = await get(
    `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lon}`,
    8000,
  );
  const a = data?.address;
  if (!a) return null;
  const city = a.city || a.town || a.village || a.hamlet || a.county;
  const region = a.state_code || a.state;
  return [city, region].filter(Boolean).join(", ") || null;
}

/* ------------------------------------------------------------------ teams */

const scoreOf = (c) => {
  const raw = c?.score?.displayValue ?? c?.score?.value ?? c?.score;
  if (raw == null || raw === "") return null;
  return String(raw);
};

/* The two ESPN endpoints this page reads describe a competitor slightly
 * differently — the single-team endpoint nests logos under `team.logos[]`,
 * the scoreboard flattens it to `team.logo`. Normalise both here so no widget
 * has to know which call it came from. */
function normalizeEvent(ev, cfg) {
  const comp = ev?.competitions?.[0];
  if (!comp) return null;
  const type = comp.status?.type || {};
  const sides = (comp.competitors || []).map((c) => ({
    homeAway: c.homeAway,
    id: c.team?.id,
    abbr: c.team?.abbreviation || c.team?.shortDisplayName,
    name: c.team?.shortDisplayName || c.team?.name || c.team?.displayName,
    logo: c.team?.logos?.[0]?.href || c.team?.logo || null,
    score: scoreOf(c),
    record: c.record?.[0]?.displayValue || c.records?.[0]?.summary || null,
    winner: c.winner === true,
    isUs: String(c.team?.id) === String(cfg.espnId),
  }));
  const us = sides.find((s) => s.isUs) || null;
  const them = sides.find((s) => !s.isUs) || null;
  return {
    id: ev.id,
    date: ev.date,
    state: type.state || "pre", // pre | in | post
    detail: type.shortDetail || type.description || "",
    clock: comp.status?.displayClock || null,
    period: comp.status?.period ?? null,
    link:
      (ev.links || []).find((l) => String(l.href || "").startsWith("http"))?.href ||
      `https://www.espn.com/${cfg.league}/`,
    broadcast: comp.broadcasts?.[0]?.names?.[0] || comp.geoBroadcasts?.[0]?.media?.shortName || null,
    us,
    them,
    atHome: us?.homeAway === "home",
  };
}

/* One small call per team (~8 KB gzipped) for "what is this team's current or
 * next game". ESPN's `nextEvent` here lags — it can still be showing last
 * night's final while today's first pitch is hours away — which is exactly why
 * the scoreboard pass below exists to overwrite it. */
export async function fetchTeamEvents() {
  const results = await Promise.all(
    TEAMS.map(async (cfg) => {
      const data = await get(`${ESPN}/${cfg.sport}/${cfg.league}/teams/${cfg.slug}`);
      const ev = data?.team?.nextEvent?.[0];
      return [cfg.key, ev ? normalizeEvent(ev, cfg) : null];
    }),
  );
  return Object.fromEntries(results);
}

/* Which leagues are worth spending bandwidth on right now: only those where one
 * of these five teams has a game inside a two-day window. Out of season, this
 * returns an empty list and the scoreboard poller does nothing at all. */
export function activeLeagues(events) {
  const now = Date.now();
  const WINDOW = 2 * 24 * 60 * 60 * 1000;
  const keys = new Set();
  TEAMS.forEach((cfg) => {
    const ev = events?.[cfg.key];
    if (!ev) return;
    const t = new Date(ev.date).getTime();
    if (ev.state === "in" || (Number.isFinite(t) && Math.abs(t - now) < WINDOW)) {
      keys.add(`${cfg.sport}/${cfg.league}`);
    }
  });
  return [...keys];
}

const yyyymmdd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/* Which calendar days the scoreboard should be asked about.
 *
 * ALWAYS PASS ?dates=. ESPN's bare /scoreboard was still returning August 25th
 * at 9:51am on August 26th — its idea of "today" rolls over late — so the
 * unqualified call reports last night's final as the current game while
 * tonight's first pitch is nine hours out. The explicit date is also cheaper:
 * ~24 KB gzipped for a full slate, 1 KB when a league has nothing on.
 *
 * Before 4am, yesterday is asked for too: a 9pm start is still in progress
 * after midnight but files under the previous date. */
function dateKeys() {
  const now = new Date();
  const keys = [yyyymmdd(now)];
  if (now.getHours() < 4) {
    keys.push(yyyymmdd(new Date(now.getTime() - 24 * 60 * 60 * 1000)));
  }
  return keys;
}

/* Rank for choosing between two events for the same team: in progress beats
 * upcoming beats finished. */
const statePriority = (state) => (state === "in" ? 3 : state === "pre" ? 2 : 1);

/* Authoritative live scores. Only called for the leagues activeLeagues() picked
 * out. Returns a patch keyed by team, to be merged over the nextEvent data. */
export async function fetchLiveScores(leagueKeys) {
  if (!leagueKeys.length) return {};
  const days = dateKeys();
  const patches = await Promise.all(
    leagueKeys.flatMap((lk) =>
      days.map(async (day) => {
        const board = await get(`${ESPN}/${lk}/scoreboard?dates=${day}`, 15000);
        const events = board?.events || [];
        const out = {};
        TEAMS.filter((c) => `${c.sport}/${c.league}` === lk).forEach((cfg) => {
          const mine = events.find((ev) =>
            (ev.competitions?.[0]?.competitors || []).some(
              (c) => String(c.team?.id) === String(cfg.espnId),
            ),
          );
          if (mine) out[cfg.key] = normalizeEvent(mine, cfg);
        });
        return out;
      }),
    ),
  );
  // Two days can both carry a game for one team; keep the more interesting one.
  return patches.reduce((acc, patch) => {
    Object.entries(patch).forEach(([key, ev]) => {
      if (!acc[key] || statePriority(ev.state) > statePriority(acc[key].state)) {
        acc[key] = ev;
      }
    });
    return acc;
  }, {});
}

/* --------------------------------------------------------------- headlines */

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/* AI headlines from Hacker News, ranked rather than raw-recent: unfiltered
 * `search_by_date` is almost entirely one-point self-promo, so this asks for
 * stories from the last three days with real traction. */
export async function fetchAiNews() {
  const since = Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60;
  const url =
    "https://hn.algolia.com/api/v1/search?tags=story&query=AI" +
    `&numericFilters=points>30,created_at_i>${since}&hitsPerPage=18`;
  const data = await get(url, 10000);
  if (!data?.hits) return null;
  return data.hits
    .map((h) => ({
      id: `hn-${h.objectID}`,
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: hostOf(h.url) || "news.ycombinator.com",
      published: h.created_at,
      meta: `${h.points} pts`,
      image: null,
    }))
    .filter((h) => h.title);
}

const NEWS_FEEDS = [
  { path: "baseball/mlb", tag: "MLB" },
  { path: "football/nfl", tag: "NFL" },
  { path: "football/college-football", tag: "NCAAF" },
  { path: "basketball/nba", tag: "NBA" },
];

export async function fetchSportsNews() {
  const batches = await Promise.all(
    NEWS_FEEDS.map(async (f) => {
      const data = await get(`${ESPN}/${f.path}/news?limit=10`, 12000);
      return (data?.articles || []).map((a) => ({
        id: `espn-${a.id}`,
        title: a.headline,
        url: a.links?.web?.href,
        source: "espn.com",
        published: a.published || a.lastModified,
        meta: f.tag,
        image: (a.images || []).find((i) => i.url)?.url || null,
      }));
    }),
  );
  const all = batches.flat().filter((a) => a.title && a.url);
  if (!all.length) return null;
  const seen = new Set();
  return all
    .filter((a) => (seen.has(a.id) ? false : seen.add(a.id)))
    .sort((a, b) => new Date(b.published) - new Date(a.published));
}

/* ----------------------------------------------------------------- kalshi */

/* Three independent reads, merged. Deliberately Promise.all over calls that
 * each resolve to null rather than a single try/catch: the balance endpoint
 * returning 503 (credentials unset) must not also hide the lifetime record. */
export async function fetchKalshi() {
  const [balance, positions, summary] = await Promise.all([
    get(`${API_BASE}/kalshi/balance`, 15000),
    get(`${API_BASE}/kalshi/positions`, 20000),
    get(`${API_BASE}/kalshi/auto-bets/summary`, 20000),
  ]);

  /* Roughly 3% of parlay legs and 8% of weather rows come back from the
   * enrichment step with no `display` block at all. That is a known upstream
   * quirk, not a bug to fix here — drop those rows from the list but still
   * count what they are worth so the totals stay honest. */
  const raw = positions?.market_positions || [];
  const open = raw
    .filter((p) => p?.display && p.display.status !== "settled")
    .map((p) => ({
      ticker: p.ticker,
      title: p.display.legs?.[0]?.matchup || p.display.title,
      pick: p.display.legs?.[0]?.pick || p.display.side?.toUpperCase(),
      league: p.display.legs?.[0]?.league || null,
      value: Number(p.display.current_value_dollars) || 0,
      cost: Number(p.display.cost_dollars) || 0,
      pnl: Number(p.display.total_pnl_dollars) || 0,
      winPct: p.display.hit_probability ?? p.display.legs?.[0]?.win_pct ?? null,
      legs: p.display.leg_count || 1,
      closeTime: p.display.close_time || null,
      live: (p.display.legs || []).some((l) => l?.game?.state === "in"),
    }))
    .sort((a, b) => b.value - a.value);

  const exposure = raw.reduce(
    (sum, p) => sum + (Number(p?.market_exposure_dollars) || 0),
    0,
  );
  const openPnl = raw.reduce(
    (sum, p) => sum + (Number(p?.display?.total_pnl_dollars) || 0),
    0,
  );

  return {
    ok: Boolean(balance || summary || positions),
    cash: balance ? Number(balance.balance_dollars) : null,
    portfolio: balance?.portfolio_value != null ? balance.portfolio_value / 100 : null,
    exposure,
    openPnl,
    open,
    // Only the enrichment drop-outs, not positions that merely settled.
    hidden: raw.filter((p) => !p?.display).length,
    lifetime: summary?.overall || null,
  };
}

/* ------------------------------------------------------------------ radar */

/* RainViewer publishes an index of recent radar composites; the frames are
 * plain tile URLs, so the loop is animated client-side by swapping layers. */
export async function fetchRadarFrames() {
  const data = await get("https://api.rainviewer.com/public/weather-maps.json", 10000);
  if (!data?.host || !data?.radar?.past?.length) return null;
  const past = data.radar.past.slice(-8);
  const nowcast = (data.radar.nowcast || []).slice(0, 3);
  return [...past, ...nowcast].map((f) => ({
    time: f.time,
    url: `${data.host}${f.path}/256/{z}/{x}/{y}/4/1_1.png`,
    forecast: !past.includes(f),
  }));
}
