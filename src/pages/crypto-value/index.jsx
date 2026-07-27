import { useEffect, useRef, useState } from "react";

/* Crypto Value — live view of the Kalshi crypto engine (backend:
 * sheline-art-website-api routes/kalshiCrypto.js, spec in
 * docs/crypto-engine-spec.md). Read that spec before reshaping anything —
 * the data model (snapshots, combo quotes, calibration cells, gate stack)
 * is documented there, not re-derived here. */
const API_BASE = "https://sheline-art-website-api.herokuapp.com/kalshi-crypto";

/* ─── Dark palette (matches totals-value / my-bets) ─── */
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
  rowAlt: "#1a2029",
};

const cents = (d) => (d == null ? "—" : `${Math.round(Number(d) * 100)}¢`);
const pct = (p) => (p == null ? "—" : `${Math.round(Number(p) * 100)}%`);
const edgeCents = (e) => {
  if (e == null) return "—";
  const v = Math.round(Number(e) * 100);
  return `${v >= 0 ? "+" : ""}${v}¢`;
};
const money = (v) =>
  v == null
    ? "—"
    : `${Number(v) < 0 ? "-" : ""}$${Math.abs(Number(v)).toFixed(2)}`;
const fmtPrice = (asset, v) => {
  if (v == null) return "—";
  const n = Number(v);
  const digits = n >= 1000 ? 2 : n >= 10 ? 2 : 4;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
};
const countdown = (secs) => {
  if (secs == null || secs < 0) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};
const timeAgo = (iso) => {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  return s < 60 ? `${Math.round(s)}s ago` : `${Math.round(s / 60)}m ago`;
};

const panelStyle = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 14,
  marginBottom: 14,
};
const h2Style = {
  margin: "0 0 10px",
  fontSize: 15,
  fontWeight: 700,
  color: C.text,
  display: "flex",
  alignItems: "center",
  gap: 8,
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

/* Collapsible panel. Open/closed is remembered per id in localStorage, because
 * the page repolls every 30s and a panel you collapsed should stay collapsed
 * across reloads too. `right` renders controls in the header row (Kill, CAP) —
 * they're siblings of the toggle button, so clicking them can't collapse the
 * panel they live in. */
const panelKey = (id) => `bv_crypto_panel_${id}`;
function Panel({ id, title, right, defaultOpen = true, children }) {
  const [open, setOpen] = useState(() => {
    try {
      const v = window.localStorage.getItem(panelKey(id));
      return v == null ? defaultOpen : v === "1";
    } catch {
      return defaultOpen; // private mode / storage disabled
    }
  });
  const toggle = () =>
    setOpen((v) => {
      try {
        window.localStorage.setItem(panelKey(id), v ? "0" : "1");
      } catch {
        /* not persisted — collapsing still works for this session */
      }
      return !v;
    });
  return (
    <div style={panelStyle}>
      <div style={{ ...h2Style, marginBottom: open ? 10 : 0 }}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          style={{
            background: "transparent",
            border: "none",
            color: C.text,
            font: "inherit",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            textAlign: "left",
          }}
        >
          <span style={{ color: C.muted, fontSize: 11 }}>
            {open ? "▾" : "▸"}
          </span>
          {title}
        </button>
        {right != null && (
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {right}
          </span>
        )}
      </div>
      {open && children}
    </div>
  );
}

export default function CryptoValue() {
  const [scan, setScan] = useState(null);
  const [status, setStatus] = useState(null);
  const [bets, setBets] = useState([]);
  const [activity, setActivity] = useState([]);
  const [combos, setCombos] = useState([]);
  const [perf, setPerf] = useState(null);
  const [showActivity, setShowActivity] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const timerRef = useRef(null);

  const loadAll = async () => {
    try {
      const [s, st, b, a, c] = await Promise.all([
        fetch(`${API_BASE}/scan`).then((r) => r.json()),
        fetch(`${API_BASE}/auto-bets/status`).then((r) => r.json()),
        fetch(`${API_BASE}/auto-bets`).then((r) => r.json()),
        fetch(`${API_BASE}/auto-bets/activity?limit=40`).then((r) => r.json()),
        fetch(`${API_BASE}/combo-quotes?limit=20`).then((r) => r.json()),
      ]);
      setScan(s);
      setStatus(st);
      setBets(b.bets || []);
      setActivity(a.activity || []);
      setCombos(c.quotes || []);
      setErr(null);
    } catch {
      setErr("backend unreachable");
    }
  };
  const loadPerf = async () => {
    try {
      const p = await fetch(`${API_BASE}/performance`).then((r) => r.json());
      setPerf(p);
    } catch {
      /* panel shows stale data */
    }
  };

  useEffect(() => {
    // Async wrapper keeps the fetches off the effect's synchronous path — no
    // state is written until responses land (same pattern as totals-value).
    (async () => {
      await loadAll();
      await loadPerf();
    })();
    // 15s poll — same order as my-bets; every tab multiplies Kalshi load.
    timerRef.current = setInterval(loadAll, 15 * 1000);
    const perfTimer = setInterval(loadPerf, 60 * 1000);
    return () => {
      clearInterval(timerRef.current);
      clearInterval(perfTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Kill is one click; enable prompts for the PIN — the control asymmetry
   * mirrors the backend (and totals-value). Never invert it. */
  const kill = async () => {
    if (!window.confirm("Kill crypto auto-betting?")) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE}/auto-bets/kill`, { method: "POST" });
      await loadAll();
    } finally {
      setBusy(false);
    }
  };
  const enable = async () => {
    if (
      !window.confirm(
        "Re-enable crypto auto-betting? (Only takes effect if the server master switch is armed.)"
      )
    ) {
      return;
    }
    let pin = window.localStorage.getItem("bv_autobet_pin") || "";
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!pin) {
        pin = window.prompt("Auto-bet PIN:") || "";
        if (!pin) return;
      }
      setBusy(true);
      try {
        const r = await fetch(`${API_BASE}/auto-bets/enable`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        if (r.status === 401) {
          window.localStorage.removeItem("bv_autobet_pin");
          pin = "";
          setBusy(false);
          continue;
        }
        if (r.ok) window.localStorage.setItem("bv_autobet_pin", pin);
        await loadAll();
        return;
      } catch {
        window.alert("request failed");
        return;
      } finally {
        setBusy(false);
      }
    }
  };

  // Loosening the daily cap is PIN-gated, same asymmetry as kill/enable and
  // the same flow as /totals-value. Server clamps to CRYPTOBET_DAILY_CEILING.
  const changeCap = async () => {
    const cur =
      status && status.today && status.today.daily_cap != null
        ? `$${Math.round(status.today.daily_cap)}`
        : "";
    const ceiling =
      status && status.config ? status.config.daily_ceiling : null;
    const raw = window.prompt(
      `New daily cap in dollars (currently ${cur}${
        ceiling ? `, ceiling $${ceiling}` : ""
      }).\nLeave blank to reset to the default.`
    );
    if (raw === null) return;
    const asked = raw.trim() === "" ? null : Number(raw);
    if (asked != null && !Number.isFinite(asked)) {
      window.alert("Not a number.");
      return;
    }
    let pin = window.localStorage.getItem("bv_autobet_pin") || "";
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!pin) {
        pin = window.prompt("Auto-bet PIN:") || "";
        if (!pin) return;
      }
      setBusy(true);
      try {
        const r = await fetch(`${API_BASE}/auto-bets/daily-cap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cap: asked, pin }),
        });
        if (r.status === 401) {
          window.localStorage.removeItem("bv_autobet_pin");
          pin = "";
          setBusy(false);
          continue; // wrong pin — ask once more
        }
        if (r.ok) {
          window.localStorage.setItem("bv_autobet_pin", pin);
          const next = await r.json();
          // Say so when the server clamped, rather than silently saving a
          // smaller number than the one that was typed.
          if (
            asked != null &&
            next.daily_cap_override != null &&
            asked > next.daily_cap_override
          ) {
            window.alert(
              `Saved at $${Math.round(next.daily_cap_override)} — that's the ` +
                `hard ceiling. Raising it takes a server config change ` +
                `(CRYPTOBET_DAILY_CEILING).`
            );
          }
          await loadAll();
        } else {
          const e = await r.json().catch(() => ({}));
          window.alert(e.error || `HTTP ${r.status}`);
        }
      } catch {
        /* next poll refreshes */
      }
      setBusy(false);
      return;
    }
    window.alert("Wrong PIN.");
  };

  const pill = () => {
    if (!status) return null;
    if (status.enabled) {
      return <span style={chip(C.greenSoft, C.green)}>LIVE</span>;
    }
    if (status.killed) {
      return <span style={chip(C.redSoft, C.red)}>KILLED</span>;
    }
    if (status.paper) {
      return <span style={chip("#332a12", C.amber)}>PAPER</span>;
    }
    return <span style={chip(C.chipBg, C.muted)}>OFF</span>;
  };

  const assets = scan ? Object.entries(scan.assets || {}) : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "16px 12px 40px",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          🪙 Crypto Value
        </h1>
        {pill()}
        <span style={{ fontSize: 11, color: C.muted }}>
          {scan ? `scan ${timeAgo(scan.generated_at)}` : "loading…"}
        </span>
        {err && <span style={{ fontSize: 11, color: C.red }}>{err}</span>}
        <a
          href="/totals-value"
          style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}
        >
          sports →
        </a>
      </div>

      {/* ── Auto-bet panel ── */}
      <Panel
        id="autobet"
        title={
          <>
            🤖 Auto-Bet
            {pill()}
            {status && status.combos_enabled && (
              <span style={chip(C.chipBg, C.amber)}>COMBOS ARMED</span>
            )}
          </>
        }
        right={
          <>
            <button
              onClick={changeCap}
              disabled={busy}
              style={{
                background: C.chipBg,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                opacity: busy ? 0.5 : 1,
              }}
            >
              CAP $
              {status && status.today && status.today.daily_cap != null
                ? Math.round(status.today.daily_cap)
                : "—"}{" "}
              ✎
            </button>
            {status && status.enabled === false && status.killed ? (
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
          </>
        }
      >
        {status && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            ${status.config.unit_dollars}/u · calib-edge-scaled ≤
            {status.config.max_units}u · ${status.today.daily_cap}/day · raw ≥
            {cents(status.config.min_edge)} · calib ≥
            {cents(status.config.min_calib_edge)} · spread ≤
            {cents(status.config.max_spread)} · $
            {status.config.max_window_dollars}/window ·{" "}
            {status.config.assets.join("+").toUpperCase()} ·{" "}
            {status.config.horizons.join("+")}
            <span style={{ marginLeft: 8 }}>
              staked today <b style={{ color: C.text }}>
                ${status.today.staked.toFixed(0)}
              </b>{" "}
              / ${status.today.daily_cap}
            </span>
            {status.calibration_cells_live &&
              status.calibration_cells_live.length > 0 && (
                <span style={{ marginLeft: 8, color: C.green }}>
                  {status.calibration_cells_live.length} trusted cell
                  {status.calibration_cells_live.length > 1 ? "s" : ""}
                </span>
              )}
            {status.calibration_cells_live &&
              status.calibration_cells_live.length === 0 && (
                <span style={{ marginLeft: 8, color: C.amber }}>
                  0 trusted cells — engine stakes nothing until calibration
                  earns trust
                </span>
              )}
          </div>
        )}
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>Pick</th>
                <th style={th}>Stake</th>
                <th style={th}>Price</th>
                <th style={th}>Edge (calib)</th>
                <th style={th}>Status</th>
                <th style={th}>P&L</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((b, i) => (
                <tr
                  key={b.id}
                  style={{ background: i % 2 ? C.rowAlt : "transparent" }}
                >
                  <td style={td}>{b.pick_label}</td>
                  <td style={td}>{money(b.stake_dollars)}</td>
                  <td style={td}>{cents(b.fill_price || b.limit_price)}</td>
                  <td style={td}>
                    {edgeCents(b.edge)} ({edgeCents(b.calib_edge)})
                  </td>
                  <td
                    style={{
                      ...td,
                      color:
                        b.result === "won"
                          ? C.green
                          : b.result === "lost"
                            ? C.red
                            : C.muted,
                    }}
                  >
                    {b.result || b.status}
                  </td>
                  <td
                    style={{
                      ...td,
                      color:
                        b.pnl_dollars > 0
                          ? C.green
                          : b.pnl_dollars < 0
                            ? C.red
                            : C.muted,
                    }}
                  >
                    {b.pnl_dollars != null ? money(b.pnl_dollars) : "—"}
                  </td>
                </tr>
              ))}
              {!bets.length && (
                <tr>
                  <td style={{ ...td, color: C.muted }} colSpan={6}>
                    No bets today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => setShowActivity((v) => !v)}
          style={{
            marginTop: 8,
            background: "transparent",
            border: "none",
            color: C.muted,
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {showActivity ? "▾ hide" : "▸ show"} activity feed
        </button>
        {showActivity && (
          <div style={{ marginTop: 6, maxHeight: 260, overflowY: "auto" }}>
            {activity.map((a) => (
              <div
                key={a.id}
                style={{
                  fontSize: 11.5,
                  padding: "3px 0",
                  color:
                    a.decision === "placed"
                      ? C.green
                      : a.decision === "would-place"
                        ? C.amber
                        : C.muted,
                }}
              >
                {timeAgo(a.ran_at)} · {a.pick_label || a.market_ticker} ·{" "}
                {a.decision}
                {a.skip_reason ? `: ${a.skip_reason}` : ""}
                {a.edge != null ? ` · edge ${edgeCents(a.edge)}` : ""}
              </div>
            ))}
            {!activity.length && (
              <div style={{ fontSize: 12, color: C.muted }}>
                Nothing evaluated yet.
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* ── Feed health strip ── */}
      <Panel id="feeds" title="Feeds">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {assets.map(([key, a]) => (
            <div
              key={key}
              style={{
                background: C.chipBg,
                border: `1px solid ${a.feed_ok ? C.border : C.red}`,
                borderRadius: 8,
                padding: "6px 10px",
                minWidth: 118,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                {key.toUpperCase()}{" "}
                <span style={{ color: a.feed_ok ? C.green : C.red }}>
                  {a.feed_ok ? "●" : "○"}
                </span>
                {a.vol_warmup && (
                  <span style={{ fontSize: 10, color: C.amber }}> warmup</span>
                )}
              </div>
              <div style={{ fontSize: 12.5 }}>{fmtPrice(key, a.spot)}</div>
              <div style={{ fontSize: 10, color: C.muted }}>
                σ1s {a.sigma_1s ? (a.sigma_1s * 1e4).toFixed(2) + "bp" : "—"} ·
                basis {a.basis != null ? Number(a.basis).toFixed(2) : "—"}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Windows: model vs market per asset ── */}
      <Panel id="windows" title="Live windows — model vs market">
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>Market</th>
                <th style={th}>Target</th>
                <th style={th}>Spot</th>
                <th style={th}>Left</th>
                <th style={th}>Model</th>
                <th style={th}>Bid/Ask</th>
                <th style={th}>Best edge</th>
              </tr>
            </thead>
            <tbody>
              {assets.flatMap(([key, a], ai) =>
                (a.windows || [])
                  .filter((w) => w.horizon === "15m" || (w.best && w.best.edge > 0))
                  .slice(0, 6)
                  .map((w, i) => (
                    <tr
                      key={w.market_ticker}
                      style={{
                        background: (ai + i) % 2 ? C.rowAlt : "transparent",
                      }}
                    >
                      <td style={td}>
                        <b>{key.toUpperCase()}</b>{" "}
                        <span style={{ color: C.muted, fontSize: 11 }}>
                          {w.horizon}
                          {w.in_final_min ? " · FINAL MIN" : ""}
                        </span>
                      </td>
                      <td style={td}>{fmtPrice(key, w.target)}</td>
                      <td style={td}>{fmtPrice(key, a.spot)}</td>
                      <td style={td}>{countdown(w.tau_secs)}</td>
                      <td style={td}>{pct(w.model_p)}</td>
                      <td style={td}>
                        {cents(w.yes_bid)}/{cents(w.yes_ask)}
                      </td>
                      <td
                        style={{
                          ...td,
                          color:
                            w.best && w.best.edge >= 0.03 ? C.green : C.muted,
                          fontWeight: w.best && w.best.edge >= 0.03 ? 700 : 400,
                        }}
                      >
                        {w.best
                          ? `${w.best.side === "yes" ? "UP" : "DOWN"} ${edgeCents(w.best.edge)}`
                          : "—"}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
        {scan && scan.candidates && scan.candidates.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.amber }}>
            ⚡ {scan.candidates.length} candidate
            {scan.candidates.length > 1 ? "s" : ""} above the raw-edge floor
            right now
          </div>
        )}
      </Panel>

      {/* ── Combo correlation discount (edge hypothesis #1, visible day one) ── */}
      <Panel
        id="combos"
        title={
          <>
            Combos — correlation discount
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>
              quote vs independence (Π legs) vs copula
            </span>
          </>
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>When</th>
                <th style={th}>Pattern</th>
                <th style={th}>Legs</th>
                <th style={th}>Π market</th>
                <th style={th}>Copula</th>
                <th style={th}>Kalshi quote</th>
                <th style={th}>Gap</th>
                <th style={th}>Result</th>
              </tr>
            </thead>
            <tbody>
              {combos.map((q, i) => {
                const mid =
                  q.combo_yes_bid != null && q.combo_yes_ask != null
                    ? (Number(q.combo_yes_bid) + Number(q.combo_yes_ask)) / 2
                    : null;
                const gap = mid != null ? Number(q.joint_model_p) - mid : null;
                const legs = Array.isArray(q.legs) ? q.legs : [];
                return (
                  <tr
                    key={q.created_at + q.pattern}
                    style={{ background: i % 2 ? C.rowAlt : "transparent" }}
                  >
                    <td style={{ ...td, color: C.muted }}>
                      {timeAgo(q.created_at)}
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>{q.pattern}</td>
                    <td style={{ ...td, fontSize: 11 }}>
                      {legs.map((l) => l.asset.toUpperCase()).join("+")}
                    </td>
                    <td style={td}>{cents(q.product_market)}</td>
                    <td style={td}>{cents(q.joint_model_p)}</td>
                    <td style={td}>
                      {mid != null
                        ? `${cents(q.combo_yes_bid)}/${cents(q.combo_yes_ask)}`
                        : "no quote"}
                    </td>
                    <td
                      style={{
                        ...td,
                        color:
                          gap != null && gap > 0.02
                            ? C.green
                            : gap != null && gap < -0.02
                              ? C.red
                              : C.muted,
                        fontWeight: 700,
                      }}
                    >
                      {gap != null ? edgeCents(gap) : "—"}
                    </td>
                    <td style={td}>
                      {q.result === "yes"
                        ? "✅ hit"
                        : q.result === "no"
                          ? "❌ miss"
                          : "…"}
                    </td>
                  </tr>
                );
              })}
              {!combos.length && (
                <tr>
                  <td style={{ ...td, color: C.muted }} colSpan={8}>
                    No combo quotes logged yet — the quoter runs mid-window
                    (minute 2–13 of each 15-min window).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Performance / calibration ── */}
      <Panel
        id="performance"
        title="Model performance & calibration"
        defaultOpen={false}
      >
        {perf && (
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
              Brier, 7d (lower is better — the model must beat the PRICE, not
              a coin):
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={th}>Segment</th>
                    <th style={th}>n</th>
                    <th style={th}>Model</th>
                    <th style={th}>Market</th>
                    <th style={th}>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {(perf.brier_7d || []).map((r, i) => {
                    const better =
                      Number(r.brier_model) < Number(r.brier_market);
                    return (
                      <tr
                        key={`${r.asset}:${r.horizon}`}
                        style={{ background: i % 2 ? C.rowAlt : "transparent" }}
                      >
                        <td style={td}>
                          {r.asset.toUpperCase()} {r.horizon}
                        </td>
                        <td style={td}>{r.n}</td>
                        <td style={td}>{Number(r.brier_model).toFixed(4)}</td>
                        <td style={td}>{Number(r.brier_market).toFixed(4)}</td>
                        <td
                          style={{ ...td, color: better ? C.green : C.muted }}
                        >
                          {better ? "model ahead" : "market ahead"}
                        </td>
                      </tr>
                    );
                  })}
                  {!(perf.brier_7d || []).length && (
                    <tr>
                      <td style={{ ...td, color: C.muted }} colSpan={5}>
                        No settled snapshots yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div
              style={{
                fontSize: 12,
                color: C.muted,
                margin: "10px 0 4px",
              }}
            >
              Trusted calibration cells (w &gt; 0 — the only places the engine
              may stake):
            </div>
            <div style={{ fontSize: 12 }}>
              {Object.entries(
                (perf.calibration && perf.calibration.cells) || {}
              )
                .filter(([, c]) => c.w > 0)
                .map(([k, c]) => (
                  <span
                    key={k}
                    style={{ ...chip(C.greenSoft, C.green), margin: 3 }}
                  >
                    {k} w={c.w} n={c.n}
                  </span>
                ))}
              {!Object.values(
                (perf.calibration && perf.calibration.cells) || {}
              ).some((c) => c.w > 0) && (
                <span style={{ color: C.amber }}>
                  none yet — snapshots are accumulating; the fit refreshes
                  every 15 minutes
                </span>
              )}
            </div>
          </div>
        )}
      </Panel>

      <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center" }}>
        Settlement = 60s CF Benchmarks RTI TWAP · fees included in every edge ·
        paper mode logs would-place bets without ordering
      </div>
    </div>
  );
}
