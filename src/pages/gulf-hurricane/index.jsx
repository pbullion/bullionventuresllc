import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import {
  CLASS_LABEL,
  category,
  chanceColor,
  classColor,
  compass,
  disturbanceTitle,
  houstonPhrase,
  houstonScore,
  inHours,
  ktToMph,
  miles,
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

/* Radar under the cone — the one thing on this page that is a picture of the
 * weather rather than a picture of the forecast. Asked for on 2026-08-31 with a
 * weather.com radar screenshot; see the header comment in RadarMap.jsx for how
 * it differs from the Houston-anchored map removed earlier the same day.
 *
 * LAZY, and it has to stay that way. It pulls in leaflet, which is ~150 KB and
 * has no business in the bundle a visitor to the home page downloads. Same shape
 * as /drive's Radar.jsx and /hrw's MapView.jsx. */
const RadarMap = lazy(() => import("./RadarMap.jsx"));


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

/* A figure that hides itself when its image 404s, and TELLS ITS PARENT it did.
 * Hiding alone is right for one missing graphic — NHC does not post all six for
 * every advisory — but when every one fails the section it lives in has to say
 * so rather than open onto an empty box. */
function Figure({ title, caption, url, bust, onFail, onLoaded }) {
  /* WHICH refresh this image failed on, not whether it has ever failed. A new
   * `bust` is a new src, so the failure simply stops applying and the <img>
   * mounts again — that is what makes a refresh a retry, and it is why a graphic
   * NHC posts an hour later turns up on its own. Storing a boolean instead meant
   * a figure that 404ed stayed hidden for the life of the card while the parent
   * forgot why, which is the empty box this whole change is about.
   *
   * Derived rather than synced in an effect: no cascading render, and no
   * react-hooks/set-state-in-effect error in a repo that keeps lint at zero. */
  const [failedAt, setFailedAt] = useState(null);
  const failed = failedAt === bust;
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
        onError={() => {
          setFailedAt(bust);
          if (onFail) onFail();
        }}
        onLoad={() => {
          if (onLoaded) onLoaded();
        }}
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

function StormCard({ storm, bust, defaultOpen = false }) {
  /* `null` means "nobody has touched this yet, follow the default", so the
   * nearest storm's graphics are open without a tap — and a storm that BECOMES
   * the nearest one later opens too, which a `useState(defaultOpen)` initial
   * value could not do for a card that was already mounted. Once the reader
   * toggles it their choice is absolute: a five-minute refresh must never
   * reopen a section they closed. */
  const [override, setOverride] = useState(null);
  const openGraphics = override ?? defaultOpen;
  const graphics = storm.graphics || [];

  /* Which of this storm's graphics came back 404. Some always will: peak_surge
   * exists only once a storm threatens the US coast, and key_messages waits on
   * NHC issuing one, so a hidden figure is normal. All of them failing is not —
   * that is a disclosure that opens onto nothing and reads as a broken button,
   * which is exactly how a wrong folder in the API went unnoticed.
   *
   * Cleared on refresh, and that only tells the truth because Figure clears its
   * own failure on the same `bust` and re-requests the image. Clearing this set
   * alone would drop the explanation while every graphic stayed hidden — an
   * empty box again, five minutes later. */
  const [failedGraphics, setFailedGraphics] = useState(() => ({ bust, keys: new Set() }));
  // Failures belong to the refresh that produced them, so a new bust discards
  // them without an effect — the same derivation Figure uses, kept in step with
  // it on purpose. A key is also dropped when its image later loads: collapsing
  // and reopening the section remounts every Figure, so a graphic NHC posted in
  // the meantime can come back 200 with no refresh at all, and the card must not
  // keep insisting nothing was posted while it sits visible above the sentence.
  const failedCount = failedGraphics.bust === bust ? failedGraphics.keys.size : 0;
  const markGraphic = (key, failed) =>
    setFailedGraphics((prev) => {
      const stale = prev.bust !== bust;
      if (!stale && prev.keys.has(key) === failed) return prev;
      const keys = stale ? new Set() : new Set(prev.keys);
      if (failed) keys.add(key);
      else keys.delete(key);
      return { bust, keys };
    });
  const allGraphicsFailed = graphics.length > 0 && failedCount >= graphics.length;
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

      {/* The NOAA graphics are what this page is for, and also the heaviest
          thing on it — six full-width PNGs per storm. So the nearest storm's
          set opens itself (`defaultOpen`) and every other storm costs a tap,
          which keeps a quiet day with four active systems from being a
          multi-megabyte download nobody asked for. */}
      {graphics.length ? (
        <div style={{ borderTop: "1px solid #1e2a44" }}>
          <button
            onClick={() => setOverride(!openGraphics)}
            aria-expanded={openGraphics}
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
              {graphics.map((g) => (
                <Figure
                  key={g.key}
                  title={g.title}
                  url={g.url}
                  bust={bust}
                  onFail={() => markGraphic(g.key, true)}
                  onLoaded={() => markGraphic(g.key, false)}
                />
              ))}
              {allGraphicsFailed ? (
                <div
                  role="status"
                  style={{
                    margin: "0 0 12px",
                    padding: "13px 14px",
                    background: "#111827",
                    border: "1px solid #1e2a44",
                    borderRadius: 14,
                    color: "#8892b0",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}>
                  NHC has not posted graphics for advisory {storm.advNum || "this advisory"} yet.
                  {storm.graphicsPageUrl ? (
                    <>
                      {" "}
                      <a
                        href={storm.graphicsPageUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#7aa2ff", fontWeight: 600 }}>
                        Check the storm&apos;s page on nhc.noaa.gov
                      </a>
                      .
                    </>
                  ) : null}
                </div>
              ) : null}
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
    /* Deliberately NOT setStatus("loading") here. "loading" is not "error", and
     * an empty storm list with no error reads as calm — so re-entering it on the
     * five-minute interval put the green all-clear back on screen for the length
     * of every retry of an ongoing outage, and for as long as a bad connection
     * kept the fetch open. A refresh keeps the last answer up until it has a new
     * one; "loading" now means only "has never answered". */
    try {
      const res = await fetch(`${STORMS_API}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      /* The route answers HTTP 200 with {error, storms: [], disturbances: []}
       * when an upstream product is unreachable — deliberately, so this page can
       * fall back to the static outlooks. Reading only res.ok turned that into
       * "✓ No named storms and no formation areas. All quiet in the Atlantic &
       * Gulf.", which is the one answer this page must never give when it does
       * not actually know. */
      if (data.error) throw new Error(String(data.error));
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

  /* The nearest storm to Houston, which is the one card that opens its graphics
   * on its own. Storms only: a disturbance can easily be closer, but NHC
   * publishes no cone, no surge and no wind-arrival graphic for a system it has
   * not designated, so there would be nothing to open. Ranked by the same
   * backend-computed distance the cards print, so the card that opens is always
   * the card showing the smallest number. */
  const closestStormId = useMemo(() => {
    const nearest = [...storms].sort((a, b) => houstonScore(a) - houstonScore(b))[0];
    return nearest ? nearest.id : null;
  }, [storms]);
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
        ) : status === "loading" ? (
          /* Before the first answer arrives, say so. The "no named storms" panel
           * below is gated on the feed having actually answered for the same
           * reason: an empty list is only calm once it is known to be empty. */
          <div
            style={{
              margin: "4px 0 16px",
              padding: "18px 16px",
              background: "#0d1526",
              border: "1px solid #1e2a44",
              borderRadius: 14,
              color: "#8892b0",
              fontSize: 14,
              fontWeight: 600,
            }}>
            Checking the latest advisories…
          </div>
        ) : null}

        {/* The map leads, because "is it raining on it yet, and is it pointed at
            me" is one question and this is the only thing on the page that can
            answer it. The cards and the NHC graphics still follow it unchanged —
            they are what the map is read against. */}
        <SectionLabel>Radar &amp; Track</SectionLabel>
        <Suspense
          fallback={
            <div
              style={{
                height: 360,
                background: "#111827",
                border: "1px solid #1e2a44",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8892b0",
                fontSize: 13,
              }}>
              Loading map…
            </div>
          }>
          <RadarMap storms={storms} disturbances={disturbances} />
        </Suspense>

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
              <StormCard
                key={s.id}
                storm={s}
                bust={bust}
                defaultOpen={s.id === closestStormId}
              />
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
