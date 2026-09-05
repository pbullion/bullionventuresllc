/* Blind tasting — the television half.
 *
 * bullionventuresllc.com/tasting/:code/results. A slideshow, not a dashboard:
 * the whole point is that the room finds things out in an order, so the deck
 * puts the "which one was the cheap bottle" reveal BEFORE the podium — it gets
 * the loudest reaction and it is a worse slide once you already know who won.
 *
 * Every number on screen is computed by the backend
 * (services/tastingScoring.js) and rendered verbatim here, the same arrangement
 * as /engine-limits and /totals-value. If a scoring rule looks wrong, it is
 * wrong in the backend — do not re-derive it in this file, or the app and the
 * API will start disagreeing about who won.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./tasting.css";
import { getResults } from "./api";

const MEDALS = ["🥇", "🥈", "🥉"];

function bottleLine(wine) {
  return [wine.vintage, wine.region].filter(Boolean).join(" · ");
}

function money(n) {
  if (typeof n !== "number") return null;
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

function names(list) {
  if (!list || !list.length) return "nobody";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/* Scattered with irrational multiples of the index rather than Math.random:
 * a component must be pure, and re-rendering a slide that re-rolled its
 * confetti mid-fall would visibly twitch. These constants (phi, the plastic
 * number, root two, root three, all fractional parts) spread evenly without
 * ever lining up, which is exactly what a random scatter is wanted for. */
const CONFETTI = Array.from({ length: 44 }, (_, i) => ({
  id: i,
  left: ((i * 0.6180339887) % 1) * 100,
  delay: ((i * 0.7548776662) % 1) * 1.6,
  duration: 2.6 + ((i * 0.4142135624) % 1) * 2.2,
  color: ["#d8b26b", "#a8324f", "#f5ebe6", "#6d1930"][i % 4],
  tilt: ((i * 0.3247179572) % 1) * 360,
}));

function Confetti() {
  const bits = CONFETTI;
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}
    >
      {bits.map((b) => (
        <span
          key={b.id}
          className="wt-confetti"
          style={{
            left: `${b.left}%`,
            background: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            transform: `rotate(${b.tilt}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div className="wt-stat">
      <div className="wt-stat-n">{n}</div>
      <div className="wt-stat-l">{label}</div>
    </div>
  );
}

/* ── The deck ─────────────────────────────────────────────────────────────────
 * Each entry is { key, title, render }. Slides that have nothing to say (no
 * tasting notes were written, the host left the prices blank) drop out here
 * rather than rendering an empty screen — a blank slide in front of a room
 * reads as a bug. */
function buildSlides(r) {
  const podium = r.tally;
  const winner = podium[0];
  const cheap = r.guesses.cheapest;
  const cheapWine = cheap.answerable
    ? r.lineup.find((w) => w.glass === cheap.answer_glass)
    : null;
  const cheapPlace = cheapWine
    ? podium.find((row) => row.glass === cheapWine.glass).place
    : null;
  const maxBorda = Math.max(...podium.map((row) => row.borda));
  const withNotes = podium.filter((row) => row.notes.length > 0);

  const slides = [];

  slides.push({
    key: "cover",
    render: () => (
      <>
        <p className="wt-eyebrow">Bullion Ventures · Blind Tasting</p>
        <h1>{r.event.name}</h1>
        <p>
          Three glasses. <strong>{r.taster_count}</strong> tasters. Nobody knew
          what they were drinking.
        </p>
        <p style={{ color: "var(--wt-gold-dim)" }}>Tap, or press → , to begin.</p>
      </>
    ),
  });

  slides.push({
    key: "turnout",
    render: () => (
      <>
        <p className="wt-eyebrow">The ballots</p>
        <h1>Everyone voted.</h1>
        <p>{names(r.ballots.map((b) => b.name))} — ranked, scored and sealed.</p>
        <div className="wt-stats">
          <Stat n={r.taster_count} label="Tasters" />
          <Stat n={`${r.consensus.agreement}%`} label="Agreement" />
          <Stat n={3} label="Bottles" />
        </div>
        <p style={{ marginTop: 22 }}>
          {r.consensus.agreement >= 80
            ? "Suspiciously unanimous. Either the wines were very different, or somebody was talking."
            : r.consensus.agreement >= 55
              ? "A real spread, but a clear direction. This is what a good flight looks like."
              : "Almost no agreement at all. Three wines, and the room could not decide."}
        </p>
      </>
    ),
  });

  if (cheap.answerable) {
    slides.push({
      key: "guess-votes",
      render: () => (
        <>
          <p className="wt-eyebrow">Before we open anything</p>
          <h1>Which one was the cheap bottle?</h1>
          <p>Here is where the room put its money. No answer yet.</p>
          <div style={{ marginTop: 26 }}>
            {cheap.votes.map((v) => (
              <div className="wt-bar-row" key={v.glass}>
                <span className="wt-bar-label">Glass {v.glass}</span>
                <span className="wt-bar-track">
                  <span
                    className="wt-bar-fill"
                    style={{
                      width: `${
                        r.taster_count ? (v.voters.length / r.taster_count) * 100 : 0
                      }%`,
                    }}
                  />
                </span>
                <span className="wt-bar-n wt-num">{v.voters.length}</span>
              </div>
            ))}
          </div>
        </>
      ),
    });

    slides.push({
      key: "guess-answer",
      render: () => (
        <>
          <p className="wt-eyebrow">The cheap one was</p>
          <h1 className="wt-bottle-name">Glass {cheap.answer_glass}</h1>
          <h2>{cheapWine.name}</h2>
          <p className="wt-bottle-meta">
            {bottleLine(cheapWine)}
            {cheapWine.price !== null && (
              <>
                {" · "}
                <span className="wt-price">{money(cheapWine.price)}</span>
              </>
            )}
          </p>
          <div className="wt-stats">
            <Stat n={cheap.correct.length} label="Spotted it" />
            <Stat n={`${cheap.pct}%`} label="Of those who guessed" />
            <Stat n={`${MEDALS[cheapPlace - 1] || ""} ${cheapPlace}`} label="Where it finished" />
          </div>
          <p style={{ marginTop: 22 }}>
            {cheap.correct.length === 0
              ? "Not one person found it. Every single ballot pointed somewhere else."
              : `${names(cheap.correct)} called it.`}
            {cheapPlace === 1 && " And it won the whole thing."}
            {cheapPlace === 2 && " And it beat one of the expensive bottles."}
          </p>
        </>
      ),
    });
  }

  // Podium, from the bottom up.
  [2, 1, 0].forEach((i) => {
    const row = podium[i];
    if (!row) return;
    const isWinner = i === 0;
    slides.push({
      key: `place-${row.place}`,
      confetti: isWinner,
      render: () => (
        <>
          <div className="wt-place">
            <span className="wt-medal" aria-hidden="true">
              {MEDALS[row.place - 1]}
            </span>
            <p className="wt-eyebrow" style={{ margin: 0 }}>
              {isWinner ? "The winner" : `Place ${row.place}`}
              {row.tied_with_previous ? " · tied" : ""}
            </p>
          </div>
          <h1 className="wt-bottle-name">{row.wine.name}</h1>
          <p className="wt-bottle-meta">
            Glass {row.glass}
            {bottleLine(row.wine) ? ` · ${bottleLine(row.wine)}` : ""}
            {row.wine.price !== null && (
              <>
                {" · "}
                <span className="wt-price">{money(row.wine.price)}</span>
              </>
            )}
          </p>
          <div className="wt-stats">
            <Stat n={row.borda} label="Points" />
            <Stat n={row.firsts} label="First-place votes" />
            <Stat n={row.score_avg === null ? "—" : row.score_avg} label="Mean score" />
          </div>
          {row.wine.blurb && <p style={{ marginTop: 22 }}>{row.wine.blurb}</p>}
        </>
      ),
    });
  });

  slides.push({
    key: "standings",
    render: () => (
      <>
        <p className="wt-eyebrow">Final standings</p>
        <h1>The whole board.</h1>
        <p>
          First place on a ballot is worth 3, second 2, third 1 — so{" "}
          {r.taster_count * 6} points went out and {maxBorda} of them landed on
          the winner.
        </p>
        <div style={{ marginTop: 26 }}>
          {podium.map((row) => (
            <div className="wt-bar-row" key={row.glass}>
              <span className="wt-bar-label">{row.wine.name}</span>
              <span className="wt-bar-track">
                <span
                  className="wt-bar-fill"
                  data-first={row.place === 1 ? "1" : "0"}
                  style={{ width: `${(row.borda / (r.taster_count * 3)) * 100}%` }}
                />
              </span>
              <span className="wt-bar-n wt-num">{row.borda}</span>
            </div>
          ))}
        </div>
      </>
    ),
  });

  slides.push({
    key: "h2h",
    render: () => {
      const label = (glass) => podium.find((row) => row.glass === glass).wine.name;
      return (
        <>
          <p className="wt-eyebrow">Head to head</p>
          <h1>Straight fights.</h1>
          <p>
            Ignoring the totals — on how many individual ballots did each wine
            finish above each other wine?
          </p>
          <div style={{ marginTop: 24 }}>
            {r.head_to_head.map((p) => {
              const aWon = p.a_wins > p.b_wins;
              const drawn = p.a_wins === p.b_wins;
              return (
                <div className="wt-award" key={`${p.a}-${p.b}`}>
                  <div className="wt-award-t">
                    {drawn ? "Split" : "Winner"}
                  </div>
                  <div className="wt-award-n">
                    {drawn
                      ? `${label(p.a)} ties ${label(p.b)}`
                      : `${label(aWon ? p.a : p.b)} beats ${label(aWon ? p.b : p.a)}`}
                  </div>
                  <div className="wt-award-w wt-num">
                    {Math.max(p.a_wins, p.b_wins)} of {p.a_wins + p.b_wins} ballots
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    },
  });

  slides.push({
    key: "grid",
    render: () => (
      <>
        <p className="wt-eyebrow">Every ballot</p>
        <h1>Who liked what.</h1>
        <div className="wt-grid-scroll">
          <table className="wt-grid">
            <thead>
              <tr>
                <th>Taster</th>
                {podium.map((row) => (
                  <th key={row.glass}>
                    {MEDALS[row.place - 1]} {row.wine.name}
                  </th>
                ))}
                <th>Off consensus</th>
              </tr>
            </thead>
            <tbody>
              {r.ballots.map((b) => (
                <tr key={b.name}>
                  <td>{b.name}</td>
                  {podium.map((row) => {
                    const rank = b.ranking.indexOf(row.glass) + 1;
                    return (
                      <td key={row.glass}>
                        <span className="wt-cell-rank" data-r={rank}>
                          {rank}
                        </span>
                      </td>
                    );
                  })}
                  <td className="wt-num">{b.distance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 18, fontSize: 15 }}>
          “Off consensus” counts how many places a ballot sits away from the
          room's own order. Zero means you voted exactly like the group.
        </p>
      </>
    ),
  });

  slides.push({
    key: "awards",
    render: () => (
      <>
        <p className="wt-eyebrow">Awards</p>
        <h1>Credit where it's due.</h1>

        {r.awards.golden_palate.length > 0 && (
          <div className="wt-award">
            <div className="wt-award-t">Golden palate</div>
            <div className="wt-award-n">{names(r.awards.golden_palate)}</div>
            <div className="wt-award-w">
              Called the cheap bottle and the old one. Both.
            </div>
          </div>
        )}

        <div className="wt-award">
          <div className="wt-award-t">Most in tune</div>
          <div className="wt-award-n">{names(r.awards.most_in_tune)}</div>
          <div className="wt-award-w">Closest to the room's own ranking.</div>
        </div>

        {r.awards.contrarian.length > 0 && (
          <div className="wt-award">
            <div className="wt-award-t">Contrarian</div>
            <div className="wt-award-n">{names(r.awards.contrarian)}</div>
            <div className="wt-award-w">
              Furthest from everybody else. Possibly right.
            </div>
          </div>
        )}

        {r.awards.value_pick && (
          <div className="wt-award">
            <div className="wt-award-t">Best value</div>
            <div className="wt-award-n">{r.awards.value_pick.name}</div>
            <div className="wt-award-w wt-num">
              {money(r.awards.value_pick.dollars_per_point)} per point —{" "}
              {money(r.awards.value_pick.price)} for {r.awards.value_pick.borda} points.
            </div>
          </div>
        )}
      </>
    ),
  });

  if (withNotes.length) {
    slides.push({
      key: "notes",
      render: () => (
        <>
          <p className="wt-eyebrow">In your own words</p>
          <h1>What you actually said.</h1>
          <div className="wt-cols" style={{ marginTop: 24 }}>
            {withNotes.map((row) => (
              <div key={row.glass}>
                <h2 style={{ fontSize: 20, marginBottom: 14 }}>
                  {MEDALS[row.place - 1]} {row.wine.name}
                </h2>
                {row.notes.map((n, i) => (
                  <div className="wt-note" key={`${n.taster}-${i}`}>
                    <div className="wt-note-q">“{n.text}”</div>
                    <div className="wt-note-a">{n.taster}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ),
    });
  }

  if (r.awards.value_table.length > 1) {
    slides.push({
      key: "value",
      render: () => (
        <>
          <p className="wt-eyebrow">The bill</p>
          <h1>What each point cost.</h1>
          <p>
            Price divided by points won. The cheapest bottle usually wins this
            even when it loses everything else — which is the reason to run a
            blind tasting at all.
          </p>
          <div className="wt-grid-scroll" style={{ marginTop: 22 }}>
            <table className="wt-grid">
              <thead>
                <tr>
                  <th>Wine</th>
                  <th>Price</th>
                  <th>Points</th>
                  <th>Per point</th>
                </tr>
              </thead>
              <tbody>
                {r.awards.value_table.map((v) => (
                  <tr key={v.glass}>
                    <td>{v.name}</td>
                    <td className="wt-num">{money(v.price)}</td>
                    <td className="wt-num">{v.borda}</td>
                    <td className="wt-num" style={{ color: "var(--wt-gold)" }}>
                      {money(v.dollars_per_point)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ),
    });
  }

  slides.push({
    key: "close",
    render: () => (
      <>
        <p className="wt-eyebrow">{r.event.name}</p>
        <h1>{winner.wine.name} takes it.</h1>
        <p>
          {winner.firsts} of {r.taster_count} ballots put it first, and it
          finished on {winner.borda} points.
        </p>
        <p style={{ color: "var(--wt-gold-dim)" }}>Now go and open something else.</p>
      </>
    ),
  });

  return slides;
}

export default function TastingResults() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [i, setI] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await getResults(code);
        if (!cancelled) setData(r);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const slides = useMemo(() => (data ? buildSlides(data) : []), [data]);
  const last = slides.length - 1;

  const go = useCallback(
    (delta) => setI((cur) => Math.min(last, Math.max(0, cur + delta))),
    [last],
  );

  useEffect(() => {
    if (!slides.length) return undefined;
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Escape") {
        navigate(`/tasting/${code}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length, go, navigate, code]);

  /* Swipe, for the phone in someone's hand while the deck is on the television.
   * A 45px threshold with a vertical guard, so scrolling a long slide (the
   * ballot grid, the notes wall) doesn't skip past it. */
  useEffect(() => {
    if (!slides.length) return undefined;
    let x0 = null;
    let y0 = null;
    const start = (e) => {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    };
    const end = (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
      x0 = null;
      y0 = null;
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", end);
    };
  }, [slides.length, go]);

  if (error) {
    return (
      <div className="wt">
        <div className="wt-wrap">
          <h1 className="wt-title">Not yet.</h1>
          <p className="wt-sub">{error}</p>
          <button
            className="wt-btn wt-btn--primary"
            onClick={() => navigate(`/tasting/${code}`)}
          >
            Back to the tasting
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="wt">
        <div className="wt-wrap">
          <p className="wt-sub">Counting the ballots…</p>
        </div>
      </div>
    );
  }

  const slide = slides[i];

  return (
    <div className="wt wt-show">
      <div
        className="wt-slide"
        key={slide.key}
        onClick={(e) => {
          // Clicking the left third steps back, anything else steps forward.
          // Links and buttons inside a slide keep their own behaviour.
          if (e.target.closest("a,button")) return;
          go(e.clientX < window.innerWidth / 3 ? -1 : 1);
        }}
        style={{ position: "relative", cursor: "pointer" }}
      >
        {slide.confetti && <Confetti />}
        <div className="wt-slide-inner">{slide.render()}</div>
      </div>

      <div className="wt-nav">
        <button className="wt-btn wt-btn--sm" onClick={() => go(-1)} disabled={i === 0}>
          ←
        </button>
        <div className="wt-dots">
          {slides.map((s, n) => (
            <button
              key={s.key}
              className="wt-dot"
              data-on={n === i ? "1" : "0"}
              onClick={() => setI(n)}
              aria-label={`Slide ${n + 1} of ${slides.length}`}
            />
          ))}
        </div>
        <button className="wt-btn wt-btn--sm" onClick={() => go(1)} disabled={i === last}>
          →
        </button>
      </div>
    </div>
  );
}
