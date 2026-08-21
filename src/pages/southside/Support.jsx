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
    background: c.green,
    color: c.cream,
    padding: '13px 28px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 15,
    textDecoration: 'none',
    fontFamily: SANS,
  },
  phone: { display: 'block', marginTop: 16, fontSize: 14.5, color: c.subtext },
  phoneLink: { color: c.green, fontWeight: 700, textDecoration: 'none' },
  groupTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: c.green,
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
        q: 'I signed up but the app says my account is waiting for approval.',
        a: "That's expected. This is a private congregation app, so church staff approve each new member by hand. The screen re-checks every few seconds and unlocks the moment you're approved — you don't need to close the app or sign in again. If it's been more than a day or two, call the church office.",
      },
      {
        q: 'Do I need an account just to look around?',
        a: 'No. Tap "Just visiting? Browse as a guest" on the welcome screen and you can see service times, the calendar, the bulletin, ministries, and staff without creating anything. You can also plan a visit or ask for prayer as a guest.',
      },
      {
        q: 'I forgot my password.',
        a: 'On the Sign In screen, tap "Forgot your password?". Enter the email you signed up with and we\u2019ll send you a 6-digit code — type it into the app along with a new password and you\u2019re back in. The code lasts 15 minutes. If nothing arrives, check your junk folder; the email comes from Southside Baptist Church. Still stuck? Call the church office.',
      },
    ],
  },
  {
    group: 'Posting and photos',
    faqs: [
      {
        q: 'I shared a post and nobody else can see it.',
        a: 'Member posts are reviewed by church staff before they go out to the congregation. Your own copy shows a PENDING APPROVAL badge until then, and you get a notification when it goes live. Posts from staff publish immediately.',
      },
      {
        q: 'How many photos can I attach?',
        a: 'Up to four per post. Tap Photos to pick from your library or Camera to take one, then tap Share in the top right.',
      },
      {
        q: 'The app is not letting me pick a photo.',
        a: 'Check iOS Settings → Privacy & Security → Photos → Southside Baptist Church and allow access. For the camera, the same under Privacy & Security → Camera.',
      },
      {
        q: 'How do I delete something I posted?',
        a: 'Tap the ••• on your own post and choose Delete. That removes the post, its comments, and the photo files.',
      },
    ],
  },
  {
    group: 'Calendar, prayer, and groups',
    faqs: [
      {
        q: 'How do RSVPs and sign-up sheets work?',
        a: "Open an event from the Calendar and tap I'm going. Use the +N stepper to say how many are coming with you. If the event has a sign-up sheet — bringing a dish, filling a volunteer slot — the slots are listed underneath, and full slots are marked.",
      },
      {
        q: 'Can I invite someone who does not have the app?',
        a: "Yes. Open the event and tap Invite someone. That produces a normal web page for the event you can text or post to Facebook, with an Add to Calendar file attached. They don't need an account to open it.",
      },
      {
        q: 'What is the difference between the prayer wall and prayer requests?',
        a: 'The prayer wall is for members to post and pray for one another inside the app. Prayer Requests is the shared list that guests and members submit — you can send one privately to pastoral staff, or tick "Share with the congregation" to put it on the list where others can tap "I\'ll pray."',
      },
      {
        q: 'A prayer request I shared disappeared.',
        a: 'Requests shared with the congregation are deleted automatically after 7 days. Each one shows its countdown while it is up. Private requests sent to pastoral staff are not deleted on a timer.',
      },
      {
        q: 'Can I message one person directly?',
        a: 'No, and that is on purpose. The app has ministry and class group conversations only, with no one-on-one messaging, as a safeguard for our students.',
      },
    ],
  },
  {
    group: 'Notifications, privacy, and account',
    faqs: [
      {
        q: "I'm not getting notifications.",
        a: 'Check iOS Settings → Notifications → Southside Baptist Church → Allow Notifications. Notifications are sent for new events and announcements, comments on your posts, group messages, prayer needs, and when a post of yours is approved.',
      },
      {
        q: 'How do I report something inappropriate, or block someone?',
        a: 'Press and hold any post, comment, group message, or prayer request. You can report it to church staff or block the person, which removes them from your feed, comments, and group conversations.',
      },
      {
        q: 'How do I delete my account?',
        a: 'More → your name → Delete My Account. It permanently removes your account, posts, comments, group messages, prayer requests, and your photo files. It cannot be undone.',
      },
      {
        q: 'How does giving work in the app?',
        a: "Give links out to the church's own secure giving page in your browser. The app never handles your card or bank details.",
      },
    ],
  },
];

export default function SouthsideSupport() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>🛟</span>
        <h1 style={s.headerTitle}>Support</h1>
        <p style={s.headerSubtitle}>
          Southside Baptist Church app — answers below, or reach a real person any time.
        </p>
      </div>

      <div style={s.content}>
        <div style={styles.contactCard}>
          <div style={styles.contactTitle}>Need a hand?</div>
          <p style={styles.contactDesc}>
            Email us and we&apos;ll get back to you. For anything about the church itself — membership, ministries,
            a pastoral need — the church office is the fastest route.
          </p>
          <a href="mailto:southside@bullionventuresllc.com" style={styles.emailBtn}>
            southside@bullionventuresllc.com
          </a>
          <span style={styles.phone}>
            Church office:{' '}
            <a href="tel:+14097227550" style={styles.phoneLink}>
              (409) 722-7550
            </a>
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

        <Link to="/southside" style={s.backLink}>
          ← Back to the Southside app
        </Link>
      </div>
    </div>
  );
}
