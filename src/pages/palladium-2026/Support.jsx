import React from "react";
import { Link } from "react-router-dom";

const styles = {
  page: {
    backgroundColor: "#0f0f12",
    color: "#f0f0f5",
    minHeight: "100%",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    padding: "48px 24px 32px",
    textAlign: "center",
    background: "linear-gradient(160deg, #005f8e 0%, #0f0f12 60%)",
    borderBottom: "1px solid #1e3a4a",
  },
  headerEmoji: { fontSize: 48, marginBottom: 16, display: "block" },
  headerTitle: { fontSize: 36, fontWeight: 800, margin: "0 0 10px", color: "#ffffff" },
  headerMeta: { fontSize: 14, color: "#7aaabb", margin: 0 },
  content: { maxWidth: 720, margin: "0 auto", padding: "48px 24px 64px" },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: "#0096C7", marginTop: 44, marginBottom: 12 },
  body: { fontSize: 15, color: "#a0a0b8", lineHeight: 1.75, margin: "0 0 12px" },
  list: { paddingLeft: 20, margin: "8px 0 16px" },
  listItem: { fontSize: 15, color: "#a0a0b8", lineHeight: 1.75, marginBottom: 6 },
  card: {
    background: "#0d1f2d",
    border: "1px solid #1e3a4a",
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 17, fontWeight: 700, color: "#ffffff", marginBottom: 8 },
  divider: { border: "none", borderTop: "1px solid #1e3a4a", margin: "40px 0 0" },
  emailLink: { color: "#0096C7", textDecoration: "none", fontWeight: 600 },
  backLink: { display: "inline-block", marginTop: 40, fontSize: 14, color: "#0096C7", fontWeight: 500 },
};

export default function Palladium2026Support() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🌴</span>
        <h1 style={styles.headerTitle}>Support</h1>
        <p style={styles.headerMeta}>Palladium 2026 · Grand Palladium Costa Mujeres Companion App</p>
      </div>

      <div style={styles.content}>
        <p style={styles.body}>
          Need help with Palladium 2026? Find answers to common questions below or reach out directly.
        </p>

        <div style={styles.sectionTitle}>Frequently Asked Questions</div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>How do I change my party name or trip dates?</div>
          <p style={{ ...styles.body, margin: 0 }}>
            On the Home screen, tap the "Edit Trip Details" button at the bottom. This will take you back to the setup screen
            where you can update your party name and dates.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>I entered the wrong family — how do I switch?</div>
          <p style={{ ...styles.body, margin: 0 }}>
            In the personalized mode, tap the small "change" link near your family name on the Home screen to go back to the
            family selection screen.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>The dining hours show the wrong open/closed status.</div>
          <p style={{ ...styles.body, margin: 0 }}>
            Open/closed status is calculated based on your device's local clock. Make sure your device's time zone is set
            correctly (or set to "Automatic"). The app uses Cancún local time (UTC−5) to determine status.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>The countdown isn't updating.</div>
          <p style={{ ...styles.body, margin: 0 }}>
            Try closing and reopening the app. The countdown updates every second while the Home screen is visible.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>How do I delete all my data?</div>
          <p style={{ ...styles.body, margin: 0 }}>
            All data is stored locally on your device. You can reset the app to its initial state by using the "Edit Trip
            Details" button and starting over, or by deleting and reinstalling the app.
          </p>
        </div>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>Contact Support</div>
        <p style={styles.body}>Still need help? Send us an email and we'll get back to you as soon as possible.</p>
        <div style={styles.card}>
          <p style={{ ...styles.body, margin: 0 }}>
            📧{" "}
            <a href="mailto:patrickbullion@gmail.com" style={styles.emailLink}>
              patrickbullion@gmail.com
            </a>
          </p>
        </div>

        <Link to="/palladium-2026" style={styles.backLink}>
          ← Back to Palladium 2026
        </Link>
      </div>
    </div>
  );
}
