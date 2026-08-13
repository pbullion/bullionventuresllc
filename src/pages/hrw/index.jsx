/* Houston Restaurant Weeks — browse every participating restaurant and every
 * dish on every prix-fixe menu.
 *
 * The source is a spreadsheet, and the whole point of this page is to not feel
 * like one: search reaches into the menus themselves (type "short rib" and you
 * get the restaurants serving it, with the dish quoted on the card), filters are
 * one tap, and the same filtered set can be seen as a list or as pins on a map.
 *
 * Everything runs client-side against one static JSON file — see data.js.
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C, HRW_CSS } from "./theme.js";
import {
  DIETS,
  EVENT,
  MEALS,
  TIERS,
  dishCount,
  eventStatus,
  loadHrw,
  mealLabel,
  milesBetween,
  readFaves,
  tierColor,
  timeLeft,
  writeFaves,
} from "./data.js";
import { placeIndex } from "./places.js";
import { formatAvg, loadSummary, stars } from "./reviews.js";

// Leaflet is ~150 KB and only half the visitors will switch to the map, so it
// loads on demand instead of in the page's first bundle.
const MapView = lazy(() => import("./MapView.jsx"));

const SORTS = [
  { id: "name", label: "A–Z" },
  { id: "price", label: "Cheapest" },
  { id: "dishes", label: "Biggest menu" },
  { id: "rated", label: "Best reviewed" },
  { id: "near", label: "Nearest me" },
];

/* Only neighbourhoods with a few restaurants in them are worth a dropdown
 * entry — the field is free text and has a long tail of one-offs
 * ("Afton Oaks / River Oaks Area") that would bury Downtown and Katy. */
const HOOD_MIN = 3;

export default function Hrw() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [ratings, setRatings] = useState(null);

  const [q, setQ] = useState("");
  const [meals, setMeals] = useState([]);
  const [costs, setCosts] = useState([]);
  const [diets, setDiets] = useState([]);
  const [hood, setHood] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [walkIn, setWalkIn] = useState(false);
  const [favesOnly, setFavesOnly] = useState(false);
  const [sort, setSort] = useState("name");
  const [view, setView] = useState("list");
  const [faves, setFaves] = useState(readFaves);
  const [here, setHere] = useState(null);
  const [locating, setLocating] = useState(false);
  // How many cards are rendered, tagged with the filter state they belong to, so
  // that changing a filter restarts the list at the top without an effect that
  // resets it a render late. See the sentinel below for the growing part.
  const [page, setPage] = useState({ key: "", n: 60 });

  useEffect(() => {
    loadHrw().then(setData, (e) => setError(e.message));
    // Counts and averages only — no review text. If the backend is down the
    // cards simply carry no rating; nothing else on this page depends on it.
    loadSummary().then(
      (s) => setRatings(s.places),
      () => setRatings({}),
    );
  }, []);

  const faveSet = useMemo(() => new Set(faves), [faves]);
  const toggleFave = useCallback((slug) => {
    setFaves((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug];
      writeFaves(next);
      return next;
    });
  }, []);

  /* One pass over the data to build what searching and filtering need: a
   * lowercased haystack per restaurant, and a flat dish list so a hit can be
   * quoted back on the card. ~1.5 MB of derived strings, built once. */
  const index = useMemo(() => {
    if (!data) return [];
    // Reviews belong to a place, not to a row — twenty Saltgrass locations
    // share one rating. See places.js.
    const places = placeIndex(data.restaurants);
    return data.restaurants.map((r) => {
      const dishes = [];
      for (const m of r.menus)
        for (const c of m.courses)
          for (const d of c.dishes) dishes.push({ name: d.n, desc: d.d || "" });
      return {
        r,
        place: places.get(r.slug),
        text: [r.name, ...r.cuisines, ...r.neighborhoods, r.address || ""]
          .join(" ")
          .toLowerCase(),
        dishes,
        // Newline-joined, not space-joined: with a space, "short rib" matched
        // the gap between a dish ending in "short" and the next one starting
        // with "rib", and the card then had a match it could not point at.
        dishText: dishes.map((d) => `${d.name} ${d.desc}`).join("\n").toLowerCase(),
      };
    });
  }, [data]);

  const { hoods, cuisines } = useMemo(() => {
    const h = new Map();
    const c = new Map();
    for (const r of data?.restaurants || []) {
      for (const n of r.neighborhoods) h.set(n, (h.get(n) || 0) + 1);
      // Dietary flags get their own chips, so keep them out of the dropdown.
      for (const n of r.cuisines)
        if (!DIETS.includes(n)) c.set(n, (c.get(n) || 0) + 1);
    }
    const byCount = (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]);
    return {
      hoods: [...h].filter(([, n]) => n >= HOOD_MIN).sort(byCount),
      cuisines: [...c].sort(byCount),
    };
  }, [data]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out = [];
    for (const entry of index) {
      const { r, place, text, dishText, dishes } = entry;
      if (favesOnly && !faveSet.has(r.slug)) continue;
      // A meal + price pair means "that price FOR that meal", which is why the
      // data carries a price per meal rather than a bag of prices.
      const served = meals.length
        ? meals.filter((m) => r.mealTypes.includes(m))
        : r.mealTypes;
      if (!served.length) continue;
      if (costs.length && !served.some((m) => costs.includes(r.prices[m]))) continue;
      if (diets.length && !diets.every((d) => r.cuisines.includes(d))) continue;
      if (hood && !r.neighborhoods.includes(hood)) continue;
      if (cuisine && !r.cuisines.includes(cuisine)) continue;
      if (walkIn && r.reservations !== "Walk-Ins Welcome") continue;

      let hits = null;
      if (query) {
        const inText = text.includes(query);
        const inDishes = dishText.includes(query);
        if (!inText && !inDishes) continue;
        // Quote the matching dishes on the card — this is what makes searching
        // "short rib" feel like searching menus rather than filtering a table.
        // The same dish often appears on two menus, so dedupe before slicing or
        // a card shows "Wagyu Skewer" three times.
        if (inDishes) {
          const seen = new Set();
          hits = [];
          for (const d of dishes) {
            const inName = d.name.toLowerCase().includes(query);
            if (!inName && !d.desc.toLowerCase().includes(query)) continue;
            const id = `${d.name}|${d.desc}`;
            if (seen.has(id)) continue;
            seen.add(id);
            hits.push({ ...d, inName });
            if (hits.length === 3) break;
          }
          // dishText joins each dish's name to its description with a space, so
          // it can still match across that one seam. If nothing survives the
          // per-dish check, there was no real hit to show — drop the card rather
          // than display a match the reader can't see.
          if (!hits.length && !inText) continue;
        }
      }
      out.push({
        r,
        hits,
        rating: ratings?.[place?.key] || null,
        miles: here && r.lat != null ? milesBetween(here, r) : null,
      });
    }

    const cheapest = (r) => Math.min(...Object.values(r.prices), Infinity);
    /* Shrunk towards the middle by two imaginary 3.5s, so one gushing review
     * doesn't outrank a restaurant with twenty good ones. Unreviewed places sort
     * last rather than mid-table. */
    const score = (x) =>
      x.rating ? (x.rating.avg * x.rating.n + 3.5 * 2) / (x.rating.n + 2) : -1;
    out.sort((a, b) => {
      if (sort === "price") return cheapest(a.r) - cheapest(b.r) || a.r.name.localeCompare(b.r.name);
      if (sort === "dishes") return dishCount(b.r) - dishCount(a.r);
      if (sort === "rated")
        return score(b) - score(a) || a.r.name.localeCompare(b.r.name);
      if (sort === "near" && here)
        return (a.miles ?? Infinity) - (b.miles ?? Infinity);
      return a.r.name.localeCompare(b.r.name, "en", { sensitivity: "base" });
    });
    return out;
  }, [index, q, meals, costs, diets, hood, cuisine, walkIn, favesOnly, faveSet, sort, here, ratings]);

  const filterKey = JSON.stringify([q, meals, costs, diets, hood, cuisine, walkIn, favesOnly, sort]);
  const shown = page.key === filterKey ? page.n : 60;

  /* 385 cards with menus behind them is more than a phone wants to lay out at
   * once, so the list grows as you reach the end of it. */
  const sentinel = useRef(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || view !== "list" || shown >= results.length) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries[0].isIntersecting && setPage({ key: filterKey, n: shown + 60 }),
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [view, shown, results.length, filterKey]);

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setSort("near");
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000 },
    );
  };

  const toggle = (setter) => (value) =>
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  const filtersOn =
    q || meals.length || costs.length || diets.length || hood || cuisine || walkIn || favesOnly;
  const clearAll = () => {
    setQ("");
    setMeals([]);
    setCosts([]);
    setDiets([]);
    setHood("");
    setCuisine("");
    setWalkIn(false);
    setFavesOnly(false);
  };

  // Picks from the filtered set, not all 385 — "surprise me, but vegetarian
  // lunch in the Heights" is the interesting version of the dice roll.
  const surprise = () => {
    const pick = results[Math.floor(Math.random() * results.length)];
    if (pick) navigate(`/hrw/${pick.r.slug}`);
  };

  const totalDishes = useMemo(
    () => index.reduce((n, e) => n + e.dishes.length, 0),
    [index],
  );

  return (
    <div className="hrw" style={{ background: C.bg, color: C.text, flex: 1, minHeight: "100vh" }}>
      <style>{HRW_CSS}</style>

      {/* Hero ---------------------------------------------------------- */}
      <header
        style={{
          padding: "clamp(28px, 5vw, 56px) 20px clamp(20px, 3vw, 30px)",
          maxWidth: 1180,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: C.gold,
            border: `1px solid rgba(224,178,76,.35)`,
            borderRadius: 999,
            padding: "5px 12px",
            marginBottom: 16,
          }}
        >
          🍽️ Houston Restaurant Weeks 2026 · {EVENT.shortRange}
        </div>
        <h1
          className="hrw-hero-title"
          style={{ margin: "0 0 12px", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-.02em" }}
        >
          Every menu.{" "}
          <span
            style={{
              background: `linear-gradient(100deg, ${C.goldBright}, ${C.rose})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Searchable.
          </span>
        </h1>
        <p
          className="hrw-hero-sub"
          style={{ margin: "0 auto", maxWidth: 620, color: C.dim, lineHeight: 1.55 }}
        >
          Search {data ? totalDishes.toLocaleString() : "9,000+"} dishes across{" "}
          {data ? data.restaurants.length : "385"} restaurants, filter by meal,
          price and neighborhood, and find what's near you on the map. Every
          meal supports the Houston Food Bank.
        </p>
        <Countdown />
      </header>

      {/* Controls ------------------------------------------------------ */}
      <div className="hrw-sticky">
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 20px 13px" }}>
          <div className="hrw-searchrow">
            {/* Sizing lives in theme.js, not here — an inline `flex` would beat
                the stylesheet's mobile rule. */}
            <div className="hrw-searchbox">
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: C.muted,
                  fontSize: 15,
                  pointerEvents: "none",
                }}
              >
                🔍
              </span>
              <input
                className="hrw-input"
                style={{ paddingLeft: 38, paddingRight: q ? 38 : 13 }}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Restaurant, cuisine, or a dish — try “short rib”"
                aria-label="Search restaurants and dishes"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  aria-label="Clear search"
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: 0,
                    color: C.muted,
                    fontSize: 17,
                    cursor: "pointer",
                    padding: 6,
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <div
              role="group"
              aria-label="View"
              className="hrw-viewtoggle"
              style={{
                display: "flex",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 3,
              }}
            >
              {["list", "map"].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  style={{
                    border: 0,
                    borderRadius: 8,
                    padding: "8px 13px",
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    background: view === v ? C.gold : "transparent",
                    color: view === v ? "#1a1405" : C.dim,
                  }}
                >
                  {v === "list" ? "☰ List" : "📍 Map"}
                </button>
              ))}
            </div>
          </div>

          <div className="hrw-scroller" style={{ marginTop: 10 }}>
            {MEALS.map((m) => (
              <Chip key={m} on={meals.includes(m)} onClick={() => toggle(setMeals)(m)}>
                {mealLabel(m)}
              </Chip>
            ))}
            <Divider />
            {Object.entries(TIERS).map(([cost, t]) => (
              <Chip
                key={cost}
                on={costs.includes(Number(cost))}
                onClick={() => toggle(setCosts)(Number(cost))}
              >
                <Dot color={t.color} />
                {t.label}
              </Chip>
            ))}
            <Divider />
            {DIETS.map((d) => (
              <Chip key={d} on={diets.includes(d)} onClick={() => toggle(setDiets)(d)}>
                {d === "Gluten Free" ? "GF" : d}
              </Chip>
            ))}
            <Chip on={walkIn} onClick={() => setWalkIn(!walkIn)}>
              Walk-ins
            </Chip>
            <Chip on={favesOnly} onClick={() => setFavesOnly(!favesOnly)}>
              ★ My list{faves.length ? ` (${faves.length})` : ""}
            </Chip>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 10,
              alignItems: "center",
            }}
          >
            <select
              className="hrw-select"
              style={{ width: "auto", maxWidth: 200, fontSize: 13, padding: "8px 12px" }}
              value={hood}
              onChange={(e) => setHood(e.target.value)}
              aria-label="Neighborhood"
            >
              <option value="">All neighborhoods</option>
              {hoods.map(([n, count]) => (
                <option key={n} value={n}>
                  {n} ({count})
                </option>
              ))}
            </select>
            <select
              className="hrw-select"
              style={{ width: "auto", maxWidth: 200, fontSize: 13, padding: "8px 12px" }}
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              aria-label="Cuisine"
            >
              <option value="">All cuisines</option>
              {cuisines.map(([n, count]) => (
                <option key={n} value={n}>
                  {n} ({count})
                </option>
              ))}
            </select>
            <select
              className="hrw-select"
              style={{ width: "auto", fontSize: 13, padding: "8px 12px" }}
              value={sort}
              onChange={(e) => {
                if (e.target.value === "near" && !here) locate();
                setSort(e.target.value);
              }}
              aria-label="Sort by"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <Chip on={!!here} onClick={locate}>
              {locating ? "Locating…" : here ? "📍 Located" : "📍 Near me"}
            </Chip>
            <Chip onClick={surprise}>🎲 Surprise me</Chip>
            {filtersOn && (
              <button
                onClick={clearAll}
                style={{
                  background: "none",
                  border: 0,
                  color: C.muted,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "7px 4px",
                }}
              >
                Clear all
              </button>
            )}
            <span style={{ marginLeft: "auto", fontSize: 13, color: C.muted, fontWeight: 600 }}>
              {data ? `${results.length} of ${data.restaurants.length}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Results ------------------------------------------------------- */}
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 20px 60px" }}>
        {error && (
          <Notice>
            Couldn't load the restaurant list ({error}).{" "}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "none",
                border: 0,
                color: C.gold,
                cursor: "pointer",
                textDecoration: "underline",
                font: "inherit",
              }}
            >
              Try again
            </button>
          </Notice>
        )}

        {!data && !error && (
          <div style={{ display: "grid", placeItems: "center", padding: "70px 0", gap: 14 }}>
            <div className="hrw-spinner" />
            <span style={{ color: C.muted, fontSize: 14 }}>Loading 9,000 dishes…</span>
          </div>
        )}

        {data && view === "map" && (
          <Suspense
            fallback={
              <div style={{ display: "grid", placeItems: "center", height: 420 }}>
                <div className="hrw-spinner" />
              </div>
            }
          >
            <MapView
              restaurants={results.map((x) => x.r)}
              faveSet={faveSet}
              here={here}
              onLocate={locate}
            />
          </Suspense>
        )}

        {data && view === "list" && (
          <>
            {!results.length && (
              <Notice>
                Nothing matches that.{" "}
                <button
                  onClick={clearAll}
                  style={{
                    background: "none",
                    border: 0,
                    color: C.gold,
                    cursor: "pointer",
                    textDecoration: "underline",
                    font: "inherit",
                  }}
                >
                  Clear the filters
                </button>{" "}
                and start over.
              </Notice>
            )}
            <div className="hrw-grid">
              {results.slice(0, shown).map(({ r, hits, miles, rating }) => (
                <Card
                  key={r.slug}
                  r={r}
                  hits={hits}
                  miles={miles}
                  rating={rating}
                  query={q.trim()}
                  fave={faveSet.has(r.slug)}
                  onFave={toggleFave}
                />
              ))}
            </div>
            <div ref={sentinel} style={{ height: 1 }} />
            {shown < results.length && (
              <p style={{ textAlign: "center", color: C.muted, fontSize: 13, marginTop: 22 }}>
                Showing {shown} of {results.length}…
              </p>
            )}
          </>
        )}

        <footer
          style={{
            marginTop: 44,
            paddingTop: 18,
            borderTop: `1px solid ${C.border}`,
            color: C.muted,
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          Houston Restaurant Weeks runs {EVENT.range}. Menus, prices and hours as
          published by the restaurants{" "}
          {data ? `(data compiled ${data.generated})` : ""}. Always confirm with
          the restaurant before you go — participation, pricing and special hours
          change.{" "}
          <a href="https://houstonrestaurantweeks.com" target="_blank" rel="noreferrer" style={{ color: C.dim, textDecoration: "underline" }}>
            houstonrestaurantweeks.com
          </a>
        </footer>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------- small pieces */

/* Time left to eat. Restaurant Weeks is a deadline, not a season — the whole
 * reason to open this page in late August is that the clock is running — so the
 * hero counts down to midnight at the end of the last night rather than printing
 * a date range and leaving the arithmetic to the reader.
 *
 * Ticks once a second. That is cheap here because it re-renders four <span>s and
 * nothing else: the countdown is its own component precisely so a tick can't
 * touch the 385-card list next to it. */
function Countdown() {
  const [now, setNow] = useState(() => new Date());
  const status = eventStatus(now);

  useEffect(() => {
    if (status.state === "over") return; // nothing left to tick towards
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [status.state]);

  if (status.state === "over")
    return (
      <p style={{ margin: "18px 0 0", fontSize: 14, color: C.muted }}>
        Restaurant Weeks {EVENT.range} has ended — the menus below are kept for
        reference.
      </p>
    );

  if (status.state === "upcoming")
    return (
      <p style={{ margin: "18px 0 0", fontSize: 14.5, color: C.dim }}>
        Starts in <strong style={{ color: C.goldBright }}>{status.days}</strong>{" "}
        {status.days === 1 ? "day" : "days"} — {EVENT.range}
      </p>
    );

  const left = timeLeft(EVENT.deadline, now);
  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: ".07em",
          textTransform: "uppercase",
          color: C.mint,
          marginBottom: 9,
        }}
      >
        <span className="hrw-live" aria-hidden />
        Happening now — time left to eat
      </div>
      <div
        style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}
        /* One reading for a screen reader instead of eight disconnected numbers,
           and not a live region — an assertive tick every second is unusable. */
        role="timer"
        aria-label={`${left.days} days, ${left.hours} hours, ${left.minutes} minutes left in Houston Restaurant Weeks`}
      >
        <Unit n={left.days} label="days" />
        <Unit n={left.hours} label="hrs" />
        <Unit n={left.minutes} label="min" />
        <Unit n={left.seconds} label="sec" />
      </div>
    </div>
  );
}

function Unit({ n, label }) {
  return (
    <div
      aria-hidden
      style={{
        minWidth: 66,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "9px 12px 7px",
      }}
    >
      <div
        style={{
          fontSize: 25,
          fontWeight: 800,
          lineHeight: 1.05,
          color: C.goldBright,
          /* Tabular figures so the seconds don't shuffle the row every tick. */
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum"',
        }}
      >
        {String(n).padStart(2, "0")}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: C.muted,
          marginTop: 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button className="hrw-chip" aria-pressed={on ? "true" : undefined} onClick={onClick}>
      {children}
    </button>
  );
}

const Divider = () => (
  <span aria-hidden style={{ width: 1, background: C.border, margin: "4px 3px", flexShrink: 0 }} />
);

const Dot = ({ color, size = 8 }) => (
  <span
    aria-hidden
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      display: "inline-block",
      flexShrink: 0,
    }}
  />
);

function Notice({ children }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "26px 22px",
        textAlign: "center",
        color: C.dim,
        fontSize: 15,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

/* Highlights the search term inside a dish name so the reason a card matched is
 * visible at a glance. Long descriptions are windowed around the match — the
 * words either side of it are the useful part, not the first 60 characters. */
function Highlight({ text, query, window: win }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return text;
  let start = 0;
  let body = text;
  if (win && i > win) {
    start = i - Math.floor(win / 2);
    body = `…${text.slice(start)}`;
    start -= 1; // the ellipsis occupies one character
  }
  const at = i - start;
  return (
    <>
      {body.slice(0, at)}
      <mark className="hrw-mark">{body.slice(at, at + query.length)}</mark>
      {body.slice(at + query.length)}
    </>
  );
}

function Card({ r, hits, miles, rating, query, fave, onFave }) {
  const cuisines = r.cuisines.join(" · ");
  return (
    <article className="hrw-card hrw-in">
      {/* The whole card is the link; the star sits above it via z-index. */}
      <Link
        to={`/hrw/${r.slug}`}
        aria-label={r.name}
        style={{ position: "absolute", inset: 0, borderRadius: 14, zIndex: 1 }}
      />
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <h2
          className="hrw-name"
          style={{ margin: 0, fontSize: 17, fontWeight: 700, lineHeight: 1.25, flex: 1 }}
        >
          {r.name}
        </h2>
        <button
          className="hrw-star"
          aria-pressed={fave ? "true" : undefined}
          aria-label={fave ? `Remove ${r.name} from my list` : `Add ${r.name} to my list`}
          onClick={() => onFave(r.slug)}
        >
          {fave ? "★" : "☆"}
        </button>
      </div>

      {rating && (
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
          /* One reading, since the stars are decoration for the number. */
          aria-label={`Rated ${formatAvg(rating.avg)} out of 5 from ${rating.n} ${
            rating.n === 1 ? "review" : "reviews"
          }`}
        >
          <span aria-hidden style={{ color: C.gold, letterSpacing: 1 }}>{stars(rating.avg)}</span>
          <span aria-hidden style={{ fontWeight: 700, color: C.goldBright }}>
            {formatAvg(rating.avg)}
          </span>
          <span aria-hidden style={{ color: C.muted }}>({rating.n})</span>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {r.mealTypes.map((m) => (
          <span
            key={m}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(255,255,255,.05)",
              border: `1px solid ${C.border}`,
              color: C.dim,
            }}
          >
            <Dot color={tierColor(r.prices[m])} size={6} />
            {mealLabel(m)} ${r.prices[m]}
          </span>
        ))}
      </div>

      <p className="hrw-clamp2" style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.45 }}>
        {cuisines}
      </p>

      {hits?.length > 0 && (
        <div
          style={{
            borderLeft: `2px solid ${C.gold}`,
            paddingLeft: 10,
            display: "grid",
            gap: 3,
          }}
        >
          {hits.map((d, i) => (
            <span
              key={i}
              /* One line each, so three hits can't stretch a card past its
                 neighbours in the grid. */
              style={{
                fontSize: 12.5,
                color: C.dim,
                lineHeight: 1.45,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {d.inName ? (
                <Highlight text={d.name} query={query} />
              ) : (
                /* Matched in the ingredients, not the title. Showing the title
                 * alone here reads as a bug ("why is Wagyu Skewer a short-rib
                 * result?"), so the matching part of the description comes too. */
                <>
                  {d.name}
                  <span style={{ color: C.muted }}>
                    {" — "}
                    <Highlight text={d.desc} query={query} window={22} />
                  </span>
                </>
              )}
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontSize: 12,
          color: C.muted,
          marginTop: "auto",
          paddingTop: 4,
        }}
      >
        <span>📍 {r.neighborhoods[0] || "Houston"}</span>
        {miles != null && <span style={{ color: C.gold }}>{miles.toFixed(1)} mi</span>}
        <span style={{ marginLeft: "auto" }}>{dishCount(r)} dishes →</span>
      </div>
    </article>
  );
}
