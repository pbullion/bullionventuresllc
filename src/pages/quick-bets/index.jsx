import { useCallback, useEffect, useState } from "react";
import EnginePage from "../../components/engine/EnginePage.jsx";
import { EngineHeader } from "../../components/engine/EngineChrome.jsx";
import { C, panelStyle, money } from "../../components/engine/theme.js";

/* Quick Bets — one click, every NCAAF/NFL/MLB favorite ≥70% to win, one
 * combo bet.
 *
 * Backend: routes/kalshi.js, `GET /kalshi/quick-bets/candidates` (every
 * supported league at once) and `POST /kalshi/quick-bets/combo` (places the
 * order). Read that file's header comment before changing anything here —
 * the short version: the combo ticket this mints (Kalshi's real
 * KXMVECROSSCATEGORY-R multivariate collection, not something this app
 * invented) tries a plain resting-order fill first, then falls back to
 * Kalshi's RFQ negotiation. Either way a fill needs a real counterparty on
 * the other side, which a big all-favorites slate makes unlikely — that's
 * why leg count (not probability) is the lever in the Top N buttons below.
 * "Create Bet" legitimately coming back unfilled is a normal outcome, not an
 * error.
 *
 * The league list is the BACKEND's (`supported_leagues` on the response), not
 * a constant here — add a league there and its chip appears with no deploy of
 * this repo. The chips only filter what's shown; a hidden league's games are
 * never sent in a bet, even if they were checked before it was hidden. The
 * hidden set is remembered per browser, as the leagues that are OFF, so a
 * league added later starts out visible. Bulk actions (Top N, Select all,
 * Deselect all) only rewrite the visible part of the selection.
 *
 * `unavailable_leagues` on the response names leagues the backend couldn't
 * read from Kalshi this time. Their games are MISSING, not absent, and the
 * page says so rather than letting the list read as "no favorites".
 *
 * Games already under way are listed too, with a LIVE tag, because their
 * price is a live in-game price, not a pregame one (Patrick, 2026-09-13: show
 * them, marked LIVE). They start UNCHECKED and Select all / Top N skip them,
 * so a live game only goes into a combo when it's ticked by hand.
 *
 * kalshi-live builds from 2026-09-13 call these same two routes. Builds
 * installed before that use `/quick-bets/ncaaf` + `/ncaaf-combo`, which the
 * backend keeps (pregame games only, since those builds can't show LIVE).
 */

const ROOT = "https://sheline-art-website-api.herokuapp.com";
const API_BASE = `${ROOT}/kalshi/quick-bets`;
const HIDDEN_LEAGUES_KEY = "bv_quickbets_hidden_leagues";

const card = { ...panelStyle, borderRadius: 14, padding: 16 };

const chipBtnStyle = {
  fontSize: 11.5,
  fontWeight: 700,
  color: C.text,
  background: C.chipBg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "4px 10px",
  cursor: "pointer",
};

const readHiddenLeagues = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(HIDDEN_LEAGUES_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
};

const writeHiddenLeagues = (hidden) => {
  try {
    localStorage.setItem(HIDDEN_LEAGUES_KEY, JSON.stringify([...hidden]));
  } catch {
    // Storage blocked (private window, site data off) — the filter still
    // works for this visit, it just isn't remembered.
  }
};

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

// "NCAAF, NFL and MLB" — for the subtitle and the empty state.
const joinLabels = (labels) =>
  labels.length <= 1
    ? labels.join("")
    : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;

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
          {c.started ? (
            <span
              style={{
                fontWeight: 800,
                color: C.red,
                border: `1px solid ${C.redBorder}`,
                borderRadius: 4,
                padding: "0 4px",
                marginRight: 6,
              }}
            >
              LIVE
            </span>
          ) : null}
          {c.league_label ? (
            <span style={{ fontWeight: 700, color: C.text }}>
              {c.league_label}
              {" · "}
            </span>
          ) : null}
          {c.started ? "started " : ""}
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
  const [leagues, setLeagues] = useState([]);
  const [unavailable, setUnavailable] = useState([]);
  const [hiddenLeagues, setHiddenLeagues] = useState(readHiddenLeagues);
  const [selected, setSelected] = useState(() => new Set());
  const [stake, setStake] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState(null);
  const [includeTomorrow, setIncludeTomorrow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `${API_BASE}/candidates${includeTomorrow ? "?days=2" : ""}`,
      );
      // A non-JSON reply (an HTML 404 from a backend without this route, a
      // Heroku error page) falls through to the HTTP status instead of
      // surfacing a JSON parser message.
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setCandidates(body.candidates);
      setLeagues(body.supported_leagues || []);
      setUnavailable(body.unavailable_leagues || []);
      // Every pregame game selected by default; a live one waits to be ticked.
      setSelected(
        new Set(
          body.candidates.filter((c) => !c.started).map((c) => c.market_ticker),
        ),
      );
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [includeTomorrow]);

  useEffect(() => {
    // Wrapped rather than called straight, so the first fetch is queued off
    // the effect body instead of running inside the render pass. Reruns
    // whenever `load` changes identity, i.e. whenever includeTomorrow flips.
    (async () => {
      await load();
    })();
  }, [load]);

  // Everything below works on the games in leagues that are switched ON. The
  // selection Set can still hold a hidden league's tickers (so switching it
  // back on restores what was checked), but those never count and never bet.
  const visible = (candidates || []).filter((c) => !hiddenLeagues.has(c.league));
  const selectedVisible = visible.filter((c) => selected.has(c.market_ticker));
  // What Select all and Top N choose from — never a LIVE game.
  const pregame = visible.filter((c) => !c.started);

  const toggleLeague = (key) => {
    setHiddenLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeHiddenLeagues(next);
      return next;
    });
  };

  const toggle = (ticker) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  // Rewrites only the visible part of the selection — checks in a hidden
  // league are left as they were, for when it's switched back on.
  const replaceVisibleSelection = (tickers) => {
    const visibleTickers = new Set(visible.map((c) => c.market_ticker));
    setSelected(
      (prev) =>
        new Set([...[...prev].filter((t) => !visibleTickers.has(t)), ...tickers]),
    );
  };
  const selectAll = () => {
    replaceVisibleSelection(pregame.map((c) => c.market_ticker));
  };
  const deselectAll = () => {
    replaceVisibleSelection([]);
  };
  // Fewer legs is the lever that actually matters for getting a fill — the
  // combo's odds are the PRODUCT of every leg's probability, so a big
  // all-favorites slate compounds down to almost nothing no matter how safe
  // each individual pick looks. Top N by probability is the fast way to test
  // a small slate without hand-picking through the list.
  const selectTop = (n) => {
    const sorted = [...pregame].sort(
      (a, b) => b.probability_pct - a.probability_pct,
    );
    replaceVisibleSelection(sorted.slice(0, n).map((c) => c.market_ticker));
  };

  const selectedCount = selectedVisible.length;
  const canCreate = selectedCount >= 2 && Number(stake) > 0 && !placing;
  const leagueNames = joinLabels(leagues.map((l) => l.label));
  // Only the leagues that actually loaded — "no MLB favorites" is a claim the
  // page can't make about a league it couldn't read.
  const checkedNames = joinLabels(
    leagues.filter((l) => !unavailable.includes(l.key)).map((l) => l.label),
  );

  const createBet = async () => {
    if (!canCreate) return;
    setPlacing(true);
    setResult(null);
    try {
      const legs = selectedVisible.map((c) => ({ market_ticker: c.market_ticker }));
      const res = await fetch(`${API_BASE}/combo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legs, stake_dollars: Number(stake) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        const detail = body.detail
          ? typeof body.detail === "string"
            ? body.detail
            : body.detail.message || JSON.stringify(body.detail)
          : null;
        throw new Error(
          [body.error || `HTTP ${res.status}`, detail].filter(Boolean).join(" — "),
        );
      }
      setResult({ ok: true, ...body });
      // Only refresh (and re-select-all) when a bet actually filled — that's
      // a new position, so a leg's event may have moved past the window. An
      // unfilled attempt changed nothing, so leave the user's selection
      // alone rather than resetting it back to "all" under them.
      if (body.filled) load();
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
        subtitle={`Every ${leagueNames ? `${leagueNames} ` : ""}favorite ≥70% to win — one combo bet`}
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
            onClick={() => setIncludeTomorrow((v) => !v)}
            disabled={loading}
            style={{
              marginLeft: "auto",
              ...chipBtnStyle,
              background: includeTomorrow ? C.green : C.chipBg,
              color: includeTomorrow ? "#06210f" : C.text,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {includeTomorrow ? "Today + Tomorrow" : "+ Tomorrow's games"}
          </button>
          <button
            onClick={load}
            disabled={loading}
            style={{
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

        {leagues.length > 1 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {leagues.map((l) => {
              const on = !hiddenLeagues.has(l.key);
              const count = (candidates || []).filter((c) => c.league === l.key).length;
              return (
                <button
                  key={l.key}
                  onClick={() => toggleLeague(l.key)}
                  aria-pressed={on}
                  style={{
                    ...chipBtnStyle,
                    // A notch bigger than the Top N chips: these change which
                    // games can be bet, not just which are checked.
                    fontSize: 12.5,
                    padding: "6px 12px",
                    background: on ? C.chipBg : "transparent",
                    borderColor: on ? C.greenBorder : C.border,
                    color: on ? C.text : C.muted,
                    textDecoration: on ? "none" : "line-through",
                  }}
                >
                  {l.label} · {count}
                </button>
              );
            })}
          </div>
        ) : null}

        {!err && unavailable.length > 0 ? (
          <div style={{ color: C.amber, fontSize: 12.5, marginBottom: 8 }}>
            Couldn't load{" "}
            {joinLabels(
              unavailable.map(
                (k) => leagues.find((l) => l.key === k)?.label || k.toUpperCase(),
              ),
            )}{" "}
            from Kalshi just now, so those games aren't listed — Refresh to try
            again.
          </div>
        ) : null}

        {err ? (
          <div style={{ color: C.red, fontSize: 13, marginBottom: 8 }}>
            {err}
          </div>
        ) : null}

        {!err && candidates && candidates.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13 }}>
            No {checkedNames || "games"} {checkedNames ? "games are" : "are"}{" "}
            currently priced ≥70% to win.
          </div>
        ) : null}

        {!err && candidates && candidates.length > 0 && visible.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13 }}>
            Every qualifying game is in a league you've switched off.
          </div>
        ) : null}

        {visible.length > 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 11.5, color: C.muted }}>
              {selectedCount} of {visible.length} selected
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[3, 5, 10].map((n) =>
                pregame.length > n ? (
                  <button
                    key={n}
                    onClick={() => selectTop(n)}
                    style={chipBtnStyle}
                  >
                    Top {n}
                  </button>
                ) : null,
              )}
              <button onClick={selectAll} style={chipBtnStyle}>
                Select all
              </button>
              <button onClick={deselectAll} style={chipBtnStyle}>
                Deselect all
              </button>
            </div>
          </div>
        ) : null}

        {visible.length > 0 ? (
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {visible.map((c) => (
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
        favorites at 70%+ mid price, and the games can come from different
        leagues. It pays out only if EVERY selected game wins; one loss loses
        the whole stake. See{" "}
        <a href="/my-bets" style={{ color: C.text }}>
          My Bets
        </a>{" "}
        once it fills.
      </div>
    </EnginePage>
  );
}
