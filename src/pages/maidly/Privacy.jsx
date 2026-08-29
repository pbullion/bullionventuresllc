import { Link } from 'react-router-dom';
import { shell as s } from './theme.js';

export default function MaidlyPrivacy() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>🔒</span>
        <h1 style={s.headerTitle}>Privacy Policy</h1>
        <p style={s.headerMeta}>Maidly · Bullion Ventures LLC · Last Updated: August 28, 2026</p>
      </div>

      <div style={s.content}>
        <p style={s.body}>
          Maidly is an app and website that cleaning companies use to run their work: customers book cleanings,
          cleaners work the jobs, and the company&apos;s owner runs the board. This policy describes what Maidly
          collects, who can see it, and how to have it removed. It applies to the iPhone app and to the Maidly website.
        </p>
        <p style={s.body}>
          The short version: Maidly collects what you and your cleaning company type into it, shows it only to the
          people inside that one company, sells nothing, tracks nothing, never asks for a card number, and lets you
          delete your account and its data from inside the app.
        </p>

        <div style={s.sectionTitle}>1. Who the &ldquo;we&rdquo; is here</div>
        <p style={s.body}>
          Maidly is built and operated by <span style={s.strong}>Bullion Ventures LLC</span>. The cleaning company you
          book with, work for, or own is an <span style={s.strong}>independent business</span> — not us. They decide
          their own prices, hire their own cleaners, and are responsible for the cleaning itself. Inside Maidly, that
          company&apos;s owner is the administrator of their own data.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>2. What We Collect</div>

        <div style={s.subTitle}>Account information</div>
        <p style={s.body}>
          Your name, email address, a password, and your role (customer, cleaner, or company owner). Passwords are
          stored only as a one-way hash — nobody at Bullion Ventures LLC, and nobody at your cleaning company, can read
          your password.
        </p>

        <div style={s.subTitle}>Service addresses (customers)</div>
        <p style={s.body}>
          The addresses you save to book cleanings at, their labels (&ldquo;Home&rdquo;, &ldquo;Mom&apos;s
          house&rdquo;), and any notes you attach to them — gate codes, pets, where the key is. Address notes are
          attached to the bookings made at that address so the cleaner sees them.{' '}
          <span style={s.strong}>Maidly does not track your location.</span> An address is only ever text you typed.
        </p>

        <div style={s.subTitle}>Bookings and job records</div>
        <p style={s.body}>
          The service booked, date and time, price set by the company, your booking notes, which cleaner was assigned,
          the checklist as it is ticked off, and the times each job was started and finished. Those timestamps are also
          how a company owner sees{' '}
          <span style={s.strong}>hours worked by each cleaner</span> — if you are a cleaner, your working hours on jobs
          are visible to your company&apos;s owner.
        </p>

        <div style={s.subTitle}>Before-and-after photos</div>
        <p style={s.body}>
          Photos a cleaner adds to a job, taken with the camera or picked from their photo library. These are stored as
          files in Amazon S3.{' '}
          <span style={s.strong}>
            Photo files are served from a plain web address, which means anyone who has that exact link can open the
            photo without signing in.
          </span>{' '}
          The links are long and random and are never published anywhere, but they are not password-protected — so
          treat job photos as pictures of a room, not as private documents. Deleting a photo in the app deletes the
          file itself.
        </p>

        <div style={s.subTitle}>Messages</div>
        <p style={s.body}>
          Every job has a message thread shared by its customer, its assigned cleaner, and the company owner. Messages
          you send are stored, and the company&apos;s owner can read them. Reports you file on a message, and people
          you block, are stored too.
        </p>

        <div style={s.subTitle}>Reviews</div>
        <p style={s.body}>
          A 1–5 star rating and an optional comment after a completed cleaning. Reviews are shown to the company owner
          and to the cleaner who did the job, and they roll up into a company&apos;s public star average, a per-cleaner
          average, and a per-customer average.
        </p>

        <div style={s.subTitle}>Days off (cleaners)</div>
        <p style={s.body}>
          Dates you mark as unavailable and an optional short reason you type. The reason is shown to your company&apos;s
          owner when they try to schedule you.{' '}
          <span style={s.strong}>Leave it blank if you would rather not say why</span> — the date alone is enough for
          the warning to work.
        </p>

        <div style={s.subTitle}>Push notification token</div>
        <p style={s.body}>
          A device token issued by Apple, used to tell you about new requests, assignments, status changes, and
          messages. It identifies a device, not a person, and it changes when you reinstall the app.
        </p>

        <div style={s.subTitle}>Password reset codes</div>
        <p style={s.body}>
          If you ask to reset a password we email a 6-digit code and store only a hash of it. Codes expire after 15
          minutes, are limited in how many times they can be tried, work once, and sign out existing sessions when
          used.
        </p>

        <div style={s.subTitle}>Technical logs</div>
        <p style={s.body}>
          Our server records ordinary technical information such as request times and error codes so the app keeps
          working. We do not use analytics or tracking SDKs of any kind.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>3. What We Never Collect</div>
        <ul style={s.list}>
          <li style={s.listItem}>
            <span style={s.strong}>No card or bank details, ever.</span> No money moves through Maidly. You pay your
            cleaning company directly, however the two of you already arrange it. When an owner marks a job
            &ldquo;Paid&rdquo; they are writing a line in their own ledger — Maidly did not process anything.
          </li>
          <li style={s.listItem}>
            <span style={s.strong}>No location tracking.</span> Maidly never reads your device&apos;s location. Nobody
            is tracked to a job or followed between them.
          </li>
          <li style={s.listItem}>No social security numbers, dates of birth, or government IDs.</li>
          <li style={s.listItem}>No contacts, calendar, or microphone access.</li>
        </ul>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>4. Who Can See It</div>
        <p style={s.body}>
          <span style={s.strong}>Each cleaning company is a sealed island.</span> There is no global administrator, and
          no company can see another company&apos;s customers, cleaners, jobs, messages, or reports. These rules are
          enforced on our server, not merely hidden in the app.
        </p>
        <ul style={s.list}>
          <li style={s.listItem}>
            <span style={s.strong}>A customer</span> sees their own bookings, plans, messages, and saved addresses.
          </li>
          <li style={s.listItem}>
            <span style={s.strong}>A cleaner</span> sees the jobs assigned to them — including the customer&apos;s
            name, service address, and notes for those jobs — plus their own hours and days off.
          </li>
          <li style={s.listItem}>
            <span style={s.strong}>A company owner</span> sees everything belonging to their own company: the job
            board, the week schedule, their team, their customer list and its history, revenue and hours, every job
            message thread, and the moderation queue.
          </li>
          <li style={s.listItem}>
            <span style={s.strong}>Other members of your company</span> see your name and role in the team list.{' '}
            <span style={s.strong}>Email addresses are hidden from everyone except the owner</span>, and the
            company&apos;s cleaner invite code is owner-only.
          </li>
          <li style={s.listItem}>
            <span style={s.strong}>The public</span> sees only what a company puts on the sign-up list: its name, its
            city, and its star average. No customer, cleaner, job, photo, or message is ever public.
          </li>
        </ul>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>5. What We Never Do</div>
        <ul style={s.list}>
          <li style={s.listItem}>We never sell, rent, or trade your information.</li>
          <li style={s.listItem}>We do not serve advertising and do not build advertising profiles.</li>
          <li style={s.listItem}>We do not track you across other apps or websites.</li>
          <li style={s.listItem}>
            We do not use your data to market to you. The only email Maidly sends you is a password reset code.
          </li>
        </ul>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>6. Where It Lives</div>
        <p style={s.body}>
          Text is stored in a Postgres database hosted on Heroku (Salesforce). Photos are stored in Amazon S3. Push
          notifications are delivered through Expo&apos;s push service and Apple Push Notification service. Password
          reset emails are sent through Google&apos;s mail service. These providers process data on our behalf and are
          not permitted to use it for their own purposes. Data is stored in the United States.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>7. How Long We Keep It</div>
        <ul style={s.list}>
          <li style={s.listItem}>
            Job records, messages, photos, and reviews are kept as your cleaning company&apos;s business record until
            deleted.
          </li>
          <li style={s.listItem}>Account information is kept while the account exists.</li>
          <li style={s.listItem}>Password reset codes are single-use and expire after 15 minutes.</li>
          <li style={s.listItem}>
            A company owner can remove a cleaner from their team at any time, which ends that person&apos;s access to
            the company.
          </li>
        </ul>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>8. Deleting Your Account</div>
        <p style={s.body}>
          Open the app and go to <span style={s.strong}>Profile → Delete My Account</span>, or use the same button on
          the website. It is immediate, permanent, and does not require emailing anyone.
        </p>
        <ul style={s.list}>
          <li style={s.listItem}>
            <span style={s.strong}>A customer or cleaner</span> deleting their account removes their account and
            personal details. The cleaning company&apos;s record of jobs that were actually performed stays with the
            company, as their business record.
          </li>
          <li style={s.listItem}>
            <span style={s.strong}>An owner</span> deleting their account deletes{' '}
            <span style={s.strong}>the entire company</span> — its job board, services, customers, messages, and
            photos, for everyone in it. This is by design, and it cannot be undone.
          </li>
        </ul>
        <p style={s.body}>
          If you can no longer sign in, email us at the address below and we will delete the account for you.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>9. Reporting and Blocking</div>
        <p style={s.body}>
          Press and hold any message in the app (double-click on the website) to report it or block its sender. A
          reported message is <span style={s.strong}>hidden immediately</span>, before anyone reviews it, and goes to
          the company owner&apos;s Reported Messages queue — they can restore it or remove it for good. Blocking closes
          the message channel between you and that person; you can undo it from{' '}
          <span style={s.strong}>Profile → Blocked Users</span>.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>10. Children</div>
        <p style={s.body}>
          Maidly is a tool for running a cleaning business and is intended for adults. We do not knowingly collect
          information from children under 13. If you believe a child has created an account, contact us and we will
          remove it.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>11. Your Choices</div>
        <p style={s.body}>
          You can view and correct your details in the app, delete your account outright, turn Maidly&apos;s
          notifications off in iOS Settings, and leave the reason on a day off blank. To request a copy of your data,
          email us.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>12. Changes</div>
        <p style={s.body}>
          If this policy changes we will update the date at the top of this page.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>13. Contact</div>
        <p style={s.body}>Questions about this policy, or about your information:</p>
        <div style={s.contactBox}>
          <a href="mailto:maidly@bullionventuresllc.com" style={s.emailLink}>
            maidly@bullionventuresllc.com
          </a>
          <p style={{ ...s.body, margin: '10px 0 0', fontSize: 14.5 }}>
            Bullion Ventures LLC · Texas, United States
          </p>
        </div>

        <Link to="/maidly" style={s.backLink}>
          ← Back to Maidly
        </Link>
      </div>
    </div>
  );
}
