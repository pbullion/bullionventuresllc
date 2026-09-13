import { useCallback, useEffect, useRef, useState } from "react";
import EnginePage from "../../components/engine/EnginePage.jsx";
import { EngineHeader } from "../../components/engine/EngineChrome.jsx";
import { C, panelStyle, money, pct } from "../../components/engine/theme.js";

/* NFL Card — the Week 1 parlay tickets researched on 2026-09-12/13, one
 * button each. Patrick: "make that into a list, i want to be able to click a
 * btn and place those bets".
 *
 * Backend: sheline-art-website-api routes/kalshiCard.js.
 *   GET  /kalshi-card/cards/:id        the card plus live leg asks
 *   POST /kalshi-card/cards/:id/place  {size, stake_dollars, max_markup_pct}
 *
 * The legs live on the SERVER, in a checked-in card file. This page sends only
 * which ticket and how much, so nothing here can change what gets bought.
 * The server also owns the stake cap, the kickoff lock and the price guard.
 * Read that file's header before changing how placing works.
 *
 * A placement takes up to ~20s: Kalshi market makers quote a combo through
 * RFQ, and the server waits for a quote and then for the fill. "Not filled"
 * is a normal outcome and charges nothing.
 */

const ROOT = "https://sheline-art-website-api.herokuapp.com";
const CARD_ID = "nfl-2026-week1";
const API = `${ROOT}/kalshi-card/cards/${CARD_ID}`;
const CONFIRM_MS = 5000;
const REFRESH_MS = 60000;
const PLACED_KEY = `kalshi-card:${CARD_ID}:placed`;
const PENDING_KEY = `kalshi-card:${CARD_ID}:pending`;
// The second click of a double-click is not a confirmation.
const DOUBLE_TAP_GUARD_MS = 600;
// Heroku answers or cuts off within 30s; past this, stop waiting.
const PLACE_TIMEOUT_MS = 40000;
// A marker younger than this may belong to a request still out, here or in
// another tab, so its banner offers no "which way did it go" buttons yet.
const PENDING_SETTLE_MS = PLACE_TIMEOUT_MS + 60000;

const card = { ...panelStyle, borderRadius: 14, padding: 16 };

const inputStyle = {
  width: 80,
  padding: "6px 8px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.chipBg,
  color: C.text,
  // 16px: iOS Safari zooms into any smaller input on focus.
  fontSize: 16,
  fontWeight: 700,
};

const chipBtnStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: C.text,
  background: C.chipBg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
};

// Leg prices are whole cents; a combo is often a fraction of a cent.
const legCents = (v) => (v == null ? "—" : `${Math.round(Number(v) * 100)}¢`);
const comboCents = (v) => {
  if (v == null) return "—";
  const c = Number(v) * 100;
  return `${c < 10 ? c.toFixed(2) : c.toFixed(1)}¢`;
};

const kickoffLabel = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(d)} CT`;
};

const firstKickoff = (legs) =>
  (legs || [])
    .map((l) => l.kickoff_utc)
    .filter((k) => !Number.isNaN(Date.parse(k)))
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0] || null;

// Which tickets this browser has already filled, so a second tap says so.
// Storage can be missing or throw (private mode); the page works without it.
const readPlaced = () => {
  try {
    return JSON.parse(localStorage.getItem(PLACED_KEY) || "{}") || {};
  } catch {
    return {};
  }
};
const writePlaced = (v) => {
  try {
    localStorage.setItem(PLACED_KEY, JSON.stringify(v));
  } catch {
    /* per-browser convenience only */
  }
};

// A placement that went out but never came back with a certain answer: a
// refresh or closed tab mid-click, or an unconfirmed fill. The server keeps
// going either way, so the ticket carries a "check My Bets" warning until
// dismissed. Written to storage outside React state, so it still lands if
// the page unmounts while the request is out.
// No expiry on purpose: letting a marker lapse would quietly make a ticket
// that may have filled a Place-all target again. It clears only on a certain
// answer or when Patrick says which way My Bets shows it went.
const readPending = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "{}") || {};
  } catch {
    return {};
  }
};
const writePending = (v) => {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(v));
  } catch {
    /* per-browser convenience only */
  }
};

function LegRow({ leg }) {
  const askColor = !leg.open ? C.muted : leg.above_limit ? C.amber : C.green;
  return (
    <div
      style={{
        padding: "8px 2px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>
            {leg.flag ? (
              <span title="Flagged in review" style={{ color: C.amber }}>
                ⚑{" "}
              </span>
            ) : null}
            {leg.label}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
            {leg.game} · {kickoffLabel(leg.kickoff_utc)} · model{" "}
            {pct(leg.our_prob)}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: askColor }}>
            {legCents(leg.live_ask)}
          </div>
          <div style={{ fontSize: 10.5, color: C.muted }}>
            limit {legCents(leg.limit)}
          </div>
        </div>
      </div>
      {!leg.open ? (
        <div style={{ fontSize: 11.5, color: C.red, marginTop: 3 }}>
          {leg.blocked_reason}
        </div>
      ) : leg.above_limit ? (
        <div style={{ fontSize: 11.5, color: C.amber, marginTop: 3 }}>
          Above this morning's limit.
        </div>
      ) : null}
      {leg.note ? (
        <details style={{ marginTop: 3 }}>
          <summary
            style={{ fontSize: 11, color: C.muted, cursor: "pointer" }}
          >
            why
          </summary>
          <div
            style={{
              fontSize: 12,
              color: C.muted,
              lineHeight: 1.45,
              marginTop: 4,
            }}
          >
            {leg.note}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function Result({ r }) {
  if (!r) return null;
  const border = r.ok
    ? r.filled
      ? r.wrong_side
        ? C.redBorder
        : C.greenBorder
      : r.charged === false
        ? C.amberBorder
        : C.redBorder
    : C.redBorder;
  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 10,
        border: `1px solid ${border}`,
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      {r.ok && r.filled ? (
        <>
          <div style={{ color: C.green, fontWeight: 700 }}>
            Filled:{" "}
            {r.contracts == null
              ? "an unconfirmed number of"
              : Number(Number(r.contracts).toFixed(2))}{" "}
            contracts at {comboCents(r.quoted_price)}
            {r.cost_dollars != null ? ` · cost ${money(r.cost_dollars)}` : ""}
          </div>
          <div style={{ color: C.muted, fontSize: 12 }}>
            The legs on their own priced it at {comboCents(r.fair_price)}.
          </div>
          {r.wrong_side ? (
            <div style={{ color: C.red, fontWeight: 700, marginTop: 6 }}>
              Kalshi recorded this as NO, which pays only if the parlay
              loses. Sell it in My Bets and don't place more until that's
              understood.
            </div>
          ) : null}
          {!r.readback_ok ? (
            <div style={{ color: C.amber, fontSize: 12, marginTop: 4 }}>
              The position didn't read back yet. Confirm it in My Bets.
            </div>
          ) : null}
        </>
      ) : r.ok && r.charged !== false ? (
        <div style={{ color: C.red }}>
          <strong>Not confirmed. This may have filled.</strong> {r.reason}
        </div>
      ) : r.ok ? (
        <div style={{ color: C.amber }}>
          <strong>Not filled.</strong> {r.reason}
        </div>
      ) : (
        <>
          <div style={{ color: C.red }}>{r.error}</div>
          {r.blocked_legs && r.blocked_legs.length > 0 ? (
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
              {r.blocked_legs.map((b) => `${b.label}: ${b.reason}`).join(" · ")}
            </div>
          ) : null}
          {r.charged !== false ? (
            <div style={{ color: C.amber, fontSize: 12, marginTop: 4 }}>
              This may still have gone through. Check My Bets before trying
              again.
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function NflCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [notLive, setNotLive] = useState(false);
  const [stake, setStake] = useState(10);
  const [markup, setMarkup] = useState(50);
  const [allowStarted, setAllowStarted] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [placing, setPlacing] = useState(null);
  const [allProgress, setAllProgress] = useState(null);
  const [results, setResults] = useState({});
  const [placed, setPlaced] = useState(readPlaced);
  const [pending, setPending] = useState(readPending);
  // Tickets the server said are already held; the next deliberate
  // single-ticket tap buys more.
  const [againOk, setAgainOk] = useState({});
  // A clock for the pending banner, set from a timer, never read in render.
  const [now, setNow] = useState(0);
  const confirmTimer = useRef(null);
  const armedAt = useRef(0);
  const mounted = useRef(true);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(API);
      if (res.status === 404) {
        // Clear the tickets too, so stale ones can't be placed under the
        // not-deployed banner.
        setNotLive(true);
        setData(null);
        return;
      }
      // A Heroku timeout answers with an HTML page, not JSON.
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (!res.ok || !body || !body.ok) {
        throw new Error(
          (body && body.error) ||
            `The server answered HTTP ${res.status}. Try Refresh in a minute.`,
        );
      }
      setNotLive(false);
      setData(body);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      await load();
    })();
    const id = setInterval(() => {
      // Not mid-placement: a refresh then would reshuffle what's on screen.
      if (!busyRef.current) load();
    }, REFRESH_MS);
    // A placement made in another tab of this browser shows up here too.
    const onStorage = (e) => {
      if (e.key === PLACED_KEY || e.key === PENDING_KEY) {
        setPlaced(readPlaced());
        setPending(readPending());
      }
    };
    window.addEventListener("storage", onStorage);
    const tick = () => setNow(Date.now());
    const firstTick = setTimeout(tick, 0);
    const clock = setInterval(tick, 5000);
    return () => {
      mounted.current = false;
      clearTimeout(firstTick);
      clearInterval(clock);
      clearInterval(id);
      clearTimeout(confirmTimer.current);
      window.removeEventListener("storage", onStorage);
    };
  }, [load]);

  const maxStake = (data && data.max_stake_dollars) || 100;
  const stakeNum = Number(stake);
  const stakeValid = stakeNum >= 1 && stakeNum <= maxStake;
  // A blank markup would reach the server as 0%, not the 50% default.
  const markupNum = Number(markup);
  const markupOk =
    markup !== "" &&
    Number.isFinite(markupNum) &&
    markupNum >= 0 &&
    markupNum <= 300;
  // Every place button gates on this one flag.
  const stakeOk = stakeValid && markupOk;
  const tickets = data
    ? [...data.tickets].sort((a, b) => a.size - b.size)
    : [];
  // The server decides; it locks a ticket at its first kickoff and checks
  // again on every click.
  // "Allow games underway" (Patrick, 2026-09-13: "still place them, its still
  // early enough") lets started legs through at their live prices.
  const canPlace = (t) =>
    allowStarted ? Boolean(t.placeable_with_started) : Boolean(t.placeable);
  const openTickets = tickets.filter(canPlace);
  const busy = placing != null || allProgress != null;

  // Leaving mid-placement stops only this page's record of the answer, not
  // the server, so the browser asks first. In-app navigation can't be caught
  // this way; the pending marker covers that case.
  useEffect(() => {
    busyRef.current = busy;
    if (!busy) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const dismissPending = (size) => {
    const stored = readPending();
    delete stored[size];
    writePending(stored);
    setPending((prev) => {
      const next = { ...prev };
      delete next[size];
      return next;
    });
  };

  // Patrick checked My Bets and says which way an uncertain placement went.
  const resolvePending = (size, filled) => {
    const since = pending[size] || readPending()[size] || "";
    // A fill already recorded after this marker started is the same fill.
    const alreadyRecorded = (readPlaced()[size] || []).some(
      (p) => p.at >= since,
    );
    if (filled && !alreadyRecorded) {
      const prior = readPlaced();
      const next = {
        ...prior,
        [size]: [
          ...(prior[size] || []),
          { at: new Date().toISOString(), cost: null, confirmed_by_hand: true },
        ],
      };
      writePlaced(next);
      setPlaced(next);
    }
    dismissPending(size);
  };

  // Storage is the truth across tabs and remounts. If it knows about a
  // placement this page hasn't shown, show it and make the tap start over.
  const syncFromStorage = () => {
    const p = readPlaced();
    const q = readPending();
    const newer =
      Object.keys(p).some(
        (s) => (p[s] || []).length > (placed[s] || []).length,
      ) || Object.keys(q).some((s) => !pending[s]);
    if (newer) {
      setPlaced(p);
      setPending(q);
    }
    return newer;
  };

  // `stamp` is the click event's timeStamp: it measures the double-tap gap
  // without calling a clock inside the component.
  const arm = (key, stamp) => {
    armedAt.current = stamp;
    clearTimeout(confirmTimer.current);
    setConfirming(key);
    confirmTimer.current = setTimeout(() => setConfirming(null), CONFIRM_MS);
  };
  const disarm = () => {
    clearTimeout(confirmTimer.current);
    setConfirming(null);
  };

  const placeOne = async (size, { again = false } = {}) => {
    setPlacing(size);
    setResults((prev) => ({ ...prev, [size]: null }));
    // An earlier uncertain attempt's marker is kept, never overwritten: a
    // certain answer on THIS attempt says nothing about that one.
    // State too: when storage is blocked, the marker lives only there.
    const priorPending = readPending()[size] || pending[size] || null;
    const startedAt = priorPending || new Date().toISOString();
    if (!priorPending) writePending({ ...readPending(), [size]: startedAt });
    let result;
    try {
      // Past this something between here and Heroku is stuck. Aborting lands
      // in the catch below as an uncertain answer, which keeps the marker.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), PLACE_TIMEOUT_MS);
      const res = await fetch(`${API}/place`, {
        signal: ctrl.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size,
          stake_dollars: stakeNum,
          max_markup_pct: Number(markup),
          again,
          allow_started: allowStarted,
        }),
      });
      let body = {};
      try {
        body = await res.json();
      } catch {
        body = {};
      }
      clearTimeout(timer);
      result =
        res.ok && body.ok
          ? { ok: true, ...body }
          : {
              ok: false,
              error: body.error || `The server answered HTTP ${res.status}.`,
              blocked_legs: body.blocked_legs,
              charged: body.charged,
              already_held: body.already_held,
            };
    } catch (e) {
      result = { ok: false, error: `Lost the connection: ${e.message}.` };
    }
    // Storage first, outside React state: if the page unmounted mid-request
    // these writes still land, while the state updates are simply dropped.
    // The fill is recorded before any marker is cleared, so there is never a
    // moment with neither.
    if (result.ok && result.filled) {
      const prior = readPlaced();
      const next = {
        ...prior,
        [size]: [
          ...(prior[size] || []),
          { at: new Date().toISOString(), cost: result.cost_dollars },
        ],
      };
      writePlaced(next);
      setPlaced(next);
    }
    if (result.already_held) {
      setAgainOk((prev) => ({ ...prev, [size]: true }));
    }
    const certain = Boolean(result.filled) || result.charged === false;
    if (certain && !priorPending) {
      dismissPending(size);
    } else if (!certain) {
      // Save to storage again as well: something may have cleared the marker
      // while this request was out (a resolve button in another tab, or
      // another attempt's certain answer), and state alone dies with the page.
      const stored = readPending();
      if (!stored[size]) writePending({ ...stored, [size]: startedAt });
      setPending((prev) => ({ ...prev, [size]: startedAt }));
    }
    setResults((prev) => ({ ...prev, [size]: result }));
    setPlacing(null);
    return result;
  };

  const tapOne = async (size, stamp) => {
    if (busy || !stakeOk) return;
    if (confirming !== size) {
      arm(size, stamp);
      return;
    }
    if (stamp - armedAt.current < DOUBLE_TAP_GUARD_MS) return;
    disarm();
    if (syncFromStorage()) return;
    // Buying more of a ticket already held is only ever this deliberate
    // single-ticket tap; the server refuses a repeat without `again`.
    await placeOne(size, {
      again: (placed[size] || []).length > 0 || Boolean(againOk[size]),
    });
    load();
  };

  // Tickets not yet filled from this browser, smallest first. Stops at the
  // first answer that might have charged without saying so.
  const allTargets = openTickets.filter(
    (t) => !placed[t.size] && !pending[t.size],
  );
  const tapAll = async (e) => {
    const stamp = e.timeStamp;
    if (busy || !stakeOk || allTargets.length === 0) return;
    if (confirming !== "all") {
      arm("all", stamp);
      return;
    }
    if (stamp - armedAt.current < DOUBLE_TAP_GUARD_MS) return;
    disarm();
    if (syncFromStorage()) return;
    const sizes = allTargets.map((t) => t.size);
    for (let i = 0; i < sizes.length; i++) {
      // Left the page: stop rather than keep buying with nothing on screen.
      // The request already out is covered by its pending marker.
      if (!mounted.current) break;
      // Another tab, or this page's own earlier loop, may have placed or left
      // this ticket pending since the loop started.
      if (readPlaced()[sizes[i]] || readPending()[sizes[i]]) continue;
      setAllProgress({ i: i + 1, n: sizes.length });
      const r = await placeOne(sizes[i]);
      // Stop on anything short of a fill confirmed on the YES side: an
      // uncertain answer, a wrong-side fill, or a fill that didn't read back.
      if (!r.filled && r.charged !== false) break;
      if (r.filled && (r.wrong_side || !r.readback_ok)) break;
    }
    setAllProgress(null);
    load();
  };

  return (
    <EnginePage mainWidth="760px">
      <EngineHeader
        title="🏈 NFL Week 1 Card"
        subtitle="Eight parlay tickets, each placed as one Kalshi combo"
        self="nflcard"
      />

      {notLive ? (
        <div
          style={{
            ...card,
            marginTop: 12,
            borderColor: C.amberBorder,
            color: C.amber,
            fontSize: 13.5,
          }}
        >
          The placing service isn't deployed yet. It's waiting on the backend
          merge. This page will fill in on its own once it is.
        </div>
      ) : null}

      {loading && !data && !err && !notLive ? (
        <div style={{ ...card, marginTop: 12, color: C.muted, fontSize: 13.5 }}>
          Loading the card and live Kalshi prices…
        </div>
      ) : null}

      <div style={{ ...card, marginTop: 12, marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <label style={{ fontSize: 12.5, color: C.muted }}>
            Stake per ticket ($)
          </label>
          <input
            type="number"
            min="1"
            max={maxStake}
            step="1"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            style={inputStyle}
          />
          <label style={{ fontSize: 12.5, color: C.muted }}>Max markup %</label>
          <input
            type="number"
            min="0"
            max="300"
            step="5"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            style={inputStyle}
          />
          <button
            onClick={() => setAllowStarted((v) => !v)}
            style={{
              ...chipBtnStyle,
              background: allowStarted ? C.amber : C.chipBg,
              color: allowStarted ? "#06210f" : C.text,
            }}
          >
            {allowStarted ? "Games underway: allowed" : "Allow games underway"}
          </button>
          <button
            onClick={load}
            disabled={loading}
            style={{
              ...chipBtnStyle,
              marginLeft: "auto",
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
        <div
          style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}
        >
          Max markup refuses any quote more than that far above what the legs
          cost on their own. Stakes run $1 to {money(maxStake)}.
          {data ? ` Prices as of ${new Date(data.as_of).toLocaleTimeString()}.` : ""}
        </div>
        {allowStarted ? (
          <div
            style={{
              color: C.amber,
              fontSize: 12.5,
              marginTop: 6,
              lineHeight: 1.45,
            }}
          >
            Legs already underway are priced at live odds, not this morning's.
          </div>
        ) : null}
        {!stakeValid ? (
          <div style={{ color: C.red, fontSize: 12.5, marginTop: 6 }}>
            Stake must be between $1 and {money(maxStake)}.
          </div>
        ) : null}
        {!markupOk ? (
          <div style={{ color: C.red, fontSize: 12.5, marginTop: 6 }}>
            Max markup must be between 0 and 300.
          </div>
        ) : null}
        {err ? (
          <div style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{err}</div>
        ) : null}

        {data ? (
          <button
            onClick={tapAll}
            disabled={busy || !stakeOk || allTargets.length === 0}
            style={{
              width: "100%",
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              border: "none",
              fontSize: 14.5,
              fontWeight: 800,
              color:
                busy || !stakeOk || allTargets.length === 0
                  ? C.muted
                  : "#06210f",
              background:
                busy || !stakeOk || allTargets.length === 0
                  ? C.chipBg
                  : confirming === "all"
                    ? C.amber
                    : C.green,
              cursor:
                busy || !stakeOk || allTargets.length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {allProgress
              ? `Placing ${allProgress.i} of ${allProgress.n}…`
              : allTargets.length === 0
                ? "No unplaced tickets are open"
                : confirming === "all"
                  ? `Tap again: ${allTargets.length} tickets · ${money(stakeNum * allTargets.length)} total`
                  : `Place all ${allTargets.length} open tickets · ${money(stakeNum)} each`}
          </button>
        ) : null}
        {data ? (
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
            {openTickets.length} of {tickets.length} tickets can be placed right
            now. A ticket locks when its first game kicks off.
          </div>
        ) : null}
      </div>

      {tickets.map((t) => {
        const kick = firstKickoff(t.legs);
        const settled =
          Boolean(pending[t.size]) &&
          now > 0 &&
          now - Date.parse(pending[t.size]) >= PENDING_SETTLE_MS;
        const disabled = busy || !stakeOk || !canPlace(t);
        const isConfirming = confirming === t.size;
        const timesPlaced = (placed[t.size] || []).length;
        const edgeUp =
          t.our_hit_prob != null && t.fair_price != null
            ? t.our_hit_prob > t.fair_price
            : null;
        return (
          <div key={t.size} style={{ ...card, marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: C.text,
                  background: C.chipBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "2px 8px",
                }}
              >
                {t.size} legs
              </span>
              <div
                style={{
                  fontSize: 15.5,
                  fontWeight: 800,
                  color: C.text,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {t.name}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
                {comboCents(t.fair_price)}
              </div>
            </div>
            {t.thesis ? (
              <div
                style={{
                  fontSize: 12.5,
                  color: C.muted,
                  marginTop: 6,
                  lineHeight: 1.45,
                }}
              >
                {t.thesis}
              </div>
            ) : null}
            <div
              style={{
                fontSize: 12,
                color: C.muted,
                marginTop: 6,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span>
                {money(stakeNum || 0)} returns about{" "}
                <strong style={{ color: C.text }}>
                  {t.fair_price ? money((stakeNum || 0) / t.fair_price) : "—"}
                </strong>
              </span>
              <span>
                Model hit{" "}
                <strong style={{ color: edgeUp ? C.green : C.amber }}>
                  {t.our_hit_prob != null
                    ? `${(t.our_hit_prob * 100).toFixed(2)}%`
                    : "—"}
                </strong>
              </span>
              {kick ? <span>Locks {kickoffLabel(kick)}</span> : null}
              {t.above_limit_count > 0 ? (
                <span style={{ color: C.amber }}>
                  {t.above_limit_count} above limit
                </span>
              ) : null}
            </div>

            <div style={{ marginTop: 8 }}>
              {t.legs.map((leg) => (
                <LegRow key={leg.leg_id || leg.market_ticker} leg={leg} />
              ))}
            </div>

            <button
              onClick={(e) => tapOne(t.size, e.timeStamp)}
              disabled={disabled}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                border: "none",
                fontSize: 15,
                fontWeight: 800,
                color: disabled ? C.muted : "#06210f",
                background: disabled
                  ? C.chipBg
                  : isConfirming
                    ? C.amber
                    : C.green,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {placing === t.size
                ? "Placing… this can take 20 seconds"
                : !canPlace(t)
                  ? !allowStarted &&
                    (t.blocked_legs || []).some(
                      (b) => b.reason === "game has started",
                    )
                    ? "Locked: a game has started"
                    : "Locked"
                  : isConfirming
                    ? `Tap again to place · ${money(stakeNum)}`
                    : timesPlaced > 0
                      ? `Placed ${timesPlaced}x · place again for ${money(stakeNum)}`
                      : againOk[t.size]
                        ? `Already held · buy more for ${money(stakeNum)}`
                        : `Place ${t.size}-leg · ${money(stakeNum)}`}
            </button>
            {pending[t.size] && placing !== t.size ? (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 10,
                  border: `1px solid ${C.amberBorder}`,
                  color: C.amber,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                A placement on this ticket started at{" "}
                {new Date(pending[t.size]).toLocaleTimeString()}
                {settled
                  ? " and never got a certain answer. It may have filled. Check My Bets, then say which it was. Place all skips this ticket until then."
                  : " and may still be running, here or in another tab. Wait a minute before deciding anything. Place all skips this ticket."}
                {settled ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => resolvePending(t.size, true)}
                    style={chipBtnStyle}
                  >
                    My Bets shows it filled
                  </button>
                  <button
                    onClick={() => resolvePending(t.size, false)}
                    style={chipBtnStyle}
                  >
                    My Bets shows nothing
                  </button>
                </div>
                ) : null}
              </div>
            ) : null}
            <Result r={results[t.size]} />
          </div>
        );
      })}

      <div
        style={{ color: C.muted, fontSize: 11.5, marginTop: 6, lineHeight: 1.5 }}
      >
        Each ticket is one real Kalshi combo. It pays only if every leg hits,
        so one miss loses that ticket's whole stake. Filled tickets show up in{" "}
        <a href="/my-bets" style={{ color: C.text }}>
          My Bets
        </a>
        .
      </div>
    </EnginePage>
  );
}
