import { useEffect, useState } from "react";
import EngineTuning from "../../components/EngineTuning.jsx";

/* Gas Value — view of the Kalshi GAS engine (backend: sheline-art-website-api
 * routes/kalshiGas.js). AAA average-gas-price ladders: the national daily, six
 * state dailies and the weekly, settling every morning on the price AAA
 * publishes at gasprices.aaa.com.
 *
 * PAPER-ONLY BY DESIGN (born 2026-08-27): there is no order path in the
 * backend and therefore no kill switch, no real ledger, and no cash-out story
 * on this page. The paper ledger is the whole product for now — it is what
 * earns (or refuses) a live order path, the discipline the weather engine
 * skipped. Everything here reads like /weather-value so the pages stay
 * side-by-side comparable. */
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const [s, p] = await Promise.all([
        fetch(`${API_BASE}/auto-bets/status`).then((r) => r.json()),
        fetch(`${API_BASE}/paper-bets`).then((r) => r.json()),
      ]);
      setStatus(s);
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

  const lastScan = status && status.last_scan;
  const cfg = status && status.config;
  const pp = status && status.paper;
  const byRegion = (status && status.paper_by_region) || [];
  const byLead = (status && status.paper_by_lead) || [];
  const prints = (status && status.prints) || [];
  const regionLabel = Object.fromEntries(
    ((status && status.regions) || []).map((r) => [r.key, r.label]),
  );

  const betRow = (b) => {
    // A paper bet WON when the market's outcome equals the side it took.
    const res = b.result
      ? b.result === b.side
        ? { color: C.green, label: "WON" }
        : { color: C.red, label: "LOST" }
      : null;
    return (
      <tr key={b.id} style={{ borderTop: `1px solid ${C.border}` }}>
        <td style={td}>{clockTime(b.created_at)}</td>
        <td style={td}>{(regionLabel[b.region] || b.region).toUpperCase()}</td>
        <td style={{ ...td, whiteSpace: "normal" }}>
          {b.market_ticker}{" "}
          <span style={{ color: C.muted }}>({b.bracket})</span>
        </td>
        <td style={td}>{String(b.side || "").toUpperCase()}</td>
        <td style={td}>{cents(b.price)}</td>
        <td style={td}>
          {b.p_model != null ? `${Math.round(b.p_model * 100)}%` : "—"}
        </td>
        <td style={td}>
          {b.edge != null ? `+${Math.round(b.edge * 100)}¢` : "—"}
        </td>
        <td style={td}>{b.lead_days != null ? `${b.lead_days}d` : "—"}</td>
        <td style={{ ...td, color: res ? res.color : C.muted }}>
          {res ? res.label : "OPEN"}
        </td>
        <td
          style={{
            ...td,
            color: b.pnl > 0 ? C.green : b.pnl < 0 ? C.red : C.muted,
          }}
        >
          {b.pnl != null ? money(b.pnl) : "—"}
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
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
          <span style={chip("#332a12", C.amber)}>PAPER</span>
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

        {/* Header strip: what the engine is doing + the live AAA reads that
            are its whole input. Delta chips are vs YESTERDAY's print — the
            exact quantity tomorrow's market is a bet on. */}
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
            <span style={{ fontWeight: 800, fontSize: 15 }}>
              🤖 Paper engine
            </span>
            {cfg && (
              <span style={{ color: C.muted, fontSize: 12, flex: 1 }}>
                ${cfg.paper_stake} paper stakes · needs{" "}
                {Math.round(cfg.min_edge * 100)}¢+ edge · ≤{cfg.max_lead_days}d
                lead · σ {(cfg.sigma_us * 100).toFixed(1)}¢ US /{" "}
                {(cfg.sigma_state * 100).toFixed(1)}¢ state · scan{" "}
                {clockTime(lastScan && lastScan.at)}
              </span>
            )}
            <span style={{ color: C.muted, fontSize: 11 }}>
              No real money — the ledger below is what earns an order path.
            </span>
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

        {/* The ledger, numbers first — this is the only scoreboard there is. */}
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
              PAPER (the only ledger)
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
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
            📝 Paper ledger
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
              <tbody>{paper.map((b) => betRow(b))}</tbody>
            </table>
            {!paper.length && (
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
    </div>
  );
}
