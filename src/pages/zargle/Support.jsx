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
  headerSubtitle: { fontSize: 16, color: "#a0a0b8", margin: 0 },
  content: { maxWidth: 720, margin: "0 auto", padding: "48px 24px 64px" },
  contactCard: {
    background: "linear-gradient(135deg, #1a0a0e, #1a1a2e)",
    border: `1px solid ${ACCENT}55`,
    borderRadius: 16,
    padding: "32px",
    marginBottom: 40,
    textAlign: "center",
  },
  contactTitle: { fontSize: 20, fontWeight: 700, color: "#ffffff", marginBottom: 8 },
  contactDesc: { fontSize: 15, color: "#a0a0b8", marginBottom: 20, lineHeight: 1.6 },
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
    color: "#ffffff",
    marginTop: 48,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: "1px solid #2a2a45",
  },
  faqItem: { marginBottom: 16, background: "#1a1a2e", border: "1px solid #2a2a45", borderRadius: 12, padding: "20px" },
  faqQ: { fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 8 },
  faqA: { fontSize: 14, color: "#a0a0b8", lineHeight: 1.7, margin: 0 },
  backLink: { display: "inline-block", marginTop: 40, fontSize: 14, color: ACCENT, fontWeight: 500 },
  footer: { textAlign: "center", padding: "32px 24px", borderTop: "1px solid #2a2a45", color: "#606080", fontSize: 13 },
  footerLinks: { display: "flex", gap: 20, justifyContent: "center", marginTop: 12, flexWrap: "wrap" },
  footerLink: { color: ACCENT, textDecoration: "none", fontSize: 13 },
};

const FAQS = [
  {
    q: "How do I start a game?",
    a: "Tap the My Games tab → + New Game. Search for players by username or choose from your friends list. Select 1–7 opponents and tap Start Game. All invited players will receive a push notification.",
  },
  {
    q: "How do I know when it's my turn?",
    a: "You'll receive a push notification when it's your turn. Make sure notifications are enabled in iOS Settings → Notifications → Zargle.",
  },
  {
    q: "What happens when someone reaches 10,000 points?",
    a: "The player who reaches 10,000 triggers the final round. Every other player gets exactly one more turn to try to beat that score. The player with the highest score at the end wins — ties go to the player who triggered the final round.",
  },
  {
    q: "What is a Farkle?",
    a: "If you roll and none of your dice score any points, that's a Farkle. You lose all the points you accumulated during that turn and it becomes the next player's turn.",
  },
  {
    q: "What are Hot Dice?",
    a: "If all 6 of your dice score on a single roll, you've rolled Hot Dice! You can roll all 6 dice again and keep accumulating points. Your banked score from this turn carries over.",
  },
  {
    q: "How do I add friends?",
    a: "Go to the Friends tab and tap the search icon. All Zargle players are listed — you can scroll or type to filter by username. Tap + Add to send a friend request.",
  },
  {
    q: "How do I accept or decline a friend request?",
    a: "Open the Friends tab. Pending requests appear at the top with Accept (✓) and Decline (✕) buttons.",
  },
  {
    q: "How do I remove a friend?",
    a: "In the Friends tab, find the friend you want to remove and tap the red ✕ button on their row. You'll be asked to confirm before they're removed.",
  },
  {
    q: "Can I invite someone to a game who isn't my friend?",
    a: "Yes! When creating a game, use the search bar to find any Zargle player by username and add them as an opponent.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to the Profile tab → scroll to the bottom → Delete Account. This permanently removes your account, username, friend list, and game history.",
  },
  {
    q: "I forgot my password. What do I do?",
    a: "Password reset isn't yet available in-app. Please email us at zargle@bullionventuresllc.com with your username and we'll help you regain access.",
  },
  {
    q: "The app says it can't connect to the server.",
    a: "This is usually a temporary network issue. Check your internet connection and try again. If the problem persists, contact us.",
  },
];

export default function ZargleSupport() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>🛟</span>
        <h1 style={s.headerTitle}>Zargle Support</h1>
        <p style={s.headerSubtitle}>Got a question? We've got answers.</p>
      </div>

      <div style={s.content}>
        <div style={s.contactCard}>
          <div style={s.contactTitle}>Contact Us</div>
          <p style={s.contactDesc}>
            Can't find what you're looking for? Email us and we'll get back to you as soon as possible.
          </p>
          <a href="mailto:zargle@bullionventuresllc.com" style={s.emailLink}>
            zargle@bullionventuresllc.com
          </a>
        </div>

        <div style={s.sectionTitle}>Frequently Asked Questions</div>
        {FAQS.map((faq) => (
          <div key={faq.q} style={s.faqItem}>
            <div style={s.faqQ}>{faq.q}</div>
            <p style={s.faqA}>{faq.a}</p>
          </div>
        ))}

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
