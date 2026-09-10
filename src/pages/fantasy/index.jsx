/* Fantasy Leagues — STANDINGS, the first of four tabs. Route /fantasy.
 *
 * Every league Patrick is in, both providers, one screen:
 *   GET https://sheline-art-website-api.herokuapp.com/fantasy-football/standings
 *
 * Cardless and unlisted like /ffdraft — reachable from the press-and-hold
 * PrivateTools modal, from /jump, or by typing the URL.
 *
 * THIS SCREEN IS UNCHANGED BY THE 2026-09-10 MATCHUP SPLIT and that is
 * deliberate. The other three tabs (/fantasy/sleeper, /fantasy/espn,
 * /fantasy/guillotine) each show one group of leagues and only Patrick's own
 * game in each; this one is the only place all six leagues appear together,
 * which is what it was asked for. Two consequences worth stating:
 *   - it still uses the 900px S.main, not the wide Shell — a 5-column table
 *     reads correctly at 900 and stretched at 1900;
 *   - it still shows PRE-DRAFT leagues (TDMPFFL XIV). Patrick asked for that
 *     card to go from the MATCHUP view, where it cannot have content; here it
 *     carries real information, and five cards for six leagues would be an
 *     absence rendering as calm (the /nhc lesson).
 *
 * PAYLOAD INVARIANTS this page leans on (see the backend's route header):
 *   body.leagues is ALWAYS an array; every league ALWAYS carries leagueId,
 *   provider, name, format, status, totalTeams, myTeamId, note, error, columns
 *   and teams; teams is ALWAYS an array (empty for pre_draft and error);
 *   error is null or {code, message}.
 *   status  = 'in_season' | 'pre_draft' | 'complete' | 'error'
 *   format  = 'h2h' | 'guillotine'
 *
 * TRAPS, all of them real:
 *   - HTTP 200 IS NOT SUCCESS. The backend always answers 200; a total failure
 *     is {ok:false} and a single dead league is league.error inside an
 *     otherwise fine payload. Both must show, or an outage renders as calm.
 *   - GUILLOTINE HAS NO W-L. settings.type 3 leagues carry permanently zero
 *     wins/losses/ties even in a finished season, so a W-L column there is a
 *     lie. They rank by points for, and teams get eliminated instead.
 *   - pointsAgainst IS NULL until a week is scored, and never exists at all in
 *     a guillotine league. Render an em-dash; 0.00 would read as a shutout.
 *   - THERE IS NO ErrorBoundary in this app. A throw in this render blanks the
 *     entire site, not just this route — hence the defensive reads.
 */
import { useMemo } from "react";
import {
  C,
  S,
  fmtPts,
  fmtRecord,
  fmtAsOf,
  orderGuillotine,
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

/* orderGuillotine moved to theme.js on 2026-09-10 and is now shared with
 * /fantasy/guillotine. Both screens rank the same 18 teams, and two copies of
 * that comparator is exactly how they would come to disagree about who is 1st.
 * Do not re-inline it here. */

function H2HTable({ teams }) {
  return (
    /* Its own horizontal scroller: App.jsx column-flexes the route, so a table
       wider than the phone would otherwise scroll the whole page sideways. */
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, ...S.thLeft, width: 28 }}>#</th>
            <th style={{ ...S.th, ...S.thLeft }}>Team</th>
            <th style={S.th}>W-L-T</th>
            <th style={S.th}>PF</th>
            <th style={S.th}>PA</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr
              key={t.teamId || i}
              style={t.isMine ? S.mineRow : undefined}
            >
              <td style={{ ...S.td, ...S.tdLeft, color: C.muted }}>
                {t.rank || i + 1}
              </td>
              <td style={{ ...S.td, ...S.tdLeft }}>
                <TeamName team={t} />
              </td>
              <td style={S.td}>{fmtRecord(t.wins, t.losses, t.ties)}</td>
              <td style={S.td}>{fmtPts(t.pointsFor)}</td>
              <td style={S.td}>{fmtPts(t.pointsAgainst)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GuillotineTable({ teams }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, ...S.thLeft, width: 28 }}>#</th>
            <th style={{ ...S.th, ...S.thLeft }}>Team</th>
            <th style={S.th}>Points For</th>
            <th style={S.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => {
            const alive = t.alive !== false;
            return (
              <tr
                key={t.teamId || i}
                style={{
                  ...(t.isMine ? S.mineRow : null),
                  ...(alive ? null : S.deadRow),
                }}
              >
                <td style={{ ...S.td, ...S.tdLeft, color: C.muted }}>
                  {alive ? t.rank || i + 1 : "—"}
                </td>
                <td style={{ ...S.td, ...S.tdLeft }}>
                  <TeamName team={t} />
                </td>
                <td style={S.td}>{fmtPts(t.pointsFor)}</td>
                <td style={{ ...S.td, color: alive ? C.green : C.red }}>
                  {alive
                    ? "Alive"
                    : `Eliminated wk ${t.eliminatedWeek || "?"}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StandingsBody({ league }) {
  const teams = asArray(league.teams);
  if (teams.length === 0) {
    return <StatePanel>No standings rows came back for this league.</StatePanel>;
  }
  if (league.format === "guillotine") {
    const ordered = orderGuillotine(teams);
    const alive = ordered.filter((t) => t.alive !== false).length;
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
          Survivors {alive} of {league.totalTeams || ordered.length}
        </div>
        <GuillotineTable teams={ordered} />
      </>
    );
  }
  return <H2HTable teams={teams} />;
}

export default function Fantasy() {
  const { body, err, loading, reload } = useFantasyFeed("/standings");

  const leagues = useMemo(() => asArray(body && body.leagues), [body]);

  if (loading && !body) return <Center>Loading leagues…</Center>;

  /* A dead backend, a non-2xx, or {ok:false}: say so loudly instead of
     rendering an empty, calm-looking page. */
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
  const bits = [];
  if (season.week) bits.push(`Week ${season.week}`);
  if (season.sleeper_season) bits.push(`${season.sleeper_season} season`);

  return (
    <Shell>
      <PageHeader
        title="🏆 Fantasy Standings"
        subtitle={bits.join(" · ")}
        stale={Boolean(body && body.stale)}
        asOf={fmtAsOf(body && body.as_of)}
        onRefresh={reload}
      />
      <TabStrip active="standings" />

      {/* An error alongside data we still have: keep the data, flag the read. */}
      {err && leagues.length ? (
        <div style={{ marginBottom: 12 }}>
          <StatePanel>
            The last refresh failed ({err}) — these standings may be out of
            date.
          </StatePanel>
        </div>
      ) : null}

      {leagues.length === 0 ? (
        <div style={S.card}>
          <StatePanel>The backend returned no leagues.</StatePanel>
        </div>
      ) : (
        leagues.map((l, i) => (
          <LeagueCard key={l.leagueId || i} league={l}>
            <StandingsBody league={l} />
          </LeagueCard>
        ))
      )}
    </Shell>
  );
}
