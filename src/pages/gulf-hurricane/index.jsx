import React, { useCallback, useEffect, useState } from "react";

// Active-storm data comes from the Sheline backend, which proxies NHC's
// CurrentStorms.json (that feed has no CORS, so the browser can't read it
// directly). The storm graphic images themselves are loaded straight from
// nhc.noaa.gov via <img> — those allow cross-origin.
const STORMS_API = "https://sheline-art-website-api.herokuapp.com/nhc/current-storms";

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

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const compass = (deg) =>
  typeof deg === "number" ? COMPASS[Math.round(deg / 22.5) % 16] : null;
const ktToMph = (kt) => (typeof kt === "number" ? Math.round(kt * 1.15078) : null);

// Saffir-Simpson category from sustained wind in mph (hurricanes only).
function category(mph) {
  if (mph == null) return null;
  if (mph >= 157) return 5;
  if (mph >= 130) return 4;
  if (mph >= 111) return 3;
  if (mph >= 96) return 2;
  if (mph >= 74) return 1;
  return null;
}

const CLASS_LABEL = {
  TD: "Tropical Depression",
  TS: "Tropical Storm",
  HU: "Hurricane",
  STD: "Subtropical Depression",
  STS: "Subtropical Storm",
  PTC: "Potential Tropical Cyclone",
  RM: "Remnants",
};

function classColor(c, mph) {
  if (c === "HU") {
    const cat = category(mph);
    if (cat >= 4) return "#ef4444"; // red
    if (cat === 3) return "#f97316"; // orange
    return "#f59e0b"; // amber
  }
  if (c === "TS" || c === "STS") return "#38bdf8"; // blue
  if (c === "PTC") return "#a78bfa"; // purple
  return "#94a3b8"; // gray
}

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

function StormCard({ storm, bust }) {
  const mph = ktToMph(storm.intensityKt);
  const cat = storm.classification === "HU" ? category(mph) : null;
  const accent = classColor(storm.classification, mph);
  const label = CLASS_LABEL[storm.classification] || storm.classification;
  const dir = compass(storm.movementDir);
  const adv = storm.lastUpdate
    ? new Date(storm.lastUpdate).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <section
      style={{
        margin: "0 0 24px",
        border: `1px solid ${accent}55`,
        borderRadius: 16,
        background: "#0d1526",
        overflow: "hidden",
      }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #1e2a44" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{storm.name}</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#0b0f19",
              background: accent,
              padding: "3px 8px",
              borderRadius: 999,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}>
            {cat ? `Cat ${cat} Hurricane` : label}
          </span>
          {storm.inGulf ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#fde68a",
                background: "#78350f",
                padding: "3px 8px",
                borderRadius: 999,
              }}>
              IN THE GULF
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 13, color: "#a9b4cc", marginTop: 8, lineHeight: 1.6 }}>
          {mph != null ? <>Winds <b style={{ color: "#eef2ff" }}>{mph} mph</b></> : null}
          {storm.pressureMb ? <> · {storm.pressureMb} mb</> : null}
          {dir ? <> · Moving {dir}{storm.movementSpeed ? ` at ${storm.movementSpeed} mph` : ""}</> : null}
          {storm.latitude ? <> · {storm.latitude}, {storm.longitude}</> : null}
        </div>
        {adv ? (
          <div style={{ fontSize: 12, color: "#8892b0", marginTop: 6 }}>
            Advisory {storm.advNum || ""} · {adv}
            {storm.advisoryUrl ? (
              <>
                {" · "}
                <a href={storm.advisoryUrl} target="_blank" rel="noreferrer" style={{ color: "#7aa2ff" }}>
                  full advisory
                </a>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <div style={{ padding: "14px 12px 4px" }}>
        {(storm.graphics || []).map((g) => (
          // Upgrade any "_sm" thumbnail URL to the full-resolution graphic so it
          // stays crisp at full phone width (defensive — backend now emits
          // full-res too).
          <Figure key={g.key} title={g.title} url={g.url.replace("_sm+png/", "+png/")} bust={bust} />
        ))}
      </div>
    </section>
  );
}

export default function GulfHurricane() {
  const [bust, setBust] = useState(() => Date.now());
  const [storms, setStorms] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [showLoop, setShowLoop] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${STORMS_API}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStorms(Array.isArray(data.storms) ? data.storms : []);
      setStatus("ok");
    } catch (e) {
      setStorms([]);
      setStatus("error");
    }
    setBust(Date.now());
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(id);
  }, [load]);

  const updated = new Date(bust).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const gulfStorms = storms.filter((s) => s.inGulf);

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
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px" }}>🌀 Gulf Hurricane</div>
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
        {/* Active storms — the headline content */}
        {status === "ok" && storms.length > 0 ? (
          <>
            <SectionLabel>
              {gulfStorms.length > 0
                ? `${gulfStorms.length} system${gulfStorms.length > 1 ? "s" : ""} in the Gulf`
                : "Active Atlantic systems"}
            </SectionLabel>
            {storms.map((s) => (
              <StormCard key={s.id} storm={s} bust={bust} />
            ))}
          </>
        ) : null}

        {status === "ok" && storms.length === 0 ? (
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
            ✓ No active tropical cyclones. All quiet in the Atlantic &amp; Gulf.
          </div>
        ) : null}

        {status === "error" ? (
          <div
            style={{
              margin: "6px 0 22px",
              padding: "14px 16px",
              background: "#1a1120",
              border: "1px solid #4d1e2b",
              borderRadius: 14,
              color: "#fca5a5",
              fontSize: 13,
            }}>
            Couldn&apos;t reach the live storm feed right now — showing the tropical
            outlooks and satellite below. Tap Refresh to retry.
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
