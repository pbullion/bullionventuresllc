/* Every page on this site that is deliberately NOT on the public home page.
 *
 * ONE list, read by two things: the press-and-hold modal
 * (src/components/PrivateTools.jsx) and the full page at /jump
 * (src/pages/jump/index.jsx). It lives here rather than beside either of them
 * because a second copy would drift the first time a page was added to one and
 * not the other — and because exporting a constant beside a component breaks
 * Fast Refresh (react-refresh/only-export-components), which is why
 * PrivateTools.jsx could not export it itself.
 *
 * IMPORTANT — this is obscurity, not access control. Every path here is still
 * an open route: anyone who knows or guesses the URL can load it, and so can a
 * crawler that finds it linked anywhere. Nothing here is a permission check.
 * /ashley is the one exception and it is the backend, not this list, that
 * protects it — see routes/ashley.js. If the rest genuinely need to be private,
 * they need auth on the routes (and on the backend endpoints they read, which
 * are public too).
 *
 * When a page belongs here rather than on the home page, add it to a group
 * below INSTEAD of the `apps`/`tools` arrays in src/pages/Home.jsx — see
 * CLAUDE.md, which requires every new page to be discoverable from one of the
 * two. */
export const PRIVATE_GROUPS = [
  {
    label: "Patrick",
    items: [
      {
        emoji: "✅",
        name: "Project Board",
        path: "/patrick",
        tagline: "The todo wall — one board per app",
      },
      {
        emoji: "🏈",
        name: "FF Draft War Room",
        path: "/ffdraft",
        tagline: "Live ESPN draft assistant",
      },
      {
        emoji: "🚗",
        name: "Drive",
        path: "/drive",
        tagline: "In-car dashboard for the Tesla browser",
      },
      {
        emoji: "🩺",
        name: "Backend Status",
        path: "/status",
        tagline: "Is the shared API up — and is it restarting?",
      },
      /* The page version of the modal this list also feeds. It is in the list
       * on purpose — that is how the convention above makes a new page
       * discoverable — and /jump drops its own row when it renders, so it never
       * shows a link to the page you are already on. */
      {
        emoji: "🧭",
        name: "All Unlisted Pages",
        path: "/jump",
        tagline: "This list, as a page you can bookmark",
      },
    ],
  },
  {
    label: "Betting",
    items: [
      {
        emoji: "🎯",
        name: "My Bets",
        path: "/my-bets",
        tagline: "Every open position, live",
      },
      {
        emoji: "📈",
        name: "Totals Value",
        path: "/totals-value",
        tagline: "Sports over/unders — model vs market",
      },
      {
        emoji: "🪙",
        name: "Crypto Value",
        path: "/crypto-value",
        tagline: "15-minute and hourly crypto windows",
      },
      {
        emoji: "🌡",
        name: "Weather Value",
        path: "/weather-value",
        tagline: "Daily city-high temperature markets",
      },
      {
        emoji: "⛽",
        name: "Gas Value",
        path: "/gas-value",
        tagline: "AAA gas-price markets — paper engine",
      },
      {
        emoji: "🧮",
        name: "Units & Caps",
        path: "/engine-limits",
        tagline: "Every engine's unit, max bet and caps on one page",
      },
      {
        emoji: "☕",
        name: "Morning Review",
        path: "/morning-review",
        tagline: "The 7am engine report",
      },
      {
        emoji: "📋",
        name: "Morning Briefing",
        path: "/briefing",
        tagline: "Revenue, signups, support, calendar",
      },
      {
        emoji: "🏆",
        name: "Elite Edge Advisors",
        path: "/elite-edge-advisors",
        tagline: "The tracked bet board",
      },
    ],
  },
  {
    /* Ashley's two pages. They are hers, not tools for site visitors — they are
     * here so Patrick can reach them without typing the URL, which is the only
     * reason this group exists. */
    label: "Banking",
    items: [
      {
        emoji: "🏦",
        name: "Client Tracker",
        path: "/ashley",
        tagline: "Ashley's transition book — real login",
      },
      {
        emoji: "📇",
        name: "Prospects",
        path: "/prospects",
        tagline: "Houston C&I calling list",
      },
    ],
  },
];
