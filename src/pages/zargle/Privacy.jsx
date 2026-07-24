import { Link } from "react-router-dom";

const ACCENT = "#E63946";

const s = {
  page: {
    backgroundColor: "#0f0f12",
    color: "#f0f0f5",
    minHeight: "100%",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    padding: "48px 24px 32px",
    textAlign: "center",
    background: "linear-gradient(160deg, #1a0a0e 0%, #1a1a2e 60%)",
    borderBottom: "1px solid #2a2a45",
  },
  headerEmoji: { fontSize: 48, marginBottom: 16, display: "block" },
  headerTitle: { fontSize: 36, fontWeight: 800, margin: "0 0 10px", color: "#ffffff" },
  headerMeta: { fontSize: 14, color: "#606080", margin: 0 },
  content: { maxWidth: 720, margin: "0 auto", padding: "48px 24px 64px" },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: ACCENT, marginTop: 44, marginBottom: 12 },
  subTitle: { fontSize: 17, fontWeight: 600, color: "#ffffff", marginTop: 24, marginBottom: 8 },
  body: { fontSize: 15, color: "#a0a0b8", lineHeight: 1.75, margin: "0 0 12px" },
  list: { paddingLeft: 20, margin: "8px 0 16px" },
  listItem: { fontSize: 15, color: "#a0a0b8", lineHeight: 1.75, marginBottom: 6 },
  divider: { border: "none", borderTop: "1px solid #2a2a45", margin: "40px 0 0" },
  contactBox: { background: "#1a1a2e", border: "1px solid #2a2a45", borderRadius: 12, padding: "20px 24px", marginTop: 16 },
  emailLink: { color: ACCENT, textDecoration: "none", fontWeight: 600 },
  backLink: { display: "inline-block", marginTop: 40, fontSize: 14, color: ACCENT, fontWeight: 500 },
  footer: { textAlign: "center", padding: "32px 24px", borderTop: "1px solid #2a2a45", color: "#606080", fontSize: 13 },
  footerLinks: { display: "flex", gap: 20, justifyContent: "center", marginTop: 12, flexWrap: "wrap" },
  footerLink: { color: ACCENT, textDecoration: "none", fontSize: 13 },
};

export default function ZarglePrivacy() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>🔒</span>
        <h1 style={s.headerTitle}>Privacy Policy</h1>
        <p style={s.headerMeta}>Zargle · Last Updated: May 13, 2026</p>
      </div>

      <div style={s.content}>
        <p style={s.body}>
          Zargle ("we," "us," "our") is a multiplayer mobile dice game for iOS developed by Bullion Ventures LLC. This
          Privacy Policy explains what information we collect, how we use it, and your rights. By using Zargle, you agree to
          the practices described here.
        </p>

        <div style={s.sectionTitle}>1. Information We Collect</div>

        <div style={s.subTitle}>Account Information</div>
        <p style={s.body}>
          Zargle uses a username and password authentication system. We collect and store your chosen username and a securely
          hashed version of your password (using bcrypt). We never store your plain-text password. We do not require or
          collect your real name, email address, or phone number.
        </p>

        <div style={s.subTitle}>Game Data</div>
        <p style={s.body}>
          We store the game state for all active and completed games, including dice roll history, turn scores, player
          scores, and game outcomes. This data is necessary to run the turn-based multiplayer experience.
        </p>

        <div style={s.subTitle}>Friends & Social</div>
        <p style={s.body}>
          We store friend connections you create within the app (friend requests, accepted friendships) in order to display
          your friend list and enable game invitations.
        </p>

        <div style={s.subTitle}>Push Notification Tokens</div>
        <p style={s.body}>
          We store the Expo push notification token for your device in order to notify you when it is your turn. This token
          may change when you reinstall the app or switch devices.
        </p>

        <div style={s.subTitle}>Usage Logs</div>
        <p style={s.body}>
          Our servers may automatically log standard technical information such as request timestamps, error codes, and
          anonymized usage metrics to maintain service reliability and diagnose issues.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>2. How We Use Your Information</div>
        <ul style={s.list}>
          <li style={s.listItem}>To authenticate you and maintain your account session</li>
          <li style={s.listItem}>To store and advance game state across all players</li>
          <li style={s.listItem}>To deliver push notifications when it is your turn</li>
          <li style={s.listItem}>To power the friends list and game invitation features</li>
          <li style={s.listItem}>To maintain and improve the reliability of the service</li>
          <li style={s.listItem}>To respond to support requests you send us</li>
        </ul>
        <p style={s.body}>
          We do not use your data for advertising and we do not build advertising profiles based on your usage.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>3. Data Sharing</div>
        <p style={s.body}>
          We do not sell, rent, or trade your personal information. We may share data only in the following limited
          circumstances:
        </p>
        <ul style={s.list}>
          <li style={s.listItem}>
            <strong style={{ color: "#c0c0d8" }}>Other Players:</strong> Your username and game scores are visible to players
            you are in a game with or are friends with. Your username is searchable by other Zargle users.
          </li>
          <li style={s.listItem}>
            <strong style={{ color: "#c0c0d8" }}>Expo (Push Notifications):</strong> We use Expo's push notification service
            to deliver turn alerts to your device. Your push token is shared with Expo solely for this purpose.
          </li>
          <li style={s.listItem}>
            <strong style={{ color: "#c0c0d8" }}>Heroku (Hosting):</strong> Our backend is hosted on Heroku. Your data
            resides on Heroku's infrastructure subject to their security practices.
          </li>
          <li style={s.listItem}>
            <strong style={{ color: "#c0c0d8" }}>Legal Requirements:</strong> We may disclose data if required by law or to
            protect our legal rights.
          </li>
        </ul>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>4. Data Retention & Deletion</div>
        <p style={s.body}>
          We retain your account and game data for as long as your account is active. You may delete your account at any time
          from within the Zargle app (Profile → Delete Account). Upon deletion, your account, username, friend connections,
          and game history are permanently removed from our systems.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>5. Children's Privacy</div>
        <p style={s.body}>
          Zargle is not directed at children under 13. We do not knowingly collect personal information from children under
          13. If you believe a child has provided us data, please contact us and we will delete it.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>6. Security</div>
        <p style={s.body}>
          We use industry-standard security measures including bcrypt password hashing, JWT-based authentication, and HTTPS
          for all network communication. No system is perfectly secure, but we take reasonable steps to protect your data.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>7. Changes to This Policy</div>
        <p style={s.body}>
          We may update this Privacy Policy from time to time. We will update the "Last Updated" date above. Continued use of
          Zargle after changes constitutes your acceptance of the updated policy.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>8. Contact Us</div>
        <div style={s.contactBox}>
          <p style={{ ...s.body, margin: "0 0 8px" }}>Questions about this policy? Contact us at:</p>
          <a href="mailto:zargle@bullionventuresllc.com" style={s.emailLink}>
            zargle@bullionventuresllc.com
          </a>
        </div>

        <Link to="/zargle" style={s.backLink}>
          ← Back to Zargle
        </Link>
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
