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
/* What the bet actually cost. An unfilled IOC holds no position and risks
   nothing, so it's $0 — not the intended stake. Mirrors the backend's
   CRYPTO_STAKE_SQL, which is what the daily cap already counts against. */
const actualStake = (b) => {
  if (b.status === "unfilled") return 0;
  if (b.filled_contracts != null && b.fill_price != null) {
    return Number(b.filled_contracts) * Number(b.fill_price);
  }
  return Number(b.stake_dollars) || 0;
};
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
/* Wall clock, browser-local, in the table's tight house style ("3:49p"). The
 * bet list covers a whole day, so "when did this fire" wants a real time —
 * timeAgo suits the combo quotes, which are all minutes old, not this. */
const clockTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h12}:${m}${h < 12 ? "a" : "p"}`;
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
/* Cross-link to a sibling betting screen. Kept identical to the counterpart
 * links on /totals-value and /my-bets — these three pages are one set, so the
 * button should read the same on all of them. */
const navLink = {
  marginLeft: "auto",
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

/* Responsive tables. These panels run 6–8 numeric columns, which no phone can
 * fit, and the `overflowX: auto` wrappers meant Status and P&L — the columns
 * you actually check — were always the ones parked off-screen. Under 640px
 * every <tr class="cv-table" row> becomes a card instead: the identifying cell
 * (`data-primary`) is the heading, and the rest become labelled pairs laid out
 * two-up, with the labels read off each <td>'s `data-label`. So the header row
 * is dropped rather than the data. Above 640px none of this applies and the
 * plain table is back untouched. Media queries can't live in the inline style
 * objects, hence the injected sheet. */
const CV_CSS = `
@media (max-width: 640px) {
  .cv-table thead { display: none; }
  .cv-table, .cv-table tbody, .cv-table tr, .cv-table td { display: block; }
  .cv-table tr {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 12px;
    /* Zebra striping is inline per row; the card border separates rows now, so
       flatten it to one fill (only !important beats the inline style). */
    background: ${C.chipBg} !important;
    border: 1px solid ${C.border};
    border-radius: 10px;
    padding: 8px 10px;
    margin-bottom: 8px;
  }
  .cv-table td {
    flex: 1 1 42%;
    min-width: 0;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    padding: 2px 0 !important;
    white-space: normal !important;
  }
  .cv-table td[data-label]::before {
    content: attr(data-label);
    color: ${C.muted};
    font-size: 10.5px;
    font-weight: 600;
    white-space: nowrap;
  }
  .cv-table td[data-primary] {
    flex: 1 1 100%;
    font-weight: 700;
    justify-content: flex-start;
    margin-bottom: 4px;
    /* Leads the card even when it isn't the first column (combos puts Pattern
       second, after When). */
    order: -1;
  }
  /* Empty-state rows are one spanning cell — keep them full width. */
  .cv-table td[colspan] { flex: 1 1 100%; }
}
`;

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
  const [showUnfilled, setShowUnfilled] = useState(false);
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

  /* Every auto-bet control is PIN-gated (kill, enable and cap) — Patrick's
   * call 2026-07-27, replacing the old open-kill asymmetry. The PIN is cached
   * in localStorage after the first success, so the emergency stop stays one
   * click on a browser that's been used before; only a fresh browser prompts.
   *
   * POSTs a PIN-gated control endpoint, retrying once with a fresh prompt on
   * 401. Returns the parsed body, or null if cancelled/failed. */
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
          continue; // wrong pin — ask once more
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
    window.alert("Wrong PIN.");
    return null;
  };

  const kill = async () => {
    if (!window.confirm("Kill crypto auto-betting?")) return;
    if (await postWithPin("/auto-bets/kill")) await loadAll();
  };
  const enable = async () => {
    if (
      !window.confirm(
        "Re-enable crypto auto-betting? (Only takes effect if the server master switch is armed.)"
      )
    ) {
      return;
    }
    if (await postWithPin("/auto-bets/enable")) await loadAll();
  };

  // Server clamps to CRYPTOBET_DAILY_CEILING.
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
    const next = await postWithPin("/auto-bets/daily-cap", { cap: asked });
    if (!next) return;
    // Say so when the server clamped, rather than silently saving a smaller
    // number than the one that was typed.
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
  };

  const unfilledCount = bets.filter((b) => b.status === "unfilled").length;
  const shownBets = showUnfilled
    ? bets
    : bets.filter((b) => b.status !== "unfilled");

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
        // App.jsx wraps every route in a column flex container, so this div is
        // a flex item — and a flex item's `min-width: auto` refuses to shrink
        // below min-content. The wide tables below made that ~600px, so on a
        // phone the whole PAGE scrolled sideways (header and Kill button off
        // screen) instead of each table scrolling inside its own
        // `overflowX: auto` wrapper. Pinning the width makes it shrink.
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <style>{CV_CSS}</style>
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
        <a href="/totals-value" style={navLink}>
          📈 sports →
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
            {status.config.max_units}u · ${status.today.daily_cap} max daily
            LOSS · raw ≥
            {cents(status.config.min_edge)} · calib ≥
            {cents(status.config.min_calib_edge)} · spread ≤
            {cents(status.config.max_spread)} · $
            {status.config.max_window_dollars}/window ·{" "}
            {status.config.assets.join("+").toUpperCase()} ·{" "}
            {status.config.horizons.join("+")}
            <span style={{ marginLeft: 8 }}>
              {/* The cap counts money LOST, not staked (2026-07-28). Gross
                  staked is kept alongside as context. 2dp because real days
                  have run under $3 and whole dollars turned $0.90 into "$1". */}
              lost today <b style={{ color: C.text }}>
                $
                {(status.today.lost != null
                  ? status.today.lost
                  : status.today.staked
                ).toFixed(2)}
              </b>{" "}
              / ${status.today.daily_cap}
              <span style={{ color: C.muted }}>
                {" "}
                · ${status.today.staked.toFixed(2)} staked
              </span>
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
          <table
            className="cv-table"
            style={{ borderCollapse: "collapse", width: "100%" }}
          >
            <thead>
              <tr>
                <th style={th}>Time</th>
                <th style={th}>Pick</th>
                <th style={th}>Stake</th>
                <th style={th}>Price</th>
                <th style={th}>Edge (calib)</th>
                <th style={th}>Status</th>
                <th style={th}>P&L</th>
              </tr>
            </thead>
            <tbody>
              {shownBets.map((b, i) => (
                <tr
                  key={b.id}
                  style={{ background: i % 2 ? C.rowAlt : "transparent" }}
                >
                  <td style={{ ...td, color: C.muted }} data-label="Time">
                    {clockTime(b.created_at)}
                  </td>
                  <td style={td} data-primary="">
                    {b.pick_label}
                  </td>
                  {/* Real money at risk, not the intended unit. IOC orders
                      partial-fill constantly (5 contracts asked, 1 filled is
                      typical), so stake_dollars overstated exposure — a $5 row
                      that actually cost $0.90 made the P&L column look far
                      worse than it was. Intent is kept underneath when the two
                      differ, so a chronically-missing fill is still visible. */}
                  <td style={td} data-label="Stake">
                    <span>
                      {money(actualStake(b))}
                      {Math.abs(actualStake(b) - Number(b.stake_dollars)) >
                        0.005 && (
                        <span style={{ color: C.muted, fontSize: 10.5 }}>
                          {" "}
                          of {money(b.stake_dollars)}
                        </span>
                      )}
                    </span>
                  </td>
                  <td style={td} data-label="Price">
                    {cents(b.fill_price || b.limit_price)}
                  </td>
                  <td style={td} data-label="Edge (calib)">
                    <span>
                      {edgeCents(b.edge)} ({edgeCents(b.calib_edge)})
                    </span>
                  </td>
                  <td
                    data-label="Status"
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
                    data-label="P&L"
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
              {!shownBets.length && (
                <tr>
                  <td style={{ ...td, color: C.muted }} colSpan={7}>
                    {bets.length
                      ? `No filled bets today (${unfilledCount} unfilled).`
                      : "No bets today."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Unfilled IOC orders hold no position and risk nothing, and they
            outnumber fills several to one — hidden by default. Still reachable,
            because a chronically-unfilled market IS a signal worth seeing. */}
        {unfilledCount > 0 && (
          <button
            onClick={() => setShowUnfilled((v) => !v)}
            style={{
              marginTop: 6,
              // Both toggles are zero-padding inline buttons, so without this
              // they read as one run-together string on a narrow screen.
              marginRight: 14,
              background: "transparent",
              border: "none",
              color: C.muted,
              fontSize: 11.5,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {showUnfilled ? "▾ hide" : "▸ show"} {unfilledCount} unfilled
          </button>
        )}
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
          <table
            className="cv-table"
            style={{ borderCollapse: "collapse", width: "100%" }}
          >
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
                      <td style={td} data-primary="">
                        <span>
                          <b>{key.toUpperCase()}</b>{" "}
                          <span style={{ color: C.muted, fontSize: 11 }}>
                            {w.horizon}
                            {w.in_final_min ? " · FINAL MIN" : ""}
                          </span>
                        </span>
                      </td>
                      <td style={td} data-label="Target">
                        {fmtPrice(key, w.target)}
                      </td>
                      <td style={td} data-label="Spot">
                        {fmtPrice(key, a.spot)}
                      </td>
                      <td style={td} data-label="Left">
                        {countdown(w.tau_secs)}
                      </td>
                      <td style={td} data-label="Model">
                        {pct(w.model_p)}
                      </td>
                      <td style={td} data-label="Bid/Ask">
                        <span>
                          {cents(w.yes_bid)}/{cents(w.yes_ask)}
                        </span>
                      </td>
                      <td
                        data-label="Best edge"
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
          <table
            className="cv-table"
            style={{ borderCollapse: "collapse", width: "100%" }}
          >
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
                    <td style={{ ...td, color: C.muted }} data-label="When">
                      {timeAgo(q.created_at)}
                    </td>
                    <td style={{ ...td, fontWeight: 700 }} data-primary="">
                      {q.pattern}
                    </td>
                    <td style={{ ...td, fontSize: 11 }} data-label="Legs">
                      {legs.map((l) => l.asset.toUpperCase()).join("+")}
                    </td>
                    <td style={td} data-label="Π market">
                      {cents(q.product_market)}
                    </td>
                    <td style={td} data-label="Copula">
                      {cents(q.joint_model_p)}
                    </td>
                    <td style={td} data-label="Kalshi quote">
                      {mid != null
                        ? `${cents(q.combo_yes_bid)}/${cents(q.combo_yes_ask)}`
                        : "no quote"}
                    </td>
                    <td
                      data-label="Gap"
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
                    <td style={td} data-label="Result">
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
              <table
                className="cv-table"
                style={{ borderCollapse: "collapse", width: "100%" }}
              >
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
                        <td style={td} data-primary="">
                          <span>
                            {r.asset.toUpperCase()} {r.horizon}
                          </span>
                        </td>
                        <td style={td} data-label="n">
                          {r.n}
                        </td>
                        <td style={td} data-label="Model">
                          {Number(r.brier_model).toFixed(4)}
                        </td>
                        <td style={td} data-label="Market">
                          {Number(r.brier_market).toFixed(4)}
                        </td>
                        <td
                          data-label="Verdict"
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
