/* One BYOB restaurant, at /byob/<slug>.
 *
 * This page exists for the thirty seconds before you leave the house: what
 * exactly does this place charge, does it take beer as well as wine, what is
 * the number, and where is it. So the policy block is the first thing under
 * the name — bigger than the address, bigger than the cuisine — and the
 * sources it came from are printed at the bottom, because on this subject
 * "who says so, and when" is part of the answer.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { C, BYOB_CSS } from "./theme.js";
import {
  POLICY,
  loadByob,
  mapsHref,
  phoneHref,
  placeLine,
  policyLabel,
  policyOf,
  readFaves,
  takesBeer,
  wineOnly,
  writeFaves,
} from "./data.js";

const MiniMap = lazy(() => import("./MiniMap.jsx"));

export default function ByobRestaurant() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [faves, setFaves] = useState(readFaves);

  useEffect(() => {
    loadByob().then(setData, (e) => setError(e.message));
  }, []);

  const r = useMemo(
    () => data?.restaurants.find((x) => x.slug === slug) || null,
    [data, slug],
  );

  const fave = faves.includes(slug);
  const toggleFave = () => {
    const next = fave ? faves.filter((s) => s !== slug) : [...faves, slug];
    setFaves(next);
    writeFaves(next);
  };

  /* Other rows of the same restaurant group — Collina's has two, Cooking Girl
   * has five. Matched on the name before the parenthesised location, which is
   * how the seed names them, rather than on a group id: one field is easier to
   * keep right by hand than two, and getting it wrong here costs a "more
   * locations" list, not a wrong fee. */
  const siblings = useMemo(() => {
    if (!r || !data) return [];
    const base = r.name.replace(/\s*\(.*\)\s*$/, "");
    if (base === r.name) return [];
    return data.restaurants.filter(
      (x) => x.slug !== r.slug && x.name.replace(/\s*\(.*\)\s*$/, "") === base,
    );
  }, [r, data]);

  return (
    <div className="byob" style={{ background: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{BYOB_CSS}</style>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "26px 20px 60px" }}>
        <Link
          to="/byob"
          style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}
        >
          ← All BYOB restaurants
        </Link>

        {error && (
          <p style={{ marginTop: 30, color: C.dim }}>
            Couldn&rsquo;t load the restaurant list ({error}).
          </p>
        )}

        {!data && !error && (
          <div style={{ display: "grid", placeItems: "center", padding: "70px 0" }}>
            <div className="byob-spinner" />
          </div>
        )}

        {data && !r && (
          <p style={{ marginTop: 30, color: C.dim }}>
            No BYOB restaurant with that name here.{" "}
            <Link to="/byob" style={{ color: C.gold }}>
              Back to the list
            </Link>
            .
          </p>
        )}

        {r && <Detail r={r} fave={fave} onFave={toggleFave} siblings={siblings} />}
      </div>
    </div>
  );
}

function Detail({ r, fave, onFave, siblings }) {
  const kind = policyOf(r);
  const p = POLICY[kind];
  return (
    <>
      <div
        style={{
          marginTop: 22,
          display: "flex",
          alignItems: "start",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "clamp(26px, 4.4vw, 38px)", fontWeight: 800, flex: 1 }}>
          {r.name}
        </h1>
        <button
          className="byob-star"
          aria-pressed={fave}
          aria-label={fave ? "Remove from your list" : "Save to your list"}
          onClick={onFave}
          style={{ fontSize: 26, marginTop: 6 }}
        >
          {fave ? "★" : "☆"}
        </button>
      </div>
      <p style={{ margin: "8px 0 0", color: C.dim, fontSize: 15 }}>
        {r.cuisines.join(" · ")} — {placeLine(r)}
      </p>

      {/* The policy block. Everything about it is sized to be read from arm's
          length while you're deciding whether to grab a bottle on the way. */}
      <section
        style={{
          marginTop: 20,
          background: C.surface,
          border: `1px solid ${p.color}44`,
          borderLeft: `3px solid ${p.color}`,
          borderRadius: 14,
          padding: "18px 18px 16px",
        }}
      >
        <div style={{ color: p.color, fontWeight: 800, fontSize: 20 }}>
          {policyLabel(r)}
        </div>

        {r.byob?.confirmed ? (
          <dl
            style={{
              margin: "14px 0 0",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "8px 16px",
              fontSize: 15,
            }}
          >
            <dt style={{ color: C.muted }}>Wine</dt>
            <dd style={{ margin: 0 }}>{r.byob.wine || "Not stated"}</dd>
            <dt style={{ color: C.muted }}>Beer</dt>
            <dd style={{ margin: 0, color: takesBeer(r) ? C.text : C.muted }}>
              {r.byob.beer || (wineOnly(r) ? "Not permitted" : "Not stated")}
            </dd>
          </dl>
        ) : (
          <p style={{ margin: "12px 0 0", color: C.dim, fontSize: 15, lineHeight: 1.55 }}>
            This one appears on BYOB directories but publishes no terms of its
            own, so there is no fee to quote. Ring them before you bring
            anything.
          </p>
        )}

        {r.byob?.note && (
          <p style={{ margin: "14px 0 0", color: C.dim, fontSize: 14, lineHeight: 1.6 }}>
            {r.byob.note}
          </p>
        )}
      </section>

      <div className="byob-actions">
        {r.phone ? (
          <Action href={phoneHref(r.phone)} primary>
            📞 {r.phone}
          </Action>
        ) : (
          <Action href={mapsHref(r)} primary>
            🔎 Look up the number
          </Action>
        )}
        <Action href={mapsHref(r)}>🧭 Directions</Action>
        {r.website && <Action href={r.website}>🌐 Website</Action>}
      </div>

      <p style={{ margin: "10px 0 0", color: C.dim, fontSize: 14, lineHeight: 1.55 }}>
        {r.address}
      </p>

      {r.lat != null && (
        <Suspense fallback={null}>
          <MiniMap lat={r.lat} lon={r.lon} name={r.name} />
        </Suspense>
      )}

      {siblings.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.dim }}>
            Other locations
          </h2>
          <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link
                  to={`/byob/${s.slug}`}
                  style={{
                    display: "block",
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{s.area}</span>
                  <span style={{ color: C.muted, fontSize: 13 }}> — {s.address}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Where the policy came from and when. On a subject where every guide
          contradicts the next one, this is not a citation formality — it is how
          you judge whether to trust the number above. */}
      <section style={{ marginTop: 30, color: C.muted, fontSize: 13, lineHeight: 1.7 }}>
        <div>Policy last checked {r.checked}. Sources:</div>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {r.sources.map((u) => (
            <li key={u}>
              <a
                href={u}
                target="_blank"
                rel="noreferrer"
                style={{ color: C.dim, wordBreak: "break-all" }}
              >
                {hostOf(u)}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Action({ href, primary, children }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      style={{
        display: "inline-block",
        padding: "11px 16px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 700,
        background: primary ? C.gold : C.surface,
        color: primary ? "#1a1405" : C.text,
        border: `1px solid ${primary ? C.gold : C.border}`,
      }}
    >
      {children}
    </a>
  );
}

const hostOf = (u) => {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return u;
  }
};
