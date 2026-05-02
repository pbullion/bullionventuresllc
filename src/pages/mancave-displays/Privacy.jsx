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
  headerMeta: { fontSize: 14, color: '#606080', margin: 0 },
  content: { maxWidth: 720, margin: '0 auto', padding: '48px 24px 64px' },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: '#6c63ff', marginTop: 44, marginBottom: 12 },
  subTitle: { fontSize: 17, fontWeight: 600, color: '#ffffff', marginTop: 24, marginBottom: 8 },
  body: { fontSize: 15, color: '#a0a0b8', lineHeight: 1.75, margin: '0 0 12px' },
  list: { paddingLeft: 20, margin: '8px 0 16px' },
  listItem: { fontSize: 15, color: '#a0a0b8', lineHeight: 1.75, marginBottom: 6 },
  divider: { border: 'none', borderTop: '1px solid #2a2a45', margin: '40px 0 0' },
  contactBox: {
    background: '#1a1a2e',
    border: '1px solid #2a2a45',
    borderRadius: 12,
    padding: '20px 24px',
    marginTop: 16,
  },
  emailLink: { color: '#6c63ff', textDecoration: 'none', fontWeight: 600 },
  backLink: { display: 'inline-block', marginTop: 40, fontSize: 14, color: '#6c63ff', fontWeight: 500 },
};

export default function MancavePrivacy() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🔒</span>
        <h1 style={styles.headerTitle}>Privacy Policy</h1>
        <p style={styles.headerMeta}>Mancave Displays · Last Updated: May 1, 2025</p>
      </div>

      <div style={styles.content}>
        <p style={styles.body}>
          Mancave Displays ("we," "us," "our") is a companion app for LED sports ticker displays. This Privacy Policy
          describes what information we collect, how we use it, and your rights. By using Mancave Displays, you agree to the
          practices described in this policy.
        </p>

        <div style={styles.sectionTitle}>1. Information We Collect</div>

        <div style={styles.subTitle}>Account Information</div>
        <p style={styles.body}>
          Mancave Displays uses your email address to identify your account and associate your display preferences with your
          profile. We store this on our servers to deliver your personalized ticker content.
        </p>

        <div style={styles.subTitle}>Display Preferences</div>
        <p style={styles.body}>
          We store the sports, news feeds, stock symbols, and other content preferences you configure in the app. This data
          is sent to our servers to generate the content that appears on your LED display.
        </p>

        <div style={styles.subTitle}>Usage Logs</div>
        <p style={styles.body}>
          Our servers may automatically log standard technical information such as request timestamps and error codes to
          maintain service reliability.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>2. How We Use Your Information</div>
        <ul style={styles.list}>
          <li style={styles.listItem}>To generate and deliver personalized ticker content to your LED display</li>
          <li style={styles.listItem}>To store and sync your sport, stock, and news preferences across devices</li>
          <li style={styles.listItem}>To maintain and improve the app's reliability and performance</li>
          <li style={styles.listItem}>To respond to support requests you send us</li>
        </ul>
        <p style={styles.body}>
          We do not use your data for advertising and we do not build advertising profiles based on your usage.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>3. Data Sharing</div>
        <p style={styles.body}>
          We do not sell, rent, or trade your personal information. We may share data only in the following limited circumstances:
        </p>
        <ul style={styles.list}>
          <li style={styles.listItem}>
            <strong style={{ color: '#c0c0d8' }}>Third-Party Data Providers:</strong> We use sports data, stock market, news,
            and weather APIs to generate ticker content. These services receive only the minimum data needed (such as a stock
            symbol or sport selection), not your personal account information.
          </li>
          <li style={styles.listItem}>
            <strong style={{ color: '#c0c0d8' }}>Legal Requirements:</strong> We may disclose information if required by law
            or in response to a valid legal process.
          </li>
        </ul>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>4. Data Retention</div>
        <p style={styles.body}>
          We retain your account and preferences data as long as your account is active. You may request deletion of your
          data at any time by contacting us at the address below.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>5. Permissions</div>
        <p style={styles.body}>
          Mancave Displays does not request access to your camera, microphone, contacts, or location. The app only requires
          an internet connection to fetch sports scores, stock data, and news headlines.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>6. Contact Us</div>
        <p style={styles.body}>If you have questions about this policy, please contact us:</p>
        <div style={styles.contactBox}>
          <a href="mailto:support@mancavedisplays.app" style={styles.emailLink}>support@mancavedisplays.app</a>
        </div>

        <Link to="/mancave-displays" style={styles.backLink}>← Back to Mancave Displays</Link>
      </div>
    </div>
  );
}
