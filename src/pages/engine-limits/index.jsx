import { useCallback, useEffect, useState } from "react";

/* Units & Caps — what every betting engine is allowed to stake, on one page.
 *
 * Backend: GET /kalshi-limits (routes/kalshiLimits.js). ONE call, and the page
 * renders it verbatim — the same arrangement as the "why isn't it betting"
 * card on /totals-value. Which knobs count as limits, what they are called,
 * what order they read in and what each one means all come from the server
 * (services/engineOverrides.js, LIMIT_RANK). Nothing here decides what a cap
 * is, which is the point: the iOS app renders the same payload, and a page
 * that picked its own rows would drift from the app the first time a knob was
 * added.
 *
 * WHAT THIS PAGE IS NOT. It is read-only. Every one of these values is edited
 * behind the PIN on the engine's own screen — /totals-value, /crypto-value,
 * /weather-value, /gas-value — and a page whose whole job is "show me all the
 * limits at once" is the wrong place to be one mis-tap from raising one. Each
 * card links to the screen that can change it.
 *
 * It is also not a spend tracker. These are the standing limits; today's
 * consumption lives on each engine's own screen next to that engine's ledger.
 */
const ROOT = "https://sheline-art-website-api.herokuapp.com";
const API_BASE = `${ROOT}/kalshi-limits`;

const C = {
  bg: "#0b0e14",
  panel: "#151a24",
  border: "#252c3a",
  text: "#e8eaed",
  muted: "#8a93a6",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#eab308",
  chipBg: "#1c2430",
};

/* The same accent-per-engine the Morning Review page uses, so a colour means
 * the same engine across the site. `href` is where a value can actually be
 * changed. */
const ENGINE_UI = {
  sports: { icon: "🏟", accent: "#38bdf8", href: "/totals-value" },
  crypto: { icon: "🪙", accent: "#a78bfa", href: "/crypto-value" },
  weather: { icon: "🌡", accent: "#f59e0b", href: "/weather-value" },
  gas: { icon: "⛽", accent: "#34d399", href: "/gas-value" },
};
const ui = (key) => ENGINE_UI[key] || { icon: "•", accent: C.muted, href: "/" };

/* Formatting follows the server's own `fmt`, which is the same field the
 * settings panels on the engine pages already read. A null value means the
 * limit is UNSET — on max_open_dollars that means "use the percentage", and
 * rendering it as $0 would say the opposite. */
const fmtValue = (v, fmt) => {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  switch (fmt) {
    case "money":
      return n >= 1000 || Number.isInteger(n)
        ? `$${n.toLocaleString("en-US")}`
        : `$${n.toFixed(2)}`;
    case "pct":
      return `${Math.round(n * 1000) / 10}%`;
    case "cents":
      return `${Math.round(n * 100)}¢`;
    case "int":
      return String(Math.round(n));
    default:
      return String(n);
  }
};

const MODE = {
  live: { label: "LIVE MONEY", color: C.green },
  paper: { label: "paper", color: C.muted },
  off: { label: "KILLED", color: C.red },
};

const card = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
};

const chip = (color) => ({
  background: C.chipBg,
  border: `1px solid ${color}`,
  color,
  borderRadius: 999,
  padding: "2px 9px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.3,
  whiteSpace: "nowrap",
});

/** The three numbers the page exists to answer, per engine. */
function Headline({ headline }) {
  const cells = [
    { k: "Unit", v: fmtValue(headline.unit, "money") },
    { k: "Max / bet", v: fmtValue(headline.max_bet, "money") },
    { k: "Daily cap", v: fmtValue(headline.daily_cap, "money") },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
        margin: "12px 0 14px",
      }}
    >
      {cells.map((c) => (
        <div
          key={c.k}
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "8px 10px",
          }}
        >
          <div style={{ fontSize: 10.5, color: C.muted, letterSpacing: 0.4 }}>
            {c.k.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.v}
          </div>
        </div>
      ))}
    </div>
  );
}

function LimitRow({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, padding: "9px 0" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          cursor: "pointer",
          minHeight: 26,
        }}
      >
        <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>
          {row.label}
          {row.overridden && (
            <span
              title="Set from the app or the website, not from the server config. It stands until cleared."
              style={{ ...chip(C.amber), marginLeft: 7, padding: "1px 7px" }}
            >
              override
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: row.value === null ? C.muted : C.text,
          }}
        >
          {fmtValue(row.value, row.fmt)}
        </span>
        <span style={{ color: C.muted, fontSize: 11, width: 10 }}>
          {open ? "−" : "+"}
        </span>
      </div>
      {open && (
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, paddingTop: 4 }}>
          {row.help}
          {row.ceiling !== null && (
            <div style={{ marginTop: 4 }}>
              Ceiling {fmtValue(row.ceiling, row.fmt)} — the most this can be
              raised to without a config change.
            </div>
          )}
          {row.env && (
            <div style={{ marginTop: 4, fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
              {row.env}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EngineLimits() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setErr(null);
    } catch {
      setErr("backend unreachable");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Refetch on focus rather than on a timer. These values change when Patrick
   * changes one — on another tab, on the phone, or from a morning-review
   * action — not on a clock, so a poll would be load without an answer. */
  useEffect(() => {
    // Wrapped rather than called straight, so the first fetch is queued off the
    // effect body instead of running inside the render pass.
    (async () => {
      await load();
    })();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const engines = (data && data.engines) || [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding:
          "max(14px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) calc(40px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
        maxWidth: 780,
        margin: "0 auto",
        WebkitTextSizeAdjust: "100%",
        overflowWrap: "anywhere",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>
          🧮 Units &amp; Caps
        </h1>
        {err && <span style={{ fontSize: 11, color: C.amber }}>{err}</span>}
        <button
          onClick={load}
          style={{
            marginLeft: "auto",
            background: C.chipBg,
            border: `1px solid ${C.border}`,
            color: C.muted,
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 12,
            minHeight: 32,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, margin: "6px 0 14px" }}>
        Every limit on all four engines, which all fund from the one Kalshi
        account. <strong style={{ color: C.text }}>Daily caps count net
        realized loss for the CT day, not stake</strong> — a day that finishes
        up never touches one. Read-only: tap an engine to change a value behind
        the PIN.
      </div>

      {loading && !data && (
        <div style={{ ...card, color: C.muted, fontSize: 13 }}>Loading…</div>
      )}
      {!loading && !err && engines.length === 0 && (
        <div style={{ ...card, color: C.muted, fontSize: 13 }}>
          The backend returned no engines.
        </div>
      )}

      {engines.map((e) => {
        const skin = ui(e.engine);
        /* An engine that failed to read comes back as {engine, error}. Say so
         * by name — three cards rendering cleanly would otherwise imply there
         * are three engines. */
        if (e.error) {
          return (
            <div
              key={e.engine}
              style={{ ...card, borderLeft: `3px solid ${C.amber}` }}
            >
              <div style={{ fontSize: 15, fontWeight: 800 }}>
                <span aria-hidden>{skin.icon}</span> {e.engine}
              </div>
              <div style={{ fontSize: 12.5, color: C.amber, marginTop: 6 }}>
                Could not read this engine’s limits: {e.error}
              </div>
            </div>
          );
        }
        const mode = MODE[e.mode] || MODE.paper;
        return (
          <div
            key={e.engine}
            style={{ ...card, borderLeft: `3px solid ${skin.accent}` }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>
                <span aria-hidden>{skin.icon}</span> {e.label}
              </span>
              <span style={chip(mode.color)}>{mode.label}</span>
              <a
                href={skin.href}
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  color: C.muted,
                  textDecoration: "none",
                  minHeight: 44,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                change →
              </a>
            </div>

            <Headline headline={e.headline} />

            <div style={{ fontSize: 10.5, color: C.muted, letterSpacing: 0.4 }}>
              EVERY LIMIT
            </div>
            {e.limits.map((row) => (
              <LimitRow key={row.key} row={row} />
            ))}
          </div>
        );
      })}

      {data && data.as_of && (
        <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 6 }}>
          as of{" "}
          {new Date(data.as_of).toLocaleTimeString("en-US", {
            timeZone: "America/Chicago",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          CT
        </div>
      )}
    </div>
  );
}
