/* Fantasy Leagues — SCREEN 2, MATCHUPS. Route /fantasy/matchups.
 *
 * This week's games in every league, both providers:
 *   GET https://sheline-art-website-api.herokuapp.com/fantasy-football/matchups
 *
 * NO ?week PARAM IS SENT. The backend resolves the week from Sleeper's
 * /v1/state/nfl and ESPN's currentMatchupPeriod; this page displays whatever
 * body.week comes back with. Hardcoding a week here would go stale the first
 * Tuesday after it shipped.
 *
 * PAYLOAD INVARIANTS (see the backend route header):
 *   every league carries leagueId, provider, name, format, status, totalTeams,
 *   myTeamId, note, error, games and race.
 *   games is ALWAYS an array — EMPTY for guillotine, pre_draft and error.
 *   race is ALWAYS present and is null unless
 *     format === 'guillotine' && status === 'in_season'.
 *   race.onTheBlockTeamIds is EVERY alive team on the minimum score and is
 *     EMPTY until somebody has scored; race.onTheBlockTeamId is that id only
 *     when there is exactly one, and null otherwise.
 *   game.away is null ONLY when game.kind === 'bye'.
 *
 * TRAPS:
 *   - BRANCH ON format, NEVER ON provider. An ESPN h2h game and a Sleeper h2h
 *     game render through the same code path.
 *   - GUILLOTINE IS NOT A SET OF GAMES. Both 18-team leagues return 18
 *     distinct matchup_ids with one roster each — there is no opponent. They
 *     come back as `race`, a ranked scoring board with one team on the block.
 *   - NEVER read game.away without checking kind first; a bye has none.
 *   - HTTP 200 is not success (see index.jsx) and there is no ErrorBoundary in
 *     this app, so every read here is defensive.
 */
import { useMemo } from "react";
import { C, S, fmtPts, fmtAsOf } from "./theme.js";
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

function score(n) {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function SideRow({ side, winning }) {
  if (!side) return null;
  return (
    <div style={S.gameSide}>
      <TeamName team={side} />
      <span
        style={{
          fontSize: 15,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          color: winning ? C.green : C.text,
          flexShrink: 0,
        }}
      >
        {fmtPts(side.points)}
      </span>
    </div>
  );
}

function GameCard({ game }) {
  const bye = game.kind === "bye";
  const home = game.home || null;
  const away = bye ? null : game.away || null;

  /* Leader in green — but only once somebody has actually scored, so a 0.00 vs
     0.00 week-one card does not crown a "leader" before kickoff. */
  const hp = score(home && home.points);
  const ap = score(away && away.points);
  const live = hp > 0 || ap > 0;

  return (
    <div
      style={{
        ...S.gameCard,
        ...(game.hasMine ? { borderLeft: `3px solid ${C.blue}` } : null),
      }}
    >
      <SideRow side={home} winning={live && !bye && hp > ap} />
      {bye ? (
        <div style={{ fontSize: 12, color: C.muted, paddingTop: 4 }}>
          No matchup this week
        </div>
      ) : (
        <SideRow side={away} winning={live && ap > hp} />
      )}
    </div>
  );
}

function RaceTable({ race, week }) {
  const teams = asArray(race && race.teams);
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
                  <td style={S.td}>{fmtPts(t.points)}</td>
                  <td
                    style={{
                      ...S.td,
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

function MatchupsBody({ league, week }) {
  if (league.format === "guillotine") {
    /* race is null whenever the league is not mid-season; LeagueCard has
       already handled pre_draft and error, so this is the belt-and-braces
       branch rather than the expected one. */
    if (!league.race) {
      return (
        <StatePanel>
          {league.note || "No scoring race for this week."}
        </StatePanel>
      );
    }
    return <RaceTable race={league.race} week={week} />;
  }

  const games = asArray(league.games);
  if (games.length === 0) {
    return (
      <StatePanel>
        {league.note || `No matchups posted for week ${week} yet.`}
      </StatePanel>
    );
  }
  return (
    <div>
      {games.map((g, i) => (
        <GameCard key={g.gameId || i} game={g} />
      ))}
    </div>
  );
}

export default function FantasyMatchups() {
  const { body, err, loading, reload } = useFantasyFeed("/matchups");

  const leagues = useMemo(() => asArray(body && body.leagues), [body]);

  if (loading && !body) return <Center>Loading matchups…</Center>;

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
  // Whatever the API says the week is — never a constant in this file.
  const week = (body && body.week) || season.week || null;
  const bits = [];
  if (week) bits.push(`Week ${week}`);
  if (season.sleeper_season) bits.push(`${season.sleeper_season} season`);

  return (
    <Shell>
      <PageHeader
        title="🏈 Fantasy Matchups"
        subtitle={bits.join(" · ")}
        stale={Boolean(body && body.stale)}
        asOf={fmtAsOf(body && body.as_of)}
        onRefresh={reload}
      />
      <TabStrip active="matchups" />

      {err && leagues.length ? (
        <div style={{ marginBottom: 12 }}>
          <StatePanel>
            The last refresh failed ({err}) — these scores may be out of date.
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
            <MatchupsBody league={l} week={week} />
          </LeagueCard>
        ))
      )}
    </Shell>
  );
}
