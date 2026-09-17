/* Every page on this site that is deliberately NOT on the public home page.
 *
 * ONE list, read by three things: the press-and-hold modal
 * (src/components/PrivateTools.jsx), the full page at /jump
 * (src/pages/jump/index.jsx), and — for the `ashley` group only — Ashley's own
 * page at /ash (src/pages/ash/index.jsx). It lives here rather than beside any of them
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
      /* ALL FOUR fantasy screens are listed, at Patrick's explicit request
       * (2026-09-09: "make sure and add links on the /jump route", when there
       * were two of them). They share a tab strip, so any row reaches the other
       * three in one tap — but /jump is the page you open when you want to land
       * directly on the one you meant, and printing the path is the whole point
       * of it over the modal.
       *
       * THE TAGLINES HAVE TO NAME THE LEAGUES. Four of eleven rows in this
       * group are now fantasy, and without the league names they read as
       * near-duplicates of each other. If that still feels noisy, the cut is to
       * two rows (Standings + Sleeper) since the tab strip reaches the rest —
       * a one-line revert, not a rebuild. */
      {
        emoji: "🏆",
        name: "Fantasy Standings",
        path: "/fantasy",
        tagline: "Records and points across all my leagues",
      },
      {
        emoji: "⚔️",
        name: "Fantasy — Sleeper",
        path: "/fantasy/sleeper",
        tagline: "My games in BIGGER and OG Dirtbag, full lineups",
      },
      {
        emoji: "🏟",
        name: "Fantasy — ESPN",
        path: "/fantasy/espn",
        tagline: "The League — my matchup, both lineups",
      },
      {
        emoji: "🔪",
        name: "Fantasy — Guillotine",
        path: "/fantasy/guillotine",
        tagline: "Guillotine — who's on the block",
      },
      {
        emoji: "🚨",
        name: "Lineup Watch",
        path: "/fantasy/lineup",
        tagline: "Live injury/bye alerts — nothing left in your lineup by mistake",
      },
      {
        emoji: "🧾",
        name: "Waiver Desk",
        path: "/fantasy/waivers",
        tagline: "Who to pick up, who to drop, and how much FAAB to bid",
      },
      {
        emoji: "🚗",
        name: "Drive",
        path: "/drive",
        tagline: "In-car dashboard for the Tesla browser",
      },
      {
        emoji: "📺",
        name: "Whip-Around",
        path: "/whiparound",
        tagline: "The Smokehouse wall board — full screen on a monitor",
      },
      {
        emoji: "🍷",
        name: "Blind Tasting",
        path: "/tasting",
        tagline: "Rank the glasses, reveal the bottles",
      },
      /* File Drop: private two-code file transfer to S3. The two codes, not
       * this list, are what protect it — the upload code can't download or
       * delete. */
      {
        emoji: "📤",
        name: "File Drop — Send",
        path: "/file-drop",
        tagline: "Upload files straight to a private S3 folder",
      },
      {
        emoji: "📥",
        name: "File Drop — Download",
        path: "/file-drop/download",
        tagline: "Pull everything down to the Mac (admin code)",
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
        emoji: "⚡",
        name: "Quick Bets",
        path: "/quick-bets",
        tagline: "Best-chance parlays + favorites combos",
      },
      {
        emoji: "🏈",
        name: "NFL Card",
        path: "/nfl-card",
        tagline: "Week 1 parlay tickets — one button each",
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
    /* Ashley's pages. They are hers, not tools for site visitors. This group
     * does two jobs: it is how Patrick reaches them from the modal and /jump,
     * and it IS the page at /ash — Ashley's own directory renders exactly this
     * group and nothing else (looked up by `id`, so relabelling the heading
     * can't break it). Add a page of hers here and it appears on both.
     *
     * The taglines are read by Ashley on /ash as well as by Patrick, so write
     * them for her: "Client transition book", not "Ashley's transition book".
     *
     * It was the "Banking" group, holding /ashley and /prospects, until
     * 2026-09-16. */
    id: "ashley",
    label: "Ashley",
    items: [
      {
        emoji: "🏦",
        name: "Client Tracker",
        path: "/ashley",
        tagline: "Client transition book — sign in",
      },
      {
        emoji: "📇",
        name: "Prospects",
        path: "/prospects",
        tagline: "Houston C&I calling list",
      },
      {
        emoji: "🌸",
        name: "Mother's Day 2026",
        path: "/mothers-day-2026",
        tagline: "Your spa day — from the two who love you most",
      },
      {
        emoji: "💜",
        name: "Ashley's Pages",
        path: "/ash",
        tagline: "This list, as a page for Ashley's phone",
      },
    ],
  },
];

/* The group /ash renders. Exported from here rather than found inside that page
 * so the lookup lives beside the `id` it depends on. */
export const ASHLEY_GROUP = PRIVATE_GROUPS.find((g) => g.id === "ashley");
