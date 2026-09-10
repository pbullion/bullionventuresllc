/* Fantasy Leagues — MATCHUP SCREEN 1 of 3: SLEEPER H2H. Route /fantasy/sleeper.
 *
 *   GET https://sheline-art-website-api.herokuapp.com/fantasy-football/matchups/sleeper
 *
 * BIGGER dynasty + OG Dirtbag Dynasty, and in each of them ONLY the game
 * Patrick is in, with both starting lineups. Two cards, side by side on a
 * desktop.
 *
 * WHY THIS SCREEN EXISTS AT ALL, so nobody re-merges it: it was one
 * /fantasy/matchups showing all six leagues and every game in each. Patrick
 * asked for "my matchups only", "details for each", and then for the split
 * itself — "do the two sleeper leagues on one, espn on another, and the two
 * guiltine on another screen" (2026-09-10). Three screens of at most two cards
 * is also what makes "I don't want to have to scroll" achievable; one screen
 * could not.
 *
 * NO ?week PARAM IS SENT. The backend resolves the week from Sleeper's
 * /v1/state/nfl; this page displays whatever body.week comes back with.
 * Hardcoding a week here goes stale the first Tuesday after it ships.
 *
 * WHAT THE BACKEND HAS ALREADY DONE, so this file does not re-do it:
 *   - filtered leagues[] to Sleeper h2h leagues;
 *   - dropped pre_draft leagues (TDMPFFL XIV — the card Patrick pointed at and
 *     said "remove this one"; it survives on /fantasy standings, where it still
 *     carries real information);
 *   - filtered games[] to hasMine, so 0 or 1 game per league;
 *   - resolved every Sleeper player id to a name (matchups carry ids only).
 * Re-implementing any of that here would put the rule in two places.
 *
 * TRAPS:
 *   - HTTP 200 IS NOT SUCCESS. A total failure is {ok:false}; a single dead
 *     league is league.error inside an otherwise fine payload. Both must show.
 *   - Week 1 point totals of 0.00 are CORRECT before kickoff, not a bug.
 *   - There is no ErrorBoundary in this app, so every read is defensive.
 */
import { useMemo } from "react";
import {
  S,
  fmtAsOf,
  rowHeightVar,
  slotCount,
} from "./theme.js";
import { useFantasyFeed, asArray } from "./useFantasyFeed.js";
import {
  Center,
  Shell,
  TabStrip,
  LeagueCard,
  StatePanel,
  PageHeader,
  RetryButton,
} from "./ui.jsx";
import Lineup from "./Lineup.jsx";

/* Page chrome that is NOT lineup rows, in px, measured from the real style
 * objects rather than guessed — rowHeightVar divides what is left by the row
 * count, so a wrong number here is the difference between filling the screen
 * and scrolling it:
 *   shell padding-top            16   theme.js S.shell
 *   PageHeader                   45   h1 22 + S.sub 12.5 + 4 margin
 *   TabStrip                     66   12 top + 38 + 16 bottom
 *   LeagueCard chrome            60   2 border + 28 padding + 30 head
 *   in-card score header         52   two S.gameSide rows
 *   lineup column header         26   S.lineupHead
 *   shell padding-bottom         40   theme.js S.shell
 * Add a row of chrome to this screen and this number has to move with it. */
const FIXED = 305;

function LeagueBody({ league, week }) {
  const games = asArray(league.games);
  if (games.length === 0) {
    /* in_season but no game of his this week — a real state (a bye, or a week
       the league has not posted). The backend supplies the sentence. */
    return (
      <StatePanel>
        {league.note || `No matchup found for your team in week ${week}.`}
      </StatePanel>
    );
  }
  /* hasMine filtering is server-side, so this is one game — but map rather
     than [0] so a second one would render instead of being silently dropped. */
  return (
    <>
      {games.map((g, i) => (
        <Lineup key={g.gameId || i} game={g} />
      ))}
    </>
  );
}

export default function FantasySleeper() {
  const { body, err, loading, reload } = useFantasyFeed("/matchups/sleeper");

  const leagues = useMemo(() => asArray(body && body.leagues), [body]);

  /* ROWS COME FROM THE DATA. BIGGER dynasty starts 14 and OG Dirtbag 12, and
     the taller card has to govern the shared row height or its last two rows
     fall off the bottom. */
  const rows = useMemo(() => {
    let n = 1;
    leagues.forEach((l) => {
      asArray(l && l.games).forEach((g) => {
        n = Math.max(n, slotCount(g));
      });
    });
    return n;
  }, [leagues]);

  if (loading && !body) return <Center>Loading Sleeper matchups…</Center>;

  if (err && !leagues.length) {
    return (
      <Center>
        Could not reach the fantasy feed: {err}. Try again, or check the sheline
        backend.
        <RetryButton onClick={reload} />
      </Center>
    );
  }

  const season = (body && body.season) || {};
  const week = (body && body.week) || season.week || null;
  const bits = [];
  if (week) bits.push(`Week ${week}`);
  if (season.sleeper_season) bits.push(`${season.sleeper_season} season`);

  return (
    <Shell wide>
      <PageHeader
        title="⚔️ Sleeper Matchups"
        subtitle={bits.join(" · ")}
        stale={Boolean(body && body.stale)}
        asOf={fmtAsOf(body && body.as_of)}
        onRefresh={reload}
      />
      <TabStrip active="sleeper" />

      {err && leagues.length ? (
        <div style={{ marginBottom: 12 }}>
          <StatePanel>
            The last refresh failed ({err}) — these scores may be out of date.
          </StatePanel>
        </div>
      ) : null}

      {leagues.length === 0 ? (
        <div style={S.card}>
          {/* The backend explains its own empty groups via a top-level `note`
              ("No drafted head-to-head Sleeper leagues this week."); this
              sentence is only the fallback for an empty array it did not
              explain. Same precedence as league.note in ui.jsx. */}
          <StatePanel>
            {(body && body.note) ||
              "The backend returned no Sleeper head-to-head leagues for this week."}
          </StatePanel>
        </div>
      ) : (
        <div style={{ ...S.matchGrid, ...rowHeightVar(FIXED, rows) }}>
          {leagues.map((l, i) => (
            <LeagueCard key={l.leagueId || i} league={l} flush>
              <LeagueBody league={l} week={week} />
            </LeagueCard>
          ))}
        </div>
      )}
    </Shell>
  );
}
