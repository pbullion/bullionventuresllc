/* Indices and holdings, with an intraday sparkline per row.
 *
 * The sparkline is drawn from 40 downsampled closes (the backend thins the full
 * ~1,800-bar day; see data.js). Two deliberate choices in here:
 *
 *   - THE LINE IS COLOURED AGAINST THE PREVIOUS CLOSE, not against its own
 *     first point. A stock can open below yesterday's close and rise all day —
 *     green against its open, red on the day. The number beside it is the day's
 *     change, so the line has to agree with the number or the row contradicts
 *     itself at a glance.
 *   - THE DASHED BASELINE IS THE PREVIOUS CLOSE, and it is only drawn when it
 *     actually falls inside the day's range. Clamped to the edge it would read
 *     as a boundary of the chart rather than a reference price, which is worse
 *     than leaving it out.
 *
 * Everything degrades to a dash. A row whose quote failed still renders with
 * its ticker so the panel keeps its shape — a card that changes height when one
 * upstream hiccups is a card that moves under a driver's thumb. */

import Card from "./Card";
import { pct, price } from "./data";

const SPARK_W = 88;
const SPARK_H = 26;

/* Exported so the full-screen panel draws the identical line — two copies of
 * this geometry would drift the moment either one is tuned. */
export function Spark({ points, prevClose, up }) {
  if (!points || points.length < 2) return <span className="dst__spark" aria-hidden="true" />;

  let lo = Math.min(...points);
  let hi = Math.max(...points);
  /* A baseline outside the day's range would be clipped, so widen the window to
   * include it — that is what makes the dashed line meaningful rather than
   * decorative. */
  const showBase = prevClose != null && prevClose >= lo && prevClose <= hi;
  if (prevClose != null) {
    lo = Math.min(lo, prevClose);
    hi = Math.max(hi, prevClose);
  }
  // A perfectly flat series would divide by zero; draw it down the middle.
  const span = hi - lo || 1;
  const y = (v) => SPARK_H - ((v - lo) / span) * SPARK_H;
  const step = SPARK_W / (points.length - 1);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${y(v).toFixed(2)}`).join(" ");

  return (
    <svg
      className="dst__spark"
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {showBase && (
        <line
          x1="0"
          x2={SPARK_W}
          y1={y(prevClose).toFixed(2)}
          y2={y(prevClose).toFixed(2)}
          className="dst__base"
        />
      )}
      <path d={d} className={`dst__line ${up ? "is-up" : "is-down"}`} />
    </svg>
  );
}

function Row({ row }) {
  const up = (row.changePct ?? 0) >= 0;
  return (
    <div className="dst__row">
      <div className="dst__id">
        <div className="dst__ticker">{row.ticker}</div>
        <div className="dst__name">{row.label}</div>
      </div>
      <Spark points={row.spark} prevClose={row.prevClose} up={up} />
      <div className="dst__right">
        <div className="dst__price">{price(row.price)}</div>
        <div className={`dst__pill ${row.price == null ? "is-dead" : up ? "is-up" : "is-down"}`}>
          {pct(row.changePct)}
        </div>
      </div>
    </div>
  );
}

function Stocks({ data, onExpand }) {
  if (!data?.rows?.length) {
    return (
      <Card title="Markets" onExpand={onExpand}>
        <div className="dempty">Quotes unavailable</div>
      </Card>
    );
  }

  const stale = data.rows.some((r) => r.stale);

  return (
    <Card title="Markets" note={stale ? "delayed" : null} onExpand={onExpand}>
      <div className="dscroll" style={{ flex: 1 }}>
        <div className="dst__list">
          {data.rows.map((r) => (
            <Row key={r.symbol} row={r} />
          ))}
        </div>
      </div>
    </Card>
  );
}

export default Stocks;
