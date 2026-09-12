import { useCallback, useEffect, useState } from "react";
import EnginePage from "../../components/engine/EnginePage.jsx";
import { EngineHeader } from "../../components/engine/EngineChrome.jsx";
import { C, panelStyle, money } from "../../components/engine/theme.js";

/* Quick Bets — one click, every NCAAF favorite ≥70% to win, one combo bet.
 *
 * Backend: routes/kalshi.js, `GET /kalshi/quick-bets/ncaaf` (candidates) and
 * `POST /kalshi/quick-bets/ncaaf-combo` (places the order). Read that file's
 * header comment before changing the pricing here — the short version: the
 * combo ticket this mints (Kalshi's real KXMVECROSSCATEGORY-R multivariate
 * collection, not something this app invented) almost never has a live book,
 * so the backend prices its own limit order at the PRODUCT of the legs' own
 * mid prices and submits immediate-or-cancel. That means "Create Bet" can
 * legitimately come back unfilled — nobody was quoting the other side — and
 * that is reported as a normal outcome, not an error.
 */

const ROOT = "https://sheline-art-website-api.herokuapp.com";
const API_BASE = `${ROOT}/kalshi/quick-bets`;

const card = { ...panelStyle, borderRadius: 14, padding: 16 };

const kickoffLabel = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(d)} CT`;
};

function Row({ c, checked, onToggle }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 4px",
        borderBottom: `1px solid ${C.border}`,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ width: 18, height: 18, flexShrink: 0 }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
          {c.team}
          {c.opponent ? (
            <span style={{ color: C.muted, fontWeight: 500 }}>
              {" "}
              vs {c.opponent}
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
          {kickoffLabel(c.kickoff_time)}
        </div>
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: c.probability_pct >= 90 ? C.green : C.amber,
          flexShrink: 0,
        }}
      >
        {c.probability_pct}%
      </div>
    </label>
  );
}

export default function QuickBets() {
  const [candidates, setCandidates] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [stake, setStake] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/ncaaf`);
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setCandidates(body.candidates);
      // All selected by default.
      setSelected(new Set(body.candidates.map((c) => c.market_ticker)));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wrapped rather than called straight, so the first fetch is queued off
    // the effect body instead of running inside the render pass.
    (async () => {
      await load();
    })();
  }, [load]);

  const toggle = (ticker) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set((candidates || []).map((c) => c.market_ticker)));
  };
  const deselectAll = () => {
    setSelected(new Set());
  };

  const selectedCount = selected.size;
  const canCreate = selectedCount >= 2 && Number(stake) > 0 && !placing;

  const createBet = async () => {
    if (!canCreate) return;
    setPlacing(true);
    setResult(null);
    try {
      const legs = (candidates || [])
        .filter((c) => selected.has(c.market_ticker))
        .map((c) => ({ market_ticker: c.market_ticker }));
      const res = await fetch(`${API_BASE}/ncaaf-combo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legs, stake_dollars: Number(stake) }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setResult({ ok: true, ...body });
      // A filled bet is a new position — refresh candidates in case any leg's
      // event has since moved past the window.
      load();
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <EnginePage mainWidth="640px">
      <EngineHeader
        title="⚡ Quick Bets"
        subtitle="Every NCAAF favorite ≥70% to win — one combo bet"
        self="quickbets"
      />

      <div style={{ ...card, marginTop: 12, marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <label style={{ fontSize: 12.5, color: C.muted }}>
            Stake ($, split as one combo)
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            style={{
              width: 90,
              padding: "6px 8px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.chipBg,
              color: C.text,
              fontSize: 14,
              fontWeight: 700,
            }}
          />
          <button
            onClick={load}
            disabled={loading}
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 700,
              color: C.text,
              background: C.chipBg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "6px 12px",
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {err ? (
          <div style={{ color: C.red, fontSize: 13, marginBottom: 8 }}>
            {err}
          </div>
        ) : null}

        {!err && candidates && candidates.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13 }}>
            No NCAAF games are currently priced ≥70% to win.
          </div>
        ) : null}

        {candidates && candidates.length > 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 11.5, color: C.muted }}>
              {selectedCount} of {candidates.length} selected
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={selectAll}
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: C.text,
                  background: C.chipBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                Select all
              </button>
              <button
                onClick={deselectAll}
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: C.text,
                  background: C.chipBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                Deselect all
              </button>
            </div>
          </div>
        ) : null}

        {candidates && candidates.length > 0 ? (
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {candidates.map((c) => (
              <Row
                key={c.market_ticker}
                c={c}
                checked={selected.has(c.market_ticker)}
                onToggle={() => toggle(c.market_ticker)}
              />
            ))}
          </div>
        ) : null}
      </div>

      <button
        onClick={createBet}
        disabled={!canCreate}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 12,
          border: "none",
          fontSize: 16,
          fontWeight: 800,
          color: canCreate ? "#06210f" : C.muted,
          background: canCreate ? C.green : C.chipBg,
          cursor: canCreate ? "pointer" : "not-allowed",
        }}
      >
        {placing
          ? "Placing…"
          : `Create Bet · ${selectedCount} game${selectedCount === 1 ? "" : "s"} · ${money(Number(stake) || 0)}`}
      </button>
      {selectedCount < 2 ? (
        <div style={{ color: C.muted, fontSize: 12, marginTop: 8, textAlign: "center" }}>
          A combo needs at least 2 games selected.
        </div>
      ) : null}

      {result ? (
        <div
          style={{
            ...card,
            marginTop: 14,
            borderColor: result.ok
              ? result.filled
                ? C.greenBorder
                : C.amberBorder
              : C.redBorder,
          }}
        >
          {result.ok ? (
            result.filled ? (
              <div style={{ color: C.green, fontWeight: 700, fontSize: 14 }}>
                Filled: {result.contracts_filled} contract
                {result.contracts_filled === 1 ? "" : "s"} @{" "}
                {money(result.price_dollars)} ={" "}
                {money(result.spent_dollars)} across {result.legs_used} games.
              </div>
            ) : (
              <div style={{ color: C.amber, fontSize: 13.5 }}>
                <strong>Not filled.</strong> {result.unfilled_reason}
                <div style={{ color: C.muted, marginTop: 4, fontSize: 12 }}>
                  Nothing was charged. This combo is a real Kalshi ticket, but
                  its order book is usually empty — try again later or with
                  fewer/likelier games.
                </div>
              </div>
            )
          ) : (
            <div style={{ color: C.red, fontSize: 13.5 }}>{result.error}</div>
          )}
          {result.dropped && result.dropped.length > 0 ? (
            <div style={{ color: C.muted, fontSize: 11.5, marginTop: 6 }}>
              Dropped (no longer qualified): {result.dropped.length}
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ color: C.muted, fontSize: 11.5, marginTop: 14, lineHeight: 1.5 }}>
        This places one real Kalshi combo order — win-the-game markets only,
        favorites at 70%+ mid price. It pays out only if EVERY selected game
        wins; one loss loses the whole stake. See{" "}
        <a href="/my-bets" style={{ color: C.text }}>
          My Bets
        </a>{" "}
        once it fills.
      </div>
    </EnginePage>
  );
}
