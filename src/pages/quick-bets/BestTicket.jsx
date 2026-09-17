import { useEffect, useRef, useState } from "react";
import { C, th, td, chip, money } from "../../components/engine/theme.js";
import {
  callApi,
  card,
  chipBtnStyle,
  ctClock,
  ctStart,
  slateDay,
  pct1,
  comboCents,
  resultMeta,
} from "./shared.js";

/* Best N — the N-leg parlay with the highest chance of hitting.
 *
 * Backend: routes/kalshi.js in sheline-art-website-api, beside the rest of
 * Quick Bets, with its pure logic in services/quickBetsBest.js.
 *   POST /kalshi/quick-bets/best-ticket  {legs, mode, days, source}
 *   POST /kalshi/quick-bets/combo        {ticket_id, stake_dollars}
 *
 * Ranked PURELY on estimated win probability — no payout floor, and no
 * dependence on the favorites list's 70–93% band (on 2026-09-14 the best MLB
 * favorite was ~67%, so a Best 3 had no leg inside it). Every build is saved
 * server-side and graded from final scores; Record.jsx shows how they did.
 *
 * Buying sends only the saved ticket's id and a stake — one of five fixed
 * amounts, a button each (STAKES, $5–$25), not the page's stake box, which
 * feeds only the favorites list's Create Bet. The server buys a ticket AT
 * MOST ONCE (a second buy of the same id 409s, and a rebuild of identical legs
 * returns the same id), so a fill switches every button off for that ticket.
 * The build response carries no `placed_at`, so the card can't ask whether a
 * ticket was bought: it remembers the ids it saw fill in localStorage (a
 * reload and a rebuild of the same legs is the same ticket), and a 409 "was
 * already bought" — a fill it never saw, from a timed-out buy, another browser
 * or kalshi-live — switches the buttons off the same way.
 *
 * The server reloads the legs it stored and re-checks each one KALSHI AGAINST
 * KALSHI: the live price (the mid, or the best YES bid when the book is too
 * wide for one) against Kalshi's own price when the leg was saved — never
 * against the blended DK+Kalshi win %. It refuses the whole ticket (409,
 * `dropped`, with `p_then_pct` / `p_now_pct` on a price move) if any leg
 * started, closed, vanished or fell more than 5 points — nothing is bought on
 * a partial ticket.
 *
 * `placeable` is decided server-side: Kalshi-only mode, every leg a Kalshi
 * moneyline in a league the combo path can buy (NCAAF, NFL, MLB) with a price
 * it can re-check. Anything else is tracked and graded but not bought, and
 * `not_placeable_reason` is shown exactly as the server wrote it.
 *
 * This state lives in this component, not in index.jsx, so the favorites
 * list's load() — which resets the list selection on every Refresh and on
 * "+ Tomorrow's games" — never wipes a built ticket. Only the page's tomorrow
 * toggle comes in as a prop.
 */

// One buy button per amount, in dollars (Patrick, 2026-09-16: "seperate btns
// for 5,10,15,20,25 bets for the best bets combos").
const STAKES = [5, 10, 15, 20, 25];
const CONFIRM_MS = 6000;
// The second click of a double-click is not a confirmation.
const DOUBLE_TAP_GUARD_MS = 600;
// Heroku answers or cuts off within 30s; past this, stop waiting.
const BUILD_TIMEOUT_MS = 35000;
const PLACE_TIMEOUT_MS = 40000;
const MIN_LEGS = 2;
const MAX_LEGS = 10;

// Ticket ids this browser knows are bought → the amount, or null when a 409
// said "already bought" without one. See the header for why it's stored.
const BOUGHT_KEY = "bv_quickbets_best_bought";
// Ids only grow and an old ticket's games are over, so the newest are enough.
const BOUGHT_KEEP = 200;

const cleanBought = (raw) => {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [id, v] of Object.entries(raw)) {
    if (v === null || (typeof v === "number" && v > 0)) out[id] = v;
  }
  return out;
};

const readBought = () => {
  try {
    return cleanBought(JSON.parse(localStorage.getItem(BOUGHT_KEY) || "{}"));
  } catch {
    return {};
  }
};

const writeBought = (bought) => {
  try {
    // Merged with what's stored, so another tab's fills aren't overwritten
    // (nor a known amount by a 409's unknown one).
    const all = readBought();
    for (const [id, v] of Object.entries(bought)) {
      if (!(v === null && typeof all[id] === "number")) all[id] = v;
    }
    const keep = Object.keys(all)
      .sort((a, b) => Number(b) - Number(a))
      .slice(0, BOUGHT_KEEP);
    localStorage.setItem(
      BOUGHT_KEY,
      JSON.stringify(Object.fromEntries(keep.map((id) => [id, all[id]]))),
    );
  } catch {
    // Storage blocked (private window, site data off) — this visit still
    // remembers; a reload forgets, and the server's 409 still guards the buy.
  }
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const MODES = [
  { key: "kalshi", label: "Kalshi only (buyable)" },
  { key: "any", label: "+ DraftKings spreads & totals" },
];

const FLAG_LABEL = {
  "sources-disagree": "DK/Kalshi disagree",
  "kalshi-wide": "wide Kalshi spread",
  "stale-line": "stale DK line",
  "no-espn-match": "no ESPN match",
};
// Flags that say the number itself is shakier than it looks.
const WARN_FLAGS = new Set(["sources-disagree", "kalshi-wide", "stale-line"]);

const LEAGUE_STATUS_TEXT = {
  "no-games": "no games",
  preseason: "preseason",
  "all-started": "all started",
  "no-odds": "no odds yet",
  error: "couldn't load",
};

const DROP_REASON = {
  started: "game started",
  closed: "market closed",
  "price-moved": "price moved",
  missing: "market missing",
};

const stepBtn = {
  ...chipBtnStyle,
  width: 36,
  height: 36,
  padding: 0,
  fontSize: 18,
  lineHeight: "34px",
  textAlign: "center",
};

// kalshi_yes_ask is dollars (0.45). The server reads a missing ask as 0, and
// Kalshi quotes an empty ask side as $1 (a pinned favourite: bid 99¢, nobody
// selling — seen on the real 9/19 capture), so neither end is a price to show.
const kalshiCents = (v) => {
  const n = Number(v);
  return v == null || !(n > 0 && n < 1) ? null : `${Math.round(n * 100)}¢`;
};

// Kalshi's estimated payout if every leg hits, for a buy button's second line:
// cents under $100 ("~$47.21"), whole dollars from there ("~$118") so it fits
// a fifth of a phone-width row. null when there's no Kalshi cost to divide by.
const payoutLabel = (stake, costPerDollar) => {
  const cost = Number(costPerDollar);
  if (!(cost > 0)) return null;
  const p = stake / cost;
  // Grouped past $1,000 ("~$1,852" — a 10-leg ticket gets there on $25), the
  // same string kalshi-live's payoutEst draws; change one, change both.
  return p < 100 ? `~${money(p)}` : `~$${Math.round(p).toLocaleString("en-US")}`;
};

function LegsTable({ legs }) {
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <th style={th}>League</th>
            <th style={th}>Pick</th>
            <th style={{ ...th, textAlign: "right" }}>Win %</th>
            <th style={th}>Game</th>
            <th style={th}>Start (CT)</th>
            <th style={th}>Price</th>
            <th style={{ ...th, textAlign: "right" }}>DK / Kalshi %</th>
            <th style={th}>Flags</th>
          </tr>
        </thead>
        <tbody>
          {legs.map((l, i) => {
            const price = [
              l.book_price ? `DK ${l.book_price}` : null,
              kalshiCents(l.kalshi_yes_ask)
                ? `K ${kalshiCents(l.kalshi_yes_ask)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");
            const flags = Array.isArray(l.flags) ? l.flags : [];
            return (
              <tr
                key={l.pick_key || `${l.game_label}-${l.pick_label}-${i}`}
                style={{
                  borderBottom: `1px solid ${C.border}`,
                  background: i % 2 ? C.rowAlt : "transparent",
                  verticalAlign: "top",
                }}
              >
                <td style={{ ...td, color: C.muted, fontWeight: 700 }}>
                  {l.league_label || (l.league || "").toUpperCase() || "—"}
                </td>
                <td style={{ ...td, fontWeight: 700 }}>
                  {l.pick_label || "—"}
                  {l.market && l.market !== "ML" && l.market_label ? (
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>
                      {l.market_label}
                    </div>
                  ) : null}
                </td>
                <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>
                  {pct1(l.p_pct)}
                </td>
                <td style={td}>
                  {l.game_label || l.matchup || "—"}
                  {l.probables && (l.probables.away || l.probables.home) ? (
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {l.probables.away || "TBD"} vs {l.probables.home || "TBD"}
                    </div>
                  ) : null}
                </td>
                <td style={td}>{ctStart(l.start_time)}</td>
                <td style={td}>{price || "—"}</td>
                <td style={{ ...td, textAlign: "right", color: C.muted }}>
                  {l.p_book_pct == null ? "—" : Number(l.p_book_pct).toFixed(1)}
                  {" / "}
                  {l.p_kalshi_pct == null ? "—" : Number(l.p_kalshi_pct).toFixed(1)}
                </td>
                <td style={td}>
                  {flags.length === 0 ? (
                    <span style={{ color: C.muted }}>—</span>
                  ) : (
                    <span style={{ display: "inline-flex", gap: 4 }}>
                      {flags.map((f) => (
                        <span
                          key={f}
                          style={
                            WARN_FLAGS.has(f)
                              ? chip(C.amberSoft, C.amber)
                              : chip(C.chipBg, C.muted)
                          }
                        >
                          {FLAG_LABEL[f] || f}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LeagueStatus({ leagues }) {
  if (!Array.isArray(leagues) || leagues.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 12px",
        fontSize: 11.5,
        color: C.muted,
        marginTop: 10,
      }}
    >
      {leagues.map((l) => {
        const label = l.label || String(l.key || "").toUpperCase();
        // The server's note already says the status in words ("preseason
        // only — not priced"), so it replaces the local text rather than
        // repeating it. An "ok" league keeps its count; its only note is a
        // Kalshi read failure.
        const text =
          l.status === "ok"
            ? `${l.eligible ?? 0} of ${l.games ?? 0} games eligible${l.note ? ` — ${l.note}` : ""}`
            : l.note || LEAGUE_STATUS_TEXT[l.status] || l.status || "—";
        return (
          <span
            key={l.key || label}
            style={{ color: l.status === "error" ? C.red : C.muted }}
          >
            <strong style={{ color: l.status === "ok" ? C.text : "inherit" }}>
              {label}
            </strong>{" "}
            {text}
          </span>
        );
      })}
    </div>
  );
}

/* The buy answer, in the same card the favorites list's Create Bet uses. */
function BuyResult({ r, legs, onRebuild, rebuildDisabled }) {
  if (!r) return null;
  const border = r.ok
    ? r.filled
      ? C.greenBorder
      : C.amberBorder
    : r.uncertain
      ? C.amberBorder
      : C.redBorder;
  const legName = (ticker) =>
    (legs || []).find((l) => l.kalshi_market_ticker === ticker)?.pick_label ||
    ticker ||
    "a leg";
  const dropped = Array.isArray(r.dropped) ? r.dropped : [];
  // A price-moved entry says Kalshi's price then and now (0–100), when known.
  const moved = (d) => {
    if (d.p_then_pct == null) return null;
    return d.p_now_pct == null
      ? ` (was ${pct1(d.p_then_pct)} → no live price now)`
      : ` (was ${pct1(d.p_then_pct)} → now ${pct1(d.p_now_pct)})`;
  };
  return (
    <div style={{ ...card, marginTop: 12, marginBottom: 0, borderColor: border }}>
      {r.ok ? (
        r.filled ? (
          <>
            <div style={{ color: C.green, fontWeight: 700, fontSize: 14 }}>
              Filled: {r.contracts_filled} contract
              {r.contracts_filled === 1 ? "" : "s"} @ {money(r.price_dollars)} ={" "}
              {money(r.spent_dollars)} across {r.legs_used} games.
            </div>
            {r.warning ? (
              <div style={{ color: C.amber, fontSize: 12.5, marginTop: 6, lineHeight: 1.45 }}>
                {r.warning}
              </div>
            ) : null}
          </>
        ) : (
          <div style={{ color: C.amber, fontSize: 13.5 }}>
            <strong>Not filled.</strong> {r.unfilled_reason}
            <div style={{ color: C.muted, marginTop: 4, fontSize: 12 }}>
              Nothing was charged. The ticket is still saved and graded either
              way — try again later.
            </div>
          </div>
        )
      ) : (
        <>
          <div style={{ color: r.uncertain ? C.amber : C.red, fontSize: 13.5 }}>
            {r.error}
          </div>
          {r.uncertain ? (
            <div style={{ color: C.amber, fontSize: 12, marginTop: 4 }}>
              This may still have gone through. Check My Bets before buying
              again.
            </div>
          ) : null}
          {dropped.length > 0 ? (
            <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>
              <div style={{ color: C.muted }}>
                {/nothing was bought/i.test(r.error || "")
                  ? "These legs no longer check out:"
                  : "Nothing was bought. These legs no longer check out:"}
              </div>
              {dropped.map((d, i) => (
                <div key={`${d.market_ticker}-${i}`} style={{ color: C.text }}>
                  {legName(d.market_ticker)}{" "}
                  <span style={{ color: C.amber }}>
                    {DROP_REASON[d.reason] || d.reason}
                    {d.reason === "price-moved" ? moved(d) : null}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {/* A 409 is also a duplicate in-flight buy or a ticket that can't be
              bought (both `dropped: []`) — a rebuild fixes neither, so only a
              409 that names changed legs offers one. The error text above
              says what happened either way. */}
          {r.conflict && dropped.length > 0 ? (
            <button
              type="button"
              onClick={onRebuild}
              disabled={rebuildDisabled}
              style={{
                ...chipBtnStyle,
                marginTop: 8,
                cursor: rebuildDisabled ? "default" : "pointer",
              }}
            >
              Rebuild with live prices
            </button>
          ) : null}
        </>
      )}
      {r.ok && dropped.length > 0 ? (
        <div style={{ color: C.muted, fontSize: 11.5, marginTop: 6 }}>
          Dropped: {dropped.length}
        </div>
      ) : null}
    </div>
  );
}

export default function BestTicket({ includeTomorrow, onRecorded }) {
  const [legs, setLegs] = useState(3);
  const [mode, setMode] = useState("kalshi");
  const [building, setBuilding] = useState(false);
  // The last good build, plus the controls it was built with.
  const [built, setBuilt] = useState(null);
  const [buildErr, setBuildErr] = useState(null);
  // { ticketId, stake } — a confirm is for one ticket at one of the STAKES.
  const [armed, setArmed] = useState(null);
  // The amount in flight (null when nothing is), so its button can say so.
  const [placingStake, setPlacingStake] = useState(null);
  const placing = placingStake != null;
  const [buyResult, setBuyResult] = useState(null);
  // The amount each ticket id filled at (null: bought, amount unknown),
  // remembered in this browser. The server buys a ticket at most once, so a
  // bought ticket's buttons stay off — after a reload and a rebuild too.
  const [bought, setBought] = useState(readBought);
  const armTimer = useRef(null);
  const armedAt = useRef(0);

  useEffect(() => () => clearTimeout(armTimer.current), []);

  useEffect(() => {
    writeBought(bought);
  }, [bought]);

  // Leaving mid-buy loses this page's record of the answer, not the order,
  // so the browser asks first.
  useEffect(() => {
    if (!placing) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [placing]);

  const days = includeTomorrow ? 2 : 1;
  const ticket = built && built.body ? built.body.ticket : null;

  const disarm = () => {
    clearTimeout(armTimer.current);
    setArmed(null);
  };

  const build = async () => {
    if (building || placing) return;
    disarm();
    setBuilding(true);
    setBuildErr(null);
    setBuyResult(null);
    const sent = { legs, mode, days };
    const r = await callApi("/best-ticket", {
      body: { ...sent, source: "web" },
      timeoutMs: BUILD_TIMEOUT_MS,
    });
    setBuilding(false);
    if (r.kind === "ok") {
      setBuilt({ body: r.body, ...sent });
      if (onRecorded) onRecorded();
    } else {
      // The last good ticket stays on screen under the error: it is still a
      // saved ticket, and the server re-checks it on Buy anyway.
      setBuildErr(r);
    }
  };

  const buyBlock = !ticket
    ? null
    : !ticket.placeable
      ? // The server's reason, verbatim — it knows which rule failed.
        (ticket.not_placeable_reason && String(ticket.not_placeable_reason)) ||
        "This ticket can't be bought on Kalshi. It is still saved and graded."
      : ticket.id == null
        ? "This ticket wasn't saved, so it can't be bought. Build again."
        : null;
  // Whether this ticket is already bought, and at what amount if known.
  const isBought = Boolean(ticket) && ticket.id != null && hasOwn(bought, ticket.id);
  const boughtStake = isBought ? bought[ticket.id] : null;
  const canBuy = Boolean(ticket) && !buyBlock && !isBought && !placing && !building;
  // Which amount is waiting for its confirming second tap, if any.
  const armedStake =
    canBuy && armed && armed.ticketId === ticket.id ? armed.stake : null;
  const legCount = ticket ? ticket.legs_used || (ticket.legs || []).length : 0;
  // No Kalshi cost, no payout under any amount — and no helper text saying so.
  const showPayouts =
    Boolean(ticket) && payoutLabel(STAKES[0], ticket.kalshi_cost_per_dollar) != null;

  const tapBuy = async (amount, e) => {
    if (!canBuy) return;
    const stamp = e.timeStamp;
    // A first tap — or a tap on a different amount while one is armed, which
    // re-arms at the new amount rather than buying either.
    if (armedStake !== amount) {
      armedAt.current = stamp;
      clearTimeout(armTimer.current);
      setArmed({ ticketId: ticket.id, stake: amount });
      armTimer.current = setTimeout(() => setArmed(null), CONFIRM_MS);
      return;
    }
    // Too soon after the last tap to be a confirmation. An ignored tap restarts
    // the window, so a held Enter's key-repeat or a slow triple-click never
    // reaches a buy — only a real pause before the second tap does.
    if (stamp - armedAt.current < DOUBLE_TAP_GUARD_MS) {
      armedAt.current = stamp;
      return;
    }
    disarm();
    const ticketId = ticket.id;
    setPlacingStake(amount);
    setBuyResult(null);
    let r;
    try {
      r = await callApi("/combo", {
        body: { ticket_id: ticketId, stake_dollars: amount },
        timeoutMs: PLACE_TIMEOUT_MS,
      });
    } catch (err) {
      // callApi classifies every failure itself; this only keeps a future
      // throw from leaving the buttons stuck on "Placing…".
      r = { kind: "network", message: String((err && err.message) || err) };
    } finally {
      setPlacingStake(null);
    }
    if (r.kind === "ok") {
      setBuyResult({ ok: true, ...r.body });
      if (r.body.filled) {
        setBought((prev) => ({ ...prev, [ticketId]: amount }));
        if (onRecorded) onRecorded();
      }
    } else if (r.kind === "not-deployed") {
      setBuyResult({
        ok: false,
        error: "Buying a Best N ticket isn't deployed on the backend yet. Nothing was bought.",
      });
    } else if (r.kind === "network") {
      setBuyResult({
        ok: false,
        uncertain: true,
        error: `Lost the connection (${r.message}) before the server answered.`,
      });
    } else {
      // "this ticket was already bought" is a fill this card never saw (a
      // timed-out buy, another browser, kalshi-live): switch the buttons off
      // as a fill would. Not "already being bought" (in flight — it clears) or
      // a 409 with dropped legs, neither of which means it filled.
      if (r.status === 409 && /already bought/i.test(r.message || "")) {
        setBought((prev) => (hasOwn(prev, ticketId) ? prev : { ...prev, [ticketId]: null }));
      }
      setBuyResult({
        ok: false,
        conflict: r.status === 409,
        // A 500, or a reply that isn't our JSON (a Heroku timeout page), can
        // follow an order that already went out.
        uncertain: r.status === 500 || !r.body,
        error: r.message,
        dropped: r.body && Array.isArray(r.body.dropped) ? r.body.dropped : null,
      });
    }
  };

  const stale =
    built &&
    (built.legs !== legs || built.mode !== mode || built.days !== days);
  const body = built ? built.body : null;

  return (
    <div style={{ ...card, marginTop: 12, marginBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 15.5, fontWeight: 800, color: C.text }}>
          Best {legs}: the likeliest parlay
        </div>
        <div style={{ fontSize: 11.5, color: C.muted }}>
          {includeTomorrow ? "today + tomorrow" : "today's games"}, ranked on
          win chance alone
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 10,
        }}
      >
        <span style={{ fontSize: 12.5, color: C.muted }}>Legs</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            aria-label="Fewer legs"
            onClick={() => setLegs((n) => Math.max(MIN_LEGS, n - 1))}
            disabled={legs <= MIN_LEGS}
            style={{ ...stepBtn, color: legs <= MIN_LEGS ? C.muted : C.text }}
          >
            −
          </button>
          <span
            aria-live="polite"
            style={{
              minWidth: 26,
              textAlign: "center",
              fontSize: 16,
              fontWeight: 800,
              color: C.text,
            }}
          >
            {legs}
          </span>
          <button
            type="button"
            aria-label="More legs"
            onClick={() => setLegs((n) => Math.min(MAX_LEGS, n + 1))}
            disabled={legs >= MAX_LEGS}
            style={{ ...stepBtn, color: legs >= MAX_LEGS ? C.muted : C.text }}
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={build}
          disabled={building || placing}
          style={{
            marginLeft: "auto",
            padding: "9px 16px",
            borderRadius: 10,
            border: "none",
            fontSize: 14,
            fontWeight: 800,
            color: building || placing ? C.muted : "#06210f",
            background: building || placing ? C.chipBg : C.green,
            cursor: building || placing ? "default" : "pointer",
          }}
        >
          {building ? "Building…" : built ? `Rebuild best ${legs}` : `Build best ${legs}`}
        </button>
      </div>

      <div
        role="group"
        aria-label="Which markets"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}
      >
        {MODES.map((m) => {
          const on = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={on}
              onClick={() => setMode(m.key)}
              style={{
                ...chipBtnStyle,
                flex: "1 1 140px",
                background: on ? C.greenSoft : C.chipBg,
                borderColor: on ? C.greenBorder : C.border,
                color: on ? C.text : C.muted,
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      {mode === "any" ? (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
          Tickets built this way are saved and graded but can't be bought —
          switch to Kalshi only to buy.
        </div>
      ) : null}

      {buildErr && buildErr.kind === "not-deployed" ? (
        <div style={{ color: C.muted, fontSize: 12.5, marginTop: 12, lineHeight: 1.45 }}>
          Best N isn't deployed on the backend yet. Everything below works as
          before.
        </div>
      ) : buildErr && buildErr.kind === "network" ? (
        <div style={{ color: C.muted, fontSize: 12.5, marginTop: 12, lineHeight: 1.45 }}>
          Couldn't reach Best N ({buildErr.message}) — it may not be deployed
          yet, or the connection dropped. Try again in a minute.
        </div>
      ) : buildErr ? (
        <div style={{ color: C.red, fontSize: 13, marginTop: 12 }}>
          {buildErr.message}
        </div>
      ) : null}

      {!built && !buildErr ? (
        <div style={{ color: C.muted, fontSize: 12.5, marginTop: 12, lineHeight: 1.45 }}>
          {building
            ? "Reading the slate from ESPN, DraftKings and Kalshi…"
            : "Build picks the legs most likely to ALL win, one per game. Every ticket built is saved and graded after the games."}
        </div>
      ) : null}

      {body ? (
        // Dimmed while a Rebuild is in flight: this is the previous ticket,
        // about to be replaced.
        <div
          aria-busy={building}
          style={{
            marginTop: 12,
            opacity: building ? 0.45 : 1,
            transition: "opacity 150ms ease",
          }}
        >
          {stale ? (
            <div style={{ color: C.amber, fontSize: 12, marginBottom: 8 }}>
              Built for {built.legs} legs,{" "}
              {built.mode === "kalshi" ? "Kalshi only" : "with DraftKings lines"},{" "}
              {built.days === 2 ? "today + tomorrow" : "today only"}. The
              controls have changed since — Rebuild to match.
            </div>
          ) : null}

          {ticket ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "6px 16px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 800,
                      lineHeight: 1,
                      color: Number(ticket.p_hit_pct) >= 50 ? C.green : C.amber,
                    }}
                  >
                    {pct1(ticket.p_hit_pct)}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>
                    chance all {legCount} hit
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
                  <div>
                    Fair{" "}
                    <strong style={{ color: C.text }}>
                      {ticket.fair_american || "—"}
                    </strong>
                    {" · "}DK{" "}
                    <strong style={{ color: C.text }}>
                      {ticket.book_american || "—"}
                    </strong>
                  </div>
                  {ticket.kalshi_cost_per_dollar != null ? (
                    <div>
                      Kalshi est.{" "}
                      <strong style={{ color: C.text }}>
                        {comboCents(ticket.kalshi_cost_per_dollar)}
                      </strong>{" "}
                      per $1
                    </div>
                  ) : null}
                </div>
              </div>
              {ticket.kalshi_cost_per_dollar != null ? (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  The Kalshi figure multiplies each leg's ask. Combos are priced
                  by a market maker's quote, so the real price will differ.
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginTop: 10,
                  fontSize: 11.5,
                  color: C.muted,
                }}
              >
                {/* A fresh ticket is always ungraded; only a graded one (a
                    rebuild of a slate that has since finished) earns a chip. */}
                {ticket.status && ticket.status !== "pending" ? (
                  <span
                    style={chip(
                      resultMeta(ticket.status).bg,
                      resultMeta(ticket.status).color,
                    )}
                  >
                    {resultMeta(ticket.status).label}
                  </span>
                ) : null}
                {ticket.short ? (
                  <span style={chip(C.amberSoft, C.amber)}>
                    only {legCount} of {body.legs_requested} legs qualified
                  </span>
                ) : null}
                {ticket.times_generated > 1 ? (
                  <span style={chip(C.chipBg, C.muted)}>
                    built {ticket.times_generated}×
                  </span>
                ) : null}
                <span>
                  Built {ctClock(body.generated_at)}
                  {Array.isArray(body.slate_dates) && body.slate_dates.length
                    ? ` · slate ${body.slate_dates.map(slateDay).join(" + ")}`
                    : ""}
                  {body.pool_size != null ? ` · ${body.pool_size} legs in the pool` : ""}
                </span>
              </div>

              <div style={{ marginTop: 10 }}>
                <LegsTable legs={ticket.legs || []} />
              </div>
            </>
          ) : (
            <div
              style={{
                color: C.muted,
                fontSize: 13,
                padding: "12px 0",
                lineHeight: 1.45,
              }}
            >
              {body.message ||
                "Fewer than 2 legs qualify on this slate, so there's no ticket to build."}
            </div>
          )}

          {ticket && body.message ? (
            <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
              {body.message}
            </div>
          ) : null}

          {Array.isArray(body.warnings) && body.warnings.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              {body.warnings.map((w, i) => (
                <div key={i} style={{ color: C.amber, fontSize: 12, lineHeight: 1.45 }}>
                  {w}
                </div>
              ))}
            </div>
          ) : null}

          <LeagueStatus leagues={body.leagues} />

          {Array.isArray(body.alternates) && body.alternates.length > 0 ? (
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 12, color: C.muted, cursor: "pointer" }}>
                Next best legs ({body.alternates.length})
              </summary>
              <div style={{ marginTop: 6 }}>
                <LegsTable legs={body.alternates} />
              </div>
            </details>
          ) : null}

          {ticket ? (
            <div style={{ marginTop: 14 }}>
              {/* The confirm prompt takes the label's place while an amount
                  is armed, rather than stacking a second line on it. A ticket
                  that can't be bought, or already was, gets no "Buy this"
                  over its grey buttons — the line under the row says why. */}
              {armedStake != null ? (
                <div
                  style={{
                    color: C.amber,
                    fontSize: 13.5,
                    fontWeight: 700,
                    marginBottom: 6,
                    textAlign: "center",
                  }}
                >
                  Buy this {legCount}-leg ticket for {money(armedStake)}?
                </div>
              ) : !buyBlock && !isBought ? (
                <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 6 }}>
                  Buy this {legCount}-leg ticket
                </div>
              ) : null}
              {/* One row of five, flex 1 each, so it stays on one line down
                  to a ~360px phone. */}
              <div role="group" aria-label="Stake" style={{ display: "flex", gap: 6 }}>
                {STAKES.map((amount) => {
                  const isArmed = armedStake === amount;
                  const inFlight = placingStake === amount;
                  const sub = isArmed
                    ? "Confirm"
                    : inFlight
                      ? "…"
                      : payoutLabel(amount, ticket.kalshi_cost_per_dollar);
                  return (
                    <button
                      key={amount}
                      type="button"
                      onClick={(e) => tapBuy(amount, e)}
                      disabled={!canBuy}
                      aria-label={
                        isArmed
                          ? `Confirm buying ${legCount}-leg ticket for $${amount}`
                          : `Buy ${legCount}-leg ticket for $${amount}`
                      }
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "9px 2px",
                        borderRadius: 12,
                        border: "none",
                        lineHeight: 1.15,
                        fontVariantNumeric: "tabular-nums",
                        color: canBuy ? "#06210f" : C.muted,
                        background: !canBuy ? C.chipBg : isArmed ? C.amber : C.green,
                        cursor: canBuy ? "pointer" : "not-allowed",
                      }}
                    >
                      <span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>
                        {`$${amount}`}
                      </span>
                      {sub ? (
                        <span
                          style={{
                            display: "block",
                            fontSize: 11,
                            fontWeight: 700,
                            marginTop: 2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {sub}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {armedStake != null ? (
                <div style={{ textAlign: "center", marginTop: 6 }}>
                  <button type="button" onClick={disarm} style={chipBtnStyle}>
                    Cancel
                  </button>
                </div>
              ) : null}
              {placing ? (
                <div
                  style={{
                    color: C.muted,
                    fontSize: 12,
                    marginTop: 6,
                    textAlign: "center",
                    lineHeight: 1.45,
                  }}
                >
                  Placing {money(placingStake)}… this can take 20 seconds
                </div>
              ) : buyBlock ? (
                <div
                  style={{
                    color: C.muted,
                    fontSize: 12,
                    marginTop: 6,
                    textAlign: "center",
                    lineHeight: 1.45,
                  }}
                >
                  {buyBlock}
                </div>
              ) : isBought ? (
                <div
                  style={{
                    color: C.muted,
                    fontSize: 12,
                    marginTop: 6,
                    textAlign: "center",
                    lineHeight: 1.45,
                  }}
                >
                  {boughtStake != null ? `Bought ${money(boughtStake)}` : "Already bought"}{" "}
                  — check My Bets. A ticket is bought at most once; build again
                  for a new one.
                </div>
              ) : armedStake == null ? (
                <div
                  style={{
                    color: C.muted,
                    fontSize: 11.5,
                    marginTop: 6,
                    textAlign: "center",
                    lineHeight: 1.45,
                  }}
                >
                  {showPayouts
                    ? "Under each amount is Kalshi's estimated payout if every leg hits. "
                    : null}
                  The server re-checks every leg's live Kalshi price first and
                  buys nothing if any leg has started, closed or dropped more
                  than 5 points.
                </div>
              ) : null}
              <BuyResult
                r={buyResult}
                legs={ticket.legs}
                onRebuild={build}
                rebuildDisabled={building || placing}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
