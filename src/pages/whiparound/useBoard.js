/* The poll loop — a port of whiparound-firetv's BoardState.kt and Api.kt.
 *
 * ONE MORE CLIENT OF THE SHARED BACKEND, ON THE STICKS' OWN CLOCKS. Every
 * interval below is the Fire TV's, and each was matched to a server cache: a
 * browser tab on a monitor costs the dyno exactly what one more stick does, and
 * asking faster than the cache gets the same bytes back. Rule 4 of the folder's
 * CLAUDE.md — one slow query takes every project down — is why none of these
 * are shorter.
 *
 * What carries over, and why:
 *   - The slate (/whiparound/games) is the only fetch that sets `lastError` and
 *     the staleness clock. Every other feed keeps its LAST GOOD COPY on failure
 *     and never makes a working board look broken.
 *   - The stadium boards and fantasy pick their own interval off the PREVIOUS
 *     response's `live` flag.
 *   - The radar screen's geometry (/nhc/current-storms) is fetched on its own
 *     and is NOT gated on /whiparound/tropics. RainViewer is only asked once
 *     there is a storm to draw rain over. Neither is ever mocked.
 *   - `?mock=1` replaces the stadium boards, fantasy and the tropics whole and
 *     overlays the CFB team. THE SLATE IS NEVER MOCKED.
 *
 * What is different, because a browser is not a stick: polling pauses while the
 * tab is hidden and resumes with an immediate fetch when it comes back, and the
 * independent feeds are fetched in parallel instead of one after another.
 */

import { useEffect, useState } from "react";
import { EMPTY_SLATE, parseSlate } from "./models/slate";
import { mockCfb, parseCfb } from "./models/cfb";
import { EMPTY_SCOREBOARDS, mockScoreboards, parseScoreboards } from "./models/scoreboards";
import { EMPTY_TROPICS, mockTropics, parseTropics } from "./models/tropics";
import { EMPTY_TRACKS, parseTracks } from "./models/tracks";
import { parseRadarFrame } from "./models/radar";
import { EMPTY_FANTASY, mockFantasy, parseFantasy } from "./models/fantasy";

const API = "https://sheline-art-website-api.herokuapp.com";
const RAINVIEWER = "https://api.rainviewer.com/public/weather-maps.json";

export const POLL_SECONDS = 10;
/// Every 30 polls (5 min) against a 10-minute server cache.
const CFB_EVERY = 30;
/// Every 60 polls (10 min), matching the server cache exactly.
const TROPICS_EVERY = 60;
/// Every 60 polls. ~45-120 KB, so this interval is about the BYTES.
const TRACKS_EVERY = 60;
/// Every 30 polls, and only while there is a storm to draw over.
const RADAR_EVERY = 30;
/// Every 30 polls when nothing is live; every poll while a board is.
const SCOREBOARD_EVERY = 30;
/// 60s while a game is IN PROGRESS, 10 minutes otherwise — the backend's caches.
const FANTASY_EVERY = 6;
const FANTASY_EVERY_IDLE = 60;
/// A live game whose excitement score jumped this much since the last poll.
const CLIMB_THRESHOLD = 15;

/// The backend's own ESPN timeout is 8s; past 9 it is the network.
const DEFAULT_TIMEOUT_MS = 9_000;
/// Fantasy is a four-hop chain on a cold cache — see Api.kt.
const FANTASY_TIMEOUT_MS = 15_000;

async function getJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const INITIAL = {
  slate: EMPTY_SLATE,
  cfb: null,
  scoreboards: EMPTY_SCOREBOARDS,
  tropics: EMPTY_TROPICS,
  tracks: EMPTY_TRACKS,
  fantasy: EMPTY_FANTASY,
  radar: null,
  // Null until the first good slate: "starting up" and "nothing on" look alike.
  lastSuccess: null,
  lastError: null,
  climbing: new Set(),
};

export function useBoard({ mock }) {
  const [data, setData] = useState(INITIAL);
  const [clock, setClock] = useState({ now: 0, startedAt: 0 });

  // The one-second clock the rotation, the age label and the stale rail read.
  useEffect(() => {
    const startedAt = Date.now();
    const first = setTimeout(() => setClock({ now: Date.now(), startedAt }), 0);
    const id = setInterval(() => setClock({ now: Date.now(), startedAt }), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let timer = null;
    let running = false;
    let resumeOnVisible = false;
    let tick = 0;
    // What the next poll decides from. Loop-local, so deciding never waits on
    // a render.
    const mem = {
      cfb: null,
      scoreboardsLive: false,
      tracksAny: false,
      fantasyLive: false,
      previousScores: new Map(),
    };
    const merge = (patch) => {
      if (alive) setData((d) => ({ ...d, ...patch }));
    };

    const poll = async () => {
      // Tick 0 satisfies every modulo, so every feed lands on the first poll.
      const t = tick;
      tick += 1;
      const jobs = [];

      if (t % TROPICS_EVERY === 0) {
        if (mock) merge({ tropics: mockTropics() });
        else {
          jobs.push(
            getJson(`${API}/whiparound/tropics`)
              .then((j) => merge({ tropics: parseTropics(j) }))
              .catch(() => {}),
          );
        }
      }

      const tracksJob =
        !mock && t % TRACKS_EVERY === 0
          ? getJson(`${API}/nhc/current-storms`)
              .then((j) => {
                // parseTracks THROWS on an `error` payload, so a cold-cache NHC
                // outage keeps the last advisory instead of reading as calm.
                const tracks = parseTracks(j);
                mem.tracksAny = tracks.any;
                merge({ tracks });
              })
              .catch(() => {})
          : Promise.resolve();
      jobs.push(tracksJob);
      if (!mock && t % RADAR_EVERY === 0) {
        jobs.push(
          tracksJob
            .then(() =>
              mem.tracksAny
                ? getJson(RAINVIEWER).then((j) => merge({ radar: parseRadarFrame(j) }))
                : null,
            )
            // Keep the last frame; its own timestamp is on screen.
            .catch(() => {}),
        );
      }

      if (t % CFB_EVERY === 0) {
        jobs.push(
          getJson(`${API}/whiparound/cfb`)
            .then((j) => {
              mem.cfb = parseCfb(j);
            })
            .catch(() => {})
            .then(() => {
              // The overlay rides on whatever the real fetch produced, including
              // nothing — the poll and conferences stay real.
              if (mock) mem.cfb = mockCfb(mem.cfb);
              merge({ cfb: mem.cfb });
            }),
        );
      }

      if (mock) {
        // Not fetched at all: nothing real would survive the replacement, and it
        // is the heaviest endpoint the backend has.
        merge({ scoreboards: mockScoreboards() });
      } else if (mem.scoreboardsLive || t % SCOREBOARD_EVERY === 0) {
        jobs.push(
          getJson(`${API}/whiparound/scoreboards`)
            .then((j) => {
              const scoreboards = parseScoreboards(j);
              mem.scoreboardsLive = scoreboards.live;
              merge({ scoreboards });
            })
            .catch(() => {}),
        );
      }

      const fantasyEvery = mem.fantasyLive ? FANTASY_EVERY : FANTASY_EVERY_IDLE;
      if (t % fantasyEvery === 0) {
        if (mock) {
          const fantasy = mockFantasy();
          mem.fantasyLive = fantasy.live;
          merge({ fantasy });
        } else {
          jobs.push(
            getJson(`${API}/whiparound/fantasy`, FANTASY_TIMEOUT_MS)
              .then((j) => {
                // parseFantasy THROWS when a league failed and nothing else came
                // back, so the last good lineup stays on the wall.
                const fantasy = parseFantasy(j);
                mem.fantasyLive = fantasy.live;
                merge({ fantasy });
              })
              .catch(() => {}),
          );
        }
      }

      jobs.push(
        getJson(`${API}/whiparound/games`)
          .then((j) => {
            const slate = parseSlate(j);
            const scores = new Map(
              slate.live.filter((g) => g.score != null).map((g) => [g.id, g.score]),
            );
            // Only a game present in BOTH polls can be said to have climbed — a
            // game that just went live has no previous score.
            const climbing = new Set();
            for (const [id, score] of scores) {
              const was = mem.previousScores.get(id);
              if (was != null && score - was >= CLIMB_THRESHOLD) climbing.add(id);
            }
            mem.previousScores = scores;
            merge({ slate, climbing, lastSuccess: Date.now(), lastError: null });
          })
          // The previous slate stays on screen; the stale rail says so.
          .catch((e) =>
            merge({
              lastError: e?.name === "AbortError" ? "timed out" : e?.message || "request failed",
            }),
          ),
      );

      await Promise.all(jobs);
    };

    const run = async () => {
      if (!alive || running) return;
      if (document.visibilityState === "hidden") {
        resumeOnVisible = true;
        return;
      }
      running = true;
      try {
        await poll();
      } finally {
        running = false;
      }
      if (alive) timer = setTimeout(run, POLL_SECONDS * 1000);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && resumeOnVisible) {
        resumeOnVisible = false;
        run();
      }
    };

    timer = setTimeout(run, 0);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mock]);

  return { ...data, now: clock.now, startedAt: clock.startedAt, mock };
}
