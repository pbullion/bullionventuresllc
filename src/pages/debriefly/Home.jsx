import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Snap & Add Schedules',
    desc: 'Take a photo of any schedule, AI extracts dates and adds them to your calendar.',
  },
  {
    title: 'Daily Briefings',
    desc: 'Get a personalized morning summary delivered as a notification.',
  },
  {
    title: 'Weekly Summaries',
    desc: 'Recap of upcoming events every week so you\'re always prepared.',
  },
  {
    title: 'Nightly Reminders',
    desc: 'Never miss tomorrow\'s events with an evening heads-up.',
  },
  {
    title: 'Sports, News, Weather, Stocks',
    desc: 'Customize exactly what appears in your daily briefing.',
  },
];

const styles = {
  page: { backgroundColor: '#0f0f12', color: '#f0f0f5', minHeight: '100%' },
  header: {
    padding: '64px 24px 48px',
    textAlign: 'center',
    background: 'linear-gradient(160deg, #1a1a2e 0%, #0f0f12 60%)',
    borderBottom: '1px solid #2a2a45',
  },
  emoji: { fontSize: 56, display: 'block', marginBottom: 16 },
  title: { fontSize: 42, fontWeight: 800, margin: '0 0 12px', color: '#ffffff' },
  tagline: { fontSize: 18, color: '#a0a0b8', margin: 0 },
  content: { maxWidth: 800, margin: '0 auto', padding: '56px 24px 64px' },
  subNav: {
    display: 'flex', gap: 16, marginBottom: 48, flexWrap: 'wrap',
  },
  subNavLink: {
    padding: '8px 18px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a45',
    borderRadius: 8,
    fontSize: 13,
    color: '#a0a0b8',
    fontWeight: 500,
  },
  sectionTitle: {
    fontSize: 22, fontWeight: 700, color: '#ffffff',
    marginBottom: 24,
  },
  featureList: { display: 'flex', flexDirection: 'column', gap: 16 },
  featureItem: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a45',
    borderRadius: 12,
    padding: '20px 24px',
  },
  featureTitle: { fontSize: 16, fontWeight: 700, color: '#6c63ff', marginBottom: 6 },
  featureDesc: { fontSize: 14, color: '#a0a0b8', lineHeight: 1.65, margin: 0 },
  appStore: {
    marginTop: 48,
    padding: '24px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a45',
    borderRadius: 12,
    textAlign: 'center',
  },
  appStoreText: { fontSize: 15, color: '#a0a0b8', margin: 0 },
  backLink: {
    display: 'inline-block',
    marginTop: 40,
    fontSize: 14,
    color: '#6c63ff',
    fontWeight: 500,
  },
};

export default function DebrieflyHome() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.emoji}>📋</span>
        <h1 style={styles.title}>Debriefly</h1>
        <p style={styles.tagline}>Your AI-Powered Daily Briefing</p>
      </div>

      <div style={styles.content}>
        <div style={styles.subNav}>
          <Link to="/debriefly/privacy" style={styles.subNavLink}>Privacy Policy</Link>
          <Link to="/debriefly/support" style={styles.subNavLink}>Support</Link>
        </div>

        <h2 style={styles.sectionTitle}>Features</h2>
        <div style={styles.featureList}>
          {features.map((f) => (
            <div key={f.title} style={styles.featureItem}>
              <div style={styles.featureTitle}>{f.title}</div>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div style={styles.appStore}>
          <p style={styles.appStoreText}>Available on the App Store</p>
        </div>

        <Link to="/" style={styles.backLink}>← Back to Home</Link>
      </div>
    </div>
  );
}
