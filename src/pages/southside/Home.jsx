import { Link } from 'react-router-dom';
import { c, shell as s, SANS } from './theme.js';

const styles = {
  hero: {
    padding: '72px 24px 64px',
    textAlign: 'center',
    background: `linear-gradient(165deg, ${c.green} 0%, ${c.greenDeep} 100%)`,
    borderBottom: `3px solid ${c.gold}`,
  },
  icon: {
    width: 104,
    height: 104,
    borderRadius: 24,
    display: 'block',
    margin: '0 auto 22px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.28)',
  },
  heroTitle: { fontSize: 36, fontWeight: 700, margin: '0 0 8px', color: c.cream, letterSpacing: '-0.015em' },
  heroPlace: { fontSize: 15, color: c.gold, margin: '0 0 22px', fontWeight: 600, letterSpacing: '0.04em' },
  heroLede: {
    fontSize: 17.5,
    color: 'rgba(255,248,235,0.86)',
    lineHeight: 1.7,
    maxWidth: 520,
    margin: '0 auto 28px',
  },
  badge: {
    display: 'inline-block',
    background: c.goldSoft,
    color: c.greenDeep,
    borderRadius: 999,
    padding: '8px 18px',
    fontSize: 13.5,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  content: { maxWidth: 860, margin: '0 auto', padding: '56px 24px 72px' },
  lead: {
    fontSize: 17,
    color: c.text,
    lineHeight: 1.75,
    maxWidth: 660,
    margin: '0 auto 8px',
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
    marginTop: 44,
  },
  card: {
    background: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    padding: '22px 22px 24px',
  },
  cardEmoji: { fontSize: 26, display: 'block', marginBottom: 12 },
  cardTitle: { fontSize: 16.5, fontWeight: 700, color: c.text, marginBottom: 7 },
  cardBody: { fontSize: 14.5, color: c.subtext, lineHeight: 1.68, margin: 0 },
  band: {
    marginTop: 56,
    background: c.card,
    border: `1px solid ${c.border}`,
    borderLeft: `4px solid ${c.gold}`,
    borderRadius: 14,
    padding: '26px 28px',
  },
  bandTitle: { fontSize: 18, fontWeight: 700, color: c.green, marginBottom: 10 },
  links: {
    marginTop: 52,
    paddingTop: 28,
    borderTop: `1px solid ${c.border}`,
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  linkBtn: {
    background: c.card,
    border: `1px solid ${c.border}`,
    color: c.green,
    borderRadius: 12,
    padding: '12px 22px',
    fontWeight: 700,
    fontSize: 14.5,
    textDecoration: 'none',
    fontFamily: SANS,
  },
  linkBtnPrimary: {
    background: c.green,
    border: `1px solid ${c.green}`,
    color: c.cream,
  },
};

const FEATURES = [
  {
    emoji: '📖',
    title: 'Sunday, in your pocket',
    body: "Service times, this week's bulletin, announcements, and the sermon outline — with a private notes box that saves as you follow along.",
  },
  {
    emoji: '📅',
    title: 'The whole calendar',
    body: 'Every event with details and location. RSVP for your family, claim a volunteer slot or a dish to bring, and share an event with someone who does not have the app.',
  },
  {
    emoji: '📷',
    title: 'The church family feed',
    body: 'Photos and news from the people you sit with on Sunday. Every member post is reviewed by church staff before the congregation sees it.',
  },
  {
    emoji: '🙏',
    title: 'Prayer that gets prayed',
    body: 'Post a request — by name or anonymously — and see who is praying. Mark it answered and everyone who prayed gets to celebrate with you.',
  },
  {
    emoji: '💬',
    title: 'Ministry groups',
    body: 'Sunday school classes, ministries, and committees each get a conversation. There is no one-on-one messaging, on purpose.',
  },
  {
    emoji: '👋',
    title: 'A door for visitors',
    body: 'No account needed to look around. Browse as a guest, see what to expect, plan a visit, or ask for prayer before you ever walk in.',
  },
];

export default function SouthsideHome() {
  return (
    <div style={s.page}>
      <div style={styles.hero}>
        <img src="/images/app-icons/southside.png" alt="Southside Baptist Church app icon" style={styles.icon} />
        <h1 style={styles.heroTitle}>Southside Baptist Church</h1>
        <p style={styles.heroPlace}>PORT NECHES, TEXAS</p>
        <p style={styles.heroLede}>
          The congregation app for Southside — the calendar, the bulletin, prayer, and the people, all in one place.
        </p>
        <span style={styles.badge}>Committed to Faith, Family, &amp; Fellowship since 1957</span>
      </div>

      <div style={styles.content}>
        <p style={styles.lead}>
          Whether you have been a member for forty years or you are thinking about visiting this Sunday, the app keeps
          you connected to what is happening at Southside.
        </p>

        <div style={styles.grid}>
          {FEATURES.map((f) => (
            <div key={f.title} style={styles.card}>
              <span style={styles.cardEmoji}>{f.emoji}</span>
              <div style={styles.cardTitle}>{f.title}</div>
              <p style={styles.cardBody}>{f.body}</p>
            </div>
          ))}
        </div>

        <div style={styles.band}>
          <div style={styles.bandTitle}>A private church family</div>
          <p style={{ ...s.body, margin: 0 }}>
            Member accounts are approved by church staff, so the feed, the prayer wall, and group conversations stay
            inside the congregation. Nothing a member posts is public. Any content can be reported or blocked, and you
            can delete your account and everything in it from inside the app at any time. Giving links out to the
            church&apos;s own secure giving page — the app never handles payment details.
          </p>
        </div>

        <div style={styles.links}>
          <a
            href="https://www.southsideportneches.org/"
            target="_blank"
            rel="noreferrer"
            style={{ ...styles.linkBtn, ...styles.linkBtnPrimary }}
          >
            Church website
          </a>
          <Link to="/southside/support" style={styles.linkBtn}>
            Support
          </Link>
          <Link to="/southside/privacy" style={styles.linkBtn}>
            Privacy Policy
          </Link>
          <a href="tel:+14097227550" style={styles.linkBtn}>
            (409) 722-7550
          </a>
        </div>
      </div>
    </div>
  );
}
