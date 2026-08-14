/* /hrw/:slug — one restaurant, and the whole reason the page exists: its actual
 * Restaurant Weeks menus, course by course.
 *
 * A restaurant can publish up to four menus (lunch, brunch, dinner, to-go) at
 * different prices, so the menus are tabbed rather than stacked — four four-course
 * menus in a column is a very long page to scroll past to find the dinner one.
 */
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { C, HRW_CSS } from "./theme.js";
import {
  EVENT,
  dishCount,
  loadHrw,
  mapsHref,
  mealLabel,
  phoneHref,
  readFaves,
  tierColor,
  writeFaves,
} from "./data.js";

import Reviews from "./Reviews.jsx";
import { placeOf, siblingsOf } from "./places.js";

const MiniMap = lazy(() => import("./MiniMap.jsx"));

export default function Restaurant() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [picked, setPicked] = useState(null);
  const [faves, setFaves] = useState(readFaves);

  useEffect(() => {
    loadHrw().then(setData, (e) => setError(e.message));
  }, []);

  const r = useMemo(
    () => data?.restaurants.find((x) => x.slug === slug) || null,
    [data, slug],
  );

  /* Which reviews this page shows. A place is a brand, so the other locations of
   * a chain share both the review thread and a link at the top of it. */
  const place = useMemo(
    () => (r ? placeOf(data.restaurants, r) : null),
    [data, r],
  );
  const siblings = useMemo(
    () => (r ? siblingsOf(data.restaurants, r) : []),
    [data, r],
  );

  /* Which menu is open is derived, not stored: the default is the meal with the
   * most dishes (usually dinner — the one someone landing here wants first), and
   * an explicit tap wins over it. Deriving also means clicking through from one
   * restaurant to the next keeps you on the same meal when it has one. */
  const biggest = useMemo(() => {
    if (!r?.menus.length) return null;
    const size = (m) => m.courses.reduce((n, c) => n + c.dishes.length, 0);
    return r.menus.reduce((a, b) => (size(b) > size(a) ? b : a)).type;
  }, [r]);

  useEffect(() => {
    if (r) document.title = `${r.name} — Houston Restaurant Weeks 2026`;
    return () => {
      document.title = "Bullion Ventures LLC";
    };
  }, [r]);

  const fave = faves.includes(slug);
  const toggleFave = () => {
    const next = fave ? faves.filter((s) => s !== slug) : [...faves, slug];
    setFaves(next);
    writeFaves(next);
  };

  const shell = (children) => (
    <div className="hrw" style={{ background: C.bg, color: C.text, flex: 1, minHeight: "100vh" }}>
      <style>{HRW_CSS}</style>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "22px 20px 60px" }}>{children}</div>
    </div>
  );

  const back = (
    <Link
      to="/hrw"
      style={{ color: C.muted, fontSize: 13.5, fontWeight: 600, display: "inline-block", marginBottom: 18 }}
    >
      ← All restaurants
    </Link>
  );

  if (error)
    return shell(
      <>
        {back}
        <p style={{ color: C.dim }}>Couldn't load the menus ({error}).</p>
      </>,
    );

  if (!data)
    return shell(
      <div style={{ display: "grid", placeItems: "center", padding: "80px 0" }}>
        <div className="hrw-spinner" />
      </div>,
    );

  if (!r)
    return shell(
      <>
        {back}
        <h1 style={{ fontSize: 22, margin: "0 0 10px" }}>Not on the list</h1>
        <p style={{ color: C.dim, lineHeight: 1.6 }}>
          No Restaurant Weeks 2026 menu for “{slug}”. It may not be participating
          this year — try the{" "}
          <Link to="/hrw" style={{ color: C.gold, textDecoration: "underline" }}>
            full list
          </Link>
          .
        </p>
      </>,
    );

  const active =
    r.menus.find((m) => m.type === picked) ||
    r.menus.find((m) => m.type === biggest) ||
    r.menus[0];

  return shell(
    <>
      {back}

      {/* Header ------------------------------------------------------- */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: "0 0 9px",
              fontSize: "clamp(24px, 4.4vw, 36px)",
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: "-.02em",
            }}
          >
            {r.name}
          </h1>
          <p style={{ margin: "0 0 4px", fontSize: 14, color: C.dim, lineHeight: 1.5 }}>
            {r.cuisines.join(" · ")}
          </p>
          <p style={{ margin: 0, fontSize: 13.5, color: C.muted }}>
            📍 {r.neighborhoods.join(" / ")} · {dishCount(r)} dishes on{" "}
            {r.menus.length} {r.menus.length === 1 ? "menu" : "menus"}
          </p>
        </div>
        <button className="hrw-star" style={{ fontSize: 26 }} aria-pressed={fave ? "true" : undefined} onClick={toggleFave}>
          {fave ? "★" : "☆"}
        </button>
      </div>

      {/* Actions ------------------------------------------------------ */}
      <div className="hrw-actions">
        {r.links.reservation && (
          <a
            href={r.links.reservation}
            target="_blank"
            rel="noreferrer"
            style={{
              background: C.gold,
              color: "#1a1405",
              borderRadius: 10,
              padding: "11px 17px",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            {r.reservations === "Reservations Required" ? "Reserve a table" : "Book or view"} →
          </a>
        )}
        {r.phone && <Action href={phoneHref(r.phone)}>📞 {r.phone}</Action>}
        <Action href={mapsHref(r)} external>
          🗺️ Directions
        </Action>
        {r.links.website && (
          <Action href={r.links.website} external>
            🌐 Website
          </Action>
        )}
        {r.links.instagram && (
          <Action href={r.links.instagram} external>
            Instagram
          </Action>
        )}
        {r.links.hrw && (
          <Action href={r.links.hrw} external>
            HRW page
          </Action>
        )}
      </div>

      {/* Facts -------------------------------------------------------- */}
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
          margin: "22px 0 0",
        }}
      >
        <Fact label="Address" value={r.address} />
        <Fact
          label="Reservations"
          value={r.reservations}
          tone={r.reservations === "Reservations Required" ? C.rose : C.mint}
        />
        {r.parking.length > 0 && <Fact label="Parking" value={r.parking.join(", ")} />}
        {r.specialHours && <Fact label="Special hours" value={r.specialHours} tone={C.gold} />}
        {r.benefiting && <Fact label="Benefiting" value={r.benefiting} />}
      </dl>

      <Suspense fallback={null}>
        <MiniMap restaurant={r} />
      </Suspense>

      {/* Menus -------------------------------------------------------- */}
      {!r.menus.length ? (
        <p style={{ marginTop: 30, color: C.dim, fontSize: 14.5, lineHeight: 1.6 }}>
          This restaurant is participating, but hasn't published its menu yet.{" "}
          {r.links.hrw && (
            <a href={r.links.hrw} target="_blank" rel="noreferrer" style={{ color: C.gold, textDecoration: "underline" }}>
              Check its HRW page
            </a>
          )}
        </p>
      ) : (
        <section style={{ marginTop: 30 }}>
          {r.menus.length > 1 && (
            <div className="hrw-scroller" style={{ marginBottom: 16 }}>
              {r.menus.map((m) => (
                <button
                  key={m.type}
                  className="hrw-chip"
                  aria-pressed={m.type === active.type ? "true" : undefined}
                  onClick={() => setPicked(m.type)}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: tierColor(m.cost),
                      display: "inline-block",
                    }}
                  />
                  {mealLabel(m.type)} · ${m.cost}
                </button>
              ))}
            </div>
          )}

          <div
            key={active.type}
            className="hrw-in"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: "clamp(16px, 3vw, 26px)",
            }}
          >
            <header
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                paddingBottom: 14,
                marginBottom: 6,
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.01em" }}>
                {mealLabel(active.type)}
              </h2>
              <span style={{ marginLeft: "auto", fontSize: 15, fontWeight: 800, color: tierColor(active.cost) }}>
                {active.price}
              </span>
            </header>

            {active.note && (
              <p
                style={{
                  margin: "12px 0 4px",
                  fontSize: 12.5,
                  color: C.muted,
                  lineHeight: 1.6,
                  fontStyle: "italic",
                }}
              >
                {active.note}
              </p>
            )}

            {active.courses.map((course) => (
              <div key={course.name} style={{ marginTop: 20 }}>
                <h3
                  style={{
                    margin: "0 0 4px",
                    fontSize: 11.5,
                    fontWeight: 800,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: C.gold,
                  }}
                >
                  {course.name}
                </h3>
                {course.dishes.map((d, i) => (
                  <div className="hrw-dish" key={`${d.n}-${i}`}>
                    <div style={{ fontSize: 15, fontWeight: 650, lineHeight: 1.35 }}>{d.n}</div>
                    {d.d && (
                      <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5, marginTop: 3 }}>
                        {d.d}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      <Reviews place={place} slug={slug} siblings={siblings} />

      <p style={{ marginTop: 26, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
        Available {EVENT.range}. Menu as published for Houston Restaurant Weeks
        (compiled {data.generated}). Dishes, prices and availability can change —
        confirm with the restaurant.
      </p>
    </>,
  );
}

function Action({ href, external, children }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "11px 15px",
        fontSize: 13.5,
        fontWeight: 700,
        color: C.dim,
      }}
    >
      {children}
    </a>
  );
}

function Fact({ label, value, tone }) {
  if (!value) return null;
  return (
    <div>
      <dt
        style={{
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 4,
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: 13.5, color: tone || C.dim, lineHeight: 1.5 }}>{value}</dd>
    </div>
  );
}
