import { useEffect, useState } from "react";

/* "Why isn't it betting?" — the engine's own plain-English account of itself.
 *
 * Patrick, 2026-08-29: "something on kalshi live that tells me like hey this is
 * why nothing looks like its betting or just basically a running update of the
 * status." Everything here comes whole from GET /kalshi/auto-bets/why — state,
 * headline, reasons, a chip per live league — and this card reasons about
 * nothing itself, so a new gate explained on the server shows up here with no
 * frontend change. The kalshi-live app renders the identical payload.
 *
 * Sits OUTSIDE the collapsible auto-bet panel for the same reason the blocked
 * banner does: an explanation of why nothing is happening is worth nothing
 * behind a disclosure triangle. */

const STATE = {
  betting: { label: "BETTING", color: "#22c55e", bg: "#123021" },
  watching: { label: "WATCHING", color: "#38bdf8", bg: "#0c1a24" },
  idle: { label: "IDLE", color: "#8a93a6", bg: "#1c2430" },
  blocked: { label: "BLOCKED", color: "#ef4444", bg: "#301416" },
  paper: { label: "PAPER", color: "#eab308", bg: "#2a2410" },
  off: { label: "OFF", color: "#ef4444", bg: "#301416" },
};

const clock = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
};

export default function EngineWhyCard({ url }) {
  const [why, setWhy] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!alive) return;
        setWhy(j);
        setErr(null);
      } catch (e) {
        if (alive) setErr(e.message);
      }
    };
    (async () => {
      await load();
    })();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [url]);

  if (!why && !err) return null;
  const st = STATE[why?.state] || STATE.idle;
  const live = (why?.leagues || []).filter((l) => l.live > 0);

  return (
    <div
      style={{
        background: "#151a24",
        border: `1px solid ${st.color}55`,
        borderRadius: 14,
        padding: "12px 14px",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ color: "#e8eaed", fontSize: 15, fontWeight: 800 }}>Why isn't it betting?</div>
        <span
          style={{
            background: st.bg,
            color: st.color,
            borderRadius: 999,
            padding: "3px 9px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
        >
          {st.label}
        </span>
      </div>
      {err ? (
        <div style={{ color: "#8a93a6", fontSize: 12.5, marginTop: 8 }}>
          Couldn't reach the engine: {err}
        </div>
      ) : (
        <>
          <div style={{ color: "#e8eaed", fontSize: 13.5, fontWeight: 700, marginTop: 8 }}>
            {why.headline}
          </div>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {(why.reasons || []).map((r, i) => (
              <li key={i} style={{ color: "#e8eaed", fontSize: 12.5, lineHeight: 1.45, marginBottom: 3 }}>
                {r.text}
              </li>
            ))}
          </ul>
          {live.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {live.map((l) => (
                <span
                  key={l.key}
                  style={{
                    background: "#1c2430",
                    color: "#8a93a6",
                    borderRadius: 999,
                    padding: "3px 9px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {l.label} {l.live} live · {l.candidates} edge{l.candidates === 1 ? "" : "s"}
                  {l.daily_cap ? ` · $${Math.round(l.staked_today)}/$${l.daily_cap}` : ""}
                </span>
              ))}
            </div>
          )}
          <div style={{ color: "#8a93a6", fontSize: 11, marginTop: 8 }}>
            Updated {clock(why.generated_at)} · refreshes every 30s · ${Number(why.today?.remaining ?? 0).toFixed(0)} of the ${why.today?.daily_cap} daily cap left
          </div>
        </>
      )}
    </div>
  );
}
