/* Blind tasting — the phone half.
 *
 * bullionventuresllc.com/tasting. Seven people, three numbered glasses, one
 * shared pour: everybody's glass 2 holds the same wine, so a ballot is cast
 * against glass NUMBERS and the bottles stay anonymous until the host reveals.
 * The slideshow half is Results.jsx; the scoring is server-side in the shared
 * backend's services/tastingScoring.js, so nothing here decides who won.
 *
 * Unlisted on purpose (PRIVATE_GROUPS, not a home-page card) and full-screen
 * (hideChrome in App.jsx) — it is an instrument for one table, not a tool for
 * site visitors. Anyone with the join code can cast a ballot; the host PIN is
 * the only gate, and it guards exactly one thing worth guarding: the lineup.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "./tasting.css";
import {
  createEvent,
  deleteBallot,
  editToken,
  getEvent,
  getHostView,
  loadMe,
  loadPin,
  saveMe,
  savePin,
  setHostPin,
  setPhase,
  setPour,
  setRoster,
  setWines,
  submitBallot,
} from "./api";

const GLASSES = [1, 2, 3];

/* Must agree with tasterKey() in the backend's routes/wineTasting.js — it is
 * what decides that "Ashley" and "ashley" are one person. Two copies of one
 * rule, so keep them together. */
const nameKey = (n) => String(n || "").trim().toLowerCase().replace(/\s+/g, " ");
const CARAFES = ["A", "B", "C"];
const ORDINALS = ["1st", "2nd", "3rd"];
const POLL_MS = 5000;

/* One SPA, one document head. A static tag in index.html would de-index the
 * whole site, so the noindex is mounted with the page and removed with it —
 * the same arrangement as /jump, and for the same reason. */
function useNoIndex() {
  useEffect(() => {
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex, nofollow";
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);
}

/* What a taster needs to know, on the ballot itself. Written for someone
 * holding a glass who has not read anything else. */
function HowItWorks() {
  return (
    <div className="wt-panel">
      <h2 className="wt-h2">How this works</h2>
      <ol className="wt-howto">
        <li>
          <b>1</b>
          <span>
            Three glasses in front of you, numbered 1, 2 and 3. Everyone at the
            table has the same three wines in the same numbered glasses.
          </span>
        </li>
        <li>
          <b>2</b>
          <span>
            Taste all three side by side and go back and forth — comparing is
            the whole point, and memory is worse than you think. Water and plain
            bread between. No cheese until the votes are in; it flatters tannin.
          </span>
        </li>
        <li>
          <b>3</b>
          <span>
            Rank them, favourite first. All three, no ties. Scores and notes are
            optional — the ranking is what decides it.
          </span>
        </li>
        <li>
          <b>4</b>
          <span>
            Then two guesses: one of these bottles costs a fraction of the
            others, and one is much older.
          </span>
        </li>
        <li>
          <b>5</b>
          <span>
            Keep it to yourself until everyone has voted. Nothing is revealed
            until the host says so.
          </span>
        </li>
      </ol>
    </div>
  );
}

/* The host's running order. Every step ticks itself off from the event's real
 * state, so it doubles as "what still needs doing" — which is the question
 * actually being asked twenty minutes before a pour. */
function HostChecklist({ view }) {
  const rosterDone = Boolean(view.roster && view.roster.length);
  const winesDone = (view.wines || []).length === 3;
  const pourDone = Boolean(view.pour_map);
  const expected = rosterDone ? view.roster.length : null;
  const allVoted = expected ? view.ballot_count >= expected : view.ballot_count > 0;

  const steps = [
    {
      done: rosterDone,
      title: "Guest list",
      detail: rosterDone
        ? `${view.roster.length} people — they pick their name instead of typing it.`
        : "Add the names below so nobody arrives twice under two spellings.",
    },
    {
      done: winesDone,
      title: "Key 1 · decant into carafes A, B and C",
      detail: winesDone
        ? "Set. Whoever did this knows which carafe holds what — so they must NOT do Key 2."
        : "Record which wine went into which carafe, below.",
    },
    {
      done: pourDone,
      title: "Key 2 · pour the carafes into glasses 1, 2 and 3",
      detail: pourDone
        ? "Set. Nobody who has seen both keys is tasting blind."
        : "Hand the phone to someone who did NOT do Key 1. They hit Shuffle for me, save, and pour to match — without being told what the carafes hold.",
    },
    {
      done: allVoted,
      title: "Everyone votes",
      detail: expected
        ? `${view.ballot_count} of ${expected} ballots in.`
        : `${view.ballot_count} ballots in.`,
    },
    {
      done: view.phase === "locked" || view.phase === "revealed",
      title: "Lock the ballots",
      detail: "Before anyone starts talking. A ballot cast after the conversation isn't a blind one.",
    },
    {
      done: view.phase === "revealed",
      title: "Reveal, and put the results on the big screen",
      detail: "There is no undo. Once the wines are out, they're out.",
    },
  ];

  return (
    <div className="wt-panel">
      <h2 className="wt-h2">Running the night</h2>
      <ol className="wt-steps">
        {steps.map((step, i) => (
          <li key={step.title} data-done={step.done ? "1" : "0"}>
            <span className="wt-tick" data-done={step.done ? "1" : "0"}>
              {step.done ? "✓" : i + 1}
            </span>
            <span className="wt-step-body">
              <span className="wt-step-t">{step.title}</span>
              <span className="wt-step-d">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      {!view.pin_required && (
        <p className="wt-warn" style={{ marginTop: 14, marginBottom: 0 }}>
          This tasting has no PIN, so anyone with the link can reach this screen
          — including the Reveal button. That was deliberate; just know that a
          curious guest tapping around can open the wines early.
        </p>
      )}
    </div>
  );
}

function Shell({ children, wide }) {
  return (
    <div className="wt">
      <div className={wide ? "wt-wrap wt-wrap--wide" : "wt-wrap"}>{children}</div>
    </div>
  );
}

// ── Landing: join an existing tasting, or start one ──────────────────────────

function Landing() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [starting, setStarting] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const created = await createEvent({
        name: name.trim(),
        code: code.trim().toLowerCase() || undefined,
        pin: pin.trim(),
      });
      savePin(created.code, pin.trim());
      navigate(`/tasting/${created.code}?host=1`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <p className="wt-eyebrow">Bullion Ventures</p>
      <h1 className="wt-title">Blind Tasting</h1>
      <p className="wt-sub">
        Three numbered glasses, one honest opinion each, and nobody finds out
        what they drank until everyone has voted.
      </p>

      {error && <div className="wt-error">{error}</div>}

      {!starting ? (
        <>
          <div className="wt-panel">
            <h2 className="wt-h2">Join a tasting</h2>
            <p className="wt-hint">The host has a short code — type it here.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const c = joinCode.trim().toLowerCase();
                if (c) navigate(`/tasting/${c}`);
              }}
            >
              <input
                className="wt-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. cabnight"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Tasting code"
              />
              <div style={{ height: 12 }} />
              <button className="wt-btn wt-btn--primary" type="submit">
                Join
              </button>
            </form>
          </div>

          <button
            className="wt-btn wt-btn--ghost"
            style={{ width: "100%" }}
            onClick={() => setStarting(true)}
          >
            Start a new tasting
          </button>
        </>
      ) : (
        <form className="wt-panel" onSubmit={start}>
          <h2 className="wt-h2">Start a tasting</h2>
          <p className="wt-hint">
            You keep the PIN. It is the only thing that can set the wines, close
            the ballots and reveal the answers.
          </p>
          <label className="wt-field">
            <span className="wt-label">What are we calling it</span>
            <input
              className="wt-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cab Night"
              required
            />
          </label>
          <label className="wt-field">
            <span className="wt-label">Join code (optional)</span>
            <input
              className="wt-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="left blank, we'll make one up"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <label className="wt-field">
            <span className="wt-label">Host PIN — 4 to 8 digits</span>
            <input
              className="wt-input"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="••••"
              required
            />
          </label>
          <button className="wt-btn wt-btn--primary" disabled={busy} type="submit">
            {busy ? "Setting the table…" : "Create it"}
          </button>
          <div style={{ height: 10 }} />
          <button
            type="button"
            className="wt-btn wt-btn--ghost wt-btn--sm"
            onClick={() => setStarting(false)}
          >
            Back
          </button>
        </form>
      )}
    </Shell>
  );
}

// ── The ballot ───────────────────────────────────────────────────────────────

/* Tap-to-rank rather than drag-and-drop: one hand is holding a glass, and a
 * drag list on a phone is a fight even with two. Tapping a glass gives it the
 * next open place; tapping it again takes the place back and closes the gap. */
function GlassRanker({ ranking, onToggle }) {
  return (
    <div>
      {GLASSES.map((glass) => {
        const idx = ranking.indexOf(glass);
        const ranked = idx >= 0;
        return (
          <button
            key={glass}
            type="button"
            className="wt-glass"
            data-rank={ranked ? idx + 1 : undefined}
            onClick={() => onToggle(glass)}
          >
            <span className="wt-glass-no" aria-hidden="true">
              {glass}
            </span>
            <span className="wt-glass-body">
              <span className="wt-glass-name">Glass {glass}</span>
              <span className="wt-glass-state">
                {ranked ? "Tap again to unpick" : "Tap to place it"}
              </span>
            </span>
            <span
              className={
                ranked ? "wt-rank-badge" : "wt-rank-badge wt-rank-badge--empty"
              }
            >
              {ranked ? ORDINALS[idx] : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* A grid of names rather than a <select>: a native picker on a phone is a modal
 * wheel that hides the list, and the list is the useful part — it shows at a
 * glance who has already voted. A name that is taken by somebody else is
 * disabled; your own stays tappable so you can correct your ballot. */
function NamePicker({ roster, taken, mine, value, onChange }) {
  return (
    <div className="wt-namegrid">
      {roster.map((n) => {
        const isMine = mine && nameKey(mine) === nameKey(n);
        const isTaken = taken.has(nameKey(n)) && !isMine;
        return (
          <button
            key={n}
            type="button"
            disabled={isTaken}
            data-on={nameKey(value) === nameKey(n) ? "1" : "0"}
            onClick={() => onChange(n)}
          >
            {n}
            {taken.has(nameKey(n)) && <span className="wt-voted">voted</span>}
          </button>
        );
      })}
    </div>
  );
}

function Ballot({ code, event, me, blank, onDone, onCancel }) {
  const prior = me && me.ballot;
  const [name, setName] = useState((me && me.name) || "");
  const [ranking, setRanking] = useState((prior && prior.ranking) || []);
  const [scores, setScores] = useState((prior && prior.scores) || {});
  const [notes, setNotes] = useState((prior && prior.notes) || {});
  const [cheapest, setCheapest] = useState((prior && prior.guess_cheapest) || null);
  const [oldest, setOldest] = useState((prior && prior.guess_oldest) || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef(null);

  const roster = event && event.roster;
  const taken = useMemo(
    () => new Set(((event && event.tasters) || []).map((t) => nameKey(t.name))),
    [event],
  );

  function toggle(glass) {
    setRanking((cur) =>
      cur.includes(glass) ? cur.filter((g) => g !== glass) : [...cur, glass],
    );
  }

  const complete = name.trim().length > 0 && ranking.length === GLASSES.length;

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = {
        taster_name: name.trim(),
        ranking,
        scores,
        notes,
        guess_cheapest: cheapest,
        guess_oldest: oldest,
        /* Ours if we have one, otherwise this device's own — generated before
         * the request rather than after it, so a retry lands on the same row.
         * See the retry note in api.js. */
        edit_token: (me && me.edit_token) || editToken(code),
      };
      const res = await submitBallot(code, body);
      const saved = {
        name: res.name,
        edit_token: res.edit_token,
        ballot: body,
      };
      saveMe(code, saved);
      onDone(saved);
    } catch (err) {
      setError(err.message);
      // Nothing below the fold is any use to someone who just watched a button
      // do nothing.
      requestAnimationFrame(() =>
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {roster ? (
        <div className="wt-panel">
          <h2 className="wt-h2">Which one are you?</h2>
          <p className="wt-hint">Tap your name. Greyed out means already voted.</p>
          <NamePicker
            roster={roster}
            taken={taken}
            mine={me && me.name}
            value={name}
            onChange={setName}
          />
        </div>
      ) : (
        <label className="wt-field">
          <span className="wt-label">Who's tasting</span>
          <input
            className="wt-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            required
          />
        </label>
      )}

      <div className="wt-panel">
        <h2 className="wt-h2">Rank them</h2>
        <p className="wt-hint">
          Favourite first. All three, no ties — a forced order is the one thing
          that survives everybody scoring on a different scale.
        </p>
        <GlassRanker ranking={ranking} onToggle={toggle} />
      </div>

      <div className="wt-panel">
        <h2 className="wt-h2">Score them</h2>
        <p className="wt-hint">
          Out of 10, optional. This doesn't decide the winner — it shows whether
          second place was close or a landslide.
        </p>
        {GLASSES.map((glass) => (
          <div key={glass} style={{ marginBottom: 18 }}>
            <span className="wt-label">Glass {glass}</span>
            <div className="wt-scale">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  data-on={scores[glass] === n ? "1" : "0"}
                  onClick={() =>
                    setScores((cur) => ({
                      ...cur,
                      [glass]: cur[glass] === n ? undefined : n,
                    }))
                  }
                  aria-label={`Glass ${glass}, ${n} out of 10`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{ height: 8 }} />
            <input
              className="wt-input"
              value={notes[glass] || ""}
              onChange={(e) =>
                setNotes((cur) => ({ ...cur, [glass]: e.target.value }))
              }
              placeholder={`A few words on glass ${glass}…`}
              maxLength={280}
              aria-label={`Note for glass ${glass}`}
            />
          </div>
        ))}
      </div>

      <div className="wt-panel">
        <h2 className="wt-h2">Two guesses</h2>
        <p className="wt-hint">
          One of these bottles costs a fraction of the others, and one is much
          older. Optional, but this is the fun part.
        </p>

        <span className="wt-label">Which is the cheap one?</span>
        <div className="wt-pills">
          {GLASSES.map((glass) => (
            <button
              key={glass}
              type="button"
              data-on={cheapest === glass ? "1" : "0"}
              onClick={() => setCheapest((c) => (c === glass ? null : glass))}
            >
              Glass {glass}
            </button>
          ))}
        </div>

        <div style={{ height: 16 }} />

        <span className="wt-label">Which is the oldest?</span>
        <div className="wt-pills">
          {GLASSES.map((glass) => (
            <button
              key={glass}
              type="button"
              data-on={oldest === glass ? "1" : "0"}
              onClick={() => setOldest((c) => (c === glass ? null : glass))}
            >
              Glass {glass}
            </button>
          ))}
        </div>
      </div>

      {/* Beside the button that causes it. It used to sit at the top of a form
        * three screens tall, so a failed submit looked exactly like nothing
        * happening — which is precisely how it was reported. */}
      {error && (
        <div className="wt-error" ref={errorRef}>
          {error}
        </div>
      )}

      <button className="wt-btn wt-btn--primary" disabled={!complete || busy}>
        {busy
          ? "Sending…"
          : ranking.length < GLASSES.length
            ? `Rank all three (${ranking.length}/3)`
            : blank
              ? name.trim()
                ? `Add ${name.trim()}'s ballot`
                : "Add this ballot"
              : prior
                ? "Update my ballot"
                : "Lock in my ballot"}
      </button>
      {onCancel && (
        <>
          <div style={{ height: 10 }} />
          <button
            type="button"
            className="wt-btn wt-btn--ghost wt-btn--sm"
            onClick={onCancel}
          >
            Never mind
          </button>
        </>
      )}
    </form>
  );
}

// ── Host panel ───────────────────────────────────────────────────────────────

const EMPTY_WINE = {
  name: "",
  producer: "",
  vintage: "",
  region: "",
  price: "",
  priceSource: "",
  blurb: "",
};

function HostPanel({ code, onClose, onChanged }) {
  const [pin, setPin] = useState(loadPin(code) || "");
  const [view, setView] = useState(null);
  const [wines, setWinesState] = useState(
    CARAFES.map((carafe) => ({ carafe, ...EMPTY_WINE })),
  );
  const [pourMap, setPourMap] = useState({ 1: "A", 2: "B", 3: "C" });
  const [rosterText, setRosterText] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);

  const unlock = useCallback(
    async (candidate, { silent = false } = {}) => {
      setError("");
      setBusy(true);
      try {
        const v = await getHostView(code, candidate);
        setView(v);
        if (candidate) savePin(code, candidate);
        if (v.wines && v.wines.length === CARAFES.length) {
          setWinesState(
            CARAFES.map((carafe) => {
              const found = v.wines.find((w) => w.carafe === carafe);
              return {
                carafe,
                name: found?.name || "",
                producer: found?.producer || "",
                vintage: found?.vintage || "",
                region: found?.region || "",
                price: found?.price ?? "",
                priceSource: found?.priceSource || "",
                blurb: found?.blurb || "",
              };
            }),
          );
        }
        if (v.pour_map) setPourMap(v.pour_map);
        if (v.roster) setRosterText(v.roster.join(", "));
      } catch (err) {
        // The opening attempt is silent: on an open tasting it succeeds, and on
        // a locked one it is just how we discover a PIN is wanted. Showing its
        // failure would greet the host with an error they did not cause.
        if (!silent) setError(err.message);
        setView(null);
      } finally {
        setBusy(false);
      }
    },
    [code],
  );

  useEffect(() => {
    /* Try to walk straight in: an open tasting needs no PIN, and a remembered
     * one gets us past a lock. Only if that fails is the PIN screen shown.
     * Declared and awaited inside the effect rather than called straight out of
     * it — same shape as the poll loop in /status. */
    const enter = async () => {
      await unlock(loadPin(code) || "", { silent: true });
    };
    enter();
  }, [code, unlock]);

  function say(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2600);
  }

  async function run(fn, okMessage) {
    setError("");
    setBusy(true);
    try {
      await fn();
      await unlock(pin);
      onChanged();
      say(okMessage);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!view) {
    return (
      <Shell>
        <p className="wt-eyebrow">Host</p>
        <h1 className="wt-title">PIN, please</h1>
        {error && <div className="wt-error">{error}</div>}
        <form
          className="wt-panel"
          onSubmit={(e) => {
            e.preventDefault();
            unlock(pin);
          }}
        >
          <input
            className="wt-input"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="••••"
            aria-label="Host PIN"
          />
          <div style={{ height: 12 }} />
          <button className="wt-btn wt-btn--primary" disabled={busy}>
            {busy ? "Checking…" : "Unlock"}
          </button>
        </form>
        <button className="wt-btn wt-btn--ghost wt-btn--sm" onClick={onClose}>
          Back to the tasting
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="wt-eyebrow">Host · {view.code}</p>
      <h1 className="wt-title">{view.name}</h1>
      <p className="wt-sub">
        Phase: <strong>{view.phase}</strong> · {view.ballot_count} ballot
        {view.ballot_count === 1 ? "" : "s"} in
        {view.ready ? " · lineup set" : " · lineup incomplete"}
      </p>

      {error && <div className="wt-error">{error}</div>}
      {flash && (
        <div className="wt-panel" style={{ borderColor: "#5fae7d" }}>
          {flash}
        </div>
      )}

      <HostChecklist view={view} />

      {/* The guest list. Above Key 1 because it is the first thing set up, and
        * because it is the only part of the panel that is not a secret. */}
      <div className="wt-panel">
        <h2 className="wt-h2">Who's tasting</h2>
        <p className="wt-hint">
          Names separated by commas. With a list, everyone picks their name
          instead of typing it — which is what keeps one person from arriving
          twice under two spellings. Leave it blank to let people type.
        </p>
        <input
          className="wt-input"
          value={rosterText}
          onChange={(e) => setRosterText(e.target.value)}
          placeholder="Ashley, Patrick, Judy…"
          aria-label="Guest list"
        />
        <div style={{ height: 10 }} />
        <button
          className="wt-btn"
          disabled={busy}
          onClick={() =>
            run(() => setRoster(code, pin, rosterText), "Guest list saved.")
          }
        >
          Save the guest list
        </button>
        {view.roster && (
          <p className="wt-hint" style={{ marginTop: 12 }}>
            {view.roster.length} on the list · {view.ballot_count} voted
          </p>
        )}
      </div>

      {/* Key 1 — carafe to wine. */}
      <div className="wt-panel">
        <h2 className="wt-h2">Key 1 · what's in each carafe</h2>
        <p className="wt-hint">
          Decant the bottles into three carafes marked A, B and C, then record
          them here. Whoever does this must not do Key 2 if they want to taste
          blind — hand the phone over.
        </p>
        {wines.map((w, i) => (
          <div key={w.carafe} style={{ marginBottom: 16 }}>
            <span className="wt-label">Carafe {w.carafe}</span>
            <input
              className="wt-input"
              value={w.name}
              placeholder="Wine name"
              onChange={(e) => {
                const next = [...wines];
                next[i] = { ...w, name: e.target.value };
                setWinesState(next);
              }}
            />
            <div style={{ height: 8 }} />
            <div className="wt-row">
              <input
                className="wt-input"
                value={w.vintage}
                placeholder="Vintage"
                inputMode="numeric"
                onChange={(e) => {
                  const next = [...wines];
                  next[i] = { ...w, vintage: e.target.value };
                  setWinesState(next);
                }}
              />
              <input
                className="wt-input"
                value={w.price}
                placeholder="Price $"
                inputMode="decimal"
                onChange={(e) => {
                  const next = [...wines];
                  next[i] = { ...w, price: e.target.value };
                  setWinesState(next);
                }}
              />
            </div>
            <div style={{ height: 8 }} />
            <input
              className="wt-input"
              value={w.priceSource}
              placeholder="Where the price came from"
              onChange={(e) => {
                const next = [...wines];
                next[i] = { ...w, priceSource: e.target.value };
                setWinesState(next);
              }}
            />
            <div style={{ height: 8 }} />
            <input
              className="wt-input"
              value={w.region}
              placeholder="Region"
              onChange={(e) => {
                const next = [...wines];
                next[i] = { ...w, region: e.target.value };
                setWinesState(next);
              }}
            />
          </div>
        ))}
        <p className="wt-hint">
          Vintage decides the “oldest” answer and price decides the “cheapest”
          one — leave either blank and that guess simply isn't scored. Where the
          price came from is for you, not the guests: it never leaves the host
          panel, and it is what lets you check a figure months later.
        </p>
        <button
          className="wt-btn"
          disabled={busy}
          onClick={() => run(() => setWines(code, pin, wines), "Carafes saved.")}
        >
          Save the carafes
        </button>
      </div>

      {/* Key 2 — glass to carafe. */}
      <div className="wt-panel">
        <h2 className="wt-h2">Key 2 · which carafe went in each glass</h2>
        <p className="wt-hint">
          The pourer fills glasses 1, 2 and 3 from the carafes and records it
          here — without ever knowing what the carafes hold.
        </p>
        {GLASSES.map((glass) => (
          <div key={glass} style={{ marginBottom: 12 }}>
            <span className="wt-label">Glass {glass}</span>
            <div className="wt-pills">
              {CARAFES.map((carafe) => (
                <button
                  key={carafe}
                  type="button"
                  data-on={pourMap[glass] === carafe ? "1" : "0"}
                  onClick={() => setPourMap((cur) => ({ ...cur, [glass]: carafe }))}
                >
                  {carafe}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="wt-hint">
          Each carafe once. {new Set(GLASSES.map((g) => pourMap[g])).size === 3
            ? "Looks right."
            : "Two glasses are pointing at the same carafe."}
        </p>
        <div className="wt-row">
          <button
            className="wt-btn"
            type="button"
            onClick={() => {
              const shuffled = [...CARAFES];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              setPourMap({ 1: shuffled[0], 2: shuffled[1], 3: shuffled[2] });
            }}
          >
            Shuffle for me
          </button>
          <button
            className="wt-btn"
            disabled={busy || new Set(GLASSES.map((g) => pourMap[g])).size !== 3}
            onClick={() => run(() => setPour(code, pin, pourMap), "Pour saved.")}
          >
            Save the pour
          </button>
        </div>
        {view.pour_map && (
          <>
            <div style={{ height: 10 }} />
            <button
              className="wt-btn wt-btn--ghost wt-btn--sm"
              disabled={busy}
              onClick={() =>
                run(
                  () => setPour(code, pin, null),
                  "Pour cleared — nobody can reveal until it is set again.",
                )
              }
            >
              Clear the pour
            </button>
          </>
        )}
      </div>

      {/* Phases. */}
      <div className="wt-panel">
        <h2 className="wt-h2">Run the tasting</h2>
        <p className="wt-hint">
          Lock the ballots before anybody starts talking — a ballot cast after
          the conversation starts isn't a blind one.
        </p>
        <div className="wt-row">
          <button
            className="wt-btn"
            disabled={busy || view.phase === "tasting"}
            onClick={() => run(() => setPhase(code, pin, "tasting"), "Ballots open.")}
          >
            Reopen ballots
          </button>
          <button
            className="wt-btn"
            disabled={busy || view.phase === "locked"}
            onClick={() => run(() => setPhase(code, pin, "locked"), "Ballots closed.")}
          >
            Lock ballots
          </button>
        </div>
        <div style={{ height: 10 }} />
        <button
          className="wt-btn wt-btn--gold"
          style={{ width: "100%" }}
          disabled={busy || view.phase === "revealed"}
          onClick={() => run(() => setPhase(code, pin, "revealed"), "Revealed.")}
        >
          {view.phase === "revealed" ? "Already revealed" : "Reveal the wines"}
        </button>
      </div>

      {/* Start over. What makes a practice run worth doing: you can rehearse the
        * whole thing, reveal included, and put it back to a blank tasting. */}
      <div className="wt-panel">
        <h2 className="wt-h2">Start over</h2>
        <p className="wt-hint">
          Deletes every ballot and reopens voting. The wines and the pour stay
          as they are. Use it after a practice run.
        </p>
        <button
          className="wt-btn"
          disabled={busy || (view.ballot_count === 0 && view.phase === "tasting")}
          onClick={() => {
            if (
              !window.confirm(
                `Delete all ${view.ballot_count} ballots and reopen voting?`,
              )
            )
              return;
            run(async () => {
              for (const row of view.ballot_rows || []) {
                await deleteBallot(code, pin, row.id);
              }
              if (view.phase !== "tasting") await setPhase(code, pin, "tasting");
            }, "Cleared — back to a blank tasting.");
          }}
        >
          Clear every ballot and reopen voting
        </button>
      </div>

      {/* Access. */}
      <div className="wt-panel">
        <h2 className="wt-h2">Access</h2>
        <p className="wt-hint">
          {view.pin_required
            ? "This tasting has a host PIN. Only someone who knows it can set the wines, lock or reveal."
            : "Open — anyone with the link can set the wines, lock and reveal. Fine among friends; the one thing it allows is somebody revealing before you meant to."}
        </p>
        <div className="wt-row">
          <input
            className="wt-input"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder={view.pin_required ? "New PIN" : "Add a PIN"}
            aria-label="New host PIN"
          />
          <button
            className="wt-btn"
            disabled={busy || newPin.length < 4}
            onClick={() =>
              run(async () => {
                await setHostPin(code, pin, newPin);
                setPin(newPin);
                savePin(code, newPin);
                setNewPin("");
              }, "PIN set.")
            }
          >
            {view.pin_required ? "Change it" : "Add it"}
          </button>
        </div>
        {view.pin_required && (
          <>
            <div style={{ height: 10 }} />
            <button
              className="wt-btn wt-btn--ghost wt-btn--sm"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await setHostPin(code, pin, "");
                  setPin("");
                  savePin(code, "");
                }, "PIN removed — this tasting is open now.")
              }
            >
              Remove the PIN
            </button>
          </>
        )}
      </div>

      {/* Ballots. */}
      <div className="wt-panel">
        <h2 className="wt-h2">Ballots in</h2>
        {view.ballot_count === 0 && <p className="wt-hint">Nobody yet.</p>}
        {(view.ballot_rows || []).map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "9px 0",
              borderBottom: "1px solid var(--wt-line)",
            }}
          >
            <span>{t.name}</span>
            <button
              className="wt-btn wt-btn--ghost wt-btn--sm"
              disabled={busy}
              onClick={() =>
                run(() => deleteBallot(code, pin, t.id), `${t.name} removed.`)
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button className="wt-btn wt-btn--ghost" style={{ width: "100%" }} onClick={onClose}>
        Back to the tasting
      </button>
    </Shell>
  );
}

// ── The page ─────────────────────────────────────────────────────────────────

export default function Tasting() {
  useNoIndex();
  const { code } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [me, setMe] = useState(() => (code ? loadMe(code) : null));
  /* null = not on the form. "edit" = correcting your own, pre-filled.
   * "other" = a BLANK form for typing in someone else's paper ballot.
   *
   * Blank is the entire point of the distinction. Reusing the pre-filled edit
   * form to enter a second person is how one person's ranking and scores end
   * up silently attached to the next person's name — you change the name, miss
   * a field, and nothing on screen looks wrong. */
  const [mode, setMode] = useState(null);
  const [flash, setFlash] = useState("");
  const [searchParams] = useSearchParams();
  /* Derived from the URL rather than captured at mount: creating a tasting
   * navigates from /tasting to /tasting/:code?host=1, and whether React Router
   * remounts this component across that pair of routes is not something to
   * depend on. null means "no local override, follow the URL". */
  const [hostOverride, setHostOverride] = useState(null);
  const hosting =
    hostOverride === null ? searchParams.get("host") === "1" : hostOverride;

  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      const e = await getEvent(code);
      setEvent(e);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    }
  }, [code]);

  useEffect(() => {
    const load = async () => {
      await refresh();
    };
    load();
  }, [refresh]);

  /* Poll while the tasting is live so the lobby fills in as people submit and
   * the reveal lands on everyone's phone at once. Stop once it is revealed —
   * there is nothing left to change, and this runs on seven phones. */
  const phase = event && event.phase;
  useEffect(() => {
    if (!code || phase === "revealed") return undefined;
    const id = setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code, phase, refresh]);

  const submitted = useMemo(() => {
    if (!event || !me) return false;
    return event.tasters.some(
      (t) => t.name.trim().toLowerCase() === String(me.name).trim().toLowerCase(),
    );
  }, [event, me]);

  if (!code) return <Landing />;

  if (hosting) {
    return (
      <HostPanel
        code={code}
        onChanged={refresh}
        onClose={() => {
          setHostOverride(false);
          navigate(`/tasting/${code}`, { replace: true });
        }}
      />
    );
  }

  if (loadError && !event) {
    return (
      <Shell>
        <h1 className="wt-title">Nothing here</h1>
        <p className="wt-sub">{loadError}</p>
        <button className="wt-btn wt-btn--primary" onClick={() => navigate("/tasting")}>
          Try another code
        </button>
      </Shell>
    );
  }

  if (!event) {
    return (
      <Shell>
        <p className="wt-sub">Pouring…</p>
      </Shell>
    );
  }

  const hostLink = (
    <>
      <div style={{ height: 22 }} />
      <button
        className="wt-btn wt-btn--ghost wt-btn--sm"
        onClick={() => setHostOverride(true)}
      >
        I'm the host
      </button>
    </>
  );

  if (event.phase === "revealed") {
    return (
      <Shell>
        <p className="wt-eyebrow">{event.name}</p>
        <h1 className="wt-title">The wines are out.</h1>
        <p className="wt-sub">
          {event.ballot_count} ballot{event.ballot_count === 1 ? "" : "s"} counted.
          Put this on the biggest screen in the room.
        </p>
        <button
          className="wt-btn wt-btn--primary"
          onClick={() => navigate(`/tasting/${code}/results`)}
        >
          Show me the results
        </button>
        {hostLink}
      </Shell>
    );
  }

  if (event.phase === "locked") {
    return (
      <Shell>
        <p className="wt-eyebrow">{event.name}</p>
        <h1 className="wt-title">Ballots are closed.</h1>
        <p className="wt-sub">
          {event.ballot_count} in. Talk amongst yourselves — the host has the
          reveal.
        </p>
        <div className="wt-tasters">
          {(event.roster || event.tasters.map((t) => t.name)).map((n) => {
            const voted = event.tasters.some((t) => nameKey(t.name) === nameKey(n));
            return (
              <span key={n} className={voted ? "wt-chip" : "wt-chip wt-chip--waiting"}>
                {n}
                {voted ? "" : " · never voted"}
              </span>
            );
          })}
        </div>
        {hostLink}
      </Shell>
    );
  }

  // phase === "tasting"
  if (!submitted || mode) {
    return (
      <Shell>
        <p className="wt-eyebrow">{event.name}</p>
        <h1 className="wt-title">
          {mode === "other"
            ? "Someone else's card"
            : mode === "edit"
              ? "Change your mind?"
              : "Your ballot"}
        </h1>
        <p className="wt-sub">
          {mode === "other"
            ? "A blank card. Pick whose it is, then copy their paper across — every field, from scratch."
            : "Three glasses in front of you, numbered 1 to 3. Everyone at the table has the same three wines in the same numbered glasses — and nobody knows which is which."}
        </p>
        {!mode && <HowItWorks />}
        <Ballot
          /* Remounted per mode, so switching from your own ballot to a blank
           * one genuinely clears the fields instead of inheriting them. */
          key={mode || "self"}
          code={code}
          event={event}
          /* No `me` on a blank form: that is what empties the name, the
           * ranking, the scores and the notes, and what makes the ballot
           * carry this device's own token rather than the last person's. */
          me={mode === "other" ? null : me}
          blank={mode === "other"}
          onDone={(saved) => {
            if (mode === "other") {
              setFlash(`${saved.name}'s ballot is in.`);
            } else {
              setMe(saved);
            }
            setMode(null);
            refresh();
          }}
          onCancel={mode ? () => setMode(null) : null}
        />
        {hostLink}
      </Shell>
    );
  }

  const outstanding = (event.roster || []).filter(
    (n) => !event.tasters.some((t) => nameKey(t.name) === nameKey(n)),
  );

  return (
    <Shell>
      <p className="wt-eyebrow">{event.name}</p>
      <h1 className="wt-title">You're in, {me.name}.</h1>
      {flash && (
        <div className="wt-panel" style={{ borderColor: "var(--wt-good)" }}>
          {flash}
        </div>
      )}
      <p className="wt-sub">
        <span className="wt-pulse" />
        {event.ballot_count} ballot{event.ballot_count === 1 ? "" : "s"} so far.
        Nothing is revealed until the host says so.
      </p>

      <div className="wt-panel">
        <h2 className="wt-h2">At the table</h2>
        {/* With a guest list the interesting question is who we are still
          * waiting on, so render the whole roster and mark the gaps. */}
        <div className="wt-tasters">
          {(event.roster || event.tasters.map((t) => t.name)).map((n) => {
            const voted = event.tasters.some((t) => nameKey(t.name) === nameKey(n));
            const isMe = nameKey(n) === nameKey(me.name);
            return (
              <span
                key={n}
                className={
                  isMe
                    ? "wt-chip wt-chip--me"
                    : voted
                      ? "wt-chip"
                      : "wt-chip wt-chip--waiting"
                }
              >
                {n}
                {!voted && !isMe ? " · waiting" : ""}
              </span>
            );
          })}
        </div>
      </div>

      <button className="wt-btn" style={{ width: "100%" }} onClick={() => setMode("edit")}>
        Change my ballot
      </button>

      {/* One person entering everybody's paper cards is a normal way to run
        * this, so it gets its own button and its own blank form rather than
        * being improvised out of "Change my ballot". Hidden once the roster is
        * complete, because then there is nobody left to enter. */}
      {outstanding.length > 0 && (
        <>
          <div style={{ height: 10 }} />
          <button
            className="wt-btn wt-btn--gold"
            style={{ width: "100%" }}
            onClick={() => setMode("other")}
          >
            Enter someone else's card
          </button>
          <p className="wt-hint" style={{ marginTop: 10, marginBottom: 0 }}>
            Still to come: {outstanding.join(", ")}.
          </p>
        </>
      )}
      {hostLink}
    </Shell>
  );
}
