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
  headerSubtitle: { fontSize: 16, color: "rgba(255,255,255,0.75)", margin: 0 },
  content: { maxWidth: 720, margin: "0 auto", padding: "48px 24px 64px" },
  contactCard: {
    background: "#ffffff",
    border: `1px solid ${ACCENT}55`,
    borderRadius: 16,
    padding: "32px",
    marginBottom: 40,
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(123,44,191,0.1)",
  },
  contactTitle: { fontSize: 20, fontWeight: 700, color: "#2b2d42", marginBottom: 8 },
  contactDesc: { fontSize: 15, color: "#7a6a70", marginBottom: 20, lineHeight: 1.6 },
  emailLink: {
    display: "inline-block",
    background: ACCENT,
    color: "#fff",
    padding: "12px 28px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 15,
    textDecoration: "none",
    boxShadow: `0 4px 16px ${ACCENT}44`,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#2b2d42",
    marginTop: 48,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: "1px solid #efe2d2",
  },
  faqItem: {
    marginBottom: 16,
    background: "#ffffff",
    border: "1px solid #efe2d2",
    borderRadius: 12,
    padding: "20px",
    boxShadow: "0 1px 6px rgba(123,44,191,0.05)",
  },
  faqQ: { fontSize: 16, fontWeight: 700, color: "#2b2d42", marginBottom: 8 },
  faqA: { fontSize: 14, color: "#7a6a70", lineHeight: 1.7, margin: 0 },
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

const faqs = [
  {
    q: "What is Daycare Memory Vault?",
    a: "It's a one-time service that collects every photo and video your daycare posted of your child to Procare, saves them forever, and gives your family a private place to browse and download them.",
  },
  {
    q: "Why do you need my Procare login?",
    a: "That's how we fetch your child's photos and videos from Procare. We use it only to collect your child's own media for the date range you choose. Your login is stored securely and used solely for this purpose.",
  },
  {
    q: "What's the difference between the two packages?",
    a: "The $50 Download Package gives you every photo and video as a downloadable zip file. The $100 Full Vault Website adds a private themed website where you can browse memories by month, filter by holidays and activities, view captions, and use a photo lightbox — plus downloads.",
  },
  {
    q: "How do I view my memories?",
    a: "With the Full Vault plan, sign in at daycarememoryvault.com using the username and password you created at checkout. With the Download package, you'll receive a link to download your zip file.",
  },
  {
    q: "How far back can you go?",
    a: "As far back as your child's photos exist in Procare. You choose the start and end months at checkout.",
  },
  {
    q: "Is my child's media private?",
    a: "Yes. Your memories are gated behind your own personal login, and only your family can access them.",
  },
  {
    q: "I forgot my vault password. What do I do?",
    a: "Email us and we'll help you reset it. For security we can't see your password, but we can get you back in.",
  },
  {
    q: "How do I get help or report a problem?",
    a: "Email us at patrickbullion@gmail.com and we'll get back to you as soon as possible.",
  },
];

export default function DaycareMemoryVaultSupport() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>💬</span>
        <h1 style={s.headerTitle}>Support</h1>
        <p style={s.headerSubtitle}>Daycare Memory Vault · We're happy to help</p>
      </div>

      <div style={s.content}>
        <div style={s.contactCard}>
          <div style={s.contactTitle}>Get in Touch</div>
          <p style={s.contactDesc}>
            Have a question or running into an issue? Send us an email and we'll get back to you as soon as
            possible.
          </p>
          <a href="mailto:patrickbullion@gmail.com" style={s.emailLink}>
            patrickbullion@gmail.com
          </a>
        </div>

        <div style={s.sectionTitle}>Frequently Asked Questions</div>
        {faqs.map((faq, i) => (
          <div key={i} style={s.faqItem}>
            <div style={s.faqQ}>{faq.q}</div>
            <p style={s.faqA}>{faq.a}</p>
          </div>
        ))}

        <Link to="/daycare-memory-vault" style={s.backLink}>
          ← Back to Daycare Memory Vault
        </Link>
      </div>

      <div style={s.footer}>
        <div>© 2026 Bullion Ventures LLC · Daycare Memory Vault</div>
        <div style={s.footerLinks}>
          <Link to="/daycare-memory-vault/privacy" style={s.footerLink}>Privacy Policy</Link>
          <Link to="/" style={s.footerLink}>All Apps</Link>
        </div>
      </div>
    </div>
  );
}
