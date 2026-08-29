import { Link } from 'react-router-dom';
import { shell as s } from './theme.js';

export default function MaidlyTerms() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.headerEmoji}>📄</span>
        <h1 style={s.headerTitle}>Terms of Service</h1>
        <p style={s.headerMeta}>Maidly · Bullion Ventures LLC · Last Updated: August 28, 2026</p>
      </div>

      <div style={s.content}>
        <p style={s.body}>
          These terms cover your use of the Maidly app and website, operated by{' '}
          <span style={s.strong}>Bullion Ventures LLC</span> (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an
          account you agree to them.
        </p>

        <div style={s.sectionTitle}>1. Maidly is software, not a cleaning company</div>
        <p style={s.body}>
          This is the most important thing on this page.{' '}
          <span style={s.strong}>
            We do not clean houses, employ cleaners, set prices, or take part in the agreement between a cleaning
            company and its customer.
          </span>{' '}
          Maidly is the software a cleaning company uses to organise work it was already doing.
        </p>
        <ul style={s.list}>
          <li style={s.listItem}>
            Each cleaning company on Maidly is an <span style={s.strong}>independent business</span>. Its owner sets its
            prices, chooses and approves its cleaners, and is responsible for its own licensing, insurance, background
            checks, employment arrangements, and tax obligations.
          </li>
          <li style={s.listItem}>
            <span style={s.strong}>We do not vet, screen, endorse, or background-check</span> any company or cleaner
            listed in Maidly. A company appearing in the app is not a recommendation from us.
          </li>
          <li style={s.listItem}>
            Disputes about a cleaning — quality, damage, theft, no-shows, refunds, or payment — are between the
            customer and the cleaning company. We are not a party to them and cannot resolve them.
          </li>
        </ul>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>2. Eligibility and your account</div>
        <p style={s.body}>
          You must be 18 or older and able to enter a contract. Keep your password to yourself; you are responsible for
          what happens under your account. Give us accurate information — in particular, a company owner must sign up
          with the real name of a real business.
        </p>
        <p style={s.body}>
          Cleaners join a company with that company&apos;s invite code and remain in a{' '}
          <span style={s.strong}>pending</span> state until the owner approves them. An owner can remove a cleaner from
          their team at any time.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>3. Money never moves through Maidly</div>
        <p style={s.body}>
          <span style={s.strong}>Maidly does not process payments and never asks for a card number.</span> Customers
          pay their cleaning company directly, by whatever arrangement the two of them already have — cash, check,
          Venmo, an invoice, anything.
        </p>
        <p style={s.body}>
          The <span style={s.strong}>&ldquo;Mark as Paid&rdquo;</span> button is a note the company owner writes in
          their own books. It is not a receipt from us, not proof of payment, and not a transaction we witnessed or can
          reverse. Prices shown in the app are set by the company, not by us.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>4. Who owns and controls a company&apos;s data</div>
        <p style={s.body}>
          Within Maidly, a company&apos;s owner is the administrator of that company&apos;s data — its board, team,
          customer list, job history, and message threads. Owners: you are responsible for handling your customers&apos;
          and cleaners&apos; information lawfully and decently.
        </p>
        <p style={s.body}>
          <span style={s.strong}>
            If an owner deletes their account, the entire company and everything in it is deleted, for everyone.
          </span>{' '}
          That is deliberate and irreversible. Export anything you need first.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>5. Acceptable use</div>
        <p style={s.body}>Do not use Maidly to:</p>
        <ul style={s.list}>
          <li style={s.listItem}>
            harass, threaten, abuse, or discriminate against anyone — customer, cleaner, or owner;
          </li>
          <li style={s.listItem}>send messages or upload photos that are obscene, hateful, or unlawful;</li>
          <li style={s.listItem}>photograph anything beyond the work — job photos are for the room being cleaned;</li>
          <li style={s.listItem}>impersonate another person or business, or post reviews you did not earn;</li>
          <li style={s.listItem}>
            access a company, job, or thread you were not given access to, or attempt to break the app&apos;s role
            rules;
          </li>
          <li style={s.listItem}>scrape, resell, or republish anything in the app.</li>
        </ul>
        <p style={s.body}>
          <span style={s.strong}>There is no tolerance for abusive content.</span> Anyone can report a message — it is
          hidden the moment it is reported — and anyone can block another user. Company owners rule on reports for
          their own company. We may suspend or remove any account that abuses these rules.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>6. Scheduling, cancellation, and no-shows</div>
        <p style={s.body}>
          Booking dates, reschedules, cancellation windows, late fees, and refunds are{' '}
          <span style={s.strong}>your cleaning company&apos;s policies</span>, not ours. Maidly only records what the
          two of you agreed. Customers can cancel a booking before the cleaner is on the way; owners can cancel any
          time before a job is completed.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>7. Availability</div>
        <p style={s.body}>
          We try to keep Maidly running, but it is provided as-is, without a guaranteed uptime. Do not rely on it as
          the only record of anything you cannot afford to lose. Features may change or be removed.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>8. Disclaimer of warranties</div>
        <p style={s.body}>
          Maidly is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, express
          or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not
          warrant the conduct, honesty, or quality of work of any company, cleaner, or customer using it.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>9. Limitation of liability</div>
        <p style={s.body}>
          To the fullest extent the law allows, Bullion Ventures LLC is not liable for indirect, incidental, special,
          or consequential damages, for lost profits or data, or for{' '}
          <span style={s.strong}>anything that happens during or because of a cleaning</span> — including property
          damage, injury, theft, or work not done. Our total liability for any claim relating to Maidly is limited to
          the amount you paid us for it, which for the current version is zero.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>10. Ending your account</div>
        <p style={s.body}>
          You may delete your account at any time from{' '}
          <span style={s.strong}>Profile → Delete My Account</span>, in the app or on the website. We may suspend or
          terminate an account that breaks these terms. See the{' '}
          <Link to="/maidly/privacy" style={s.emailLink}>
            Privacy Policy
          </Link>{' '}
          for exactly what deletion removes.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>11. Privacy</div>
        <p style={s.body}>
          What we collect and who can see it is described in the{' '}
          <Link to="/maidly/privacy" style={s.emailLink}>
            Maidly Privacy Policy
          </Link>
          , which is part of these terms.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>12. Governing law</div>
        <p style={s.body}>
          These terms are governed by the laws of the State of Texas, United States, without regard to its conflict of
          law rules.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>13. Changes to these terms</div>
        <p style={s.body}>
          If these terms change we will update the date at the top of this page. Continuing to use Maidly after a
          change means you accept it.
        </p>

        <hr style={s.divider} />
        <div style={s.sectionTitle}>14. Contact</div>
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
