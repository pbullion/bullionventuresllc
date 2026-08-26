/* /drive — Patrick's in-car dashboard for the Tesla browser.
 *
 * DESIGN CONSTRAINTS THAT DROVE THIS FILE, none of which are obvious from the
 * markup:
 *
 * 1. THE TAB GETS SUSPENDED. The car sleeps, the browser freezes the page, and
 *    it thaws hours later showing a clock that stopped and scores that are a day
 *    old — which looks identical to live data. Every poller therefore refires on
 *    `visibilitychange`, and a page that has been alive longer than RELOAD_AFTER
 *    hard-reloads on wake so a deploy actually reaches the car.
 * 2. BANDWIDTH IS THE CAR'S LTE. Cadences below are deliberately uneven, and the
 *    heavy ESPN scoreboards are only polled for leagues that currently have one
 *    of these teams playing (see activeLeagues in data.js).
 * 3. THE CLOCK TICKS ON THE MINUTE BOUNDARY, not every second. A once-a-second
 *    setState re-renders the whole board sixty times a minute for a display that
 *    shows no seconds.
 * 4. NOTHING BLOCKS. Every fetch resolves to null on failure and every card
 *    keeps its last good value, because a stale score is useful in a car and a
 *    blank panel is not.
 *
 * Route is public and unauthenticated like the other unlisted tools here — it is
 * read-only, and there are no controls on it that can change anything. */

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import "./drive.css";
import Hero from "./Hero";
import Forecast from "./Forecast";
import Teams from "./Teams";
import News from "./News";
import Kalshi from "./Kalshi";
import { RefreshIcon } from "./icons";
import {
  FALLBACK_COORDS,
  activeLeagues,
  fetchAiNews,
  fetchKalshi,
  fetchLiveScores,
  fetchPlaceName,
  fetchRadarFrames,
  fetchSportsNews,
  fetchTeamEvents,
  fetchWeather,
} from "./data";

/* Leaflet only loads for whoever actually opens this page. */
const Radar = React.lazy(() => import("./Radar"));

const MIN = 60 * 1000;
const WEATHER_EVERY = 10 * MIN;
const TEAMS_EVERY = 15 * MIN;
const SCORES_EVERY = 45 * 1000;
const SCORES_EVERY_LIVE = 25 * 1000;
const NEWS_EVERY = 10 * MIN;
const KALSHI_EVERY = MIN;
const RADAR_EVERY = 5 * MIN;
const RELOAD_AFTER = 12 * 60 * MIN;

/* Roughly 2 miles. Below this the weather and the radar frame do not change, so
 * following the car more closely just burns requests on a highway. */
const MOVED_ENOUGH_DEG = 0.03;

/* Interval that also fires immediately, refires when the tab wakes, and cleans
 * itself up. Every data source on this page is one of these. */
function usePoll(fn, ms, deps) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  });

  useEffect(() => {
    let alive = true;
    /* `force` exists for the mount call. A page can be loaded into a background
     * tab — which is exactly what happens when the car restores the browser on
     * wake — and a first paint with no data at all is worse than one stale
     * fetch. Only the interval ticks respect visibility. */
    const run = (force) => {
      if (alive && (force || document.visibilityState !== "hidden")) saved.current();
    };
    run(true);
    const id = setInterval(() => run(false), ms);
    const onVisible = () => {
      if (document.visibilityState === "visible") run(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}

function Drive() {
  const [now, setNow] = useState(() => new Date());
  const [coords, setCoords] = useState(FALLBACK_COORDS);
  const [place, setPlace] = useState(null);
  const [weather, setWeather] = useState(null);
  const [events, setEvents] = useState({});
  const [ai, setAi] = useState(undefined);
  const [sports, setSports] = useState(undefined);
  const [kalshi, setKalshi] = useState(null);
  const [frames, setFrames] = useState(null);
  const [lastOk, setLastOk] = useState(null);
  const [busy, setBusy] = useState(false);
  const bootedAt = useRef(0);

  /* Inter, if it loads. The Tesla browser is a Chromium build with a thin font
   * set, and its default sans is noticeably worse than everything else here —
   * but the stack in drive.css degrades cleanly, so this is an upgrade, never a
   * dependency. */
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800&display=swap";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  // Tick exactly on the minute rather than once a second. See note 3 above.
  useEffect(() => {
    let id;
    const schedule = () => {
      const d = new Date();
      setNow(d);
      id = setTimeout(schedule, 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 40);
    };
    schedule();
    return () => clearTimeout(id);
  }, []);

  /* A page left open in a car is never closed, so it would otherwise serve a
   * months-old bundle forever. Reload on the first wake after RELOAD_AFTER —
   * on wake specifically, so it never blanks a screen being looked at. */
  useEffect(() => {
    bootedAt.current = Date.now();
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - bootedAt.current > RELOAD_AFTER
      ) {
        window.location.reload();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  /* Follow the car. watchPosition rather than a single fix, because the useful
   * version of this page is the one that shows the weather where he is now, not
   * where he started. Denied or unsupported leaves the Houston fallback. */
  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    const apply = (pos) => {
      const { latitude, longitude } = pos.coords;
      setCoords((prev) =>
        Math.abs(prev.lat - latitude) > MOVED_ENOUGH_DEG ||
        Math.abs(prev.lon - longitude) > MOVED_ENOUGH_DEG ||
        prev === FALLBACK_COORDS
          ? { lat: Number(latitude.toFixed(4)), lon: Number(longitude.toFixed(4)) }
          : prev,
      );
    };
    const onErr = (err) => console.warn("[drive] geolocation:", err?.message);
    navigator.geolocation.getCurrentPosition(apply, onErr, { timeout: 15000, maximumAge: 300000 });
    const id = navigator.geolocation.watchPosition(apply, onErr, {
      enableHighAccuracy: false,
      maximumAge: 300000,
      timeout: 30000,
    });
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const markOk = useCallback(() => setLastOk(Date.now()), []);

  usePoll(
    async () => {
      const data = await fetchWeather(coords.lat, coords.lon);
      if (data) {
        setWeather(data);
        markOk();
      }
    },
    WEATHER_EVERY,
    [coords.lat, coords.lon, markOk],
  );

  useEffect(() => {
    let alive = true;
    fetchPlaceName(coords.lat, coords.lon).then((name) => {
      if (alive && name) setPlace(name);
    });
    return () => {
      alive = false;
    };
  }, [coords.lat, coords.lon]);

  usePoll(
    async () => {
      const next = await fetchTeamEvents();
      // Merge rather than replace: a league that failed keeps its last state.
      if (next) setEvents((prev) => ({ ...prev, ...next }));
    },
    TEAMS_EVERY,
    [],
  );

  const leagues = activeLeagues(events);
  const anyLive = Object.values(events).some((e) => e?.state === "in");

  usePoll(
    async () => {
      if (!leagues.length) return;
      const patch = await fetchLiveScores(leagues);
      if (patch && Object.keys(patch).length) setEvents((prev) => ({ ...prev, ...patch }));
    },
    anyLive ? SCORES_EVERY_LIVE : SCORES_EVERY,
    [leagues.join(","), anyLive],
  );

  usePoll(
    async () => {
      const [a, s] = await Promise.all([fetchAiNews(), fetchSportsNews()]);
      setAi(a);
      setSports(s);
      if (a || s) markOk();
    },
    NEWS_EVERY,
    [markOk],
  );

  usePoll(
    async () => {
      const data = await fetchKalshi();
      if (data?.ok) {
        setKalshi(data);
        markOk();
      }
    },
    KALSHI_EVERY,
    [markOk],
  );

  usePoll(
    async () => {
      const f = await fetchRadarFrames();
      if (f) setFrames(f);
    },
    RADAR_EVERY,
    [],
  );

  /* The refresh button. Same code paths as the pollers, just all at once —
   * there is no separate "manual" fetch to drift out of sync. */
  const refreshAll = useCallback(async () => {
    setBusy(true);
    const [w, ev, a, s, k, f] = await Promise.all([
      fetchWeather(coords.lat, coords.lon),
      fetchTeamEvents(),
      fetchAiNews(),
      fetchSportsNews(),
      fetchKalshi(),
      fetchRadarFrames(),
    ]);
    if (w) setWeather(w);
    if (ev) setEvents((prev) => ({ ...prev, ...ev }));
    setAi(a);
    setSports(s);
    if (k?.ok) setKalshi(k);
    if (f) setFrames(f);
    markOk();
    setBusy(false);
  }, [coords.lat, coords.lon, markOk]);

  /* Night dims the board. Prefer the real sunset from WeatherKit; fall back to
   * clock hours when the forecast has not arrived yet. */
  const today = weather?.forecastDaily?.days?.[0];
  const isNight =
    today?.sunset && today?.sunrise ?
      now >= new Date(today.sunset) || now <= new Date(today.sunrise)
    : now.getHours() >= 20 || now.getHours() < 7;

  // Derived from the minute tick rather than Date.now(), so it stays a pure render.
  const ageMin = lastOk == null ? null : Math.max(0, Math.round((now.getTime() - lastOk) / MIN));

  return (
    <div className={`drive${isNight ? " is-night" : ""}`}>
      <div className="dstatus">
        {ageMin != null && ageMin >= 3 && (
          <span className="dstatus__age">{ageMin}m old</span>
        )}
        <button
          type="button"
          className={`dbtn${busy ? " is-spinning" : ""}`}
          onClick={refreshAll}
          aria-label="Refresh"
        >
          <RefreshIcon />
        </button>
      </div>

      <Hero now={now} weather={weather} place={place} />

      <div className="drow drow--top">
        <Forecast weather={weather} />
        <Suspense
          fallback={
            <section className="dcard">
              <div className="dcard__head">
                <span className="dcard__title">Radar</span>
              </div>
              <div className="dempty">Loading radar…</div>
            </section>
          }
        >
          <Radar coords={coords} frames={frames} />
        </Suspense>
        <Teams events={events} stale={ageMin != null && ageMin > 20} />
      </div>

      <div className="drow drow--bottom">
        <News ai={ai} sports={sports} />
        <Kalshi data={kalshi} />
      </div>
    </div>
  );
}

export default Drive;
