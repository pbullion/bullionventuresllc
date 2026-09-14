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
 * What is the web board's alone: WHILE THE COWBOYS PLAY, THE STADIUM BOARDS ARE
 * THE ONLY FEED (Patrick, 2026-09-13: "only show/update that screen, nothing
 * else"). Every other feed stops until the Cowboys' own board says the game is
 * over, and the poll that sees the final whistle carries on as a full round, the
 * way a page load does, before the rotation gets the wall back.
 *
 * What is different, because a browser is not a stick: polling pauses while the
 * tab is hidden and resumes with an immediate fetch when it comes back, and the
 * independent feeds are fetched in parallel instead of one after another.
 */

import { useEffect, useState } from "react";
import { isObj } from "./models/wire";
import { EMPTY_SLATE, parseSlate } from "./models/slate";
import { mockCfb, parseCfb } from "./models/cfb";
import {
  EMPTY_SCOREBOARDS,
  cowboysInGames,
  cowboysPhase,
  mockScoreboards,
  parseScoreboards,
} from "./models/scoreboards";
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
/// Takeover polls in a row with no board saying live or over — a failed fetch,
/// a payload missing the football board, a pregame board still cached past
/// kickoff — before the slate is asked, once, whether the Cowboys are still on.
const TAKEOVER_UNSURE_CHECK = 6;

/// The backend's own ESPN timeout is 8s; past 9 it is the network.
const DEFAULT_TIMEOUT_MS = 9_000;
/// Fantasy is a four-hop chain on a cold cache — see Api.kt.
const FANTASY_TIMEOUT_MS = 15_000;

/* Every feed this board reads answers with a JSON OBJECT. Anything else — an
 * array, a bare string, a proxy's error text that happens to parse — is thrown
 * here, the way `JSONObject(text)` throws on the stick, so it lands in each
 * feed's catch and the last good copy stays on the wall instead of a 200 with a
 * nonsense body quietly emptying a screen (and, for the slate, counting as a
 * successful poll). */
async function getJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (!isObj(body)) throw new Error("response is not a JSON object");
    return body;
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
  // The last good /whiparound/scoreboards. While the Cowboys hold the wall it is
  // the only feed polled, so it — not the slate — is what the stale rail reads.
  scoreboardsAt: null,
  // The Cowboys hold the wall. Set by the poll loop, never derived from a
  // payload, so the rotation cannot disagree with what is being polled.
  cowboysOnly: false,
  climbing: new Set(),
};

/* `cowboysTakeover` is off for a pinned page: a pin is how one screen gets
 * inspected, and inspecting FANTASY_2 during a Cowboys game must not freeze its
 * data. Mock is never taken over either — its fixture has the Cowboys live
 * permanently, and the preview exists to walk every screen. */
export function useBoard({ mock, cowboysTakeover = true }) {
  const takeover = cowboysTakeover && !mock;
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
    let hiddenAt = 0;
    let tick = 0;
    // What the next poll decides from. Loop-local, so deciding never waits on
    // a render.
    const mem = {
      cfb: null,
      scoreboardsLive: false,
      tracksAny: false,
      fantasyLive: false,
      previousScores: new Map(),
      // The Cowboys hold the wall: poll their board and nothing else.
      cowboysOnly: false,
      // The slate has the Cowboys in progress — ask for the boards every poll.
      cowboysOnSlate: false,
      // The last stadium boards that parsed; what a takeover starts from.
      scoreboards: null,
      // Takeover polls in a row with no board saying live or over.
      unsure: 0,
    };
    const merge = (patch) => {
      if (alive) setData((d) => ({ ...d, ...patch }));
    };

    // Parsed, or null on any failure — each caller decides what a miss means.
    const getScoreboards = () =>
      getJson(`${API}/whiparound/scoreboards`)
        .then(parseScoreboards)
        .catch(() => null);

    const takeScoreboards = (scoreboards) => {
      mem.scoreboards = scoreboards;
      mem.scoreboardsLive = scoreboards.live;
      merge({ scoreboards, scoreboardsAt: Date.now() });
    };

    /* THE TAKEOVER POLL: the stadium boards and nothing else. Resolves null while
     * the takeover holds, and `{ scoreboards }` (possibly null) once it is over.
     *
     * ONLY POSITIVE EVIDENCE ENDS IT. The backend answers 200 without a live
     * Cowboys board in the middle of a game: a timed-out ESPN summary drops the
     * board for its five-minute idle cache, and a failed league feed relabels a
     * game in progress "recent". Read as the final whistle, either put the whole
     * rotation back on the wall in the second quarter. So a failed fetch, a
     * missing board and a pregame board still cached past kickoff all HOLD —
     * the last good Cowboys board stays up under the stale rail — and only
     * their board saying "post", or being another team's, ends it. A minute of
     * that uncertainty asks the slate once, so a stadium-boards outage cannot
     * hold the wall on a game that finished hours ago. */
    const takeoverPoll = async () => {
      const sb = await getScoreboards();
      const phase = cowboysPhase(sb);
      if (phase === "live" || phase === "pre") takeScoreboards(sb);
      if (phase === "live") {
        mem.unsure = 0;
        return null;
      }
      if (phase !== "over") {
        mem.unsure += 1;
        if (mem.unsure % TAKEOVER_UNSURE_CHECK !== 0) return null;
        const slate = await getJson(`${API}/whiparound/games`)
          .then(parseSlate)
          .catch(() => null);
        // No slate, a failed NFL feed inside it, or the Cowboys still on: hold.
        if (slate == null || slate.errors.nfl || cowboysInGames(slate.live)) return null;
      }
      return { scoreboards: sb };
    };

    /* START THE TAKEOVER as soon as a feed lands that proves it: the Cowboys'
     * board live — or, for the first minutes of a game while the backend still
     * serves the pregame board it cached before kickoff, that pregame board with
     * the slate saying the game is on. Checked as each of those two feeds lands,
     * not after the whole round: a cold fantasy fetch takes up to 15s, and a page
     * loaded mid-game should not rotate for that long. */
    const maybeStart = () => {
      if (!takeover || !alive || mem.cowboysOnly) return;
      const phase = cowboysPhase(mem.scoreboards);
      if (phase === "live" || (phase === "pre" && mem.cowboysOnSlate)) {
        mem.cowboysOnly = true;
        mem.unsure = 0;
        merge({ cowboysOnly: true });
      }
    };

    const poll = async () => {
      /* The game is over. Every other feed is as old as it is, so this poll
       * runs a full round from tick 0 — and the wall is handed back only once
       * that round's slate has landed, so the rotation never comes back on
       * pre-kickoff data under a red rail. The live-score memory is from before
       * kickoff too: a game live on both sides of the break has not climbed. */
      let handBack = null;
      if (mem.cowboysOnly) {
        handBack = await takeoverPoll();
        if (handBack == null || !alive) return;
        mem.cowboysOnly = false;
        mem.unsure = 0;
        mem.scoreboards = handBack.scoreboards;
        tick = 0;
        mem.previousScores = new Map();
      }
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
      } else if (
        handBack?.scoreboards == null &&
        // The slate saw the Cowboys kick off: ask now, not on the next
        // five-minute tick, so the takeover starts with the game.
        (mem.scoreboardsLive || mem.cowboysOnSlate || t % SCOREBOARD_EVERY === 0)
      ) {
        jobs.push(
          getScoreboards().then((sb) => {
            if (sb) takeScoreboards(sb);
            // Not mid-hand-back: that flips cowboysOnly itself, after the slate.
            if (handBack == null) maybeStart();
          }),
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

      const slateJob = getJson(`${API}/whiparound/games`)
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
          mem.cowboysOnSlate = takeover && cowboysInGames(slate.live);
          merge({ slate, climbing, lastSuccess: Date.now(), lastError: null });
          if (handBack == null) maybeStart();
        })
        // The previous slate stays on screen; the stale rail says so.
        .catch((e) =>
          merge({
            lastError: e?.name === "AbortError" ? "timed out" : e?.message || "request failed",
          }),
        );
      jobs.push(slateJob);

      if (handBack) {
        await slateJob;
        if (!alive) return;
        const sb = handBack.scoreboards;
        if (sb) mem.scoreboardsLive = sb.live;
        merge(sb ? { cowboysOnly: false, scoreboards: sb, scoreboardsAt: Date.now() } : { cowboysOnly: false });
      }
      await Promise.all(jobs);
      // The hand-back poll's only chance to start one; a no-op if a feed already did.
      maybeStart();
    };

    const run = async () => {
      if (!alive || running) return;
      if (document.visibilityState === "hidden") {
        if (!resumeOnVisible) hiddenAt = Date.now();
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

    /* THE SLOW FEEDS' CLOCKS STOP WHILE HIDDEN. `tick` only advances inside
     * poll(), so a board hidden overnight (screen lock, display sleep) would
     * wake on a tick that is not a multiple of 30 or 60 and keep last night's
     * CFB, fantasy, tropics and storm geometry for up to ten more minutes — with
     * the stale rail off, because the slate did refresh. Hidden for at least the
     * slowest interval, the resume poll starts again from tick 0, which every
     * modulo satisfies: one full round, the same as a page load. A shorter
     * absence costs nothing extra. */
    const onVisibility = () => {
      if (document.visibilityState === "visible" && resumeOnVisible) {
        resumeOnVisible = false;
        if (Date.now() - hiddenAt >= TROPICS_EVERY * POLL_SECONDS * 1000) tick = 0;
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
  }, [mock, takeover]);

  return {
    ...data,
    now: clock.now,
    startedAt: clock.startedAt,
    mock,
    cowboysOnly: takeover && data.cowboysOnly,
  };
}
