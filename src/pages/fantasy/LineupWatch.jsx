/* Fantasy Watch — LINEUP tab. Route /fantasy/lineup.
 *
 * The Sunday-morning screen: is anything about to cost me points right now?
 *   GET https://sheline-art-website-api.herokuapp.com/fantasy-watch/dashboard
 *
 * File name is LineupWatch (not Lineup) on purpose — src/pages/fantasy/Lineup.jsx
 * is a DIFFERENT, unrelated shared component (the per-matchup lineup renderer
 * for /fantasy/sleeper, /fantasy/espn, /fantasy/guillotine) added the same day
 * by different work; this avoids clobbering that file.
 *
 * PAYLOAD CONTRACT, traced from routes/fantasyWatch.js directly (not the design
 * doc, which is the plan not the shipped shape):
 *   ok, stale, as_of, week, season are always present; error is present only
 *   on the no-snapshot / cold-start path (leagues/strip/targets all [] then).
 *   strip[] flag objects are CAMEL CASE (kind, severity, slot, playerKey,
 *   playerName, pos, team, status, kickoffAt, locked, pointsAtRisk, alt?,
 *   leagueId, leagueName, url) — built fresh every cycle by
 *   services/fantasyWatch/lineup.js + alerts.js. `alertId` is present ONLY
 *   for the five kinds that generate a real alert row (EMPTY_SLOT,
 *   STARTER_OUT, STARTER_BYE, STARTER_DOUBTFUL, Q_NEAR_KICK) — a
 *   LINEUP_UPGRADE flag has none, and Done for it is a pure client-side hide.
 *   TWO FLAGS CAN BE IDENTICAL when there is no player attached (e.g. two
 *   empty FLEX slots in the same league both have playerKey:null) — the
 *   composite key below disambiguates duplicates with a running counter so
 *   dismissing one never silently hides the other (caught in review
 *   2026-09-10).
 *   The TOP-LEVEL `alerts[]` (recent alert history, separate from `strip`) is
 *   a raw `SELECT * FROM fw_alerts` and is SNAKE CASE (league_id, player_name,
 *   kickoff_at, created_at) — do not mix the two conventions up.
 *   A `leagues[]` entry ALWAYS carries the leagueShell keys (leagueId,
 *   provider, name, format, status, totalTeams, myTeamId, note, error,
 *   columns). It carries `lineup`/`faab`/`needs`/`pickups`/`drops`/`market`
 *   ONLY on a successful in-season build — a pre_draft or error league has
 *   needs:{}, pickups:[], drops:[] but NO lineup/faab/market key AT ALL
 *   (undefined, not null). Every read below goes through `?.`/`??`.
 *
 * NO ErrorBoundary in this app — every field read here is defensive.
 */
import { useMemo, useState } from "react";
import { C, S, fmtAsOf } from "./theme.js";
import { asArray, useFantasyFeed } from "./useFantasyFeed.js";
import { Center, Shell, TabStrip, LeagueCard, StatePanel, PageHeader, RetryButton } from "./ui.jsx";
import { StatusDot, PlayerRow, StripItem, Expand } from "./rosterUi.jsx";
import { WATCH_BASE } from "./roster.js";

async function dismissAlert(id) {
  try {
    await fetch(`${WATCH_BASE}/alerts/${encodeURIComponent(id)}/dismiss`, { method: "POST" });
    return true;
  } catch {
    return false;
  }
}

function LineupCardBody({ league }) {
  const [open, setOpen] = useState(false);
  const lineup = league.lineup;
  if (!lineup || !Array.isArray(lineup.starters)) {
    return <StatePanel>No lineup data for this league yet.</StatePanel>;
  }
  const starters = asArray(lineup.starters);
  const clean = starters.every((s) => s.player && ["ACTIVE", "Q"].includes(s.player.status));
  return (
    <div>
      {/* Glance row: one dot per starting slot, no names — the expand below
          is where a name-level read happens. */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        {starters.map((s, i) => (
          <StatusDot key={i} status={s.player ? s.player.status : "EMPTY"} title={`${s.slot}: ${s.player ? s.player.name : "empty"}`} />
        ))}
        {clean ? (
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 4 }}>all clean</span>
        ) : null}
      </div>
      {Number.isFinite(lineup.optimalDelta) && lineup.optimalDelta > 0.5 ? (
        <div style={{ fontSize: 12, color: C.amber, marginBottom: 6 }}>
          Optimal lineup is +{lineup.optimalDelta.toFixed(1)} pts over what's currently set.
        </div>
      ) : null}
      <Expand open={open} onToggle={() => setOpen((o) => !o)} label={open ? "Hide starters" : "Show starters"}>
        <div style={{ marginTop: 4 }}>
          {starters.map((s, i) => (
            <PlayerRow key={i} slotLabel={s.slot} player={s.player} />
          ))}
        </div>
      </Expand>
    </div>
  );
}

export default function LineupWatch() {
  const { body, err, loading, reload } = useFantasyFeed("/dashboard", WATCH_BASE);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [dismissing, setDismissing] = useState(null);

  const leagues = useMemo(() => asArray(body && body.leagues), [body]);
  const strip = useMemo(() => {
    const seen = new Map();
    return asArray(body && body.strip)
      .map((item) => {
        const base = stripKey(item);
        const n = (seen.get(base) || 0) + 1;
        seen.set(base, n);
        // Only a real duplicate (identical league+player-or-slot+kind — only
        // possible when playerKey is null, e.g. two empty FLEX slots) gets a
        // suffix; every ordinary flag keeps its plain, stable key.
        return { ...item, _key: n > 1 ? `${base}#${n}` : base };
      })
      .filter((item) => !dismissed.has(item._key));
  }, [body, dismissed]);

  if (loading && !body) return <Center>Loading lineups…</Center>;

  if (err && !leagues.length) {
    return (
      <Center>
        Could not reach Fantasy Watch: {err}. Try again, or check the sheline backend.
        <RetryButton onClick={reload} />
      </Center>
    );
  }

  const onDismiss = async (item) => {
    const key = item._key;
    setDismissing(key);
    // Optimistic: hide it now. If it has no alert id (a flag that never
    // crossed the alert threshold, e.g. a low-severity upgrade), there is
    // nothing to POST — the client-side hide is the whole story.
    setDismissed((prev) => new Set(prev).add(key));
    if (item.alertId) {
      const ok = await dismissAlert(item.alertId);
      if (!ok) {
        // failure refetches rather than trusting the optimistic hide, per
        // the /patrick convention
        reload();
      }
    }
    setDismissing(null);
  };

  const season = (body && body.season) || null;
  const bits = [];
  if (body && body.week) bits.push(`Week ${body.week}`);
  if (season) bits.push(`${season} season`);

  return (
    <Shell>
      <PageHeader
        title="🚨 Lineup Watch"
        subtitle={bits.join(" · ")}
        stale={Boolean(body && body.stale)}
        asOf={fmtAsOf(body && body.as_of)}
        onRefresh={reload}
      />
      <TabStrip active="lineup" />

      {err && leagues.length ? (
        <div style={{ marginBottom: 12 }}>
          <StatePanel>The last refresh failed ({err}) — this may be out of date.</StatePanel>
        </div>
      ) : null}

      {/* Action strip — the glance layer. */}
      <div style={{ marginBottom: 16 }}>
        {strip.length === 0 ? (
          <div style={{ ...S.card, textAlign: "center", color: C.muted, fontSize: 13 }}>All lineups clean ✓</div>
        ) : (
          strip.map((item) => (
            <StripItem
              key={item._key}
              item={item}
              dismissing={dismissing === item._key}
              onDismiss={() => onDismiss(item)}
            />
          ))
        )}
      </div>

      {leagues.length === 0 ? (
        <div style={S.card}>
          <StatePanel>The backend returned no leagues.</StatePanel>
        </div>
      ) : (
        leagues.map((l, i) => (
          <LeagueCard key={l.leagueId || i} league={l}>
            <LineupCardBody league={l} />
          </LeagueCard>
        ))
      )}
    </Shell>
  );
}

function stripKey(item) {
  return `${item.leagueId || "?"}:${item.playerKey || item.slot || "?"}:${item.kind}`;
}
