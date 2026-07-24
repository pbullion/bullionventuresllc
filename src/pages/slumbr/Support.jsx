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
    q: 'How do I set up Baby Mode?',
    a: "Open Slumbr and select Baby Mode on the home screen. Sign in with Apple, then place the device in the baby's room. The app will request camera and microphone permissions — allow both for full monitoring.",
  },
  {
    q: 'How do I connect the Parent device?',
    a: "On the parent device, open Slumbr and select Parent Mode. Enter the invite code shown on the Baby device's screen. Once connected, you'll see a live feed from the baby room.",
  },
  {
    q: 'Where do I find the invite code?',
    a: "The invite code is displayed on the Baby Mode screen after signing in. It's a short code you enter on the parent device to link the two together.",
  },
  {
    q: "The camera isn't showing on the parent device.",
    a: "Make sure both devices are connected to the internet and that the baby device's camera permission is enabled in iOS Settings → Privacy & Security → Camera → Slumbr. Also confirm the invite code was entered correctly.",
  },
  {
    q: 'How do I adjust the noise detection sensitivity?',
    a: "In Baby Mode, use the sensitivity slider in the controls panel. Sliding toward 'More Sensitive' will alert you to quieter sounds; sliding toward 'Less Sensitive' reduces false alerts.",
  },
  {
    q: "Noise alerts aren't arriving on the parent device.",
    a: 'Check that notifications are enabled: iOS Settings → Notifications → Slumbr → Allow Notifications. Also make sure the noise monitoring toggle is turned on in the Baby Mode screen.',
  },
  {
    q: 'Can I flip between front and back camera?',
    a: 'Yes — tap the camera flip button on the Baby Mode screen to switch between front and rear cameras.',
  },
  {
    q: 'How do I cancel or stop monitoring?',
    a: 'Tap the Stop button on the Baby Mode screen to end the session. This will stop the camera stream and disable noise detection.',
  },
  {
    q: 'I signed in with Apple and lost access after reinstalling.',
    a: 'Simply sign in again using the same Apple ID. Your account and household data will be restored automatically.',
  },
];

export default function SlumbrSupport() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🛟</span>
        <h1 style={styles.headerTitle}>Slumbr Support</h1>
        <p style={styles.headerSubtitle}>We're here to help. Find answers below or reach out directly.</p>
      </div>

      <div style={styles.content}>
        <div style={styles.contactCard}>
          <div style={styles.contactTitle}>Contact Us</div>
          <p style={styles.contactDesc}>
            Can't find what you're looking for? Send us an email and we'll get back to you as soon as possible.
          </p>
          <a href="mailto:slumbr@bullionventuresllc.com" style={styles.emailLink}>slumbr@bullionventuresllc.com</a>
        </div>

        <div style={styles.sectionTitle}>Frequently Asked Questions</div>
        {FAQS.map((faq) => (
          <div key={faq.q} style={styles.faqItem}>
            <div style={styles.faqQ}>{faq.q}</div>
            <p style={styles.faqA}>{faq.a}</p>
          </div>
        ))}

        <Link to="/slumbr" style={styles.backLink}>← Back to Slumbr</Link>
      </div>
    </div>
  );
}
