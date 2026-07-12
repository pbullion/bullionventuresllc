import React from "react";
import { Link } from "react-router-dom";

const ACCENT = "#7b2cbf";

const s = {
  page: {
    backgroundColor: "#fff8ee",
    color: "#2b2d42",
    minHeight: "100%",
    fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    padding: "48px 24px 32px",
    textAlign: "center",
    background: `linear-gradient(160deg, #4a1a6b 0%, ${ACCENT} 60%)`,
    borderBottom: `1px solid #6a25a8`,
  },
  headerEmoji: { fontSize: 48, marginBottom: 16, display: "block" },
  headerTitle: { fontSize: 36, fontWeight: 800, margin: "0 0 10px", color: "#ffffff" },
  headerMeta: { fontSize: 14, color: "rgba(255,255,255,0.6)", margin: 0 },
  content: { maxWidth: 720, margin: "0 auto", padding: "48px 24px 64px" },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: ACCENT, marginTop: 44, marginBottom: 12 },
  subTitle: { fontSize: 17, fontWeight: 600, color: "#2b2d42", marginTop: 24, marginBottom: 8 },
  body: { fontSize: 15, color: "#5a4858", lineHeight: 1.75, margin: "0 0 12px" },
  list: { paddingLeft: 20, margin: "8px 0 16px" },
  listItem: { fontSize: 15, color: "#5a4858", lineHeight: 1.75, marginBottom: 6 },
  divider: { border: "none", borderTop: "1px solid #efe2d2", margin: "40px 0 0" },
  contactBox: {
    background: "#ffffff",
    border: "1px solid #efe2d2",
    borderRadius: 12,
    padding: "20px 24px",
    marginTop: 16,
    boxShadow: "0 2px 8px rgba(123,44,191,0.06)",
  },
  emailLink: { color: ACCENT, textDecoration: "none", fontWeight: 600 },
  backLink: {
    display: "inline-block",
    marginTop: 40,
    fontSize: 14,
    color: ACCENT,
    fontWeight: 500,
    textDecoration: "none",
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

export default function DaycareMemoryVaultPrivacy() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>🔒</span>
        <h1 style={s.headerTitle}>Privacy Policy</h1>
        <p style={s.headerMeta}>Daycare Memory Vault · Last Updated: July 12, 2026</p>
      </div>

      <div style={s.content}>
        <p style={s.body}>
          Daycare Memory Vault ("we," "us," "our") is a service by Bullion Ventures LLC that collects your
          child's photos and videos from Procare and saves them in a private vault for your family. This
          Privacy Policy explains what information we collect, how we use it, and your rights. By using the
          service, you agree to the practices described here.
        </p>

        <div style={s.sectionTitle}>1. Information We Collect</div>

        <div style={s.subTitle}>Your Procare Login</div>
        <p style={s.body}>
          To collect your child's photos and videos, we need the Procare username and password you provide at
          checkout. We use these credentials solely to log into Procare on your behalf and download your own
          child's media for the date range you select. We do not use them for any other purpose.
        </p>

        <div style={s.subTitle}>Photos &amp; Videos</div>
        <p style={s.body}>
          The photos and videos we collect from Procare are stored securely on Amazon Web Services (AWS S3) and
          are associated only with your order. They are accessible only through your private vault login (or, for
          the Download package, via a link we provide to you).
        </p>

        <div style={s.subTitle}>Account &amp; Contact Information</div>
        <p style={s.body}>
          We collect your child's name, the vault username and password you create, and optionally your email
          address so we can notify you when your vault is ready. Your vault password is stored in a hashed form
          and cannot be read by us.
        </p>

        <div style={s.subTitle}>Payment Information</div>
        <p style={s.body}>
          Payments are processed securely by Stripe. We never see or store your full card details — Stripe
          handles all payment data. See{" "}
          <a href="https://stripe.com/privacy" style={s.emailLink} target="_blank" rel="noopener noreferrer">
            stripe.com/privacy
          </a>{" "}
          for their practices.
        </p>

        <div style={s.sectionTitle}>2. How We Use Your Information</div>
        <p style={s.body}>
          We use your information solely to provide the service: to collect your child's media from Procare,
          store it securely, give you access to your vault, and contact you about your order. We do not sell or
          share your information or your child's media with any third parties for marketing.
        </p>

        <div style={s.sectionTitle}>3. Storage &amp; Retention</div>
        <p style={s.body}>
          Your child's photos and videos are stored on AWS S3 in an access-controlled location. Because this is
          a keepsake service, media is retained so you can access it long-term. If you would like your data or
          your child's media permanently deleted, contact us using the information below and we will remove it.
        </p>

        <div style={s.sectionTitle}>4. Third-Party Services</div>
        <p style={s.body}>Daycare Memory Vault relies on the following third-party services:</p>
        <ul style={s.list}>
          <li style={s.listItem}>
            <strong>Procare</strong> — the daycare platform we collect your child's media from, using the
            credentials you provide.
          </li>
          <li style={s.listItem}>
            <strong>Amazon Web Services (AWS S3)</strong> — secure media storage.{" "}
            <a href="https://aws.amazon.com/privacy/" style={s.emailLink} target="_blank" rel="noopener noreferrer">
              aws.amazon.com/privacy
            </a>
          </li>
          <li style={s.listItem}>
            <strong>Stripe</strong> — payment processing.{" "}
            <a href="https://stripe.com/privacy" style={s.emailLink} target="_blank" rel="noopener noreferrer">
              stripe.com/privacy
            </a>
          </li>
        </ul>

        <div style={s.sectionTitle}>5. Children's Privacy</div>
        <p style={s.body}>
          This service collects and stores photos and videos of children on behalf of, and at the direction of,
          their parent or guardian. The service is used by adults (parents/guardians), not children. We handle
          children's media with care and use it only to provide the vault to the requesting family.
        </p>

        <div style={s.sectionTitle}>6. Changes to This Policy</div>
        <p style={s.body}>
          We may update this Privacy Policy from time to time. Changes will be reflected by the "Last Updated"
          date above. Continued use of the service after changes constitutes acceptance of the updated policy.
        </p>

        <div style={s.sectionTitle}>7. Contact Us</div>
        <p style={s.body}>
          If you have any questions or requests regarding this Privacy Policy — including deletion of your data —
          please contact us:
        </p>
        <div style={s.contactBox}>
          <strong>Bullion Ventures LLC</strong>
          <br />
          Email:{" "}
          <a href="mailto:patrickbullion@gmail.com" style={s.emailLink}>
            patrickbullion@gmail.com
          </a>
        </div>

        <hr style={s.divider} />
        <Link to="/daycare-memory-vault" style={s.backLink}>
          ← Back to Daycare Memory Vault
        </Link>
      </div>

      <div style={s.footer}>
        <div>© 2026 Bullion Ventures LLC · Daycare Memory Vault</div>
        <div style={s.footerLinks}>
          <Link to="/daycare-memory-vault/support" style={s.footerLink}>Support</Link>
          <Link to="/" style={s.footerLink}>All Apps</Link>
        </div>
      </div>
    </div>
  );
}
