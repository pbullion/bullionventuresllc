import React from "react";
import { Link } from "react-router-dom";

const APP_STORE_URL = "https://apps.apple.com/us/app/slumbr-baby/id6764625978";

export default function SlumbrHome() {
  return (
    <div style={{ backgroundColor: "#0A0A0F", color: "#f0f0f5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <img
          src="/images/slumbr/fbcoverphoto.png"
          alt="slumbr — Baby monitoring. Simpler. Smarter."
          style={{ width: "100%", display: "block", maxHeight: 520, objectFit: "cover", objectPosition: "center" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(10,10,15,0.15) 0%, rgba(10,10,15,0.85) 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 24px 48px",
            textAlign: "center",
          }}>
          <h1
            style={{
              fontSize: "clamp(40px, 8vw, 72px)",
              fontWeight: 800,
              margin: "0 0 12px",
              letterSpacing: "-1px",
              color: "#fff",
            }}>
            slumbr
          </h1>
          <p style={{ fontSize: "clamp(16px, 3vw, 22px)", color: "#d4d0f5", margin: "0 0 28px", maxWidth: 560 }}>
            Turn your iPhone or iPad into a baby monitor.
          </p>
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
            <img
              src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
              alt="Download on the App Store"
              style={{ height: 52 }}
            />
          </a>
        </div>
      </div>

      {/* Sub-nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          padding: "20px 24px",
          borderBottom: "1px solid #1e1e2e",
          flexWrap: "wrap",
        }}>
        <Link
          to="/slumbr/privacy"
          style={{
            fontSize: 13,
            color: "#a0a0b8",
            padding: "6px 16px",
            border: "1px solid #2a2a45",
            borderRadius: 20,
            fontWeight: 500,
          }}>
          Privacy Policy
        </Link>
        <Link
          to="/slumbr/support"
          style={{
            fontSize: 13,
            color: "#a0a0b8",
            padding: "6px 16px",
            border: "1px solid #2a2a45",
            borderRadius: 20,
            fontWeight: 500,
          }}>
          Support
        </Link>
      </div>

      {/* Ad image */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "56px 24px 0" }}>
        <img
          src="/images/slumbr/ad1slumbr.png"
          alt="slumbr — Forgot the baby monitor?"
          style={{ width: "100%", borderRadius: 20, display: "block", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
        />
      </div>

      {/* How it works */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 24px" }}>
        <h2
          style={{
            fontSize: "clamp(24px, 4vw, 36px)",
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 12,
            color: "#fff",
          }}>
          How it works
        </h2>
        <p style={{ textAlign: "center", color: "#a0a0b8", fontSize: 17, marginBottom: 56, marginTop: 0 }}>
          Two phones. One baby monitor. Zero hardware needed.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 40 }}>
          {[
            {
              img: "/images/slumbr/1.png",
              step: "1",
              title: "Place a phone near the crib",
              desc: "Set one spare iPhone or iPad to Baby Mode. It streams live video and listens for sounds.",
            },
            {
              img: "/images/slumbr/2.png",
              step: "2",
              title: "Watch from anywhere",
              desc: "Your phone shows the live feed, noise alerts, and lets you play lullabies or talk back.",
            },
            {
              img: "/images/slumbr/3.png",
              step: "3",
              title: "Invite your family",
              desc: "Share a 6-digit code and your partner, grandparent, or nanny joins instantly.",
            },
          ].map(({ img, step, title, desc }) => (
            <div key={step} style={{ textAlign: "center" }}>
              <img
                src={img}
                alt={title}
                style={{
                  width: "100%",
                  maxWidth: 220,
                  borderRadius: 28,
                  display: "block",
                  margin: "0 auto 24px",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
                  border: "1px solid #2a2a45",
                }}
              />
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: "#6c63ff",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 10,
                  color: "#fff",
                }}>
                {step}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>{title}</h3>
              <p style={{ fontSize: 14, color: "#a0a0b8", lineHeight: 1.65, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* iPad showcase */}
      <div style={{ backgroundColor: "#0d0d18", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: 800,
              textAlign: "center",
              marginBottom: 12,
              color: "#fff",
            }}>
            Beautiful on iPad too
          </h2>
          <p style={{ textAlign: "center", color: "#a0a0b8", fontSize: 17, marginBottom: 48, marginTop: 0 }}>
            Use a spare iPad near the crib for a larger, clearer live view.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {["/images/slumbr/ipad1.png", "/images/slumbr/ipad2.png", "/images/slumbr/ipad3.png"].map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`slumbr on iPad ${i + 1}`}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  display: "block",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                  border: "1px solid #1e1e30",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Features grid */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px" }}>
        <h2
          style={{
            fontSize: "clamp(24px, 4vw, 36px)",
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 48,
            color: "#fff",
          }}>
          Everything you need. Nothing you don't.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            {
              icon: "📺",
              title: "Live Video",
              desc: "Real-time feed from baby's room to your phone, anywhere on your network.",
            },
            {
              icon: "🔔",
              title: "Noise Alerts",
              desc: "Instant push notifications when baby stirs. Adjustable sensitivity.",
            },
            {
              icon: "🎵",
              title: "Lullaby Player",
              desc: "13+ built-in lullabies. Play from your phone, right through the crib device.",
            },
            { icon: "🎙️", title: "Push to Talk", desc: "Speak directly into the baby's room without getting up." },
            {
              icon: "👨‍👩‍👧",
              title: "Family Sharing",
              desc: "Invite your partner, grandparent, or nanny with a simple 6-digit code.",
            },
            {
              icon: "🌙",
              title: "Dark Baby Screen",
              desc: "The crib device stays pitch black so it never disturbs your baby's sleep.",
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              style={{
                backgroundColor: "#111118",
                border: "1px solid #1e1e30",
                borderRadius: 16,
                padding: "24px 22px",
              }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#A78BFA", marginBottom: 8 }}>{title}</div>
              <p style={{ fontSize: 14, color: "#8a8aa8", lineHeight: 1.65, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a1040 0%, #0d0d18 100%)",
          borderTop: "1px solid #2a2a45",
          borderBottom: "1px solid #2a2a45",
          padding: "72px 24px",
          textAlign: "center",
        }}>
        <h2 style={{ fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 800, margin: "0 0 16px", color: "#fff" }}>
          Free on the App Store
        </h2>
        <p style={{ fontSize: 18, color: "#a0a0b8", margin: "0 auto 36px", maxWidth: 480 }}>
          No hardware. No subscription required. Just download and go.
        </p>
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
          <img
            src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
            alt="Download on the App Store"
            style={{ height: 56 }}
          />
        </a>
        <p style={{ fontSize: 12, color: "#4a4a6a", marginTop: 20 }}>Requires iOS 16 or later · iPhone & iPad</p>
      </div>

      {/* Footer nav */}
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
        <Link to="/" style={{ fontSize: 13, color: "#6c63ff", fontWeight: 500 }}>
          ← Back to Home
        </Link>
        <div style={{ display: "flex", gap: 20 }}>
          <Link to="/slumbr/privacy" style={{ fontSize: 13, color: "#4a4a6a" }}>
            Privacy Policy
          </Link>
          <Link to="/slumbr/support" style={{ fontSize: 13, color: "#4a4a6a" }}>
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
