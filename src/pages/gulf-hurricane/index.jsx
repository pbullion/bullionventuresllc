import React, { useEffect, useState } from "react";

// Always-latest NOAA / National Hurricane Center imagery.
// NHC Graphical Tropical Weather Outlook (GTWO) PNGs and NESDIS GOES-East
// GeoColor satellite sectors update automatically at their fixed URLs, so we
// just cache-bust on each refresh to force the freshest frame.
const IMAGES = [
  {
    title: "Tropical Outlook — 2 Day",
    caption: "NHC formation chances over the next 48 hours",
    url: "https://www.nhc.noaa.gov/xgtwo/two_atl_2d0.png",
  },
  {
    title: "Tropical Outlook — 7 Day",
    caption: "NHC formation chances over the next 7 days",
    url: "https://www.nhc.noaa.gov/xgtwo/two_atl_7d0.png",
  },
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

const GULF_LOOP =
  "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ga/GEOCOLOR/GOES19-GA-GEOCOLOR-1000x1000.gif";

export default function GulfHurricane() {
  const [bust, setBust] = useState(() => Date.now());
  const [showLoop, setShowLoop] = useState(false);

  // Refresh imagery every 5 minutes while the screen is open.
  useEffect(() => {
    const id = setInterval(() => setBust(Date.now()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const updated = new Date(bust).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        backgroundColor: "#0b0f19",
        color: "#eef2ff",
        minHeight: "100vh",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
      {/* Header */}
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
            Updated {updated} · auto-refresh 5 min
          </div>
        </div>
        <button
          onClick={() => setBust(Date.now())}
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

      {/* Images */}
      <main style={{ padding: "14px 12px 40px", maxWidth: 720, margin: "0 auto" }}>
        {IMAGES.map((img) => (
          <figure
            key={img.url}
            style={{
              margin: "0 0 18px",
              background: "#111827",
              border: "1px solid #1e2a44",
              borderRadius: 14,
              overflow: "hidden",
            }}>
            <figcaption style={{ padding: "12px 14px 4px" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{img.title}</div>
              <div style={{ fontSize: 12.5, color: "#8892b0", marginTop: 2 }}>
                {img.caption}
              </div>
            </figcaption>
            <img
              src={`${img.url}?t=${bust}`}
              alt={img.title}
              loading="lazy"
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                background: "#0b0f19",
              }}
            />
          </figure>
        ))}

        {/* Optional animated Gulf loop (heavy — load on tap) */}
        <div
          style={{
            background: "#111827",
            border: "1px solid #1e2a44",
            borderRadius: 14,
            overflow: "hidden",
          }}>
          <div style={{ padding: "12px 14px 4px" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Gulf Satellite — Loop</div>
            <div style={{ fontSize: 12.5, color: "#8892b0", marginTop: 2 }}>
              Animated GOES-East loop (large file)
            </div>
          </div>
          {showLoop ? (
            <img
              src={`${GULF_LOOP}?t=${bust}`}
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
          Imagery © NOAA / National Hurricane Center. For official watches and
          warnings visit hurricanes.gov.
        </p>
      </main>
    </div>
  );
}
