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

export default function SlumbrPrivacy() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🔒</span>
        <h1 style={styles.headerTitle}>Privacy Policy</h1>
        <p style={styles.headerMeta}>Slumbr · Last Updated: May 1, 2025</p>
      </div>

      <div style={styles.content}>
        <p style={styles.body}>
          Slumbr ("we," "us," "our") is a baby monitor application for iOS. This Privacy Policy describes what information we
          collect, how we use it, and your rights. By using Slumbr, you agree to the practices described in this policy.
        </p>

        <div style={styles.sectionTitle}>1. Information We Collect</div>

        <div style={styles.subTitle}>Account Information</div>
        <p style={styles.body}>
          Slumbr uses Sign in with Apple. We receive your Apple-generated user identifier and, at your discretion, a name and
          email address. We never see your real Apple ID credentials.
        </p>

        <div style={styles.subTitle}>Camera and Microphone</div>
        <p style={styles.body}>
          Slumbr requests access to your device's camera and microphone to stream video and audio from the baby room to a
          paired parent device. This stream is transmitted directly between devices in real time using WebRTC and is{' '}
          <strong style={{ color: '#f0f0f5' }}>never recorded or stored</strong> on our servers.
        </p>

        <div style={styles.subTitle}>Noise Detection</div>
        <p style={styles.body}>
          When noise monitoring is enabled, the app measures your microphone's audio level to detect sounds above your
          configured threshold. Audio is processed entirely on-device; raw audio samples are never transmitted or stored.
        </p>

        <div style={styles.subTitle}>Push Notification Tokens</div>
        <p style={styles.body}>
          We store the push notification token associated with your device in order to send noise alert notifications to the
          parent device. This token changes when you reinstall the app or switch devices.
        </p>

        <div style={styles.subTitle}>Household Data</div>
        <p style={styles.body}>
          When you set up a household, we store a household identifier and invite code on our servers so that the baby and
          parent devices can be linked. No personally identifiable information beyond your Apple user ID is stored in the
          household record.
        </p>

        <div style={styles.subTitle}>Usage Logs</div>
        <p style={styles.body}>
          Our servers may automatically log standard technical information such as request timestamps and error codes to
          maintain service reliability.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>2. How We Use Your Information</div>
        <ul style={styles.list}>
          <li style={styles.listItem}>To enable real-time video and audio monitoring between baby and parent devices</li>
          <li style={styles.listItem}>To detect noise levels and trigger alerts on the parent device</li>
          <li style={styles.listItem}>To link baby and parent devices via a household invite code</li>
          <li style={styles.listItem}>To send push notifications when noise thresholds are exceeded</li>
          <li style={styles.listItem}>To maintain and improve the app's reliability and performance</li>
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
            <strong style={{ color: '#c0c0d8' }}>Apple:</strong> Authentication and push notification delivery are handled by
            Apple's infrastructure.
          </li>
          <li style={styles.listItem}>
            <strong style={{ color: '#c0c0d8' }}>Legal Requirements:</strong> We may disclose information if required by law
            or in response to a valid legal process.
          </li>
        </ul>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>4. Data Retention</div>
        <p style={styles.body}>
          We retain your account information and household data as long as your account is active. You may request deletion
          of your data at any time by contacting us at the address below.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>5. Children's Privacy</div>
        <p style={styles.body}>
          Slumbr is designed to be used by parents and caregivers. The app is not directed at children and we do not
          knowingly collect personal information from children under 13.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>6. Contact Us</div>
        <p style={styles.body}>If you have questions about this policy, please contact us:</p>
        <div style={styles.contactBox}>
          <a href="mailto:slumbr@bullionventuresllc.com" style={styles.emailLink}>slumbr@bullionventuresllc.com</a>
        </div>

        <Link to="/slumbr" style={styles.backLink}>← Back to Slumbr</Link>
      </div>
    </div>
  );
}
