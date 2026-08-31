import { C, money } from "./theme.js";

/* The two ledgers, numbers first — the block that answers "how is it doing?"
 * before anything explains itself.
 *
 * /weather-value and /gas-value both ran a hand-rolled version of this; it is
 * shared so a third engine born paper-first gets the same two tiles for free,
 * and so the REAL/PAPER distinction is phrased identically wherever it appears.
 *
 * Both ledgers keep writing in live mode ON PURPOSE. The paper ledger is the
 * model's judge — "the model is right" and "the account is up" are two
 * different questions, and a page that folded them together could not answer
 * either. That is why PAPER is labelled as the judge rather than as a leftover.
 */
export default function LedgerTiles({ tiles }) {
  return (
    <div
      style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}
    >
      {tiles.map(({ label, sub, pnl }) => (
        <div
          key={label}
          style={{
            flex: "1 1 240px",
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>
            {label}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: pnl > 0 ? C.green : pnl < 0 ? C.red : C.text,
            }}
          >
            {money(pnl)}
          </div>
          {sub ? (
            <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
              {sub}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
