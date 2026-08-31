import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import {
  CLASS_LABEL,
  category,
  chanceColor,
  chanceLabel,
  classColor,
  compass,
  disturbanceTitle,
  houstonPhrase,
  houstonScore,
  inHours,
  ktToMph,
  miles,
  stormTitle,
} from "./storms";

/* Storm data comes from the Sheline backend, which proxies NHC's
 * CurrentStorms.json (no CORS on that feed) and, on top of it, parses the
 * forecast-track and cone KMZs, pulls the graphical tropical weather outlook
 * for disturbances, and works out each system's distance and closest forecast
 * approach to Houston. See routes/nhc.js in shelineArtWebsiteAPI.
 *
 * The storm graphic images are loaded straight from nhc.noaa.gov via <img> —
 * those allow cross-origin.
 *
 * DISTURBANCES ARE NOT OPTIONAL DECORATION. A system only enters
 * CurrentStorms.json once NHC names it, so before the backend started reading
 * the outlook this page said "no active tropical cyclones" while an invest sat
 * in the Gulf — the exact situation it exists to warn about. */
const STORMS_API = "https://sheline-art-website-api.herokuapp.com/nhc/current-storms";

/* Leaflet only loads for whoever actually opens this page. */
const StormMap = lazy(() => import("./StormMap.jsx"));

// Always-on NOAA imagery — works even when no storm is active and even if the
// storms API is unreachable.
const OUTLOOKS = [
  {
    title: "Tropical Outlook — 2 Day",
    caption: "NHC formation chances, next 48 hours",
    url: "https://www.nhc.noaa.gov/xgtwo/two_atl_2d0.png",
  },
  {
    title: "Tropical Outlook — 7 Day",
    caption: "NHC formation chances, next 7 days",
    url: "https://www.nhc.noaa.gov/xgtwo/two_atl_7d0.png",
  },
];
const SATELLITE = [
  {
    title: "Gulf Satellite — Live",
    caption: "GOES-East GeoColor, Gulf sector",
    url: "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ga/GEOCOLOR/1000x1000.jpg",
  },
  {
    title: "Tropical Atlantic — Live",
    caption: "GOES-East GeoColor, tropical Atlantic",
    url: "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/taw/GEOCOLOR/1800x1080.jpg",
  },
];

function Figure({ title, caption, url, bust }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure
      style={{
        margin: "0 0 14px",
        background: "#111827",
        border: "1px solid #1e2a44",
        borderRadius: 14,
        overflow: "hidden",
      }}>
      <figcaption style={{ padding: "11px 14px 4px" }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        {caption ? (
          <div style={{ fontSize: 12, color: "#8892b0", marginTop: 2 }}>{caption}</div>
        ) : null}
      </figcaption>
      <img
        src={`${url}${url.includes("?") ? "&" : "?"}t=${bust}`}
        alt={title}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ display: "block", width: "100%", height: "auto", background: "#0b0f19" }}
      />
    </figure>
  );
}

function Pill({ color, background, children }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        background,
        padding: "3px 8px",
        borderRadius: 999,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
      }}>
      {children}
    </span>
  );
}

/* The headline: the one system a Houston reader should look at first, and the
 * single number they actually want — how close it gets, not how strong it is.
 * Placed above the map because "how close" is the question; the map is the
 * evidence for the answer. */
function HoustonHeadline({ item }) {
  if (!item) {
    return (
      <div
        style={{
          margin: "4px 0 16px",
          padding: "18px 16px",
          background: "#0d1526",
          border: "1px solid #1e4d2b",
          borderRadius: 14,
          color: "#a7f3d0",
          fontSize: 14,
          fontWeight: 600,
        }}>
        ✓ Nothing tropical within reach of Houston right now.
      </div>
    );
  }

  const isStorm = item.kind === "storm";
  const rel = item.houston;
  const accent =
    isStorm ?
      classColor(item.classification, ktToMph(item.intensityKt))
    : chanceColor(item.chance7 ?? item.chance2);
  const where = houstonPhrase(rel, { edge: !isStorm });
  const closest = isStorm ? rel?.closest : null;

  return (
    <div
      style={{
        margin: "4px 0 16px",
        padding: "16px 16px 14px",
        background: `linear-gradient(180deg, ${accent}22, #0d1526 70%)`,
        border: `1px solid ${accent}66`,
        borderRadius: 16,
      }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8892b0", letterSpacing: "0.09em" }}>
        CLOSEST TO HOUSTON
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginTop: 7 }}>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.3px" }}>
          {isStorm ? stormTitle(item) : disturbanceTitle(item)}
        </span>
        {!isStorm && (item.chance7 != null || item.chance2 != null) ? (
          <Pill color="#0b0f19" background={accent}>
            {item.chance7 ?? item.chance2}% formation
          </Pill>
        ) : null}
        {item.inGulf ? (
          <Pill color="#fde68a" background="#78350f">
            in the Gulf
          </Pill>
        ) : null}
      </div>
      {where ? (
        <div style={{ fontSize: 17, fontWeight: 700, color: "#eef2ff", marginTop: 8 }}>{where}</div>
      ) : null}
      {closest ? (
        <div style={{ fontSize: 14, color: "#a9b4cc", marginTop: 6, lineHeight: 1.55 }}>
          Forecast to pass within <b style={{ color: accent }}>{miles(closest.distanceMi)}</b>
          {closest.hour != null ? ` ${inHours(closest.hour)}` : ""}.
        </div>
      ) : null}
      {!isStorm ? (
        <div style={{ fontSize: 13, color: "#a9b4cc", marginTop: 6, lineHeight: 1.55 }}>
          Not a named storm yet — this is a {chanceLabel(item.chance7 ?? item.chance2)}-chance
          formation area from NHC&apos;s tropical weather outlook. No forecast track exists until
          it is designated.
        </div>
      ) : null}
    </div>
  );
}

/* The forecast positions as a table. This is the tropicaltidbits-style view of
 * an advisory: where it is expected to be, when, and how strong — which is the
 * part of the cone graphic you cannot read off the picture. */
function ForecastTable({ track }) {
  const rows = (track || []).filter((p) => p.hour != null);
  if (rows.length < 2) return null;
  return (
    <div style={{ overflowX: "auto", margin: "2px 0 12px" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5, minWidth: 340 }}>
        <thead>
          <tr style={{ color: "#606a85", textAlign: "left" }}>
            {["", "Position", "Wind", "Stage"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "6px 10px 6px 0",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #1e2a44",
                  whiteSpace: "nowrap",
                }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={`${p.hour}-${p.lat}-${p.lon}`}>
              <td
                style={{
                  padding: "7px 10px 7px 0",
                  color: p.current ? "#eef2ff" : "#a9b4cc",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  borderBottom: "1px solid #141d31",
                }}>
                {p.current ? "Now" : `+${p.hour}h`}
              </td>
              <td
                style={{
                  padding: "7px 10px 7px 0",
                  color: "#8892b0",
                  whiteSpace: "nowrap",
                  borderBottom: "1px solid #141d31",
                }}>
                {p.lat.toFixed(1)}, {p.lon.toFixed(1)}
              </td>
              <td
                style={{
                  padding: "7px 10px 7px 0",
                  color: "#eef2ff",
                  whiteSpace: "nowrap",
                  borderBottom: "1px solid #141d31",
                }}>
                {p.intensityMph != null ? `${p.intensityMph} mph` : "—"}
              </td>
              <td
                style={{
                  padding: "7px 0",
                  color: "#8892b0",
                  borderBottom: "1px solid #141d31",
                }}>
                {p.type || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StormCard({ storm, bust }) {
  const [openGraphics, setOpenGraphics] = useState(false);
  const mph = ktToMph(storm.intensityKt);
  const cat = storm.classification === "HU" ? category(mph) : null;
  const accent = classColor(storm.classification, mph);
  const label = CLASS_LABEL[storm.classification] || storm.classification;
  const dir = compass(storm.movementDir);
  const rel = storm.houston;
  const adv =
    storm.lastUpdate ?
      new Date(storm.lastUpdate).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <section
      style={{
        margin: "0 0 18px",
        border: `1px solid ${accent}55`,
        borderRadius: 16,
        background: "#0d1526",
        overflow: "hidden",
      }}>
      <div style={{ padding: "16px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{storm.name}</span>
          <Pill color="#0b0f19" background={accent}>
            {cat ? `Cat ${cat} Hurricane` : label}
          </Pill>
          {storm.inGulf ? (
            <Pill color="#fde68a" background="#78350f">
              in the Gulf
            </Pill>
          ) : null}
        </div>

        {/* Distance to Houston leads the card. On the old version you had to
            read a lat/lon off the bottom of the line and place it yourself. */}
        {rel ? (
          <div style={{ fontSize: 14, color: "#eef2ff", marginTop: 9, fontWeight: 600 }}>
            {houstonPhrase(rel)}
            {rel.closest ? (
              <span style={{ color: "#a9b4cc", fontWeight: 400 }}>
                {" · closest "}
                <b style={{ color: accent, fontWeight: 700 }}>{miles(rel.closest.distanceMi)}</b>
                {rel.closest.hour != null ? ` ${inHours(rel.closest.hour)}` : ""}
              </span>
            ) : null}
          </div>
        ) : null}

        <div style={{ fontSize: 13, color: "#a9b4cc", marginTop: 7, lineHeight: 1.6 }}>
          {mph != null ? (
            <>
              Winds <b style={{ color: "#eef2ff" }}>{mph} mph</b>
            </>
          ) : null}
          {storm.pressureMb ? <> · {storm.pressureMb} mb</> : null}
          {dir ? (
            <>
              {" "}
              · Moving {dir}
              {storm.movementSpeed ? ` at ${storm.movementSpeed} mph` : ""}
            </>
          ) : null}
          {storm.latitude ? (
            <>
              {" "}
              · {storm.latitude}, {storm.longitude}
            </>
          ) : null}
        </div>
        {adv ? (
          <div style={{ fontSize: 12, color: "#8892b0", marginTop: 6 }}>
            Advisory {storm.advNum || ""} · {adv}
            {storm.advisoryUrl ? (
              <>
                {" · "}
                <a
                  href={storm.advisoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#7aa2ff" }}>
                  full advisory
                </a>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ padding: "0 16px" }}>
        <ForecastTable track={storm.forecast} />
      </div>

      {/* The NOAA graphics are the heaviest thing on the page — six full-width
          PNGs per storm — and the map plus the table above now answer the
          question most visits are here for. Collapsed by default so opening the
          page during a storm is not a multi-megabyte download. */}
      {(storm.graphics || []).length ? (
        <div style={{ borderTop: "1px solid #1e2a44" }}>
          <button
            onClick={() => setOpenGraphics((v) => !v)}
            style={{
              width: "100%",
              padding: "13px 16px",
              background: "transparent",
              color: "#7aa2ff",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}>
            {openGraphics ? "▾" : "▸"} NHC graphics — cone, surge, wind arrival
          </button>
          {openGraphics ? (
            <div style={{ padding: "0 12px 4px" }}>
              {storm.graphics.map((g) => (
                // Upgrade any "_sm" thumbnail URL to the full-resolution graphic
                // so it stays crisp at full phone width (defensive — backend now
                // emits full-res too).
                <Figure
                  key={g.key}
                  title={g.title}
                  url={g.url.replace("_sm+png/", "+png/")}
                  bust={bust}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/* A disturbance has no advisory, no name and no track — only an area and two
 * formation odds. The card says exactly that much and no more; dressing it up
 * to look like a storm card would imply a forecast that does not exist. */
function DisturbanceCard({ area }) {
  const pct = area.chance7 ?? area.chance2;
  const accent = chanceColor(pct);
  const rel = area.houston;
  return (
    <section
      style={{
        margin: "0 0 12px",
        border: `1px solid ${accent}55`,
        borderRadius: 14,
        background: "#0d1526",
        padding: "14px 16px",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 17, fontWeight: 800 }}>{disturbanceTitle(area)}</span>
        {area.inGulf ? (
          <Pill color="#fde68a" background="#78350f">
            in the Gulf
          </Pill>
        ) : null}
      </div>
      {rel ? (
        <div style={{ fontSize: 14, color: "#eef2ff", marginTop: 7, fontWeight: 600 }}>
          {houstonPhrase(rel, { edge: true })}
          <span style={{ color: "#606a85", fontWeight: 400, fontSize: 12 }}> (nearest edge)</span>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
        {[
          ["2 days", area.chance2],
          ["7 days", area.chance7],
        ].map(([when, v]) => (
          <div key={when}>
            <div style={{ fontSize: 11, color: "#606a85", letterSpacing: "0.06em" }}>
              {when.toUpperCase()}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: v != null ? accent : "#606a85" }}>
              {v != null ? `${v}%` : "—"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function GulfHurricane() {
  const [bust, setBust] = useState(() => Date.now());
  const [storms, setStorms] = useState([]);
  const [disturbances, setDisturbances] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [showLoop, setShowLoop] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${STORMS_API}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStorms(Array.isArray(data.storms) ? data.storms : []);
      setDisturbances(Array.isArray(data.disturbances) ? data.disturbances : []);
      setStatus("ok");
    } catch {
      setStorms([]);
      setDisturbances([]);
      setStatus("error");
    }
    setBust(Date.now());
  }, []);

  useEffect(() => {
    // Async wrapper keeps the fetch off the effect's synchronous path.
    (async () => {
      await load();
    })();
    const id = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(id);
  }, [load]);

  /* Storms and disturbances ranked together, because to a reader they are one
   * list — "what is out there and how much should I care" — and NHC's split
   * between them is about whether a system has been designated, not about
   * whether it matters. */
  const ranked = useMemo(() => {
    const all = [
      ...storms.map((s) => ({ ...s, kind: "storm" })),
      ...disturbances.map((d) => ({ ...d, kind: "disturbance" })),
    ];
    return all.sort((a, b) => houstonScore(a) - houstonScore(b));
  }, [storms, disturbances]);

  const headline = ranked[0] || null;
  const focusId = headline?.kind === "storm" ? headline.id : null;
  const updated = new Date(bust).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const anything = storms.length > 0 || disturbances.length > 0;

  return (
    <div
      style={{
        backgroundColor: "#0b0f19",
        color: "#eef2ff",
        minHeight: "100vh",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "16px 18px",
          background: "rgba(11,15,25,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #1e2a44",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px" }}>
            🌀 Gulf Hurricane
          </div>
          <div style={{ fontSize: 12, color: "#8892b0", marginTop: 2 }}>
            Houston · updated {updated} · auto-refresh 5 min
          </div>
        </div>
        <button
          onClick={load}
          style={{
            border: "1px solid #2a3b5e",
            background: "#152036",
            color: "#eef2ff",
            borderRadius: 10,
            padding: "9px 14px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}>
          Refresh
        </button>
      </header>

      <main style={{ padding: "14px 12px 40px", maxWidth: 720, margin: "0 auto" }}>
        {status === "error" ? (
          <div
            style={{
              margin: "4px 0 16px",
              padding: "14px 16px",
              background: "#1a1120",
              border: "1px solid #4d1e2b",
              borderRadius: 14,
              color: "#fca5a5",
              fontSize: 13,
            }}>
            Couldn&apos;t reach the live storm feed right now — showing the tropical outlooks and
            satellite below. Tap Refresh to retry.
          </div>
        ) : (
          <HoustonHeadline item={headline} />
        )}

        {/* The map. Rendered whenever the feed answered — with nothing active it
            is still a Gulf with Houston on it, which is the right "all clear". */}
        {status !== "error" ? (
          <Suspense
            fallback={
              <div
                style={{
                  height: 420,
                  borderRadius: 14,
                  border: "1px solid #1e2a44",
                  background: "#0d1526",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#606a85",
                  fontSize: 13,
                }}>
                Loading map…
              </div>
            }>
            <StormMap storms={storms} disturbances={disturbances} focus={focusId} />
          </Suspense>
        ) : null}

        {disturbances.length ? (
          <>
            <SectionLabel>
              {disturbances.length} formation area{disturbances.length > 1 ? "s" : ""} watched
            </SectionLabel>
            {disturbances.map((d) => (
              <DisturbanceCard key={d.id} area={d} />
            ))}
          </>
        ) : null}

        {storms.length ? (
          <>
            <SectionLabel>
              {storms.filter((s) => s.inGulf).length > 0 ?
                `${storms.filter((s) => s.inGulf).length} system${
                  storms.filter((s) => s.inGulf).length > 1 ? "s" : ""
                } in the Gulf`
              : "Active systems"}
            </SectionLabel>
            {storms.map((s) => (
              <StormCard key={s.id} storm={s} bust={bust} />
            ))}
          </>
        ) : null}

        {status === "ok" && !anything ? (
          <div
            style={{
              margin: "6px 0 22px",
              padding: "18px 16px",
              background: "#0d1526",
              border: "1px solid #1e4d2b",
              borderRadius: 14,
              color: "#a7f3d0",
              fontSize: 14,
              fontWeight: 600,
            }}>
            ✓ No named storms and no formation areas. All quiet in the Atlantic &amp; Gulf.
          </div>
        ) : null}

        {/* Always-on outlooks */}
        <SectionLabel>Tropical Weather Outlook</SectionLabel>
        {OUTLOOKS.map((o) => (
          <Figure key={o.url} title={o.title} caption={o.caption} url={o.url} bust={bust} />
        ))}

        {/* Always-on satellite */}
        <SectionLabel>Live Satellite</SectionLabel>
        {SATELLITE.map((o) => (
          <Figure key={o.url} title={o.title} caption={o.caption} url={o.url} bust={bust} />
        ))}

        {/* Optional animated Gulf loop (heavy — load on tap) */}
        <div
          style={{
            background: "#111827",
            border: "1px solid #1e2a44",
            borderRadius: 14,
            overflow: "hidden",
          }}>
          <div style={{ padding: "11px 14px 4px" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Gulf Satellite — Loop</div>
            <div style={{ fontSize: 12, color: "#8892b0", marginTop: 2 }}>
              Animated GOES-East loop (large file)
            </div>
          </div>
          {showLoop ? (
            <img
              src={`https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ga/GEOCOLOR/GOES19-GA-GEOCOLOR-1000x1000.gif?t=${bust}`}
              alt="Gulf satellite loop"
              style={{ display: "block", width: "100%", height: "auto", background: "#0b0f19" }}
            />
          ) : (
            <button
              onClick={() => setShowLoop(true)}
              style={{
                width: "100%",
                padding: "22px 14px",
                background: "transparent",
                color: "#7aa2ff",
                border: "none",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}>
              ▶ Load animated loop
            </button>
          )}
        </div>

        <p style={{ fontSize: 11.5, color: "#5b6785", textAlign: "center", marginTop: 22 }}>
          Imagery © NOAA / National Hurricane Center. For official watches and warnings visit
          hurricanes.gov.
        </p>
      </main>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "#606a85",
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        margin: "20px 4px 12px",
      }}>
      {children}
    </div>
  );
}
