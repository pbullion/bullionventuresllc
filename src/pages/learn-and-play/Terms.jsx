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
  backLink: { display: 'inline-block', color: '#6c63ff', textDecoration: 'none', fontSize: 14, fontWeight: 600 },
};

export default function LearnAndPlayTerms() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>📄</span>
        <h1 style={s.headerTitle}>Terms of Use</h1>
        <p style={s.headerMeta}>Learn &amp; Play! · Last Updated: May 3, 2026</p>
      </div>

      <div style={s.content}>
        <p style={s.body}>
          Welcome to Learn &amp; Play! These Terms of Use ("Terms") govern your use of the Learn &amp; Play! mobile
          application ("App") provided by Bullion Ventures LLC ("we," "us," or "our"). By downloading or using the App,
          you agree to these Terms. If you are a parent or guardian allowing a child to use the App, you accept these
          Terms on their behalf.
        </p>

        <div style={s.sectionTitle}>1. Who Can Use the App</div>
        <p style={s.body}>
          Learn &amp; Play! is designed for children. If your child is under the minimum age required by law in your
          country to provide consent (under 13 in the United States), a parent or guardian must review and agree to
          these Terms and provide any required consent for their child to use the App.
        </p>

        <div style={s.sectionTitle}>2. Subscriptions & Auto-Renewal</div>
        <div style={s.subTitle}>Subscription Details</div>
        <p style={s.body}>
          Learn &amp; Play! offers an auto-renewable subscription ("Premium") that unlocks all games, activities, and
          features:
        </p>
        <ul style={{ paddingLeft: 20, margin: '8px 0 16px' }}>
          <li style={{ fontSize: 15, color: '#a0a0b8', lineHeight: 1.75, marginBottom: 6 }}><strong style={{ color: '#f0f0f5' }}>Title:</strong> Premium</li>
          <li style={{ fontSize: 15, color: '#a0a0b8', lineHeight: 1.75, marginBottom: 6 }}><strong style={{ color: '#f0f0f5' }}>Length:</strong> Monthly (1 month)</li>
          <li style={{ fontSize: 15, color: '#a0a0b8', lineHeight: 1.75, marginBottom: 6 }}><strong style={{ color: '#f0f0f5' }}>Price:</strong> $1.99 per month</li>
          <li style={{ fontSize: 15, color: '#a0a0b8', lineHeight: 1.75, marginBottom: 6 }}><strong style={{ color: '#f0f0f5' }}>Free Trial:</strong> 7-day free trial for new subscribers</li>
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
        <div style={s.subTitle}>Free Trial</div>
        <p style={s.body}>
          Any unused portion of the free trial period is forfeited when a subscription is purchased. If you cancel
          during the free trial, you will not be charged.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>3. Parental Controls & Responsibility</div>
        <p style={s.body}>
          Parents and guardians are responsible for supervising their child's use of the App. We provide settings and
          controls that let adults manage account details, privacy, and in-app interactions. Please use device-level
          parental controls and password protection to prevent unintended purchases.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>4. Privacy & Data Collection</div>
        <p style={s.body}>
          We collect only the information necessary to provide the App's features. We do not knowingly collect more
          personal information from children than is needed. For details, please review our{' '}
          <Link to="/learn-and-play/privacy" style={s.emailLink}>Privacy Policy</Link>.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>5. In-App Content & Conduct</div>
        <p style={s.body}>
          Content in Learn &amp; Play! is created for children and is moderated to the best of our ability. We do not
          permit abusive, hateful, or unsafe behavior. If you encounter content or behavior that concerns you, please
          contact us immediately.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>6. Third-Party Services</div>
        <p style={s.body}>
          The App may integrate third-party providers (such as analytics or the Apple App Store). These third parties
          have their own terms and privacy practices. We are not responsible for their content or practices.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>7. Disclaimer of Warranties</div>
        <p style={s.body}>
          The App is provided "as is" without warranties of any kind. We do not guarantee the App will be error-free
          or uninterrupted.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>8. Changes to These Terms</div>
        <p style={s.body}>
          We may update these Terms from time to time. We will notify users of material changes in the App or by other
          reasonable means. Continued use after changes constitutes acceptance of the updated Terms.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>9. Contact Us</div>
        <div style={s.contactBox}>
          <p style={{ ...s.body, margin: 0 }}>
            Questions about these Terms? Email us at{' '}
            <a href="mailto:patrick@bullionventuresllc.com" style={s.emailLink}>patrick@bullionventuresllc.com</a>
          </p>
        </div>
      </div>

      <div style={s.footer}>
        <p style={{ margin: '0 0 4px' }}>© 2026 Bullion Ventures LLC</p>
        <div style={s.footerLinks}>
          <Link to="/learn-and-play" style={s.footerLink}>Learn &amp; Play!</Link>
          <Link to="/learn-and-play/privacy" style={s.footerLink}>Privacy Policy</Link>
          <Link to="/learn-and-play/support" style={s.footerLink}>Support</Link>
          <Link to="/" style={s.footerLink}>Bullion Ventures</Link>
        </div>
      </div>
    </div>
  );
}
