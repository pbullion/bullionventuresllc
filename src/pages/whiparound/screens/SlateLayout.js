/* The rules behind COMING UP and FINAL TODAY that are not components — the
 * league blocks, the height budget, the channel names. Ported from
 * whiparound-firetv's ui/Slate.kt (everything above RaceScreen); Slate.jsx
 * draws with them. Kept in a .js so that file exports only components.
 *
 * The long argument for cards in league blocks is in that repo's CLAUDE.md,
 * "COMING UP AND FINAL TODAY ARE CARDS IN LEAGUE BLOCKS". The parts that bite
 * are commented where they live below.
 */

import { startMillis } from "../format";

/* FINAL TODAY's block order, and deliberately NOT COMING UP's.
 *
 * Never by size: a league's count changes every time a game goes final, and
 * blocks that swap places under a one-second glance are worse than a boring
 * order. COMING UP is chronological (a schedule whose top block starts Tuesday
 * above one that starts tonight is not a schedule); the finals list is
 * most-recent-first, so "first in the list" there would reshuffle the blocks
 * every few minutes — hence this fixed order, the backend's own LEAGUES. */
export const LEAGUE_ORDER = ["mlb", "nfl", "cfb", "nba", "cbb", "nhl"];

/* FOUR CARDS TO A ROW is a floor on card WIDTH, not a taste in density. The
 * longest matchup ESPN publishes ("UAPB at TNST") is ~310pt; four to a row is
 * ~430 of content each, five would be ~360 and the matchup — the one thing on
 * the card that must never abbreviate further — starts ellipsizing on exactly
 * the college games whose names are already unfamiliar. */
export const PER_ROW = 4;

/// Natural card height: two text lines plus padding. Short slates grow cards up
/// to CARD_MAX — a two-line card stretched to a third of the screen looks like
/// a rendering fault, not a design.
export const CARD_MIN = 96;
export const CARD_MAX = 132;

/* THE HEIGHT ARITHMETIC IS EXACT, and every piece of it is a fixed number. The
 * first version guessed a heading "at about 46pt", forgot the spacing between a
 * heading and its cards, fitted by luck at two blocks and silently drew the
 * last line off the bottom at four. Change the heading type, change HEAD. */
export const GAP = 10; // between cards, both ways
export const HEAD_GAP = 8; // heading to its cards
export const BLOCK_GAP = 16; // block to block, and to the ALSO line
export const HEAD = 44; // BlockHeading's fixed height
export const NOTE = 36; // the ALSO line's fixed height

/// The screen title's gap to the blocks (the outer Column's spacedBy).
export const TITLE_GAP = 12;

/* THE CHANNEL, AT ITS ON-AIR LENGTH. ESPN spells out "ACC NETWORK", and at 22pt
 * in a chip that took the room the kickoff needed — two cards on 2026-09-12 read
 * "TOMORROW · 11:0…". ACCN, SECN, BTN are what the networks call themselves on
 * air. The rule is general because the conference-channel list is not stable:
 * one word gains an N, several collapse to initials (BIG TEN NETWORK -> BTN). */
export function shortChannel(raw) {
  const name = raw.trim().toUpperCase();
  if (!name.endsWith(" NETWORK")) return name;
  const stem = name.slice(0, -" NETWORK".length);
  const words = stem.split(/[ -]/).filter((w) => w !== "");
  let short;
  if (words.length === 0) short = name;
  else if (words.length === 1) short = `${words[0]}N`;
  else short = `${words.map((w) => w.slice(0, 1)).join("")}N`;
  // A "shortening" that is not shorter is just a different spelling.
  return short.length < name.length ? short : name;
}

/// Imminent = kicks off before midnight Central at the end of tomorrow. An
/// unparseable start is not imminent — it renders as a later fixture.
export function isImminent(game, cutoff) {
  const ms = startMillis(game);
  return ms != null && ms < cutoff;
}

/* "FINAL/OT" ONLY. ESPN distinguishes Final from Final/OT and only the
 * exception is information; a plain "Final" on every card repeated the screen's
 * own heading twenty-seven times down the right-hand edge. */
export function finalTag(game) {
  const s = game.status;
  return s != null && s.toLowerCase() !== "final" ? s.toUpperCase() : null;
}

/* One block per league. `groupBy` order is first appearance, which for COMING
 * UP (the backend sorts by kickoff) is exactly "where each league's first game
 * falls". A league the fixed order does not know goes last rather than
 * disappearing. */
export function groupBlocks(games, chronological) {
  const byKey = new Map();
  for (const g of games) {
    if (!byKey.has(g.league)) byKey.set(g.league, []);
    byKey.get(g.league).push(g);
  }
  const blocks = [...byKey].map(([key, list]) => ({
    key,
    label: list[0].leagueLabel || key.toUpperCase(),
    games: list,
  }));
  if (chronological) return blocks;
  const rank = (key) => {
    const i = LEAGUE_ORDER.indexOf(key);
    return i < 0 ? LEAGUE_ORDER.length : i;
  };
  // Array sort is stable, as Kotlin's sortedBy is.
  return blocks.sort((a, b) => rank(a.key) - rank(b.key));
}

/* Hand `total` card rows out to the blocks. Every block gets one before any gets
 * two — "no NFL games" and "the NFL block did not fit" look identical on a wall
 * and only one is true. After that each row goes to whichever block hides the
 * most games (ties to the earlier block), which converges on room in proportion
 * to each slate without computing a proportion. */
export function allocate(sizes, total) {
  const rows = sizes.map(() => 0);
  let left = total;
  // Too small a budget for every block: the ones the order puts first win, so
  // the wall does not reshuffle.
  for (let i = 0; i < sizes.length && left > 0; i += 1) {
    rows[i] = 1;
    left -= 1;
  }
  while (left > 0) {
    let hungriest = -1;
    let most = 0;
    sizes.forEach((size, i) => {
      const hidden = size - rows[i] * PER_ROW;
      if (hidden > most) {
        most = hidden;
        hungriest = i;
      }
    });
    if (hungriest < 0) break;
    rows[hungriest] += 1;
    left -= 1;
  }
  return rows;
}

/* The budget, from the height the blocks were actually given:
 *
 *   total = Σ(HEAD + HEAD_GAP + rows·h + (rows-1)·GAP)
 *         + BLOCK_GAP·(drawn-1)
 *         + (BLOCK_GAP + NOTE, when a league did not fit)
 *
 * MORE LEAGUES THAN ROWS: about five blocks fit and in December six leagues
 * play. Find the largest number of blocks that can each hold one row at
 * CARD_MIN, name the rest in the ALSO line, and stop charging the layout for
 * the headings no longer drawn — which is why this is a loop and not one
 * subtraction. Then let rows grow to CARD_MAX when the slate is short.
 *
 * Returns { rows: rows per block (0 = named in ALSO), rowHeight }. */
export function layoutBlocks(blocks, maxHeight) {
  const room = (drawn) =>
    maxHeight -
    (HEAD + HEAD_GAP) * drawn -
    BLOCK_GAP * (drawn - 1) -
    (drawn < blocks.length ? BLOCK_GAP + NOTE : 0);

  let drawn = blocks.length;
  let maxRows;
  for (;;) {
    // used·CARD_MIN + (used - drawn)·GAP <= room, solved for used.
    const f = Math.trunc((room(drawn) + GAP * drawn) / (CARD_MIN + GAP));
    if (f >= drawn || drawn === 1) {
      maxRows = Math.max(1, f);
      break;
    }
    drawn -= 1;
  }

  // Only the drawn blocks compete for rows; the rest get none.
  const rows = blocks.map(() => 0);
  allocate(
    blocks.slice(0, drawn).map((b) => b.games.length),
    maxRows,
  ).forEach((r, i) => {
    rows[i] = r;
  });
  const used = Math.max(
    1,
    rows.reduce((a, b) => a + b, 0),
  );
  const exact = (room(drawn) - GAP * (used - drawn)) / used;
  const rowHeight = Math.min(CARD_MAX, Math.max(CARD_MIN, exact));
  return { rows, rowHeight };
}

/* The day every SHOWN card in a block shares, or null when they differ. A
 * sixteen-game college Saturday printed "TOMORROW · 11:00 AM" sixteen times
 * (2026-09-12); hoisted to the heading it is said once. Keyed on the DAY only:
 * sixteen 11:00 AM kickoffs are the schedule telling the truth, and a reader
 * scanning for "what time" needs it on the card they are looking at. */
export function sharedDay(shown, dayOf) {
  if (shown.length === 0) return null;
  const first = dayOf(shown[0]);
  if (first == null) return null;
  return shown.every((g) => dayOf(g) === first) ? first : null;
}
