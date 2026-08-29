import { Link } from 'react-router-dom';
import { c, shell as s, SANS } from './theme.js';

const styles = {
  hero: {
    padding: '72px 24px 64px',
    textAlign: 'center',
    background: `linear-gradient(165deg, ${c.teal} 0%, ${c.tealDeep} 100%)`,
    borderBottom: `3px solid ${c.amber}`,
  },
  icon: {
    width: 104,
    height: 104,
    borderRadius: 24,
    display: 'block',
    margin: '0 auto 22px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.28)',
  },
  heroTitle: { fontSize: 36, fontWeight: 700, margin: '0 0 8px', color: c.card, letterSpacing: '-0.015em' },
  heroPlace: { fontSize: 15, color: c.amberSoft, margin: '0 0 22px', fontWeight: 600, letterSpacing: '0.04em' },
  heroLede: {
    fontSize: 17.5,
    color: 'rgba(255,255,255,0.86)',
    lineHeight: 1.7,
    maxWidth: 540,
    margin: '0 auto 28px',
  },
  badge: {
    display: 'inline-block',
    background: c.amberSoft,
    color: c.tealDeep,
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
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
    marginTop: 44,
  },
  roleCard: {
    background: c.card,
    border: `1px solid ${c.border}`,
    borderTop: `3px solid ${c.teal}`,
    borderRadius: 16,
    padding: '22px 22px 24px',
  },
  roleEmoji: { fontSize: 26, display: 'block', marginBottom: 12 },
  roleTitle: { fontSize: 16.5, fontWeight: 700, color: c.text, marginBottom: 7 },
  roleBody: { fontSize: 14.5, color: c.subtext, lineHeight: 1.68, margin: 0 },
  sectionHead: {
    fontSize: 22,
    fontWeight: 700,
    color: c.teal,
    textAlign: 'center',
    marginTop: 64,
    marginBottom: 6,
  },
  sectionSub: { fontSize: 15, color: c.subtext, textAlign: 'center', margin: '0 auto', maxWidth: 560, lineHeight: 1.7 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
    marginTop: 32,
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
    borderLeft: `4px solid ${c.amber}`,
    borderRadius: 14,
    padding: '26px 28px',
  },
  bandTitle: { fontSize: 18, fontWeight: 700, color: c.teal, marginBottom: 10 },
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
    color: c.teal,
    borderRadius: 12,
    padding: '12px 22px',
    fontWeight: 700,
    fontSize: 14.5,
    textDecoration: 'none',
    fontFamily: SANS,
  },
  linkBtnPrimary: {
    background: c.teal,
    border: `1px solid ${c.teal}`,
    color: c.card,
  },
};

const ROLES = [
  {
    emoji: '🏠',
    title: 'Customers',
    body: 'Book a cleaning in about a minute, then watch it move — confirmed, on the way, in progress, done. Save your addresses with the gate code and the dog’s name, set it to repeat weekly, and rate the clean when it’s finished.',
  },
  {
    emoji: '🧽',
    title: 'Cleaners',
    body: 'Your day, in order, the moment you open the app. One tap tells the customer you’re on the way, another starts the job, and the checklist for that exact service is already waiting. Mark the days you can’t work and your owner is warned before they book you.',
  },
  {
    emoji: '📋',
    title: 'Company owners',
    body: 'Every request lands on your board with the price already filled in from your menu. Assign a cleaner, see the whole week at a glance, keep a book of business, and know what you made and who worked how many hours.',
  },
];

const FEATURES = [
  {
    emoji: '🔁',
    title: 'Repeating cleanings that repeat themselves',
    body: 'Weekly, every two weeks, or monthly. Each morning the next cleaning is added to the board a week ahead, priced from your menu with its checklist attached. Pause a plan when a customer travels; resume it when they’re back.',
  },
  {
    emoji: '✅',
    title: 'Your services, your prices, your checklists',
    body: 'Build the menu once — name, price, rough duration, and the list of what gets done. It prices new requests automatically and the checklist is copied onto every job for the cleaner to tick off on site.',
  },
  {
    emoji: '📸',
    title: 'Before-and-after photos',
    body: 'Proof of the work, attached to the job it belongs to. Useful the day a customer remembers the kitchen differently than it was.',
  },
  {
    emoji: '💬',
    title: 'Chat on the job, not in ten group texts',
    body: 'One thread per cleaning, shared by the customer, the cleaner, and the owner. Everything about Tuesday’s clean is on Tuesday’s clean. Reporting and blocking are built in.',
  },
  {
    emoji: '⭐',
    title: 'Ratings that roll up',
    body: 'Customers rate a finished clean out of five. It becomes your company’s public average, each cleaner’s average, and each customer’s — so you can see who your best cleaner is instead of guessing.',
  },
  {
    emoji: '💵',
    title: 'Revenue and hours, without a spreadsheet',
    body: 'Completed, collected, and still owed for the last 30 days, week by week, plus jobs and hours per cleaner drawn from the times they actually started and finished.',
  },
];

export default function MaidlyHome() {
  return (
    <div style={s.page}>
      <div style={styles.hero}>
        <img src="/images/app-icons/maidly.png" alt="Maidly app icon" style={styles.icon} />
        <h1 style={styles.heroTitle}>Maidly</h1>
        <p style={styles.heroPlace}>FOR CLEANING COMPANIES AND THEIR CUSTOMERS</p>
        <p style={styles.heroLede}>
          One app for the whole job — the customer who booked it, the cleaner doing it, and the owner running the
          board.
        </p>
        <span style={styles.badge}>No card required · No commission · Free</span>
      </div>

      <div style={styles.content}>
        <p style={styles.lead}>
          Most cleaning companies run on a group text, a paper calendar, and somebody&apos;s memory. Maidly replaces
          all three without asking you to change how you get paid.
        </p>

        <div style={styles.roleGrid}>
          {ROLES.map((r) => (
            <div key={r.title} style={styles.roleCard}>
              <span style={styles.roleEmoji}>{r.emoji}</span>
              <div style={styles.roleTitle}>{r.title}</div>
              <p style={styles.roleBody}>{r.body}</p>
            </div>
          ))}
        </div>

        <div style={styles.sectionHead}>What&apos;s in it</div>
        <p style={styles.sectionSub}>
          Everything below is in the app and on the website today — same account, same jobs, either one.
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
          <div style={styles.bandTitle}>You keep getting paid the way you already do</div>
          <p style={{ ...s.body, margin: 0 }}>
            Maidly never asks anyone for a card number and takes no cut of anything. Customers pay their cleaning
            company directly — cash, check, Venmo, an invoice, whatever the two of them already arranged — and
            &ldquo;Mark as Paid&rdquo; is simply the owner writing it in their own books. Every company on Maidly is
            its own sealed island: no company can see another&apos;s customers, jobs, or messages, and there is no
            global administrator looking over anyone&apos;s shoulder.
          </p>
        </div>

        <div style={styles.links}>
          <Link to="/maidly/walkthrough" style={{ ...styles.linkBtn, ...styles.linkBtnPrimary }}>
            See how it works
          </Link>
          <Link to="/maidly/support" style={styles.linkBtn}>
            Support &amp; FAQ
          </Link>
          <Link to="/maidly/privacy" style={styles.linkBtn}>
            Privacy Policy
          </Link>
          <Link to="/maidly/terms" style={styles.linkBtn}>
            Terms of Service
          </Link>
          <a href="mailto:maidly@bullionventuresllc.com" style={styles.linkBtn}>
            maidly@bullionventuresllc.com
          </a>
        </div>
      </div>
    </div>
  );
}
