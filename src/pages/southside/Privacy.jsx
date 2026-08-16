import { Link } from 'react-router-dom';
import { c, shell as s } from './theme.js';

export default function SouthsidePrivacy() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>🔒</span>
        <h1 style={s.headerTitle}>Privacy Policy</h1>
        <p style={s.headerMeta}>Southside Baptist Church · Last Updated: August 16, 2026</p>
      </div>

      <div style={s.content}>
        <p style={s.body}>
          The Southside Baptist Church app is the congregation app for Southside Baptist Church in Port Neches, Texas.
          This policy describes what the app collects, who can see it, and how to have it removed. It applies to the iOS
          app and to the church website pages that support it.
        </p>
        <p style={s.body}>
          The short version: the app collects what you type into it, shows it only to your church family, sells nothing,
          tracks nothing, and lets you delete all of it from inside the app.
        </p>

        <div style={s.sectionTitle}>1. What We Collect</div>

        <div style={s.subTitle}>Account information</div>
        <p style={s.body}>
          Your name, email address, and a password. Passwords are stored only as a one-way hash — nobody at the church,
          and nobody maintaining the app, can read your password.
        </p>

        <div style={s.subTitle}>What you post</div>
        <p style={s.body}>
          Photos and captions you share to the church feed, comments, likes, prayer requests, prayer responses, event
          RSVPs and sign-ups, poll votes, group messages, and your private sermon notes. Sermon notes are visible only
          to you.
        </p>

        <div style={s.subTitle}>Birthday (optional)</div>
        <p style={s.body}>
          If you choose to add one, the app stores the <span style={s.strong}>month and day only</span> — never the year
          — so the congregation can wish you a happy birthday.
        </p>

        <div style={s.subTitle}>Push notification token</div>
        <p style={s.body}>
          A device token issued by Apple, used to deliver notifications about events, announcements, and prayer needs.
          It identifies a device, not a person, and it changes when you reinstall the app.
        </p>

        <div style={s.subTitle}>Visit requests and prayer requests from guests</div>
        <p style={s.body}>
          If you plan a visit or ask for prayer without an account, the app collects what you enter on that form —
          typically a name, a way to contact you, when you plan to visit, the ages of any children coming with you, and
          your message. This information is shown{' '}
          <span style={s.strong}>only to church staff in the admin area of the app</span>. It never appears in the feed
          or anywhere else in the app.
        </p>

        <div style={s.subTitle}>Technical logs</div>
        <p style={s.body}>
          Our server records ordinary technical information such as request times and error codes so the app keeps
          working. We do not use analytics or tracking SDKs of any kind.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>2. Who Can See It</div>
        <p style={s.body}>
          Membership is approved by church staff. Until an account is approved, it can see only the public church
          information — service times, the calendar, and the bulletin.
        </p>
        <ul style={s.list}>
          <li style={s.listItem}>
            <span style={s.strong}>Approved members</span> see the feed, prayer wall, group conversations, and the
            member directory of ministries and staff.
          </li>
          <li style={s.listItem}>
            <span style={s.strong}>Church staff (admins)</span> additionally see pending posts awaiting review, visit
            requests, private prayer requests, and reported content.
          </li>
          <li style={s.listItem}>
            <span style={s.strong}>The public</span> sees only what the church deliberately publishes — the calendar,
            the bulletin, sermon outlines, and event share pages. No member-created content is ever public.
          </li>
        </ul>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>3. What We Never Do</div>
        <ul style={s.list}>
          <li style={s.listItem}>We never sell, rent, or trade your information.</li>
          <li style={s.listItem}>We do not serve advertising and do not build advertising profiles.</li>
          <li style={s.listItem}>We do not track you across other apps or websites.</li>
          <li style={s.listItem}>
            The app has no one-on-one private messaging. Conversation happens in named ministry groups only — a
            deliberate decision for the safety of students.
          </li>
          <li style={s.listItem}>Giving links out to the church&apos;s own secure giving page. The app never handles payment details.</li>
        </ul>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>4. Where It Lives</div>
        <p style={s.body}>
          Text is stored in a Postgres database hosted on Heroku (Salesforce). Photos are stored in Amazon S3. Push
          notifications are delivered through Expo&apos;s push service and Apple Push Notification service. These
          providers process data on our behalf and are not permitted to use it for their own purposes.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>5. How Long We Keep It</div>
        <ul style={s.list}>
          <li style={s.listItem}>
            <span style={s.strong}>Prayer requests shared with the congregation are deleted automatically after 7 days.</span>{' '}
            Each request shows its own countdown in the app.
          </li>
          <li style={s.listItem}>
            Posts, comments, and group messages are kept until you or a church admin removes them.
          </li>
          <li style={s.listItem}>
            Private prayer requests and visit requests are kept as a staff follow-up list until staff mark them done.
          </li>
          <li style={s.listItem}>Account information is kept while the account is active.</li>
        </ul>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>6. Deleting Your Account</div>
        <p style={s.body}>
          Open the app and go to <span style={s.strong}>More → your name → Delete My Account</span>. This permanently
          removes your account, your posts, your comments, your group messages, your prayer requests, and{' '}
          <span style={s.strong}>the actual photo files from storage</span>. It cannot be undone, and it does not
          require emailing anyone.
        </p>
        <p style={s.body}>
          If you can no longer sign in, email us at the address below and we will delete the account for you.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>7. Reporting and Blocking</div>
        <p style={s.body}>
          Press and hold any post, comment, group message, or prayer request to report it or block its author. Blocked
          people disappear from your feed, comments, and group conversations. Reports go to church staff, who can remove
          the content and disable the account.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>8. Children and Students</div>
        <p style={s.body}>
          The app is intended for the congregation of Southside Baptist Church, including students participating in
          youth ministry with the permission of a parent or guardian. We do not knowingly collect information from
          children under 13 without that permission. There is no private one-on-one messaging in the app. A parent or
          guardian may contact us at any time to review or delete a minor&apos;s information.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>9. Changes</div>
        <p style={s.body}>
          If this policy changes we will update the date at the top of this page. Material changes will also be
          announced in the app&apos;s bulletin.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>10. Contact</div>
        <p style={s.body}>Questions about this policy, or about your information:</p>
        <div style={s.contactBox}>
          <a href="mailto:southside@bullionventuresllc.com" style={s.emailLink}>
            southside@bullionventuresllc.com
          </a>
          <p style={{ ...s.body, margin: '10px 0 0', fontSize: 14.5 }}>
            Or the church office at{' '}
            <a href="tel:+14097227550" style={{ ...s.emailLink, color: c.green }}>
              (409) 722-7550
            </a>
            .
          </p>
        </div>

        <Link to="/southside" style={s.backLink}>
          ← Back to the Southside app
        </Link>
      </div>
    </div>
  );
}
