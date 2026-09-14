import { useEffect, useState } from "react";
import Panel from "../../components/engine/Panel.jsx";
import { C, th, td, chip, pct, money } from "../../components/engine/theme.js";
import {
  callApi,
  chipBtnStyle,
  ctStamp,
  ctStart,
  slateDay,
  pct1,
  resultMeta,
} from "./shared.js";

/* How the Best N tickets actually did, and why the losers lost.
 *
 * Backend: routes/kalshi.js in sheline-art-website-api.
 *   GET /kalshi/quick-bets/record?days=30   tickets, per-leg grades, calibration
 *   GET /kalshi/quick-bets/lessons?limit=50 the morning desk's write-ups
 *
 * Every leg is graded server-side from final scores (a cron every 20 minutes)
 * and a morning Claude desk writes a lesson per lost pick plus one summary per
 * slate. This component only reads. It fetches on mount and again whenever
 * `refreshKey` changes — index.jsx bumps it after a build or a fill — and
 * never polls: grading runs on a 20-minute clock and lessons once a morning.
 *
 * Calibration rows under 30 graded picks are drawn dim on purpose. The desk is
 * told not to call a bucket miscalibrated below that, and the page shouldn't
 * invite the same over-reading.
 */

const DAYS = 30;
const LESSON_LIMIT = 50;
const KEY_PREFIX = "bv_quickbets_panel_";
const MIN_BUCKET_PICKS = 30;

const CATEGORY_STYLE = {
  summary: chip(C.greenSoft, C.green),
  injury: chip(C.amberSoft, C.amber),
  lineup: chip(C.amberSoft, C.amber),
  pitching: chip(C.amberSoft, C.amber),
  weather: chip(C.amberSoft, C.amber),
  "bad-price": chip(C.redSoft, C.red),
  model: chip(C.redSoft, C.red),
  variance: chip(C.chipBg, C.muted),
  other: chip(C.chipBg, C.muted),
};

const count = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* A bucket arrives as whatever the backend names it — "60–70%", or bounds. */
const bucketLabel = (b) => {
  if (Array.isArray(b) && b.length === 2) {
    return `${Math.round(Number(b[0]) * 100)}–${Math.round(Number(b[1]) * 100)}%`;
  }
  return b == null ? "—" : String(b);
};

/* by_league / by_market are "the same shape" as calibration: either one flat
 * row per group, or a group carrying its own `buckets`. Both render as rows. */
const flattenGroups = (rows) =>
  (Array.isArray(rows) ? rows : []).flatMap((row) => {
    const group =
      row.league_label || row.label || row.market_label || row.league || row.market || row.key;
    if (Array.isArray(row.buckets)) {
      return row.buckets.map((b) => ({
        ...b,
        label: `${group ?? "—"} · ${bucketLabel(b.bucket)}`,
      }));
    }
    return [
      {
        ...row,
        label:
          group != null && row.bucket != null
            ? `${group} · ${bucketLabel(row.bucket)}`
            : group != null
              ? String(group)
              : bucketLabel(row.bucket),
      },
    ];
  });

const Muted = ({ children }) => (
  <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.45 }}>{children}</div>
);

function StateNote({ res, what, onRetry }) {
  if (!res || res.kind === "ok") return null;
  if (res.kind === "not-deployed") {
    return <Muted>{what} isn't deployed on the backend yet.</Muted>;
  }
  return (
    <div style={{ color: C.amber, fontSize: 12.5, lineHeight: 1.45 }}>
      Couldn't load {what.toLowerCase()}
      {res.kind === "network" ? ` (${res.message})` : `: ${res.message}`}{" "}
      <button type="button" onClick={onRetry} style={{ ...chipBtnStyle, marginLeft: 6 }}>
        Retry
      </button>
    </div>
  );
}

function Tile({ label, value, sub }) {
  return (
    <div
      style={{
        flex: "1 1 100px",
        minWidth: 0,
        background: C.chipBg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{value}</div>
      {sub ? (
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{sub}</div>
      ) : null}
    </div>
  );
}

function CalibTable({ rows, labelHead }) {
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <th style={th}>{labelHead}</th>
            <th style={{ ...th, textAlign: "right" }}>Picks</th>
            <th style={{ ...th, textAlign: "right" }}>W–L</th>
            <th style={{ ...th, textAlign: "right" }}>Expected</th>
            <th style={{ ...th, textAlign: "right" }}>Actual</th>
            <th style={{ ...th, textAlign: "right" }}>±</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const thin = count(r.picks) < MIN_BUCKET_PICKS;
            const diff =
              r.actual_pct != null && r.expected_pct != null
                ? Number(r.actual_pct) - Number(r.expected_pct)
                : null;
            const cell = { ...td, textAlign: "right", color: thin ? C.muted : C.text };
            return (
              <tr
                key={`${r.label}-${i}`}
                style={{
                  borderBottom: `1px solid ${C.border}`,
                  background: i % 2 ? C.rowAlt : "transparent",
                }}
              >
                <td style={{ ...td, fontWeight: 700, color: thin ? C.muted : C.text }}>
                  {r.label}
                </td>
                <td style={cell}>{count(r.picks)}</td>
                <td style={cell}>
                  {count(r.won)}–{count(r.lost)}
                </td>
                <td style={cell}>
                  {r.expected_pct == null ? "—" : pct(Number(r.expected_pct) / 100)}
                </td>
                <td style={{ ...cell, fontWeight: 700 }}>
                  {r.actual_pct == null ? "—" : pct(Number(r.actual_pct) / 100)}
                </td>
                <td
                  style={{
                    ...cell,
                    color:
                      diff == null || thin
                        ? C.muted
                        : diff >= 0
                          ? C.green
                          : C.red,
                  }}
                >
                  {diff == null ? "—" : `${diff >= 0 ? "+" : ""}${Math.round(diff)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PickLine({ p, lesson }) {
  const meta = resultMeta(p.result);
  return (
    <div style={{ padding: "7px 0", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          title={meta.label}
          style={{
            flexShrink: 0,
            minWidth: 30,
            textAlign: "center",
            fontSize: meta.mark.length > 1 ? 10.5 : 14,
            fontWeight: 800,
            color: meta.color,
          }}
        >
          {meta.mark}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
            {p.pick_label || "—"}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
            {[
              p.league_label,
              p.game_label,
              p.start_time ? `${ctStart(p.start_time)} CT` : null,
              p.final_score ? `final ${p.final_score}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
          {p.result_detail ? (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
              {p.result_detail}
            </div>
          ) : null}
          {p.lesson_id != null ? (
            lesson ? (
              <details style={{ marginTop: 3 }}>
                <summary style={{ fontSize: 11.5, color: C.text, cursor: "pointer" }}>
                  Lesson: {lesson.title}
                </summary>
                <div
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.45,
                    marginTop: 4,
                  }}
                >
                  {lesson.body}
                </div>
              </details>
            ) : (
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                Has a lesson (#{p.lesson_id}) — older than the list below.
              </div>
            )
          ) : null}
        </div>
        <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 800, color: C.text }}>
          {pct1(p.p_pct)}
        </span>
      </div>
    </div>
  );
}

function TicketBlock({ t, lessonsById }) {
  const meta = resultMeta(t.status);
  const picks = Array.isArray(t.picks) ? t.picks : [];
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "10px 12px 4px",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={chip(meta.bg, meta.color)}>{meta.label}</span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>
          {picks.length || t.legs_requested} legs · {pct1(t.p_hit_pct)}
        </span>
        <span style={{ fontSize: 12, color: C.muted }}>
          fair {t.fair_american || "—"}
          {t.book_american ? ` · DK ${t.book_american}` : ""}
        </span>
        {t.placed ? (
          <span style={chip(C.greenSoft, C.green)}>
            bought{t.placed.spent_dollars != null ? ` ${money(t.placed.spent_dollars)}` : ""}
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, marginBottom: 6 }}>
        {[
          `built ${ctStamp(t.created_at)}`,
          Array.isArray(t.slate_dates) && t.slate_dates.length
            ? `slate ${t.slate_dates.map(slateDay).join(" + ")}`
            : null,
          t.mode === "any" ? "with DK lines" : t.mode === "kalshi" ? "Kalshi only" : null,
          t.times_generated > 1 ? `built ${t.times_generated}×` : null,
          t.source ? `from ${t.source}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </div>
      {picks.map((p, i) => (
        <PickLine
          key={p.id ?? i}
          p={p}
          lesson={p.lesson_id != null ? lessonsById.get(p.lesson_id) : null}
        />
      ))}
    </div>
  );
}

function LessonBlock({ l }) {
  const p = l.pick;
  const meta = p ? resultMeta(p.result) : null;
  return (
    <div style={{ padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={CATEGORY_STYLE[l.category] || CATEGORY_STYLE.other}>
          {l.category || "other"}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.text, minWidth: 0 }}>
          {l.title}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.muted }}>
          slate {slateDay(l.slate_date)}
        </span>
      </div>
      {p ? (
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          <strong style={{ color: C.text }}>{p.pick_label}</strong>
          {[p.game_label, p.league_label, p.p_pct != null ? pct1(p.p_pct) : null]
            .filter(Boolean)
            .map((s) => ` · ${s}`)
            .join("")}
          {" · "}
          <span style={{ color: meta.color, fontWeight: 700 }}>
            {meta.mark === meta.label ? meta.label : `${meta.mark} ${meta.label}`}
          </span>
          {p.final_score ? ` ${p.final_score}` : ""}
        </div>
      ) : null}
      <div
        style={{
          fontSize: 12.5,
          color: C.text,
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
          marginTop: 6,
          overflowWrap: "anywhere",
        }}
      >
        {l.body}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
        {l.updated_at && l.updated_at !== l.created_at
          ? `updated ${ctStamp(l.updated_at)}`
          : `written ${ctStamp(l.created_at)}`}
      </div>
    </div>
  );
}

export default function Record({ refreshKey = 0 }) {
  // The latest answer from each endpoint, and the last GOOD body of each — a
  // failed refresh keeps the numbers already on screen under its error.
  const [recordRes, setRecordRes] = useState(null);
  const [lessonsRes, setLessonsRes] = useState(null);
  const [record, setRecord] = useState(null);
  const [lessons, setLessons] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [r, l] = await Promise.all([
        callApi(`/record?days=${DAYS}`),
        callApi(`/lessons?limit=${LESSON_LIMIT}`),
      ]);
      // A newer refresh (or unmount) superseded this one.
      if (cancelled) return;
      setRecordRes(r);
      setLessonsRes(l);
      if (r.kind === "ok") setRecord(r.body);
      if (l.kind === "ok") setLessons(Array.isArray(l.body.lessons) ? l.body.lessons : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, retryKey]);

  const retry = () => setRetryKey((k) => k + 1);

  // Neither endpoint exists yet: one quiet line instead of three empty panels.
  if (recordRes?.kind === "not-deployed" && lessonsRes?.kind === "not-deployed") {
    return (
      <div style={{ color: C.muted, fontSize: 12, marginTop: 16, lineHeight: 1.45 }}>
        The Best N record and lessons aren't deployed on the backend yet.
      </div>
    );
  }

  const loadingRecord = recordRes === null;
  const loadingLessons = lessonsRes === null;
  const summary = record?.summary || {};
  const st = summary.tickets || {};
  const sp = summary.picks || {};
  const calibration = flattenGroups(record?.calibration);
  const byLeague = flattenGroups(record?.by_league);
  const byMarket = flattenGroups(record?.by_market);
  const tickets = Array.isArray(record?.tickets) ? record.tickets : [];
  const lessonsById = new Map((lessons || []).map((l) => [l.id, l]));

  const rightNote = (res, text) => (
    <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted }}>
      {res === null
        ? "loading…"
        : res.kind === "not-deployed"
          ? "not deployed yet"
          : res.kind !== "ok"
            ? "couldn't load"
            : text}
    </span>
  );

  return (
    <div style={{ marginTop: 16 }}>
      <Panel
        id="best_record"
        keyPrefix={KEY_PREFIX}
        defaultOpen={false}
        title={`Best N record · ${record?.days || DAYS} days`}
        right={rightNote(
          recordRes,
          record ? `tickets ${count(st.won)}–${count(st.lost)} · legs ${count(sp.won)}–${count(sp.lost)}` : "",
        )}
      >
        <StateNote res={recordRes} what="The record" onRetry={retry} />
        {loadingRecord ? <Muted>Loading the record…</Muted> : null}
        {record ? (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <Tile
                label="Tickets W–L"
                value={`${count(st.won)}–${count(st.lost)}`}
                sub={`${count(st.pending)} pending · ${count(st.void)} void · ${count(st.placed)} bought`}
              />
              <Tile
                label="Legs W–L"
                value={`${count(sp.won)}–${count(sp.lost)}`}
                sub={`${count(sp.push)} push · ${count(sp.void)} void · ${count(sp.pending)} pending`}
              />
              <Tile
                label="Hit rate"
                value={pct1(summary.hit_rate_pct)}
                sub={
                  summary.expected_pct != null
                    ? `expected ${pct1(summary.expected_pct)}`
                    : "nothing graded yet"
                }
              />
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, margin: "14px 0 4px" }}>
              Calibration
            </div>
            {calibration.length === 0 ? (
              <Muted>Nothing graded yet. Calibration fills in as games go final.</Muted>
            ) : (
              <>
                <CalibTable rows={calibration} labelHead="Win chance" />
                <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                  Dim rows have fewer than {MIN_BUCKET_PICKS} graded picks — too
                  few to call the model off.
                </div>
              </>
            )}

            {byLeague.length > 0 ? (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, margin: "14px 0 4px" }}>
                  By league
                </div>
                <CalibTable rows={byLeague} labelHead="League" />
              </>
            ) : null}

            {byMarket.length > 0 ? (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, margin: "14px 0 4px" }}>
                  By market
                </div>
                <CalibTable rows={byMarket} labelHead="Market" />
              </>
            ) : null}
          </>
        ) : null}
      </Panel>

      <Panel
        id="best_tickets"
        keyPrefix={KEY_PREFIX}
        defaultOpen={false}
        title="Recent Best N tickets"
        right={rightNote(recordRes, record ? `${tickets.length}` : "")}
      >
        <StateNote res={recordRes} what="Recent tickets" onRetry={retry} />
        {loadingRecord ? <Muted>Loading tickets…</Muted> : null}
        {record && tickets.length === 0 ? (
          <Muted>
            No Best N tickets in the last {record.days || DAYS} days yet. Build
            one above — every build is saved and graded.
          </Muted>
        ) : null}
        {tickets.map((t, i) => (
          <TicketBlock key={t.id ?? i} t={t} lessonsById={lessonsById} />
        ))}
      </Panel>

      <Panel
        id="best_lessons"
        keyPrefix={KEY_PREFIX}
        defaultOpen={false}
        title="Lessons"
        right={rightNote(lessonsRes, lessons ? `${lessons.length}` : "")}
      >
        <StateNote res={lessonsRes} what="Lessons" onRetry={retry} />
        {loadingLessons ? <Muted>Loading lessons…</Muted> : null}
        {lessons && lessons.length === 0 ? (
          <Muted>
            No lessons yet. The morning desk writes one for each lost pick once
            its game is graded, plus a summary per slate.
          </Muted>
        ) : null}
        {(lessons || []).map((l, i) => (
          <LessonBlock key={l.id ?? i} l={l} />
        ))}
      </Panel>
    </div>
  );
}
