import { Link } from 'react-router-dom';
import { c, shell as s, SANS } from './theme.js';

// The visual walkthrough that maidly/docs/APP-FLOW.md was always written to
// become. That file is the source of truth and is updated in the same commit as
// any feature change — if the app changes and this page doesn't match it, the
// flow log is where to look for what's actually true.
//
// Organised by the three roles, because "what can I do?" depends entirely on
// which one you are. A feature-by-feature tour would make a customer read about
// the revenue report.
//
// Every claim here was checked against routes/maidly.js, not against the app's
// UI — in particular: ONLY customers can book (POST /jobs 403s everyone else),
// a customer can cancel only from `requested`/`scheduled`, and a cleaner's
// transitions are scheduled → on_the_way|in_progress → in_progress → completed.
//
// SCREENSHOTS: none yet. Every <Step> renders full-width text when no `shot` is
// passed, so this page is complete without them and gains a screenshot column
// the moment one is passed. To add one: drop the file in
// public/images/maidly/walkthrough/ and give that Step
//   shot="/images/maidly/walkthrough/phone-02-book.png" alt="The booking form"
// The slots worth filling, in the order they appear: phone-01-welcome (sign-up
// role picker), phone-02-book (booking form), phone-03-myday (a cleaner's
// grouped day), phone-04-job (job detail with the checklist), phone-05-chat,
// phone-06-board (owner triage card), phone-07-schedule (week strip),
// phone-08-revenue. Capture them from the seeded demo company — `node
// scripts/maidly-seed.js` in sheline-art-website-api builds it — so the shots
// show plausible data and no real customer's address.

const styles = {
  hero: {
    textAlign: 'center',
    background: `linear-gradient(165deg, ${c.teal} 0%, ${c.tealDeep} 100%)`,
    borderBottom: `3px solid ${c.amber}`,
  },
  icon: { width: 84, height: 84, borderRadius: 20, display: 'block', margin: '0 auto 20px', boxShadow: '0 10px 30px rgba(0,0,0,0.28)' },
  heroTitle: { fontWeight: 700, margin: '0 0 10px', color: c.card, letterSpacing: '-0.015em' },
  heroLede: { color: 'rgba(255,255,255,0.86)', lineHeight: 1.68, maxWidth: 560, margin: '0 auto' },

  nav: {
    position: 'sticky',
    // The site navbar is sticky at top:0 and 60px tall (components/Navbar.jsx),
    // so this row starts where that one ends — at top:0 it slides underneath.
    top: 60,
    zIndex: 9,
    background: 'rgba(246,250,249,0.94)',
    backdropFilter: 'blur(8px)',
    borderBottom: `1px solid ${c.border}`,
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  navLink: {
    fontWeight: 700,
    color: c.teal,
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
  audienceTitle: { fontWeight: 700, color: c.teal, margin: '0 0 6px' },
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
    boxShadow: '0 8px 26px rgba(26,46,43,0.14)',
    display: 'block',
  },

  note: {
    background: c.amberSoft,
    borderLeft: `4px solid ${c.amber}`,
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
    color: c.teal,
    borderRadius: 12,
    padding: '12px 22px',
    fontWeight: 700,
    fontSize: 14.5,
    textDecoration: 'none',
    fontFamily: SANS,
  },
};

// Anything that has to CHANGE at a breakpoint lives here rather than in the
// inline `styles` object — inline styles can't hold a media query, and an
// inline value silently wins over a class, so each property belongs in exactly
// one of the two places. Same split Home.jsx uses.
const MW_CSS = `
.mw-hero { padding: 72px 24px 56px; }
.mw-hero-title { font-size: 34px; }
.mw-hero-lede { font-size: 17px; }
.mw-nav { padding: 12px 16px; }
.mw-nav a { font-size: 14px; padding: 8px 16px; }
.mw-wrap { padding: 0 24px 80px; }

/* Two sticky rows sit above the content — the 60px site navbar and this page's
   own nav — so an anchored section has to clear both. */
.mw-audience { scroll-margin-top: 126px; }
.mw-audience-title { font-size: 27px; }

.mw-step { grid-template-columns: minmax(0, 1fr); }
.mw-step-shot { grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); }
.mw-shot { max-width: 260px; }

.mw-tablewrap { overflow-x: auto; }
.mw-table { width: 100%; border-collapse: collapse; min-width: 620px; }
.mw-table th {
  text-align: left;
  font-size: 13px;
  font-weight: 800;
  color: ${c.teal};
  padding: 14px 16px;
  border-bottom: 1px solid ${c.border};
  white-space: nowrap;
}
.mw-table td {
  font-size: 14.5px;
  color: ${c.subtext};
  padding: 13px 16px;
  border-bottom: 1px solid ${c.border};
  line-height: 1.55;
}
.mw-table th.mw-col, .mw-table td.mw-mark { text-align: center; }
.mw-table td.mw-mark { font-size: 15px; }

@media (max-width: 720px) {
  .mw-hero { padding: 48px 20px 40px; }
  .mw-hero-title { font-size: 27px; }
  .mw-hero-lede { font-size: 15.5px; }
  .mw-nav { padding: 10px 12px; gap: 6px; }
  .mw-nav a { font-size: 13px; padding: 7px 12px; }
  .mw-wrap { padding: 0 16px 56px; }
  .mw-audience { scroll-margin-top: 172px; }
  .mw-audience-title { font-size: 23px; }

  /* A phone gets one column: the screenshot under the words it illustrates,
     not beside them. */
  .mw-step-shot { grid-template-columns: minmax(0, 1fr); }
  .mw-shot { max-width: 300px; }

  /* The comparison table stops being a table and becomes one block per row —
     at 620px wide the Cleaner and Owner columns were simply off the side of
     the screen with nothing to say so. */
  .mw-tablewrap { overflow-x: visible; }
  .mw-table { min-width: 0; }
  .mw-table thead { display: none; }
  .mw-table tbody, .mw-table tr, .mw-table td { display: block; }
  .mw-table tr { padding: 12px 16px; border-bottom: 1px solid ${c.border}; }
  .mw-table tr:last-child { border-bottom: none; }
  .mw-table td { padding: 3px 0; border-bottom: none; }
  .mw-table td.mw-rowhead { font-size: 15px; font-weight: 700; color: ${c.text}; padding-bottom: 7px; }
  .mw-table td.mw-cell, .mw-table td.mw-mark {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 14px;
    text-align: left;
  }
  /* The column heading each value belonged to, carried down onto the value. */
  .mw-table td.mw-cell::before, .mw-table td.mw-mark::before {
    content: attr(data-role);
    font-size: 13px;
    font-weight: 800;
    color: ${c.teal};
  }
}
`;

function Shot({ src, alt }) {
  return <img src={src} alt={alt} className="mw-shot" style={styles.phoneFrame} loading="lazy" />;
}

function Step({ title, shot, alt, children }) {
  return (
    <div className={shot ? 'mw-step mw-step-shot' : 'mw-step'} style={styles.step}>
      <div>
        <h3 style={styles.stepTitle}>{title}</h3>
        {children}
      </div>
      {shot ? <Shot src={shot} alt={alt} /> : null}
    </div>
  );
}

const COLUMNS = ['Customer', 'Cleaner', 'Owner'];

const ROLES = [
  ['How you get in', 'Pick your cleaning company from the list', 'Enter your company’s invite code, then wait for the owner', 'Sign up with your business name'],
  ['Can start using it straight away', true, false, true],
  ['What the job list shows you', 'Your own bookings', 'Only the jobs assigned to you', 'Everything the company has'],
  ['Book a cleaning, once or repeating', true, false, false],
  ['Move a job forward — on my way, start, done', false, true, true],
  ['Tick the checklist, add before/after photos', false, true, true],
  ['Ask to move a booking to another time', true, false, false],
  ['Cancel it', 'Until your cleaner sets off', false, 'Any time before it’s finished'],
  ['Chat on the job, report a message, block someone', true, true, true],
  ['Rate the clean out of five', true, false, false],
  ['Mark the days you can’t work', false, true, false],
  ['Set services, prices and checklists', false, false, true],
  ['Price a request, assign a cleaner, approve the team', false, false, true],
  ['Revenue, hours, and the customer book', false, false, true],
  ['Rule on a reported message', false, false, true],
];

const RULES = [
  ['Every company is a sealed island', 'No company can see another’s customers, cleaners, jobs, messages or reports. There is no global administrator — your company’s owner is its only admin.'],
  ['The rules live on the server', 'Roles aren’t just hidden buttons. Every request is checked again on our side, so nothing opens up by poking at the app.'],
  ['One report hides a message', 'Report a message and it disappears immediately — before anyone has read the report. It waits in the owner’s queue until they restore it or remove it for good, and their ruling is final, so nobody can re-report their way around it.'],
  ['Block anyone, and undo it', 'Blocking closes the message channel between the two of you. It is reversible any time from Profile → Blocked Users.'],
  ['No money moves through Maidly', 'We never ask for a card number and take no commission. You pay your cleaning company however you already do. “Mark as Paid” is the owner writing a line in their own books.'],
  ['Nobody is tracked', 'Maidly never reads your device’s location. An address is only ever text somebody typed — there is no map following a cleaner between jobs.'],
  ['Delete everything, yourself', 'Profile → Delete My Account, in the app or on the website. Immediate, permanent, no email to anyone.'],
  ['An owner’s deletion takes the company', 'If an owner deletes their account the whole company goes with it — board, services, customers, messages, photos. Deliberate, and it can’t be undone.'],
  ['We never confirm who has an account', 'Ask to reset a password and the screen answers the same way whether or not that address is registered. Confirming it would leak your customer list.'],
  ['Job photos are unlisted, not locked', 'Photo files sit at a long random web address that opens without a password. They’re never published anywhere — but photograph the room, not the mail on the counter.'],
];

export default function MaidlyWalkthrough() {
  return (
    <div style={s.page}>
      <style>{MW_CSS}</style>

      <div className="mw-hero" style={styles.hero}>
        <img src="/images/app-icons/maidly.png" alt="Maidly app icon" style={styles.icon} />
        <h1 className="mw-hero-title" style={styles.heroTitle}>How Maidly works</h1>
        <p className="mw-hero-lede" style={styles.heroLede}>
          A walk through the app — what you see and what you can do, depending on whether you’re booking a cleaning,
          doing it, or running the company.
        </p>
      </div>

      <div className="mw-nav" style={styles.nav}>
        <a href="#customers" style={styles.navLink}>🏠 Customers</a>
        <a href="#cleaners" style={styles.navLink}>🧽 Cleaners</a>
        <a href="#owners" style={styles.navLink}>📋 Owners</a>
        <a href="#safety" style={styles.navLink}>🔒 The rules</a>
      </div>

      <div className="mw-wrap" style={styles.wrap}>
        <div className="mw-tablewrap" style={styles.tableWrap}>
          <table className="mw-table">
            <thead>
              <tr>
                <th> </th>
                {COLUMNS.map((col) => (
                  <th key={col} className="mw-col">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((row) => (
                <tr key={row[0]}>
                  <td className="mw-rowhead">{row[0]}</td>
                  {row.slice(1).map((v, i) => (
                    /* data-role is what the stacked phone layout prints in front
                       of each value — without the header row there is otherwise
                       nothing saying which column a ✅ belonged to. */
                    <td key={COLUMNS[i]} data-role={COLUMNS[i]} className={typeof v === 'string' ? 'mw-cell' : 'mw-mark'}>
                      {typeof v === 'string' ? v : v ? '✅' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── CUSTOMERS ────────────────────────────────────────────────────── */}
        <section id="customers" className="mw-audience" style={styles.audience}>
          <div style={styles.audienceHead}>
            <span style={styles.audienceEmoji}>🏠</span>
            <div>
              <h2 className="mw-audience-title" style={styles.audienceTitle}>If you’re booking a cleaning</h2>
              <p style={styles.audienceLede}>
                You’re booking with a real local cleaning company that uses Maidly to run its work. You can start the
                moment you sign up — there’s no waiting for anyone to approve you.
              </p>
            </div>
          </div>

          <Step
            title="Sign up and pick your company"
            shot="/images/maidly/walkthrough/phone-01-welcome.png"
            alt="The Maidly welcome screen, with Sign In and Create an Account"
          >
            <p style={styles.stepBody}>
              Maidly asks who you are first — customer, cleaner, or company owner — because the rest of the form
              depends on the answer. As a customer you pick the cleaning company you want to book with from a list, and
              each one shows its <strong style={s.strong}>star rating</strong> from real completed cleanings.
            </p>
            <p style={styles.stepBody}>
              That’s it. You’re in, and the Jobs screen is waiting.
            </p>
            <div style={styles.note}>
              Don’t see your cleaner in the list? They haven’t signed up yet. The list only contains companies actually
              using Maidly — send them a link to this page.
            </div>
          </Step>

          <Step title="Book in about a minute">
            <p style={styles.stepBody}>
              Tap <strong style={s.strong}>＋ Book a Cleaning</strong>. Pick a service from your company’s{' '}
              <strong style={s.strong}>real menu</strong> — its actual name, price and rough duration, not a generic
              list — then an address, a date and time, and how often: just once, weekly, every two weeks, or monthly.
            </p>
            <p style={styles.stepBody}>
              Save an address and its notes travel with every booking made there. “Gate code 1140, the dog is friendly,
              key under the mat” gets typed once and the cleaner sees it every time.
            </p>
            <div style={styles.note}>
              <strong style={s.strong}>No card, ever.</strong> Booking charges you nothing — Maidly never asks for card
              details and takes no cut. You pay your cleaning company directly, exactly how you already do.
            </div>
          </Step>

          <Step title="Watch it move">
            <p style={styles.stepBody}>
              Your request lands on the company’s board. They confirm it with a price and a cleaner, and from then on
              you’re told at every step: <strong style={s.strong}>confirmed</strong>, then{' '}
              <strong style={s.strong}>🚗 on the way</strong>, then <strong style={s.strong}>started</strong>, then{' '}
              <strong style={s.strong}>done</strong>. No more texting to ask whether anybody is coming.
            </p>
          </Step>

          <Step title="Move it, or call it off">
            <p style={styles.stepBody}>
              Something came up? Ask to reschedule and propose a new time — the owner accepts it, and the booking
              moves, or keeps the original. Nobody has to cancel and rebook, and nothing gets lost in the process.
            </p>
            <p style={styles.stepBody}>
              You can cancel outright right up until <strong style={s.strong}>your cleaner sets off</strong>. After
              that it’s a phone call to the company, because somebody is already driving to your house.
            </p>
          </Step>

          <Step title="Say how it went">
            <p style={styles.stepBody}>
              After a finished cleaning you’re asked <strong style={s.strong}>“How was it?”</strong> — one to five
              stars and an optional comment, once per job. The owner sees every review, and anything under four stars
              is flagged for them to look at.
            </p>
            <p style={styles.stepBody}>
              Your ratings become that company’s public average on the sign-up list, so the next person choosing a
              cleaner sees what you thought.
            </p>
          </Step>

          <Step title="Repeating cleanings that look after themselves">
            <p style={styles.stepBody}>
              Book something every two weeks and Maidly keeps adding the next one to the company’s board about a week
              ahead — priced from the menu, checklist attached, owner notified. You don’t rebook and they don’t forget.
            </p>
            <p style={styles.stepBody}>
              Going away? <strong style={s.strong}>Profile → Recurring Plans</strong> pauses it, and resumes it when
              you’re back.
            </p>
          </Step>
        </section>

        {/* ── CLEANERS ─────────────────────────────────────────────────────── */}
        <section id="cleaners" className="mw-audience" style={styles.audience}>
          <div style={styles.audienceHead}>
            <span style={styles.audienceEmoji}>🧽</span>
            <div>
              <h2 className="mw-audience-title" style={styles.audienceTitle}>If you’re doing the cleaning</h2>
              <p style={styles.audienceLede}>
                One screen tells you where you’re going and what needs doing when you get there.
              </p>
            </div>
          </div>

          <Step title="Joining, and the wait">
            <p style={styles.stepBody}>
              You sign up with your company’s <strong style={s.strong}>6-character invite code</strong> — ask your
              owner, it’s in their Team tab. Then you wait: cleaners are the only people Maidly holds for approval, and
              your owner gets a notification the moment you sign up.
            </p>
            <p style={styles.stepBody}>
              The waiting screen checks itself every 15 seconds and unlocks on its own. You don’t need to close the
              app, sign in again, or do anything but wait.
            </p>
          </Step>

          <Step title="Your day, in order">
            <p style={styles.stepBody}>
              The Jobs tab is grouped <strong style={s.strong}>Today, Tomorrow, then the rest of the week</strong>,
              with finished work sunk to the bottom. It’s the screen you open with your coffee — every address, in the
              order you’re going, without asking anybody.
            </p>
            <p style={styles.stepBody}>
              Each card shows the service, the time, the customer, the price, a 🔁 if it repeats, and their star rating
              once they’ve left one.
            </p>
          </Step>

          <Step title="Three buttons, all day">
            <p style={styles.stepBody}>
              <strong style={s.strong}>🚗 On My Way</strong>, then <strong style={s.strong}>Start</strong>, then{' '}
              <strong style={s.strong}>Done</strong>. Each one notifies the customer, so the “are you coming?” text
              never gets sent. If you’re already at the door you can skip straight to Start.
            </p>
            <div style={styles.note}>
              <strong style={s.strong}>These buttons are your timesheet.</strong> Each one stamps a time, and those
              times are where your hours come from. Tell someone verbally instead and the hours never appear.
            </div>
          </Step>

          <Step title="The checklist is already there">
            <p style={styles.stepBody}>
              Whatever the owner put on that service — “inside the oven and fridge”, “baseboards”, “change the linens” —
              is copied onto the job, waiting for you. Tick it off as you go, so nothing gets missed on the one house
              with the extra request.
            </p>
            <p style={styles.stepBody}>
              Add <strong style={s.strong}>before and after photos</strong>, tap the address to open Maps, and message
              the customer from the job itself if something needs asking.
            </p>
            <div style={styles.note}>
              Photos are never published anywhere, but the files aren’t password-protected either — so photograph the
              room you’re cleaning, never documents, mail, or anything personal you happen to see.
            </div>
          </Step>

          <Step title="Days you can’t work">
            <p style={styles.stepBody}>
              <strong style={s.strong}>Profile → My Time Off</strong>, pick the dates. If your owner then tries to put
              you on a job that day they get a warning naming you and the date, before they book it.
            </p>
            <p style={styles.stepBody}>
              The reason box is optional. <strong style={s.strong}>Leave it blank if you’d rather not say</strong> —
              your owner reads whatever you type there, and the date alone is enough to trigger the warning.
            </p>
          </Step>

          <Step title="Your hours, without asking">
            <p style={styles.stepBody}>
              Your profile carries a rolling 30-day summary of time on the clock, added up from the jobs you started
              and finished. You can see what you worked without waiting for anyone to tell you.
            </p>
          </Step>
        </section>

        {/* ── OWNERS ───────────────────────────────────────────────────────── */}
        <section id="owners" className="mw-audience" style={styles.audience}>
          <div style={styles.audienceHead}>
            <span style={styles.audienceEmoji}>📋</span>
            <div>
              <h2 className="mw-audience-title" style={styles.audienceTitle}>If you run the company</h2>
              <p style={styles.audienceLede}>
                Maidly replaces the group text, the paper calendar and the spreadsheet — without changing how you get
                paid.
              </p>
            </div>
          </div>

          <Step title="Your company exists the moment you sign up">
            <p style={styles.stepBody}>
              Sign up as a <strong style={s.strong}>Company Owner</strong> with your business name and your company is
              created on the spot: a starter menu of four services you can edit, and a{' '}
              <strong style={s.strong}>6-character invite code</strong> for your cleaners. You’re immediately in the
              list customers pick from.
            </p>
            <div style={styles.note}>
              <strong style={s.strong}>Give your cleaners the invite code first.</strong> It’s in the Team tab, it’s
              owner-only, and it’s the one thing nothing else works without.
            </div>
          </Step>

          <Step title="Build the menu once">
            <p style={styles.stepBody}>
              <strong style={s.strong}>Business → Services &amp; Prices</strong>: each service gets a name, a base
              price, a rough duration, and its own checklist — one line per item. That’s the work that gets done, in
              your words.
            </p>
            <p style={styles.stepBody}>
              This menu then does two jobs for you forever: it prices incoming requests automatically, and its
              checklist is copied onto every booking so your cleaners know what you promised. Retiring a service
              deactivates it — it vanishes from booking without touching a single past job.
            </p>
          </Step>

          <Step title="Triage a request in one card">
            <p style={styles.stepBody}>
              A booking arrives on your board with <strong style={s.strong}>the price already filled in</strong> from
              your menu. Adjust it if this house is bigger, then assign a cleaner, schedule it unassigned for now, or
              decline it. Everyone involved is told automatically.
            </p>
            <p style={styles.stepBody}>
              Assign someone who marked that day off and Maidly stops you with the specifics — “Maria marked 2026-08-30
              as time off (Dentist)” — which you can override deliberately if you’ve already squared it with her.
            </p>
          </Step>

          <Step title="See the whole week">
            <p style={styles.stepBody}>
              <strong style={s.strong}>Business → Week Schedule</strong> is a seven-day dispatch strip. Pick a day and
              it breaks down by cleaner, with unassigned jobs first so the gaps are the first thing you see, and 🌴
              banners on anyone who’s off.
            </p>
          </Step>

          <Step title="Know what you made, and who worked">
            <p style={styles.stepBody}>
              <strong style={s.strong}>Business → Revenue &amp; Hours</strong>: completed revenue, what you’ve
              collected, and what’s still outstanding over the last 30 days, broken down week by week. Underneath,
              every cleaner’s jobs, hours and star rating.
            </p>
            <p style={styles.stepBody}>
              The hours are real — they come from the times your cleaners actually pressed Start and Done, not from
              anybody’s memory at the end of the week.
            </p>
            <p style={styles.stepBody}>
              <strong style={s.strong}>Business → Customers</strong> is your book of business: lifetime value,
              cleanings done, and average rating for each one, with the full history a tap away.
            </p>
          </Step>

          <Step title="Getting paid stays yours">
            <p style={styles.stepBody}>
              Mark a job <strong style={s.strong}>Paid</strong> and note how — cash, check, Venmo, card. That’s a line
              in your own ledger and nothing more: it feeds the outstanding column on your report, and no money has
              gone anywhere near Maidly.
            </p>
            <p style={styles.stepBody}>
              We take <strong style={s.strong}>no commission</strong> and never ask your customers for a card. Whatever
              arrangement you have with them today keeps working tomorrow.
            </p>
          </Step>

          <Step title="Keeping it civil">
            <p style={styles.stepBody}>
              Every job has one message thread shared by its customer, its cleaner and you — so everything about
              Tuesday’s clean stays on Tuesday’s clean instead of scattered across ten group texts.
            </p>
            <p style={styles.stepBody}>
              Anyone can report a message, and it’s <strong style={s.strong}>hidden the instant they do</strong>, before
              you’ve even looked. It lands in <strong style={s.strong}>Business → Reported Messages</strong> with a
              notification, and you restore it or remove it for good. Your ruling is final — nobody can report their
              way around it a second time.
            </p>
          </Step>

          <Step title="What runs on its own">
            <p style={styles.stepBody}>
              Every morning Maidly adds the next round of repeating cleanings to your board about a week ahead, priced
              and checklisted, and tells you it did.
            </p>
            <p style={styles.stepBody}>
              Everything else is immediate: a new request, a reschedule ask, or a review notifies you; an approval or
              an assignment notifies the cleaner; every status change notifies the customer; and messages and reports
              notify whoever didn’t press the button.
            </p>
          </Step>
        </section>

        {/* ── SAFETY ───────────────────────────────────────────────────────── */}
        <section id="safety" className="mw-audience" style={styles.audience}>
          <div style={styles.audienceHead}>
            <span style={styles.audienceEmoji}>🔒</span>
            <div>
              <h2 className="mw-audience-title" style={styles.audienceTitle}>The rules built into it</h2>
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
          <Link to="/maidly" style={styles.linkBtn}>About Maidly</Link>
          <Link to="/maidly/support" style={styles.linkBtn}>Support &amp; FAQ</Link>
          <Link to="/maidly/privacy" style={styles.linkBtn}>Privacy Policy</Link>
          <Link to="/maidly/terms" style={styles.linkBtn}>Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
