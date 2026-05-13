import React from "react";
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

export default function ZargleTerms() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>📄</span>
        <h1 style={s.headerTitle}>Terms of Use</h1>
        <p style={s.headerMeta}>Zargle · Last Updated: May 13, 2026</p>
      </div>

      <div style={s.content}>
        <p style={s.body}>
          Welcome to Zargle. These Terms of Use ("Terms") govern your use of the Zargle mobile application ("App") provided
          by Bullion Ventures LLC ("we," "us," or "our"). By downloading or using the App, you agree to these Terms.
        </p>

        <div style={s.sectionTitle}>1. Eligibility</div>
        <p style={s.body}>
          You must be at least 13 years old to use Zargle. By using the App you represent that you meet this requirement. If
          you are under 18, you represent that a parent or guardian has reviewed and agreed to these Terms on your behalf.
        </p>

        <div style={s.sectionTitle}>2. Accounts</div>
        <div style={s.subTitle}>Registration</div>
        <p style={s.body}>
          You must create an account with a username and password to use Zargle. You are responsible for keeping your
          credentials confidential and for all activity under your account. Choose a username that does not impersonate
          another person or contain offensive content.
        </p>
        <div style={s.subTitle}>Account Security</div>
        <p style={s.body}>
          You agree to notify us immediately at zargle@bullionventuresllc.com if you suspect unauthorized access to your
          account. We are not liable for losses resulting from unauthorized use of your credentials.
        </p>
        <div style={s.subTitle}>Account Deletion</div>
        <p style={s.body}>
          You may delete your account at any time from within the App. Deletion is permanent and irreversible.
        </p>

        <div style={s.sectionTitle}>3. Acceptable Use</div>
        <p style={s.body}>You agree not to:</p>
        <ul style={s.list}>
          <li style={s.listItem}>Use the App for any unlawful purpose</li>
          <li style={s.listItem}>Cheat, exploit bugs, or use automated tools to gain an unfair advantage</li>
          <li style={s.listItem}>Harass, threaten, or abuse other players</li>
          <li style={s.listItem}>Create fake accounts or impersonate other users</li>
          <li style={s.listItem}>Attempt to reverse-engineer, decompile, or tamper with the App or backend</li>
          <li style={s.listItem}>Interfere with the normal operation of the service</li>
        </ul>
        <p style={s.body}>
          We reserve the right to suspend or terminate any account that violates these rules, at our sole discretion, with or
          without notice.
        </p>

        <div style={s.sectionTitle}>4. Intellectual Property</div>
        <p style={s.body}>
          The Zargle name, logo, app design, game mechanics implementation, and all related content are the property of
          Bullion Ventures LLC. You are granted a limited, non-exclusive, non-transferable license to use the App for
          personal, non-commercial purposes. You may not copy, modify, distribute, sell, or sublicense any part of the App.
        </p>

        <div style={s.sectionTitle}>5. Disclaimer of Warranties</div>
        <p style={s.body}>
          Zargle is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant
          that the App will be uninterrupted, error-free, or free of viruses or other harmful components. Your use of the App
          is at your sole risk.
        </p>

        <div style={s.sectionTitle}>6. Limitation of Liability</div>
        <p style={s.body}>
          To the fullest extent permitted by law, Bullion Ventures LLC shall not be liable for any indirect, incidental,
          special, consequential, or punitive damages arising from your use of Zargle, including but not limited to loss of
          data or loss of gameplay progress. Our total liability to you shall not exceed the amounts you paid us in the
          twelve months prior to the claim (which, since the App is currently free, is zero).
        </p>

        <div style={s.sectionTitle}>7. Changes to These Terms</div>
        <p style={s.body}>
          We may update these Terms from time to time. We will update the "Last Updated" date above. Continued use of Zargle
          after changes are posted constitutes your acceptance of the revised Terms.
        </p>

        <div style={s.sectionTitle}>8. Governing Law</div>
        <p style={s.body}>
          These Terms are governed by the laws of the State of Texas, United States, without regard to its conflict of law
          provisions.
        </p>

        <div style={s.sectionTitle}>9. Contact</div>
        <div style={s.contactBox}>
          <p style={{ ...s.body, margin: "0 0 8px" }}>Questions about these Terms? Contact us at:</p>
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
