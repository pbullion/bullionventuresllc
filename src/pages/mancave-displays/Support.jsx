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
    q: 'How do I get started?',
    a: 'Download the app, sign in with your email, and select the sports, stocks, and news feeds you want to display. Your LED ticker will update automatically.',
  },
  {
    q: "My display isn't showing anything.",
    a: "Make sure your Raspberry Pi is powered on and connected to the same network. Check that node index.js is running on the Pi. If the Pi is running but nothing shows, verify the NovaLCT screen mapping is configured correctly.",
  },
  {
    q: 'How do I change which sports appear on my ticker?',
    a: 'Open the app and go to the Sports tab. Toggle on the sports you want and toggle off the ones you don\'t. Changes take effect within 30 seconds.',
  },
  {
    q: 'How do I add or remove stocks?',
    a: "Go to the Stocks tab in the app. You can search for and add stock symbols, adjust the number of gainers/decliners shown, and remove any symbols you no longer want.",
  },
  {
    q: 'How do I change the news feeds?',
    a: 'Open the News tab and select the feeds you\'d like to follow — ESPN, CNN, Fox News, MarketWatch, and more are available.',
  },
  {
    q: 'How often does the ticker update?',
    a: 'The ticker fetches fresh data from the server every 30 seconds by default.',
  },
  {
    q: 'Can I show custom text on the ticker?',
    a: "Yes — go to the Text tab in the app and enter any message you'd like to appear on the display.",
  },
  {
    q: 'What time zone should I select?',
    a: 'Choose the time zone that matches your physical location so that game times and schedules are displayed correctly.',
  },
  {
    q: 'A sport is listed but appears grayed out.',
    a: 'Some sports are coming soon and are not yet available. They are shown in the app so you can see what\'s planned for future updates.',
  },
];

export default function MancaveSupport() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🛟</span>
        <h1 style={styles.headerTitle}>Mancave Displays Support</h1>
        <p style={styles.headerSubtitle}>We're here to help. Find answers below or reach out directly.</p>
      </div>

      <div style={styles.content}>
        <div style={styles.contactCard}>
          <div style={styles.contactTitle}>Contact Us</div>
          <p style={styles.contactDesc}>
            Can't find what you're looking for? Send us an email and we'll get back to you as soon as possible.
          </p>
          <a href="mailto:support@mancavedisplays.app" style={styles.emailLink}>support@mancavedisplays.app</a>
        </div>

        <div style={styles.sectionTitle}>Frequently Asked Questions</div>
        {FAQS.map((faq) => (
          <div key={faq.q} style={styles.faqItem}>
            <div style={styles.faqQ}>{faq.q}</div>
            <p style={styles.faqA}>{faq.a}</p>
          </div>
        ))}

        <Link to="/mancave-displays" style={styles.backLink}>← Back to Mancave Displays</Link>
      </div>
    </div>
  );
}
