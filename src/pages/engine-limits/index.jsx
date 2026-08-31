import { useCallback, useEffect, useRef, useState } from "react";
import EnginePage from "../../components/engine/EnginePage.jsx";
import {
  EngineHeader,
  EnginePill,
} from "../../components/engine/EngineChrome.jsx";
import { C, panelStyle } from "../../components/engine/theme.js";

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

/* panelStyle with this page's slightly larger radius and padding — the cards
 * carry a 3px engine accent on the left edge, which needs the room. */
const card = { ...panelStyle, borderRadius: 14, padding: 16, marginBottom: 12 };

/* An outline badge — "override", "resumes live". Deliberately not the shared
 * `chip` (a filled state pill): these qualify a row, they don't report a
 * state, and two things that look identical would read as the same kind of
 * claim. */
const outlineChip = (color) => ({
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

/* How the backend names a cap's basis, in words. Rendered from
 * `headline.daily_cap_basis` rather than asserted by this page: the basis is
 * NOT uniform across every row — the sports card's "CFB daily stake cap" bounds
 * GROSS STAKE, not loss — so a blanket claim on the page would be false for it.
 * Each row's own help text carries its own semantics. */
const BASIS = { "net-loss": "net loss, CT day", stake: "gross stake, CT day" };

/** The three numbers the page exists to answer, per engine. */
function Headline({ headline }) {
  const cells = [
    { k: "Unit", v: fmtValue(headline.unit, "money") },
    { k: "Max / bet", v: fmtValue(headline.max_bet, "money") },
    {
      k: "Daily cap",
      v: fmtValue(headline.daily_cap, "money"),
      note: BASIS[headline.daily_cap_basis] || headline.daily_cap_basis || null,
    },
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
          {c.note && (
            <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
              {c.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LimitRow({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, padding: "9px 0" }}>
      {/* A real <button>, not a div+onClick — the Panel toggle on /crypto-value
          is the pattern, and a screen reader gets nothing from the other one.
          44px because reading these rows IS the page: up to a dozen per card,
          and the "change →" link beside them already claims 44. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          cursor: "pointer",
          minHeight: 44,
          width: "100%",
          background: "transparent",
          border: "none",
          color: C.text,
          font: "inherit",
          padding: 0,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>
          {row.label}
          {row.overridden && (
            <span
              title="Set from the app or the website, not from the server config. It stands until cleared."
              style={{
                ...outlineChip(C.amber),
                marginLeft: 7,
                padding: "1px 7px",
              }}
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
        <span style={{ color: C.muted, fontSize: 11, width: 10 }} aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div
          style={{
            fontSize: 12,
            color: C.muted,
            lineHeight: 1.5,
            paddingTop: 4,
          }}
        >
          {row.help}
          {row.ceiling !== null && (
            <div style={{ marginTop: 4 }}>
              Ceiling {fmtValue(row.ceiling, row.fmt)} — the most this can be
              raised to without a config change.
            </div>
          )}
          {row.env && (
            <div
              style={{
                marginTop: 4,
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
              }}
            >
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

  /* Focus fires in bursts when you app-switch on a phone, so the answers can
   * come back out of order. Only the newest request is allowed to write. */
  const seq = useRef(0);
  const load = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (mine !== seq.current) return;
      setData(body);
      setErr(null);
    } catch {
      if (mine !== seq.current) return;
      setErr("backend unreachable");
    } finally {
      if (mine === seq.current) setLoading(false);
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
    /* 780px because the cards are a reading column, not a data grid. The notch
       insets this page has always had are the shell's default now, so it no
       longer asks for them by name. */
    <EnginePage mainWidth="780px">
      <EngineHeader title="🧮 Units & Caps" self="limits" err={err}>
        {/* Refetched on FOCUS, not on a timer — these values change when
            Patrick changes one, on another tab or on the phone, not on a
            clock. The button is the manual path, and it lives in the nav group
            so the header reads the same as every other engine screen. */}
        <button
          onClick={load}
          style={{
            background: C.chipBg,
            border: `1px solid ${C.border}`,
            color: C.muted,
            borderRadius: 8,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 700,
            minHeight: 32,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </EngineHeader>

      <div style={{ fontSize: 12.5, color: C.muted, margin: "6px 0 14px" }}>
        Every limit on all four engines, which all fund from the one Kalshi
        account. Each daily cap says its own basis underneath it —{" "}
        <strong style={{ color: C.text }}>net loss</strong> means a day that
        finishes up never touches it, while a{" "}
        <strong style={{ color: C.text }}>stake</strong> cap counts gross money
        put at risk, win or lose. Tap any row for what it does. Read-only: tap
        an engine to change a value behind the PIN.
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
        /* Neither of these is assumed present. There is no ErrorBoundary in
         * this app, so one engine coming back with a stripped field would take
         * the whole page to a blank screen rather than one bad card — and
         * partially-stripped rows out of this backend are a thing that has
         * actually happened (~3% of parlay legs, ~7.7% of weather rows). */
        const headline = e.headline || {};
        const limits = Array.isArray(e.limits) ? e.limits : [];
        return (
          <div
            key={e.engine}
            style={{ ...card, borderLeft: `3px solid ${skin.accent}` }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800 }}>
                <span aria-hidden>{skin.icon}</span> {e.label}
              </span>
              {/* Same three words the engine's own page uses. This card used
                  to say "LIVE MONEY" / lowercase "paper" / "KILLED" — three
                  labels for the states everywhere else calls LIVE, PAPER and
                  KILLED. */}
              <EnginePill mode={e.mode} />
              {/* `mode: "off"` collapses two different situations. Which one it
                  is decides whether clearing the kill resumes REAL MONEY or
                  paper, which is the thing worth knowing before you do it. */}
              {e.mode === "off" && (
                <span style={outlineChip(e.enabled_env ? C.amber : C.muted)}>
                  {e.enabled_env ? "resumes live" : "resumes paper"}
                </span>
              )}
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

            <Headline headline={headline} />

            <div style={{ fontSize: 10.5, color: C.muted, letterSpacing: 0.4 }}>
              EVERY LIMIT
            </div>
            {limits.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.muted, paddingTop: 8 }}>
                No limits reported for this engine.
              </div>
            ) : (
              limits.map((row) => <LimitRow key={row.key} row={row} />)
            )}
          </div>
        );
      })}

      {data && data.as_of && (
        <div
          style={{
            fontSize: 11,
            color: C.muted,
            textAlign: "center",
            marginTop: 6,
          }}
        >
          as of{" "}
          {new Date(data.as_of).toLocaleTimeString("en-US", {
            timeZone: "America/Chicago",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          CT
        </div>
      )}
    </EnginePage>
  );
}
