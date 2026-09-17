import LinkDirectory from "../../components/LinkDirectory.jsx";
import { PRIVATE_GROUPS } from "../../lib/privatePages.js";

/* /jump — the press-and-hold modal's list, as a page.
 *
 * Same groups, same rows, same source of truth (src/lib/privatePages.js); the
 * modal is unchanged and still the fast path. What the page adds is everything
 * a modal can't be: a URL Patrick can bookmark or pin to a home screen, a
 * back-button entry, somewhere the list can breathe into more than one column
 * on a desktop, and the actual PATH under each name — the modal has no room for
 * it, and the path is the thing you want when you are about to type the URL on
 * a device that has never seen the gesture.
 *
 * The page body is src/components/LinkDirectory.jsx, shared with /ash (Ashley's
 * own pages) since 2026-09-16. The noindex tag and the drop-your-own-row filter
 * live there now.
 *
 * It carries the site nav and footer on purpose, unlike /patrick, /drive and
 * the betting screens. Those hide the chrome because they are full-screen
 * instruments; this is a directory, and the navbar's Home link and wordmark are
 * exactly the right neighbours for it.
 *
 * Unlisted and cardless like everything it lists, and — say it again, because a
 * page that says PRIVATE at the top invites the opposite reading — that is
 * obscurity, not access control. /jump is a public unauthenticated route.
 *
 * Be precise about how much this page actually changes, though: privatePages.js
 * is statically imported by Navbar.jsx and Home.jsx into the one un-split
 * bundle, so the entire list has always shipped to every visitor and has always
 * been readable from view-source without the gesture. What is new is a
 * CRAWLABLE, human-readable copy at a guessable URL — which is what the
 * `robots` tag in LinkDirectory is for, since there is no site-wide robots.txt.
 * If any of this ever needs to be genuinely private, the fix is auth on the
 * routes and on the backend endpoints they read, not a quieter list. */
export default function Jump() {
  return (
    <LinkDirectory
      groups={PRIVATE_GROUPS}
      eyebrow="Private"
      title="Jump to"
      documentTitle="Jump to — Bullion Ventures LLC"
      note={(total) =>
        `${total} unlisted ${total === 1 ? "page" : "pages"} — none of these are on the home page. The same list is one press-and-hold on the wordmark away.`
      }
    />
  );
}
