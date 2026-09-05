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

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "./tasting.css";
import {
  createEvent,
  deleteBallot,
  getEvent,
  getHostView,
  loadMe,
  loadPin,
  saveMe,
  savePin,
  setPhase,
  setPour,
  setWines,
  submitBallot,
} from "./api";

const GLASSES = [1, 2, 3];
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

function Ballot({ code, me, onDone, onCancel }) {
  const prior = me && me.ballot;
  const [name, setName] = useState((me && me.name) || "");
  const [ranking, setRanking] = useState((prior && prior.ranking) || []);
  const [scores, setScores] = useState((prior && prior.scores) || {});
  const [notes, setNotes] = useState((prior && prior.notes) || {});
  const [cheapest, setCheapest] = useState((prior && prior.guess_cheapest) || null);
  const [oldest, setOldest] = useState((prior && prior.guess_oldest) || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        edit_token: me && me.edit_token,
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
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

      {error && <div className="wt-error">{error}</div>}

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

      <button className="wt-btn wt-btn--primary" disabled={!complete || busy}>
        {busy
          ? "Sending…"
          : ranking.length < GLASSES.length
            ? `Rank all three (${ranking.length}/3)`
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

const EMPTY_WINE = { name: "", producer: "", vintage: "", region: "", price: "", blurb: "" };

function HostPanel({ code, onClose, onChanged }) {
  const [pin, setPin] = useState(loadPin(code) || "");
  const [view, setView] = useState(null);
  const [wines, setWinesState] = useState(
    CARAFES.map((carafe) => ({ carafe, ...EMPTY_WINE })),
  );
  const [pourMap, setPourMap] = useState({ 1: "A", 2: "B", 3: "C" });
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);

  const unlock = useCallback(
    async (candidate) => {
      setError("");
      setBusy(true);
      try {
        const v = await getHostView(code, candidate);
        setView(v);
        savePin(code, candidate);
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
                blurb: found?.blurb || "",
              };
            }),
          );
        }
        if (v.pour_map) setPourMap(v.pour_map);
      } catch (err) {
        setError(err.message);
        setView(null);
      } finally {
        setBusy(false);
      }
    },
    [code],
  );

  useEffect(() => {
    const saved = loadPin(code);
    if (!saved) return;
    /* Declared and awaited inside the effect rather than called straight out of
     * it — same shape as the poll loop in /status. */
    const restore = async () => {
      await unlock(saved);
    };
    restore();
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
          one — leave either blank and that guess simply isn't scored.
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
  const [editing, setEditing] = useState(false);
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
          {event.tasters.map((t) => (
            <span key={t.name} className="wt-chip">
              {t.name}
            </span>
          ))}
        </div>
        {hostLink}
      </Shell>
    );
  }

  // phase === "tasting"
  if (!submitted || editing) {
    return (
      <Shell>
        <p className="wt-eyebrow">{event.name}</p>
        <h1 className="wt-title">{editing ? "Change your mind?" : "Your ballot"}</h1>
        <p className="wt-sub">
          Three glasses in front of you, numbered 1 to 3. Everyone at the table
          has the same three wines in the same numbered glasses — and nobody
          knows which is which.
        </p>
        <Ballot
          code={code}
          me={me}
          onDone={(saved) => {
            setMe(saved);
            setEditing(false);
            refresh();
          }}
          onCancel={editing ? () => setEditing(false) : null}
        />
        {hostLink}
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="wt-eyebrow">{event.name}</p>
      <h1 className="wt-title">You're in, {me.name}.</h1>
      <p className="wt-sub">
        <span className="wt-pulse" />
        {event.ballot_count} ballot{event.ballot_count === 1 ? "" : "s"} so far.
        Nothing is revealed until the host says so.
      </p>

      <div className="wt-panel">
        <h2 className="wt-h2">At the table</h2>
        <div className="wt-tasters">
          {event.tasters.map((t) => (
            <span
              key={t.name}
              className={
                t.name.trim().toLowerCase() === String(me.name).trim().toLowerCase()
                  ? "wt-chip wt-chip--me"
                  : "wt-chip"
              }
            >
              {t.name}
            </span>
          ))}
        </div>
      </div>

      <button className="wt-btn" style={{ width: "100%" }} onClick={() => setEditing(true)}>
        Change my ballot
      </button>
      {hostLink}
    </Shell>
  );
}
