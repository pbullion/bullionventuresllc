/* Why an engine isn't betting, said out loud.
 *
 * Both engines can stop for engine-wide reasons — the $75 account floor, the
 * daily loss cap, the give-back guard, a database read that failed — and none
 * of it used to reach a screen. The pages showed "loop live", the ledger showed
 * no bets, and the two are indistinguishable from a quiet night. On 2026-08-17
 * the sports engine had been frozen against a $36.66 balance since 17:23 the
 * evening before and the only way to learn that was to query the database.
 *
 * The backend now publishes `blocked` on both status endpoints
 * (`/kalshi/auto-bets/status` and `/kalshi-crypto/auto-bets/status`) in one
 * shape, which is what this renders:
 *
 *   { reason, label, detail, since, at }
 *
 * `since` is when the block started; `at` is the last pass that confirmed it.
 * A stale `at` matters — the sports loop only runs while games are live, so a
 * verdict from four hours ago may simply be the newest one that exists rather
 * than the current truth. Say which it is instead of implying freshness. */

const AGE_STALE_SECS = 15 * 60;

/* Module-level, like totals-value's timeAgo: reading the clock inside a
   component body is a render-purity lint error, and these are only ever needed
   while building the message. */
const agoSecs = (iso) => {
  if (!iso) return null;
  const secs = Math.round((Date.now() - Date.parse(iso)) / 1000);
  return Number.isFinite(secs) && secs >= 0 ? secs : null;
};

const ago = (iso) => {
  const secs = agoSecs(iso);
  if (secs == null) return null;
  if (secs < 90) return `${secs}s ago`;
  if (secs < 60 * 90) return `${Math.round(secs / 60)}m ago`;
  if (secs < 60 * 60 * 36) return `${Math.round(secs / 3600)}h ago`;
  return `${Math.round(secs / 86400)}d ago`;
};

/* Money problems are red — they need a deposit and nothing resumes without
   one. Everything else is amber: caps and guards clear themselves at midnight,
   and a DB blip clears on the next pass. */
const SEVERE = new Set(["below-min-balance", "low-balance"]);

export default function EngineBlockedBanner({ blocked, engine, style }) {
  if (!blocked || !blocked.detail) return null;

  const severe = SEVERE.has(blocked.reason);
  const color = severe ? "#ef4444" : "#eab308";
  const bg = severe ? "#301416" : "#2a2410";
  const sinceTxt = ago(blocked.since);
  const confirmedSecs = agoSecs(blocked.at);
  const stale = confirmedSecs != null && confirmedSecs > AGE_STALE_SECS;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}`,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 12,
        ...style,
      }}
    >
      <div
        style={{
          color,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.2,
          marginBottom: 3,
        }}
      >
        ⛔ {engine ? `${engine}: ` : ""}
        {blocked.label || "Not betting"}
        {sinceTxt ? (
          <span style={{ fontWeight: 500, opacity: 0.8 }}> · since {sinceTxt}</span>
        ) : null}
      </div>
      <div style={{ color: "#e8eaed", fontSize: 13, lineHeight: 1.45 }}>
        {blocked.detail}
      </div>
      {stale && (
        /* Not decoration: without it a four-hour-old reading reads as current.
           The sports loop stops entirely between slates, so its last verdict
           can outlive the condition that produced it. */
        <div style={{ color: "#8a93a6", fontSize: 11, marginTop: 4 }}>
          Last confirmed {ago(blocked.at)} — the loop hasn't re-checked since.
        </div>
      )}
    </div>
  );
}
