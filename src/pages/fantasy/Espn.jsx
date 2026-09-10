/* Fantasy Leagues — MATCHUP SCREEN 2 of 3: ESPN. Route /fantasy/espn.
 *
 *   GET https://sheline-art-website-api.herokuapp.com/fantasy-football/matchups/espn
 *
 * "The League" (ESPN leagueId 1429051163), Patrick's own matchup, both starting
 * lineups plus both benches. One card.
 *
 * WHY ONE CARD IS CAPPED AT 1200px AND CENTRED. Patrick asked for the screens
 * to fill the width, and on the Sleeper screen two cards do exactly that. Here
 * there is only ever one league, and a single 1881px-wide card on a 1920 screen
 * reads as a bug — a 1200px one reads as a deliberate column. The width that is
 * NOT spent on stretching is spent on the things the Sleeper screen cannot
 * afford: the bench, the win-probability chips and the yet-to-play counts.
 *
 * WHAT ESPN GIVES US THAT SLEEPER DOES NOT, and where it goes:
 *   played        true|false  -> a starter who has not kicked off yet has a
 *                               greyed score instead of a confident 0.00
 *   yetToPlay     count       -> a chip per side
 *   winProbability            -> a chip per side
 *   bench[]       7 rows      -> dimmed, under the starters
 * And what it does NOT give: injury status (mBoxscore carries none) and
 * opponent. Those render as ABSENT, never as "healthy" — see Lineup.jsx.
 *
 * THE BENCH IS THE THING TO DROP if this screen ever stops fitting. It is
 * genuinely useful ("should I have started him") and it is free — the same
 * mBoxscore roster fetch — but it is also the only content on any of these
 * screens Patrick did not ask for. Never drop starters to keep it.
 *
 * NO ?week PARAM IS SENT — the backend resolves it from ESPN's
 * currentMatchupPeriod. (That sentence described the INTENT and not the code
 * until 2026-09-10: the group builder took the week from Sleeper's
 * /v1/state/nfl, whose failure path silently floors it at 1, so a Sleeper
 * outage would have served week 1's pairing under a "Week 1" header with
 * ok:true. This screen fetches no Sleeper data, and ESPN's own period counter
 * runs to 14 where Sleeper's week runs to 18, so the two were never
 * interchangeable. Fixed backend-side.)
 *
 * There is no ErrorBoundary in this app, so every read here is defensive.
 */
import { useMemo } from "react";
import {
  S,
  fmtAsOf,
  rowHeightVar,
  slotCount,
  benchCount,
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

/* As Sleeper.jsx's FIXED (305), plus 22 for the "Bench" divider this screen is
 * the only one to render. See that file for the line-by-line breakdown. */
const FIXED = 327;

function LeagueBody({ league, week }) {
  const games = asArray(league.games);
  if (games.length === 0) {
    return (
      <StatePanel>
        {league.note || `No matchup found for your team in week ${week}.`}
      </StatePanel>
    );
  }
  return (
    <>
      {games.map((g, i) => (
        <Lineup key={g.gameId || i} game={g} showBench />
      ))}
    </>
  );
}

export default function FantasyEspn() {
  const { body, err, loading, reload } = useFantasyFeed("/matchups/espn");

  const leagues = useMemo(() => asArray(body && body.leagues), [body]);

  /* Starters AND bench share one row height, so both count. Taken from the
     data: ESPN starts 9 and benches 7 today, and neither is a constant this
     file is allowed to assume. */
  const rows = useMemo(() => {
    let n = 1;
    leagues.forEach((l) => {
      asArray(l && l.games).forEach((g) => {
        n = Math.max(n, slotCount(g) + benchCount(g));
      });
    });
    return n;
  }, [leagues]);

  if (loading && !body) return <Center>Loading the ESPN matchup…</Center>;

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
  if (season.espn_season_id) bits.push(`${season.espn_season_id} season`);

  return (
    <Shell wide>
      <PageHeader
        title="🏟 ESPN Matchup"
        subtitle={bits.join(" · ")}
        stale={Boolean(body && body.stale)}
        asOf={fmtAsOf(body && body.as_of)}
        onRefresh={reload}
      />
      <TabStrip active="espn" />

      {err && leagues.length ? (
        <div style={{ marginBottom: 12 }}>
          <StatePanel>
            The last refresh failed ({err}) — these scores may be out of date.
          </StatePanel>
        </div>
      ) : null}

      {leagues.length === 0 ? (
        <div style={S.card}>
          {/* THE BACKEND'S OWN SENTENCE WINS. /matchups/:group sets a top-level
              `note` for every empty-group case it creates deliberately — an
              undrafted ESPN league returns leagues:[] BY DESIGN and says "The
              ESPN league has not drafted yet." Leading with the cookie warning
              instead sent the reader to rotate two Heroku config vars that were
              fine, and The League enters that state at the start of every
              season. The credential hint is the FALLBACK, for an empty array
              the backend did not explain. Same precedence as league.note in
              ui.jsx. */}
          <StatePanel>
            {(body && body.note) ||
              "The backend returned no ESPN league. If this persists, check ESPN_S2 / ESPN_SWID on Heroku — expired cookies are the usual cause."}
          </StatePanel>
        </div>
      ) : (
        <div
          style={{
            ...rowHeightVar(FIXED, rows),
            /* One column, capped and centred. A grid rather than plain blocks
               so that IF the ESPN group ever returns a second league, the two
               cards are separated by the same 14px gap as every other screen
               instead of butting together (LeagueCard is `flush` here). */
            display: "grid",
            gap: 14,
            maxWidth: 1200,
            margin: "0 auto",
            width: "100%",
            minWidth: 0,
          }}
        >
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
