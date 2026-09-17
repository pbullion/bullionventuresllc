import LinkDirectory from "../../components/LinkDirectory.jsx";
import { ASHLEY_GROUP } from "../../lib/privatePages.js";
import HowTo from "./HowTo.jsx";

/* /ash — Ashley's pages, for Ashley.
 *
 * /jump is Patrick's directory of every unlisted page; this is the same page
 * over ONE group of that list — the `ashley` group in src/lib/privatePages.js —
 * so she can reach everything of hers from one bookmark without wading through
 * betting screens and fantasy boards. Which pages appear is decided entirely in
 * privatePages.js; this file only frames them. Added 2026-09-16 (Patrick: "add
 * a page like the jump for ashley so she can get to all of her pages").
 *
 * Why the path is /ash and not /ashley-something: /ashley is her client tracker,
 * and App.jsx hides the site chrome with `startsWith("/ashley")`, which would
 * swallow any /ashley-* path. /ash is also short enough to type on a phone.
 *
 * It HIDES the site nav and footer, unlike /jump. /jump keeps them because the
 * navbar's Home link and long-press wordmark are Patrick's neighbours; for
 * Ashley they are a marketing site in the way of a launcher she'll pin to her
 * home screen. `documentTitle` is what iOS offers as the home-screen name.
 *
 * Obscurity, not access control, like everything in privatePages.js: /ash is a
 * public route and anyone with the URL sees these links. The pages themselves
 * are unchanged — /ashley still requires her login.
 *
 * The how-to button under the heading opens File Drop's step-by-step
 * instructions (HowTo.jsx; `/ash#how-to` opens it directly). */
export default function Ash() {
  return (
    <LinkDirectory
      groups={[ASHLEY_GROUP]}
      hideGroupLabels
      eyebrow="Ashley"
      title="Your pages"
      documentTitle="Ashley's Pages"
      note="Everything of yours on bullionventuresllc.com, in one place. Add this page to your home screen to keep it one tap away."
    >
      <HowTo />
    </LinkDirectory>
  );
}
