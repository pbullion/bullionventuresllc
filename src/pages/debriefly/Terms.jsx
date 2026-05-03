import React from 'react';
import { Link } from 'react-router-dom';

const s = {
  page: { backgroundColor: '#0f0f12', color: '#f0f0f5', minHeight: '100%', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  header: { padding: '48px 24px 32px', textAlign: 'center', background: 'linear-gradient(160deg, #1a1a2e 0%, #0f0f12 60%)', borderBottom: '1px solid #2a2a45' },
  headerEmoji: { fontSize: 48, marginBottom: 16, display: 'block' },
  headerTitle: { fontSize: 36, fontWeight: 800, margin: '0 0 10px', color: '#ffffff' },
  headerMeta: { fontSize: 14, color: '#606080', margin: 0 },
  content: { maxWidth: 720, margin: '0 auto', padding: '48px 24px 64px' },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: '#6c63ff', marginTop: 44, marginBottom: 12 },
  subTitle: { fontSize: 17, fontWeight: 600, color: '#ffffff', marginTop: 24, marginBottom: 8 },
  body: { fontSize: 15, color: '#a0a0b8', lineHeight: 1.75, margin: '0 0 12px' },
  divider: { border: 'none', borderTop: '1px solid #2a2a45', margin: '40px 0 0' },
  contactBox: { background: '#1a1a2e', border: '1px solid #2a2a45', borderRadius: 12, padding: '20px 24px', marginTop: 16 },
  emailLink: { color: '#6c63ff', textDecoration: 'none', fontWeight: 600 },
  footer: { textAlign: 'center', padding: '32px 24px', borderTop: '1px solid #2a2a45', color: '#606080', fontSize: 13 },
  footerLinks: { display: 'flex', gap: 20, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' },
  footerLink: { color: '#6c63ff', textDecoration: 'none', fontSize: 13 },
};

export default function DebrieflyTerms() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>📄</span>
        <h1 style={s.headerTitle}>Terms of Use</h1>
        <p style={s.headerMeta}>Debriefly · Last Updated: May 3, 2026</p>
      </div>

      <div style={s.content}>
        <p style={s.body}>
          Welcome to Debriefly. These Terms of Use ("Terms") govern your use of the Debriefly mobile application
          ("App") provided by Bullion Ventures LLC ("we," "us," or "our"). By downloading or using the App, you agree
          to these Terms.
        </p>

        <div style={s.sectionTitle}>1. Eligibility</div>
        <p style={s.body}>
          You must be at least 13 years old to use Debriefly. By using the App you represent that you meet this
          requirement.
        </p>

        <div style={s.sectionTitle}>2. Subscriptions & Auto-Renewal</div>
        <div style={s.subTitle}>Subscription Details</div>
        <p style={s.body}>
          Debriefly offers an auto-renewable subscription ("Briefly Pro") that unlocks unlimited notifications and
          premium features:
        </p>
        <ul style={{ paddingLeft: 20, margin: '8px 0 16px' }}>
          <li style={{ fontSize: 15, color: '#a0a0b8', lineHeight: 1.75, marginBottom: 6 }}><strong style={{ color: '#f0f0f5' }}>Title:</strong> Briefly Pro</li>
          <li style={{ fontSize: 15, color: '#a0a0b8', lineHeight: 1.75, marginBottom: 6 }}><strong style={{ color: '#f0f0f5' }}>Length:</strong> Monthly (1 month)</li>
          <li style={{ fontSize: 15, color: '#a0a0b8', lineHeight: 1.75, marginBottom: 6 }}><strong style={{ color: '#f0f0f5' }}>Price:</strong> $0.99 per month</li>
        </ul>
        <div style={s.subTitle}>Auto-Renewal</div>
        <p style={s.body}>
          Your subscription automatically renews at the end of each billing period unless canceled at least 24 hours
          before the renewal date. Your Apple ID account will be charged for renewal within 24 hours prior to the end
          of the current period.
        </p>
        <div style={s.subTitle}>Managing & Canceling</div>
        <p style={s.body}>
          You can manage or cancel your subscription at any time through your Apple ID account settings in the App
          Store. Cancellation takes effect at the end of the current billing period — you will not receive a refund for
          the unused portion of the current period.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>3. Account Deletion</div>
        <p style={s.body}>
          You may delete your Debriefly account at any time from the Account tab within the app. Deleting your account
          permanently removes all your data, notification configurations, and calendars. This action cannot be undone.
          If you have an active subscription, please cancel it in your Apple ID settings before deleting your account
          to avoid future charges.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>4. Free Tier</div>
        <p style={s.body}>
          Debriefly includes a free tier that allows up to 2 notification alerts. Upgrading to Briefly Pro unlocks
          unlimited notifications and all premium features.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>5. Privacy & Data Collection</div>
        <p style={s.body}>
          We collect only the information necessary to provide the App's features. For full details, please review
          our{' '}
          <Link to="/debriefly/privacy" style={s.emailLink}>Privacy Policy</Link>.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>6. Third-Party Services</div>
        <p style={s.body}>
          The App uses third-party providers including the Apple App Store for payments and push notification
          delivery services. These providers have their own terms and privacy practices.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>7. Disclaimer of Warranties</div>
        <p style={s.body}>
          The App is provided "as is" without warranties of any kind. We do not guarantee the App will be
          error-free or uninterrupted.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>8. Changes to These Terms</div>
        <p style={s.body}>
          We may update these Terms from time to time. We will notify users of material changes in the App or by
          other reasonable means. Continued use after changes constitutes acceptance of the updated Terms.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>9. Contact Us</div>
        <div style={s.contactBox}>
          <p style={{ ...s.body, margin: 0 }}>
            Questions about these Terms? Email us at{' '}
            <a href="mailto:debriefly@bullionventuresllc.com" style={s.emailLink}>debriefly@bullionventuresllc.com</a>
          </p>
        </div>
      </div>

      <div style={s.footer}>
        <p style={{ margin: '0 0 4px' }}>© 2026 Bullion Ventures LLC</p>
        <div style={s.footerLinks}>
          <Link to="/debriefly" style={s.footerLink}>Debriefly</Link>
          <Link to="/debriefly/privacy" style={s.footerLink}>Privacy Policy</Link>
          <Link to="/debriefly/support" style={s.footerLink}>Support</Link>
          <Link to="/" style={s.footerLink}>Bullion Ventures</Link>
        </div>
      </div>
    </div>
  );
}
