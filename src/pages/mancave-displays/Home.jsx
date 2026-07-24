import { Link } from 'react-router-dom';

const features = [
  { title: 'Live betting odds from multiple sports', desc: 'Real-time spreads, moneylines, and over/unders.' },
  { title: 'Scrolling LED ticker with scores & headlines', desc: 'A 19-panel LED matrix wall display driven by Raspberry Pi.' },
  { title: 'Customizable sports and teams', desc: "Pick exactly which sports and teams you care about." },
  { title: 'Companion mobile app for settings', desc: 'Control your display from your phone.' },
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
  subNav: { display: 'flex', gap: 16, marginBottom: 48, flexWrap: 'wrap' },
  subNavLink: {
    padding: '8px 18px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a45',
    borderRadius: 8,
    fontSize: 13,
    color: '#a0a0b8',
    fontWeight: 500,
  },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 12 },
  sectionSubtitle: { fontSize: 15, color: '#a0a0b8', lineHeight: 1.65, marginBottom: 32 },
  sectionBlock: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a45',
    borderRadius: 14,
    padding: '24px',
    marginBottom: 24,
  },
  sectionBlockTitle: { fontSize: 18, fontWeight: 700, color: '#6c63ff', marginBottom: 10 },
  sectionBlockDesc: { fontSize: 14, color: '#a0a0b8', lineHeight: 1.65, margin: 0 },
  featuresTitle: { fontSize: 20, fontWeight: 700, color: '#ffffff', margin: '40px 0 20px' },
  featureList: { display: 'flex', flexDirection: 'column', gap: 14 },
  featureItem: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a45',
    borderRadius: 10,
    padding: '16px 20px',
  },
  featureTitle: { fontSize: 15, fontWeight: 700, color: '#6c63ff', marginBottom: 4 },
  featureDesc: { fontSize: 13, color: '#a0a0b8', lineHeight: 1.6, margin: 0 },
  backLink: { display: 'inline-block', marginTop: 40, fontSize: 14, color: '#6c63ff', fontWeight: 500 },
};

export default function MancaveHome() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.emoji}>📺</span>
        <h1 style={styles.title}>Mancave Displays</h1>
        <p style={styles.tagline}>Real-Time Sports Odds & LED Ticker Displays</p>
      </div>

      <div style={styles.content}>
        <div style={styles.subNav}>
          <Link to="/mancave-displays/privacy" style={styles.subNavLink}>Privacy Policy</Link>
          <Link to="/mancave-displays/support" style={styles.subNavLink}>Support</Link>
        </div>

        <div style={styles.sectionBlock}>
          <div style={styles.sectionBlockTitle}>Odds Display Screen</div>
          <p style={styles.sectionBlockDesc}>
            A web dashboard showing live betting lines, spreads, and moneylines for your favorite sports. Perfect for a
            dedicated TV or monitor in your space.
          </p>
        </div>

        <div style={styles.sectionBlock}>
          <div style={styles.sectionBlockTitle}>LED Sports Ticker</div>
          <p style={styles.sectionBlockDesc}>
            A scrolling LED matrix wall display showing live scores, headlines, weather, and sports data. Powered by a
            Raspberry Pi with a 19-panel LED matrix.
          </p>
        </div>

        <div style={styles.featuresTitle}>Features</div>
        <div style={styles.featureList}>
          {features.map((f) => (
            <div key={f.title} style={styles.featureItem}>
              <div style={styles.featureTitle}>{f.title}</div>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>

        <Link to="/" style={styles.backLink}>← Back to Home</Link>
      </div>
    </div>
  );
}
