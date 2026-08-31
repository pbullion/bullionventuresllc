import { useEffect, useState } from "react";
import EngineBlockedBanner from "../../components/EngineBlockedBanner.jsx";
import EngineTuning from "../../components/EngineTuning.jsx";
import OpenBetsRail from "../../components/OpenBetsRail";
import PnlChart from "../../components/PnlChart.jsx";
import EnginePage from "../../components/engine/EnginePage.jsx";
import { EngineHeader } from "../../components/engine/EngineChrome.jsx";
import LedgerTiles from "../../components/engine/LedgerTiles.jsx";
import Panel from "../../components/engine/Panel.jsx";
import {
  C,
  chip,
  clockTime,
  cents,
  money,
  td,
  th,
} from "../../components/engine/theme.js";

/* Weather Value — live view of the Kalshi weather engine (backend:
 * sheline-art-website-api routes/kalshiWeather.js). Daily city-high markets,
 * seven cities. TWO ledgers on purpose: the real one (live since 2026-08-19,
 * $3 units / $10 max, Patrick's call) and the shadow paper ledger, which keeps
 * writing in live mode because it is the model's judge — the page shows them
 * side by side so "the model is right" and "the account is up" stay two
 * different questions.
 *
 * Laid out in the shared engine order (2026-08-31) — header, blocked banner,
 * ledger tiles, auto-bet, P&L, bets, breakdowns — with the palette, formatters
 * and chrome coming from ../../components/engine/. Everything this page knows
 * about weather is still here; nothing generic is. */
const API_BASE = "https://sheline-art-website-api.herokuapp.com/kalshi-weather";

const RESULT_STYLE = {
  won: { color: C.green, label: "WON" },
  lost: { color: C.red, label: "LOST" },
};

export default function WeatherValue() {
  const [status, setStatus] = useState(null);
  const [bets, setBets] = useState([]);
  const [paper, setPaper] = useState([]);
  const [showPaper, setShowPaper] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const [s, b, p] = await Promise.all([
        fetch(`${API_BASE}/auto-bets/status`).then((r) => r.json()),
        fetch(`${API_BASE}/auto-bets`).then((r) => r.json()),
        fetch(`${API_BASE}/paper-bets`).then((r) => r.json()),
      ]);
      setStatus(s);
      setBets(b.bets || []);
      setPaper(p.bets || []);
      setErr("");
    } catch (e) {
      setErr(e.message || "load failed");
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
    const id = setInterval(load, 30000); // same cadence as /totals-value
    return () => clearInterval(id);
  }, []);

  // Same helper as the other engine pages — PIN cached in localStorage,
  // verified server-side, one re-prompt on 401.
  const postWithPin = async (path, body = {}) => {
    let pin = window.localStorage.getItem("bv_autobet_pin") || "";
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!pin) {
        pin = window.prompt("Auto-bet PIN:") || "";
        if (!pin) return null;
      }
      setBusy(true);
      try {
        const r = await fetch(`${API_BASE}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, pin }),
        });
        if (r.status === 401) {
          window.localStorage.removeItem("bv_autobet_pin");
          pin = "";
          continue;
        }
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          window.alert(e.error || `HTTP ${r.status}`);
          return null;
        }
        window.localStorage.setItem("bv_autobet_pin", pin);
        return (await r.json().catch(() => ({}))) || {};
      } catch {
        window.alert("request failed");
        return null;
      } finally {
        setBusy(false);
      }
    }
    return null;
  };

  const kill = async () => {
    if (!window.confirm("Kill the weather engine? (paper scanning continues)"))
      return;
    if (await postWithPin("/auto-bets/kill")) load();
  };
  const enable = async () => {
    if (await postWithPin("/auto-bets/enable")) load();
  };

  const lastScan = status && status.last_scan;
  const cfg = status && status.config;
  const live = status && status.live_ledger;
  const pp = status && status.paper;
  const byExit = (status && status.live_by_exit) || {};
  const byLead = (status && status.live_by_lead) || {};

  /* THE RECORD NEEDS ALL THREE COUNTS. The auto cash-out monitor sells at >=90%
     of max payout, i.e. it sells winners shortly before they would settle as
     wins, so a sold row's result is the literal 'cashed_out' and never 'yes' or
     'no'. Reading wins alone printed "0 wins on 34 fills" on 2026-08-20 over a
     ledger where 8 of 14 resolved positions had MADE money. Wins, losses and
     sold-early are three separate counts that add up to resolved. */
  const record = (l) => {
    if (!l) return null;
    const w = Number(l.won || 0),
      ls = Number(l.lost || 0),
      c = Number(l.cashed || 0);
    if (!(w + ls + c)) return null;
    return `${w}-${ls}${c ? ` · ${c} sold early` : ""}`;
  };

  const betRow = (b, isPaper) => {
    const res =
      RESULT_STYLE[b.result] ||
      (b.result
        ? { color: C.amber, label: String(b.result).toUpperCase() }
        : null);
    const price = isPaper ? b.price : (b.fill_price ?? b.intended_price);
    const pnl = isPaper ? b.pnl : b.pnl_dollars;
    return (
      <tr
        key={`${isPaper ? "p" : "r"}${b.id}`}
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <td style={td}>{clockTime(b.created_at)}</td>
        <td style={td}>{b.city ? b.city.toUpperCase() : "—"}</td>
        <td style={{ ...td, whiteSpace: "normal" }}>
          {b.market_ticker}{" "}
          <span style={{ color: C.muted }}>({b.bracket})</span>
        </td>
        <td style={td}>{String(b.side || "").toUpperCase()}</td>
        <td style={td}>{cents(price)}</td>
        <td style={td}>
          {isPaper
            ? money(b.stake)
            : b.status === "unfilled"
              ? "—"
              : money((b.filled_contracts ?? 0) * (b.fill_price ?? 0))}
        </td>
        <td style={td}>
          {b.edge != null ? `+${Math.round(b.edge * 100)}¢` : "—"}
        </td>
        <td style={{ ...td, color: res ? res.color : C.muted }}>
          {res ? res.label : isPaper ? "OPEN" : (b.status || "").toUpperCase()}
        </td>
        <td
          style={{
            ...td,
            color: pnl > 0 ? C.green : pnl < 0 ? C.red : C.muted,
          }}
        >
          {pnl != null ? money(pnl) : "—"}
        </td>
      </tr>
    );
  };

  const table = (rows, isPaper) => (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {[
              "Time",
              "City",
              "Market",
              "Side",
              "Price",
              "Stake",
              "Edge",
              "Status",
              "P&L",
            ].map((h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map((b) => betRow(b, isPaper))}</tbody>
      </table>
      {!rows.length && (
        <div style={{ color: C.muted, fontSize: 13, padding: 8 }}>
          Nothing yet.
        </div>
      )}
    </div>
  );

  const hasBreakdown =
    byExit.held_to_settle ||
    byExit.cashed_out ||
    byLead.same_day ||
    byLead.next_day;

  return (
    <EnginePage rail={<OpenBetsRail domain="weather" />}>
      <EngineHeader
        title="🌡 Weather Value"
        self="weather"
        status={status}
        at={lastScan && lastScan.at}
        scanMinutes={cfg && cfg.scan_minutes}
        err={err}
      />

      {/* Above everything collapsible, like the pill: a halted engine must not
          be something you have to expand a section to discover. */}
      <EngineBlockedBanner
        blocked={status && status.blocked}
        engine="Weather"
      />

      <LedgerTiles
        tiles={[
          {
            label: "REAL",
            pnl: live && live.pnl,
            sub:
              (live &&
                [
                  /* open_positions, NOT `filled`: the settle pass stamps a
                     row's result and P&L but leaves status='filled', so
                     `filled` counts already-decided losers here and reads as
                     exposure that no longer exists. */
                  `${live.open_positions ?? live.filled ?? 0} open · ${money(live.staked)} staked`,
                  record(live),
                ]
                  .filter(Boolean)
                  .join(" · ")) ||
              "—",
          },
          {
            label: "PAPER (the model's judge)",
            pnl: pp && pp.pnl,
            sub: pp
              ? `${pp.settled || 0}/${pp.n || 0} settled · ${pp.won || 0} won`
              : "—",
          },
        ]}
      />

      <Panel
        id="autobet"
        keyPrefix="bv_wv_panel_"
        title="🤖 Auto-Bet"
        right={
          status && status.killed ? (
            <button
              onClick={enable}
              disabled={busy}
              style={{
                background: C.greenSoft,
                color: C.green,
                border: `1px solid ${C.greenBorder}`,
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Enable (PIN)
            </button>
          ) : (
            <button
              onClick={kill}
              disabled={busy}
              style={{
                background: C.redSoft,
                color: C.red,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Kill
            </button>
          )
        }
      >
        {cfg && (
          <div style={{ color: C.muted, fontSize: 12 }}>
            ${cfg.unit_dollars}/u +1u per 3¢ edge · ${cfg.max_bet_dollars}{" "}
            max/bet · ${cfg.max_daily_dollars}/day loss cap · $
            {cfg.max_event_dollars}/city-day · needs{" "}
            {Math.round(cfg.min_edge * 100)}¢+ edge · scan{" "}
            {clockTime(lastScan && lastScan.at)}
          </div>
        )}
        {lastScan && lastScan.cities && (
          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}
          >
            {Object.entries(lastScan.cities).map(([k, v]) => (
              <span
                key={k}
                style={{
                  ...chip(C.chipBg, v.error ? C.red : C.text),
                  fontWeight: 600,
                }}
              >
                {k.toUpperCase()}{" "}
                {v.error
                  ? "ERR"
                  : v.obs_max != null
                    ? /* One decimal — the brackets are half-degree wide, so a
                         whole-degree chip can't say which side of …-B90.5 the
                         station is on. Matches /my-bets and both TV apps.
                         Patrick, 2026-08-20. */
                      `${Number(v.obs_max).toFixed(1)}°`
                    : "—"}
                {v && v.new_paper_bets ? (
                  <span style={{ color: C.amber }}> +{v.new_paper_bets}</span>
                ) : null}
              </span>
            ))}
          </div>
        )}
      </Panel>

      {/* Realized money over time, weather ledger only. */}
      <PnlChart
        engines={[{ key: "weather", label: "Weather" }]}
        defaultEngine="weather"
        title="Weather P&L over time"
      />

      <Panel
        id="ledger"
        keyPrefix="bv_wv_panel_"
        title={showPaper ? "📝 Paper ledger" : "💵 Real ledger"}
        right={
          <button
            onClick={() => setShowPaper((v) => !v)}
            style={{
              background: C.chipBg,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            show {showPaper ? "real" : "paper"}
          </button>
        }
      >
        {showPaper ? table(paper, true) : table(bets, false)}
      </Panel>

      {/* HOW THE MONEY ENDED, not just how much. On 2026-08-20 the headline
          "-$22" hid the only thing worth knowing: every position that reached
          settlement lost, and every one the cash-out monitor sold made money. A
          single P&L number cannot say that, and the same-day/next-day split
          beside it is what the 9pm lead-time gate acts on — the two are
          confounded (a next-day position has had longer to be sold), so they
          are shown together, not as a conclusion. */}
      {hasBreakdown && (
        <Panel id="breakdown" keyPrefix="bv_wv_panel_" title="📊 How it ended">
          {[
            [
              "HOW IT ENDED",
              [
                ["Held to settlement", byExit.held_to_settle],
                ["Sold early by the monitor", byExit.cashed_out],
              ],
            ],
            [
              "LEAD TIME (what the 9pm gate acts on)",
              [
                ["Same day", byLead.same_day],
                ["Next day", byLead.next_day],
              ],
            ],
          ].map(([heading, rows]) => (
            <div key={heading} style={{ marginBottom: 10 }}>
              <div
                style={{
                  color: C.muted,
                  fontSize: 11,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                {heading}
              </div>
              {rows.map(([label, r]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    fontSize: 13,
                    padding: "3px 0",
                  }}
                >
                  <span style={{ color: C.text }}>{label}</span>
                  <span style={{ color: C.muted, textAlign: "right" }}>
                    {r ? (
                      <>
                        {r.resolved != null &&
                        Number(r.resolved) !== Number(r.n)
                          ? `${r.resolved} of ${r.n} resolved`
                          : `${r.n} bet${Number(r.n) === 1 ? "" : "s"}`}
                        {" · "}
                        {money(r.staked)} staked{" · "}
                        <b
                          style={{
                            color:
                              Number(r.pnl) > 0
                                ? C.green
                                : Number(r.pnl) < 0
                                  ? C.red
                                  : C.text,
                          }}
                        >
                          {money(r.pnl)}
                        </b>
                      </>
                    ) : (
                      "none yet"
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ color: C.muted, fontSize: 11, lineHeight: 1.5 }}>
            The monitor sells at ≥90% of max payout, so it takes winners out
            early — that is why the win column can read 0 on a ledger that made
            money, and why "sold early" is counted apart from wins and losses
            rather than folded into either.
          </div>
        </Panel>
      )}

      <EngineTuning
        apiBase={API_BASE}
        post={postWithPin}
        busy={busy}
        C={C}
        storageKey="bv_tuning_open_weather"
      />
    </EnginePage>
  );
}
