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

export default function DebrieflyPrivacy() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🔒</span>
        <h1 style={styles.headerTitle}>Privacy Policy</h1>
        <p style={styles.headerMeta}>Debriefly · Last Updated: April 15, 2025</p>
      </div>

      <div style={styles.content}>
        <p style={styles.body}>
          Debriefly ("we," "us," "our") is a personal daily briefing application for iOS. This Privacy Policy describes what
          information we collect, how we use it, and your rights regarding that information. By using Debriefly, you agree to
          the practices described in this policy.
        </p>

        <div style={styles.sectionTitle}>1. Information We Collect</div>

        <div style={styles.subTitle}>Account Information</div>
        <p style={styles.body}>
          Debriefly uses Sign in with Apple. We receive your Apple-generated user identifier and, at your discretion, a name
          and email address. We never see your real Apple ID credentials.
        </p>

        <div style={styles.subTitle}>Notification Preferences</div>
        <p style={styles.body}>
          We store your configured briefing preferences — chosen news sources, delivery times, stock ticker symbols, sports
          teams, weather location, and calendar settings — on our servers in order to generate and deliver your notifications.
        </p>

        <div style={styles.subTitle}>Calendar Data</div>
        <p style={styles.body}>
          If you enable the Calendar Digest, the app reads event titles, times, and locations from your on-device calendar.
          This data is transmitted to our server solely to generate your briefing and is not stored long-term.
        </p>

        <div style={styles.subTitle}>Push Notification Tokens</div>
        <p style={styles.body}>
          We store the Expo push notification token associated with your device in order to send briefing notifications. This
          token changes when you reinstall the app or switch devices.
        </p>

        <div style={styles.subTitle}>Subscription Status</div>
        <p style={styles.body}>
          We verify your subscription through Apple's receipt validation system. We store your subscription status (active or
          inactive) associated with your account. We do not store payment card numbers or detailed billing information.
        </p>

        <div style={styles.subTitle}>Usage Logs</div>
        <p style={styles.body}>
          Our servers may automatically log standard technical information such as request timestamps, error codes, and
          anonymized usage metrics to maintain service reliability.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>2. How We Use Your Information</div>
        <ul style={styles.list}>
          <li style={styles.listItem}>To generate your personalized morning and evening briefings</li>
          <li style={styles.listItem}>To schedule and deliver push notifications at your chosen times</li>
          <li style={styles.listItem}>To verify your subscription and unlock Pro features</li>
          <li style={styles.listItem}>To maintain and improve the app's reliability and performance</li>
          <li style={styles.listItem}>To respond to support requests you send us</li>
        </ul>
        <p style={styles.body}>
          We do not use your data for advertising, and we do not build advertising profiles based on your usage.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>3. Data Sharing</div>
        <p style={styles.body}>
          We do not sell, rent, or trade your personal information. We may share data only in the following limited circumstances:
        </p>
        <ul style={styles.list}>
          <li style={styles.listItem}>
            <strong style={{ color: '#c0c0d8' }}>Service Providers:</strong> We use third-party APIs (e.g., weather data,
            news aggregation, sports data) to generate briefing content. These services receive only the minimum data needed
            (such as a zip code for weather), not your account information.
          </li>
          <li style={styles.listItem}>
            <strong style={{ color: '#c0c0d8' }}>Apple:</strong> Subscription and receipt verification is handled by Apple's
            App Store infrastructure.
          </li>
          <li style={styles.listItem}>
            <strong style={{ color: '#c0c0d8' }}>Legal Requirements:</strong> We may disclose information if required by law
            or in response to a valid legal process.
          </li>
        </ul>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>4. Data Retention</div>
        <p style={styles.body}>
          We retain your account and preferences for as long as your account is active. Calendar event data used to generate
          a briefing is not stored after the briefing is sent. If you delete your account or contact us to request deletion,
          we will remove your personal data within 30 days.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>5. Security</div>
        <p style={styles.body}>
          We use industry-standard practices to protect your data, including HTTPS for all data transmission and secure
          server infrastructure. No method of transmission over the internet is 100% secure, but we take reasonable steps to
          protect your information.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>6. Your Rights</div>
        <p style={styles.body}>You have the right to:</p>
        <ul style={styles.list}>
          <li style={styles.listItem}>Access the personal data we hold about you</li>
          <li style={styles.listItem}>Request correction of inaccurate data</li>
          <li style={styles.listItem}>Request deletion of your account and associated data</li>
          <li style={styles.listItem}>Cancel your subscription at any time through the App Store</li>
        </ul>
        <p style={styles.body}>
          To exercise any of these rights, contact us at{' '}
          <a href="mailto:debriefly@bullionventuresllc.com" style={styles.emailLink}>debriefly@bullionventuresllc.com</a>.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>7. Children's Privacy</div>
        <p style={styles.body}>
          Debriefly is not directed at children under the age of 13. We do not knowingly collect personal information from
          children under 13. If you believe we have inadvertently collected such information, please contact us and we will
          delete it promptly.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>8. Changes to This Policy</div>
        <p style={styles.body}>
          We may update this Privacy Policy from time to time. We will notify you of material changes via a notice in the app
          or by updating the "Last Updated" date above. Continued use of the app after changes constitutes acceptance of the
          updated policy.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>9. Contact</div>
        <div style={styles.contactBox}>
          <p style={{ ...styles.body, marginBottom: 4 }}>Questions about this Privacy Policy? Reach us at:</p>
          <a href="mailto:debriefly@bullionventuresllc.com" style={styles.emailLink}>debriefly@bullionventuresllc.com</a>
        </div>

        <Link to="/debriefly" style={styles.backLink}>← Back to Debriefly</Link>
      </div>
    </div>
  );
}
