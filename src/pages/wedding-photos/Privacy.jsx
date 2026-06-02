import React from "react";
import { Link } from "react-router-dom";

const ACCENT = "#D26050";

const s = {
  page: {
    backgroundColor: "#fdf8f5",
    color: "#2c1810",
    minHeight: "100%",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    padding: "48px 24px 32px",
    textAlign: "center",
    background: `linear-gradient(160deg, #3d1a12 0%, #6b2a1f 60%)`,
    borderBottom: `1px solid #c45040`,
  },
  headerEmoji: { fontSize: 48, marginBottom: 16, display: "block" },
  headerTitle: { fontSize: 36, fontWeight: 800, margin: "0 0 10px", color: "#ffffff" },
  headerMeta: { fontSize: 14, color: "rgba(255,255,255,0.55)", margin: 0 },
  content: { maxWidth: 720, margin: "0 auto", padding: "48px 24px 64px" },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: ACCENT, marginTop: 44, marginBottom: 12 },
  subTitle: { fontSize: 17, fontWeight: 600, color: "#2c1810", marginTop: 24, marginBottom: 8 },
  body: { fontSize: 15, color: "#5a3828", lineHeight: 1.75, margin: "0 0 12px" },
  list: { paddingLeft: 20, margin: "8px 0 16px" },
  listItem: { fontSize: 15, color: "#5a3828", lineHeight: 1.75, marginBottom: 6 },
  divider: { border: "none", borderTop: "1px solid #e8d5d0", margin: "40px 0 0" },
  contactBox: {
    background: "#ffffff",
    border: "1px solid #e8d5d0",
    borderRadius: 12,
    padding: "20px 24px",
    marginTop: 16,
    boxShadow: "0 2px 8px rgba(210,96,80,0.06)",
  },
  emailLink: { color: ACCENT, textDecoration: "none", fontWeight: 600 },
  backLink: { display: "inline-block", marginTop: 40, fontSize: 14, color: ACCENT, fontWeight: 500, textDecoration: "none" },
  footer: { textAlign: "center", padding: "32px 24px", borderTop: "1px solid #e8d5d0", color: "#a08070", fontSize: 13 },
  footerLinks: { display: "flex", gap: 20, justifyContent: "center", marginTop: 12, flexWrap: "wrap" },
  footerLink: { color: ACCENT, textDecoration: "none", fontSize: 13 },
};

export default function WeddingPhotosPrivacy() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>🔒</span>
        <h1 style={s.headerTitle}>Privacy Policy</h1>
        <p style={s.headerMeta}>Wedding Photos · Last Updated: June 2, 2026</p>
      </div>

      <div style={s.content}>
        <p style={s.body}>
          Wedding Photos ("we," "us," "our") is a private photo-sharing app for iOS developed by Bullion Ventures LLC.
          This Privacy Policy explains what information we collect, how we use it, and your rights. By using Wedding Photos,
          you agree to the practices described here.
        </p>

        <div style={s.sectionTitle}>1. Information We Collect</div>

        <div style={s.subTitle}>Photos You Upload</div>
        <p style={s.body}>
          When you upload photos, those images are stored securely on Amazon Web Services (AWS S3) and are associated with
          the wedding code you used to access the app. Photos are accessible to all users who share the same wedding code.
        </p>

        <div style={s.subTitle}>Wedding Code</div>
        <p style={s.body}>
          Access to the app requires a wedding code provided by the couple or event coordinator. This code is stored locally
          on your device to keep you signed in. We do not collect your name, email address, phone number, or any other
          personally identifying information.
        </p>

        <div style={s.subTitle}>Device Information</div>
        <p style={s.body}>
          We do not collect any device identifiers, advertising IDs, or usage analytics. The app does not contain any
          third-party analytics or advertising SDKs.
        </p>

        <div style={s.sectionTitle}>2. How We Use Your Information</div>
        <p style={s.body}>Photos you upload are used solely to display them in the shared wedding gallery to other guests
          with the same wedding code. We do not use your photos for any other purpose, and we do not sell or share them
          with any third parties.</p>

        <div style={s.sectionTitle}>3. Photo Storage & Retention</div>
        <p style={s.body}>
          All uploaded photos are stored on AWS S3 in a private, access-controlled bucket. Photos are retained for the
          duration of the event and a reasonable period thereafter. If you would like your photos removed, please contact
          us using the information below.
        </p>

        <div style={s.sectionTitle}>4. Third-Party Services</div>
        <p style={s.body}>Wedding Photos uses the following third-party service:</p>
        <ul style={s.list}>
          <li style={s.listItem}>
            <strong>Amazon Web Services (AWS S3)</strong> — for secure photo storage.
            AWS's privacy policy can be found at{" "}
            <a href="https://aws.amazon.com/privacy/" style={s.emailLink} target="_blank" rel="noopener noreferrer">
              aws.amazon.com/privacy
            </a>.
          </li>
        </ul>

        <div style={s.sectionTitle}>5. Children's Privacy</div>
        <p style={s.body}>
          Wedding Photos is not directed at children under the age of 13. We do not knowingly collect personal information
          from children under 13. If you believe a child has submitted personal information through the app, please contact
          us and we will promptly remove it.
        </p>

        <div style={s.sectionTitle}>6. Changes to This Policy</div>
        <p style={s.body}>
          We may update this Privacy Policy from time to time. Any changes will be reflected by the "Last Updated" date
          at the top of this page. Continued use of the app after changes constitutes your acceptance of the updated policy.
        </p>

        <div style={s.sectionTitle}>7. Contact Us</div>
        <p style={s.body}>If you have any questions or requests regarding this Privacy Policy, please contact us:</p>
        <div style={s.contactBox}>
          <strong>Bullion Ventures LLC</strong><br />
          Email:{" "}
          <a href="mailto:patrickbullion@gmail.com" style={s.emailLink}>
            patrickbullion@gmail.com
          </a>
        </div>

        <hr style={s.divider} />
        <Link to="/wedding-photos" style={s.backLink}>← Back to Wedding Photos</Link>
      </div>

      <div style={s.footer}>
        <div>© 2026 Bullion Ventures LLC · Wedding Photos</div>
        <div style={s.footerLinks}>
          <Link to="/wedding-photos/support" style={s.footerLink}>Support</Link>
          <Link to="/" style={s.footerLink}>All Apps</Link>
        </div>
      </div>
    </div>
  );
}
