import React from "react";
import { Link } from "react-router-dom";

const ACCENT = "#D26050";

const features = [
  {
    emoji: "📸",
    title: "Capture Every Moment",
    desc: "Guests upload photos straight from their camera roll or snap new ones in-app. No sign-up required — just a wedding code.",
  },
  {
    emoji: "🖼️",
    title: "Shared Gallery",
    desc: "Every photo from every guest in one beautiful, scrollable gallery. Relive the day from everyone's perspective.",
  },
  {
    emoji: "🔑",
    title: "Private & Secure",
    desc: "Access is gated by a personal wedding code. Only invited guests can view or upload photos.",
  },
  {
    emoji: "👑",
    title: "Admin Controls",
    desc: "The couple or coordinator can hide any photo from the guest view with a simple long-press.",
  },
  {
    emoji: "📤",
    title: "Bulk Upload",
    desc: "Select up to 30 photos at once. A real-time counter tracks your upload progress.",
  },
  {
    emoji: "💌",
    title: "Built for the Big Day",
    desc: "Simple enough for grandma, fast enough for the photographer. Everyone can participate.",
  },
];

const s = {
  page: {
    backgroundColor: "#fdf8f5",
    color: "#2c1810",
    minHeight: "100%",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    padding: "72px 24px 56px",
    textAlign: "center",
    background: `linear-gradient(160deg, #3d1a12 0%, #6b2a1f 40%, #D26050 100%)`,
    borderBottom: `1px solid #c45040`,
  },
  emoji: { fontSize: 64, display: "block", marginBottom: 20 },
  title: { fontSize: 52, fontWeight: 900, margin: "0 0 12px", color: "#ffffff", letterSpacing: "-1px" },
  tagline: { fontSize: 20, color: "rgba(255,255,255,0.75)", margin: "0 0 32px" },
  badgeRow: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 },
  badge: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: "6px 16px",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  ctaBtn: {
    display: "inline-block",
    background: "#ffffff",
    color: ACCENT,
    padding: "16px 40px",
    borderRadius: 14,
    fontWeight: 800,
    fontSize: 17,
    textDecoration: "none",
    boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
  },
  content: { maxWidth: 880, margin: "0 auto", padding: "64px 24px 80px" },
  subNav: { display: "flex", gap: 12, marginBottom: 56, flexWrap: "wrap" },
  subNavLink: {
    padding: "8px 18px",
    backgroundColor: "#fff",
    border: `1px solid #e8d5d0`,
    borderRadius: 8,
    fontSize: 13,
    color: "#7a4030",
    fontWeight: 500,
    textDecoration: "none",
  },
  sectionTitle: { fontSize: 28, fontWeight: 800, color: "#2c1810", marginBottom: 32, textAlign: "center" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20, marginBottom: 64 },
  card: {
    background: "#ffffff",
    border: "1px solid #e8d5d0",
    borderRadius: 16,
    padding: "24px 20px",
    boxShadow: "0 2px 12px rgba(210,96,80,0.06)",
  },
  cardEmoji: { fontSize: 32, marginBottom: 12, display: "block" },
  cardTitle: { fontSize: 17, fontWeight: 700, color: "#2c1810", marginBottom: 8 },
  cardDesc: { fontSize: 14, color: "#7a6060", lineHeight: 1.65, margin: 0 },
  howCard: {
    background: "#ffffff",
    border: `1px solid ${ACCENT}44`,
    borderRadius: 20,
    padding: "32px",
    marginBottom: 64,
    boxShadow: "0 2px 16px rgba(210,96,80,0.08)",
  },
  stepList: { listStyle: "none", padding: 0, margin: 0 },
  stepItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    padding: "16px 0",
    borderBottom: "1px solid #f0e0da",
  },
  stepNum: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: ACCENT,
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontSize: 15, color: "#5a3828", lineHeight: 1.6 },
  footer: { textAlign: "center", padding: "32px 24px", borderTop: "1px solid #e8d5d0", color: "#a08070", fontSize: 13 },
  footerLinks: { display: "flex", gap: 20, justifyContent: "center", marginTop: 12, flexWrap: "wrap" },
  footerLink: { color: ACCENT, textDecoration: "none", fontSize: 13 },
};

const steps = [
  { text: "Download Wedding Photos from the App Store." },
  { text: "Enter the wedding code you received from the couple or coordinator." },
  { text: "Browse the shared gallery — every photo uploaded by every guest in one place." },
  { text: "Tap the upload button to add your own photos from your camera roll or take new ones." },
  { text: "That's it! Your photos are instantly visible to everyone with the same code." },
];

export default function WeddingPhotosHome() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.emoji}>💍</span>
        <h1 style={s.title}>Wedding Photos</h1>
        <p style={s.tagline}>Private photo sharing for your special day</p>
        <div style={s.badgeRow}>
          <span style={s.badge}>📱 iOS</span>
          <span style={s.badge}>🆓 Free</span>
          <span style={s.badge}>🔒 Private</span>
          <span style={s.badge}>👑 Admin Controls</span>
        </div>
        <a
          href="https://apps.apple.com/app/wedding-photos/id6746476108"
          style={s.ctaBtn}
        >
          Download on the App Store
        </a>
      </div>

      <div style={s.content}>
        <div style={s.subNav}>
          <Link to="/wedding-photos/support" style={s.subNavLink}>💬 Support</Link>
          <Link to="/wedding-photos/privacy" style={s.subNavLink}>🔒 Privacy Policy</Link>
        </div>

        <h2 style={s.sectionTitle}>Everything You Need for the Big Day</h2>
        <div style={s.grid}>
          {features.map((f) => (
            <div key={f.title} style={s.card}>
              <span style={s.cardEmoji}>{f.emoji}</span>
              <div style={s.cardTitle}>{f.title}</div>
              <p style={s.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div style={s.howCard}>
          <h2 style={{ ...s.sectionTitle, marginBottom: 24 }}>How It Works</h2>
          <ol style={s.stepList}>
            {steps.map((step, i) => (
              <li key={i} style={{ ...s.stepItem, ...(i === steps.length - 1 ? { borderBottom: "none" } : {}) }}>
                <div style={s.stepNum}>{i + 1}</div>
                <p style={{ ...s.stepText, margin: 0 }}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div style={s.footer}>
        <div>© 2026 Bullion Ventures LLC · Wedding Photos</div>
        <div style={s.footerLinks}>
          <Link to="/wedding-photos/privacy" style={s.footerLink}>Privacy Policy</Link>
          <Link to="/wedding-photos/support" style={s.footerLink}>Support</Link>
          <Link to="/" style={s.footerLink}>All Apps</Link>
        </div>
      </div>
    </div>
  );
}
