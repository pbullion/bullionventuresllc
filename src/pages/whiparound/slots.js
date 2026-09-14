/* THE ROTATION — a port of `slots()`, `currentSlot()` and `pinnedSlot()` from
 * whiparound-firetv's ui/Board.kt. Keep the two in step: the durations, the
 * order, and every stand-down rule below are Patrick's calls recorded there, and
 * a web board that rotates differently from the sticks beside it is a second
 * opinion nobody asked for.
 *
 * ONE DELIBERATE EXCEPTION, web only: while the Cowboys are playing, their
 * stadium board is the whole rotation (Patrick, 2026-09-13, asked for this
 * board by name). The sticks were not asked about and still rotate. Don't port
 * it to Board.kt unasked, and don't delete it here as drift.
 *
 * What still governs it (the long history is in Board.kt):
 *
 *   - The ranking BOARD screen left the rotation on 2026-08-30. It survives only
 *     as the fallback when every other screen stands down, or when a pinned
 *     screen has no data.
 *   - EVERY SCREEN BUT COMING UP STANDS DOWN WHEN IT HAS NOTHING TO SAY —
 *     absent means no — so the fifteen kinds of screen are a ceiling, and an
 *     ordinary day is far fewer. COMING UP says NO GAMES TODAY instead, once
 *     the slate has loaded (2026-09-13).
 *   - FANTASY is one page value standing for one screen PER MATCHUP, told apart
 *     by `index`.
 *   - "Every other lap" (the quiet stadium boards, the college team midweek) is
 *     a LONGER SLOT LIST, not a counter: two laps concatenated.
 *   - Position is derived from elapsed time modulo the cycle, never a counter,
 *     so a cycle that changes length can jump but can never wedge.
 */

import { isSaturdayCentral } from "./format";
import { comingUpToday } from "./screens/SlateLayout";

export const PAGES = [
  "BOARD",
  "WEATHER",
  "TROPICS",
  "RADAR",
  "FANTASY",
  "SURVIVOR",
  "TONIGHT",
  "FINALS",
  "RACE",
  "POLL",
  "CONFERENCES",
  "TEAM",
  "TEAM_2",
  "SCORE_MLB",
  "SCORE_NFL",
  "SCORE_NBA",
];

/// The backend keys its boards by league. Anything it sends that has no screen
/// here is dropped rather than guessed at.
const SCORE_PAGE = { mlb: "SCORE_MLB", nfl: "SCORE_NFL", nba: "SCORE_NBA" };

function slot(page, seconds, index = 0) {
  return { page, seconds, index };
}

export function slots(state, fast = false) {
  /* THE COWBOYS, LIVE, ARE THE WHOLE WALL (Patrick, 2026-09-13: "if the cowboys
   * are playing only show/update that screen, nothing else"). One slot is that
   * screen permanently — position() never moves off it, and skip and pause have
   * nothing to move to — and useBoard polls no other feed until the backend
   * stops calling the game live. `cowboysOnly` is useBoard's, so the rotation
   * and the poll loop cannot disagree about whether the game is on. */
  if (state.cowboysOnly) return [slot("SCORE_NFL", 60)];
  const { slate, cfb, scoreboards, tropics, tracks, fantasy, now, lastSuccess } = state;
  const live = slate.live.length > 0;
  // Out of season there is no college football on the wall at all.
  const cfbOn = cfb != null && cfb.inSeason;
  const collegeSaturday = cfbOn && isSaturdayCentral(now);
  // THEIR day, decided by the backend from the schedule — not "is it Saturday".
  const theirDay = cfbOn && cfb.playsToday;

  const others = [];
  // The tropics first: the one screen that can matter more than the games.
  if (tropics.active) others.push(slot("TROPICS", live ? 40 : 48));
  // The map straight after the words, gated on ITS OWN geometry — never on
  // tropics.active (see the RADAR SCREEN notes in whiparound-firetv/CLAUDE.md).
  if (tracks.any) others.push(slot("RADAR", live ? 30 : 36));
  if (slate.weather?.hasForecast) others.push(slot("WEATHER", live ? 32 : 40));
  // His own leagues ahead of the city's schedule, one screen per matchup in the
  // backend's doubt order. Each list stands down on its own.
  if (fantasy.hasMatchups) {
    fantasy.matchups.forEach((_, i) => others.push(slot("FANTASY", live ? 18 : 24, i)));
  }
  if (fantasy.hasSurvivor) others.push(slot("SURVIVOR", live ? 26 : 34));
  /* COMING UP: TODAY'S GAMES, AND A SENTENCE WHEN THERE ARE NONE (Patrick,
   * 2026-09-13: "if no games, say that"). So it no longer stands down on an
   * empty list — only before the first good slate, because lastSuccess is what
   * tells "no games today" from "starting up", and a board that has not heard
   * from the backend has no business saying either. The sentence gets a short
   * slot: there is one line to read. */
  const today = comingUpToday(slate.upcoming, now);
  if (today.length > 0) others.push(slot("TONIGHT", live ? 30 : 40));
  else if (lastSuccess != null) others.push(slot("TONIGHT", 12));
  if (slate.final.length > 0) others.push(slot("FINALS", live ? 26 : 34));
  if (cfbOn) {
    if (cfb.poll) {
      others.push(slot("POLL", live ? (collegeSaturday ? 44 : 30) : collegeSaturday ? 52 : 40));
    }
    if (cfb.conferences.length > 0) {
      others.push(
        slot("CONFERENCES", live ? (collegeSaturday ? 38 : 26) : collegeSaturday ? 44 : 34),
      );
    }
  }
  // Every lap, live or idle — the only place standings appear at all.
  if (slate.standings || slate.nflStandings) others.push(slot("RACE", live ? 30 : 38));

  // The team page's three volumes: position, length, frequency.
  const teamPages = ["TEAM", "TEAM_2"];
  const teamSeconds = theirDay
    ? live
      ? 56
      : 72
    : collegeSaturday
      ? live
        ? 38
        : 46
      : live
        ? 24
        : 30;
  const teamSlots = cfbOn
    ? cfb.teams.slice(0, teamPages.length).map((_, i) => slot(teamPages[i], teamSeconds))
    : [];

  // The stadium boards, whose volume the BACKEND sets through `relevance`.
  const scoreSeconds = (relevance) => {
    if (relevance === "live") return live ? 44 : 52;
    if (relevance === "today") return live ? 28 : 36;
    if (relevance === "recent") return live ? 24 : 32;
    return live ? 18 : 26;
  };
  const scoreSlots = scoreboards.boards
    .map((b) => (SCORE_PAGE[b.key] ? [b.relevance, slot(SCORE_PAGE[b.key], scoreSeconds(b.relevance))] : null))
    .filter(Boolean);
  const scoreLive = scoreSlots.filter(([r]) => r === "live").map(([, s]) => s);
  const scoreToday = scoreSlots.filter(([r]) => r === "today" || r === "recent").map(([, s]) => s);
  const scoreQuiet = scoreSlots.filter(([r]) => r === "upcoming").map(([, s]) => s);

  const teamEveryLap = theirDay || collegeSaturday;
  const loud = [
    ...scoreLive,
    ...(theirDay ? teamSlots : []),
    ...others,
    ...scoreToday,
    ...(!theirDay && teamEveryLap ? teamSlots : []),
  ];
  const quiet = [...scoreQuiet, ...(!theirDay && !teamEveryLap ? teamSlots : [])];

  /* Nothing in the rotation, or nothing but COMING UP saying there are no games
   * left: a single sentence on a loop is not a rotation. The board shows the
   * live games when there are any and, when there are none, its own COMING UP
   * TODAY panel with the same sentence, so both cases fall back to it. (every()
   * is true of an empty list.) */
  const nothingButNoGames = [...loud, ...quiet].every((s) => s.page === "TONIGHT") && today.length === 0;
  if (nothingButNoGames) return [slot("BOARD", 60)];

  const cycle = quiet.length === 0 ? loud : [...loud, ...quiet, ...loud];
  // `?fast=1` — the web's DEV_FAST_ROTATE. A URL flag rather than a constant,
  // so it cannot be shipped on: a reload without it restores the real lap.
  return fast ? cycle.map((s) => ({ ...s, seconds: 4 })) : cycle;
}

/* Which slot is up, from elapsed time.
 *
 * Returns the slot, its index in the list, and how far into it we are (whole
 * seconds) so the controls can skip. Elapsed is normalised by modulo rather than
 * clamped at zero, because skipping backwards can take it negative. */
export function position(list, elapsedMs) {
  if (list.length === 0) return { slot: slot("BOARD", 0), index: -1, into: 0 };
  // One slot means that screen, permanently.
  if (list.length === 1) return { slot: list[0], index: 0, into: 0 };
  const cycle = list.reduce((sum, s) => sum + s.seconds, 0);
  let into = ((Math.floor(elapsedMs / 1000) % cycle) + cycle) % cycle;
  for (let i = 0; i < list.length; i += 1) {
    if (into < list[i].seconds) return { slot: list[i], index: i, into };
    into -= list[i].seconds;
  }
  return { slot: slot("BOARD", 0), index: -1, into: 0 };
}

/* A pinned name (`?page=SCORE_NFL`) as a slot.
 *
 * The exact page name first, because TEAM_2 is a page of its own. Only then is a
 * trailing `_N` read as a matchup number, counted from ONE — FANTASY_2 is the
 * second matchup and plain FANTASY is the first. An unrecognised name returns
 * null and the ordinary rotation runs: a typo should cost the pin, not the board.
 */
export function pinnedSlot(name) {
  if (!name) return null;
  const upper = name.toUpperCase();
  if (PAGES.includes(upper)) return slot(upper, 0, 0);
  const cut = upper.lastIndexOf("_");
  if (cut < 0) return null;
  // Kotlin's toIntOrNull: an optional sign and digits, nothing else. Number()
  // alone would also accept "0x2", " 2" and "2e0".
  const tail = upper.slice(cut + 1);
  if (!/^[+-]?\d+$/.test(tail)) return null;
  const n = Number(tail);
  const base = upper.slice(0, cut);
  if (n < 1 || !PAGES.includes(base)) return null;
  return slot(base, 0, n - 1);
}

/// Where slot `i` starts, in seconds into the cycle.
export function slotStart(list, i) {
  let start = 0;
  for (let k = 0; k < i; k += 1) start += list[k].seconds;
  return start;
}

/* Where a held slot (`{ listIndex, page, index }`) is in the current list: at
 * its old place if the same screen is still there, otherwise its first
 * occurrence — a screen can appear twice, because the double lap repeats every
 * loud slot. -1 once it has left the rotation. */
export function findSlot(list, ref) {
  const at = list[ref.listIndex];
  if (at && at.page === ref.page && at.index === ref.index) return ref.listIndex;
  return list.findIndex((s) => s.page === ref.page && s.index === ref.index);
}
