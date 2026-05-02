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
    q: 'What age is this app for?',
    a: 'Designed for children ages 2-7.',
  },
  {
    q: 'Is it safe for kids?',
    a: 'Yes. The app is COPPA compliant with no ads, no in-app purchases in free mode, and no data collection from children.',
  },
  {
    q: 'What games are included?',
    a: 'Bubble Blast and Flashcards with animals, food, and transportation categories.',
  },
  {
    q: 'How do I contact support?',
    a: 'Email pbullion@gmail.com',
  },
];

export default function LearnSupport() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🛟</span>
        <h1 style={styles.headerTitle}>Learn & Play! Support</h1>
        <p style={styles.headerSubtitle}>We're here to help. Find answers below or reach out directly.</p>
      </div>

      <div style={styles.content}>
        <div style={styles.contactCard}>
          <div style={styles.contactTitle}>Contact Us</div>
          <p style={styles.contactDesc}>
            Can't find what you're looking for? Send us an email and we'll get back to you as soon as possible.
          </p>
          <a href="mailto:pbullion@gmail.com" style={styles.emailLink}>pbullion@gmail.com</a>
        </div>

        <div style={styles.sectionTitle}>Frequently Asked Questions</div>
        {FAQS.map((faq) => (
          <div key={faq.q} style={styles.faqItem}>
            <div style={styles.faqQ}>{faq.q}</div>
            <p style={styles.faqA}>{faq.a}</p>
          </div>
        ))}

        <Link to="/learn-and-play" style={styles.backLink}>← Back to Learn & Play!</Link>
      </div>
    </div>
  );
}
