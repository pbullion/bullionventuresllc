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
  highlight: {
    background: '#1a1a2e',
    border: '1px solid #2a2a45',
    borderRadius: 10,
    padding: '16px 20px',
    marginBottom: 16,
  },
};

export default function LearnPrivacy() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🔒</span>
        <h1 style={styles.headerTitle}>Privacy Policy</h1>
        <p style={styles.headerMeta}>Learn & Play! · Last Updated: January 24, 2026</p>
      </div>

      <div style={styles.content}>
        <p style={styles.body}>
          This Privacy Policy explains how our children's game ("Application," "we," "us," "our") collects, uses, discloses,
          and safeguards your information when you use our mobile application.
        </p>
        <p style={styles.body}>
          Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do not use
          our Application.
        </p>

        <div style={styles.sectionTitle}>1. Information We Collect</div>

        <div style={styles.subTitle}>Information You Provide Directly</div>
        <ul style={styles.list}>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>Device Information:</strong> Device identifiers, device type, operating system, and device settings</li>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>Usage Data:</strong> Game progress, scores, preferences, and gameplay analytics</li>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>Communication Data:</strong> If you contact us, we may collect your name, email, and message content</li>
        </ul>

        <div style={styles.subTitle}>Information Collected Automatically</div>
        <ul style={styles.list}>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>Log Data:</strong> IP address, device type, pages visited, time stamps, and clickstream data</li>
          <li style={styles.listItem}><strong style={{ color: '#c0c0d8' }}>Cookies and Similar Technologies:</strong> We may use cookies or similar tracking technologies to enhance user experience</li>
        </ul>

        <div style={styles.subTitle}>Third-Party Services</div>
        <p style={styles.body}>
          Our Application may integrate with third-party services (e.g., analytics providers, ad networks). Please review
          their privacy policies as we are not responsible for their practices.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>2. Children's Privacy Protection</div>
        <div style={styles.highlight}>
          <p style={{ ...styles.body, color: '#f0f0f5', fontWeight: 600, margin: '0 0 8px' }}>Our Commitment to Child Safety:</p>
          <ul style={{ ...styles.list, margin: 0 }}>
            <li style={styles.listItem}>We comply with the Children's Online Privacy Protection Act (COPPA) and applicable laws</li>
            <li style={styles.listItem}>We do not knowingly collect personal information from children under 13 without parental consent</li>
            <li style={styles.listItem}>We do not sell, share, or rent children's personal information to third parties</li>
            <li style={styles.listItem}>Parents/guardians can request to review, delete, or refuse future collection of their child's information</li>
          </ul>
        </div>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>3. How We Use Your Information</div>
        <p style={styles.body}>We use collected information to:</p>
        <ul style={styles.list}>
          <li style={styles.listItem}>Operate and improve the Application</li>
          <li style={styles.listItem}>Provide customer support</li>
          <li style={styles.listItem}>Send technical notices and updates</li>
          <li style={styles.listItem}>Monitor and analyze usage patterns and trends</li>
          <li style={styles.listItem}>Customize content and recommendations</li>
          <li style={styles.listItem}>Comply with legal obligations</li>
        </ul>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>4. Data Sharing</div>
        <p style={styles.body}>
          We do <strong style={{ color: '#f0f0f5' }}>not</strong> sell, trade, or rent personal information. However, we may share information:
        </p>
        <ul style={styles.list}>
          <li style={styles.listItem}>With service providers who assist in operating the Application</li>
          <li style={styles.listItem}>When required by law or legal process</li>
          <li style={styles.listItem}>To protect our rights, privacy, safety, or property</li>
          <li style={styles.listItem}>With your consent</li>
        </ul>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>5. Data Security</div>
        <p style={styles.body}>
          We implement appropriate technical and organizational measures to protect information against unauthorized access,
          alteration, disclosure, or destruction. However, no method of transmission over the internet is completely secure.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>6. Data Retention</div>
        <p style={styles.body}>
          We retain information for as long as necessary to provide services and fulfill the purposes outlined in this
          Privacy Policy, unless a longer retention period is required by law.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>7. Your Rights and Choices</div>
        <p style={styles.body}>Depending on your location, you may have the right to:</p>
        <ul style={styles.list}>
          <li style={styles.listItem}>Access your personal information</li>
          <li style={styles.listItem}>Correct inaccurate data</li>
          <li style={styles.listItem}>Delete your information</li>
          <li style={styles.listItem}>Opt-out of data collection</li>
          <li style={styles.listItem}>Lodge complaints with relevant authorities</li>
        </ul>
        <p style={styles.body}>
          <strong style={{ color: '#c0c0d8' }}>For Parents/Guardians:</strong> Contact us if you wish to review, update, or
          delete your child's information.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>8. California Privacy Rights (CCPA)</div>
        <p style={styles.body}>
          If you are a California resident, you may have additional rights regarding your personal information under the
          California Consumer Privacy Act (CCPA).
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>9. European Privacy Rights (GDPR)</div>
        <p style={styles.body}>
          If you are located in the European Union, your information is protected under the General Data Protection
          Regulation (GDPR). We process information based on lawful grounds including parental consent for children.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>10. Third-Party Links</div>
        <p style={styles.body}>
          The Application may contain links to third-party websites and services. We are not responsible for their privacy
          practices. Please review their privacy policies before providing information.
        </p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>11. Contact Us</div>
        <p style={styles.body}>
          If you have questions about this Privacy Policy or our privacy practices, please contact us:
        </p>
        <div style={styles.contactBox}>
          <a href="mailto:patrick@bullionventuresllc.com" style={styles.emailLink}>patrick@bullionventuresllc.com</a>
        </div>
        <p style={{ ...styles.body, marginTop: 12 }}>We will respond to privacy inquiries within 30 days.</p>

        <hr style={styles.divider} />
        <div style={styles.sectionTitle}>12. Changes to This Privacy Policy</div>
        <p style={styles.body}>
          We may update this Privacy Policy from time to time. Changes will be effective immediately upon posting to the
          Application. Your continued use constitutes acceptance of the updated Privacy Policy.
        </p>

        <Link to="/learn-and-play" style={styles.backLink}>← Back to Learn & Play!</Link>
      </div>
    </div>
  );
}
