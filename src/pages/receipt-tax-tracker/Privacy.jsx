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

export default function ReceiptPrivacy() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🔒</span>
        <h1 style={styles.headerTitle}>Privacy Policy</h1>
        <p style={styles.headerMeta}>Sales Tax Tracker · Last Updated: January 20, 2026</p>
      </div>

      <div style={styles.content}>
        <p style={styles.body}>
          Sales Tax Tracker ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how
          we collect, use, disclose, and safeguard your information when you use our mobile application.
        </p>

        <div style={styles.sectionTitle}>Information We Collect</div>

        <div style={styles.subTitle}>Personal Information</div>
        <ul style={styles.list}>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>User Authentication:</strong> Email and password (securely encrypted)</li>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>Receipt Data:</strong> Retailer names, dates, tax amounts</li>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>Images:</strong> Receipt photos uploaded by you for OCR processing</li>
        </ul>

        <div style={styles.subTitle}>Automatically Collected Information</div>
        <ul style={styles.list}>
          <li style={styles.listItem}>Device information (model, OS version)</li>
          <li style={styles.listItem}>App usage analytics</li>
          <li style={styles.listItem}>Error logs and crash reports</li>
        </ul>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>How We Use Your Information</div>
        <p style={styles.body}>We use the collected information to:</p>
        <ul style={styles.list}>
          <li style={styles.listItem}>Process and store your receipts</li>
          <li style={styles.listItem}>Extract receipt data using OCR technology</li>
          <li style={styles.listItem}>Calculate sales tax summaries</li>
          <li style={styles.listItem}>Improve app performance and features</li>
          <li style={styles.listItem}>Respond to support inquiries</li>
          <li style={styles.listItem}>Comply with legal obligations</li>
        </ul>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>Data Security</div>
        <ul style={styles.list}>
          <li style={styles.listItem}>Your data is encrypted in transit (HTTPS/TLS)</li>
          <li style={styles.listItem}>Database credentials and API keys are secured</li>
          <li style={styles.listItem}>Receipt images are temporarily processed and stored securely on AWS S3</li>
          <li style={styles.listItem}>We do not sell or share your personal data with third parties</li>
        </ul>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>Third-Party Services</div>
        <p style={styles.body}>Our app uses the following third-party services:</p>
        <ul style={styles.list}>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>Google Cloud Vision:</strong> For OCR text extraction from receipt images</li>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>AWS S3:</strong> For secure image storage</li>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>PostgreSQL Database:</strong> For receipt data storage</li>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>Heroku:</strong> For backend API hosting</li>
        </ul>
        <p style={styles.body}>Each of these services maintains their own privacy policies.</p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>Data Retention</div>
        <ul style={styles.list}>
          <li style={styles.listItem}>Receipt data is retained as long as you maintain your account</li>
          <li style={styles.listItem}>You can delete individual receipts or your entire account at any time</li>
          <li style={styles.listItem}>Upon account deletion, all associated data will be permanently removed</li>
        </ul>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>Your Rights</div>
        <p style={styles.body}>You have the right to:</p>
        <ul style={styles.list}>
          <li style={styles.listItem}>Access your personal data</li>
          <li style={styles.listItem}>Correct inaccurate data</li>
          <li style={styles.listItem}>Delete your account and all associated data</li>
          <li style={styles.listItem}>Opt-out of non-essential analytics</li>
        </ul>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>Contact Us</div>
        <p style={styles.body}>If you have questions about this Privacy Policy, please contact us:</p>
        <div style={styles.contactBox}>
          <a href="mailto:support@receipts-tracker.com" style={styles.emailLink}>support@receipts-tracker.com</a>
        </div>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>Changes to This Policy</div>
        <p style={styles.body}>
          We may update this Privacy Policy periodically. We will notify you of any changes by updating the "Last Updated"
          date at the top of this policy.
        </p>

        <p style={{ ...styles.body, marginTop: 32, fontStyle: 'italic' }}>
          By using Sales Tax Tracker, you consent to our Privacy Policy.
        </p>

        <Link to="/receipt-tax-tracker" style={styles.backLink}>← Back to Sales Tax Tracker</Link>
      </div>
    </div>
  );
}
