import { useCallback, useEffect, useState } from "react";

/* Morning Briefing — the business side of the day, in one screen.
 *
 * Backend: GET /briefing/today (routes/briefing.js). One call, assembled
 * server-side and cached there, so this page stays a renderer and never fans
 * out to Stripe or the calendar feed itself.
 *
 * WHY THIS IS NOT PART OF /morning-review. That page is the trading desk: it is
 * written by the Kalshi review agents and its whole contract is "three engines
 * wrote three sections". This page is revenue, signups, support and calendar,
 * it has no agent writing it, and it must render on a morning when no agent ran
 * at all. Sharing a page would have meant sharing that dependency.
 *
 * WHY THE KEY PROMPT. The payload carries revenue figures and customer email
 * addresses. Every other private page here is protected only by being unlisted,
 * which is fine for a bet board and not fine for a customer list. Same caching
 * contract as the auto-bet PIN on /morning-review: hold it in localStorage,
 * drop it and re-prompt exactly once on a 401.
 *
 * ORDER IS DELIBERATE. Attention first, because it is the only section that
 * asks anything of you; the numbers below it are glanceable and can wait.
 */
const ROOT = "https://sheline-art-website-api.herokuapp.com";
const KEY_STORAGE = "bv_briefing_key";

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

const money = (cents, currency = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((cents || 0) / 100);

/* The desks write `headline` as free prose and it regularly arrives as five
 * sentences of desk jargon, which lands as a wall of text in a card whose whole
 * job is to be a pointer. Split it so the first sentence reads as the headline
 * and the rest read as supporting lines.
 *
 * Split on end punctuation followed by a capital, never on a bare period —
 * these headlines are full of "-$14.08", "3-6x" and "w=0.49/0.57" and a naive
 * split on "." shatters every one of them onto its own line. Written without a
 * lookbehind on purpose: Safari before 16.4 throws a SyntaxError at parse time,
 * which blanks the entire page rather than just this card. */
const SENTENCE_SPLIT = "\u0000";
function splitSentences(text) {
  return String(text || "")
    .replace(/([.!?])\s+(?=["'(]?[A-Z])/g, `$1${SENTENCE_SPLIT}`)
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter(Boolean);
}

function Panel({ title, subtitle, children }) {
  return (
    <section
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, letterSpacing: 0.3 }}>{title}</h2>
        {subtitle ? (
          <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{subtitle}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/* A section that failed upstream renders as a labelled miss, not as an empty
 * block. "Stripe is down" and "you made no money yesterday" look identical
 * otherwise, and only one of them is worth waking up to. */
function SectionError({ message }) {
  return (
    <div style={{ color: C.amber, fontSize: 13 }}>
      Section unavailable — {message}
    </div>
  );
}

export default function Briefing() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    let key = window.localStorage.getItem(KEY_STORAGE) || "";
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!key) {
        key = window.prompt("Briefing key:") || "";
        if (!key) {
          setErr("no key");
          setLoading(false);
          return;
        }
      }
      try {
        const r = await fetch(
          `${ROOT}/briefing/today${refresh ? "?refresh=1" : ""}`,
          { headers: { "x-briefing-key": key } }
        );
        if (r.status === 401) {
          window.localStorage.removeItem(KEY_STORAGE);
          key = "";
          continue;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        window.localStorage.setItem(KEY_STORAGE, key);
        setData(j);
        setErr(null);
        setLoading(false);
        return;
      } catch (e) {
        setErr(e.message || "backend unreachable");
        setLoading(false);
        return;
      }
    }
    setErr("bad key");
    setLoading(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const wrap = {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    padding: "28px 18px 60px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  };
  const inner = { maxWidth: 900, margin: "0 auto" };

  if (loading && !data) {
    return (
      <div style={wrap}>
        <div style={inner}>Loading briefing…</div>
      </div>
    );
  }
  if (err && !data) {
    return (
      <div style={wrap}>
        <div style={inner}>
          <div style={{ color: C.red, marginBottom: 12 }}>Briefing unavailable — {err}</div>
          <button onClick={() => load(false)} style={btn}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { attention, revenue, signups, calendar, kalshi } = data || {};
  const todayEvents = Array.isArray(calendar) ? calendar.filter((e) => e.isToday) : [];
  const laterEvents = Array.isArray(calendar) ? calendar.filter((e) => !e.isToday) : [];

  return (
    <div style={wrap}>
      <div style={inner}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>☕ Morning Briefing</h1>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
              {data?.date} · {data?.tz} · cached {data?.cachedAgeSeconds ?? 0}s ago
            </div>
          </div>
          <button onClick={() => load(true)} style={btn}>
            Refresh
          </button>
        </header>

        {/* ── Attention ── */}
        <Panel
          title="Needs attention"
          subtitle="The only section that asks something of you."
        >
          {attention?.error ? (
            <SectionError message={attention.error} />
          ) : !attention?.length ? (
            <div style={{ color: C.green, fontSize: 14 }}>Nothing outstanding. 🎉</div>
          ) : (
            attention.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 12px",
                  marginBottom: 8,
                  background: C.chipBg,
                  borderRadius: 8,
                  borderLeft: `3px solid ${
                    a.severity === "high" ? C.red : a.kind === "error" ? C.amber : C.border
                  }`,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{a.why}</div>
                {a.email ? (
                  <a
                    href={`mailto:${a.email}`}
                    style={{ fontSize: 12, color: C.green, textDecoration: "none" }}
                  >
                    {a.email}
                  </a>
                ) : null}
              </div>
            ))
          )}
        </Panel>

        {/* ── Revenue ── */}
        <Panel title="Revenue" subtitle="Succeeded charges, net of refunds.">
          {revenue?.error ? (
            <SectionError message={revenue.error} />
          ) : (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {["yesterday", "today"].map((bucket) => (
                <div key={bucket} style={{ flex: "1 1 240px" }}>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      color: C.muted,
                      marginBottom: 6,
                    }}
                  >
                    {bucket}
                  </div>
                  {(revenue?.[bucket] || []).map((r, i) => (
                    <div
                      key={i}
                      style={{
                        background: C.chipBg,
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 6,
                      }}
                    >
                      {r.error ? (
                        <span style={{ color: C.amber, fontSize: 12.5 }}>
                          {r.account} — {r.error}
                        </span>
                      ) : (
                        <>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>
                            {money(r.netCents, r.currency)}
                          </div>
                          <div style={{ fontSize: 12, color: C.muted }}>
                            {r.account} · {r.count} charge{r.count === 1 ? "" : "s"}
                            {r.refundedCents
                              ? ` · ${money(r.refundedCents, r.currency)} refunded`
                              : ""}
                            {r.truncated ? " · TRUNCATED" : ""}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* ── Signups ── */}
        <Panel title="Signups" subtitle="New orders and registrations by product.">
          {signups?.error ? (
            <SectionError message={signups.error} />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: C.muted, textAlign: "right" }}>
                    <th style={{ textAlign: "left", padding: "6px 8px" }}>Product</th>
                    <th style={{ padding: "6px 8px" }}>Yest.</th>
                    <th style={{ padding: "6px 8px" }}>Today</th>
                    <th style={{ padding: "6px 8px" }}>7d</th>
                    <th style={{ padding: "6px 8px" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(signups || []).map((s) => (
                    <tr key={s.key} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "7px 8px" }}>{s.label}</td>
                      {s.error ? (
                        <td colSpan={4} style={{ padding: "7px 8px", color: C.amber }}>
                          {s.error}
                        </td>
                      ) : (
                        <>
                          <td
                            style={{
                              padding: "7px 8px",
                              textAlign: "right",
                              color: s.yesterday > 0 ? C.green : C.muted,
                              fontWeight: s.yesterday > 0 ? 700 : 400,
                            }}
                          >
                            {s.yesterday}
                          </td>
                          <td style={{ padding: "7px 8px", textAlign: "right" }}>{s.today}</td>
                          <td style={{ padding: "7px 8px", textAlign: "right" }}>{s.week}</td>
                          <td
                            style={{ padding: "7px 8px", textAlign: "right", color: C.muted }}
                          >
                            {s.total}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* ── Calendar ── */}
        <Panel title="Calendar" subtitle="Opportune calendar, next 7 days.">
          {calendar?.error ? (
            <SectionError message={calendar.error} />
          ) : !calendar?.length ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Nothing scheduled.</div>
          ) : (
            <>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: C.muted }}>
                Today
              </div>
              {todayEvents.length ? (
                todayEvents.map((e, i) => (
                  <div key={i} style={{ fontSize: 13.5, padding: "5px 0" }}>
                    <span style={{ color: C.green, fontVariantNumeric: "tabular-nums" }}>
                      {e.time}
                    </span>{" "}
                    {e.summary}
                  </div>
                ))
              ) : (
                <div style={{ color: C.muted, fontSize: 13, padding: "5px 0" }}>Clear.</div>
              )}
              {laterEvents.length ? (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      color: C.muted,
                      marginTop: 12,
                    }}
                  >
                    Coming up
                  </div>
                  {laterEvents.map((e, i) => (
                    <div key={i} style={{ fontSize: 13, padding: "4px 0", color: C.muted }}>
                      {e.day} {e.time} — {e.summary}
                    </div>
                  ))}
                </>
              ) : null}
            </>
          )}
        </Panel>

        {/* ── Kalshi pointer ── */}
        <Panel title="Trading" subtitle="Detail lives on /morning-review.">
          {kalshi?.error ? (
            <SectionError message={kalshi.error} />
          ) : !kalshi?.present ? (
            <div style={{ color: C.muted, fontSize: 13 }}>No report written yet.</div>
          ) : (
            <div>
              {/* Dateline first. It is one short line and it decides whether the
                * paragraph under it is worth reading at all. */}
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  color: kalshi.stale ? C.amber : C.muted,
                  marginBottom: 9,
                }}
              >
                {kalshi.reportDate} · {kalshi.sectionCount} section
                {kalshi.sectionCount === 1 ? "" : "s"}
                {kalshi.stale ? " · STALE — no desk wrote this morning" : ""}
              </div>
              {(() => {
                const [lead, ...rest] = splitSentences(kalshi.headline);
                if (!lead) {
                  return (
                    <div style={{ color: C.muted, fontSize: 13 }}>(no headline)</div>
                  );
                }
                return (
                  <>
                    <div style={{ ...headlineMeasure, fontSize: 14.5, fontWeight: 600 }}>
                      {lead}
                    </div>
                    {rest.map((s, i) => (
                      <div
                        key={i}
                        style={{ ...headlineMeasure, display: "flex", gap: 9, marginTop: 9 }}
                      >
                        <span style={{ color: C.green, flex: "0 0 auto" }} aria-hidden="true">
                          —
                        </span>
                        <span style={{ fontSize: 13.5, color: C.muted }}>{s}</span>
                      </div>
                    ))}
                  </>
                );
              })()}
              <a
                href="/morning-review"
                style={{
                  display: "inline-block",
                  marginTop: 14,
                  fontSize: 12.5,
                  color: C.green,
                }}
              >
                Open Morning Review →
              </a>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* A 900px panel at 13.5px runs ~110 characters a line, which is roughly twice
 * the width the eye tracks comfortably. Cap the measure and open the leading. */
const headlineMeasure = { maxWidth: "62ch", lineHeight: 1.55 };

const btn = {
  background: C.chipBg,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 13,
  cursor: "pointer",
};
