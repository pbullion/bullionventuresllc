import { useEffect, useState } from "react";
import EngineBlockedBanner from "../../components/EngineBlockedBanner.jsx";
import EngineTuning from "../../components/EngineTuning.jsx";
import OpenBetsRail from "../../components/OpenBetsRail";

/* Weather Value — live view of the Kalshi weather engine (backend:
 * sheline-art-website-api routes/kalshiWeather.js). Daily city-high markets,
 * seven cities. TWO ledgers on purpose: the real one (live since 2026-08-19,
 * $3 units / $10 max, Patrick's call) and the shadow paper ledger, which keeps
 * writing in live mode because it is the model's judge — the page shows them
 * side by side so "the model is right" and "the account is up" stay two
 * different questions. */
const API_BASE = "https://sheline-art-website-api.herokuapp.com/kalshi-weather";

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

  // Same helper as the other two pages — PIN cached in localStorage, verified
  // server-side, one re-prompt on 401.
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

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        padding: 16,
      }}
    >
      {/* Same shell as /totals-value and /crypto-value: content + a sticky
          right-hand rail of THIS page's open positions on desktop. */}
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
            <h1 style={{ margin: 0, fontSize: 20 }}>🌡 Weather Value</h1>
            {pill()}
            {err && <span style={{ fontSize: 11, color: C.red }}>{err}</span>}
            <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
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

          <EngineBlockedBanner
            blocked={status && status.blocked}
            engine="Weather"
          />

          {/* Header strip: sizing + per-city running max, the model's live input. */}
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
                  {cfg.max_event_dollars}/city-day · needs{" "}
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
            {lastScan && lastScan.cities && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
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
                        ? `${Math.round(v.obs_max)}°`
                        : "—"}
                    {v && v.new_paper_bets ? (
                      <span style={{ color: C.amber }}>
                        {" "}
                        +{v.new_paper_bets}
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* The two ledgers, numbers first. */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            {[
              [
                "REAL",
                live &&
                  `${live.filled || 0} filled · ${money(live.staked)} staked`,
                live && live.pnl,
              ],
              [
                "PAPER (the model's judge)",
                pp &&
                  `${pp.settled || 0}/${pp.n || 0} settled · ${pp.won || 0} won`,
                pp && pp.pnl,
              ],
            ].map(([label, sub, pnl]) => (
              <div
                key={label}
                style={{
                  flex: "1 1 240px",
                  background: C.panel,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: pnl > 0 ? C.green : pnl < 0 ? C.red : C.text,
                  }}
                >
                  {money(pnl)}
                </div>
                <div style={{ color: C.muted, fontSize: 12 }}>{sub || "—"}</div>
              </div>
            ))}
          </div>

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
            {showPaper ? table(paper, true) : table(bets, false)}
          </div>

          <EngineTuning
            apiBase={API_BASE}
            post={postWithPin}
            busy={busy}
            C={C}
            storageKey="bv_tuning_open_weather"
          />
        </div>
        <OpenBetsRail domain="weather" />
      </div>
    </div>
  );
}
