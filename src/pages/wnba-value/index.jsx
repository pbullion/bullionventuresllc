import React, { useEffect, useRef, useState } from "react";

const API_BASE = "https://sheline-art-website-api.herokuapp.com/kalshi";

/* ─── Dark palette (matches my-bets) ─── */
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
  redBorder: "#8a3a3d",
  amber: "#eab308",
  chipBg: "#1c2430",
  rowAlt: "#1a2029",
};

const cents = (dollars) =>
  dollars == null ? "—" : `${Math.round(Number(dollars) * 100)}¢`;
const pct = (p) => (p == null ? "—" : `${Math.round(Number(p) * 100)}%`);
// Signed edge in cents: "+7¢" / "-3¢".
const edgeCents = (e) => {
  if (e == null) return "—";
  const v = Math.round(Number(e) * 100);
  return `${v >= 0 ? "+" : ""}${v}¢`;
};
// Remaining-time label. WNBA remaining is seconds ("8:24 left"); MLB remaining
// is innings ("4.5 inn left").
const remainingLabel = (game) => {
  const r = game.remaining_secs;
  if (r == null) return "";
  if (game.league === "mlb") {
    return `${Number(r) % 1 === 0 ? r : Number(r).toFixed(1)} inn left`;
  }
  const m = Math.floor(r / 60);
  const s = Math.round(r % 60);
  return `${m}:${String(s).padStart(2, "0")} left`;
};
// "6:40 PM CT" for an upcoming game's tip time.
const tipTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(d)} CT`;
};

const edgeColor = (e) =>
  e == null ? C.muted : e >= 0.05 ? C.green : e >= 0 ? C.amber : C.red;

/* ─── Small pieces ─── */

function Chip({ children, color = C.muted, bg = C.chipBg, border = C.border }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        color,
        background: bg,
        border: `1px solid ${border}`,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function StateChip({ state, detail }) {
  if (state === "in")
    return (
      <Chip color={C.green} bg={C.greenSoft} border={C.greenBorder}>
        ● Live {detail ? `· ${detail}` : ""}
      </Chip>
    );
  if (state === "pre") return <Chip>{detail || "Upcoming"}</Chip>;
  if (state === "post") return <Chip color={C.muted}>Final</Chip>;
  return <Chip color={C.amber}>No game match</Chip>;
}

// The pick text for a row: totals read "Over 165.5"; margin markets carry a
// phrase label ("Indiana wins by over 6.5 points"), negated on the NO side.
const pickText = (bet, side) =>
  bet.label
    ? side === "over"
      ? bet.label
      : `No: ${bet.label}`
    : `${side === "over" ? "Over" : "Under"} ${bet.strike}`;

// Big highlighted card for a recommended value bet.
function ValueBetCard({ game, bet }) {
  const side = bet.best.side;
  const sideP = side === "over" ? bet.p_over : 1 - bet.p_over;
  return (
    <div
      style={{
        background: C.greenSoft,
        border: `1px solid ${C.greenBorder}`,
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          {pickText(bet, side)} {bet.locked_over && "🔒"}
        </div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
          {game.title}
          {game.game && game.game.detail ? ` · ${game.game.detail}` : ""}
        </div>
      </div>
      <div style={{ display: "flex", gap: 18, textAlign: "right" }}>
        <div>
          <div style={{ color: C.muted, fontSize: 11 }}>BUY AT</div>
          <div style={{ fontWeight: 800 }}>{cents(bet.best.buy_price_dollars)}</div>
        </div>
        <div>
          <div style={{ color: C.muted, fontSize: 11 }}>MODEL</div>
          <div style={{ fontWeight: 800 }}>{pct(sideP)}</div>
        </div>
        <div>
          <div style={{ color: C.muted, fontSize: 11 }}>EDGE</div>
          <div style={{ fontWeight: 800, color: C.green }}>
            {edgeCents(bet.best.edge)}
          </div>
        </div>
      </div>
    </div>
  );
}

// The strike ladder for one game.
function Ladder({ game }) {
  const live = game.state === "in";
  const isMargin = game.market_type && game.market_type !== "total";
  const yesLabel = isMargin ? "YES" : "OVER";
  const noLabel = isMargin ? "NO" : "UNDER";
  const th = {
    textAlign: "right",
    padding: "6px 10px",
    color: C.muted,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
  };
  const td = {
    textAlign: "right",
    padding: "7px 10px",
    fontSize: 13,
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left" }}>LINE</th>
            <th style={th}>BID</th>
            <th style={th}>ASK</th>
            {live && <th style={th}>MODEL P({yesLabel})</th>}
            {live && <th style={th}>{yesLabel} EDGE</th>}
            {live && <th style={th}>{noLabel} EDGE</th>}
          </tr>
        </thead>
        <tbody>
          {game.markets.map((m, i) => {
            const rec = m.recommended;
            return (
              <tr
                key={m.ticker}
                style={{
                  background: rec ? C.greenSoft : i % 2 ? C.rowAlt : "transparent",
                  borderTop: `1px solid ${C.border}`,
                  outline: rec ? `1px solid ${C.greenBorder}` : "none",
                }}
              >
                <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>
                  {isMargin ? m.label : m.strike} {m.locked_over && "🔒"}
                  {rec && (
                    <span style={{ color: C.green, marginLeft: 6, fontSize: 11 }}>
                      {m.best.side === "over" ? `BUY ${yesLabel}` : `BUY ${noLabel}`}
                    </span>
                  )}
                </td>
                <td style={td}>{cents(m.yes_bid_dollars)}</td>
                <td style={td}>{cents(m.yes_ask_dollars)}</td>
                {live && (
                  <td style={{ ...td, fontWeight: 700 }}>{pct(m.p_over)}</td>
                )}
                {live && (
                  <td style={{ ...td, color: edgeColor(m.over_edge) }}>
                    {edgeCents(m.over_edge)}
                  </td>
                )}
                {live && (
                  <td style={{ ...td, color: edgeColor(m.under_edge) }}>
                    {edgeCents(m.under_edge)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GameCard({ game }) {
  const [open, setOpen] = useState(game.state === "in");
  const g = game.game || {};
  const away = g.away || {};
  const home = g.home || {};
  const live = game.state === "in";
  const hasScore = away.score != null && home.score != null;
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${live ? C.greenBorder : C.border}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>
            {hasScore && game.state !== "pre"
              ? `${away.team} ${away.score} – ${home.score} ${home.team}`
              : game.title}
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {game.league_label && <Chip color={C.text}>{game.league_label}</Chip>}
            {game.market_type && game.market_type !== "total" && (
              <Chip color={C.amber}>
                {game.market_type === "spread" ? "Spread" : "Moneyline"}
              </Chip>
            )}
            <StateChip
              state={game.state}
              detail={game.state === "pre" ? tipTime(g.date) : g.detail}
            />
            {game.prior_source === "closing_line" && game.prior_total != null && (
              <Chip color={C.text}>Line {Number(game.prior_total).toFixed(1)}</Chip>
            )}
            {live && game.projected_total != null && (
              <Chip color={C.text}>
                Proj total {game.projected_total.toFixed(1)} ± {game.sigma?.toFixed(1)}
              </Chip>
            )}
            {live && game.current_total != null && (
              <Chip color={C.text}>
                Now {game.current_total} · {remainingLabel(game)}
              </Chip>
            )}
            {game.value_bets.length > 0 && (
              <Chip color={C.green} bg={C.greenSoft} border={C.greenBorder}>
                {game.value_bets.length} value bet
                {game.value_bets.length === 1 ? "" : "s"}
              </Chip>
            )}
          </div>
        </div>
        <div style={{ color: C.muted, fontSize: 18 }}>{open ? "▾" : "▸"}</div>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <Ladder game={game} />
          {g.link && (
            <div style={{ padding: "8px 16px" }}>
              <a
                href={g.link}
                target="_blank"
                rel="noreferrer"
                style={{ color: C.muted, fontSize: 12 }}
              >
                View on ESPN ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Model performance (from the prediction log) ─── */

function Stat({ label, value, color = C.text }) {
  return (
    <div
      style={{
        background: C.chipBg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        minWidth: 110,
      }}
    >
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 18, color, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function PerformancePanel() {
  const [perf, setPerf] = useState(null);
  const [err, setErr] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/totals-value/performance`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setPerf)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return null; // endpoint not deployed yet — hide the panel
  if (!perf) return null;

  const rec = perf.recommended || {};
  const bets = rec.bets || 0;
  const roiPct = rec.roi != null ? `${(rec.roi * 100).toFixed(1)}%` : "—";
  const profit =
    rec.profit_per_contract_dollars != null
      ? `${rec.profit_per_contract_dollars >= 0 ? "+" : "−"}$${Math.abs(
          rec.profit_per_contract_dollars
        ).toFixed(2)}`
      : "—";
  const calBuckets = (perf.calibration || []).filter((b) => b.n > 0);
  const history = (rec.history || []).slice().reverse();

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        marginTop: 26,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 15, flex: 1 }}>
          📊 Model Performance
          <span style={{ color: C.muted, fontWeight: 500, fontSize: 12, marginLeft: 8 }}>
            {perf.settled_games} game{perf.settled_games === 1 ? "" : "s"} settled ·{" "}
            {bets} alerted bet{bets === 1 ? "" : "s"}
          </span>
        </div>
        <div style={{ color: C.muted, fontSize: 18 }}>{open ? "▾" : "▸"}</div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Stat
              label="RECORD"
              value={bets ? `${rec.wins}–${rec.losses}` : "—"}
              color={rec.wins >= rec.losses ? C.green : C.red}
            />
            <Stat
              label="P/L PER $1"
              value={profit}
              color={(rec.profit_per_contract_dollars || 0) >= 0 ? C.green : C.red}
            />
            <Stat label="ROI" value={roiPct} />
            <Stat
              label="BRIER"
              value={perf.brier_score != null ? perf.brier_score.toFixed(3) : "—"}
            />
            {perf.closing_line && perf.closing_line.events > 0 && (
              <Stat
                label={`MARKET LINE MAE (${perf.closing_line.events})`}
                value={`±${perf.closing_line.mae_points.toFixed(1)} pts`}
              />
            )}
            <Stat
              label="LEARNED σ×"
              value={(() => {
                const learned = Object.entries(perf.model_state || {}).filter(
                  ([, s]) => Number(s.sample_n) > 0
                );
                if (!learned.length) return "not yet";
                return learned
                  .map(
                    ([lg, s]) =>
                      `${lg.toUpperCase()} ${Number(s.sigma_mult).toFixed(2)}`
                  )
                  .join(" · ");
              })()}
            />
          </div>

          {calBuckets.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                CALIBRATION — WHEN THE MODEL SAID X%, HOW OFTEN DID IT GO OVER?
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {calBuckets.map((b) => (
                  <div
                    key={b.bucket}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
                  >
                    <span style={{ width: 62, color: C.muted }}>{b.bucket}</span>
                    <div
                      style={{
                        flex: 1,
                        height: 10,
                        background: C.rowAlt,
                        borderRadius: 5,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${Math.round((b.realized || 0) * 100)}%`,
                          background: C.green,
                          opacity: 0.7,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: `${Math.round((b.predicted || 0) * 100)}%`,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          background: C.text,
                        }}
                      />
                    </div>
                    <span style={{ width: 90, textAlign: "right", color: C.muted }}>
                      {Math.round((b.realized || 0) * 100)}% ({b.n})
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
                Green bar = realized over-rate · white tick = model's average prediction
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                ALERTED BET HISTORY
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {history.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      alignItems: "center",
                      fontSize: 13,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: b.won ? C.greenSoft : C.redSoft,
                      border: `1px solid ${b.won ? C.greenBorder : C.redBorder}`,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>
                      {b.league ? `${b.league.toUpperCase()} · ` : ""}
                      {b.market_type === "spread"
                        ? `${b.side === "over" ? "" : "Not "}${b.pick_abbr} by ${b.strike}+`
                        : b.market_type === "moneyline"
                        ? `${b.pick_abbr} ML ${b.side === "over" ? "✓" : "✗"}`
                        : `${b.side === "over" ? "Over" : "Under"} ${b.strike}`}
                    </span>
                    <span style={{ color: C.muted, flex: 1, minWidth: 120 }}>{b.title}</span>
                    <span>{cents(b.buy_price_dollars)}</span>
                    <span style={{ color: b.won ? C.green : C.red, fontWeight: 800 }}>
                      {b.won ? "WON" : "LOST"}{" "}
                      {b.pnl_dollars >= 0 ? "+" : "−"}${Math.abs(b.pnl_dollars).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {perf.settled_predictions === 0 && (
            <div style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>
              No settled predictions yet — this fills in as games finish.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */

const EDGE_OPTIONS = [0.03, 0.05, 0.08, 0.1];

export default function WnbaValue() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [minEdge, setMinEdge] = useState(0.05);
  const [updatedAt, setUpdatedAt] = useState(null);
  const timerRef = useRef(null);
  // Latest live-game count, readable from inside the polling closure (state
  // would be stale there — the effect only re-runs when minEdge changes).
  const liveCountRef = useRef(0);

  const load = async (edge) => {
    try {
      const res = await fetch(`${API_BASE}/totals-value?min_edge=${edge}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      liveCountRef.current = Number(j.live_count) || 0;
      setData(j);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message || "Failed to load");
    }
  };

  // Poll every 15s while a game is live, every 60s otherwise.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      await load(minEdge);
      if (cancelled) return;
      timerRef.current = setTimeout(
        tick,
        liveCountRef.current > 0 ? 15000 : 60000
      );
    };
    tick();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minEdge]);

  const games = (data && data.games) || [];
  const valueBets = games.flatMap((g) =>
    g.value_bets.map((bet) => ({ game: g, bet }))
  );
  valueBets.sort((a, b) => b.bet.best.edge - a.bet.best.edge);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "20px 14px 60px",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
            📈 Totals Value
          </h1>
          <span style={{ color: C.muted, fontSize: 12 }}>
            Kalshi over/unders vs live pace model — WNBA · MLB · CBB · NFL · CFB
            {updatedAt
              ? ` · updated ${updatedAt.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}`
              : ""}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "10px 0 18px",
            color: C.muted,
            fontSize: 13,
          }}
        >
          Min edge:
          {EDGE_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setMinEdge(e)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                color: e === minEdge ? C.bg : C.text,
                background: e === minEdge ? C.green : C.chipBg,
                border: `1px solid ${e === minEdge ? C.green : C.border}`,
              }}
            >
              {Math.round(e * 100)}¢
            </button>
          ))}
        </div>

        {error && (
          <div
            style={{
              background: C.redSoft,
              border: `1px solid ${C.redBorder}`,
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
            }}
          >
            Couldn’t load scan: {error}
          </div>
        )}
        {!data && !error && <div style={{ color: C.muted }}>Loading…</div>}

        {valueBets.length > 0 && (
          <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.green }}>
              VALUE BETS
            </div>
            {valueBets.map(({ game, bet }) => (
              <ValueBetCard key={`${bet.ticker}-${bet.best.side}`} game={game} bet={bet} />
            ))}
          </div>
        )}
        {data && valueBets.length === 0 && (
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>
            No bets clear a {Math.round(minEdge * 100)}¢ edge right now
            {data.live_count === 0 ? " — no WNBA games are live." : "."}
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {games.map((g) => (
            <GameCard key={g.event_ticker} game={g} />
          ))}
        </div>

        <PerformancePanel />
      </div>
    </div>
  );
}
