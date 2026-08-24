import { useCallback, useEffect, useState } from "react";

/* Morning Review — the three nightly review desks in one page.
 *
 * Backend: GET/POST /kalshi/morning-report (table kalshi_morning_reports).
 * Three independent review agents write one section each — sports 2:07,
 * weather 2:22, crypto 2:37 CT — via the per-engine merge shape, so a section
 * arriving late never clobbers one that arrived early.
 *
 * Report shape: { headline, sections: [{ engine, title, body, actions[] }] }
 * where body is plain text with newlines and each action is a PROPOSAL:
 *   { label, method, path, payload, why, expect, stop }
 *
 * WHY THE ACTIONS LIVE HERE AND NOT IN THE AGENT. The agents never hold
 * AUTOBET_ADMIN_PIN — they can write a report and nothing else. Applying a
 * change is a PIN-gated POST made from this browser, which caches the PIN in
 * localStorage exactly like the kill switch on /totals-value and /crypto-value.
 * So the agent recommends, the human applies, and an agent that gets confused
 * or hijacked can produce a bad paragraph but cannot move money.
 *
 * The live status strip is deliberately independent of whether any report
 * exists: on a morning when no agent ran, the page still answers "are the three
 * engines alive, and is one of them blocked?".
 */
const ROOT = "https://sheline-art-website-api.herokuapp.com";
const API_BASE = `${ROOT}/kalshi`;

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

/* One accent per engine, reused by the section border, the chip and the
 * status strip so a colour always means the same desk. */
const ENGINES = [
  { key: "sports", label: "Sports", icon: "🏟", accent: "#38bdf8", status: `${ROOT}/kalshi/auto-bets/status`, href: "/totals-value" },
  { key: "weather", label: "Weather", icon: "🌡", accent: "#f59e0b", status: `${ROOT}/kalshi-weather/auto-bets/status`, href: "/weather-value" },
  { key: "crypto", label: "Crypto", icon: "🪙", accent: "#a78bfa", status: `${ROOT}/kalshi-crypto/auto-bets/status`, href: "/crypto-value" },
];
const byKey = (k) => ENGINES.find((e) => e.key === k) || ENGINES[0];

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Chicago",
  }).format(d);
};

const card = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
};

export default function MorningReview() {
  const [report, setReport] = useState(null); // {report_date, created_at, report}
  const [history, setHistory] = useState([]);
  const [date, setDate] = useState(null); // null = latest
  const [err, setErr] = useState(null);
  const [status, setStatus] = useState({}); // engine key -> status payload
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState({}); // action key -> 'ok' | 'err'

  useEffect(() => {
    (async () => {
      try {
        const qs = date ? `?date=${date}` : "";
        const [r, h] = await Promise.all([
          fetch(`${API_BASE}/morning-report${qs}`).then((x) => x.json()),
          fetch(`${API_BASE}/morning-report?list=1&limit=14`).then((x) =>
            x.json()
          ),
        ]);
        setReport(r && r.report ? r : null);
        setHistory(h.reports || []);
        setErr(null);
      } catch {
        setErr("backend unreachable");
      }
    })();
  }, [date]);

  /* Status is fetched once, not per report date — it is always "right now",
   * even when you are reading last Tuesday's report. */
  useEffect(() => {
    ENGINES.forEach(async (e) => {
      try {
        const s = await fetch(e.status).then((x) => x.json());
        setStatus((prev) => ({ ...prev, [e.key]: s }));
      } catch {
        setStatus((prev) => ({ ...prev, [e.key]: { error: true } }));
      }
    });
  }, []);

  /* Same contract as the kill switch on the engine pages: cache the PIN after
   * a success, drop it and re-prompt once on a 401. */
  const postWithPin = useCallback(async (path, payload = {}) => {
    let pin = window.localStorage.getItem("bv_autobet_pin") || "";
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!pin) {
        pin = window.prompt("Auto-bet PIN:") || "";
        if (!pin) return null;
      }
      setBusy(true);
      try {
        const r = await fetch(`${ROOT}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, pin }),
        });
        if (r.status === 401) {
          window.localStorage.removeItem("bv_autobet_pin");
          pin = "";
          continue;
        }
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          window.alert(e.error || `HTTP ${r.status}`);
          return null;
        }
        window.localStorage.setItem("bv_autobet_pin", pin);
        return (await r.json().catch(() => ({}))) || {};
      } catch {
        window.alert("request failed");
        return null;
      } finally {
        setBusy(false);
      }
    }
    window.alert("Wrong PIN.");
    return null;
  }, []);

  const applyAction = async (a, key) => {
    const what = a.label || `${a.path} ${JSON.stringify(a.payload || {})}`;
    if (!window.confirm(`Apply this change?\n\n${what}`)) return;
    const res = await postWithPin(a.path, a.payload || {});
    setDone((p) => ({ ...p, [key]: res ? "ok" : "err" }));
  };

  const sections = (report && report.report && report.report.sections) || [];
  const reported = new Set(sections.map((s) => s.engine).filter(Boolean));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        /* Safe-area padding so the iPhone notch and home indicator never clip
         * the first chip or the last button. */
        padding:
          "max(14px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) calc(40px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
        maxWidth: 780,
        margin: "0 auto",
        WebkitTextSizeAdjust: "100%",
        overflowWrap: "anywhere", // long tickers must wrap, never scroll the page
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>
          ☕ Morning Review
        </h1>
        {err && <span style={{ fontSize: 11, color: C.amber }}>{err}</span>}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, margin: "6px 0 14px" }}>
        Three review desks, one per engine, written overnight — sports 2:07,
        weather 2:22, crypto 2:37 CT.
      </div>

      {/* Live status strip — true regardless of which report you are reading. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {ENGINES.map((e) => {
          const s = status[e.key] || {};
          const blocked = s.blocked && s.blocked.label;
          const killed = s.killed;
          const state = s.error
            ? { t: "unreachable", c: C.amber }
            : killed
              ? { t: "killed", c: C.red }
              : blocked
                ? { t: s.blocked.label, c: C.amber }
                : s.enabled
                  ? { t: s.mode === "paper" ? "paper" : "live", c: C.green }
                  : { t: "off", c: C.muted };
          const today = s.today || {};
          return (
            <a
              key={e.key}
              href={e.href}
              style={{
                display: "block",
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${e.accent}`,
                borderRadius: 12,
                padding: "10px 12px",
                textDecoration: "none",
                color: C.text,
                minHeight: 44,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span aria-hidden>{e.icon}</span>
                {e.label}
                {reported.has(e.key) && (
                  <span
                    title="reported this morning"
                    style={{ color: C.green, fontSize: 11 }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: state.c, marginTop: 3 }}>
                {state.t}
              </div>
              {today.placed != null && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {today.placed} placed today
                </div>
              )}
            </a>
          );
        })}
      </div>

      {report ? (
        <>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 6 }}>
            {fmtDate(report.report_date)}
          </div>
          {report.report.headline && (
            <div style={card}>
              <div style={{ fontSize: 16.5, fontWeight: 800, lineHeight: 1.45 }}>
                {report.report.headline}
              </div>
            </div>
          )}
          {sections.map((s) => {
            const e = byKey(s.engine);
            return (
              <div
                key={s.engine || s.title}
                style={{ ...card, borderLeft: `3px solid ${e.accent}` }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: e.accent,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span aria-hidden>{e.icon}</span>
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {s.body}
                </div>

                {Array.isArray(s.actions) && s.actions.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        marginBottom: 8,
                      }}
                    >
                      Proposed — nothing applied until you tap
                    </div>
                    {s.actions.map((a, i) => {
                      const key = `${report.report_date}:${s.engine}:${i}`;
                      const st = done[key];
                      return (
                        <div
                          key={key}
                          style={{
                            background: C.chipBg,
                            border: `1px solid ${C.border}`,
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                            {a.label ||
                              `${a.path} ${JSON.stringify(a.payload || {})}`}
                          </div>
                          {a.why && (
                            <div
                              style={{
                                fontSize: 12.5,
                                color: C.muted,
                                marginTop: 4,
                                lineHeight: 1.5,
                              }}
                            >
                              {a.why}
                            </div>
                          )}
                          {a.expect && (
                            <div
                              style={{
                                fontSize: 12,
                                color: C.muted,
                                marginTop: 4,
                              }}
                            >
                              Expect: {a.expect}
                            </div>
                          )}
                          {a.stop && (
                            <div
                              style={{
                                fontSize: 12,
                                color: C.amber,
                                marginTop: 4,
                              }}
                            >
                              Stop: {a.stop}
                            </div>
                          )}
                          <button
                            disabled={busy || st === "ok"}
                            onClick={() => applyAction(a, key)}
                            style={{
                              marginTop: 10,
                              width: "100%",
                              minHeight: 44, // thumb-sized, this is read on a phone
                              borderRadius: 10,
                              border: `1px solid ${st === "ok" ? C.green : C.border}`,
                              background: st === "ok" ? "#0f2a1a" : e.accent,
                              color: st === "ok" ? C.green : "#0b0e14",
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: busy ? "wait" : "pointer",
                              opacity: busy ? 0.6 : 1,
                            }}
                          >
                            {st === "ok"
                              ? "✓ Applied"
                              : st === "err"
                                ? "Retry"
                                : "Apply"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {/* Which desks did not file. Silence from an engine is information. */}
          {ENGINES.filter((e) => !reported.has(e.key)).length > 0 && (
            <div style={{ ...card, color: C.muted, fontSize: 12.5 }}>
              No report from{" "}
              {ENGINES.filter((e) => !reported.has(e.key))
                .map((e) => e.label)
                .join(", ")}{" "}
              for this date.
            </div>
          )}
        </>
      ) : (
        <div style={{ ...card, color: C.muted, fontSize: 13.5 }}>
          {date
            ? "No report for that day."
            : "No report yet — the desks file overnight, between 2:07 and 2:37 CT."}
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
            Previous mornings
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {history.map((h) => {
              const d = String(h.report_date).slice(0, 10);
              const active =
                report && String(report.report_date).slice(0, 10) === d;
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  style={{
                    textAlign: "left",
                    background: active ? C.chipBg : "transparent",
                    border: `1px solid ${active ? C.border : "transparent"}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    minHeight: 44,
                    color: C.text,
                    fontSize: 13,
                    cursor: "pointer",
                    lineHeight: 1.45,
                  }}
                >
                  <span style={{ color: C.muted, marginRight: 8 }}>{d}</span>
                  {h.headline}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
