import { useEffect, useState } from "react";
import EngineBlockedBanner from "../../components/EngineBlockedBanner.jsx";
import EngineTuning from "../../components/EngineTuning.jsx";
import OpenBetsRail from "../../components/OpenBetsRail";

/* Gas Value — view of the Kalshi GAS engine (backend: sheline-art-website-api
 * routes/kalshiGas.js). AAA average-gas-price ladders: the national daily, six
 * state dailies and the weekly, settling every morning on the price AAA
 * publishes at gasprices.aaa.com.
 *
 * Born paper-only 2026-08-27; LIVE-MONEY since 2026-08-28 (Patrick's call,
 * weather's sizing defaults, arms via GASBET_ENABLED). TWO ledgers on
 * purpose, like /weather-value: the real one and the shadow paper ledger,
 * which keeps writing in live mode because it is the model's judge — "the
 * model is right" and "the account is up" stay two different questions. */
const API_BASE = "https://sheline-art-website-api.herokuapp.com/kalshi-gas";

const C = {
  bg: "#0b0e14",
  panel: "#151a24",
  border: "#252c3a",
  text: "#e8eaed",
  muted: "#8a93a6",
  green: "#22c55e",
  greenSoft: "#123021",
  greenBorder: "#2f7d55",
  red: "#ef4444",
  redSoft: "#301416",
  amber: "#eab308",
  chipBg: "#1c2430",
};

const money = (v) =>
  v == null
    ? "—"
    : `${Number(v) < 0 ? "-" : ""}$${Math.abs(Number(v)).toFixed(2)}`;
const cents = (v) => (v == null ? "—" : `${Math.round(Number(v) * 100)}¢`);
/* AAA prints carry four decimals ($4.0997) and the strikes are half-cent, so
 * the fourth decimal is load-bearing — never toFixed(2) a price here. */
const price4 = (v) => (v == null ? "—" : `$${Number(v).toFixed(4)}`);
const delta = (cur, prev) => {
  if (cur == null || prev == null) return null;
  return Number(cur) - Number(prev);
};
const deltaTxt = (d) =>
  d == null ? "" : `${d >= 0 ? "+" : "−"}${Math.abs(d * 100).toFixed(2)}¢`;
const clockTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, "0")}${h < 12 ? "a" : "p"}`;
};
const chip = (bg, color) => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  background: bg,
  color,
});
const navLink = {
  fontSize: 12,
  fontWeight: 700,
  color: C.text,
  background: C.chipBg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "5px 12px",
  textDecoration: "none",
  whiteSpace: "nowrap",
};
const th = {
  textAlign: "left",
  padding: "4px 8px",
  fontSize: 11,
  color: C.muted,
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const td = {
  padding: "5px 8px",
  fontSize: 12.5,
  color: C.text,
  whiteSpace: "nowrap",
};

export default function GasValue() {
  const [status, setStatus] = useState(null);
  const [paper, setPaper] = useState([]);
  const [bets, setBets] = useState([]);
  const [showPaper, setShowPaper] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const [s, p, b] = await Promise.all([
        fetch(`${API_BASE}/auto-bets/status`).then((r) => r.json()),
        fetch(`${API_BASE}/paper-bets`).then((r) => r.json()),
        fetch(`${API_BASE}/auto-bets`).then((r) => r.json()),
      ]);
      setStatus(s);
      setPaper(p.bets || []);
      setBets(b.bets || []);
      setErr("");
    } catch (e) {
      setErr(e.message || "load failed");
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
    // Slower than the betting pages on purpose: the underlying number changes
    // once a DAY, and the scan runs every 15 minutes.
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  // Same helper as the other engine pages — PIN cached in localStorage,
  // verified server-side, one re-prompt on 401. Only EngineTuning posts here.
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
    if (!window.confirm("Kill the gas engine? (paper scanning continues)"))
      return;
    if (await postWithPin("/auto-bets/kill")) load();
  };
  const enable = async () => {
    if (await postWithPin("/auto-bets/enable")) load();
  };

  const pill = () => {
    if (!status) return null;
    if (status.killed)
      return <span style={chip(C.redSoft, C.red)}>KILLED</span>;
    if (status.enabled)
      return <span style={chip(C.greenSoft, C.green)}>LIVE</span>;
    return <span style={chip("#332a12", C.amber)}>PAPER</span>;
  };

  const lastScan = status && status.last_scan;
  const cfg = status && status.config;
  const live = status && status.live_ledger;
  const pp = status && status.paper;
  const byRegion = (status && status.paper_by_region) || [];
  const byLead = (status && status.paper_by_lead) || [];
  const prints = (status && status.prints) || [];
  const regionLabel = Object.fromEntries(
    ((status && status.regions) || []).map((r) => [r.key, r.label]),
  );

  const betRow = (b, isPaper) => {
    // WON when the market's outcome equals the side held; a real row the
    // cash-out monitor sold carries the literal 'cashed_out' instead.
    const res = b.result
      ? b.result === b.side
        ? { color: C.green, label: "WON" }
        : b.result === "cashed_out"
          ? { color: C.amber, label: "SOLD" }
          : { color: C.red, label: "LOST" }
      : null;
    const price = isPaper ? b.price : (b.fill_price ?? b.intended_price);
    const pnl = isPaper ? b.pnl : b.pnl_dollars;
    const stake = isPaper
      ? b.stake
      : b.status === "unfilled"
        ? null
        : (b.filled_contracts ?? 0) * (b.fill_price ?? 0);
    return (
      <tr
        key={`${isPaper ? "p" : "r"}${b.id}`}
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <td style={td}>{clockTime(b.created_at)}</td>
        <td style={td}>{(regionLabel[b.region] || b.region).toUpperCase()}</td>
        <td style={{ ...td, whiteSpace: "normal" }}>
          {b.market_ticker}{" "}
          <span style={{ color: C.muted }}>({b.bracket})</span>
        </td>
        <td style={td}>{String(b.side || "").toUpperCase()}</td>
        <td style={td}>{cents(price)}</td>
        <td style={td}>{stake != null ? money(stake) : "—"}</td>
        <td style={td}>
          {b.p_model != null ? `${Math.round(b.p_model * 100)}%` : "—"}
        </td>
        <td style={td}>
          {b.edge != null ? `+${Math.round(b.edge * 100)}¢` : "—"}
        </td>
        <td style={td}>{b.lead_days != null ? `${b.lead_days}d` : "—"}</td>
        <td style={{ ...td, color: res ? res.color : C.muted }}>
          {res
            ? res.label
            : isPaper
              ? "OPEN"
              : (b.status || "").toUpperCase()}
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

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        padding: 16,
      }}
    >
      {/* Same shell as the other engine pages: content + a sticky right-hand
          rail of THIS page's open positions on desktop. */}
      <div className="bv-shell" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="bv-main">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20 }}>⛽ Gas Value</h1>
          {pill()}
          {err && <span style={{ fontSize: 11, color: C.red }}>{err}</span>}
          <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <a href="/weather-value" style={navLink}>
              🌡 weather →
            </a>
            <a href="/totals-value" style={navLink}>
              📈 sports →
            </a>
            <a href="/crypto-value" style={navLink}>
              🪙 crypto →
            </a>
            <a href="/my-bets" style={navLink}>
              🎯 my bets →
            </a>
          </span>
        </div>

        <EngineBlockedBanner blocked={status && status.blocked} engine="Gas" />

        {/* Header strip: sizing + the live AAA reads that are the model's
            whole input. Delta chips are vs YESTERDAY's print — the exact
            quantity tomorrow's market is a bet on. */}
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 15 }}>🤖 Auto-Bet</span>
            {cfg && (
              <span style={{ color: C.muted, fontSize: 12, flex: 1 }}>
                ${cfg.unit_dollars}/u +1u per 3¢ edge · ${cfg.max_bet_dollars}{" "}
                max/bet · ${cfg.max_daily_dollars}/day loss cap · $
                {cfg.max_event_dollars}/region-day · needs{" "}
                {Math.round(cfg.min_edge * 100)}¢+ edge · scan{" "}
                {clockTime(lastScan && lastScan.at)}
              </span>
            )}
            {status && status.killed ? (
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
            )}
          </div>
          {lastScan && lastScan.regions && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {Object.entries(lastScan.regions).map(([k, v]) => {
                const d = delta(v.current, v.yesterday);
                return (
                  <span
                    key={k}
                    style={{
                      ...chip(C.chipBg, v.error ? C.red : C.text),
                      fontWeight: 600,
                    }}
                  >
                    {k.toUpperCase()}{" "}
                    {v.error ? (
                      "ERR"
                    ) : (
                      <>
                        {v.current != null ? price4(v.current) : "—"}
                        {d != null && (
                          <span
                            style={{ color: d > 0 ? C.green : d < 0 ? C.red : C.muted }}
                          >
                            {" "}
                            {deltaTxt(d)}
                          </span>
                        )}
                      </>
                    )}
                    {v && v.new_paper_bets ? (
                      <span style={{ color: C.amber }}> +{v.new_paper_bets}</span>
                    ) : null}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* The two ledgers, numbers first. Wins, losses and sold-early are
            three separate counts (the cash-out monitor sells winners before
            they settle, stamping the literal 'cashed_out') — blending them
            printed "0 wins" over green days on both other engines. */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              flex: "1 1 240px",
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>
              REAL
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color:
                  live && Number(live.pnl) > 0
                    ? C.green
                    : live && Number(live.pnl) < 0
                      ? C.red
                      : C.text,
              }}
            >
              {money(live && live.pnl)}
            </div>
            <div style={{ color: C.muted, fontSize: 12 }}>
              {live
                ? `${live.open_positions || 0} open · ${money(live.staked)} staked · ` +
                  `${live.won || 0}-${live.lost || 0}${Number(live.cashed) ? ` · ${live.cashed} sold early` : ""}`
                : "—"}
            </div>
          </div>
          <div
            style={{
              flex: "1 1 240px",
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>
              PAPER (the model's judge)
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color:
                  pp && Number(pp.pnl) > 0
                    ? C.green
                    : pp && Number(pp.pnl) < 0
                      ? C.red
                      : C.text,
              }}
            >
              {money(pp && pp.pnl)}
            </div>
            <div style={{ color: C.muted, fontSize: 12 }}>
              {pp
                ? `${pp.settled || 0}/${pp.n || 0} settled · ${pp.won || 0} won`
                : "—"}
            </div>
          </div>
          {/* Latest AAA prints — the settlement series itself. */}
          <div
            style={{
              flex: "2 1 340px",
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div
              style={{
                color: C.muted,
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              LATEST AAA PRINTS
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {["Region", "Today", "Δ day", "Δ week"].map((h) => (
                      <th key={h} style={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prints.map((p) => {
                    const d1 = delta(p.price, p.yesterday);
                    const dw = delta(p.price, p.week_ago);
                    return (
                      <tr
                        key={p.region}
                        style={{ borderTop: `1px solid ${C.border}` }}
                      >
                        <td style={td}>{regionLabel[p.region] || p.region}</td>
                        <td style={td}>{price4(p.price)}</td>
                        {[d1, dw].map((d, i) => (
                          <td
                            key={i}
                            style={{
                              ...td,
                              color: d > 0 ? C.green : d < 0 ? C.red : C.muted,
                            }}
                          >
                            {deltaTxt(d) || "—"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Per-region and per-lead records — the two cuts that decide whether
            any edge is real: does it survive at lead 1, and is it one region's
            fluke or the whole book's. */}
        {(byRegion.length > 0 || byLead.length > 0) && (
          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
            }}
          >
            {[
              ["BY REGION", byRegion, (r) => regionLabel[r.region] || r.region],
              ["BY LEAD (days ahead of the print)", byLead, (r) => `${r.lead_days}d`],
            ].map(([heading, rows, name]) =>
              rows.length ? (
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
                  {rows.map((r) => (
                    <div
                      key={name(r)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        fontSize: 13,
                        padding: "3px 0",
                      }}
                    >
                      <span style={{ color: C.text }}>{name(r)}</span>
                      <span style={{ color: C.muted, textAlign: "right" }}>
                        {r.settled || 0}/{r.n || 0} settled · {r.won || 0} won ·{" "}
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
                      </span>
                    </div>
                  ))}
                </div>
              ) : null,
            )}
          </div>
        )}

        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 14 }}>
              {showPaper ? "📝 Paper ledger" : "💵 Real ledger"}
            </span>
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
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {[
                    "Time",
                    "Region",
                    "Market",
                    "Side",
                    "Price",
                    "Stake",
                    "Model",
                    "Edge",
                    "Lead",
                    "Status",
                    "P&L",
                  ].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(showPaper ? paper : bets).map((b) => betRow(b, showPaper))}
              </tbody>
            </table>
            {!(showPaper ? paper : bets).length && (
              <div style={{ color: C.muted, fontSize: 13, padding: 8 }}>
                Nothing yet.
              </div>
            )}
          </div>
        </div>

        <EngineTuning
          apiBase={API_BASE}
          post={postWithPin}
          busy={busy}
          C={C}
          storageKey="bv_tuning_open_gas"
        />
        </div>
        <OpenBetsRail domain="gas" />
      </div>
    </div>
  );
}
