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
  headerSubtitle: { fontSize: 16, color: "rgba(255,255,255,0.7)", margin: 0 },
  content: { maxWidth: 720, margin: "0 auto", padding: "48px 24px 64px" },
  contactCard: {
    background: "#ffffff",
    border: `1px solid ${ACCENT}55`,
    borderRadius: 16,
    padding: "32px",
    marginBottom: 40,
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(210,96,80,0.1)",
  },
  contactTitle: { fontSize: 20, fontWeight: 700, color: "#2c1810", marginBottom: 8 },
  contactDesc: { fontSize: 15, color: "#7a6060", marginBottom: 20, lineHeight: 1.6 },
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
    color: "#2c1810",
    marginTop: 48,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: "1px solid #e8d5d0",
  },
  faqItem: {
    marginBottom: 16,
    background: "#ffffff",
    border: "1px solid #e8d5d0",
    borderRadius: 12,
    padding: "20px",
    boxShadow: "0 1px 6px rgba(210,96,80,0.05)",
  },
  faqQ: { fontSize: 16, fontWeight: 700, color: "#2c1810", marginBottom: 8 },
  faqA: { fontSize: 14, color: "#7a6060", lineHeight: 1.7, margin: 0 },
  backLink: { display: "inline-block", marginTop: 40, fontSize: 14, color: ACCENT, fontWeight: 500, textDecoration: "none" },
  footer: { textAlign: "center", padding: "32px 24px", borderTop: "1px solid #e8d5d0", color: "#a08070", fontSize: 13 },
  footerLinks: { display: "flex", gap: 20, justifyContent: "center", marginTop: 12, flexWrap: "wrap" },
  footerLink: { color: ACCENT, textDecoration: "none", fontSize: 13 },
};

const faqs = [
  {
    q: "How do I access the wedding gallery?",
    a: "Open the app and enter the wedding code provided by the couple or coordinator. Once entered, you'll have instant access to the shared photo gallery.",
  },
  {
    q: "How do I upload photos?",
    a: "Tap the upload button in the gallery. You can select up to 30 photos from your camera roll at once, or take new photos with your camera. Your photos will appear in the gallery immediately after uploading.",
  },
  {
    q: "Why can't I see a photo that was uploaded?",
    a: "Some photos may be hidden by the event administrator. If you uploaded a photo and can't see it, it may have been hidden from the guest view. Contact the couple or coordinator if you have questions.",
  },
  {
    q: "Can I download photos from the gallery?",
    a: "Yes — tap and hold any photo to save it to your camera roll.",
  },
  {
    q: "I forgot my wedding code. What do I do?",
    a: "Contact the couple or event coordinator who invited you — they can provide the code again.",
  },
  {
    q: "Is there a limit on how many photos I can upload?",
    a: "You can select up to 30 photos per upload session. There's no limit on total uploads.",
  },
  {
    q: "Are my photos private?",
    a: "Photos are only visible to people who have the same wedding code. They are stored securely on AWS S3 and are not publicly accessible.",
  },
  {
    q: "How do I report a problem or inappropriate content?",
    a: "Email us at patrickbullion@gmail.com and we'll address it promptly.",
  },
];

export default function WeddingPhotosSupport() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>💬</span>
        <h1 style={s.headerTitle}>Support</h1>
        <p style={s.headerSubtitle}>Wedding Photos · We're happy to help</p>
      </div>

      <div style={s.content}>
        <div style={s.contactCard}>
          <div style={s.contactTitle}>Get in Touch</div>
          <p style={s.contactDesc}>
            Have a question or running into an issue? Send us an email and we'll get back to you as soon as possible.
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

        <Link to="/wedding-photos" style={s.backLink}>← Back to Wedding Photos</Link>
      </div>

      <div style={s.footer}>
        <div>© 2026 Bullion Ventures LLC · Wedding Photos</div>
        <div style={s.footerLinks}>
          <Link to="/wedding-photos/privacy" style={s.footerLink}>Privacy Policy</Link>
          <Link to="/" style={s.footerLink}>All Apps</Link>
        </div>
      </div>
    </div>
  );
}
