import { useEffect, useState } from "react";

/* Morning Review — renders the daily report written by the scheduled 7am CT
 * cloud review agent (backend: GET /kalshi/morning-report, table
 * kalshi_morning_reports). The agent synthesizes both betting engines'
 * nights — what happened, what was learned, what changed, what's being
 * watched — so this page answers those questions before they're asked.
 * Report shape: { headline, sections: [{title, body}] }, body = plain text
 * with newlines. */
const API_BASE = "https://sheline-art-website-api.herokuapp.com/kalshi";

const C = {
  bg: "#0b0e14",
  panel: "#151a24",
  border: "#252c3a",
  text: "#e8eaed",
  muted: "#8a93a6",
  green: "#22c55e",
  amber: "#eab308",
  chipBg: "#1c2430",
};

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

export default function MorningReview() {
  const [report, setReport] = useState(null); // {report_date, created_at, report}
  const [history, setHistory] = useState([]);
  const [date, setDate] = useState(null); // null = latest
  const [err, setErr] = useState(null);

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "16px 12px 40px",
        maxWidth: 780,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 4,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          ☕ Morning Review
        </h1>
        {err && <span style={{ fontSize: 11, color: C.amber }}>{err}</span>}
        <span
          style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: 12 }}
        >
          <a href="/totals-value" style={{ color: C.muted }}>
            sports →
          </a>
          <a href="/crypto-value" style={{ color: C.muted }}>
            crypto →
          </a>
        </span>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
        Written by the 7am scheduled review agent · covers both betting
        engines&apos; previous day
      </div>

      {report ? (
        <>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
            {fmtDate(report.report_date)}
          </div>
          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.4 }}>
              {report.report.headline}
            </div>
          </div>
          {(report.report.sections || []).map((s) => (
            <div
              key={s.title}
              style={{
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 8,
                  color: C.green,
                }}
              >
                {s.title}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}
              >
                {s.body}
              </div>
            </div>
          ))}
        </>
      ) : (
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 16,
            color: C.muted,
            fontSize: 13,
          }}
        >
          {date
            ? "No report for that day."
            : "No report yet — the first one lands after the next 7am CT run."}
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
              const active = report && String(report.report_date).slice(0, 10) === d;
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  style={{
                    textAlign: "left",
                    background: active ? C.chipBg : "transparent",
                    border: `1px solid ${active ? C.border : "transparent"}`,
                    borderRadius: 8,
                    padding: "6px 10px",
                    color: C.text,
                    fontSize: 12.5,
                    cursor: "pointer",
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
