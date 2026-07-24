import { Link } from "react-router-dom";

const APP_STORE_URL = "https://apps.apple.com/us/app/palladium-2026/id6771041211";

const styles = {
  page: {
    backgroundColor: "#0f0f12",
    color: "#f0f0f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    minHeight: "100%",
  },
  header: {
    padding: "72px 24px 56px",
    textAlign: "center",
    background: "linear-gradient(160deg, #003d2e 0%, #0f0f12 65%)",
    borderBottom: "1px solid #1a3a2e",
  },
  emoji: { fontSize: 56, display: "block", marginBottom: 20 },
  title: { fontSize: 40, fontWeight: 800, margin: "0 0 12px", color: "#ffffff", letterSpacing: "-0.5px" },
  tagline: {
    fontSize: 18,
    color: "#7abfa0",
    margin: "0 0 32px",
    maxWidth: 480,
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: 1.6,
  },
  subNav: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  subNavLink: {
    fontSize: 13,
    color: "#a0a0b8",
    padding: "6px 16px",
    border: "1px solid #2a2a45",
    borderRadius: 20,
    fontWeight: 500,
    textDecoration: "none",
  },
  content: { maxWidth: 860, margin: "0 auto", padding: "64px 24px 80px" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#606080",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 28,
    textAlign: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 20,
    marginBottom: 56,
  },
  card: {
    background: "#1a1a2e",
    border: "1px solid #2a2a45",
    borderRadius: 16,
    padding: "24px 20px",
  },
  cardEmoji: { fontSize: 32, display: "block", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#ffffff", margin: "0 0 8px" },
  cardDesc: { fontSize: 14, color: "#a0a0b8", lineHeight: 1.65, margin: 0 },
};

const features = [
  {
    emoji: "✈️",
    title: "Flights",
    desc: "All three family flight itineraries in one place — departures, arrivals, and flight numbers.",
  },
  {
    emoji: "🏨",
    title: "Resort Info",
    desc: "Grand Palladium Costa Mujeres details, interactive resort map, and what's different for the Family Select side.",
  },
  {
    emoji: "🍽️",
    title: "Dining & Drinks",
    desc: "Browse all restaurants and bars at the resort with hours, cuisine type, and reservation tips.",
  },
  {
    emoji: "🌤️",
    title: "Cancún Weather",
    desc: "Live daily forecast for Cancún during the trip — highs, lows, and rain chances.",
  },
  {
    emoji: "👨‍👩‍👧‍👦",
    title: "Family Profiles",
    desc: "Select your family (Bullions, Angelles, or Hays) to get personalized info for your section of the resort.",
  },
  { emoji: "📅", title: "Countdown", desc: "See how many days until the trip right from the home screen." },
];

export default function Palladium2026Home() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.emoji}>🌴</span>
        <h1 style={styles.title}>Palladium 2026</h1>
        <p style={styles.tagline}>A private trip companion for our Cancún vacation at Grand Palladium Costa Mujeres.</p>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-block", marginBottom: 28 }}>
          <img
            src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
            alt="Download on the App Store"
            style={{ height: 44 }}
          />
        </a>
        <div style={styles.subNav}>
          <Link to="/palladium-2026/privacy" style={styles.subNavLink}>
            Privacy Policy
          </Link>
          <Link to="/palladium-2026/support" style={styles.subNavLink}>
            Support
          </Link>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.sectionLabel}>What's inside</div>
        <div style={styles.grid}>
          {features.map((f) => (
            <div key={f.title} style={styles.card}>
              <span style={styles.cardEmoji}>{f.emoji}</span>
              <h3 style={styles.cardTitle}>{f.title}</h3>
              <p style={styles.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
