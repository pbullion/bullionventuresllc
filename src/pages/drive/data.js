/* Data layer for /drive — the in-car dashboard.
 *
 * EVERY SOURCE HERE IS KEYLESS. That is deliberate: the Tesla browser sits on
 * LTE and this page is meant to be typed into a car and forgotten, so it must
 * not depend on anything that needs a key rotation to keep working. Two of the
 * three original hosts were CORS-verified against this origin before the page
 * was written (ESPN and RainViewer send `access-control-allow-origin: *`;
 * hn.algolia.com echoes this origin back).
 *
 * Sheline backend  -> weather (Apple WeatherKit, already keyed there) + Kalshi
 *                     + stock quotes (see the exception below).
 * site.api.espn.com -> team next/live games and sports headlines.
 * hn.algolia.com    -> AI headlines.
 * api.rainviewer.com -> radar tile index.
 *
 * THE ONE BACKEND ROUTE ADDED SINCE. This file used to say "no new backend
 * route" as well. /quotes broke that, for payload and nothing else: CNBC's
 * chart endpoint is keyless and CORS-open, so the browser CAN call it, but it
 * returns the whole trading day at ~1s resolution — 1,792 bars, 39.6 KB
 * gzipped, per symbol, with no interval parameter that does anything. Seven
 * symbols is ~277 KB every poll to draw seven 90px sparklines. The route
 * downsamples to 40 points server-side and the car pulls ~3.4 KB instead
 * (measured, both numbers). Yahoo would have needed no route at all and does
 * not work: no CORS header for the browser, and it 429s this app's own Heroku
 * dyno. See routes/quotes.js in the backend repo.
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
    fullName: c.team?.displayName || c.team?.name || null,
    logo: c.team?.logos?.[0]?.href || c.team?.logo || null,
    color: c.team?.color ? `#${c.team.color}` : null,
    score: scoreOf(c),
    record: c.record?.[0]?.displayValue || c.records?.[0]?.summary || null,
    /* The scoreboard splits a team's record three ways (overall/home/road);
     * the single-team endpoint carries only the overall one. */
    records: (c.records || []).map((r) => ({
      label: r.name === "overall" ? "Overall" : r.name || r.type,
      value: r.summary || r.displayValue,
    })),
    // Runs per inning / points per quarter. Absent on upcoming games.
    linescores: (c.linescores || []).map((l) => l.displayValue ?? l.value),
    hits: c.hits ?? null,
    errors: c.errors ?? null,
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
    // Every channel carrying it, national and both local feeds, deduped.
    broadcasts: [
      ...new Set((comp.broadcasts || []).flatMap((b) => b.names || [])),
    ],
    venue: comp.venue?.fullName || null,
    venueCity: [comp.venue?.address?.city, comp.venue?.address?.state]
      .filter(Boolean)
      .join(", "),
    note: comp.notes?.[0]?.headline || null,
    odds: comp.odds?.[0]?.details || null,
    overUnder: comp.odds?.[0]?.overUnder ?? null,
    leaders: (comp.leaders || [])
      .map((l) => {
        const top = l.leaders?.[0];
        if (!top) return null;
        return {
          category: l.shortDisplayName || l.displayName,
          who: top.athlete?.shortName || top.athlete?.displayName,
          stat: top.displayValue,
        };
      })
      .filter(Boolean),
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
      description: null,
      author: h.author || null,
      comments: h.num_comments ?? null,
      discussion: `https://news.ycombinator.com/item?id=${h.objectID}`,
      image: null,
    }))
    .filter((h) => h.title);
}

/* True when two strings say the same thing modulo punctuation and case, or when
 * one is just the other with a tail cut off. */
function sameText(a, b) {
  if (!a || !b) return false;
  const norm = (t) =>
    String(t)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const [x, y] = [norm(a), norm(b)];
  return x === y || x.startsWith(y) || y.startsWith(x);
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
        /* ESPN very often sets description to the headline verbatim. Keeping it
         * doubles the row height in the expanded reader to say nothing twice,
         * so only a description that actually adds something survives. */
        description: sameText(a.description, a.headline) ? null : a.description || null,
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
      /* The weather engine's positions all read "HIGH TEMPERATURE" for league,
       * which does not say WHICH city — and the full market title is just the
       * pick restated as a question. The city is the missing fact. */
      city: p.display.weather?.city || null,
      avgPrice: Number(p.display.avg_price_dollars) || null,
      curPrice: Number(p.display.current_price_dollars) || null,
      maxPayout: Number(p.display.max_payout_dollars) || null,
      count: Number(p.display.count) || null,
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
    /* Per league/market-type lifetime rows. Only the expanded view shows these —
     * the card has room for one line, and that line is the overall record. */
    byGroup: (summary?.by_group || [])
      .map((r) => ({
        league: r.league === "?" ? "Other" : r.league,
        marketType: r.market_type === "?" ? "" : r.market_type,
        settled: Number(r.settled) || 0,
        wins: Number(r.wins) || 0,
        losses: Number(r.losses) || 0,
        open: Number(r.open) || 0,
        staked: Number(r.staked) || 0,
        pnl: Number(r.pnl) || 0,
      }))
      .filter((r) => r.settled > 0 || r.open > 0)
      .sort((a, b) => a.pnl - b.pnl),
  };
}

/* ------------------------------------------------------------------ radar */

/* Re-exported, not implemented here. `/gulf-hurricane` draws the same animated
 * RainViewer loop under a hurricane's cone, so the frame index — and the two
 * probed tile-server limits that make it usable — live in `src/lib/rainviewer.js`
 * where both pages read the one copy. Radar.jsx imports this name; keep it. */
export { fetchRadarFrames } from "../../lib/rainviewer.js";

/* ----------------------------------------------------------------- stocks */

/* Display formatters live here rather than in Stocks.jsx because both the card
 * and the full-screen panel need them, and a component file that also exports
 * plain functions breaks react-refresh (eslint enforces it). */

/* Indices run to five figures and need no cents; a $9.96 stock needs both. */
export function price(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function pct(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}%`;
}

/* Indices first, then holdings — the order the card renders them in, and the
 * order Patrick asked for. CNBC prefixes an index with a dot (.IXIC), which is
 * NOT the caret Yahoo uses (^IXIC); passing a caret here returns an empty row
 * rather than an error, so a symbol that silently goes blank is probably this.
 *
 * `label` overrides the upstream name where CNBC's is longer than the row can
 * show at arm's length in a moving car — everything else falls back to the name
 * the quote comes with. */
export const STOCKS = [
  { symbol: ".IXIC", label: "NASDAQ" },
  { symbol: ".SPX", label: "S&P 500" },
  { symbol: ".DJI", label: "Dow Jones" },
  { symbol: "OBK" },
  { symbol: "TSLA" },
  { symbol: "SPCX" },
  { symbol: "DJT" },
];

/* One request for the whole panel. The backend holds a 60s quote cache and a
 * 5-minute chart cache, so polling this faster than once a minute buys nothing
 * and just spends the car's connection. */
export async function fetchStocks() {
  const symbols = STOCKS.map((s) => s.symbol).join(",");
  const data = await get(`${API_BASE}/quotes?symbols=${encodeURIComponent(symbols)}`, 15000);
  if (!data?.quotes?.length) return null;

  const bySymbol = new Map(data.quotes.map((q) => [q.symbol, q]));
  const rows = STOCKS.map((cfg) => {
    const q = bySymbol.get(cfg.symbol) || {};
    return {
      symbol: cfg.symbol,
      /* The ticker as a human reads it: the dot is CNBC's index convention and
       * means nothing to a driver. */
      ticker: cfg.symbol.replace(/^\./, ""),
      label: cfg.label || q.name || cfg.symbol,
      name: q.name || null,
      price: q.price ?? null,
      changePct: q.changePct ?? null,
      prevClose: q.prevClose ?? null,
      spark: Array.isArray(q.spark) ? q.spark : [],
      stale: Boolean(q.stale),
    };
  });

  return { rows, asOf: data.asOf, ok: rows.some((r) => r.price != null) };
}
