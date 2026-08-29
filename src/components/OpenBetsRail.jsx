import { useEffect, useState } from "react";

/* Live My Bets positions, as a right-hand rail on /crypto-value and
 * /totals-value — the page you're reading a model on is the page where you
 * want to see what you already hold on it. Each page passes the `domain` it
 * cares about and gets only those positions.
 *
 * Desktop only, and deliberately so: it's a secondary read, and on a phone it
 * would push the actual page content down a screen. The host page hides it
 * under its breakpoint via the `bv-rail` class (there's no media query in an
 * inline style object), so this component never renders narrow. */

const API_BASE = "https://sheline-art-website-api.herokuapp.com/kalshi";

/* Kalshi crypto tickers are KX<ASSET><HORIZON>-…: KXBTC15M-… for the 15-minute
 * markets, KXBTCD-… for the hourlies. Matching the asset alone (rather than
 * the full horizon vocabulary) keeps a new horizon from silently vanishing
 * from the rail. Everything that isn't crypto is treated as sports, so a new
 * league shows up on /totals-value without a code change. */
const CRYPTO_TICKER = /^KX(BTC|ETH|XRP|SOL|DOGE)[A-Z0-9]*-/;
/* Weather engine series: the original KXHIGH<city> family, the 8/27 expansion's
 * KXHIGHT<city>, and the daily-LOW KXLOWT<city> markets. Before this existed,
 * "everything that isn't crypto is sports" put weather positions on the
 * /totals-value rail — Patrick, 2026-08-19. */
const WEATHER_TICKER = /^(KXHIGH|KXLOWT)/;
/* Gas engine: the AAA ladders (KXAAAGASD, KXAAAGASDCA, KXAAAGASW, …). Without
 * this the same fall-through bug returned on 2026-08-28 — the engine's first
 * real position, a Florida gas contract, was sitting on the SPORTS rail. */
const GAS_TICKER = /^KXAAAGAS/;
const DOMAIN_LABEL = {
  crypto: "crypto",
  weather: "weather",
  gas: "gas",
  sports: "sports",
};

/* Same permanent hide as the Open tab on /my-bets — a dead futures market that
 * won't SETTLE for months and would otherwise sit in the rail forever. Keep in
 * step with ALWAYS_HIDDEN_TICKERS in src/pages/my-bets/index.jsx. */
const ALWAYS_HIDDEN_TICKERS = new Set(["KXNEXTTEAMNBA-26LJAM-MIA"]);

const C = {
  panel: "#151a24",
  border: "#252c3a",
  text: "#e8eaed",
  muted: "#8a93a6",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#eab308",
  chipBg: "#1c2430",
  rowBorder: "#1e2530",
  // Same quieter green /my-bets uses for profit, so the two pages agree. It has
  // to differ from `green`: P&L sits on the same line in bright green/red, and
  // two identical greens beside each other read as one figure.
  greenDim: "#479463",
};

const usd = (v) => `${v < 0 ? "-" : ""}$${Math.abs(Number(v) || 0).toFixed(2)}`;
const pnlColor = (v) => (v > 0 ? C.green : v < 0 ? C.red : C.muted);
const pnlStr = (v) => `${v > 0 ? "+" : ""}${usd(v)}`;
/* What the position clears if it wins: gross payout less what it cost, with the
 * cost already including Kalshi's entry fee. Same figure and same derivation as
 * /my-bets — deliberately NOT the P&L beside it, which is mark-to-market and
 * moves with the price, where this is fixed the moment the bet fills. */
const profitOf = (d) =>
  (Number(d.max_payout_dollars) || 0) - (Number(d.cost_dollars) || 0);
/* Sellable-right-now value, shown only when it disagrees with the mark by more
 * than 2c. Same rule and reasoning as /my-bets — see cashOutGap there. */
const CASH_OUT_MIN_GAP_CENTS = 2;
const cashOutGap = (d) => {
  const co = d.cash_out_value_dollars;
  if (co == null) return null;
  const n = Number(co);
  if (!Number.isFinite(n)) return null;
  const value = Number(d.current_value_dollars) || 0;
  // Gate on the gross bid, display the net — see the note in /my-bets.
  const gross = Number(d.cash_out_value_gross_dollars ?? co);
  // Whole cents, not dollars — see the note on cashOutGap in /my-bets: a 2c gap
  // compared in float is 0.019999… and would hide a real spread.
  const gapCents = Math.round(gross * 100) - Math.round(value * 100);
  return Math.abs(gapCents) >= CASH_OUT_MIN_GAP_CENTS ? n : null;
};

/* What taking that bid banks against cost — the up/down, so the rail doesn't
 * ask you to subtract two of its own figures. Same derivation and same wording
 * as /my-bets; only ever rendered beside a non-null cashOutGap. */
const cashOutDelta = (d) => cashOutGap(d) - (Number(d.cost_dollars) || 0);

export default function OpenBetsRail({ domain }) {
  const [positions, setPositions] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/positions`);
        const j = await r.json();
        if (!alive) return;
        setPositions(j.market_positions || []);
        setErr(null);
      } catch {
        if (alive) setErr("positions unavailable");
      }
    };
    load();
    /* 30s, matching the /totals-value panel. Every open tab multiplies the
       Kalshi API load, so don't tighten this. */
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const bets = (positions || [])
    .filter((p) => {
      if (ALWAYS_HIDDEN_TICKERS.has(p.ticker)) return false;
      const isCrypto = CRYPTO_TICKER.test(p.ticker || "");
      const isWeather = WEATHER_TICKER.test(p.ticker || "");
      const isGas = GAS_TICKER.test(p.ticker || "");
      if (domain === "crypto") return isCrypto;
      if (domain === "weather") return isWeather;
      if (domain === "gas") return isGas;
      // sports = the remainder, so a new league still shows up with no change
      return !isCrypto && !isWeather && !isGas;
    })
    .sort(
      (a, b) =>
        (b.display?.current_value_dollars || 0) -
        (a.display?.current_value_dollars || 0),
    );

  const totalValue = bets.reduce(
    (s, b) => s + (Number(b.display?.current_value_dollars) || 0),
    0,
  );
  const totalPnl = bets.reduce(
    (s, b) => s + (Number(b.display?.total_pnl_dollars) || 0),
    0,
  );
  const totalProfit = bets.reduce((s, b) => s + profitOf(b.display || {}), 0);

  return (
    <aside className="bv-rail">
      <div style={S.head}>
        <span style={S.headTitle}>
          Open {DOMAIN_LABEL[domain] || "sports"} bets
        </span>
        <a href="/my-bets" style={S.headLink}>
          my bets →
        </a>
      </div>

      {bets.length > 0 && (
        <div style={S.totals}>
          <span>{usd(totalValue)} value</span>
          <span style={{ color: pnlColor(totalPnl) }}>{pnlStr(totalPnl)}</span>
          {/* The rail's equivalent of the "If all win" stat on /my-bets: what
              every open position here clears if they all come in. */}
          <span style={{ color: C.greenDim, fontWeight: 700 }}>
            +{usd(totalProfit)} if all win
          </span>
        </div>
      )}

      {err && <div style={S.empty}>{err}</div>}
      {!err && positions == null && <div style={S.empty}>loading…</div>}
      {!err && positions != null && bets.length === 0 && (
        <div style={S.empty}>
          No open {DOMAIN_LABEL[domain] || "sports"} positions.
        </div>
      )}

      {bets.map((b) => {
        const d = b.display || {};
        const leg = (d.legs || [])[0] || {};
        const pnl = Number(d.total_pnl_dollars) || 0;
        return (
          <div key={b.ticker} style={S.row}>
            <div style={S.rowTitle}>
              {d.leg_count > 1
                ? `${d.leg_count}-leg parlay`
                : leg.pick || d.title || b.ticker}
            </div>
            {d.leg_count > 1 ? null : (
              <div style={S.rowSub}>{leg.matchup || d.title}</div>
            )}
            <div style={S.rowFoot}>
              <span>
                {d.count}× @ {Math.round((d.avg_price_dollars || 0) * 100)}¢
              </span>
              <span style={{ color: C.text }}>
                {usd(d.current_value_dollars || 0)}
              </span>
              <span style={{ color: pnlColor(pnl), fontWeight: 700 }}>
                {pnlStr(pnl)}
              </span>
              {/* Own full-width line: four figures don't fit a 320px rail, and
                  letting them wrap wherever they landed made the rows ragged. */}
              <span style={S.rowProfit}>
                +{usd(profitOf(d))} profit if it wins
              </span>
              {cashOutGap(d) != null && (
                <span style={S.rowCashOut}>
                  cash out {usd(cashOutGap(d))} now{" "}
                  <span style={{ color: pnlColor(cashOutDelta(d)) }}>
                    ({pnlStr(cashOutDelta(d))})
                  </span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

const S = {
  head: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
  },
  headTitle: { fontSize: 13, fontWeight: 800, color: C.text },
  headLink: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: 700,
    color: C.text,
    background: C.chipBg,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "3px 9px",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  totals: {
    display: "flex",
    gap: 10,
    fontSize: 11.5,
    color: C.muted,
    marginBottom: 8,
  },
  empty: { fontSize: 12, color: C.muted, padding: "4px 0" },
  row: {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "8px 10px",
    marginBottom: 8,
  },
  rowTitle: {
    fontSize: 12.5,
    fontWeight: 700,
    color: C.text,
    lineHeight: 1.3,
  },
  rowSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
    lineHeight: 1.3,
  },
  rowFoot: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 3,
    marginTop: 6,
    fontSize: 11.5,
    color: C.muted,
    borderTop: `1px solid ${C.rowBorder}`,
    paddingTop: 5,
  },
  // flexBasis 100% claims its own row rather than wrapping unpredictably next to
  // whichever figure happens to fit.
  rowProfit: { flexBasis: "100%", color: C.greenDim, fontWeight: 700 },
  // Its own row too, and amber for the same reason as /my-bets: it only appears
  // when the sellable price contradicts the value above it.
  rowCashOut: { flexBasis: "100%", color: C.amber, fontWeight: 600 },
};
