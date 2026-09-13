import { bool, dbl, int, isObj, obj, objects, str } from "./wire";

/* FANTASY FOOTBALL — a port of whiparound-firetv's Fantasy.kt (the model) and
 * the fantasy fixture in Mock.kt. The screens are ports of ui/Matchup.kt and
 * the SurvivorScreen half of ui/Fantasy.kt.
 *
 * `GET /whiparound/fantasy` composes SEVEN leagues (five Sleeper, two of them
 * guillotine, plus two ESPN) into two independent lists. Every decision — which
 * side is his, whether a game has kicked off, whether the field has played
 * enough for last place to mean anything, the row order — is the BACKEND'S.
 * This file parses and labels; it never re-derives or re-sorts.
 *
 * ABSENT MEANS NO, TWICE OVER. `active` stands both screens down, and the two
 * lists stand down INDEPENDENTLY (`hasMatchups` / `hasSurvivor`, what slots.js
 * reads): in August the guillotines play while the dynasty leagues draft.
 *
 * THE FIELDS THAT DECIDE WHAT A ROW SAYS (the 2026-09-10 contract):
 *   - `started` means a game has KICKED OFF, from the NFL schedule — never
 *     "points > 0". Sleeper totals go negative, so nothing here compares a
 *     score to zero to decide whether football has happened.
 *   - `field_started` is what the survivor ALARM hangs on: the backend's
 *     majority test over the field. The alarm is decided once, in `alarm`.
 *   - `tied` is level on points INCLUDING the pre-kickoff 0-0. A REAL tie is
 *     `realTie` (tied && started); the wire flag alone is never coloured.
 *
 * Things the payload does that bite: `abbr` exists only on ESPN rows (never
 * key on it); `logo` and the survivor's `logo` are parsed and NEVER drawn (ESPN
 * sends SVG, Sleeper webp — half badges, half holes reads as broken); a bye
 * arrives as `"them": null` with the key present; and every score is 0.0 for
 * most of the week, which is `notStarted`, not a tie.
 */

/* Java's `%.1f`: HALF_UP on the value's SHORTEST decimal digits (what
 * Double.toString prints), not on its binary expansion. toFixed rounds the
 * binary value, so 1.45 would print "1.4" here and "1.5" on the stick beside
 * it — two boards disagreeing about the same score. */
function javaFixed1(v) {
  const neg = v < 0 || Object.is(v, -0);
  const abs = Math.abs(v);
  const s = String(abs);
  if (/e/i.test(s)) return (neg ? "-" : "") + abs.toFixed(1);
  const [whole, frac = ""] = s.split(".");
  const tenths = Number(whole) * 10 + Number(frac[0] ?? "0") + ((frac[1] ?? "0") >= "5" ? 1 : 0);
  return `${neg ? "-" : ""}${Math.floor(tenths / 10)}.${tenths % 10}`;
}

/// One decimal, always, and an em dash for absent. The wire carries 0, 3.3 and
/// 130.84 in one column; raw, the short one read as a different kind of number.
export function fmtPoints(v) {
  return v == null ? "—" : javaFixed1(v);
}

/// Signed, for a distance rather than a total — the sign is the whole message.
export function fmtMargin(v) {
  if (v == null) return "—";
  const s = javaFixed1(v);
  return s.startsWith("-") ? s : `+${s}`;
}

/// 1ST, 2ND, 3RD, 11TH. The teens are the exception every naive version gets
/// wrong, and "11st of 18" on a wall is the kind of typo people photograph.
export function ordinal(n) {
  const mod100 = ((n % 100) + 100) % 100;
  const mod10 = ((n % 10) + 10) % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13 ? "TH" : mod10 === 1 ? "ST" : mod10 === 2 ? "ND" : mod10 === 3 ? "RD" : "TH";
  return `${n}${suffix}`;
}

/// `isNull(key)` — true for an absent key as well as a JSON null.
function isNull(o, key) {
  return !isObj(o) || o[key] == null;
}

/// A trimmed name, null when blank. ESPN publishes at least one team name with
/// a trailing space ("Keith's 25 year old Scotch "), which centres wrong and
/// ellipsizes a character early.
function trimmed(o, key) {
  const s = str(o, key)?.trim();
  return s ? s : null;
}

/* One side of a head-to-head row. Null for an absent object AND for `null`,
 * which is how a bye arrives. `record` and `played` ARE drawn on the matchup
 * screen (the scoreboard has the room the row did not); `logo` never is. */
function parseSide(o) {
  if (o == null) return null;
  const name = trimmed(o, "name");
  const abbr = str(o, "abbr"); // ESPN only — never the sole identifier.
  const remaining = int(o, "remaining");
  return {
    name,
    abbr,
    logo: str(o, "logo"), // parsed, never drawn
    record: str(o, "record"),
    points: dbl(o, "points"),
    projected: dbl(o, "projected"),
    // Starters whose game has NOT kicked off — the schedule, not a zero.
    remaining,
    // Starters whose game HAS kicked off — the wire's own basis for `started`.
    played: int(o, "played"),
    label: name ?? abbr ?? "—",
    toPlay: remaining ?? 0,
  };
}

/* A head-to-head league, already sorted closest-margin first by the backend. */
function parseMatchup(o) {
  const me = parseSide(obj(o, "me"));
  const them = parseSide(obj(o, "them"));
  // Trust the object over the flag: a row with no opponent IS a bye, and the
  // reverse would draw an opponent's score against nothing.
  const bye = bool(o, "bye", false) || them == null;
  // Null on a bye — nothing to lead. FALSE for a real tie as well as before
  // kickoff, which is why `tied` exists.
  const leading = isNull(o, "leading") ? null : bool(o, "leading");
  // me - them. ZERO BEFORE KICKOFF, so nothing reads it without `notStarted`.
  const margin = dbl(o, "margin");
  // Defaults TRUE when absent: an older backend must fail towards showing the
  // real scores, not towards every row reading NOT STARTED.
  const started = bool(o, "started", true);
  // NULL when absent, never collapsed into false — `realTie` derives it from
  // the margin instead (the Alexa skill's fallback), so an old payload's real
  // tie is not drawn as a loser.
  const tied = isNull(o, "tied") ? null : bool(o, "tied");
  const realTie =
    !bye &&
    started &&
    (tied === true || (tied == null && them != null && margin != null && Math.abs(margin) < 0.005));
  const toPlayLine = (() => {
    const a = me?.toPlay ?? 0;
    const b = them?.toPlay ?? 0;
    if (bye) return a > 0 ? `${a} TO PLAY` : null;
    // "0 TO PLAY" every Tuesday would train the eye past the line.
    if (a === 0 && b === 0) return null;
    return `${a} – ${b} TO PLAY`;
  })();
  return {
    id: str(o, "id"),
    source: str(o, "source"),
    // A league with no name is still a league with a score in it.
    league: str(o, "league") ?? "LEAGUE",
    week: int(o, "week"),
    me,
    them,
    bye,
    leading,
    margin,
    // The period spans two scoring periods, so both totals are short. Said.
    multiPeriod: bool(o, "multi_period", false),
    started,
    tied,
    /* NOBODY HAS KICKED OFF. The wire's flag and nothing else: a second "and
     * somebody is still to play" test inverted the answer whenever a
     * projections outage zeroed `remaining`. */
    notStarted: !started,
    realTie,
    projLine: bye
      ? `PROJ ${fmtPoints(me?.projected)}`
      : `PROJ ${fmtPoints(me?.projected)} – ${fmtPoints(them?.projected)}`,
    toPlayLine,
  };
}

/* Who is at the bottom of a guillotine league. `name` is null whenever `tied`
 * is more than one — the backend will not pick one doomed owner out of a tie.
 * The whole object is null when he has WON. */
function parseBlock(o) {
  if (o == null) return null;
  return {
    name: trimmed(o, "name"),
    points: dbl(o, "points"),
    tied: int(o, "tied") ?? 1,
    // He is one of the teams down there.
    mine: bool(o, "mine", false),
  };
}

/* A guillotine league. THERE IS NO OPPONENT, EVER — the question is "how far
 * am I from last". Already sorted tightest-to-the-cut first. */
function parseSurvivor(o) {
  const started = bool(o, "started", true);
  const points = dbl(o, "points");
  const projected = dbl(o, "projected");
  const remaining = int(o, "remaining");
  // COMPETITION rank: a whole field on 0.0 is all rank 1, so rank alone never
  // decides trouble.
  const rank = int(o, "rank");
  // Teams REMAINING this week, not the league's original size.
  const teams = int(o, "teams");
  const block = parseBlock(obj(o, "on_the_block"));
  // Distance to the cut; null when unread and null when he has won.
  const margin = dbl(o, "margin");
  // STRICT comparison: tied for last is NOT safe. Null = field unread.
  const safe = isNull(o, "safe") ? null : bool(o, "safe");
  /* DEFAULTS FALSE, requiring an explicit true — not a fallback to `started`.
   * The Alexa skill requires `field_started === true`, and a fallback here made
   * the two boards publish opposite verdicts off identical bytes. Never alarm
   * without positive confirmation. */
  const fieldStarted = bool(o, "field_started", false);
  // How many of `teams` have had somebody play. Drawn, so the row says WHY it
  // is not alarming yet.
  const played = int(o, "played");
  // Points he needs to get out of the cut. The one number he can act on.
  const climb = dbl(o, "climb");
  // `true` or absent on the wire, never false.
  const won = bool(o, "won", false);

  const toPlay = remaining ?? 0;
  // His lineup has not begun — the wire's flag, never his score.
  const notStarted = !started;
  const fieldIdle = !fieldStarted;
  /* THE ALARM, AND THE ONLY PLACE IT IS DECIDED. A tie for the cut before the
   * field has played is a Sunday morning, not an emergency; the chip, the score
   * colour and the block line's colour all read this one value. */
  const alarm = safe === false && fieldStarted && !won;
  // Sleeper totals go negative, so this is != 0: a -4.0 is exactly the
  // evidence that somebody has played.
  const scored = points != null && Math.abs(points) > 0.005;
  /* WHY THE STANDINGS ARE NOT NEWS YET, as a fact. `scored` is the belt on a
   * stale `played:0` beside a real score (Alexa's same guard); a backend that
   * sends neither gets TOO EARLY TO CALL rather than a claim it cannot back. */
  const fieldLabel =
    played === 0 && !scored
      ? "NOBODY HAS PLAYED"
      : played != null && played > 0
        ? teams != null
          ? `${played} OF ${teams} PLAYED`
          : `${played} PLAYED`
        : "TOO EARLY TO CALL";
  /* THE ONE LINE THAT SAYS WHETHER HE SURVIVES THE WEEK. `safe == null` is
   * tested BEFORE `fieldIdle` — that order is the fix: a thin one-entry read
   * printed NOBODY HAS PLAYED about a field it could not see. The words match
   * the Alexa skill's on purpose. */
  const cutLabel = won
    ? "WON THE LEAGUE"
    : safe == null
      ? "FIELD NOT READ"
      : fieldIdle
        ? fieldLabel
        : safe === false
          ? (block?.tied ?? 1) > 1
            ? "TIED FOR LAST"
            : "LAST"
          : `${fmtMargin(margin)} CLEAR`;
  // His own name is never printed here — what he needs is whether it is him.
  const blockLine = (() => {
    if (block == null) return null;
    const at = fmtPoints(block.points);
    if (block.tied > 1 && block.mine) return `ON THE BLOCK · YOU + ${block.tied - 1} MORE ON ${at}`;
    if (block.tied > 1) return `ON THE BLOCK · ${block.tied} TIED ON ${at}`;
    if (block.mine) return `ON THE BLOCK · YOU, ON ${at}`;
    return `ON THE BLOCK · ${block.name ?? "—"} ${at}`;
  })();
  // A won row has no block, and an empty half-row reads as a rendering fault.
  const statusLine = won
    ? "LAST TEAM STANDING"
    : safe == null && block == null
      ? "ONE ENTRY CAME BACK"
      : blockLine;
  /* `climb` LEADS the detail — the only number here he can act on. The
   * projection drops out while it is the big number on the row. */
  const detailParts = [
    climb != null ? `NEEDS ${fmtPoints(climb)}` : null,
    notStarted ? null : `PROJ ${fmtPoints(projected)}`,
    toPlay > 0 ? `${toPlay} TO PLAY` : null,
  ].filter((x) => x != null);

  return {
    id: str(o, "id"),
    source: str(o, "source"),
    league: str(o, "league") ?? "LEAGUE",
    name: trimmed(o, "name"),
    logo: str(o, "logo"), // parsed, never drawn
    points,
    projected,
    remaining,
    rank,
    teams,
    block,
    margin,
    safe,
    started,
    fieldStarted,
    played,
    climb,
    won,
    toPlay,
    notStarted,
    fieldIdle,
    alarm,
    scored,
    rankLabel: rank == null ? null : ordinal(rank) + (teams != null ? ` OF ${teams}` : ""),
    fieldLabel,
    cutLabel,
    blockLine,
    statusLine,
    detail: detailParts.length > 0 ? detailParts.join(" · ") : null,
  };
}

/// A league that has not drafted. NOT part of `active` — it gets a footnote,
/// not a row.
function parsePending(o) {
  const league = str(o, "league");
  const reason = str(o, "reason");
  const label = [league, reason].filter((x) => x != null).join(" ").toUpperCase();
  return { league, source: str(o, "source"), reason, label: label || "A LEAGUE" };
}

function finish(f) {
  return {
    ...f,
    // Each screen stands down on ITS OWN list.
    hasMatchups: f.active && f.matchups.length > 0,
    hasSurvivor: f.active && f.survivor.length > 0,
    weekLabel: f.week != null ? `WEEK ${f.week}` : null,
    // Only when it is not the ordinary regular season — "REGULAR" every week
    // is a word nobody reads twice.
    seasonTypeLabel:
      f.seasonType && f.seasonType.toLowerCase() !== "regular"
        ? f.seasonType.replace(/_/g, " ").toUpperCase()
        : null,
    // Leagues first, so ellipsizing costs the reason and not the name.
    pendingLine:
      f.pending.length === 0 ? null : `NOT DRAFTED · ${f.pending.map((p) => p.label).join(" · ")}`,
  };
}

export const EMPTY_FANTASY = finish({
  active: false,
  season: null,
  week: null,
  seasonType: null,
  // A POLL-RATE HINT (a game in progress right now), not an age.
  live: false,
  matchups: [],
  survivor: [],
  pending: [],
  errors: {},
  failed: 0,
});

/* A LEAGUE FAILING TO READ, WITH NOTHING ELSE TO SHOW, IS THROWN, NOT RETURNED
 * EMPTY — so it lands in useBoard's catch and the last good payload stays on
 * the wall. A week-old lineup is still the lineup.
 *
 * THE DISCRIMINATOR IS `failed > 0`, NOT "errors is non-empty". The producer's
 * own stand-down always carries `errors.week`, and an unset ESPN cookie sets a
 * bare `errors.espn` on every poll; neither is a league that owed a row, and
 * the first cut of this guard threw on both forever and pinned a stale board.
 * One dead league out of seven must still deliver the other six, and a quiet
 * February (no failures, no rows) must still stand the screens down.
 */
export function parseFantasy(o) {
  // `JSONObject(text)` throws on a body that is not an object. Throwing here too
  // lands in the useBoard catch and keeps the last good lineup on the wall,
  // instead of one bad response standing both fantasy screens down.
  if (o === null || typeof o !== "object" || Array.isArray(o)) {
    throw new Error("fantasy: payload is not an object");
  }
  const matchups = objects(o, "matchups").map(parseMatchup);
  const survivor = objects(o, "survivor").map(parseSurvivor);
  const pending = objects(o, "pending").map(parsePending);
  const errors = {};
  const e = obj(o, "errors");
  if (e) {
    for (const [k, v] of Object.entries(e)) {
      // `optString(k, "failed")`: null takes the fallback, anything else its text.
      errors[k] = v == null ? "failed" : typeof v === "object" ? JSON.stringify(v) : String(v);
    }
  }
  /* EVERY FAULT, KEYED — but `errors` also carries provider-level keys
   * (`sleeper`, `espn`, `projections`, `schedule`, `week`) that are not
   * leagues. Count `failed`, never the keys; the fallback is the backend's own
   * filter, league keys only. */
  const failed =
    int(o, "failed") ??
    Object.keys(errors).filter((k) => k.startsWith("sleeper:") || k.startsWith("espn:")).length;
  if (failed > 0 && matchups.length === 0 && survivor.length === 0) {
    throw new Error(
      `fantasy: no rows and ${failed} league failure(s): ` +
        Object.entries(errors)
          .map(([k, v]) => `${k}=${v}`)
          .join(", "),
    );
  }
  return finish({
    // Trust the lists over the flag if they ever disagree: a screen that claims
    // a matchup and shows none is the worse failure.
    active: bool(o, "active", false) && (matchups.length > 0 || survivor.length > 0),
    season: str(o, "season"),
    week: int(o, "week"),
    seasonType: str(o, "season_type"),
    live: bool(o, "live", false),
    // Both lists arrive sorted; re-sorting here would be a second opinion.
    matchups,
    survivor,
    pending,
    errors,
    failed,
  });
}

/* Mock.kt's fantasy fixture, verbatim, run through the REAL parser so a wire
 * change breaks the preview exactly as it would break production.
 *
 * Six matchups, every branch: not started (with the long league name and the
 * widest real score), a bye sent as `"them": null`, a multi-period ESPN league
 * with a trailing-space team name, a REAL 84.2-84.2 tie, a losing side, and a
 * projections outage (0/0 remaining, `started:false`). Five survivors: the 4pm
 * emergency (alarm), a quiet Sunday (same `safe:false`, no alarm), a won
 * league, a uniquely-last negative score, and a safe league with a named team
 * on the block. `failed: 1` beside TWO error keys, so the footnote's tag must
 * say ONE. */
const MOCK_FANTASY = `
{
  "active": true, "season": "2026", "week": 1,
  "season_type": "regular", "live": true, "failed": 1,
  "matchups": [
    {
      "id": "sleeper:1", "source": "sleeper",
      "league": "OG Dirtbag Dynasty Superflex Keepers",
      "week": 1,
      "me":   { "name": "Urine Trouble",    "logo": null, "record": "0-0",
                "points": 0, "projected": 130.84, "remaining": 12,
                "played": 0 },
      "them": { "name": "MR ALL INNNNNNNN", "logo": null, "record": "0-0",
                "points": 0, "projected": 174.9,  "remaining": 12,
                "played": 0 },
      "bye": false, "leading": false, "margin": 0,
      "started": false, "tied": true
    },
    {
      "id": "sleeper:4", "source": "sleeper", "league": "TDMPFFL XIV",
      "week": 1,
      "me": { "name": "Urine Trouble", "record": "0-0",
              "points": 51.8, "projected": 118.6, "remaining": 6,
              "played": 5 },
      "them": null,
      "bye": true, "leading": null, "margin": null,
      "started": true, "tied": false
    },
    {
      "id": "espn:2", "source": "espn", "league": "The League", "week": 1,
      "me":   { "name": "Touchdown My Pants", "abbr": "PISS", "record": "1-0",
                "points": 88.4, "projected": 123.15, "remaining": 3,
                "played": 6 },
      "them": { "name": "Keith's 25 year old Scotch ", "abbr": "KTT",
                "record": "0-1", "points": 71.2, "projected": 124.82,
                "remaining": 4, "played": 5 },
      "bye": false, "leading": true, "margin": 17.2, "multi_period": true,
      "started": true, "tied": false
    },
    {
      "id": "sleeper:5", "source": "sleeper", "league": "The Work League",
      "week": 1,
      "me":   { "name": "Urine Trouble", "record": "0-0",
                "points": 84.2, "projected": 110.2, "remaining": 2,
                "played": 7 },
      "them": { "name": "Mean Machine",  "record": "0-0",
                "points": 84.2, "projected": 104.2, "remaining": 1,
                "played": 8 },
      "bye": false, "leading": false, "margin": 0,
      "started": true, "tied": true
    },
    {
      "id": "sleeper:3", "source": "sleeper", "league": "BIGGER dynasty",
      "week": 1,
      "me":   { "name": "Urine Trouble", "record": "0-1",
                "points": 64.0, "projected": 99.1,  "remaining": 5,
                "played": 4 },
      "them": { "name": "Chubb N Tugs",  "record": "1-0",
                "points": 98.3, "projected": 131.7, "remaining": 6,
                "played": 5 },
      "bye": false, "leading": false, "margin": -34.3,
      "started": true, "tied": false
    },
    {
      "id": "sleeper:10", "source": "sleeper", "league": "Dirtbags Redraft",
      "week": 1,
      "me":   { "name": "Urine Trouble", "record": "0-0",
                "points": 0, "projected": 0, "remaining": 0, "played": 0 },
      "them": { "name": "Team Butkus",   "record": "0-0",
                "points": 0, "projected": 0, "remaining": 0, "played": 0 },
      "bye": false, "leading": false, "margin": 0,
      "started": false, "tied": true
    }
  ],
  "survivor": [
    {
      "id": "sleeper:6", "source": "sleeper", "league": "Guillotine",
      "name": "UrineSumTrouble", "logo": null,
      "points": 0, "projected": 107.86, "remaining": 8,
      "week": 1, "started": true, "field_started": true, "played": 14,
      "rank": 8, "teams": 18,
      "on_the_block": { "name": null, "points": 0, "tied": 11, "mine": true },
      "margin": 0, "safe": false, "climb": 3.3
    },
    {
      "id": "sleeper:8", "source": "sleeper",
      "league": "Sunday Morning Guillotine Invitational",
      "name": "UrineSumTrouble", "logo": null,
      "points": 0, "projected": 98.4, "remaining": 9,
      "week": 1, "started": false, "field_started": false, "played": 0,
      "rank": 1, "teams": 12,
      "on_the_block": { "name": null, "points": 0, "tied": 12, "mine": true },
      "margin": 0, "safe": false, "climb": null
    },
    {
      "id": "sleeper:12", "source": "sleeper", "league": "Guillotine 3",
      "name": "UrineSumTrouble", "logo": null,
      "points": 121.4, "projected": 121.4, "remaining": 0,
      "week": 1, "started": true, "field_started": true, "played": 1,
      "rank": 1, "teams": 1,
      "on_the_block": null,
      "margin": null, "safe": true, "climb": null, "won": true
    },
    {
      "id": "sleeper:7", "source": "sleeper", "league": "Guillotine 2",
      "name": "UrineSumTrouble", "logo": null,
      "points": 46.2, "projected": 92.69, "remaining": 7,
      "week": 1, "started": true, "field_started": true, "played": 11,
      "rank": 5, "teams": 18,
      "on_the_block": { "name": "5 Star Massages", "points": 12.4,
                        "tied": 1, "mine": false },
      "margin": 33.8, "safe": true, "climb": null
    },
    {
      "id": "sleeper:11", "source": "sleeper", "league": "Guillotine 4",
      "name": "UrineSumTrouble", "logo": null,
      "points": -4.2, "projected": 88.1, "remaining": 6,
      "week": 1, "started": true, "field_started": true, "played": 9,
      "rank": 14, "teams": 14,
      "on_the_block": { "name": null, "points": -4.2, "tied": 1,
                        "mine": true },
      "margin": 0, "safe": false, "climb": 6.7
    }
  ],
  "pending": [
    { "league": "TDMPFFL XV", "source": "sleeper", "reason": "pre-draft" },
    { "league": "ESPN 204792412", "source": "espn", "reason": "pre-draft" }
  ],
  "errors": { "sleeper:9": "HTTP 502", "projections": "HTTP 500" }
}
`;

export function mockFantasy() {
  return parseFantasy(JSON.parse(MOCK_FANTASY));
}
