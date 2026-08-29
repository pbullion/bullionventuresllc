import { Link } from 'react-router-dom';
import { c, shell as s, SANS } from './theme.js';

const styles = {
  contactCard: {
    background: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    padding: '30px 28px',
    marginBottom: 36,
    textAlign: 'center',
  },
  contactTitle: { fontSize: 20, fontWeight: 700, color: c.text, marginBottom: 8 },
  contactDesc: { fontSize: 15, color: c.subtext, marginBottom: 20, lineHeight: 1.65 },
  emailBtn: {
    display: 'inline-block',
    background: c.teal,
    color: c.card,
    padding: '13px 28px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 15,
    textDecoration: 'none',
    fontFamily: SANS,
  },
  note: { display: 'block', marginTop: 16, fontSize: 14.5, color: c.subtext, lineHeight: 1.65 },
  groupTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: c.teal,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginTop: 40,
    marginBottom: 14,
  },
  faqItem: {
    marginBottom: 12,
    background: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    padding: '18px 20px',
  },
  faqQ: { fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 7 },
  faqA: { fontSize: 14.5, color: c.subtext, lineHeight: 1.7, margin: 0 },
};

const GROUPS = [
  {
    group: 'Getting in',
    faqs: [
      {
        q: 'Which one am I — customer, cleaner, or owner?',
        a: "Pick Customer if you want a house cleaned. Pick Cleaner if you work for a cleaning company that already uses Maidly. Pick Company Owner if you run the business. The sign-up form changes based on your answer, so choose before you fill anything in.",
      },
      {
        q: 'I run a cleaning company. How do I start?',
        a: 'Create an account as a Company Owner with your business name. Your company is created on the spot, with a starter service menu you can edit and a 6-character invite code for your cleaners. Your company then appears in the list customers pick from when they sign up.',
      },
      {
        q: "I'm a cleaner and it says my account is waiting for approval.",
        a: "That's expected. Your company's owner approves each cleaner by hand, and they get a notification the moment you sign up. The waiting screen re-checks every 15 seconds and unlocks itself — you don't need to close the app or sign in again. If it's been a while, ask your owner directly.",
      },
      {
        q: "Where do I get the invite code?",
        a: 'From your company’s owner — it is shown to them in the Team tab. Only owners can see it. If the code is rejected, check for the letter O versus the digit 0, and confirm your owner has not regenerated it.',
      },
      {
        q: "I can't find my cleaning company in the list.",
        a: "The list only shows companies that have signed up for Maidly. If yours isn't there, they haven't created their account yet — send them a link to this page.",
      },
      {
        q: 'I forgot my password.',
        a: 'Tap "Forgot password" on the sign-in screen. We email a 6-digit code that works once and expires after 15 minutes. Using it signs out any other sessions on your account. For your safety the screen looks the same whether or not the email has an account.',
      },
    ],
  },
  {
    group: 'Booking a cleaning',
    faqs: [
      {
        q: 'How do I book?',
        a: 'Tap "＋ Book a Cleaning" on the Jobs screen. Pick a service from your company’s real menu, pick a saved address or type a new one, pick a date and time, and choose how often — just once, weekly, every two weeks, or monthly. Notes like "gate code 1234, friendly dog" travel with the booking.',
      },
      {
        q: 'Am I charged when I book?',
        a: 'No. Maidly never asks for a card number and no money moves through the app. You pay your cleaning company directly, exactly how you already do. The price shown is set by that company.',
      },
      {
        q: 'How do I change or cancel a booking?',
        a: 'Open the job and ask to reschedule — your company’s owner accepts the new time or keeps the original, so nobody has to cancel and rebook. You can cancel outright any time before your cleaner is on the way. Their own cancellation policy still applies; that is between you and them.',
      },
      {
        q: 'How do I stop a repeating cleaning?',
        a: 'Profile → Recurring Plans → pause it. Pausing stops future cleanings from being added; it does not cancel one already on the board, so cancel that separately if you need to.',
      },
      {
        q: "How do I know when the cleaner is coming?",
        a: 'You get a notification at each step — when the job is confirmed, when your cleaner is on the way, when they start, and when they finish. On the website there are no push notifications, so refresh the page to see the current status.',
      },
    ],
  },
  {
    group: 'Working jobs (cleaners)',
    faqs: [
      {
        q: 'Where is my schedule?',
        a: 'The Jobs tab is your day — grouped Today, Tomorrow, then the rest of the week, with finished jobs sunk to the bottom. It is the screen to open every morning.',
      },
      {
        q: 'What are the three buttons on a job?',
        a: '🚗 On My Way, then Start, then Done. Each one notifies the customer and stamps a time. Those times are also your hours, so use the buttons rather than telling someone verbally — otherwise the hours never make it onto your timesheet.',
      },
      {
        q: 'How do I mark a day I cannot work?',
        a: 'Profile → My Time Off, and pick the dates. Your owner is warned if they try to schedule you that day. The reason box is optional — leave it blank if you would rather not say.',
      },
      {
        q: 'Do photos of the house go anywhere public?',
        a: 'They are not listed or published anywhere, and only your job’s customer and your owner are shown them in the app. But the photo files themselves sit at a long random web address that opens without a password, so keep photos to the room you are cleaning — never documents, mail, or anything personal you happen to see.',
      },
    ],
  },
  {
    group: 'Running the company (owners)',
    faqs: [
      {
        q: 'A request came in. What do I do with it?',
        a: 'Open it on the Jobs board. The price is already filled in from your service menu — adjust it if you like, then assign a cleaner, schedule it unassigned, or decline it. If you assign someone who marked that day off, you get a warning naming them and the date; you can override it deliberately.',
      },
      {
        q: 'How do I change my prices or my checklists?',
        a: 'Business → Services & Prices. Each service has a name, base price, rough duration, and its own checklist, one item per line. That checklist is copied onto every job booked for it. Deactivating a service hides it from new bookings without touching past jobs.',
      },
      {
        q: 'Where do I see what I made?',
        a: 'Business → Revenue & Hours: completed revenue, collected, and outstanding for the last 30 days, a by-week strip, and per-cleaner jobs, hours, and star rating. Business → Customers is your book of business, with lifetime value and history per customer.',
      },
      {
        q: 'Does Maidly take a cut or process payments?',
        a: 'Neither. "Mark as Paid" and the payment method are a line in your own ledger — nothing more. Your customers pay you directly, however you already arrange it.',
      },
      {
        q: 'Someone sent an inappropriate message. What happens?',
        a: 'Anyone can report a message — press and hold in the app, double-click on the website — and it is hidden immediately, before you even look at it. It lands in Business → Reported Messages with a notification. You restore it or remove it for good, and your ruling is final. Anyone can also block another user, which closes the message channel between them; the block is reversible from Profile → Blocked Users.',
      },
    ],
  },
  {
    group: 'Your account and data',
    faqs: [
      {
        q: 'How do I delete my account?',
        a: 'Profile → Delete My Account, in the app or on the website. It is immediate and permanent, and does not require emailing anyone.',
      },
      {
        q: 'I am an owner — what happens if I delete mine?',
        a: 'Deleting an owner account deletes the entire company: the job board, services, customers, messages, and photos, for everyone in it. That is deliberate and it cannot be undone. Write down anything you need first.',
      },
      {
        q: 'Can another cleaning company see my customers?',
        a: 'No. Each company is sealed off from every other one, and the rules are enforced on the server rather than just hidden in the app. There is no global administrator.',
      },
      {
        q: 'Can I use the app and the website with the same account?',
        a: 'Yes — the same email and password work on both, and they show the same jobs. The only thing the website cannot do is push notifications, so statuses there update when you reload.',
      },
      {
        q: 'Does Maidly track my location?',
        a: 'No. Maidly never reads your device location. An address is only ever text somebody typed.',
      },
    ],
  },
];

export default function MaidlySupport() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>🛟</span>
        <h1 style={s.headerTitle}>Support</h1>
        <p style={s.headerSubtitle}>
          Maidly — answers below, or reach a real person any time.
        </p>
      </div>

      <div style={s.content}>
        <div style={styles.contactCard}>
          <div style={styles.contactTitle}>Need a hand?</div>
          <p style={styles.contactDesc}>
            Email us and we&apos;ll get back to you. For anything about a specific cleaning — the price, the schedule,
            a problem with the work — your cleaning company is the fastest route, since they run their own business.
          </p>
          <a href="mailto:maidly@bullionventuresllc.com" style={styles.emailBtn}>
            maidly@bullionventuresllc.com
          </a>
          <span style={styles.note}>
            Maidly is made by Bullion Ventures LLC. We build the software; the cleaning companies using it are
            independent businesses.
          </span>
        </div>

        {GROUPS.map((g) => (
          <div key={g.group}>
            <div style={styles.groupTitle}>{g.group}</div>
            {g.faqs.map((faq) => (
              <div key={faq.q} style={styles.faqItem}>
                <div style={styles.faqQ}>{faq.q}</div>
                <p style={styles.faqA}>{faq.a}</p>
              </div>
            ))}
          </div>
        ))}

        <Link to="/maidly" style={s.backLink}>
          ← Back to Maidly
        </Link>
      </div>
    </div>
  );
}
