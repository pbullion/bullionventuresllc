import { Link } from 'react-router-dom';
import { c, shell as s, SANS } from './theme.js';

// The visual walkthrough that southside-app/docs/APP-FLOW.md was always written
// to become. That file is the source of truth and is updated in the same commit
// as any feature change — if the app changes and this page isn't updated to
// match, the flow log is where to look for what's actually true.
//
// Organised by the three parties who use the app, because "what can I do?"
// depends entirely on which one you are, and a feature-by-feature tour would
// make a visitor read about the admin queue.

const styles = {
  hero: {
    textAlign: 'center',
    background: `linear-gradient(165deg, ${c.green} 0%, ${c.greenDeep} 100%)`,
    borderBottom: `3px solid ${c.gold}`,
  },
  icon: { width: 84, height: 84, borderRadius: 20, display: 'block', margin: '0 auto 20px', boxShadow: '0 10px 30px rgba(0,0,0,0.28)' },
  heroTitle: { fontWeight: 700, margin: '0 0 10px', color: c.cream, letterSpacing: '-0.015em' },
  heroLede: { color: 'rgba(255,248,235,0.86)', lineHeight: 1.68, maxWidth: 540, margin: '0 auto' },

  nav: {
    position: 'sticky',
    // The site navbar is sticky at top:0 and 60px tall (components/Navbar.jsx),
    // so this row has to start where that one ends. At top:0 it slid under the
    // navbar and the first line of chips was unreachable on a phone, where the
    // row wraps to two lines.
    top: 60,
    zIndex: 9,
    background: 'rgba(255,248,235,0.94)',
    backdropFilter: 'blur(8px)',
    borderBottom: `1px solid ${c.border}`,
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  navLink: {
    fontWeight: 700,
    color: c.green,
    textDecoration: 'none',
    borderRadius: 999,
    border: `1px solid ${c.border}`,
    background: c.card,
    fontFamily: SANS,
  },

  wrap: { maxWidth: 940, margin: '0 auto' },

  audience: { marginTop: 64 },
  audienceHead: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8 },
  audienceEmoji: { fontSize: 38, lineHeight: 1 },
  audienceTitle: { fontWeight: 700, color: c.green, margin: '0 0 6px' },
  audienceLede: { fontSize: 16, color: c.subtext, lineHeight: 1.7, margin: 0 },

  step: {
    display: 'grid',
    gap: 20,
    background: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 18,
    padding: 24,
    marginTop: 20,
    alignItems: 'center',
  },
  stepTitle: { fontSize: 19, fontWeight: 700, color: c.text, margin: '0 0 10px' },
  stepBody: { fontSize: 15.5, color: c.subtext, lineHeight: 1.78, margin: '0 0 10px' },

  phoneFrame: {
    width: '100%',
    margin: '0 auto',
    borderRadius: 22,
    overflow: 'hidden',
    border: `1px solid ${c.border}`,
    boxShadow: '0 8px 26px rgba(32,48,43,0.14)',
    display: 'block',
  },
  tabFrame: {
    width: '100%',
    margin: '0 auto',
    borderRadius: 14,
    overflow: 'hidden',
    border: `1px solid ${c.border}`,
    boxShadow: '0 8px 26px rgba(32,48,43,0.14)',
    display: 'block',
  },

  note: {
    background: c.goldSoft,
    borderLeft: `4px solid ${c.gold}`,
    borderRadius: 10,
    padding: '14px 18px',
    margin: '14px 0 0',
    fontSize: 14.5,
    color: c.text,
    lineHeight: 1.7,
  },

  tableWrap: { marginTop: 24, border: `1px solid ${c.border}`, borderRadius: 16, background: c.card },

  ruleGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14, marginTop: 22 },
  rule: { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: '18px 20px' },
  ruleTitle: { fontSize: 15.5, fontWeight: 700, color: c.text, marginBottom: 6 },
  ruleBody: { fontSize: 14, color: c.subtext, lineHeight: 1.68, margin: 0 },

  links: { marginTop: 56, paddingTop: 30, borderTop: `1px solid ${c.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
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
};

// Anything that has to CHANGE at a breakpoint lives here rather than in the
// inline `styles` object above — inline styles can't hold a media query, and an
// inline value silently wins over a class, so a property belongs in exactly one
// of the two places. Same split Home.jsx uses.
const SW_CSS = `
.sw-hero { padding: 72px 24px 56px; }
.sw-hero-title { font-size: 34px; }
.sw-hero-lede { font-size: 17px; }
.sw-nav { padding: 12px 16px; }
.sw-nav a { font-size: 14px; padding: 8px 16px; }
.sw-wrap { padding: 0 24px 80px; }

/* Two sticky rows sit above the content — the 60px site navbar and this page's
   own nav — so an anchored section has to clear both of them. */
.sw-audience { scroll-margin-top: 126px; }
.sw-audience-title { font-size: 27px; }

.sw-step { grid-template-columns: minmax(0, 1fr); }
.sw-step-shot { grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); }
.sw-shot { max-width: 260px; }
.sw-shot-tab { max-width: 420px; }

.sw-tablewrap { overflow-x: auto; }
.sw-table { width: 100%; border-collapse: collapse; min-width: 560px; }
.sw-table th {
  text-align: left;
  font-size: 13px;
  font-weight: 800;
  color: ${c.green};
  padding: 14px 16px;
  border-bottom: 1px solid ${c.border};
  white-space: nowrap;
}
.sw-table td {
  font-size: 14.5px;
  color: ${c.subtext};
  padding: 13px 16px;
  border-bottom: 1px solid ${c.border};
  line-height: 1.55;
}
.sw-table th.sw-col, .sw-table td.sw-mark { text-align: center; }
.sw-table td.sw-mark { font-size: 15px; }

@media (max-width: 720px) {
  .sw-hero { padding: 48px 20px 40px; }
  .sw-hero-title { font-size: 27px; }
  .sw-hero-lede { font-size: 15.5px; }
  .sw-nav { padding: 10px 12px; gap: 6px; }
  .sw-nav a { font-size: 13px; padding: 7px 12px; }
  .sw-wrap { padding: 0 16px 56px; }
  .sw-audience { scroll-margin-top: 172px; }
  .sw-audience-title { font-size: 23px; }

  /* A phone gets one column: the screenshot under the words it illustrates,
     not beside them. Side by side at 390px left the copy five words wide and
     the screenshot too small to read. */
  .sw-step-shot { grid-template-columns: minmax(0, 1fr); }
  .sw-shot { max-width: 300px; }

  /* The comparison table stops being a table and becomes one block per row.
     It is 560px wide at its narrowest, so on a phone the Member and Staff
     columns were simply off the side of the screen with nothing to say so. */
  .sw-tablewrap { overflow-x: visible; }
  .sw-table { min-width: 0; }
  .sw-table thead { display: none; }
  .sw-table tbody, .sw-table tr, .sw-table td { display: block; }
  .sw-table tr { padding: 12px 16px; border-bottom: 1px solid ${c.border}; }
  .sw-table tr:last-child { border-bottom: none; }
  .sw-table td { padding: 3px 0; border-bottom: none; }
  .sw-table td.sw-rowhead { font-size: 15px; font-weight: 700; color: ${c.text}; padding-bottom: 7px; }
  .sw-table td.sw-cell, .sw-table td.sw-mark {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 14px;
    text-align: left;
  }
  /* The column heading each value belonged to, carried down onto the value. */
  .sw-table td.sw-cell::before, .sw-table td.sw-mark::before {
    content: attr(data-role);
    font-size: 13px;
    font-weight: 800;
    color: ${c.green};
  }
}
`;

const IMG = '/images/southside/walkthrough';

function Shot({ src, alt, tablet }) {
  return (
    <img
      src={src}
      alt={alt}
      className={tablet ? 'sw-shot-tab' : 'sw-shot'}
      style={tablet ? styles.tabFrame : styles.phoneFrame}
      loading="lazy"
    />
  );
}

function Step({ title, shot, alt, tablet, children }) {
  return (
    <div className={shot ? 'sw-step sw-step-shot' : 'sw-step'} style={styles.step}>
      <div>
        <h3 style={styles.stepTitle}>{title}</h3>
        {children}
      </div>
      {shot ? <Shot src={shot} alt={alt} tablet={tablet} /> : null}
    </div>
  );
}

const COLUMNS = ['Guest', 'Member', 'Staff'];

const ROLES = [
  ['How you get in', 'Tap “Browse as a guest”', 'Sign up, staff approve you', 'A member staff promoted'],
  ['Service times, calendar, bulletin, sermons, staff', true, true, true],
  ['Plan a visit, ask for prayer', true, true, true],
  ['The feed, prayer wall, group chats, RSVP, sermon notes', false, true, true],
  ['Search, reading plan, care team, serving schedule', false, true, true],
  ['Filter by ministry, choose your notifications', false, true, true],
  ['Write sermons, start meal trains, set the serving rota', false, false, true],
  ['Approve people and posts, publish, send notifications', false, false, true],
];

const RULES = [
  ['Members only, by approval', 'Church staff approve every account by hand. Nothing a member posts is ever public.'],
  ['No private messaging', 'Conversation happens in named ministry and class groups only. This is a deliberate safeguard for students, not an oversight.'],
  ['One report takes it down', 'Posts go out to the congregation right away. If any member reports one it leaves the feed immediately — before staff have even read the report — and stays off until they put it back or delete it.'],
  ['Report and block, everywhere', 'Press and hold any post, comment, message or prayer request \u2014 including the ones visitors share with the congregation, which come off the wall the moment anyone reports them. Blocked people disappear from your feed, comments and groups.'],
  ['Delete everything, yourself', 'More → your name → Delete My Account removes your account, posts, comments, messages and the actual photo files. No email required.'],
  ['Children stay out of feeds', 'Kids’ ages and guest contact details appear only in staff screens — never in the feed, never on the calendar.'],
  ['Giving links out', 'Give opens the church’s own secure giving page in your browser. The app never handles card or bank details.'],
  ['We never confirm who’s a member', 'Ask to reset a password and the app answers the same way whether or not that address has an account. Confirming it would leak who belongs to the church.'],
  ['Prayer requests expire', 'Requests shared with the congregation are deleted automatically after 7 days, with a countdown on each one.'],
];

export default function SouthsideWalkthrough() {
  return (
    <div style={s.page}>
      <style>{SW_CSS}</style>

      <div className="sw-hero" style={styles.hero}>
        <img src="/images/app-icons/southside.png" alt="Southside Baptist Church app icon" style={styles.icon} />
        <h1 className="sw-hero-title" style={styles.heroTitle}>How the app works</h1>
        <p className="sw-hero-lede" style={styles.heroLede}>
          A walk through the Southside Baptist Church app — what you see, and what you can do, depending on whether
          you’re visiting, a member, or on staff.
        </p>
      </div>

      <div className="sw-nav" style={styles.nav}>
        <a href="#visitors" style={styles.navLink}>👋 Visiting</a>
        <a href="#members" style={styles.navLink}>🙋 Members</a>
        <a href="#staff" style={styles.navLink}>🔑 Church staff</a>
        <a href="#safety" style={styles.navLink}>🔒 Safety</a>
      </div>

      <div className="sw-wrap" style={styles.wrap}>
        <div className="sw-tablewrap" style={styles.tableWrap}>
          <table className="sw-table">
            <thead>
              <tr>
                <th> </th>
                {COLUMNS.map((col) => (
                  <th key={col} className="sw-col">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((row) => (
                <tr key={row[0]}>
                  <td className="sw-rowhead">{row[0]}</td>
                  {row.slice(1).map((v, i) => (
                    /* data-role is what the stacked phone layout prints in
                       front of each value — without the header row there is
                       otherwise nothing saying which column a ✅ belonged to. */
                    <td key={COLUMNS[i]} data-role={COLUMNS[i]} className={typeof v === 'string' ? 'sw-cell' : 'sw-mark'}>
                      {typeof v === 'string' ? v : v ? '✅' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── VISITORS ─────────────────────────────────────────────────────── */}
        <section id="visitors" className="sw-audience" style={styles.audience}>
          <div style={styles.audienceHead}>
            <span style={styles.audienceEmoji}>👋</span>
            <div>
              <h2 className="sw-audience-title" style={styles.audienceTitle}>If you’re visiting</h2>
              <p style={styles.audienceLede}>
                You don’t need an account to look around. Nobody has to know you’re there until you want them to.
              </p>
            </div>
          </div>

          <Step title="Open it and look around" shot={`${IMG}/phone-01-welcome.jpg`} alt="The app's welcome screen">
            <p style={styles.stepBody}>
              The first screen is the church itself — their building, their words, and the service times laid out day by
              day so you know when to turn up.
            </p>
            <p style={styles.stepBody}>
              Three ways in: sign in, join the church family, or <strong style={s.strong}>browse as a guest</strong> —
              no account, no email, nothing to fill in.
            </p>
          </Step>

          <Step title="See what’s on before you come" shot={`${IMG}/phone-03-calendar.png`} alt="The church calendar">
            <p style={styles.stepBody}>
              Guests get the church calendar, the bulletin, sermon notes, the ministries, and the staff — everything the
              church publishes on purpose. Tap any event for the details and where it is.
            </p>
          </Step>

          <Step title="Plan a visit, or ask for prayer">
            <p style={styles.stepBody}>
              <strong style={s.strong}>“First time? Plan a visit”</strong> asks when you’re coming and whether you’re
              bringing children, so somebody is expecting you and the nursery is ready. A “what to expect” card sits
              above the form — service times, how people dress, what happens with kids — so you don’t have to ask.
            </p>
            <p style={styles.stepBody}>
              <strong style={s.strong}>“Can we pray for you?”</strong> goes privately to pastoral staff. If you’d rather
              the whole church prayed, there’s a toggle for that.
            </p>
            <p style={styles.note}>
              What you write on either form is seen only by church staff. It never appears in the app’s feed, on the
              calendar, or anywhere else.
            </p>
          </Step>
        </section>

        {/* ── MEMBERS ──────────────────────────────────────────────────────── */}
        <section id="members" className="sw-audience" style={styles.audience}>
          <div style={styles.audienceHead}>
            <span style={styles.audienceEmoji}>🙋</span>
            <div>
              <h2 className="sw-audience-title" style={styles.audienceTitle}>If you’re a member</h2>
              <p style={styles.audienceLede}>
                Sign up, and church staff approve you by hand. Then the rest of the app opens up.
              </p>
            </div>
          </div>

          <Step title="Joining, and the wait">
            <p style={styles.stepBody}>
              Signing up takes a name, an email and a password. Then you’ll see a screen saying staff are reviewing —
              it re-checks by itself, so there’s nothing to refresh and no need to close the app. The moment somebody
              approves you, it unlocks.
            </p>
          </Step>

          <Step title="If you forget your password">
            <p style={styles.stepBody}>
              <strong style={s.strong}>Forgot your password?</strong> sits on the Sign In screen. Put in your email,
              and a 6-digit code arrives — type it in along with a new password and you’re back in. The code lasts
              fifteen minutes and works once.
            </p>
            <p style={styles.stepBody}>
              It’s a code rather than a tap-through link because the email is usually opened on a different device
              from the phone the app is on. And the app never tells anyone whether an address has an account — it
              says the same thing either way, because confirming it would give away who belongs to the church.
            </p>
            <p style={styles.stepBody}>
              Resetting also signs your other devices out. If a phone goes missing, changing your password is enough
              to lock it out of the app.
            </p>
          </Step>

          <Step title="The church family feed" shot={`${IMG}/phone-02-feed.png`} alt="The church feed">
            <p style={styles.stepBody}>
              Photos and news from the people you sit with on Sunday — up to four photos a post, with likes and
              comments. Somebody’s birthday puts a banner at the top.
            </p>
            <p style={styles.stepBody}>
              What you post goes out to the congregation right away — nobody has to release it first. If anyone
              reports a post, it comes off the feed <strong style={s.strong}>immediately</strong>, before staff have
              read the report, and stays off until they’ve looked and either put it back or removed it.
            </p>
          </Step>

          <Step title="RSVP, and sign-up sheets" shot={`${IMG}/phone-03-calendar.png`} alt="The calendar">
            <p style={styles.stepBody}>
              Tap <strong style={s.strong}>I’m going</strong> on any event, and use the +N stepper to say how many are
              coming with you. Potlucks and workdays have sign-up sheets underneath — bring a dessert, take a volunteer
              slot — and full slots are marked so two people don’t bring the same thing.
            </p>
            <p style={styles.stepBody}>
              <strong style={s.strong}>Invite someone</strong> turns any event into an ordinary web page you can text
              or post to Facebook, with an add-to-calendar file attached. They don’t need the app to open it.
            </p>
          </Step>

          <Step title="Prayer that actually gets prayed" shot={`${IMG}/phone-04-prayer.png`} alt="The prayer wall">
            <p style={styles.stepBody}>
              Post a request by name or anonymously, and see who’s praying. Mark it answered and everyone who prayed
              gets to celebrate with you.
            </p>
            <p style={styles.stepBody}>
              Requests shared with the congregation are deleted automatically after seven days, and each one shows its
              own countdown.
            </p>
            <p style={styles.stepBody}>
              Anyone can ask for prayer, with or without an account, so those shared requests can be reported the same
              way as anything else in the app — press and hold. One report takes the request off the wall straight
              away, before staff have read a word of it, and it stays off until they decide.
            </p>
          </Step>

          <Step title="Your people" shot={`${IMG}/phone-05-groups.png`} alt="Ministry groups">
            <p style={styles.stepBody}>
              Sunday school classes, ministries and committees each get their own conversation. Join the ones you’re
              part of and everyone else in the group hears from you.
            </p>
            <p style={styles.note}>
              There is no one-on-one messaging in this app, and there won’t be. It’s a deliberate safeguard for our
              students.
            </p>
          </Step>

          <Step title="Follow along on Sunday" shot={`${IMG}/phone-07-sermon-notes.png`} alt="Sermon notes">
            <p style={styles.stepBody}>
              The preacher’s outline, with blanks to fill in, and a notes box that’s yours alone. It saves as you type —
              you don’t have to remember to tap anything, and it survives a dropped signal in the building.
            </p>
            <p style={styles.stepBody}>
              Every passage he mentions is a link. Tap it and read it right there without losing your place.
            </p>
          </Step>

          <Step title="Read scripture in the app" shot={`${IMG}/tab-09-scripture.png`} alt="A Bible passage opened in the app" tablet>
            <p style={styles.stepBody}>
              Passages open in the World English Bible or the King James — both public domain, so they can be shown in
              full. For the translation preached from the pulpit, there’s a link straight out to YouVersion.
            </p>
          </Step>

          <Step title="Read through together" shot={`${IMG}/tab-10-reading-plan.png`} alt="The Bible reading plan" tablet>
            <p style={styles.stepBody}>
              When the church is reading through something together, the plan lives here with today’s reading marked
              and a tick for each day you finish.
            </p>
          </Step>

          <Step title="Show up for each other" shot={`${IMG}/tab-06-care-team.png`} alt="A meal train sign-up" tablet>
            <p style={styles.stepBody}>
              When a family has a baby, a surgery, or a loss, staff open a meal train and everyone takes one day. You
              can see what’s already covered, what the family needs to know, and you get a reminder the afternoon
              before your turn.
            </p>
          </Step>

          <Step title="Know when you’re serving" shot={`${IMG}/tab-07-serving.png`} alt="The serving schedule" tablet>
            <p style={styles.stepBody}>
              Nursery, greeters, sound booth, ushers. You see your own turns and nothing else, confirm you’ll be there
              or say you can’t, and get a reminder on Thursday — early enough that staff can find a swap.
            </p>
          </Step>

          <Step title="Decide what reaches your phone" shot={`${IMG}/tab-05-notifications.png`} alt="Notification preferences" tablet>
            <p style={styles.stepBody}>
              Eight switches — announcements, events, prayer, group messages, your own posts, the care team, serving,
              and birthdays — plus quiet hours to hold everything overnight.
            </p>
            <p style={styles.stepBody}>
              You can also switch off the ministries that aren’t yours. A parent of a teenager keeps Youth and drops
              Senior Adults. It only changes what buzzes your phone; everything stays on the calendar and in the
              bulletin either way.
            </p>
            <p style={styles.note}>
              Anything for the whole church always comes through. A funeral notice or a cancelled service shouldn’t
              depend on which ministries somebody follows.
            </p>
          </Step>
        </section>

        {/* ── STAFF ────────────────────────────────────────────────────────── */}
        <section id="staff" className="sw-audience" style={styles.audience}>
          <div style={styles.audienceHead}>
            <span style={styles.audienceEmoji}>🔑</span>
            <div>
              <h2 className="sw-audience-title" style={styles.audienceTitle}>If you’re church staff</h2>
              <p style={styles.audienceLede}>
                Everything below is in the app itself. None of it needs a developer, and none of it needs a computer.
              </p>
            </div>
          </div>

          <Step title="One screen for everything waiting on you">
            <p style={styles.stepBody}>
              <strong style={s.strong}>Staff To-Do</strong> is the first thing under Admin, and the More tab carries a
              number so you can see there’s something waiting without opening anything. Members to approve, reported
              posts pulled off the feed, anything else that was reported, visitors to follow up, prayer requests to
              pick up, serving spots and meal-train days nobody has taken, and a sermon still in draft with Sunday
              coming. Where somebody is waiting on you,
              the card tells you how long they’ve waited; where it’s a gap to fill, it tells you the date it falls due.
            </p>
            <p style={styles.stepBody}>
              Anything already dealt with collapses into a ticked-off list, so the screen tells you you’re finished
              rather than making you check six places to find that out. Underneath are one-tap shortcuts to send a
              notification, or start an announcement, an event, a sermon, a poll, a meal train or the serving schedule.
            </p>
          </Step>

          <Step title="Approve people, and handle what gets reported" shot={`${IMG}/phone-06-bulletin.png`} alt="The bulletin">
            <p style={styles.stepBody}>
              New signups wait in a queue and you get a notification. Posts don’t — they go straight out. What lands in
              front of you is anything a member <em>reported</em>: it has already left the feed automatically, and you
              see the post, who objected and what they said, then put it back or delete it. Putting it back tells the
              person who wrote it.
            </p>
            <p style={styles.stepBody}>
              Reported content lands in its own list, where you can remove the post and disable the account behind it.
              Disabling is reversible and is the usual answer; deleting an account outright is also there, for a spam
              signup or somebody who asks to be erased, and it takes their posts and photos with it.
            </p>
            <p style={styles.stepBody}>
              A reported <em>prayer request</em> works a little differently, because a visitor who asked for prayer has
              no account to disable. Those are ruled on under Private Prayers — put it back on the wall, keep it off,
              or delete it — and the reported-content list links you straight there. Whichever you choose closes the
              report at the same time, so nothing sits in two places waiting for you twice.
            </p>
          </Step>

          <Step title="Write Sunday’s message through the week" shot={`${IMG}/tab-08-sermon.png`} alt="A sermon with linked scripture" tablet>
            <p style={styles.stepBody}>
              Sermons have a series, a big idea, and a draft state. Draft through the week — nobody else can see it,
              and it saves itself — then publish on Sunday. Publishing is the only thing that notifies anyone, and only
              if you ask it to.
            </p>
            <p style={styles.stepBody}>
              Type passages the way you always have — “James 2:17”, “1 Cor 13” — and they become links for the
              congregation automatically. You never mark anything up.
            </p>
          </Step>

          <Step title="Reach the right people">
            <p style={styles.stepBody}>
              File an event, announcement or sermon under a ministry — Kids, Youth, Adult Ministries, Prayer, Men’s,
              Women’s, Senior Adults, or the whole church. A youth lock-in then notifies the families who follow Youth
              instead of waking everybody at 7am.
            </p>
            <p style={styles.stepBody}>
              It only affects notifications. Everything stays on the calendar and in the bulletin for anyone who looks.
            </p>
          </Step>

          <Step title="Organise the practical things">
            <p style={styles.stepBody}>
              Start a meal train by picking a start date and a number of days — the sign-up grid builds itself. Put
              people on the serving rota and they’re told. Open a poll for the bulletin when you need an answer from
              the congregation.
            </p>
            <p style={styles.stepBody}>
              <strong style={s.strong}>Send Notification</strong> pushes a message to every member, with a preview
              before it goes. For cancellations, a death in the church family, an urgent need.
            </p>
          </Step>

          <Step title="Change the church’s details yourself">
            <p style={styles.stepBody}>
              Service times, address, phone, email, website, Facebook, YouTube and the giving link all live in{' '}
              <strong style={s.strong}>Church Info &amp; Links</strong>. Editing there updates the whole app and the
              public event pages at once.
            </p>
          </Step>

          <Step title="What runs on its own">
            <p style={styles.stepBody}>
              A reminder to everyone who RSVP’d, about a day before the event. A “this week at Southside” digest on
              Saturday evening. A birthday shout-out at 8am. The Thursday nudge to whoever is serving on Sunday, and an
              afternoon reminder to whoever has tomorrow’s meal. Shared prayer requests clear themselves after a week.
            </p>
            <p style={styles.stepBody}>
              And at 9am, one message to staff listing anything still waiting — and if the oldest thing has been
              sitting more than a couple of days, how long. Every queue already tells you the moment something
              arrives — but a notification is one chance, and a
              phone face-down through a service misses it. This is the reminder that keeps a request from being
              forgotten. It only goes out when somebody is genuinely waiting on you, never for a quiet morning.
            </p>
          </Step>
        </section>

        {/* ── SAFETY ───────────────────────────────────────────────────────── */}
        <section id="safety" className="sw-audience" style={styles.audience}>
          <div style={styles.audienceHead}>
            <span style={styles.audienceEmoji}>🔒</span>
            <div>
              <h2 className="sw-audience-title" style={styles.audienceTitle}>The rules built into it</h2>
              <p style={styles.audienceLede}>
                These aren’t settings somebody could switch off. They’re how the app is built.
              </p>
            </div>
          </div>

          <div style={styles.ruleGrid}>
            {RULES.map(([title, body]) => (
              <div key={title} style={styles.rule}>
                <div style={styles.ruleTitle}>{title}</div>
                <p style={styles.ruleBody}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <div style={styles.links}>
          <Link to="/southside" style={styles.linkBtn}>About the app</Link>
          <Link to="/southside/support" style={styles.linkBtn}>Support</Link>
          <Link to="/southside/privacy" style={styles.linkBtn}>Privacy Policy</Link>
          <a href="https://www.southsideportneches.org/" target="_blank" rel="noreferrer" style={styles.linkBtn}>
            Church website
          </a>
        </div>
      </div>
    </div>
  );
}
