/* Fantasy Leagues — MATCHUP SCREEN 3 of 3: GUILLOTINE. Route /fantasy/guillotine.
 *
 *   GET https://sheline-art-website-api.herokuapp.com/fantasy-football/matchups/guillotine
 *
 * Guillotine + Guillotine 2, both 18 teams, side by side on a desktop.
 *
 * GUILLOTINE IS NOT A SET OF GAMES, which is why this screen exists separately
 * and why it has no Lineup on it. Both leagues are settings.type 3 (survivor):
 * they return 18 distinct matchup_ids with one roster each and no opponent, so
 * there is nothing head-to-head to draw. `games` is always [] here and the
 * payload's `race` — a ranked scoring board with the lowest score on the block
 * — is the whole screen.
 *
 * RaceTable BELOW WAS MOVED HERE FROM Matchups.jsx, NOT REWRITTEN. Its
 * on-the-block logic encodes a correction that is easy to lose by re-deriving
 * it: before kickoff every alive team is on 0.00 (11 of 18 in one league, 13 of
 * 18 in the other), so naming one of them in red is a confident lie for most of
 * every week. Hence a SET of ids, empty until somebody scores, with the
 * singular key still read so an older payload keeps working. The only thing
 * changed in the move is presentational: the rows take their height from
 * --fp-row so two 18-row tables fit one screen.
 *
 * Ordering comes from theme.js's orderGuillotine, the same function /fantasy
 * standings uses — two copies is exactly how the two views would come to
 * disagree about who is 1st.
 *
 * No ErrorBoundary exists in this app, so every read here is defensive.
 */
import { useMemo } from "react";
import {
  C,
  S,
  fmtPts,
  fmtAsOf,
  orderGuillotine,
  rowHeightVar,
} from "./theme.js";
import { useFantasyFeed, asArray } from "./useFantasyFeed.js";
import {
  Center,
  Shell,
  TabStrip,
  LeagueCard,
  StatePanel,
  TeamName,
  PageHeader,
  RetryButton,
} from "./ui.jsx";

/* As Sleeper.jsx's FIXED, recomputed for this screen:
 *   227  page chrome (shell padding, PageHeader, TabStrip, card chrome)
 *  + 26  table header row
 *  + 24  the "Week N scoring race" label
 *  = 277
 * At 1080p that leaves (940-277)/18 = 36.8px per row, so the clamp in
 * rowHeightVar is REQUIRED here rather than being a small-laptop concession:
 * the default 35px S.td row would overflow. */
const FIXED = 277;

/* S.td is 8px of vertical padding around a 13px line — about 33px, and it will
 * not shrink below that however small --fp-row goes. These rows have to be
 * able to compress, so the padding moves to the sides and the height becomes
 * the row height itself. */
const raceTd = { ...S.td, padding: "0 8px" };
const raceTdLeft = { ...raceTd, ...S.tdLeft };

function RaceTable({ race, week }) {
  const teams = orderGuillotine(asArray(race && race.teams));
  if (teams.length === 0) {
    return <StatePanel>No scores posted for this week yet.</StatePanel>;
  }
  /* ON THE BLOCK IS A SET. Before kickoff every alive team is on 0.00 — 11 of
     18 in one of these leagues, 13 of 18 in the other — and naming one of them
     in red is a confident lie for most of every week. The backend now sends
     `onTheBlockTeamIds` (empty until somebody has scored) and leaves the
     singular key null unless it is genuinely one team; the singular is still
     read so an older payload keeps working. */
  const blockIds = new Set(
    asArray(race && race.onTheBlockTeamIds)
      .filter((id) => id != null)
      .map(String),
  );
  if (race && race.onTheBlockTeamId != null) {
    blockIds.add(String(race.onTheBlockTeamId));
  }
  const tiedOnBlock = blockIds.size > 1;
  return (
    <>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          marginBottom: 6,
        }}
      >
        Week {week} scoring race — lowest score is cut
      </div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, ...S.thLeft, width: 28 }}>#</th>
              <th style={{ ...S.th, ...S.thLeft }}>Team</th>
              <th style={S.th}>Points</th>
              <th style={S.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t, i) => {
              const alive = t.alive !== false;
              const blocked = alive && blockIds.has(String(t.teamId));
              return (
                <tr
                  key={t.teamId || i}
                  style={{
                    height: "var(--fp-row, 34px)",
                    ...(t.isMine ? S.mineRow : null),
                    ...(alive ? null : S.deadRow),
                  }}
                >
                  <td style={{ ...raceTdLeft, color: C.muted }}>
                    {alive ? t.rank || i + 1 : "—"}
                  </td>
                  <td style={raceTdLeft}>
                    <TeamName team={t} />
                  </td>
                  <td style={raceTd}>{fmtPts(t.points)}</td>
                  <td
                    style={{
                      ...raceTd,
                      color: blocked ? C.red : alive ? C.muted : C.red,
                      fontWeight: blocked ? 800 : 600,
                    }}
                  >
                    {blocked
                      ? tiedOnBlock
                        ? "Tied on the block"
                        : "On the block"
                      : alive
                        ? "Alive"
                        : `Eliminated wk ${t.eliminatedWeek || "?"}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LeagueBody({ league, week }) {
  /* race is null whenever the league is not mid-season; LeagueCard has already
     handled pre_draft and error, so this is the belt-and-braces branch rather
     than the expected one. */
  if (!league.race) {
    return (
      <StatePanel>{league.note || "No scoring race for this week."}</StatePanel>
    );
  }
  return <RaceTable race={league.race} week={week} />;
}

export default function FantasyGuillotine() {
  const { body, err, loading, reload } = useFantasyFeed("/matchups/guillotine");

  const leagues = useMemo(() => asArray(body && body.leagues), [body]);

  /* 18 teams today in both leagues — read from the payload, because a league
     that loses a team to elimination still lists it and a third league would
     not necessarily be 18. */
  const rows = useMemo(() => {
    let n = 1;
    leagues.forEach((l) => {
      n = Math.max(n, asArray(l && l.race && l.race.teams).length);
    });
    return n;
  }, [leagues]);

  if (loading && !body) return <Center>Loading the guillotine races…</Center>;

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
        title="🔪 Guillotine"
        subtitle={bits.join(" · ")}
        stale={Boolean(body && body.stale)}
        asOf={fmtAsOf(body && body.as_of)}
        onRefresh={reload}
      />
      <TabStrip active="guillotine" />

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
              ("No active guillotine leagues this week."); this sentence is only
              the fallback for an empty array it did not explain. Same
              precedence as league.note in ui.jsx. */}
          <StatePanel>
            {(body && body.note) || "The backend returned no guillotine leagues."}
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
