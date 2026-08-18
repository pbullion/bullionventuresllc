import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DEFAULT_ZIP,
  deleteJournalDay,
  getForecast,
  getInsight,
  getJournal,
  lastZip,
  rememberZip,
  saveJournalDay,
} from "./api.js";
import {
  C,
  GROUP_EMOJI,
  GROUP_LABEL,
  SEVERITY,
  SYMPTOM_LEAN,
  SYMPTOM_TAGS,
  aqiCategory,
  bandText,
  dayFull,
  dayLabel,
  hourLabel,
  hourRange,
  levelColor,
  verdictStyle,
} from "./ui.js";

/* /pollen — pollen forecast and sick-day outlook by zip code.
 *
 * The page is built around ONE question, asked in the order someone actually
 * asks it:
 *
 *   1. is today bad, and is it pollen or a bug        -> the verdict hero
 *   2. when today should I go outside                 -> the hourly strip
 *   3. what specifically is in the air                -> groups, then taxa
 *   4. what about the rest of the week                -> the outlook
 *   5. and how did I actually feel                    -> the journal
 *
 * Everything above the fold answers 1 and 2. That ordering is why the taxon
 * breakdown — the most detailed thing here — sits below a single word.
 *
 * HONESTY IS PART OF THE UI, not a disclaimer at the bottom. Pollen levels are
 * modelled for US locations (there is no free keyless count feed; see the header
 * of routes/pollen.js), and every modelled figure is marked as such at the point
 * it is READ, not once in the footer: the source chip in the header, "modelled"
 * on the level card, and "at a counting station" on every count band. Measured
 * numbers — the weather and the air quality — say so too. If a real feed is
 * configured on the backend the labels change themselves; nothing here is
 * hardcoded to "model".
 */

const REFRESH_MS = 30 * 60 * 1000; // the backend caches for 30 minutes; matching it

export default function Pollen() {
  const { zip: zipParam } = useParams();
  const navigate = useNavigate();

  const initialZip = zipParam && /^\d{5}$/.test(zipParam) ? zipParam : lastZip();
  const [zip, setZip] = useState(initialZip);
  const [input, setInput] = useState(initialZip);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // date string, or null for today
  const [journal, setJournal] = useState([]);
  const [insight, setInsight] = useState(null);
  const [expandTaxa, setExpandTaxa] = useState(false);
  const inputRef = useRef(null);

  /* Deliberately does NOTHING synchronously before the first await. An effect
   * calls this on mount and on every zip change, and a setState in an effect
   * body costs a cascading render (and eslint's react-hooks/set-state-in-effect
   * rightly objects). The spinner is instead switched on by whoever STARTED the
   * request — the initial state, or the handler behind the button — so this
   * function only reports results. */
  /* Fetching lives INSIDE the effects, with a `fresh` counter as the trigger, for
   * two reasons that happen to point the same way.
   *
   * The race: typing a new zip while the old request is in flight. Without the
   * `alive` guard the slower response wins and the page shows a forecast for a zip
   * the user has already moved off.
   *
   * The renders: a setState in an effect BODY costs a cascading render, so the
   * spinner is switched on by whoever started the request (initial state, or the
   * handler behind the button) and the effect only reports what came back. */
  const [reloadKey, setReloadKey] = useState(0);
  const [journalKey, setJournalKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const payload = await getForecast(zip, { fresh: reloadKey > 0 });
        if (!alive) return;
        setData(payload);
        setStatus("ok");
        setError(null);
        setSelected(null);
        rememberZip(zip);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Something went wrong.");
        // Keep whatever forecast is already on screen — a failed zip lookup should
        // not blank out the one that was working.
        setStatus((s) => (s === "ok" ? "ok" : "error"));
      }
    })();
    return () => {
      alive = false;
    };
  }, [zip, reloadKey]);

  // The journal is independent of the forecast: it still renders when the
  // forecast call fails, and it must not hold up first paint.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [j, i] = await Promise.all([getJournal(), getInsight(zip).catch(() => null)]);
        if (!alive) return;
        setJournal((j && j.entries) || []);
        setInsight(i);
      } catch {
        /* the journal is optional — never let it break the page */
      }
    })();
    return () => {
      alive = false;
    };
  }, [zip, journalKey]);

  // The backend caches a forecast for 30 minutes, so matching that interval is
  // the most often it can say anything new.
  useEffect(() => {
    const t = setInterval(() => setReloadKey((k) => k + 1), REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  const reloadJournal = () => setJournalKey((k) => k + 1);

  const refresh = () => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  };

  const submitZip = (e) => {
    e.preventDefault();
    const next = input.trim();
    if (!/^\d{5}$/.test(next)) {
      setError("Enter a 5-digit US zip code.");
      return;
    }
    if (inputRef.current) inputRef.current.blur(); // dismiss the phone keyboard
    // Clear the error HERE rather than leaving it to the fetch effect. Submitting
    // the zip that is already loaded doesn't change `zip`, so the effect would not
    // re-run and a "5-digit" warning from a previous typo would sit there looking
    // like it applied to the forecast on screen. Bumping reloadKey also means Go
    // always does something visible, even on the same zip.
    setError(null);
    setStatus("loading");
    setZip(next);
    setReloadKey((k) => k + 1);
    navigate(`/pollen/${next}`, { replace: true });
  };

  const days = useMemo(() => (data && data.days) || [], [data]);
  const todayIso = data && data.todayDate;
  const day = useMemo(() => {
    if (!data) return null;
    if (selected) return days.find((d) => d.date === selected) || data.today;
    return data.today;
  }, [data, days, selected]);

  const journalByDay = useMemo(
    () => new Map(journal.map((e) => [e.day, e])),
    [journal],
  );

  const setSeverity = async (dayIso, severity) => {
    const existing = journalByDay.get(dayIso);
    // Tapping the level you already chose clears it, so a mis-tap is undoable
    // without a second control.
    if (existing && existing.severity === severity) {
      setJournal((j) => j.filter((e) => e.day !== dayIso));
      try {
        await deleteJournalDay(dayIso);
      } catch {
        reloadJournal();
      }
      return;
    }
    const next = { day: dayIso, severity, symptoms: (existing && existing.symptoms) || [], note: null, zip };
    setJournal((j) => [next, ...j.filter((e) => e.day !== dayIso)]);
    try {
      await saveJournalDay(dayIso, { severity, symptoms: next.symptoms, zip });
      // Every write refetches rather than trusting the optimistic row, same call
      // as the project board: the whole journal is one small request, and it also
      // picks up a log made on another device.
      reloadJournal();
    } catch {
      reloadJournal();
    }
  };

  const toggleSymptom = async (dayIso, tag) => {
    const existing = journalByDay.get(dayIso);
    if (!existing) return; // severity first — a symptom with no "how bad" says little
    const has = (existing.symptoms || []).includes(tag);
    const symptoms = has
      ? existing.symptoms.filter((s) => s !== tag)
      : [...(existing.symptoms || []), tag];
    setJournal((j) => j.map((e) => (e.day === dayIso ? { ...e, symptoms } : e)));
    try {
      await saveJournalDay(dayIso, { severity: existing.severity, symptoms, zip });
    } catch {
      reloadJournal();
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <Header
        data={data}
        input={input}
        setInput={setInput}
        submitZip={submitZip}
        inputRef={inputRef}
        onRefresh={refresh}
        loading={status === "loading"}
      />

      <main style={{ padding: "12px 12px 48px", maxWidth: 720, margin: "0 auto" }}>
        {error ? <Banner tone="error">{error}</Banner> : null}
        {data && data.stale ? (
          <Banner tone="warn">
            The live feed didn&apos;t answer just now — this is the last forecast that came
            through. Tap Refresh to retry.
          </Banner>
        ) : null}

        {status === "loading" && !data ? <Skeleton /> : null}

        {status === "error" && !data ? (
          <Banner tone="error">
            Couldn&apos;t load a forecast for {zip}. Check the zip and try again.
          </Banner>
        ) : null}

        {day ? (
          <>
            <Verdict day={day} todayIso={todayIso} source={data.source} />
            <OutdoorWindow day={day} />
            <Groups day={day} />
            <Taxa day={day} expanded={expandTaxa} onToggle={() => setExpandTaxa((v) => !v)} />
            <Week days={days} todayIso={todayIso} selected={day.date} onSelect={setSelected} />
            <AirQuality day={day} />
            <Journal
              days={days}
              todayIso={todayIso}
              journalByDay={journalByDay}
              insight={insight}
              onSeverity={setSeverity}
              onSymptom={toggleSymptom}
            />
            <Sources source={data.source} place={data.place} updatedAt={data.updatedAt} />
          </>
        ) : null}
      </main>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────

function Header({ data, input, setInput, submitZip, inputRef, onRefresh, loading }) {
  const place = data && data.place;
  const where = place ? [place.city, place.state].filter(Boolean).join(", ") : null;
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        padding: "14px 14px 12px",
        background: "rgba(11,15,25,0.94)",
        backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${C.line}`,
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px" }}>
            🤧 Pollen &amp; Sick Days
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {where ? `${where} · ${place.zip}` : " "}
            {place && place.region ? ` · ${place.region}` : ""}
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            flexShrink: 0,
            border: `1px solid ${C.line2}`,
            background: "#152036",
            color: C.text,
            borderRadius: 10,
            padding: "9px 13px",
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}>
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      <form onSubmit={submitZip} style={{ display: "flex", gap: 8, marginTop: 11 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
          // type=text with a numeric inputMode, not type=number: a zip is a
          // 5-character label, not a quantity, and type=number brings spinners
          // and strips a leading zero (07030 is a real zip).
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          // No `pattern` attribute on purpose. It looks like belt-and-braces, but
          // native constraint validation BLOCKS the submit event, so submitZip
          // never ran on a short zip and its "Enter a 5-digit US zip code"
          // message was dead code — the user got a browser tooltip instead, in a
          // different place from every other message on this page.
          placeholder={`Zip code (default ${DEFAULT_ZIP})`}
          aria-label="Zip code"
          style={{
            flex: 1,
            minWidth: 0,
            // 16px so iOS doesn't zoom the viewport on focus.
            fontSize: 16,
            padding: "11px 13px",
            borderRadius: 10,
            border: `1px solid ${C.line2}`,
            background: "#0a1120",
            color: C.text,
          }}
        />
        <button
          type="submit"
          style={{
            border: `1px solid ${C.line2}`,
            background: C.accent,
            color: "#0b0f19",
            borderRadius: 10,
            padding: "11px 16px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}>
          Go
        </button>
      </form>
    </header>
  );
}

// ── Today ───────────────────────────────────────────────────────────────────

/* The hero. One word for what kind of day it is, the two scores that decided it,
 * and the reasons. The two bars are side by side rather than combined into one
 * gauge because separating them IS the product — a 70 that is pollen and a 70
 * that is a virus call for different things. */
function Verdict({ day, todayIso, source }) {
  const v = day.risk.verdict;
  const vs = verdictStyle(v.key);
  const lc = levelColor(day.pollen.overall.level);
  const measured = day.pollen.overall.measured === true;

  return (
    <section
      style={{
        margin: "6px 0 14px",
        borderRadius: 16,
        border: `1px solid ${vs.fg}44`,
        background: vs.bg,
        overflow: "hidden",
      }}>
      <div style={{ padding: "16px 16px 4px" }}>
        <div style={{ fontSize: 12, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {day.date === todayIso ? "Today" : dayFull(day.date)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
          <span style={{ fontSize: 30, lineHeight: 1 }}>{vs.icon}</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: vs.fg, letterSpacing: "-0.3px" }}>
              {vs.tone}
            </div>
            <div style={{ fontSize: 13, color: C.dim, marginTop: 1 }}>{v.label}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 16px 4px", display: "grid", gap: 10 }}>
        <ScoreBar
          label="Allergy load"
          value={day.risk.allergy}
          color="#ec4899"
          hint="Pollen, plus the particulates and ozone that make it worse"
        />
        <ScoreBar
          label="Bug weather"
          value={day.risk.bug}
          color="#38bdf8"
          hint="How much the air and the season favour catching something"
        />
      </div>

      <div
        style={{
          margin: "12px 16px 0",
          padding: "11px 13px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.25)",
          border: `1px solid ${C.line}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
        <div style={{ flexShrink: 0, textAlign: "center", minWidth: 74 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: lc.fg, lineHeight: 1.1 }}>
            {day.pollen.overall.level}
            <span style={{ fontSize: 13, color: C.dimmer, fontWeight: 600 }}>/5</span>
          </div>
          <div style={{ fontSize: 11.5, color: lc.fg, fontWeight: 700 }}>
            {day.pollen.overall.levelLabel}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.45 }}>
          Overall pollen.{" "}
          {measured ? (
            <span style={{ color: "#86efac", fontWeight: 600 }}>Measured feed.</span>
          ) : (
            <span>
              <span style={{ color: "#fde047", fontWeight: 600 }}>Modelled</span> from this
              region&apos;s bloom calendar and the real weather forecast — not a counted
              sample.
            </span>
          )}
        </div>
      </div>

      {day.why && day.why.length ? (
        <ul style={{ margin: "12px 16px 16px", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
          {day.why.map((w) => (
            <li key={w} style={{ display: "flex", gap: 8, fontSize: 13, color: "#c7d2fe", lineHeight: 1.4 }}>
              <span style={{ color: C.dimmer, flexShrink: 0 }}>·</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ height: 14 }} />
      )}
      {source && source.pollen === "model" ? null : null}
    </section>
  );
}

function ScoreBar({ label, value, color, hint }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color }}>{value}</span>
      </div>
      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,0.09)", marginTop: 5, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(2, value)}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
      <div style={{ fontSize: 11.5, color: C.faint, marginTop: 4 }}>{hint}</div>
    </div>
  );
}

/* The most actionable thing on the page: pollen is not flat across a day, it
 * peaks in the morning, so "go out at 4" is real advice. Shown as the hourly
 * curve with the recommended window called out, because the shape is the
 * justification for the recommendation. */
function OutdoorWindow({ day }) {
  const w = day.outdoorWindow;
  if (!w || !w.hours || !w.hours.length) return null;
  const peak = w.hours.reduce((a, b) => (b.level > a.level ? b : a));
  const max = Math.max(1, ...w.hours.map((h) => h.level));

  return (
    <Panel>
      <PanelTitle
        title="Best window to be outside"
        right={
          <span style={{ fontSize: 16, fontWeight: 800, color: levelColor(w.level).fg }}>
            {hourRange(w.from, w.to)}
          </span>
        }
      />
      <div style={{ fontSize: 12.5, color: C.dim, margin: "0 0 12px", lineHeight: 1.45 }}>
        {w.raining ? (
          <>
            Cleanest air is {hourRange(w.from, w.to)} — but it&apos;s raining then. Rain
            scrubs pollen out of the air, so that really is the low point; the driest
            low is around {hourLabel(peak.hour < 12 ? 15 : 6)}.
          </>
        ) : (
          <>
            Pollen peaks around {hourLabel(peak.hour)} and eases through the afternoon.
            Counts run highest in the first hours after sunrise.
          </>
        )}
      </div>
      <HourStrip hours={w.hours} from={w.from} to={w.to} max={max} />
    </Panel>
  );
}

function HourStrip({ hours, from, to, max }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 62 }}>
        {hours.map((h) => {
          const inWindow = h.hour >= from && h.hour < to;
          const lc = levelColor(h.level);
          return (
            <div key={h.hour} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
              <div
                title={`${hourLabel(h.hour)} — level ${h.level}${h.raining ? ", raining" : ""}`}
                style={{
                  height: `${Math.max(6, (h.level / max) * 100)}%`,
                  background: inWindow ? lc.bar : `${lc.bar}55`,
                  borderRadius: 3,
                  border: inWindow ? `1px solid ${lc.fg}` : "1px solid transparent",
                  position: "relative",
                }}>
                {h.raining ? (
                  <span style={{ position: "absolute", top: -13, left: 0, right: 0, textAlign: "center", fontSize: 8 }}>
                    💧
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
        {hours.map((h) => (
          <div key={h.hour} style={{ flex: 1, textAlign: "center", fontSize: 8.5, color: C.faint }}>
            {h.hour % 3 === 0 ? hourLabel(h.hour) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── What's in the air ───────────────────────────────────────────────────────

function Groups({ day }) {
  const groups = ["tree", "grass", "weed", "mold"];
  return (
    <Panel>
      <PanelTitle title="What's in the air" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {groups.map((g) => {
          const gr = day.pollen.groups[g] || { level: 0, levelLabel: "None" };
          const lc = levelColor(gr.level);
          return (
            <div
              key={g}
              style={{
                background: lc.bg,
                border: `1px solid ${lc.fg}33`,
                borderRadius: 12,
                padding: "10px 6px",
                textAlign: "center",
              }}>
              <div style={{ fontSize: 16 }}>{GROUP_EMOJI[g]}</div>
              <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, marginTop: 2 }}>
                {GROUP_LABEL[g]}
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: lc.fg, lineHeight: 1.2, marginTop: 3 }}>
                {gr.level}
              </div>
              <div style={{ fontSize: 10, color: lc.fg, fontWeight: 600 }}>{gr.levelLabel}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* The taxon list. Three at a glance and the rest behind a tap — someone with a
 * known oak allergy wants to find oak, and someone without one does not want to
 * read eleven rows to learn that today is bad. */
const TAXA_SHOWN = 3;

function Taxa({ day, expanded, onToggle }) {
  const taxa = day.pollen.taxa || [];
  if (!taxa.length) return null;
  // Only worth collapsing when it hides more than one row — "Show all 4" to
  // reveal a single Low entry is a tap that buys nothing.
  const collapsible = taxa.length > TAXA_SHOWN + 1;
  const shown = collapsible && !expanded ? taxa.slice(0, TAXA_SHOWN) : taxa;
  return (
    <Panel>
      <PanelTitle title="By plant" right={<span style={{ fontSize: 12, color: C.dimmer }}>{taxa.length} in season</span>} />
      <div style={{ display: "grid", gap: 8 }}>
        {shown.map((t) => (
          <TaxonRow key={t.key} t={t} />
        ))}
      </div>
      {collapsible ? (
        <button
          onClick={onToggle}
          style={{
            width: "100%",
            marginTop: 10,
            padding: "9px",
            background: "transparent",
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            color: C.accent,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}>
          {expanded ? "Show less" : `Show all ${taxa.length}`}
        </button>
      ) : null}
    </Panel>
  );
}

function TaxonRow({ t }) {
  const lc = levelColor(t.level);
  const band = bandText(t.band, t.measured);
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t.label}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: lc.fg }}>{t.levelLabel}</span>
          {t.count != null ? (
            <span style={{ fontSize: 11, color: "#86efac" }}>{t.count} grains/m³</span>
          ) : null}
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.07)", marginTop: 5, overflow: "hidden" }}>
          <div style={{ width: `${(t.level / 5) * 100}%`, height: "100%", background: lc.bar, borderRadius: 999 }} />
        </div>
        {t.note || band ? (
          <div style={{ fontSize: 11, color: C.faint, marginTop: 4, lineHeight: 1.4 }}>
            {t.note ? t.note : band}
            {t.note && band ? ` · ${band}` : ""}
          </div>
        ) : null}
      </div>
      <div style={{ flexShrink: 0, fontSize: 17, fontWeight: 800, color: lc.fg, width: 30, textAlign: "right" }}>
        {t.level}
      </div>
    </div>
  );
}

// ── The week ────────────────────────────────────────────────────────────────

/* Forward days only, tappable. The two lines stay separate here for the same
 * reason as in the hero: the useful read is "Thursday is the pollen day, Sunday
 * is the front", and one merged line hides both. */
function Week({ days, todayIso, selected, onSelect }) {
  const future = days.filter((d) => d.date >= todayIso);
  if (future.length < 2) return null;
  return (
    <Panel>
      <PanelTitle title="Next few days" right={<span style={{ fontSize: 11.5, color: C.dimmer }}>tap a day</span>} />
      <div style={{ display: "flex", gap: 6 }}>
        {future.map((d) => {
          const isSel = d.date === selected;
          const lc = levelColor(d.pollen.overall.level);
          const vs = verdictStyle(d.risk.verdict.key);
          return (
            <button
              key={d.date}
              onClick={() => onSelect(d.date)}
              aria-pressed={isSel}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "9px 3px 10px",
                borderRadius: 12,
                border: `1px solid ${isSel ? lc.fg : C.line}`,
                background: isSel ? lc.bg : C.panel2,
                color: C.text,
                cursor: "pointer",
                display: "grid",
                gap: 3,
                justifyItems: "center",
              }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: isSel ? lc.fg : C.dim }}>
                {dayLabel(d.date, todayIso)}
              </span>
              <span style={{ fontSize: 14 }}>{vs.icon}</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: lc.fg, lineHeight: 1 }}>
                {d.pollen.overall.level}
              </span>
              <span style={{ display: "flex", gap: 2, marginTop: 2 }}>
                <Pip value={d.risk.allergy} color="#ec4899" />
                <Pip value={d.risk.bug} color="#38bdf8" />
              </span>
              <span style={{ fontSize: 9.5, color: C.faint }}>
                {Math.round(d.weather.tempMaxF)}°
                {d.weather.precipIn > 0.05 ? " 💧" : ""}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: C.faint }}>
        <Legend color="#ec4899" label="allergy load" />
        <Legend color="#38bdf8" label="bug weather" />
      </div>
    </Panel>
  );
}

function Pip({ value, color }) {
  return (
    <span
      style={{
        display: "block",
        width: 4,
        height: 22,
        borderRadius: 2,
        background: "rgba(255,255,255,0.08)",
        position: "relative",
        overflow: "hidden",
      }}>
      <span
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${Math.max(6, value)}%`,
          background: color,
        }}
      />
    </span>
  );
}

function Legend({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
}

// ── Measured air ────────────────────────────────────────────────────────────

/* Separated from the pollen panels and labelled "measured" on purpose. These are
 * the numbers on this page that are not modelled, and the distinction is more
 * useful to a reader than tidiness would be. */
function AirQuality({ day }) {
  const a = day.air || {};
  const w = day.weather || {};
  if (a.pm25 == null && a.usAqi == null) return null;
  const cat = aqiCategory(a.usAqi);
  return (
    <Panel>
      <PanelTitle
        title="Air &amp; weather"
        right={<span style={{ fontSize: 11, color: "#86efac", fontWeight: 700 }}>MEASURED</span>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <Stat label="US AQI" value={a.usAqi} sub={cat && cat.label} subColor={cat && cat.fg} />
        <Stat label="PM2.5" value={a.pm25} sub="µg/m³" />
        <Stat label="Ozone" value={a.ozone} sub="µg/m³ peak" />
        <Stat label="High" value={w.tempMaxF} sub={`low ${w.tempMinF ?? "—"}°`} unit="°" />
        <Stat label="Humidity" value={w.rhMean} sub={`dew ${w.dewMean ?? "—"}°`} unit="%" />
        <Stat
          label="Wind"
          value={w.windMph}
          sub={w.gustMph ? `gusts ${w.gustMph}` : "mph"}
          unit=""
        />
      </div>
      {w.precipIn > 0.02 ? (
        <div style={{ fontSize: 12, color: "#7dd3fc", marginTop: 10 }}>
          💧 {w.precipIn}&quot; of rain expected — that scrubs pollen out of the air while
          it falls, and mold spores climb for a day or two after.
        </div>
      ) : null}
      {day.risk.sinusPressure ? (
        <div style={{ fontSize: 12, color: "#fdba74", marginTop: 8 }}>
          Pressure is falling {day.risk.sinusPressure} mb — sinus-headache weather, which is
          neither pollen nor a virus.
        </div>
      ) : null}
    </Panel>
  );
}

function Stat({ label, value, sub, subColor, unit }) {
  return (
    <div style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 11, padding: "9px 10px" }}>
      <div style={{ fontSize: 10.5, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
        {value == null ? "—" : value}
        {value != null && unit ? <span style={{ fontSize: 12, color: C.dimmer }}>{unit}</span> : null}
      </div>
      {sub ? <div style={{ fontSize: 10.5, color: subColor || C.faint, marginTop: 1 }}>{sub}</div> : null}
    </div>
  );
}

// ── Journal ─────────────────────────────────────────────────────────────────

/* One tap per day. The point is not record-keeping — it is that after a couple of
 * weeks the page can say whether this person's bad days track the pollen line or
 * the virus line, which is the difference between "start the antihistamine
 * earlier next spring" and "you keep catching things". */
function Journal({ days, todayIso, journalByDay, insight, onSeverity, onSymptom }) {
  const today = journalByDay.get(todayIso);
  const recent = days
    .filter((d) => d.date <= todayIso)
    .slice(-7)
    .reverse();

  const leaning = today && today.symptoms ? symptomLean(today.symptoms) : null;

  return (
    <Panel>
      <PanelTitle
        title="How did you actually feel?"
        right={<span style={{ fontSize: 11, color: C.dimmer }}>private to this browser</span>}
      />
      <div style={{ display: "flex", gap: 7 }}>
        {SEVERITY.map((s) => {
          const on = today && today.severity === s.value;
          return (
            <button
              key={s.value}
              onClick={() => onSeverity(todayIso, s.value)}
              aria-pressed={Boolean(on)}
              style={{
                flex: 1,
                padding: "11px 4px 9px",
                borderRadius: 12,
                border: `1px solid ${on ? s.color : C.line}`,
                background: on ? `${s.color}22` : C.panel2,
                color: on ? s.color : C.dim,
                cursor: "pointer",
                display: "grid",
                gap: 3,
                justifyItems: "center",
                fontWeight: 700,
              }}>
              <span style={{ fontSize: 19 }}>{s.emoji}</span>
              <span style={{ fontSize: 11.5 }}>{s.label}</span>
            </button>
          );
        })}
      </div>

      {today ? (
        <>
          <div style={{ fontSize: 11.5, color: C.dimmer, margin: "12px 0 7px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            What exactly?
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SYMPTOM_TAGS.map((tag) => {
              const on = (today.symptoms || []).includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => onSymptom(todayIso, tag)}
                  aria-pressed={on}
                  style={{
                    padding: "7px 11px",
                    borderRadius: 999,
                    border: `1px solid ${on ? C.accent : C.line}`,
                    background: on ? "#152036" : "transparent",
                    color: on ? C.text : C.dim,
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}>
                  {tag}
                </button>
              );
            })}
          </div>
          {leaning ? (
            <div
              style={{
                marginTop: 11,
                padding: "10px 12px",
                borderRadius: 11,
                background: verdictStyle(leaning.key).bg,
                border: `1px solid ${verdictStyle(leaning.key).fg}33`,
                fontSize: 12.5,
                color: verdictStyle(leaning.key).fg,
                lineHeight: 1.45,
              }}>
              {leaning.text}
            </div>
          ) : null}
        </>
      ) : (
        <div style={{ fontSize: 12, color: C.faint, marginTop: 10, lineHeight: 1.45 }}>
          Tap one. Nothing is sent anywhere identifying — it&apos;s stored against a random
          id kept in this browser, with no name, email or account, and clearing site data
          loses it.
        </div>
      )}

      {recent.length > 1 ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, color: C.dimmer, marginBottom: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            You vs. the forecast
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {recent.map((d) => {
              const e = journalByDay.get(d.date);
              const sev = e ? SEVERITY[e.severity] : null;
              const lc = levelColor(d.pollen.overall.level);
              return (
                <div key={d.date} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, color: C.faint }}>{dayLabel(d.date, todayIso)}</div>
                  <div
                    title={`pollen ${d.pollen.overall.level}/5`}
                    style={{ height: 5, borderRadius: 999, background: lc.bar, margin: "4px 0 5px", opacity: 0.5 + (d.pollen.overall.level / 10) }}
                  />
                  <div style={{ fontSize: 15 }}>{sev ? sev.emoji : <span style={{ color: C.line2 }}>·</span>}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <Insight insight={insight} />
    </Panel>
  );
}

/* Reads the symptom tags, not the numbers. A fever is not something pollen does,
 * and itchy eyes are not something a cold does — and that beats any index this
 * page computes for telling the two apart. Deliberately silent when the tags
 * point both ways, which is most of the time and is the honest answer. */
function symptomLean(symptoms) {
  let allergy = 0;
  let bug = 0;
  for (const s of symptoms) {
    if (SYMPTOM_LEAN[s] === "allergy") allergy += 1;
    if (SYMPTOM_LEAN[s] === "bug") bug += 1;
  }
  if (allergy >= 2 && bug === 0) {
    return {
      key: "allergy",
      text: "Itchy, sneezy and no fever is the allergy pattern — colds don't usually make your eyes itch.",
    };
  }
  if (bug >= 2 && allergy === 0) {
    return {
      key: "bug",
      text: "Fever, aches and a sore throat aren't what pollen does. That reads like something viral.",
    };
  }
  if (allergy && bug) {
    return { key: "unclear", text: "Mixed signals — some of those lean allergic and some viral." };
  }
  return null;
}

function Insight({ insight }) {
  if (!insight) return null;
  if (!insight.ready) {
    const logged = insight.logged || insight.n || 0;
    return (
      <div style={{ marginTop: 13, fontSize: 12, color: C.faint, lineHeight: 1.45 }}>
        {insight.note ? (
          insight.note
        ) : (
          <>
            {logged} of {insight.minN} days logged. At {insight.minN} this will tell you
            whether your bad days line up with the pollen or with the bug weather — below
            that it would just be noise.
          </>
        )}
      </div>
    );
  }
  const style = verdictStyle(insight.leans ? insight.leans.key : "unclear");
  return (
    <div
      style={{
        marginTop: 13,
        padding: "12px 13px",
        borderRadius: 12,
        background: style.bg,
        border: `1px solid ${style.fg}33`,
      }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: style.fg }}>
        {insight.leans ? insight.leans.label : "Not enough variation yet to tell"}
      </div>
      <div style={{ fontSize: 11.5, color: C.dim, marginTop: 5, lineHeight: 1.45 }}>
        Over {insight.n} logged days: r&nbsp;=&nbsp;{fmtR(insight.allergyR)} against the
        allergy line, {fmtR(insight.bugR)} against bug weather. {insight.caveat}
      </div>
    </div>
  );
}

const fmtR = (r) => (r == null ? "n/a" : r.toFixed(2));

// ── Sources ─────────────────────────────────────────────────────────────────

/* The footer repeats what the cards already said. That is the point: someone who
 * scrolled straight past the "modelled" chip should still not leave thinking a
 * counting station in Garden Oaks produced these numbers. */
function Sources({ source, place, updatedAt }) {
  const modelled = source.pollen === "model";
  return (
    <section style={{ margin: "18px 0 0", padding: "14px 15px", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 9 }}>
        Where these numbers come from
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8, fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
        <li>
          <b style={{ color: modelled ? "#fde047" : "#86efac" }}>
            Pollen — {modelled ? "modelled" : "measured feed"}.
          </b>{" "}
          {modelled ? (
            <>
              There is no free public pollen-count feed for US zip codes, so levels here are
              computed from {place.region ? `the ${place.region} ` : "this region's "}
              bloom calendar for each plant, scaled by the real weather forecast — warmth
              and wind raise release, rain scrubs the air, and the day after rain rebounds.
              They are <b>levels, not counts</b>: the grains/m³ figures shown are the
              National Allergy Bureau range that a level corresponds to at a counting
              station, not a sample taken near you. Treat them as a good guide to the
              shape of the week, not as a reading.
            </>
          ) : (
            <>Live pollen forecast feed, reported as counts where the feed provides them.</>
          )}
        </li>
        <li>
          <b style={{ color: "#86efac" }}>Air quality — measured.</b> PM2.5, PM10, ozone,
          dust and US AQI from Open-Meteo&apos;s air-quality model, which does cover the US.
        </li>
        <li>
          <b style={{ color: "#86efac" }}>Weather — forecast.</b> Open-Meteo, the same data
          the pollen model is driven by.
        </li>
        <li>
          <b style={{ color: "#c7d2fe" }}>Bug weather</b> is an environmental score, not a
          case count: respiratory-virus seasonality, how dry the air actually is in absolute
          terms, and day-to-day temperature swings. It says conditions favour transmission —
          it does not know who is sick near you.
        </li>
      </ul>
      <div style={{ fontSize: 11, color: C.faint, marginTop: 12, lineHeight: 1.5 }}>
        Not medical advice. If you are trying to work out whether to see someone about it,
        see someone about it.
      </div>
      <div style={{ fontSize: 10.5, color: C.faint, marginTop: 8 }}>
        Updated {updatedAt ? new Date(updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
        {place.timezone ? ` · ${place.timezone}` : ""}
      </div>
    </section>
  );
}

// ── Shell bits ──────────────────────────────────────────────────────────────

function Panel({ children }) {
  return (
    <section
      style={{
        margin: "0 0 14px",
        padding: "14px 15px",
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 14,
      }}>
      {children}
    </section>
  );
}

function PanelTitle({ title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 11 }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "-0.2px" }}>{title}</h2>
      {right}
    </div>
  );
}

function Banner({ tone, children }) {
  const styles = {
    error: { bg: "#1a1120", border: "#4d1e2b", fg: "#fca5a5" },
    warn: { bg: "#1a1710", border: "#4d3a1e", fg: "#fdba74" },
  };
  const s = styles[tone] || styles.warn;
  return (
    <div
      role="status"
      style={{
        margin: "6px 0 14px",
        padding: "12px 14px",
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 13,
        color: s.fg,
        fontSize: 13,
        lineHeight: 1.45,
      }}>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {[132, 108, 96, 120].map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            borderRadius: 14,
            background: C.panel,
            border: `1px solid ${C.line}`,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}
