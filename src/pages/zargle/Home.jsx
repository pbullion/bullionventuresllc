import { Link } from "react-router-dom";

const ACCENT = "#E63946";
const GOLD = "#F4A261";

const features = [
  {
    emoji: "🎲",
    title: "Classic Farkle Rules",
    desc: "The dice game you know and love — singles, triples, straights, hot dice, and the dreaded Farkle.",
  },
  {
    emoji: "📱",
    title: "Play Asynchronously",
    desc: "Take your turn whenever you want. Push notifications let you know the moment it's your move.",
  },
  {
    emoji: "👥",
    title: "Invite Anyone",
    desc: "Challenge friends or search for any Zargle player by username. Games support 2–8 players.",
  },
  {
    emoji: "🏆",
    title: "First to 10,000 Wins",
    desc: "Race to 10,000 points — but once someone hits it, every other player gets one final turn to beat them.",
  },
  { emoji: "🔥", title: "Hot Dice", desc: "Score all 6 dice and roll them all again. Keep building that monster turn." },
  {
    emoji: "💀",
    title: "Farkle Risk",
    desc: "Roll nothing scoreable and lose your entire banked turn score. Every roll is a gamble.",
  },
];

const s = {
  page: {
    backgroundColor: "#0f0f12",
    color: "#f0f0f5",
    minHeight: "100%",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    padding: "72px 24px 56px",
    textAlign: "center",
    background: "linear-gradient(160deg, #1a0a0e 0%, #1a1a2e 50%, #0f0f12 100%)",
    borderBottom: "1px solid #2a2a45",
  },
  emoji: { fontSize: 64, display: "block", marginBottom: 20 },
  title: { fontSize: 52, fontWeight: 900, margin: "0 0 12px", color: "#ffffff", letterSpacing: "-1px" },
  tagline: { fontSize: 20, color: "#a0a0b8", margin: "0 0 32px" },
  badgeRow: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 },
  badge: {
    background: "#1a1a2e",
    border: "1px solid #2a2a45",
    borderRadius: 20,
    padding: "6px 16px",
    fontSize: 13,
    color: "#a0a0b8",
  },
  ctaBtn: {
    display: "inline-block",
    background: ACCENT,
    color: "#fff",
    padding: "16px 40px",
    borderRadius: 14,
    fontWeight: 800,
    fontSize: 17,
    textDecoration: "none",
    boxShadow: `0 6px 24px ${ACCENT}55`,
  },
  content: { maxWidth: 880, margin: "0 auto", padding: "64px 24px 80px" },
  subNav: { display: "flex", gap: 12, marginBottom: 56, flexWrap: "wrap" },
  subNavLink: {
    padding: "8px 18px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #2a2a45",
    borderRadius: 8,
    fontSize: 13,
    color: "#a0a0b8",
    fontWeight: 500,
  },
  sectionTitle: { fontSize: 28, fontWeight: 800, color: "#ffffff", marginBottom: 32, textAlign: "center" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20, marginBottom: 64 },
  card: { background: "#1a1a2e", border: "1px solid #2a2a45", borderRadius: 16, padding: "24px 20px" },
  cardEmoji: { fontSize: 32, marginBottom: 12, display: "block" },
  cardTitle: { fontSize: 17, fontWeight: 700, color: "#ffffff", marginBottom: 8 },
  cardDesc: { fontSize: 14, color: "#a0a0b8", lineHeight: 1.65, margin: 0 },
  rulesCard: { background: "#1a1a2e", border: `1px solid ${ACCENT}44`, borderRadius: 20, padding: "32px", marginBottom: 64 },
  ruleTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "#ffffff",
    marginBottom: 24,
    paddingBottom: 12,
    borderBottom: "1px solid #2a2a45",
  },
  ruleGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" },
  ruleRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e1e3a" },
  ruleLabel: { fontSize: 14, color: "#a0a0b8" },
  ruleValue: { fontSize: 14, color: GOLD, fontWeight: 700 },
  footer: { textAlign: "center", padding: "32px 24px", borderTop: "1px solid #2a2a45", color: "#606080", fontSize: 13 },
  footerLinks: { display: "flex", gap: 20, justifyContent: "center", marginTop: 12, flexWrap: "wrap" },
  footerLink: { color: ACCENT, textDecoration: "none", fontSize: 13 },
};

const RULES = [
  ["Single 1", "100 pts"],
  ["Single 5", "50 pts"],
  ["Three of a kind", "face × 100"],
  ["Three 1s", "1,000 pts"],
  ["Four of a kind", "2× three-kind"],
  ["Five of a kind", "3× three-kind"],
  ["Six of a kind", "4× three-kind"],
  ["Straight (1–6)", "1,500 pts"],
  ["Three pairs", "1,500 pts"],
  ["Two triplets", "2,500 pts"],
  ["🔥 Hot dice", "roll all 6 again"],
  ["💀 Farkle", "lose turn score"],
];

export default function ZargleHome() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.emoji}>🎲</span>
        <h1 style={s.title}>Zargle</h1>
        <p style={s.tagline}>Multiplayer Farkle — Roll. Risk. Win.</p>
        <div style={s.badgeRow}>
          <span style={s.badge}>iOS</span>
          <span style={s.badge}>Turn-Based</span>
          <span style={s.badge}>2–8 Players</span>
          <span style={s.badge}>Free</span>
        </div>
        <a href="https://apps.apple.com/us/app/zargle/id6769046324" style={s.ctaBtn}>
          Download on the App Store
        </a>
      </div>

      <div style={s.content}>
        <div style={s.subNav}>
          <Link to="/zargle/support" style={s.subNavLink}>
            Support
          </Link>
          <Link to="/zargle/privacy" style={s.subNavLink}>
            Privacy Policy
          </Link>
          <Link to="/zargle/terms" style={s.subNavLink}>
            Terms of Use
          </Link>
        </div>

        <div style={s.sectionTitle}>How It Works</div>
        <div style={s.grid}>
          {features.map((f) => (
            <div key={f.title} style={s.card}>
              <span style={s.cardEmoji}>{f.emoji}</span>
              <div style={s.cardTitle}>{f.title}</div>
              <p style={s.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div style={s.rulesCard}>
          <div style={s.ruleTitle}>Scoring Quick Reference</div>
          <div style={s.ruleGrid}>
            {RULES.map(([label, value]) => (
              <div key={label} style={s.ruleRow}>
                <span style={s.ruleLabel}>{label}</span>
                <span style={s.ruleValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "0 0 20px" }}>
          <p style={{ fontSize: 15, color: "#a0a0b8", marginBottom: 24, lineHeight: 1.7 }}>
            Zargle is free to download. Create an account, challenge your friends, and start rolling.
          </p>
          <a href="https://apps.apple.com/us/app/zargle/id6769046324" style={s.ctaBtn}>
            Get Zargle — Free
          </a>
        </div>
      </div>

      <div style={s.footer}>
        <div>© 2026 Bullion Ventures LLC</div>
        <div style={s.footerLinks}>
          <Link to="/zargle/privacy" style={s.footerLink}>
            Privacy Policy
          </Link>
          <Link to="/zargle/terms" style={s.footerLink}>
            Terms of Use
          </Link>
          <Link to="/zargle/support" style={s.footerLink}>
            Support
          </Link>
          <Link to="/" style={s.footerLink}>
            ← All Apps
          </Link>
        </div>
      </div>
    </div>
  );
}
