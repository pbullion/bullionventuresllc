/* Houston-area BYOB — every restaurant around Houston and The Woodlands where
 * you can bring your own bottle, and what it costs you to open it.
 *
 * The premise is different from /hrw, which this page borrows its shell from.
 * Restaurant Weeks has an authoritative source; BYOB has none. BYOB is the
 * ABSENCE of a licence, so no TABC dataset describes it, the aggregators
 * disagree with each other and with the restaurants, and a fee quoted in a 2019
 * guide is routinely wrong today. Two consequences run through the whole page:
 *
 *   1. EVERY ROW SAYS HOW WELL IT IS KNOWN. A confirmed policy prints its fee;
 *      a place that only appears on a directory listing says "call ahead" and
 *      is never given a number it doesn't have. That is what `byob.confirmed`
 *      in the data is for, and it is the page's main visual key — see POLICY in
 *      data.js. Flattening the two would be this page's central lie.
 *   2. THE PHONE NUMBER IS A FIRST-CLASS CONTROL, not a footnote. The useful
 *      end of a visit here is a call, so the number is on the card, on the
 *      detail page, and spans the row on a phone.
 *
 * Everything runs client-side against one static JSON file — see data.js — so
 * search and filters keep working on a bad connection in a car park.
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C, BYOB_CSS } from "./theme.js";
import {
  POLICY,
  loadByob,
  milesBetween,
  phoneHref,
  placeLine,
  policyLabel,
  policyOf,
  readFaves,
  takesBeer,
  wineOnly,
  writeFaves,
} from "./data.js";

// Leaflet is ~150 KB and most visitors never open the map, so it loads on
// demand instead of in the page's first bundle — same as /hrw and /drive.
const MapView = lazy(() => import("./MapView.jsx"));

const SORTS = [
  { id: "name", label: "A–Z" },
  { id: "cheapest", label: "Cheapest corkage" },
  { id: "near", label: "Nearest me" },
];

export default function Byob() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [beerOk, setBeerOk] = useState(false);
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [favesOnly, setFavesOnly] = useState(false);
  const [sort, setSort] = useState("name");
  const [view, setView] = useState("list");
  const [faves, setFaves] = useState(readFaves);
  const [here, setHere] = useState(null);
  const [locating, setLocating] = useState(false);
  /* Phone-width, for the one thing CSS can't reach: placeholder TEXT. Same
   * 520px breakpoint as the stylesheet — keep the two in step. Read once at
   * mount rather than on resize; a phone doesn't change width mid-visit. */
  const [narrow] = useState(
    () => window.matchMedia("(max-width: 520px)").matches,
  );

  useEffect(() => {
    loadByob().then(setData, (e) => setError(e.message));
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

  /* One lowercased haystack per restaurant, built once. Deliberately includes
   * the policy note as well as the name, address and cuisines: "waived" and
   * "Mondays" and "liquor" are all things somebody would reasonably type. */
  const index = useMemo(() => {
    if (!data) return [];
    return data.restaurants.map((r) => ({
      r,
      text: [
        r.name,
        r.address,
        r.city,
        r.area,
        r.region,
        ...r.cuisines,
        r.byob?.note || "",
        r.byob?.wine || "",
        r.byob?.beer || "",
      ]
        .join(" ")
        .toLowerCase(),
    }));
  }, [data]);

  /* Whether the dataset has any coordinates at all. It can legitimately have
   * none: geocoding is the one part of the build that touches the network, it
   * is allowed to fail, and a row that doesn't geocode simply has no pin. Rather
   * than offer a map that opens empty, the map toggle and the nearest-me sort
   * hide themselves until at least one pin exists. A missing control is honest;
   * a control that does nothing is not. */
  const anyPins = useMemo(
    () => Boolean(data?.restaurants.some((r) => r.lat != null)),
    [data],
  );
  const sorts = useMemo(
    () => (anyPins ? SORTS : SORTS.filter((s) => s.id !== "near")),
    [anyPins],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = index.filter(({ r, text }) => {
      if (needle && !text.includes(needle)) return false;
      if (region && r.region !== region) return false;
      if (cuisine && !r.cuisines.includes(cuisine)) return false;
      if (freeOnly && policyOf(r) !== "free") return false;
      if (beerOk && !takesBeer(r)) return false;
      if (confirmedOnly && !r.byob?.confirmed) return false;
      if (favesOnly && !faveSet.has(r.slug)) return false;
      return true;
    });
    out = out.map(({ r }) => r);
    if (sort === "cheapest") {
      // A row with no known fee sorts last rather than first: an unknown is not
      // a zero, and putting "call ahead" at the top of a cheapest-first list
      // would be the same lie the page is built to avoid.
      out = [...out].sort((a, b) => {
        const av = a.byob?.confirmed && a.byob.from != null ? a.byob.from : Infinity;
        const bv = b.byob?.confirmed && b.byob.from != null ? b.byob.from : Infinity;
        return av - bv || a.name.localeCompare(b.name);
      });
    } else if (sort === "near" && here) {
      out = [...out].sort((a, b) => {
        const av = a.lat == null ? Infinity : milesBetween(here, a);
        const bv = b.lat == null ? Infinity : milesBetween(here, b);
        return av - bv || a.name.localeCompare(b.name);
      });
    } else {
      out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    }
    return out;
  }, [index, q, region, cuisine, freeOnly, beerOk, confirmedOnly, favesOnly, faveSet, sort, here]);

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

  const surprise = useCallback(() => {
    if (!results.length) return;
    navigate(`/byob/${results[Math.floor(Math.random() * results.length)].slug}`);
  }, [results, navigate]);

  const filtersOn =
    q || region || cuisine || freeOnly || beerOk || confirmedOnly || favesOnly;
  const clearAll = () => {
    setQ("");
    setRegion("");
    setCuisine("");
    setFreeOnly(false);
    setBeerOk(false);
    setConfirmedOnly(false);
    setFavesOnly(false);
  };

  return (
    <div className="byob" style={{ background: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{BYOB_CSS}</style>

      {/* Hero ---------------------------------------------------------- */}
      <header
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "40px 20px 22px",
          textAlign: "center",
        }}
      >
        <h1
          className="byob-hero-title"
          style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          Bring your own bottle
        </h1>
        <p
          className="byob-hero-sub"
          style={{ margin: "12px auto 0", maxWidth: 660, color: C.dim, lineHeight: 1.55 }}
        >
          Restaurants around Houston and The Woodlands that let you bring your own
          wine or beer — and what each one charges to open it.
        </p>
        {/* The caveat is in the hero, not in a footer nobody scrolls to. It is
            the single most important thing on the page: these policies change
            without notice and a wrong one costs somebody their evening. */}
        <p
          style={{
            margin: "14px auto 0",
            maxWidth: 660,
            color: C.muted,
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          Corkage changes without notice and restaurants close.{" "}
          <strong style={{ color: C.dim }}>Call before you pack a bottle.</strong>
          {data ? ` ${data.count} places, last checked ${data.built}.` : ""}
        </p>
      </header>

      {/* Sticky controls ----------------------------------------------- */}
      <div className="byob-sticky">
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 20px 12px" }}>
          <div className="byob-searchrow">
            <div className="byob-searchbox">
              <input
                className="byob-input"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  narrow
                    ? "Restaurant, cuisine, or area"
                    : "Restaurant, cuisine, or area — try “Sichuan” or “Woodlands”"
                }
                aria-label="Search BYOB restaurants"
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
                className="byob-viewtoggle"
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
            )}
          </div>

          <div className="byob-scroller" style={{ marginTop: 10 }}>
            <Chip on={freeOnly} onClick={() => setFreeOnly(!freeOnly)}>
              <Dot color={POLICY.free.color} />
              No corkage
            </Chip>
            <Chip on={beerOk} onClick={() => setBeerOk(!beerOk)}>
              🍺 Beer too
            </Chip>
            <Chip on={confirmedOnly} onClick={() => setConfirmedOnly(!confirmedOnly)}>
              ✓ Confirmed policy
            </Chip>
            <Chip on={favesOnly} onClick={() => setFavesOnly(!favesOnly)}>
              ★ My list{faves.length ? ` (${faves.length})` : ""}
            </Chip>
          </div>

          <div className="byob-filters">
            <select
              className="byob-select"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label="Area"
            >
              <option value="">Everywhere</option>
              {(data?.regions || []).map((n) => (
                <option key={n} value={n}>
                  {n} ({data.restaurants.filter((r) => r.region === n).length})
                </option>
              ))}
            </select>
            <select
              className="byob-select"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              aria-label="Cuisine"
            >
              <option value="">All cuisines</option>
              {(data?.cuisines || []).map((n) => (
                <option key={n} value={n}>
                  {n} ({data.restaurants.filter((r) => r.cuisines.includes(n)).length})
                </option>
              ))}
            </select>
            <select
              className="byob-select"
              value={sort}
              onChange={(e) => {
                if (e.target.value === "near" && !here) locate();
                setSort(e.target.value);
              }}
              aria-label="Sort by"
            >
              {sorts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {anyPins && (
              <Chip on={!!here} onClick={locate}>
                {locating ? "Locating…" : here ? "📍 Located" : "📍 Near me"}
              </Chip>
            )}
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
            <span className="byob-count" style={{ color: C.muted }}>
              {data ? `${results.length} of ${data.count}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Results -------------------------------------------------------- */}
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 20px 60px" }}>
        {error && (
          <Notice>
            Couldn&rsquo;t load the restaurant list ({error}).{" "}
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
            <div className="byob-spinner" />
            <span style={{ color: C.muted, fontSize: 14 }}>Loading&hellip;</span>
          </div>
        )}

        {data && anyPins && view === "map" && (
          <Suspense
            fallback={
              <div style={{ display: "grid", placeItems: "center", padding: "70px 0" }}>
                <div className="byob-spinner" />
              </div>
            }
          >
            <MapView
              restaurants={results}
              faveSet={faveSet}
              here={here}
              onLocate={locate}
            />
          </Suspense>
        )}

        {data && (view === "list" || !anyPins) && (
          <>
            {results.length === 0 ? (
              <Notice>
                Nothing matches those filters.{" "}
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
                  Clear them
                </button>
              </Notice>
            ) : (
              <div className="byob-grid">
                {results.map((r) => (
                  <Card
                    key={r.slug}
                    r={r}
                    fave={faveSet.has(r.slug)}
                    onFave={toggleFave}
                    miles={here && r.lat != null ? milesBetween(here, r) : null}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* How the list is built, at the bottom where the curious will find it.
            Someone who reaches the end of a directory of 34 restaurants is
            exactly the person who wants to know why their favourite isn't on
            it. */}
        {data && (
          <p
            style={{
              margin: "34px auto 0",
              maxWidth: 720,
              color: C.muted,
              fontSize: 13,
              lineHeight: 1.65,
              textAlign: "center",
            }}
          >
            There is no official list of BYOB restaurants — BYOB is the absence of
            a licence, so nothing in the TABC&rsquo;s records describes it. This one
            is assembled by hand from restaurant sites and local guides, with the
            source recorded against every entry. Places marked{" "}
            <em style={{ color: C.dim, fontStyle: "normal" }}>policy unconfirmed</em>{" "}
            turn up on BYOB directories without stating terms; treat those as a
            lead, not a promise.
          </p>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Card({ r, fave, onFave, miles }) {
  const kind = policyOf(r);
  const p = POLICY[kind];
  return (
    <div className="byob-card byob-in">
      <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
        <Link
          to={`/byob/${r.slug}`}
          style={{ flex: 1, minWidth: 0 }}
          aria-label={r.name}
        >
          {/* The link stretches over the whole card so the entire tile is the
              hit target, but the star sits above it — hence z-index on
              .byob-star. */}
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 14,
            }}
          />
          <div
            className="byob-name"
            style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.25 }}
          >
            {r.name}
          </div>
          <div style={{ marginTop: 3, color: C.muted, fontSize: 13 }}>
            {placeLine(r)}
            {miles != null ? ` · ${miles.toFixed(1)} mi` : ""}
          </div>
        </Link>
        <button
          className="byob-star"
          aria-pressed={fave}
          aria-label={fave ? `Remove ${r.name} from your list` : `Save ${r.name}`}
          onClick={() => onFave(r.slug)}
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
            color: p.color,
            background: `${p.color}1f`,
            border: `1px solid ${p.color}55`,
          }}
        >
          <Dot color={p.color} />
          {policyLabel(r)}
        </span>
        {wineOnly(r) && (
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
            Wine only
          </span>
        )}
      </div>

      <div className="byob-clamp2" style={{ color: C.dim, fontSize: 13, lineHeight: 1.5 }}>
        {r.cuisines.join(" · ")}
      </div>

      {/* A number that dials is the point of the card, since calling ahead is
          what this page keeps telling you to do. Where the seed has no number,
          the street line goes here instead of a row of "no number listed" —
          the detail page's "Look up the number" button is the fix for that,
          and an address is worth more than a repeated absence. */}
      <div style={{ marginTop: "auto", paddingTop: 4, fontSize: 13 }}>
        {r.phone ? (
          <a
            href={phoneHref(r.phone)}
            style={{ color: C.gold, fontWeight: 600, position: "relative", zIndex: 2 }}
          >
            {r.phone}
          </a>
        ) : (
          <span style={{ color: C.muted }}>{r.address.split(",")[0]}</span>
        )}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button className="byob-chip" aria-pressed={on ?? undefined} onClick={onClick}>
      {children}
    </button>
  );
}

function Dot({ color }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

function Notice({ children }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "22px 20px",
        textAlign: "center",
        color: C.dim,
        fontSize: 15,
      }}
    >
      {children}
    </div>
  );
}
