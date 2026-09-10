/* Houston-area Kids Eat Free — every restaurant with a recurring kids-eat-free
 * deal, filtered to the day you're looking at (today, by default) and sorted
 * by distance from you.
 *
 * Borrows its shell from /byob: same dark theme, same sticky filter bar, same
 * lazy Leaflet map, same "here is exactly how well-known this fact is"
 * honesty rule. There is no official source for this either — every listicle
 * disagrees slightly and terms change without notice — so every row carries
 * `sources`, a `checked` date, and `confirmed` (whether a guide quoted actual
 * terms, vs. only showing up in a search summary). See
 * scripts/kids-eat-free-seed.json's header for the full rule.
 *
 * THE DAY FILTER IS THE POINT OF THE PAGE. It defaults to TODAY on load — the
 * whole reason this exists is "where can I take the kids tonight" — but any
 * day is one tap away, and "All week" clears it to browse the full list.
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { C, KEF_CSS } from "./theme.js";
import {
  DAY_NAMES,
  DAY_SHORT,
  daysLabel,
  loadKidsEatFree,
  mapsHref,
  milesBetween,
  phoneHref,
  placeLine,
  readFaves,
  todayIndex,
  writeFaves,
  ZIP_77018,
} from "./data.js";

// Leaflet is ~150 KB and most visitors never open the map — same deferred
// load as /byob and /hrw.
const MapView = lazy(() => import("./MapView.jsx"));

const SORTS = [
  { id: "near", label: "Nearest me" },
  { id: "name", label: "A–Z" },
];

export default function KidsEatFree() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const today = useMemo(() => todayIndex(), []);
  const [day, setDay] = useState(today); // null = All week
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [favesOnly, setFavesOnly] = useState(false);
  const [sort, setSort] = useState("near");
  const [view, setView] = useState("list");
  const [faves, setFaves] = useState(readFaves);
  const [here, setHere] = useState(null);
  const [locating, setLocating] = useState(false);
  const [narrow] = useState(
    () => window.matchMedia("(max-width: 520px)").matches,
  );

  useEffect(() => {
    loadKidsEatFree().then(setData, (e) => setError(e.message));
  }, []);

  // Ask for real location on mount so "Nearest me" (the default sort) has
  // something to sort by right away. Silent — no "Locating…" chip state for
  // this one, since nothing on screen is waiting for it to resolve. A denial
  // just leaves `here` null and every distance/sort falls back to the ZIP
  // 77018 centroid.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setHere({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
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

  const index = useMemo(() => {
    if (!data) return [];
    return data.restaurants.map((r) => ({
      r,
      text: [r.name, r.address, r.area, r.region, r.cuisine, r.terms]
        .join(" ")
        .toLowerCase(),
    }));
  }, [data]);

  const anyPins = useMemo(
    () => Boolean(data?.restaurants.some((r) => r.lat != null)),
    [data],
  );

  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setHere({ lat: p.coords.latitude, lon: p.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }, []);

  const origin = here || ZIP_77018;

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = index.filter(({ r, text }) => {
      if (needle && !text.includes(needle)) return false;
      if (day != null && !r.daysOfWeek.includes(day)) return false;
      if (region && r.region !== region) return false;
      if (cuisine && r.cuisine !== cuisine) return false;
      if (favesOnly && !faveSet.has(r.slug)) return false;
      return true;
    });
    out = out.map(({ r }) => r);
    if (sort === "near") {
      out = [...out].sort((a, b) => {
        const av = a.lat == null ? Infinity : milesBetween(origin, a);
        const bv = b.lat == null ? Infinity : milesBetween(origin, b);
        return av - bv || a.name.localeCompare(b.name);
      });
    } else {
      out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    }
    return out;
  }, [index, q, day, region, cuisine, favesOnly, faveSet, sort, origin]);

  const filtersOn = q || region || cuisine || favesOnly || day !== today;
  const clearAll = () => {
    setQ("");
    setRegion("");
    setCuisine("");
    setFavesOnly(false);
    setDay(today);
  };

  return (
    <div className="kef" style={{ background: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{KEF_CSS}</style>

      {/* Hero ---------------------------------------------------------- */}
      <header
        style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 20px 22px", textAlign: "center" }}
      >
        <h1 className="kef-hero-title" style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.02em" }}>
          Kids eat free
        </h1>
        <p
          className="kef-hero-sub"
          style={{ margin: "12px auto 0", maxWidth: 660, color: C.dim, lineHeight: 1.55 }}
        >
          Restaurants around Houston with a recurring kids-eat-free deal, filtered
          to {day === today ? "today" : "the day you pick"} and sorted by
          distance from you.
        </p>
        <p style={{ margin: "14px auto 0", maxWidth: 660, color: C.muted, fontSize: 13, lineHeight: 1.55 }}>
          These deals change without notice and restaurants close.{" "}
          <strong style={{ color: C.dim }}>Call ahead before you load up the car.</strong>
          {data ? ` ${data.count} places, last checked ${data.built}.` : ""}
        </p>
      </header>

      {/* Day strip ------------------------------------------------------- */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px 14px" }}>
        <div className="kef-days">
          {DAY_SHORT.map((label, i) => (
            <button
              key={i}
              className={`kef-day${i === today ? " kef-day-today" : ""}`}
              aria-pressed={day === i}
              onClick={() => setDay(day === i ? null : i)}
              title={DAY_NAMES[i]}
            >
              {label}
            </button>
          ))}
        </div>
        {day == null && (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: C.muted, textAlign: "center" }}>
            Showing every day. Tap a day above to filter, or tap it again to clear.
          </p>
        )}
      </div>

      {/* Sticky controls -------------------------------------------------- */}
      <div className="kef-sticky">
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 20px 12px" }}>
          <div className="kef-searchrow">
            <div className="kef-searchbox">
              <input
                className="kef-input"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={narrow ? "Restaurant, area, or cuisine" : "Restaurant, area, or cuisine — try “Heights” or “BBQ”"}
                aria-label="Search kids-eat-free restaurants"
                style={{ fontSize: 16 }}
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
            {anyPins && (
              <div
                role="group"
                aria-label="View"
                className="kef-viewtoggle"
                style={{ display: "flex", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3 }}
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
            )}
          </div>

          <div className="kef-filters">
            <select className="kef-select" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Area">
              <option value="">Everywhere</option>
              {(data?.regions || []).map((n) => (
                <option key={n} value={n}>
                  {n} ({data.restaurants.filter((r) => r.region === n).length})
                </option>
              ))}
            </select>
            <select className="kef-select" value={cuisine} onChange={(e) => setCuisine(e.target.value)} aria-label="Cuisine">
              <option value="">All cuisines</option>
              {(data?.cuisines || []).map((n) => (
                <option key={n} value={n}>
                  {n} ({data.restaurants.filter((r) => r.cuisine === n).length})
                </option>
              ))}
            </select>
            <select className="kef-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <Chip on={!!here} onClick={locate}>
              {locating ? "Locating…" : here ? "📍 Located" : "📍 Use my location"}
            </Chip>
            <Chip on={favesOnly} onClick={() => setFavesOnly(!favesOnly)}>
              ★ My list{faves.length ? ` (${faves.length})` : ""}
            </Chip>
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
                Reset
              </button>
            )}
            <span className="kef-count" style={{ color: C.muted }}>
              {data ? `${results.length} of ${data.count}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Results ----------------------------------------------------------- */}
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 20px 60px" }}>
        {error && (
          <Notice>
            Couldn&rsquo;t load the restaurant list ({error}).{" "}
            <button
              onClick={() => window.location.reload()}
              style={{ background: "none", border: 0, color: C.gold, cursor: "pointer", textDecoration: "underline", font: "inherit" }}
            >
              Try again
            </button>
          </Notice>
        )}

        {!data && !error && (
          <div style={{ display: "grid", placeItems: "center", padding: "70px 0", gap: 14 }}>
            <div className="kef-spinner" />
            <span style={{ color: C.muted, fontSize: 14 }}>Loading&hellip;</span>
          </div>
        )}

        {data && anyPins && view === "map" && (
          <Suspense
            fallback={
              <div style={{ display: "grid", placeItems: "center", padding: "70px 0" }}>
                <div className="kef-spinner" />
              </div>
            }
          >
            <MapView restaurants={results} here={here} onLocate={locate} />
          </Suspense>
        )}

        {data && (view === "list" || !anyPins) && (
          <>
            {results.length === 0 ? (
              <Notice>
                Nothing matches those filters.{" "}
                <button
                  onClick={clearAll}
                  style={{ background: "none", border: 0, color: C.gold, cursor: "pointer", textDecoration: "underline", font: "inherit" }}
                >
                  Reset them
                </button>
              </Notice>
            ) : (
              <div className="kef-grid">
                {results.map((r) => (
                  <Card
                    key={r.slug}
                    r={r}
                    today={today}
                    fave={faveSet.has(r.slug)}
                    onFave={toggleFave}
                    miles={r.lat != null ? milesBetween(origin, r) : null}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {data && (
          <p style={{ margin: "34px auto 0", maxWidth: 720, color: C.muted, fontSize: 13, lineHeight: 1.65, textAlign: "center" }}>
            There&rsquo;s no official list of kids-eat-free deals — this one is
            assembled by hand from local guides, with the source recorded
            against every entry. A row marked{" "}
            <em style={{ color: C.dim, fontStyle: "normal" }}>call to confirm</em>{" "}
            turned up in a search summary rather than a page that quoted the
            exact terms; treat it as a lead, not a promise. Every entry is
            reasonably close to Houston&rsquo;s 77018 zip — Garden Oaks, Oak
            Forest and the Heights get first pick, since that&rsquo;s home base.
          </p>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Card({ r, today, fave, onFave, miles }) {
  const openToday = r.daysOfWeek.includes(today);
  return (
    <div className={`kef-card kef-in${openToday ? " kef-card-today" : ""}`}>
      <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="kef-name" style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.25 }}>
            {r.name}
          </div>
          <div style={{ marginTop: 3, color: C.muted, fontSize: 13 }}>
            {placeLine(r)}
            {miles != null ? ` · ${miles.toFixed(1)} mi` : ""}
          </div>
        </div>
        <button
          className="kef-star"
          aria-pressed={fave}
          aria-label={fave ? `Remove ${r.name} from your list` : `Save ${r.name}`}
          onClick={() => onFave(r.slug)}
          style={{ background: "none", border: 0, padding: 2, margin: -2, fontSize: 19, lineHeight: 1, cursor: "pointer", color: fave ? C.gold : C.muted }}
        >
          {fave ? "★" : "☆"}
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 700,
            color: openToday ? C.mint : C.gold,
            background: openToday ? `${C.mint}1f` : `${C.gold}1f`,
            border: `1px solid ${openToday ? C.mint : C.gold}55`,
          }}
        >
          {openToday ? "Open today" : daysLabel(r)}
        </span>
        {!r.confirmed && (
          <span
            style={{
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 700,
              color: C.dim,
              background: C.surfaceHi,
              border: `1px solid ${C.border}`,
            }}
          >
            Call to confirm
          </span>
        )}
      </div>

      {openToday && (
        <div style={{ color: C.muted, fontSize: 12 }}>{daysLabel(r)}</div>
      )}

      <div className="kef-clamp2" style={{ color: C.dim, fontSize: 13, lineHeight: 1.5 }}>
        {r.terms}
      </div>

      <div style={{ marginTop: "auto", paddingTop: 4, display: "flex", flexWrap: "wrap", gap: 10, fontSize: 13 }}>
        {r.phone ? (
          <a href={phoneHref(r.phone)} style={{ color: C.gold, fontWeight: 600 }}>
            {r.phone}
          </a>
        ) : (
          <a href={mapsHref(r)} target="_blank" rel="noreferrer" style={{ color: C.muted }}>
            {r.address.split(",")[0]}
          </a>
        )}
        <a href={mapsHref(r)} target="_blank" rel="noreferrer" style={{ color: C.muted, marginLeft: "auto" }}>
          Directions →
        </a>
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button className="kef-chip" aria-pressed={on ?? undefined} onClick={onClick}>
      {children}
    </button>
  );
}

function Notice({ children }) {
  return (
    <div
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 20px", textAlign: "center", color: C.dim, fontSize: 15 }}
    >
      {children}
    </div>
  );
}
