import { Link } from "react-router-dom";

const ACCENT = "#7b2cbf"; // grape — matches the Daycare Memory Vault brand
const DEEP = "#219ebc"; // teal accent

const SITE_URL = "https://daycarememoryvault.com";

const features = [
  {
    emoji: "📸",
    title: "Every Photo & Video",
    desc: "We collect every photo and video the daycare posted of your child to Procare over the date range you choose — nothing missed.",
  },
  {
    emoji: "🗓️",
    title: "Organized by Month",
    desc: "Memories are grouped month by month so you can watch your child grow, from their first days through today.",
  },
  {
    emoji: "🔎",
    title: "Filters & Search",
    desc: "Full Vault plan includes filtering by holidays and activities — Art & Crafts, Water Play, Birthdays, Story Time and more.",
  },
  {
    emoji: "🔒",
    title: "Private & Yours",
    desc: "A personal login just for your family. Your child's memories are gated behind your own username and password.",
  },
  {
    emoji: "📦",
    title: "Download Everything",
    desc: "Grab a zip of every photo and video — by month or all at once — so you have your own forever copy.",
  },
  {
    emoji: "💛",
    title: "Saved Forever",
    desc: "One-time service, kept for you. Relive daycare memories any time in one happy, kid-themed place.",
  },
];

const tiers = [
  {
    name: "Download Package",
    price: "$50",
    desc: "Every photo and video delivered as a downloadable zip file. Yours to keep forever.",
  },
  {
    name: "Full Vault Website",
    price: "$100",
    desc: "A private themed website with your child's memories — filters, captions, search, and a photo lightbox — plus downloads.",
    featured: true,
  },
];

const steps = [
  { text: "Choose your package and enter your child's name and your Procare login." },
  { text: "Pick the date range of memories you want saved." },
  { text: "Create your private vault login and complete checkout." },
  { text: "We collect every photo and video from Procare and set up your vault." },
  { text: "Sign in to browse and download — every daycare memory in one place." },
];

const s = {
  page: {
    backgroundColor: "#fff8ee",
    color: "#2b2d42",
    minHeight: "100%",
    fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    padding: "72px 24px 56px",
    textAlign: "center",
    background: `linear-gradient(160deg, #4a1a6b 0%, ${ACCENT} 55%, ${DEEP} 100%)`,
    borderBottom: `1px solid #6a25a8`,
  },
  emoji: { fontSize: 64, display: "block", marginBottom: 20 },
  title: { fontSize: 52, fontWeight: 900, margin: "0 0 12px", color: "#ffffff", letterSpacing: "-1px" },
  tagline: { fontSize: 20, color: "rgba(255,255,255,0.85)", margin: "0 0 32px" },
  badgeRow: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 },
  badge: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 20,
    padding: "6px 16px",
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
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
    border: `1px solid #ecdcf7`,
    borderRadius: 8,
    fontSize: 13,
    color: ACCENT,
    fontWeight: 500,
    textDecoration: "none",
  },
  sectionTitle: { fontSize: 28, fontWeight: 800, color: "#2b2d42", marginBottom: 32, textAlign: "center" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 20,
    marginBottom: 64,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #efe2d2",
    borderRadius: 16,
    padding: "24px 20px",
    boxShadow: "0 2px 12px rgba(123,44,191,0.06)",
  },
  cardEmoji: { fontSize: 32, marginBottom: 12, display: "block" },
  cardTitle: { fontSize: 17, fontWeight: 700, color: "#2b2d42", marginBottom: 8 },
  cardDesc: { fontSize: 14, color: "#7a6a70", lineHeight: 1.65, margin: 0 },
  tierGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 20,
    marginBottom: 64,
  },
  tierCard: {
    background: "#ffffff",
    borderRadius: 20,
    padding: "28px 24px",
    textAlign: "center",
    border: "2px solid #efe2d2",
  },
  tierCardFeatured: { border: `3px solid ${ACCENT}`, boxShadow: "0 4px 20px rgba(123,44,191,0.15)" },
  tierName: { fontSize: 18, fontWeight: 700, color: DEEP, marginBottom: 6 },
  tierPrice: { fontSize: 34, fontWeight: 900, color: ACCENT, marginBottom: 10 },
  tierDesc: { fontSize: 14, color: "#7a6a70", lineHeight: 1.6, margin: 0 },
  howCard: {
    background: "#ffffff",
    border: `1px solid ${ACCENT}44`,
    borderRadius: 20,
    padding: "32px",
    marginBottom: 64,
    boxShadow: "0 2px 16px rgba(123,44,191,0.08)",
  },
  stepList: { listStyle: "none", padding: 0, margin: 0 },
  stepItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    padding: "16px 0",
    borderBottom: "1px solid #f0e6da",
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
  stepText: { fontSize: 15, color: "#5a4858", lineHeight: 1.6 },
  ctaRow: { textAlign: "center", marginBottom: 24 },
  ctaBtnDark: {
    display: "inline-block",
    background: ACCENT,
    color: "#fff",
    padding: "16px 40px",
    borderRadius: 14,
    fontWeight: 800,
    fontSize: 17,
    textDecoration: "none",
    boxShadow: "0 6px 20px rgba(123,44,191,0.3)",
  },
  footer: {
    textAlign: "center",
    padding: "32px 24px",
    borderTop: "1px solid #efe2d2",
    color: "#a0908a",
    fontSize: 13,
  },
  footerLinks: { display: "flex", gap: 20, justifyContent: "center", marginTop: 12, flexWrap: "wrap" },
  footerLink: { color: ACCENT, textDecoration: "none", fontSize: 13 },
};

export default function DaycareMemoryVaultHome() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.emoji}>🧸</span>
        <h1 style={s.title}>Daycare Memory Vault</h1>
        <p style={s.tagline}>Every photo &amp; video from daycare, saved forever in one happy place</p>
        <div style={s.badgeRow}>
          <span style={s.badge}>📸 Photos &amp; Videos</span>
          <span style={s.badge}>🔒 Private</span>
          <span style={s.badge}>🗓️ By Month</span>
          <span style={s.badge}>💛 Yours Forever</span>
        </div>
        <a href={SITE_URL} style={s.ctaBtn} target="_blank" rel="noreferrer">
          Get Started
        </a>
      </div>

      <div style={s.content}>
        <div style={s.subNav}>
          <Link to="/daycare-memory-vault/support" style={s.subNavLink}>💬 Support</Link>
          <Link to="/daycare-memory-vault/privacy" style={s.subNavLink}>🔒 Privacy Policy</Link>
        </div>

        <h2 style={s.sectionTitle}>What You Get</h2>
        <div style={s.grid}>
          {features.map((f) => (
            <div key={f.title} style={s.card}>
              <span style={s.cardEmoji}>{f.emoji}</span>
              <div style={s.cardTitle}>{f.title}</div>
              <p style={s.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>

        <h2 style={s.sectionTitle}>Simple Pricing</h2>
        <div style={s.tierGrid}>
          {tiers.map((t) => (
            <div key={t.name} style={{ ...s.tierCard, ...(t.featured ? s.tierCardFeatured : {}) }}>
              <div style={s.tierName}>{t.name}</div>
              <div style={s.tierPrice}>{t.price}</div>
              <p style={s.tierDesc}>{t.desc}</p>
            </div>
          ))}
        </div>

        <div style={s.howCard}>
          <h2 style={{ ...s.sectionTitle, marginBottom: 24 }}>How It Works</h2>
          <ol style={s.stepList}>
            {steps.map((step, i) => (
              <li
                key={i}
                style={{ ...s.stepItem, ...(i === steps.length - 1 ? { borderBottom: "none" } : {}) }}
              >
                <div style={s.stepNum}>{i + 1}</div>
                <p style={{ ...s.stepText, margin: 0 }}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div style={s.ctaRow}>
          <a href={SITE_URL} style={s.ctaBtnDark} target="_blank" rel="noreferrer">
            Save Your Memories
          </a>
        </div>
      </div>

      <div style={s.footer}>
        <div>© 2026 Bullion Ventures LLC · Daycare Memory Vault</div>
        <div style={s.footerLinks}>
          <Link to="/daycare-memory-vault/privacy" style={s.footerLink}>Privacy Policy</Link>
          <Link to="/daycare-memory-vault/support" style={s.footerLink}>Support</Link>
          <Link to="/" style={s.footerLink}>All Apps</Link>
        </div>
      </div>
    </div>
  );
}
