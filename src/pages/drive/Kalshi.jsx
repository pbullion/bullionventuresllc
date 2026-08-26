/* Live Kalshi money.
 *
 * NOTE ON EXPOSURE: /drive is unauthenticated and its route is public, exactly
 * like the other unlisted pages here. Anyone who guesses the URL reads these
 * numbers. That was Patrick's explicit call — it is a read-only view with no
 * order controls of any kind, and nothing here can move a dollar.
 *
 * Everything is degrade-first: the three upstream reads are independent, so a
 * 503 on the balance endpoint still leaves the lifetime record and the open
 * positions on screen. */


import Card from "./Card";

const money = (n, digits = 2) =>
  n == null || Number.isNaN(n) ? "—" : `$${Number(n).toFixed(digits)}`;

const signed = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  const v = Number(n);
  return `${v >= 0 ? "+" : "−"}$${Math.abs(v).toFixed(2)}`;
};

const cls = (n) => (n == null ? "" : Number(n) >= 0 ? "dk__pos" : "dk__neg");

function Kalshi({ data, onExpand }) {
  if (!data?.ok) {
    return (
      <Card title="Kalshi" onExpand={onExpand}>
        <div className="dempty">Portfolio unavailable</div>
      </Card>
    );
  }

  const { cash, portfolio, openPnl, open, lifetime, hidden } = data;
  const record = lifetime ? `${lifetime.wins}–${lifetime.losses}` : "—";
  const roi = lifetime?.roi == null ? null : lifetime.roi * 100;

  return (
    <Card
      title="Kalshi"
      onExpand={onExpand}
      actions={
        <a
          className="dcard__note"
          href="https://kalshi.com/portfolio"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
        >
          Portfolio ↗
        </a>
      }
    >
      <>
        <div className="dk__top">
          <div className="dk__tile">
            <div className="dk__k">Cash</div>
            <div className="dk__v">{money(cash)}</div>
          </div>
          <div className="dk__tile">
            <div className="dk__k">Positions</div>
            <div className="dk__v">{money(portfolio)}</div>
          </div>
          <div className="dk__tile">
            <div className="dk__k">Open P&amp;L</div>
            <div className={`dk__v ${cls(openPnl)}`}>{signed(openPnl)}</div>
          </div>
          <div className="dk__tile">
            <div className="dk__k">Lifetime</div>
            <div className={`dk__v ${cls(lifetime?.pnl)}`}>{signed(lifetime?.pnl)}</div>
          </div>
        </div>

        {open.length === 0 ?
          <div className="dempty">No open positions</div>
        : <div className="dscroll" style={{ flex: 1 }}>
            <div className="dk__list">
              {open.slice(0, 12).map((p) => (
                <div key={p.ticker} className={`dk__row${p.live ? " is-live" : ""}`}>
                  <div style={{ minWidth: 0 }}>
                    <div className="dk__pick">{p.pick || p.title}</div>
                    <div className="dk__sub">
                      {[p.league, p.winPct == null ? null : `${Math.round(p.winPct)}%`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div>
                    <div className="dk__val">{money(p.value)}</div>
                    <div className={`dk__delta ${cls(p.pnl)}`} style={{ textAlign: "right" }}>
                      {signed(p.pnl)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        }

        <div className="dk__foot">
          <span>
            {record}
            {roi == null ? "" : ` · ${roi >= 0 ? "+" : "−"}${Math.abs(roi).toFixed(1)}% ROI`}
          </span>
          <span>
            {open.length} open
            {hidden > 0 ? ` · ${hidden} unlisted` : ""}
          </span>
        </div>
      </>
    </Card>
  );
}

export default Kalshi;
