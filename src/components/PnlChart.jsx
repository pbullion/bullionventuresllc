import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* Profit/loss charts over time, shared by /my-bets (both engines), /crypto-value
 * (crypto only) and /totals-value (sports only). Backed by GET /kalshi/history,
 * which buckets both bet ledgers in Central time — see that endpoint for the
 * time-axis caveat it reports as `time_basis` (sports rows sit at bet-placed
 * time because that ledger has no settlement timestamp; crypto rows sit at true
 * settlement time).
 *
 * Hand-rolled SVG on purpose: the bundle is already ~1.7MB and a charting
 * library would be the single biggest thing in it.
 *
 * Palette is validated for this dark surface (#151a24) with the dataviz
 * validator — blue/orange pass every check; the green/red pair sits in the
 * 6–8 CVD band, which is legal ONLY because the bars also encode sign by
 * position around a zero baseline and every value carries a signed label. */
const HISTORY_URL = "https://sheline-art-website-api.herokuapp.com/kalshi/history";

const K = {
  panel: "#151a24",
  border: "#252c3a",
  text: "#e8eaed",
  muted: "#8a93a6",
  grid: "#1e2531",
  up: "#15a06a",
  down: "#e0574a",
  value: "#1a93cf",
  chipBg: "#1c2430",
};

const BUCKETS = [
  { key: "hour", label: "Hourly", days: 3 },
  { key: "day", label: "Daily", days: 60 },
  { key: "week", label: "Weekly", days: 365 },
];

const usd = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(Number(n)) >= 1000 ? 0 : 2,
  }).format(Number.isFinite(Number(n)) ? Number(n) : 0);

const signedUsd = (n) => (Number(n) > 0 ? `+${usd(n)}` : usd(n));

/* The API sends naive Central wall-clock strings ("2026-08-06T16:00:00") on
 * purpose. Parsing them with `new Date` would apply the viewer's zone and
 * shift every label, so pull the fields out by hand instead. */
const parseWallClock = (ts) => {
  const m = String(ts).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  return {
    year: +m[1],
    month: +m[2],
    day: +m[3],
    hour: +m[4],
    date: new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]),
  };
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const tickLabel = (ts, bucket) => {
  const p = parseWallClock(ts);
  if (!p) return "";
  if (bucket === "hour") {
    const h = p.hour % 12 === 0 ? 12 : p.hour % 12;
    return `${h}${p.hour < 12 ? "a" : "p"}`;
  }
  return `${MONTHS[p.month - 1]} ${p.day}`;
};

const fullLabel = (ts, bucket) => {
  const p = parseWallClock(ts);
  if (!p) return String(ts);
  const base = `${MONTHS[p.month - 1]} ${p.day}`;
  if (bucket === "hour") {
    const h = p.hour % 12 === 0 ? 12 : p.hour % 12;
    return `${base}, ${h}${p.hour < 12 ? "am" : "pm"} CT`;
  }
  if (bucket === "week") return `Week of ${base}`;
  return base;
};

/* Nice round axis bounds so gridlines land on readable numbers. */
function niceBounds(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { lo: 0, hi: 1 };
  if (min === max) {
    const pad = Math.abs(min) || 1;
    return { lo: min - pad, hi: max + pad };
  }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / 3)));
  const mult = span / 3 / step;
  const nice = step * (mult >= 5 ? 10 : mult >= 2 ? 5 : mult >= 1 ? 2 : 1);
  return { lo: Math.floor(min / nice) * nice, hi: Math.ceil(max / nice) * nice };
}

/* Chart geometry — one viewBox, scaled to the container by CSS. Module-level
 * because it never changes; inside the component it would re-enter every
 * useMemo dependency list for no reason. */
const W = 760;
const H_LINE = 190;
const H_BAR = 132;
const PAD = { l: 54, r: 14, t: 14, b: 22 };
const PLOT_W = W - PAD.l - PAD.r;

function Toggle({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} style={{ display: "flex", gap: 4, background: K.chipBg, borderRadius: 999, padding: 3 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            aria-pressed={on}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.2,
              background: on ? K.value : "transparent",
              color: on ? "#04121c" : K.muted,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ minWidth: 92 }}>
      <div style={{ fontSize: 11, color: K.muted, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: color || K.text, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export default function PnlChart({
  engines = [{ key: "all", label: "Combined" }, { key: "sports", label: "Sports" }, { key: "crypto", label: "Crypto" }, { key: "weather", label: "Weather" }, { key: "gas", label: "Gas" }],
  defaultEngine = "all",
  title = "Profit & loss over time",
}) {
  const [bucket, setBucket] = useState("day");
  const [engine, setEngine] = useState(defaultEngine);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [hover, setHover] = useState(null); // index into points
  const [showTable, setShowTable] = useState(false);
  const wrapRef = useRef(null);

  const days = BUCKETS.find((b) => b.key === bucket)?.days;

  const load = useCallback(() => {
    fetch(`${HISTORY_URL}?bucket=${bucket}&engine=${engine}&days=${days}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        /* THE ENDPOINT FALLS BACK TO `all` FOR AN ENGINE IT DOESN'T KNOW, and it
           does so with HTTP 200. Asking for an engine the deployed backend
           hasn't learned yet therefore doesn't fail — it quietly answers with
           the whole account's curve under this chart's title, which is the worst
           kind of wrong on a page about one engine. It echoes what it actually
           ran as `engine`; if that isn't what we asked for, say so and draw
           nothing. (2026-08-31, when /gas-value got a chart before
           /kalshi/history had a gas ledger.) */
        if (d && d.engine && d.engine !== engine) {
          setData(null);
          setError(`No ${engine} history yet — the backend is still serving "${d.engine}".`);
          return;
        }
        setData(d);
        setError("");
      })
      .catch((e) => setError(`Couldn't load history: ${e.message}`));
  }, [bucket, engine, days]);

  useEffect(() => {
    load();
    // Slower than the pages' own polling on purpose — this is a history view,
    // and every extra tab multiplies load on the shared backend.
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const points = useMemo(() => data?.points || [], [data]);
  const equity = useMemo(() => (data?.equity || []).filter((e) => e.value != null), [data]);

  /* The endpoint's `cumulative_pnl` is the LIFETIME running total, so inside a
   * short window it draws a nearly flat line parked hundreds of dollars off
   * zero — an account-balance curve wearing a P&L label. Rebase every point on
   * the P&L banked before the window opened so the curve starts at $0 and its
   * height IS what this window made or lost. (Patrick, 2026-09-02: "i dont want
   * to see balance here, i want to see p and l for these charts.") */
  const base = data?.starting_cumulative_pnl ?? 0;
  const series = useMemo(
    () => points.map((p) => ({ ...p, cum: Math.round((p.cumulative_pnl - base) * 100) / 100 })),
    [points, base],
  );

  const geom = useMemo(() => {
    if (!series.length) return null;
    const cums = series.map((p) => p.cum);
    const { lo, hi } = niceBounds(Math.min(0, ...cums), Math.max(0, ...cums));
    const plotH = H_LINE - PAD.t - PAD.b;
    const x = (i) => PAD.l + (points.length === 1 ? PLOT_W / 2 : (i / (points.length - 1)) * PLOT_W);
    const y = (v) => PAD.t + plotH - ((v - lo) / (hi - lo || 1)) * plotH;

    const bars = points.map((p) => p.pnl);
    const bb = niceBounds(Math.min(0, ...bars), Math.max(0, ...bars));
    const barPlotH = H_BAR - PAD.t - PAD.b;
    const by = (v) => PAD.t + barPlotH - ((v - bb.lo) / (bb.hi - bb.lo || 1)) * barPlotH;
    // Bars sit in slots; the 2px surface gap between neighbours is the spacer
    // the mark spec asks for, so adjacent days never fuse into one block.
    const slot = PLOT_W / points.length;
    const barW = Math.max(2, Math.min(26, slot - 2));

    return { lo, hi, x, y, bb, by, slot, barW, plotH, barPlotH };
  }, [points, series]);

  const equityGeom = useMemo(() => {
    if (equity.length < 2) return null;
    const vals = equity.map((e) => e.value);
    const { lo, hi } = niceBounds(Math.min(...vals), Math.max(...vals));
    const plotH = H_LINE - PAD.t - PAD.b;
    const x = (i) => PAD.l + (equity.length === 1 ? PLOT_W / 2 : (i / (equity.length - 1)) * PLOT_W);
    const y = (v) => PAD.t + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
    return { lo, hi, x, y };
  }, [equity]);

  // Map a pointer position to the nearest data index.
  const onMove = (e) => {
    if (!geom || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const scale = rect.width / W;
    const svgX = (e.clientX - rect.left) / scale;
    const rel = (svgX - PAD.l) / PLOT_W;
    const idx = Math.round(rel * (points.length - 1));
    setHover(idx >= 0 && idx < points.length ? idx : null);
  };

  const summary = data?.summary;
  // What the curve draws is the WINDOW's P&L; the lifetime total is a separate
  // stat so the headline number can never disagree with the chart under it.
  const endCum = series.length ? series[series.length - 1].cum : 0;
  const lifetimeCum = points.length ? points[points.length - 1].cumulative_pnl : base;
  const curveColor = endCum >= 0 ? K.up : K.down;

  // Gridline values for the cumulative chart.
  const gridVals = geom ? [geom.lo, geom.lo + (geom.hi - geom.lo) / 2, geom.hi] : [];
  // Show at most ~6 x labels so they never collide.
  const labelEvery = points.length ? Math.max(1, Math.ceil(points.length / 6)) : 1;

  const hp = hover != null ? series[hover] : null;

  return (
    <section
      style={{
        background: K.panel,
        border: `1px solid ${K.border}`,
        borderRadius: 14,
        padding: 14,
        margin: "14px 0",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: K.text }}>{title}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {engines.length > 1 && (
            <Toggle options={engines} value={engine} onChange={setEngine} label="Which engine" />
          )}
          <Toggle options={BUCKETS} value={bucket} onChange={setBucket} label="Time bucket" />
        </div>
      </div>

      {error && <div style={{ color: K.down, fontSize: 13, marginTop: 10 }}>{error}</div>}
      {!error && !data && <div style={{ color: K.muted, fontSize: 13, marginTop: 10 }}>Loading history…</div>}

      {summary && (
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12 }}>
          <Stat label={`P&L (${days}d)`} value={signedUsd(endCum)} color={curveColor} />
          <Stat label="Staked" value={usd(summary.staked)} />
          <Stat label="ROI" value={summary.roi == null ? "—" : `${summary.roi > 0 ? "+" : ""}${summary.roi}%`} color={summary.roi == null ? undefined : summary.roi >= 0 ? K.up : K.down} />
          <Stat label="Win rate" value={summary.win_rate == null ? "—" : `${summary.win_rate}%`} />
          <Stat label="Settled" value={`${summary.settled}`} />
          <Stat label="Lifetime" value={signedUsd(lifetimeCum)} color={lifetimeCum >= 0 ? K.up : K.down} />
        </div>
      )}

      {data && !points.length && (
        <div style={{ color: K.muted, fontSize: 13, marginTop: 14 }}>
          No settled bets in this window yet — try a longer bucket.
        </div>
      )}

      {geom && (
        <div ref={wrapRef} style={{ position: "relative", marginTop: 12 }}>
          {/* ── Cumulative P&L ── */}
          <div style={{ fontSize: 11, color: K.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>
            P&L this window{" "}
            <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
              — last {days} {days === 1 ? "day" : "days"}, from $0
            </span>
          </div>
          <svg
            viewBox={`0 0 ${W} ${H_LINE}`}
            style={{ width: "100%", height: "auto", display: "block", touchAction: "pan-y" }}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onTouchMove={(e) => e.touches[0] && onMove(e.touches[0])}
            onTouchEnd={() => setHover(null)}
            role="img"
            aria-label={`Profit and loss over the last ${days} days, ${bucket}ly, starting from zero. Window total ${signedUsd(endCum)}.`}
          >
            {gridVals.map((v, i) => (
              <g key={i}>
                <line x1={PAD.l} x2={W - PAD.r} y1={geom.y(v)} y2={geom.y(v)} stroke={K.grid} strokeWidth="1" />
                <text x={PAD.l - 8} y={geom.y(v) + 4} textAnchor="end" fontSize="11" fill={K.muted}>
                  {usd(v)}
                </text>
              </g>
            ))}
            {/* Zero reference — the line that actually matters on a P&L chart. */}
            {geom.lo < 0 && geom.hi > 0 && (
              <line x1={PAD.l} x2={W - PAD.r} y1={geom.y(0)} y2={geom.y(0)} stroke={K.muted} strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
            )}
            <path
              d={`M ${geom.x(0)} ${geom.y(series[0].cum)} ${series
                .map((p, i) => `L ${geom.x(i)} ${geom.y(p.cum)}`)
                .join(" ")} L ${geom.x(series.length - 1)} ${geom.y(geom.lo < 0 && geom.hi > 0 ? 0 : geom.lo)} L ${geom.x(0)} ${geom.y(geom.lo < 0 && geom.hi > 0 ? 0 : geom.lo)} Z`}
              fill={curveColor}
              opacity="0.13"
            />
            <path
              d={`M ${geom.x(0)} ${geom.y(series[0].cum)} ${series
                .map((p, i) => `L ${geom.x(i)} ${geom.y(p.cum)}`)
                .join(" ")}`}
              fill="none"
              stroke={curveColor}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Final value, direct-labelled — no number on every point. */}
            <circle cx={geom.x(series.length - 1)} cy={geom.y(endCum)} r="4" fill={curveColor} stroke={K.panel} strokeWidth="2" />
            {hover != null && (
              <g>
                <line x1={geom.x(hover)} x2={geom.x(hover)} y1={PAD.t} y2={H_LINE - PAD.b} stroke={K.muted} strokeWidth="1" opacity="0.55" />
                <circle cx={geom.x(hover)} cy={geom.y(series[hover].cum)} r="4.5" fill={curveColor} stroke={K.panel} strokeWidth="2" />
              </g>
            )}
            {points.map((p, i) =>
              i % labelEvery === 0 || i === points.length - 1 ? (
                <text key={i} x={geom.x(i)} y={H_LINE - 6} textAnchor="middle" fontSize="11" fill={K.muted}>
                  {tickLabel(p.ts, bucket)}
                </text>
              ) : null
            )}
          </svg>

          {/* ── Per-bucket P&L ── */}
          <div style={{ fontSize: 11, color: K.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, margin: "8px 0 2px" }}>
            {bucket === "hour" ? "P&L per hour" : bucket === "week" ? "P&L per week" : "P&L per day"}
          </div>
          <svg
            viewBox={`0 0 ${W} ${H_BAR}`}
            style={{ width: "100%", height: "auto", display: "block", touchAction: "pan-y" }}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onTouchMove={(e) => e.touches[0] && onMove(e.touches[0])}
            onTouchEnd={() => setHover(null)}
            role="img"
            aria-label={`Profit and loss per ${bucket}. Green bars above the line are winning periods, red below are losing.`}
          >
            {[geom.bb.lo, geom.bb.hi].map((v, i) => (
              <text key={i} x={PAD.l - 8} y={geom.by(v) + 4} textAnchor="end" fontSize="11" fill={K.muted}>
                {usd(v)}
              </text>
            ))}
            <line x1={PAD.l} x2={W - PAD.r} y1={geom.by(0)} y2={geom.by(0)} stroke={K.muted} strokeWidth="1" opacity="0.7" />
            {points.map((p, i) => {
              const zero = geom.by(0);
              const v = geom.by(p.pnl);
              const top = Math.min(zero, v);
              const h = Math.max(1.5, Math.abs(zero - v));
              const cx = PAD.l + geom.slot * (i + 0.5);
              return (
                <rect
                  key={i}
                  x={cx - geom.barW / 2}
                  y={top}
                  width={geom.barW}
                  height={h}
                  rx={Math.min(4, geom.barW / 2)}
                  fill={p.pnl >= 0 ? K.up : K.down}
                  opacity={hover == null || hover === i ? 1 : 0.5}
                />
              );
            })}
            {points.map((p, i) =>
              i % labelEvery === 0 || i === points.length - 1 ? (
                <text key={i} x={PAD.l + geom.slot * (i + 0.5)} y={H_BAR - 6} textAnchor="middle" fontSize="11" fill={K.muted}>
                  {tickLabel(p.ts, bucket)}
                </text>
              ) : null
            )}
          </svg>

          {/* ── Account value (only once snapshots exist) ── */}
          {equityGeom && (
            <>
              <div style={{ fontSize: 11, color: K.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, margin: "8px 0 2px" }}>
                Account value <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— cash + open positions</span>
              </div>
              <svg viewBox={`0 0 ${W} ${H_LINE}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Account value over time">
                {[equityGeom.lo, (equityGeom.lo + equityGeom.hi) / 2, equityGeom.hi].map((v, i) => (
                  <g key={i}>
                    <line x1={PAD.l} x2={W - PAD.r} y1={equityGeom.y(v)} y2={equityGeom.y(v)} stroke={K.grid} strokeWidth="1" />
                    <text x={PAD.l - 8} y={equityGeom.y(v) + 4} textAnchor="end" fontSize="11" fill={K.muted}>
                      {usd(v)}
                    </text>
                  </g>
                ))}
                <path
                  d={`M ${equityGeom.x(0)} ${equityGeom.y(equity[0].value)} ${equity
                    .map((e, i) => `L ${equityGeom.x(i)} ${equityGeom.y(e.value)}`)
                    .join(" ")}`}
                  fill="none"
                  stroke={K.value}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx={equityGeom.x(equity.length - 1)} cy={equityGeom.y(equity[equity.length - 1].value)} r="4" fill={K.value} stroke={K.panel} strokeWidth="2" />
                {equity.map((e, i) =>
                  i % Math.max(1, Math.ceil(equity.length / 6)) === 0 || i === equity.length - 1 ? (
                    <text key={i} x={equityGeom.x(i)} y={H_LINE - 6} textAnchor="middle" fontSize="11" fill={K.muted}>
                      {tickLabel(e.ts, bucket)}
                    </text>
                  ) : null
                )}
              </svg>
            </>
          )}

          {hp && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: `${(geom.x(hover) / W) * 100}%`,
                transform: `translateX(${hover > points.length / 2 ? "-105%" : "5%"})`,
                background: "#0b0e14",
                border: `1px solid ${K.border}`,
                borderRadius: 8,
                padding: "7px 10px",
                pointerEvents: "none",
                fontSize: 12,
                color: K.text,
                whiteSpace: "nowrap",
                zIndex: 2,
              }}
            >
              <div style={{ color: K.muted, marginBottom: 3 }}>{fullLabel(hp.ts, bucket)}</div>
              <div>
                <span style={{ color: hp.pnl >= 0 ? K.up : K.down, fontWeight: 800 }}>{signedUsd(hp.pnl)}</span>
                <span style={{ color: K.muted }}> this {bucket}</span>
              </div>
              <div style={{ color: K.muted }}>
                Window: <span style={{ color: hp.cum >= 0 ? K.up : K.down, fontWeight: 700 }}>{signedUsd(hp.cum)}</span>
              </div>
              <div style={{ color: K.muted }}>
                Lifetime: <span style={{ color: hp.cumulative_pnl >= 0 ? K.up : K.down, fontWeight: 700 }}>{signedUsd(hp.cumulative_pnl)}</span>
              </div>
              <div style={{ color: K.muted }}>
                {hp.wins}W–{hp.losses}L · {usd(hp.staked)} staked
              </div>
            </div>
          )}
        </div>
      )}

      {points.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowTable((s) => !s)}
            style={{ background: "none", border: "none", color: K.muted, fontSize: 12, cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            {showTable ? "Hide table" : "Show as table"}
          </button>
          {showTable && (
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: K.text }}>
                <thead>
                  <tr style={{ color: K.muted, textAlign: "right" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px" }}>Period</th>
                    <th style={{ padding: "4px 8px" }}>P&L</th>
                    <th style={{ padding: "4px 8px" }}>Window</th>
                    <th style={{ padding: "4px 8px" }}>Staked</th>
                    <th style={{ padding: "4px 8px" }}>W–L</th>
                  </tr>
                </thead>
                <tbody>
                  {[...series].reverse().map((p) => (
                    <tr key={p.ts} style={{ borderTop: `1px solid ${K.border}`, textAlign: "right" }}>
                      <td style={{ textAlign: "left", padding: "4px 8px", color: K.muted }}>{fullLabel(p.ts, bucket)}</td>
                      <td style={{ padding: "4px 8px", color: p.pnl >= 0 ? K.up : K.down, fontWeight: 700 }}>{signedUsd(p.pnl)}</td>
                      <td style={{ padding: "4px 8px" }}>{signedUsd(p.cum)}</td>
                      <td style={{ padding: "4px 8px" }}>{usd(p.staked)}</td>
                      <td style={{ padding: "4px 8px" }}>{p.wins}–{p.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {data?.time_basis && (
        <div style={{ fontSize: 11, color: K.muted, marginTop: 8, lineHeight: 1.45 }}>
          {data.time_basis}.
          {!equityGeom && " Account-value history starts from when snapshots began recording."}
        </div>
      )}
    </section>
  );
}
