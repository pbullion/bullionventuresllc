import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* FF Draft War Room — live draft assistant for Patrick's ESPN league
 * ("The League", id 1429051163, 2026). Backend: sheline /ffdraft.
 *   GET /ffdraft/board — consensus board (ESPN proj/ADP + FantasyPros ECR +
 *     FFCalculator ADP + Boris Chen tiers), league meta, pick order.
 *   GET /ffdraft/live  — ESPN mDraftDetail picks, polled during the draft.
 * Players can also be marked off manually as a fallback if ESPN's feed lags —
 * marks live in Postgres (ffdraft_manual_marks) and ride along on the /live
 * poll, so every device sees the same board. Live data wins on conflict. */

const API = "https://sheline-art-website-api.herokuapp.com/ffdraft";
const MY_TEAM_ID = 5; // Touchdown My Pants
const TEAMS = 10;
const ROUNDS = 16;
// starters: 1QB / 2RB / 2WR / 1TE / 2FLEX / 1DST — no kicker in this league
const STARTERS = { QB: 1, RB: 2, WR: 2, TE: 1, DST: 1 };
const FLEX_SLOTS = 2;
const FLEX_ELIGIBLE = new Set(["RB", "WR", "TE"]);

const C = {
  bg: "#0b0e14",
  panel: "#151a24",
  panel2: "#101520",
  border: "#252c3a",
  text: "#e8eaed",
  muted: "#8a93a6",
  green: "#22c55e",
  amber: "#eab308",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a78bfa",
  chipBg: "#1c2430",
};

const POS_COLOR = {
  QB: "#ef6aa4",
  RB: "#22c55e",
  WR: "#3b82f6",
  TE: "#eab308",
  DST: "#a78bfa",
  K: "#8a93a6",
};

// standard normal CDF (Abramowitz & Stegun erf approximation)
function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

// my overall pick numbers in the snake, from the league's pick order
function myPickNumbers(pickOrder) {
  const idx = pickOrder.indexOf(MY_TEAM_ID);
  if (idx === -1) return [];
  const slot = idx + 1;
  const picks = [];
  for (let r = 1; r <= ROUNDS; r++) {
    const within = r % 2 === 1 ? slot : TEAMS + 1 - slot;
    picks.push((r - 1) * TEAMS + within);
  }
  return picks;
}

// which team owns overall pick n in the snake
function teamAtPick(pickOrder, n) {
  const r = Math.ceil(n / TEAMS);
  const within = n - (r - 1) * TEAMS;
  return pickOrder[r % 2 === 1 ? within - 1 : TEAMS - within];
}

// P(player still available at overall pick n), from mock-draft ADP spread
function availAt(p, n) {
  if (p.ffcAdp == null) return 1;
  const sd = p.ffcStdev && p.ffcStdev > 0 ? p.ffcStdev : 6;
  return 1 - normCdf((n - p.ffcAdp) / sd);
}

// practice-mode bot: drafts by market ADP with noise, respecting the roster
// shapes real drafters follow in this league (no kickers, late DST, <=2 QB/TE)
function botSelect(avail, filled, round) {
  const cands = avail.filter((p) => {
    if (p.pos === "K") return false;
    if (p.pos === "DST") return round >= 12 && (filled.DST || 0) < 1;
    if (p.pos === "QB" && (filled.QB || 0) >= 2) return false;
    if (p.pos === "TE" && (filled.TE || 0) >= 2) return false;
    return true;
  });
  if (!cands.length) return avail[0];
  if (round >= 12) {
    const missing = ["QB", "TE", "DST"].filter((pos) => (filled[pos] || 0) < 1);
    if (missing.length && Math.random() < 0.6) {
      const pool = cands
        .filter((p) => missing.includes(p.pos))
        .sort((a, b) => (a.consensusRank ?? 999) - (b.consensusRank ?? 999));
      if (pool.length) return pool[0];
    }
  }
  let best = null;
  for (const p of cands) {
    const adp = p.ffcAdp ?? p.espnAdp ?? p.consensusRank ?? 400;
    const s = adp * (1 + (Math.random() - 0.5) * 0.2);
    if (!best || s < best.s) best = { p, s };
  }
  return best.p;
}

export default function FFDraft() {
  const [board, setBoard] = useState(null);
  const [boardErr, setBoardErr] = useState(null);
  const [live, setLive] = useState(null);
  const [liveErr, setLiveErr] = useState(null);
  const [manual, setManual] = useState({}); // {playerId: "other"|"mine"} — server-backed
  const [posFilter, setPosFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showDrafted, setShowDrafted] = useState(false);
  const [sim, setSim] = useState(null); // null | {picks: [{pick,teamId,playerId}]}
  const liveRef = useRef(null);
  // marks written but not yet confirmed by the server, so an in-flight poll
  // response can't momentarily undo an optimistic click
  const pendingRef = useRef(new Map()); // playerId -> "other"|"mine"|null

  useEffect(() => {
    let dead = false;
    fetch(`${API}/board`)
      .then((r) => r.json())
      .then((d) => !dead && setBoard(d))
      .catch((e) => !dead && setBoardErr(String(e)));
    return () => (dead = true);
  }, []);

  // poll the live draft feed — fast while in progress, slower otherwise
  useEffect(() => {
    let dead = false;
    let timer;
    const tick = async () => {
      try {
        const d = await fetch(`${API}/live`).then((r) => r.json());
        if (dead) return;
        setLive(d);
        setLiveErr(null);
        liveRef.current = d;
        const merged = { ...(d.marks || {}) };
        for (const [id, mark] of pendingRef.current) {
          if (mark) merged[id] = mark;
          else delete merged[id];
        }
        setManual(merged);
      } catch (e) {
        if (!dead) setLiveErr(String(e));
      }
      if (dead) return;
      const cur = liveRef.current;
      const ms = cur?.drafted ? 60000 : cur?.inProgress ? 5000 : 15000;
      timer = setTimeout(tick, ms);
    };
    tick();
    return () => {
      dead = true;
      clearTimeout(timer);
    };
  }, []);

  const setManualMark = (playerId, mark) => {
    pendingRef.current.set(String(playerId), mark);
    setManual((prev) => {
      const next = { ...prev };
      if (mark) next[playerId] = mark;
      else delete next[playerId];
      return next;
    });
    const req = mark
      ? fetch(`${API}/marks/${playerId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mark }),
        })
      : fetch(`${API}/marks/${playerId}`, { method: "DELETE" });
    // once the server answers (either way), the next poll is the truth — a
    // failed write simply reverts on the following tick
    req.finally(() => pendingRef.current.delete(String(playerId)));
  };

  // bots pick from `picks` until it's my turn (or the draft ends); returns
  // the extended pick list. Practice mode only — never touches the server.
  const advanceBots = (picks) => {
    const players = board?.players || [];
    const byId = new Map(players.map((p) => [p.espnId, p]));
    const order = board?.league?.pickOrder || [];
    const taken = new Set(picks.map((x) => x.playerId));
    let n = picks.length + 1;
    while (n <= TEAMS * ROUNDS && teamAtPick(order, n) !== MY_TEAM_ID) {
      const tid = teamAtPick(order, n);
      const filled = {};
      for (const pk of picks)
        if (pk.teamId === tid) {
          const pos = byId.get(pk.playerId)?.pos;
          if (pos) filled[pos] = (filled[pos] || 0) + 1;
        }
      const avail = players.filter((p) => !taken.has(p.espnId));
      const choice = botSelect(avail, filled, Math.ceil(n / TEAMS));
      if (!choice) break;
      picks.push({ pick: n, teamId: tid, playerId: choice.espnId });
      taken.add(choice.espnId);
      n++;
    }
    return picks;
  };

  const startSim = () => setSim({ picks: advanceBots([]) });
  const exitSim = () => setSim(null);
  const simDraft = (playerId) => {
    setSim((prev) => {
      if (!prev) return prev;
      const picks = [...prev.picks];
      picks.push({ pick: picks.length + 1, teamId: MY_TEAM_ID, playerId });
      return { picks: advanceBots(picks) };
    });
  };

  const model = useMemo(() => {
    if (!board) return null;
    const players = board.players || [];
    const byId = new Map(players.map((p) => [p.espnId, p]));
    const teamName = new Map(
      (board.league?.teams || []).map((t) => [t.id, t.name])
    );

    // practice mode swaps in simulated picks and ignores manual marks
    const livePicks = sim ? sim.picks : live?.picks || [];
    const liveById = new Map(livePicks.map((p) => [p.playerId, p]));

    // drafted = live feed ∪ manual marks (live wins)
    const drafted = new Map(); // playerId -> {by: "live"|"manual", teamId?, mine}
    for (const pk of livePicks)
      drafted.set(pk.playerId, {
        by: "live",
        teamId: pk.teamId,
        pick: pk.pick,
        mine: pk.teamId === MY_TEAM_ID,
      });
    if (!sim)
      for (const [idStr, mark] of Object.entries(manual)) {
        const id = Number(idStr);
        if (!liveById.has(id))
          drafted.set(id, { by: "manual", mine: mark === "mine" });
      }

    const totalDrafted = drafted.size;
    const currentPick = totalDrafted + 1;
    const round = Math.min(ROUNDS, Math.ceil(currentPick / TEAMS));
    const mine = myPickNumbers(board.league?.pickOrder || []);
    const myNext = mine.find((n) => n >= currentPick) ?? null;
    const myNextNext = mine.filter((n) => n >= currentPick)[1] ?? null;
    const picksUntilMine = myNext != null ? myNext - currentPick : null;

    const myPlayers = players.filter((p) => drafted.get(p.espnId)?.mine);

    // fill my roster slots greedily: starter slot -> flex -> bench
    const slotsFilled = { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0 };
    let flexFilled = 0;
    const roster = { starters: [], flex: [], bench: [] };
    for (const p of myPlayers) {
      if (slotsFilled[p.pos] < (STARTERS[p.pos] || 0)) {
        slotsFilled[p.pos]++;
        roster.starters.push(p);
      } else if (FLEX_ELIGIBLE.has(p.pos) && flexFilled < FLEX_SLOTS) {
        flexFilled++;
        roster.flex.push(p);
      } else {
        roster.bench.push(p);
      }
    }

    // need multiplier per position for suggestion scoring
    const needMult = (pos) => {
      if (pos === "K") return 0;
      if (pos === "DST")
        return slotsFilled.DST < 1 ? (round >= 12 ? 1 : 0.15) : 0.05;
      const open = (STARTERS[pos] || 0) - slotsFilled[pos];
      if (open > 0) return 1;
      if (FLEX_ELIGIBLE.has(pos) && flexFilled < FLEX_SLOTS)
        return pos === "TE" ? 0.7 : 0.9;
      const posCount = myPlayers.filter((x) => x.pos === pos).length;
      const surplus = posCount - (STARTERS[pos] || 0);
      return Math.max(0.15, 0.6 ** Math.max(1, surplus - 1));
    };

    const avail = players.filter((p) => !drafted.has(p.espnId));

    // tier scarcity: remaining players in each pos+FP-tier
    const tierLeft = new Map();
    for (const p of avail) {
      if (p.fpTier == null) continue;
      const k = `${p.pos}:${p.fpTier}`;
      tierLeft.set(k, (tierLeft.get(k) || 0) + 1);
    }

    // bye-week exposure across my current roster
    const myByeCounts = {};
    for (const p of myPlayers)
      if (p.bye) myByeCounts[p.bye] = (myByeCounts[p.bye] || 0) + 1;

    const enrich = (p) => {
      // chance the player is still on the board at my NEXT pick
      let availPct = null;
      if (myNext != null && p.ffcAdp != null) {
        const sd = p.ffcStdev && p.ffcStdev > 0 ? p.ffcStdev : 6;
        availPct = Math.round((1 - normCdf((myNext - p.ffcAdp) / sd)) * 100);
      }
      const left = p.fpTier != null ? tierLeft.get(`${p.pos}:${p.fpTier}`) : null;
      const mult = needMult(p.pos);
      let score = (p.vorp ?? 0) * mult + (left != null && left <= 2 ? 12 : 0);
      // falling value: the market says this player should already be gone
      const fallingBy =
        p.ffcAdp != null && currentPick - p.ffcAdp >= 8
          ? Math.round(currentPick - p.ffcAdp)
          : 0;
      if (fallingBy) score += Math.min(20, fallingBy * 0.8);
      // bye stacking: a 3rd starter on the same bye turns one bad week into a loss
      const byeClash = p.bye ? myByeCounts[p.bye] || 0 : 0;
      if (byeClash >= 2) score -= 8 * (byeClash - 1);
      // late rounds: bench spots are lottery tickets — chase ceiling, not floor
      if (round >= 11 && (p.disagreement ?? 0) >= 20) score += 8;
      // Until it's actually my pick, a target only matters if they can reach
      // me — weight by the chance they're still on the board at my next pick.
      const onClock = myNext != null && myNext === currentPick;
      if (!onClock && availPct != null)
        score *= Math.max(0.05, availPct / 100);
      return {
        ...p,
        availPct,
        tierLeftCount: left,
        needMult: mult,
        score,
        fallingBy,
        byeClash,
      };
    };

    const enriched = avail.map(enrich);
    const suggestions = [...enriched]
      .filter((p) => p.vorp != null && p.vorp > -20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((p) => {
        const reasons = [];
        const open = (STARTERS[p.pos] || 0) - slotsFilled[p.pos];
        if (open > 0 && p.pos !== "DST") reasons.push(`starting ${p.pos} open`);
        else if (p.needMult >= 0.7 && FLEX_ELIGIBLE.has(p.pos))
          reasons.push("flex value");
        if (p.tierLeftCount != null && p.tierLeftCount <= 2)
          reasons.push(`only ${p.tierLeftCount} left in tier ${p.fpTier}`);
        if (p.fallingBy) reasons.push(`falling — ${p.fallingBy} past ADP`);
        if (p.byeClash >= 2)
          reasons.push(`⚠ bye ${p.bye} stack (${p.byeClash} rostered)`);
        if (p.availPct != null && p.availPct < 40)
          reasons.push(`only ${p.availPct}% chance they reach you`);
        if (p.disagreement != null && p.disagreement >= 25)
          reasons.push("sources split — upside play");
        if (!reasons.length) reasons.push("best value on board");
        return { ...p, reasons };
      });

    const recent = [...livePicks]
      .sort((a, b) => b.pick - a.pick)
      .slice(0, 8)
      .map((pk) => ({
        ...pk,
        player: byId.get(pk.playerId),
        teamName: teamName.get(pk.teamId) || `Team ${pk.teamId}`,
      }));

    // position run: 4+ of the last 8 live picks at one position
    const recentPos = [...livePicks]
      .sort((a, b) => a.pick - b.pick)
      .slice(-8)
      .map((pk) => byId.get(pk.playerId)?.pos)
      .filter((pos) => pos && pos !== "DST");
    const runCounts = {};
    for (const pos of recentPos) runCounts[pos] = (runCounts[pos] || 0) + 1;
    const run =
      recentPos.length >= 8
        ? Object.entries(runCounts).find(([, c]) => c >= 4) || null
        : null;

    // what the teams picking between now and my next pick still need —
    // predicts what disappears better than raw ADP does. Live picks only;
    // meaningless in round 1 when everyone needs everything.
    const pickOrder = board.league?.pickOrder || [];
    const filledByTeam = {};
    for (const pk of livePicks) {
      const pos = byId.get(pk.playerId)?.pos;
      if (!pos) continue;
      (filledByTeam[pk.teamId] = filledByTeam[pk.teamId] || {})[pos] =
        (filledByTeam[pk.teamId][pos] || 0) + 1;
    }
    let demand = null;
    if (totalDrafted >= TEAMS && myNext != null && myNext > currentPick) {
      demand = {};
      for (let n = currentPick; n < myNext; n++) {
        const tid = teamAtPick(pickOrder, n);
        if (tid === MY_TEAM_ID || tid == null) continue;
        const filled = filledByTeam[tid] || {};
        for (const pos of Object.keys(STARTERS)) {
          if (pos === "DST" && round < 12) continue;
          if ((filled[pos] || 0) < STARTERS[pos])
            demand[pos] = (demand[pos] || 0) + 1;
        }
      }
    }

    // league roster grid: positional counts per team, in draft order
    const teamRosters =
      livePicks.length > 0
        ? pickOrder.map((tid) => ({
            id: tid,
            name: teamName.get(tid) || `Team ${tid}`,
            mine: tid === MY_TEAM_ID,
            counts: filledByTeam[tid] || {},
          }))
        : null;

    // cost of waiting: best at each position NOW vs the best likely to
    // survive to my FOLLOWING pick. Big number = take that position now.
    const onClock = picksUntilMine === 0;
    let waitCost = null;
    const nowPick = onClock ? currentPick : myNext;
    const laterPick = nowPick != null ? mine.find((n) => n > nowPick) : null;
    if (nowPick != null && laterPick != null) {
      waitCost = ["RB", "WR", "TE", "QB"]
        .map((pos) => {
          const atPos = enriched
            .filter((p) => p.pos === pos && p.vorp != null)
            .sort((a, b) => b.vorp - a.vorp);
          const bestNow = atPos.find(
            (p) => onClock || availAt(p, nowPick) >= 0.5
          );
          if (!bestNow) return null;
          const bestLater = atPos.find(
            (p) => p !== bestNow && availAt(p, laterPick) >= 0.55
          );
          return {
            pos,
            cost: Math.round((bestNow.vorp - (bestLater?.vorp ?? 0)) * 10) / 10,
            now: bestNow.name,
            later: bestLater?.name || "nobody startable",
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.cost - a.cost);
    }

    // draft plan: for each of my next picks, who is likely (>=50%) to be
    // there, ranked by value-x-need (availability already gates the list)
    const plan = mine
      .filter((n) => n >= currentPick)
      .slice(0, 4)
      .map((n) => ({
        pick: n,
        round: Math.ceil(n / TEAMS),
        targets: enriched
          .filter((p) => p.vorp != null && p.needMult > 0.1)
          .map((p) => {
            const sd = p.ffcStdev && p.ffcStdev > 0 ? p.ffcStdev : 6;
            const availHere =
              p.ffcAdp != null ? 1 - normCdf((n - p.ffcAdp) / sd) : 1;
            return { ...p, availHere };
          })
          .filter((p) => p.availHere >= 0.5)
          .sort((a, b) => b.vorp * b.needMult - a.vorp * a.needMult)
          .slice(0, 3),
      }));

    return {
      drafted,
      enriched,
      suggestions,
      roster,
      myPlayers,
      run,
      demand,
      plan,
      waitCost,
      teamRosters,
      currentPick,
      round,
      totalDrafted,
      myNext,
      myNextNext,
      picksUntilMine,
      onTheClock: picksUntilMine === 0,
      recent,
      teamName,
      byId,
    };
  }, [board, live, manual, sim]);

  if (boardErr)
    return (
      <Center>
        Failed to load the board: {boardErr}. Refresh, or check the sheline
        backend.
      </Center>
    );
  if (!board || !model) return <Center>Loading consensus board…</Center>;

  const status = sim
    ? {
        label:
          sim.picks.length >= TEAMS * ROUNDS
            ? "PRACTICE COMPLETE"
            : "PRACTICE MODE",
        color: C.purple,
      }
    : live?.drafted
    ? { label: "DRAFT COMPLETE", color: C.muted }
    : live?.inProgress
    ? { label: "LIVE — SYNCED", color: C.green }
    : liveErr
    ? { label: "SYNC ERROR — MANUAL MODE", color: C.red }
    : { label: "PRE-DRAFT", color: C.amber };

  const rows = model.enriched
    .concat(
      showDrafted
        ? board.players
            .filter((p) => model.drafted.has(p.espnId))
            .map((p) => ({ ...p, isDrafted: true }))
        : []
    )
    .filter((p) => {
      if (posFilter === "FLEX") {
        if (!FLEX_ELIGIBLE.has(p.pos)) return false;
      } else if (posFilter !== "ALL" && p.pos !== posFilter) return false;
      if (
        search &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.team.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    })
    .sort(
      (a, b) => (a.consensusRank ?? 9999) - (b.consensusRank ?? 9999)
    )
    .slice(0, 250);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "14px 16px 60px",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800 }}>
          🏈 Draft War Room{" "}
          <span style={{ color: C.muted, fontWeight: 400, fontSize: 14 }}>
            {board.league?.name} · 10-team PPR snake · you pick 7th
          </span>
        </div>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: C.chipBg,
            color: status.color,
            border: `1px solid ${C.border}`,
          }}
        >
          ● {status.label}
        </span>
        {board.stale && (
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background: C.chipBg,
              color: C.amber,
              border: `1px solid ${C.border}`,
            }}
            title="A ranking source was unreachable — this board is the last good snapshot from the database. Live pick sync is unaffected."
          >
            ⚠ SNAPSHOT BOARD
          </span>
        )}
        <Link
          to="/ffdraft/guide"
          style={{
            color: C.blue,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 999,
            padding: "3px 12px",
          }}
        >
          📖 how to use
        </Link>
        <div style={{ flex: 1 }} />
        {sim ? (
          <button
            onClick={exitSim}
            style={{
              background: "transparent",
              border: `1px solid ${C.purple}`,
              color: C.purple,
              borderRadius: 999,
              padding: "3px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            exit practice
          </button>
        ) : (
          (live?.picks?.length ?? 0) === 0 &&
          !live?.inProgress && (
            <button
              onClick={startSim}
              style={{
                background: "transparent",
                border: `1px solid ${C.purple}`,
                color: C.purple,
                borderRadius: 999,
                padding: "3px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Rehearse the draft against ADP-realistic bots. Nothing is saved — exit any time."
            >
              🎮 practice draft
            </button>
          )
        )}
        <label style={{ fontSize: 12, color: C.muted, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showDrafted}
            onChange={(e) => setShowDrafted(e.target.checked)}
            style={{ marginRight: 5 }}
          />
          show drafted
        </label>
        {showDrafted && Object.keys(manual).length > 0 && (
          <button
            onClick={() => {
              if (!window.confirm("Clear ALL manual marks for every device?"))
                return;
              pendingRef.current.clear();
              setManual({});
              fetch(`${API}/marks`, { method: "DELETE" });
            }}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.red,
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            reset manual marks
          </button>
        )}
      </div>

      {/* on-the-clock banner */}
      <div
        style={{
          background: model.onTheClock ? "#14351f" : C.panel,
          border: `1px solid ${model.onTheClock ? C.green : C.border}`,
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 18,
          alignItems: "baseline",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700 }}>
          {model.onTheClock
            ? "🚨 YOU'RE ON THE CLOCK"
            : `Pick ${model.currentPick} · Round ${model.round}`}
        </span>
        {!model.onTheClock && model.picksUntilMine != null && (
          <span style={{ color: C.amber, fontWeight: 600 }}>
            your turn in {model.picksUntilMine} pick
            {model.picksUntilMine === 1 ? "" : "s"} (#{model.myNext})
          </span>
        )}
        {model.myNextNext && (
          <span style={{ color: C.muted, fontSize: 13 }}>
            then #{model.myNextNext}
          </span>
        )}
        <span style={{ color: C.muted, fontSize: 13 }}>
          {model.totalDrafted}/160 picked
        </span>
        {live?.fetchedAt && (
          <span style={{ color: C.muted, fontSize: 12 }}>
            synced {new Date(live.fetchedAt).toLocaleTimeString()}
          </span>
        )}
        {model.run && (
          <span style={{ color: C.red, fontWeight: 700, fontSize: 13 }}>
            🔥 {model.run[0]} run — {model.run[1]} of last 8 picks
          </span>
        )}
        {model.demand && Object.keys(model.demand).length > 0 && (
          <span style={{ color: C.muted, fontSize: 12, width: "100%" }}>
            before your pick:{" "}
            {Object.entries(model.demand)
              .sort((a, b) => b[1] - a[1])
              .map(([pos, n]) => `${n} team${n === 1 ? "" : "s"} need ${pos}`)
              .join(" · ")}
          </span>
        )}
      </div>

      {/* cost of waiting — the take-now-vs-wait decision, quantified */}
      {model.waitCost && model.waitCost.length > 0 && (
        <div
          style={{
            background: C.panel2,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "8px 14px",
            marginBottom: 12,
            fontSize: 13,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "baseline",
          }}
        >
          <span style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>
            COST OF WAITING (this pick → your next)
          </span>
          {model.waitCost.map((w) => (
            <span
              key={w.pos}
              title={`${w.now} now vs ${w.later} at your following pick`}
            >
              <PosBadge pos={w.pos} />{" "}
              <span
                style={{
                  fontWeight: 700,
                  color:
                    w.cost >= 40 ? C.red : w.cost >= 20 ? C.amber : C.muted,
                }}
              >
                −{w.cost}
              </span>
            </span>
          ))}
          <span style={{ color: C.muted, fontSize: 11 }}>
            pts lost at each position if you wait — red means take it now
          </span>
        </div>
      )}

      {/* suggestions */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {model.suggestions.map((p, i) => (
          <div
            key={p.espnId}
            style={{
              background: i === 0 ? "#1a2b1f" : C.panel,
              border: `1px solid ${i === 0 ? C.green : C.border}`,
              borderRadius: 10,
              padding: "8px 12px",
              minWidth: 190,
              flex: "1 1 190px",
              maxWidth: 260,
            }}
          >
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>
              {i === 0 ? "⭐ TOP SUGGESTION" : `#${i + 1} suggestion`}
            </div>
            <div style={{ fontWeight: 700 }}>
              <PosBadge pos={p.pos} /> {p.name}{" "}
              <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}>
                {p.team}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
              {p.reasons.join(" · ")}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* main board */}
        <div style={{ flex: "1 1 640px", minWidth: 0 }}>
          {/* filters */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 10,
              alignItems: "center",
            }}
          >
            {["ALL", "QB", "RB", "WR", "TE", "FLEX", "DST"].map((f) => (
              <button
                key={f}
                onClick={() => setPosFilter(f)}
                style={{
                  background: posFilter === f ? C.blue : C.chipBg,
                  color: posFilter === f ? "#fff" : C.text,
                  border: `1px solid ${C.border}`,
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {f}
              </button>
            ))}
            <input
              placeholder="search player / team…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: C.panel2,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text,
                padding: "5px 10px",
                fontSize: 13,
                marginLeft: "auto",
                width: 180,
              }}
            />
          </div>

          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                minWidth: 760,
              }}
            >
              <thead>
                <tr style={{ color: C.muted, fontSize: 11, textAlign: "left" }}>
                  {[
                    "RK",
                    "PLAYER",
                    "TIER",
                    "CONS",
                    "FPROS",
                    "ADP",
                    "ESPN",
                    "PROJ",
                    "VORP",
                    "AVAIL@NEXT",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 8px",
                        borderBottom: `1px solid ${C.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const gone = model.drafted.get(p.espnId);
                  return (
                    <tr
                      key={p.espnId}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        opacity: gone ? 0.38 : 1,
                        textDecoration: gone ? "line-through" : "none",
                      }}
                    >
                      <td style={{ padding: "6px 8px", color: C.muted }}>
                        {p.overallRank}
                      </td>
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                        <PosBadge pos={p.pos} />{" "}
                        <span style={{ fontWeight: 600 }}>{p.name}</span>{" "}
                        <span style={{ color: C.muted, fontSize: 11 }}>
                          {p.team} · bye {p.bye || "?"}
                        </span>
                        {p.injuryStatus && (
                          <span
                            style={{
                              color: C.red,
                              fontSize: 10,
                              marginLeft: 5,
                              fontWeight: 700,
                            }}
                          >
                            {p.injuryStatus}
                          </span>
                        )}
                        {!gone && p.fallingBy > 0 && (
                          <span
                            style={{
                              color: C.green,
                              fontSize: 10,
                              marginLeft: 5,
                              fontWeight: 700,
                            }}
                            title={`Still here ${p.fallingBy} picks past his ADP`}
                          >
                            ▼ VALUE
                          </span>
                        )}
                        {!gone && p.byeClash >= 2 && (
                          <span
                            style={{
                              color: C.amber,
                              fontSize: 10,
                              marginLeft: 5,
                              fontWeight: 700,
                            }}
                            title={`You already roster ${p.byeClash} players on bye ${p.bye}`}
                          >
                            BYE⚠
                          </span>
                        )}
                        {gone?.by === "live" && gone.teamId && (
                          <span
                            style={{
                              color: C.muted,
                              fontSize: 10,
                              marginLeft: 6,
                            }}
                          >
                            → {model.teamName.get(gone.teamId)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        {p.fpTier != null && (
                          <span
                            style={{
                              background: C.chipBg,
                              borderRadius: 5,
                              padding: "1px 7px",
                              fontSize: 11,
                              color:
                                p.tierLeftCount != null && p.tierLeftCount <= 2
                                  ? C.amber
                                  : C.text,
                              fontWeight:
                                p.tierLeftCount != null && p.tierLeftCount <= 2
                                  ? 700
                                  : 400,
                            }}
                            title={
                              p.tierLeftCount != null
                                ? `${p.tierLeftCount} left in this tier`
                                : ""
                            }
                          >
                            T{p.fpTier}
                            {p.tierLeftCount != null &&
                              p.tierLeftCount <= 2 &&
                              " ⚠"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px", fontWeight: 700 }}>
                        {p.consensusRank ?? "—"}
                      </td>
                      <td style={{ padding: "6px 8px" }}>{p.fpRank ?? "—"}</td>
                      <td style={{ padding: "6px 8px" }}>{p.ffcAdp ?? "—"}</td>
                      <td style={{ padding: "6px 8px" }}>{p.espnRank ?? "—"}</td>
                      <td style={{ padding: "6px 8px" }}>
                        {p.projection ?? "—"}
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          color:
                            (p.vorp ?? 0) > 60
                              ? C.green
                              : (p.vorp ?? 0) > 20
                              ? C.text
                              : C.muted,
                          fontWeight: (p.vorp ?? 0) > 60 ? 700 : 400,
                        }}
                      >
                        {p.vorp ?? "—"}
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        {!gone && p.availPct != null ? (
                          <span
                            style={{
                              color:
                                p.availPct < 35
                                  ? C.red
                                  : p.availPct < 70
                                  ? C.amber
                                  : C.green,
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {p.availPct}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        style={{ padding: "6px 8px", whiteSpace: "nowrap" }}
                      >
                        {sim ? (
                          !gone &&
                          sim.picks.length < TEAMS * ROUNDS && (
                            <MiniBtn
                              label="draft"
                              color={C.purple}
                              onClick={() => simDraft(p.espnId)}
                            />
                          )
                        ) : gone ? (
                          gone.by === "manual" && (
                            <MiniBtn
                              label="undo"
                              onClick={() => setManualMark(p.espnId, null)}
                            />
                          )
                        ) : (
                          <>
                            <MiniBtn
                              label="gone"
                              onClick={() => setManualMark(p.espnId, "other")}
                            />
                            <MiniBtn
                              label="mine"
                              color={C.green}
                              onClick={() => setManualMark(p.espnId, "mine")}
                            />
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>
            Consensus of FantasyPros ECR · FFCalculator ADP (10-team PPR) ·
            ESPN rank + ADP · Boris Chen tiers. PROJ/VORP use ESPN projections
            in this league&apos;s exact scoring. AVAIL@NEXT = chance the player
            is still there at your next pick (#{model.myNext ?? "—"}). Board
            updated {new Date(board.updatedAt).toLocaleTimeString()}.
          </div>
        </div>

        {/* right rail */}
        <div
          style={{
            flex: "0 0 270px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Panel title={`My Roster (${model.myPlayers.length}/16)`}>
            {["starters", "flex", "bench"].map((grp) =>
              model.roster[grp].map((p) => (
                <div
                  key={p.espnId}
                  style={{ padding: "3px 0", fontSize: 13 }}
                >
                  <PosBadge pos={p.pos} />{" "}
                  <span style={{ fontWeight: 600 }}>{p.name}</span>{" "}
                  <span style={{ color: C.muted, fontSize: 11 }}>
                    {grp === "flex" ? "FLX" : grp === "bench" ? "BE" : ""}{" "}
                    bye {p.bye || "?"}
                  </span>
                </div>
              ))
            )}
            {model.myPlayers.length === 0 && (
              <div style={{ color: C.muted, fontSize: 12 }}>
                No picks yet. Needs: 1 QB · 2 RB · 2 WR · 1 TE · 2 FLEX · 1
                D/ST · 7 bench. No kickers in this league.
              </div>
            )}
          </Panel>

          <Panel title="Draft plan — likely there for you">
            {model.plan.map((row) => (
              <div key={row.pick} style={{ padding: "4px 0", fontSize: 12 }}>
                <div style={{ color: C.muted, fontSize: 11 }}>
                  Rd {row.round} · pick #{row.pick}
                </div>
                {row.targets.length === 0 && (
                  <div style={{ color: C.muted }}>—</div>
                )}
                {row.targets.map((p) => (
                  <div key={p.espnId} style={{ padding: "1px 0" }}>
                    <PosBadge pos={p.pos} />{" "}
                    <span style={{ fontWeight: 600 }}>{p.name}</span>{" "}
                    <span style={{ color: C.muted, fontSize: 10 }}>
                      {Math.round(p.availHere * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>
              Players with ≥50% odds of reaching each pick, ranked by value ×
              your need. Updates live.
            </div>
          </Panel>

          {model.teamRosters && (
            <Panel title="League rosters">
              {model.teamRosters.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "2px 0",
                    fontSize: 11,
                    color: t.mine ? C.green : C.text,
                    fontWeight: t.mine ? 700 : 400,
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 140,
                    }}
                  >
                    {t.name}
                  </span>
                  <span style={{ color: C.muted, whiteSpace: "nowrap" }}>
                    {["QB", "RB", "WR", "TE", "DST"]
                      .map((pos) => `${t.counts[pos] || 0}${pos[0]}`)
                      .join(" ")}
                  </span>
                </div>
              ))}
            </Panel>
          )}

          <Panel title="Recent picks">
            {model.recent.length === 0 && (
              <div style={{ color: C.muted, fontSize: 12 }}>
                Nothing yet — picks appear here live once the draft starts.
              </div>
            )}
            {model.recent.map((pk) => (
              <div key={pk.pick} style={{ padding: "3px 0", fontSize: 12 }}>
                <span style={{ color: C.muted }}>#{pk.pick}</span>{" "}
                {pk.player ? (
                  <>
                    <PosBadge pos={pk.player.pos} />{" "}
                    <span style={{ fontWeight: 600 }}>{pk.player.name}</span>
                  </>
                ) : (
                  `player ${pk.playerId}`
                )}{" "}
                <span style={{ color: C.muted }}>→ {pk.teamName}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PosBadge({ pos }) {
  return (
    <span
      style={{
        background: (POS_COLOR[pos] || C.muted) + "26",
        color: POS_COLOR[pos] || C.muted,
        borderRadius: 4,
        padding: "1px 5px",
        fontSize: 10,
        fontWeight: 800,
      }}
    >
      {pos}
    </span>
  );
}

function MiniBtn({ label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: `1px solid ${C.border}`,
        color: color || C.muted,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        cursor: "pointer",
        marginRight: 4,
      }}
    >
      {label}
    </button>
  );
}

function Panel({ title, children }) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.muted,
          letterSpacing: 0.5,
          marginBottom: 6,
        }}
      >
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function Center({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.muted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, sans-serif",
        padding: 20,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
