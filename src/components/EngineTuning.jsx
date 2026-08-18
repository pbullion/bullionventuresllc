import { useCallback, useEffect, useState } from "react";

/* Engine tuning, editable from the page.
 *
 * Every knob in here used to be `heroku config:set`, which restarts the dyno
 * and therefore the betting loop — so changing a threshold cost an outage, and
 * you could only do it from a machine with the CLI. Patrick, 2026-08-18: "Make
 * all those things that I can change on the website and not have to come to the
 * CLI."
 *
 * This renders itself from GET /auto-bets/config. The backend registry
 * (services/engineOverrides.js) owns the label, the help text, the bound and
 * the formatting hint, so ADDING A KNOB IS A BACKEND-ONLY CHANGE — there is
 * deliberately no list of knobs in this file to fall out of sync.
 *
 * Bounds are enforced server-side and rejected rather than clamped; postWithPin
 * already alerts the error body, so a typo shows the range it violated. The
 * range is also printed in the prompt, because being told after the fact is
 * worse than being told before.
 */

const fmtValue = (row) => {
  const v = row.value;
  if (row.kind === "bool") return v ? "ON" : "OFF";
  if (v == null) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  switch (row.fmt) {
    case "money":
      return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
    // Edges, prices and spreads are read in cents everywhere else on these
    // pages; showing 0.05 here and "5¢" two panels up would be two dialects.
    case "cents":
      return `${Math.round(n * 100)}¢`;
    case "pct":
      return `${Math.round(n * 1000) / 10}%`;
    default:
      return String(n);
  }
};

const fmtRange = (row) => {
  if (row.kind === "bool") return "on / off";
  const f = (x) =>
    row.fmt === "cents" ? `${Math.round(x * 100)}¢` : String(x);
  return `${f(row.min)} to ${f(row.max)}`;
};

export default function EngineTuning({ apiBase, post, busy, C, storageKey }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false; // closed by default: this is a drawer of sharp objects
    }
  });

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${apiBase}/auto-bets/config`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = await r.json();
      setRows(Array.isArray(body.settings) ? body.settings : []);
      setErr("");
    } catch (e) {
      // Older backend deploys have no such endpoint; say so rather than
      // rendering an empty panel that looks like "no settings exist".
      setErr(e.message || "could not load settings");
    }
  }, [apiBase]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const toggleOpen = () =>
    setOpen((o) => {
      const next = !o;
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* collapse state just won't persist */
      }
      return next;
    });

  const edit = async (row) => {
    let value;
    if (row.kind === "bool") {
      if (
        !window.confirm(
          `${row.label}\n\n${row.help}\n\nTurn ${row.value ? "OFF" : "ON"}?`,
        )
      )
        return;
      value = !row.value;
    } else {
      const raw = window.prompt(
        `${row.label}\n\n${row.help}\n\nRange: ${fmtRange(row)}` +
          `${row.integer ? " (whole numbers)" : ""}\n` +
          `Server default is ${row.env}. Leave blank to reset to it.`,
        row.value == null ? "" : String(row.value),
      );
      if (raw === null) return; // cancelled — not the same as blank
      value = raw.trim() === "" ? null : raw.trim();
    }
    const res = await post("/auto-bets/config", { key: row.key, value });
    if (res) await load();
  };

  const overridden = (rows || []).filter((r) => r.overridden).length;

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      <div
        onClick={toggleOpen}
        style={{
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 15 }}>🎛 Tuning</div>
        {overridden > 0 && (
          <span
            style={{
              background: C.chipBg,
              color: C.amber,
              border: `1px solid ${C.amber}`,
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {overridden} CHANGED
          </span>
        )}
        <span style={{ color: C.muted, fontSize: 12, flex: 1 }}>
          {err
            ? err
            : rows
              ? `${rows.length} settings · guards, sizing and gates · no deploy needed`
              : "loading…"}
        </span>
        <div style={{ color: C.muted, fontSize: 18 }}>{open ? "▾" : "▸"}</div>
      </div>

      {open && rows && (
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            padding: "8px 16px 14px",
          }}
        >
          {rows.map((row) => (
            <div
              key={row.key}
              onClick={() => !busy && edit(row)}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "baseline",
                padding: "9px 0",
                borderBottom: `1px solid ${C.border}`,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.5 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {row.label}
                  {row.overridden && (
                    <span style={{ color: C.amber, fontWeight: 800 }}>
                      {" "}
                      ·changed
                    </span>
                  )}
                </div>
                <div style={{ color: C.muted, fontSize: 11, lineHeight: 1.4 }}>
                  {row.help}
                </div>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: row.overridden ? C.amber : C.text,
                  whiteSpace: "nowrap",
                }}
              >
                {fmtValue(row)} ✎
              </div>
            </div>
          ))}
          <div
            style={{
              color: C.muted,
              fontSize: 11,
              marginTop: 10,
              lineHeight: 1.5,
            }}
          >
            Changes take effect on the next scan cycle and persist until you
            reset them — they do not lapse at midnight the way the daily cap and
            unit do. Blank the field to hand a setting back to the server
            default.
          </div>
        </div>
      )}
    </div>
  );
}
