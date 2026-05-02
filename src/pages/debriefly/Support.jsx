import React from 'react';
import { Link } from 'react-router-dom';

const styles = {
  page: {
    backgroundColor: '#0f0f12',
    color: '#f0f0f5',
    minHeight: '100%',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    padding: '48px 24px 32px',
    textAlign: 'center',
    background: 'linear-gradient(160deg, #1a1a2e 0%, #0f0f12 60%)',
    borderBottom: '1px solid #2a2a45',
  },
  headerEmoji: { fontSize: 48, marginBottom: 16, display: 'block' },
  headerTitle: { fontSize: 36, fontWeight: 800, margin: '0 0 10px', color: '#ffffff' },
  headerSubtitle: { fontSize: 16, color: '#a0a0b8', margin: 0 },
  content: { maxWidth: 720, margin: '0 auto', padding: '48px 24px 64px' },
  contactCard: {
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    border: '1px solid #6c63ff55',
    borderRadius: 16,
    padding: '32px',
    marginBottom: 40,
    textAlign: 'center',
  },
  contactTitle: { fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 8 },
  contactDesc: { fontSize: 15, color: '#a0a0b8', marginBottom: 20, lineHeight: 1.6 },
  emailLink: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
    color: '#fff',
    padding: '12px 28px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 15,
    textDecoration: 'none',
    boxShadow: '0 4px 16px rgba(108,99,255,0.35)',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#ffffff',
    marginTop: 48,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: '1px solid #2a2a45',
  },
  faqItem: {
    marginBottom: 24,
    background: '#1a1a2e',
    border: '1px solid #2a2a45',
    borderRadius: 12,
    padding: '20px',
  },
  faqQ: { fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 8 },
  faqA: { fontSize: 14, color: '#a0a0b8', lineHeight: 1.7, margin: 0 },
  backLink: { display: 'inline-block', marginTop: 40, fontSize: 14, color: '#6c63ff', fontWeight: 500 },
};

const FAQS = [
  {
    q: 'How do I cancel my subscription?',
    a: "You can cancel anytime through the App Store. Go to Settings → Apple ID → Subscriptions → Debriefly, then tap Cancel Subscription. You'll keep access until the end of the current billing period.",
  },
  {
    q: 'My notifications stopped arriving. What do I do?',
    a: "First, make sure notifications are enabled: Settings → Notifications → Debriefly → Allow Notifications. Also check that your briefings are configured and toggled on inside the app under the My Brief tab.",
  },
  {
    q: 'How do I change what time I get my briefings?',
    a: 'Open the app, go to the Ideas tab, and tap the briefing you want to adjust. Each one has its own configurable time.',
  },
  {
    q: 'Can I change my news sources?',
    a: 'Yes — tap Ideas → Morning Briefing (or Evening Recap) → Edit, and select or deselect sources. Changes take effect on the next delivery.',
  },
  {
    q: 'How do I add stocks to my Market Close Recap?',
    a: 'Go to Ideas → Market Close Recap → Edit. You can add up to any number of ticker symbols and set your preferred delivery time.',
  },
  {
    q: 'Can I use Debriefly with Google Calendar or iCloud?',
    a: "The Calendar Digest reads from the calendars connected to your device's native Calendar app — both iCloud and Google Calendar work as long as they're connected in iOS Settings.",
  },
  {
    q: 'I signed in with Apple and lost access after reinstalling. Help!',
    a: 'If you used Sign in with Apple, your account is tied to your Apple ID. Simply sign in again with the same Apple ID and your subscription and settings will be restored.',
  },
  {
    q: 'How do I restore my purchase on a new device?',
    a: 'Open the app and sign in with the same Apple ID used for purchase. Your subscription is tied to your Apple ID and will restore automatically.',
  },
];

export default function DebrieflySupport() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🛟</span>
        <h1 style={styles.headerTitle}>Debriefly Support</h1>
        <p style={styles.headerSubtitle}>We're here to help. Find answers below or reach out directly.</p>
      </div>

      <div style={styles.content}>
        <div style={styles.contactCard}>
          <div style={styles.contactTitle}>Contact Us</div>
          <p style={styles.contactDesc}>
            Can't find what you're looking for? Send us an email and we'll get back to you as soon as possible.
          </p>
          <a href="mailto:support@debriefly.app" style={styles.emailLink}>support@debriefly.app</a>
        </div>

        <div style={styles.sectionTitle}>Frequently Asked Questions</div>
        {FAQS.map((faq) => (
          <div key={faq.q} style={styles.faqItem}>
            <div style={styles.faqQ}>{faq.q}</div>
            <p style={styles.faqA}>{faq.a}</p>
          </div>
        ))}

        <Link to="/debriefly" style={styles.backLink}>← Back to Debriefly</Link>
      </div>
    </div>
  );
}
