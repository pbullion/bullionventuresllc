/* Fantasy Watch — WAIVERS tab. Route /fantasy/waivers.
 *
 * The Tuesday/Wednesday screen: who do I go after, and how much cash.
 *   GET https://sheline-art-website-api.herokuapp.com/fantasy-watch/dashboard
 * (the SAME snapshot LineupWatch.jsx reads — one cycle, two views of it.)
 *
 * See LineupWatch.jsx's header comment for the full payload contract. The
 * fields this screen specifically depends on, and their gaps:
 *   targets[] — {playerKey, name, pos, team, leaguesNeeding:[leagueId,...],
 *     heat, bestBid} — cross-league only when a player helps >=2 leagues;
 *     often empty early in a season and that is a correct, quiet state.
 *   league.needs — {} on pre_draft/error, else a full 6-position map.
 *   league.pickups / league.drops — [] when there is nothing to recommend
 *     (pre_draft, error, or genuinely no candidate scored above 0) — an empty
 *     array is a real "nothing to do here", not a loading state.
 *   league.faab — present ONLY for Sleeper leagues with a FAAB budget; ESPN
 *     leagues and non-FAAB Sleeper leagues carry `faab: null`.
 *   league.market — present ONLY once a Sleeper league has 5+ recorded winning
 *     bids (services/fantasyWatch's calibration floor); absent (undefined)
 *     otherwise and on every ESPN league today (FAAB pricing not wired for
 *     ESPN yet — see the backend PR's stated gap).
 */
import { useMemo, useState } from "react";
import { C, S, fmtAsOf } from "./theme.js";
import { asArray, useFantasyFeed } from "./useFantasyFeed.js";
import { Center, Shell, TabStrip, LeagueCard, StatePanel, Chip, PageHeader, RetryButton } from "./ui.jsx";
import { PosBadge, NeedBars, PickupRow, DropRow, Expand } from "./rosterUi.jsx";
import { WATCH_BASE } from "./roster.js";

const GUILLOTINE_HIDDEN_POS = ["K", "DEF"];

function TargetChip({ target }) {
  const flames = "🔥".repeat(Math.max(1, Math.min(3, Math.round((target.heat || 0) * 3))));
  return (
    <div
      style={{
        background: C.panel2,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        flex: "0 0 auto",
      }}
    >
      <PosBadge pos={target.pos} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{target.name || target.playerKey}</div>
        <div style={{ fontSize: 11, color: C.muted }}>
          needed in {(target.leaguesNeeding || []).length} {target.heat ? flames : ""}
        </div>
      </div>
    </div>
  );
}

function WaiversCardBody({ league }) {
  const [pickupsOpen, setPickupsOpen] = useState(false);
  const pickups = asArray(league.pickups);
  const drops = asArray(league.drops);
  const hidePositions = league.format === "guillotine" ? GUILLOTINE_HIDDEN_POS : [];
  const market = league.market;
  const faab = league.faab;

  if (!league.needs || Object.keys(league.needs).length === 0) {
    // pre_draft / error — LeagueCard has already rendered that state's panel;
    // this only guards a stray render if it's ever called anyway.
    return null;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <NeedBars needs={league.needs} hidePositions={hidePositions} />
        {faab ? <Chip>FAAB ${faab.left ?? "—"} left{Number.isFinite(faab.pctLeft) ? ` (${faab.pctLeft}%)` : ""}</Chip> : null}
      </div>

      {pickups.length === 0 ? (
        <StatePanel>No pickup worth a claim this week.</StatePanel>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Top pickups</div>
          {pickups.slice(0, pickupsOpen ? pickups.length : 3).map((p) => (
            <PickupRow key={p.playerKey} pickup={p} />
          ))}
          {pickups.length > 3 ? (
            <Expand open={pickupsOpen} onToggle={() => setPickupsOpen((o) => !o)} label={pickupsOpen ? "Show fewer" : `Show all ${pickups.length}`} />
          ) : null}
        </>
      )}

      {drops.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Drop candidates</div>
          {drops.map((d) => (
            <DropRow key={d.playerKey} drop={d} />
          ))}
        </div>
      ) : null}

      {market ? (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10 }}>
          This league pays: median ${Math.round(market.median)}, top ${Math.round(market.p75)} ({market.sampleSize} claims)
        </div>
      ) : null}
    </div>
  );
}

export default function Waivers() {
  const { body, err, loading, reload } = useFantasyFeed("/dashboard", WATCH_BASE);
  const leagues = useMemo(() => asArray(body && body.leagues), [body]);
  const targets = useMemo(() => asArray(body && body.targets), [body]);

  if (loading && !body) return <Center>Loading the waiver desk…</Center>;

  if (err && !leagues.length) {
    return (
      <Center>
        Could not reach Fantasy Watch: {err}. Try again, or check the sheline backend.
        <RetryButton onClick={reload} />
      </Center>
    );
  }

  // season is a bare string from the backend (or null on cold start) — see
  // LineupWatch.jsx's header comment for the fuller contract note.
  const season = (body && body.season) || null;
  const bits = [];
  if (body && body.week) bits.push(`Week ${body.week}`);
  if (season) bits.push(`${season} season`);

  return (
    <Shell>
      <PageHeader
        title="🧾 Waiver Desk"
        subtitle={bits.join(" · ")}
        stale={Boolean(body && body.stale)}
        asOf={fmtAsOf(body && body.as_of)}
        onRefresh={reload}
      />
      <TabStrip active="waivers" />

      {err && leagues.length ? (
        <div style={{ marginBottom: 12 }}>
          <StatePanel>The last refresh failed ({err}) — these numbers may be out of date.</StatePanel>
        </div>
      ) : null}

      {targets.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
            Helps more than one team
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
            {targets.map((t) => (
              <TargetChip key={t.playerKey} target={t} />
            ))}
          </div>
        </div>
      ) : null}

      {leagues.length === 0 ? (
        <div style={S.card}>
          <StatePanel>The backend returned no leagues.</StatePanel>
        </div>
      ) : (
        leagues.map((l, i) => (
          <LeagueCard key={l.leagueId || i} league={l}>
            <WaiversCardBody league={l} />
          </LeagueCard>
        ))
      )}
    </Shell>
  );
}
