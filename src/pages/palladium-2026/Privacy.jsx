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
  subTitle: { fontSize: 17, fontWeight: 600, color: "#ffffff", marginTop: 24, marginBottom: 8 },
  body: { fontSize: 15, color: "#a0a0b8", lineHeight: 1.75, margin: "0 0 12px" },
  list: { paddingLeft: 20, margin: "8px 0 16px" },
  listItem: { fontSize: 15, color: "#a0a0b8", lineHeight: 1.75, marginBottom: 6 },
  divider: { border: "none", borderTop: "1px solid #1e3a4a", margin: "40px 0 0" },
  contactBox: {
    background: "#0d1f2d",
    border: "1px solid #1e3a4a",
    borderRadius: 12,
    padding: "20px 24px",
    marginTop: 16,
  },
  emailLink: { color: "#0096C7", textDecoration: "none", fontWeight: 600 },
  backLink: { display: "inline-block", marginTop: 40, fontSize: 14, color: "#0096C7", fontWeight: 500 },
};

export default function Palladium2026Privacy() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🔒</span>
        <h1 style={styles.headerTitle}>Privacy Policy</h1>
        <p style={styles.headerMeta}>Palladium 2026 · Last Updated: May 19, 2026</p>
      </div>

      <div style={styles.content}>
        <p style={styles.body}>
          Palladium 2026 ("we," "us," "our") is a personal trip-companion app for iOS. This Privacy Policy describes what
          information we collect, how we use it, and your rights. By using Palladium 2026, you agree to the practices
          described in this policy.
        </p>

        <div style={styles.sectionTitle}>1. Information We Collect</div>

        <div style={styles.subTitle}>Trip Configuration</div>
        <p style={styles.body}>
          When you set up the app, you may enter a party name and trip dates. This information is stored{" "}
          <strong style={{ color: "#f0f0f5" }}>entirely on your device</strong> using your phone's local storage
          (AsyncStorage). It is never transmitted to any server.
        </p>

        <div style={styles.subTitle}>Family Selection</div>
        <p style={styles.body}>
          If you unlock the personalized mode, your family selection is saved locally on your device. This data never leaves
          your phone.
        </p>

        <div style={styles.subTitle}>No Account Required</div>
        <p style={styles.body}>
          Palladium 2026 does not require you to create an account, sign in, or provide any personal information. There is no
          registration, no login, and no user profile stored on any server.
        </p>

        <div style={styles.subTitle}>Notification Permissions</div>
        <p style={styles.body}>
          The app may request permission to set a badge count on the app icon to show the number of days until your trip.
          This is done entirely on-device. No notification data is sent to any server.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>2. How We Use Your Information</div>
        <p style={styles.body}>
          All data entered in the app (party name, trip dates, family selection) is used solely to personalize the in-app
          experience — such as displaying a countdown to your trip and showing relevant resort information. This data is
          never used for advertising, analytics, or any other purpose.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>3. Data Sharing</div>
        <p style={styles.body}>
          We do not collect, store, or share any personal information. Because all data is stored locally on your device,
          there is nothing for us to share with third parties.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>4. Third-Party Services</div>
        <p style={styles.body}>
          Palladium 2026 does not integrate with any third-party analytics, advertising, or data collection services. The app
          does not make any network requests on your behalf.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>5. Children's Privacy</div>
        <p style={styles.body}>
          Palladium 2026 is a family travel companion app intended for general audiences. We do not knowingly collect any
          personal information from children under 13. Since no personal information is collected from any user, this app
          complies with COPPA and similar regulations by design.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>6. Data Retention &amp; Deletion</div>
        <p style={styles.body}>
          All data is stored only on your device. You can delete all app data at any time by uninstalling the app. The "Edit
          Trip Details" button in the app also resets all stored preferences.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>7. Changes to This Policy</div>
        <p style={styles.body}>
          We may update this Privacy Policy from time to time. Changes will be reflected by updating the "Last Updated" date
          above. Continued use of the app after changes constitutes acceptance of the revised policy.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>8. Contact Us</div>
        <p style={styles.body}>If you have any questions about this Privacy Policy, please reach out:</p>
        <div style={styles.contactBox}>
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
