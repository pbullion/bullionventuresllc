import React, { useEffect, useState } from "react";

const API_BASE = "https://sheline-art-website-api.herokuapp.com/kalshi";

/* ─── Kalshi palette ─── */
const C = {
  bg: "#ffffff",
  panel: "#f6f7f9",
  card: "#ffffff",
  border: "#e6e8eb",
  text: "#16181c",
  muted: "#6b7280",
  green: "#009e6a",
  greenSoft: "#e7f6ef",
  red: "#e5484d",
  redSoft: "#fdecec",
  accent: "#00b87c",
  chipBg: "#f2f4f6",
};

/* ─── Formatters ─── */
const usd = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(Number(n)) ? Number(n) : 0,
  );
// Kalshi shows contract prices in cents (e.g. 57¢).
const cents = (dollars) => `${Math.round((Number(dollars) || 0) * 100)}¢`;

// Fallback: parse combo title "yes Boston,yes San Antonio,..." into legs.
const parseTitleLegs = (title) =>
  String(title || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((leg) => {
      const m = leg.match(/^(yes|no)\s+(.*)$/i);
      if (m) return { side: m[1].toLowerCase(), label: m[2] };
      return { side: null, label: leg };
    });

/* ─── Styles ─── */
const S = {
  page: {
    minHeight: "100vh",
    backgroundColor: C.bg,
    color: C.text,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "0 0 56px",
    boxSizing: "border-box",
  },
  topbar: {
    borderBottom: `1px solid ${C.border}`,
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logoDot: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: C.accent,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 800,
    fontSize: 16,
  },
  brandName: { fontSize: 17, fontWeight: 700, letterSpacing: -0.2 },
  refreshBtn: {
    backgroundColor: C.text,
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  inner: { maxWidth: 720, margin: "0 auto", padding: "0 16px" },

  hero: { padding: "28px 4px 20px" },
  heroLabel: { fontSize: 13, color: C.muted, fontWeight: 600, marginBottom: 6 },
  heroValue: { fontSize: 40, fontWeight: 800, letterSpacing: -1 },
  heroSub: { display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" },
  stat: {},
  statLabel: { fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: 700 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: C.text,
    margin: "18px 4px 12px",
  },

  bet: {
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
  },
  betHeader: { cursor: "pointer", userSelect: "none" },
  betTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  betTitleWrap: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  chevron: (open) => ({
    transition: "transform 0.15s ease",
    transform: open ? "rotate(90deg)" : "rotate(0deg)",
    color: C.muted,
    fontSize: 14,
    flexShrink: 0,
  }),
  betTitle: { fontSize: 15, fontWeight: 700, lineHeight: 1.3 },
  sidePill: (side) => ({
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    padding: "4px 10px",
    borderRadius: 999,
    color: side === "no" ? C.red : C.green,
    backgroundColor: side === "no" ? C.redSoft : C.greenSoft,
  }),
  legChips: { display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 4px" },
  legChip: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 9px",
    borderRadius: 8,
    backgroundColor: C.panel,
    border: `1px solid ${C.border}`,
    color: C.text,
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))",
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTop: `1px solid ${C.border}`,
  },
  mLabel: { fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 3 },
  mValue: { fontSize: 15, fontWeight: 700 },

  /* Expanded per-leg bet slip */
  slip: {
    marginTop: 14,
    paddingTop: 4,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  legCard: {
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "12px 14px",
    backgroundColor: C.panel,
  },
  legTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  legLeague: {
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  legStatus: (state) => ({
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.3,
    color: state === "in" ? C.green : C.muted,
    textTransform: "uppercase",
  }),
  legMatchup: { fontSize: 15, fontWeight: 700, marginBottom: 8 },
  pickRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pickLeft: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  check: (color) => ({
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: color,
    color: "#fff",
    fontSize: 12,
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  }),
  pickTeam: { fontSize: 14, fontWeight: 700 },
  winPct: { fontSize: 16, fontWeight: 800 },
  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px solid ${C.border}`,
    flexWrap: "wrap",
  },
  scoreTeam: (lead) => ({
    fontSize: 14,
    fontWeight: lead ? 800 : 600,
    color: lead ? C.text : C.muted,
  }),
  scoreNum: (lead) => ({
    fontSize: 15,
    fontWeight: 800,
    color: lead ? C.text : C.muted,
  }),
  scoreDash: { color: C.muted, fontWeight: 600 },
  delayed: {
    fontSize: 10,
    fontWeight: 800,
    color: C.muted,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "2px 6px",
    letterSpacing: 0.4,
    marginLeft: 4,
  },
  noGame: { fontSize: 12, color: C.muted, marginTop: 8, fontStyle: "italic" },

  muted: { color: C.muted, fontSize: 14, padding: "8px 4px" },
  error: {
    backgroundColor: C.redSoft,
    border: `1px solid ${C.red}`,
    color: C.red,
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 14,
    margin: "12px 4px",
  },
};

const pnlColor = (v) => (v > 0 ? C.green : v < 0 ? C.red : C.text);
const pnlStr = (v) => `${v > 0 ? "+" : ""}${usd(v)}`;

/* Green when winning/won, red when losing/lost, neutral otherwise. During a
   live game ESPN only sets `winner` at the final whistle, so `pick_is_winner`
   is false the whole time a game is in progress — use the live score to tell
   whether the pick is currently ahead (matches the score row's pickLead). */
const legAccent = (leg) => {
  if (leg.state === "won") return C.green;
  if (leg.state === "lost") return C.red;
  if (leg.game && leg.game.state === "in") {
    const { pick_score, opp_score, pick_is_winner } = leg.game;
    if (pick_score != null && opp_score != null) {
      if (pick_score > opp_score) return C.green;
      if (pick_score < opp_score) return C.red;
      return C.muted; // tied
    }
    return pick_is_winner ? C.green : C.muted;
  }
  return C.muted;
};

const StatusLabel = ({ leg }) => {
  const g = leg.game;
  if (g && g.detail) return g.detail;
  if (leg.state === "won") return "Won";
  if (leg.state === "lost") return "Lost";
  return "Open";
};

function LegSlip({ leg }) {
  const accent = legAccent(leg);
  const g = leg.game;
  const pickLead =
    g && g.pick_score != null && g.opp_score != null
      ? g.pick_score >= g.opp_score
      : leg.state === "won";
  return (
    <div style={S.legCard}>
      <div style={S.legTopRow}>
        <span style={S.legLeague}>{leg.league || "Market"}</span>
        <span style={S.legStatus(g ? g.state : leg.state)}>
          <StatusLabel leg={leg} />
        </span>
      </div>
      <div style={S.legMatchup}>{leg.matchup}</div>

      <div style={S.pickRow}>
        <div style={S.pickLeft}>
          <span style={S.check(accent)}>✓</span>
          <span style={S.pickTeam}>{leg.pick}</span>
        </div>
        {leg.win_pct != null ? (
          <span style={{ ...S.winPct, color: accent }}>{leg.win_pct}%</span>
        ) : null}
      </div>

      {g && (g.pick_score != null || g.opp_score != null) ? (
        <div style={S.scoreRow}>
          <span style={S.scoreTeam(pickLead)}>{g.pick_team}</span>
          <span style={S.scoreNum(pickLead)}>{g.pick_score ?? "-"}</span>
          <span style={S.scoreDash}>–</span>
          <span style={S.scoreNum(!pickLead)}>{g.opp_score ?? "-"}</span>
          <span style={S.scoreTeam(!pickLead)}>{g.opp_team}</span>
          {g.data_delayed ? <span style={S.delayed}>DATA DELAYED</span> : null}
        </div>
      ) : g ? (
        <div style={S.noGame}>{g.detail || "Not started"}</div>
      ) : (
        <div style={S.noGame}>Live score unavailable</div>
      )}
    </div>
  );
}

export default function MyBets() {
  const [balance, setBalance] = useState(null);
  const [positions, setPositions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [balRes, posRes] = await Promise.all([
        fetch(`${API_BASE}/balance`),
        fetch(`${API_BASE}/positions`),
      ]);
      if (!balRes.ok) throw new Error(`Balance request failed (${balRes.status})`);
      if (!posRes.ok) throw new Error(`Positions request failed (${posRes.status})`);
      setBalance(await balRes.json());
      setPositions(await posRes.json());
    } catch (e) {
      setError(e.message || "Something went wrong loading your bets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const bets = positions?.market_positions || [];
  const totalPnl = bets.reduce(
    (acc, b) => acc + (Number(b.display?.total_pnl_dollars) || 0),
    0,
  );
  const positionsValue = bets.reduce(
    (acc, b) => acc + (Number(b.display?.current_value_dollars) || 0),
    0,
  );

  const available =
    balance?.balance_dollars != null
      ? usd(balance.balance_dollars)
      : usd((Number(balance?.balance) || 0) / 100);
  const portfolioValue =
    balance?.portfolio_value != null
      ? usd((Number(balance.portfolio_value) || 0) / 100)
      : usd(positionsValue);

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={S.brand}>
          <div style={S.logoDot}>K</div>
          <div style={S.brandName}>My Bets</div>
        </div>
        <button style={S.refreshBtn} onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div style={S.inner}>
        {error ? <div style={S.error}>{error}</div> : null}

        <div style={S.hero}>
          <div style={S.heroLabel}>Portfolio value</div>
          <div style={S.heroValue}>{portfolioValue}</div>
          <div style={S.heroSub}>
            <div style={S.stat}>
              <div style={S.statLabel}>Available balance</div>
              <div style={S.statValue}>{available}</div>
            </div>
            <div style={S.stat}>
              <div style={S.statLabel}>Total P&L</div>
              <div style={{ ...S.statValue, color: pnlColor(totalPnl) }}>
                {pnlStr(totalPnl)}
              </div>
            </div>
            <div style={S.stat}>
              <div style={S.statLabel}>Open bets</div>
              <div style={S.statValue}>{bets.length}</div>
            </div>
          </div>
        </div>

        <div style={S.sectionTitle}>Open positions</div>

        {loading && !positions ? (
          <div style={S.muted}>Loading your bets…</div>
        ) : bets.length === 0 ? (
          <div style={S.muted}>No open positions.</div>
        ) : (
          bets.map((b) => {
            const d = b.display || {};
            const legs = Array.isArray(d.legs) ? d.legs : [];
            const isCombo = legs.length > 1 || (d.leg_count || 0) > 1;
            const chipLegs = legs.length
              ? legs.map((l) => ({
                  side: l.side,
                  label:
                    (l.game && l.game.pick_team) ||
                    String(l.pick || "").replace(/\s+to win$/i, ""),
                }))
              : parseTitleLegs(d.title);
            const pnl = Number(d.total_pnl_dollars) || 0;
            const isOpen = expanded.has(b.ticker);
            const title = isCombo
              ? `${legs.length || d.leg_count}-Leg Parlay`
              : legs[0]?.matchup || parseTitleLegs(d.title)[0]?.label || d.title;
            return (
              <div style={S.bet} key={b.ticker}>
                <div
                  style={S.betHeader}
                  onClick={() => toggle(b.ticker)}
                  role="button"
                  aria-expanded={isOpen}
                >
                  <div style={S.betTop}>
                    <div style={S.betTitleWrap}>
                      <span style={S.chevron(isOpen)}>▶</span>
                      <span style={S.betTitle}>{title}</span>
                    </div>
                    <div style={S.sidePill(d.side)}>
                      {d.side === "no" ? "No" : "Yes"}
                    </div>
                  </div>

                  {isCombo && !isOpen ? (
                    <div style={S.legChips}>
                      {chipLegs.map((leg, i) => (
                        <span style={S.legChip} key={i}>
                          {leg.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {isOpen && legs.length ? (
                  <div style={S.slip}>
                    {legs.map((leg, i) => (
                      <LegSlip leg={leg} key={leg.market_ticker || i} />
                    ))}
                  </div>
                ) : null}

                <div style={S.metrics}>
                  <div>
                    <div style={S.mLabel}>Cost</div>
                    <div style={S.mValue}>{usd(d.cost_dollars)}</div>
                  </div>
                  {isCombo ? (
                    <div>
                      <div style={S.mLabel}>Max payout</div>
                      <div style={S.mValue}>{usd(d.max_payout_dollars)}</div>
                    </div>
                  ) : (
                    <div>
                      <div style={S.mLabel}>Avg price</div>
                      <div style={S.mValue}>{cents(d.avg_price_dollars)}</div>
                    </div>
                  )}
                  <div>
                    <div style={S.mLabel}>Contracts</div>
                    <div style={S.mValue}>{Math.round(d.count) || 0}</div>
                  </div>
                  <div>
                    <div style={S.mLabel}>Value</div>
                    <div style={S.mValue}>{usd(d.current_value_dollars)}</div>
                  </div>
                  <div>
                    <div style={S.mLabel}>P&L</div>
                    <div style={{ ...S.mValue, color: pnlColor(pnl) }}>
                      {pnlStr(pnl)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
