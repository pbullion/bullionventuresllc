import { Link } from "react-router-dom";

/* Palette. "Bullion" is the brand, so the accent is gold rather than the stock
 * template indigo (#6c63ff) this page shipped with — that colour said nothing
 * about the company and is on every SaaS landing page on the internet. Dark
 * shell is kept because every tool the page links to is dark. */
const C = {
  bg: "#0a0a0d",
  surface: "#14141a",
  surfaceHi: "#1b1b23",
  border: "#24242e",
  text: "#f4f4f7",
  dim: "#b6b6c6",
  muted: "#83839a",
  gold: "#e0b24c",
  goldBright: "#f6d585",
};

/* Two groups, taken from what each entry actually IS in this repo rather than
 * from marketing judgement: `apps` all have their own Home/Privacy/Support
 * landing pages (the App Store set), `tools` are single-page utilities that run
 * in the browser on this site. Splitting them is what turns one undifferentiated
 * wall of sixteen boxes into something scannable.
 *
 * When adding a page, append it to the right array here — see CLAUDE.md, the
 * homepage card is a required step, not optional. */
const apps = [
  {
    icon: "/images/app-icons/daycare-memory-vault.png",
    name: "Daycare Memory Vault",
    path: "/daycare-memory-vault",
    tagline: "Daycare photos, saved forever",
    description:
      "Every photo and video your daycare posted of your child to Procare — collected, organized by month, and saved forever in a private vault. Download everything or browse a themed website with filters and captions.",
  },
  {
    icon: "/images/app-icons/zargle.png",
    name: "Zargle",
    path: "/zargle",
    tagline: "Async multiplayer Farkle",
    description:
      "Async multiplayer Farkle on your phone. Challenge friends, take turns on your own time, and race to 10,000 points. Push notifications fire when it's your turn.",
  },
  {
    icon: "/images/app-icons/southside.png",
    name: "Southside Baptist Church",
    path: "/southside",
    tagline: "A church family, in one place",
    description:
      "The congregation app for Southside Baptist Church in Port Neches, Texas. Calendar and RSVPs, the weekly bulletin, a moderated photo feed, a prayer wall, ministry group chats, and sermon notes — plus a guest mode so visitors can look around before they ever walk in.",
  },
  {
    icon: "/images/app-icons/slumbr.png",
    name: "slumbr",
    path: "/slumbr",
    tagline: "A smart baby monitor",
    description:
      "Stream live video from baby's room to your phone, get noise alerts, and play from a library of 13+ built-in lullabies.",
  },
  {
    icon: "/images/app-icons/debriefly.png",
    name: "debriefly",
    path: "/debriefly",
    tagline: "Your daily briefing, from a photo",
    description:
      "Snap photos of schedules, let AI extract the dates and times, and get nightly and weekly summaries delivered as notifications.",
  },
  {
    icon: "/images/app-icons/mancave.png",
    name: "Mancave Displays",
    path: "/mancave-displays",
    tagline: "Live odds on a dedicated screen",
    description:
      "Live sports odds displays and LED sports tickers for your space. Show real-time betting lines and live scores on a dedicated screen or LED matrix wall.",
  },
  {
    icon: "/images/app-icons/receipt-tracker.png",
    name: "Receipt Tax Tracker",
    path: "/receipt-tax-tracker",
    tagline: "Sales tax, scanned automatically",
    description:
      "AI-powered receipt scanner that extracts retailer, date, total, and tax info from photos. Track your year-to-date sales tax automatically.",
  },
  {
    icon: "/images/app-icons/learn-and-play.png",
    name: "Learn & Play!",
    path: "/learn-and-play",
    tagline: "Learning games for kids",
    description:
      "An educational mobile game for kids featuring Bubble Blast and Flashcard games. Learn animals, food, transportation and more through fun interactive gameplay.",
  },
  {
    icon: "/images/app-icons/palladium-2026.png",
    name: "Cancún Trip Planner",
    path: "/palladium-2026",
    tagline: "One app for the whole trip",
    description:
      "A private trip companion for our Cancún vacation at Grand Palladium Costa Mujeres. Flights, resort maps, dining, and itinerary — all in one place for the three families.",
  },
];

/* The five betting screens are deliberately NOT here — they live in
 * src/components/PrivateTools.jsx and are reachable only by long-pressing the
 * navbar wordmark (Patrick, 2026-07-30). Adding one back to this array puts it
 * on the public home page. */
const tools = [
  {
    emoji: "🏈",
    name: "FF Draft War Room",
    path: "/ffdraft",
    tagline: "Live ESPN draft sync + consensus rankings",
    description:
      "A fantasy football draft assistant that syncs live with an ESPN draft — picks disappear off the board as they happen. Blends FantasyPros expert consensus, real mock-draft ADP, ESPN projections, and Boris Chen tiers into one board, with league-specific value math, tier alerts, and pick suggestions.",
  },
  {
    emoji: "🍽️",
    name: "Houston Restaurant Weeks",
    path: "/hrw",
    tagline: "Search 9,000 dishes",
    description:
      "Every restaurant and every prix-fixe menu in Houston Restaurant Weeks 2026 (August 1 – September 7), searchable down to the dish. Filter by meal, price, neighborhood and diet, see what's closest to you on a map, and save a shortlist before the clock runs out.",
  },
  {
    emoji: "🚗",
    name: "Tesla Dashboard",
    path: "/tesla-dashboard",
    tagline: "Built for the in-car browser",
    description:
      "A live sports and weather dashboard designed for Tesla's in-car browser. Real-time odds, upcoming games, local weather, and news at a glance.",
  },
  {
    emoji: "🌀",
    name: "Gulf Hurricane",
    path: "/gulf-hurricane",
    tagline: "NHC outlooks and live satellite",
    description:
      "The latest NOAA / National Hurricane Center tropical outlooks and live GOES-East satellite imagery for the Gulf and tropical Atlantic — no frills, just the most current forecast pics, formatted for your phone.",
  },
  {
    emoji: "🏖️",
    name: "Trip Planner",
    path: "/tripplanner",
    tagline: "Meals & packing for group trips",
    description:
      "Plan a multi-family trip day by day: a shared meal grid for every breakfast, lunch, dinner and snack, plus a packing and necessities checklist. Everyone with the link can edit, and every trip gets its own page you can reuse for the next one.",
  },
  {
    emoji: "🎲",
    name: "Farkle Scorer",
    path: "/farkle",
    tagline: "Score the dice game",
    description:
      "A digital score tracker for the classic dice game Farkle. Enter player names, add points with quick-tap buttons, and track everyone's score. First to 10,000 wins.",
  },
];

/* Hover, focus, line clamping and fluid type — none of which an inline style
 * object can express, hence one injected sheet (same pattern as the betting
 * pages' MB_CSS / CV_CSS). */
const HOME_CSS = `
.bv-home a { text-decoration: none; }

/* Whole card is the link, not a "Learn More" button buried inside it — sixteen
   copies of that button was most of what made the old grid look like a
   template. */
.bv-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 16px;
  padding: 22px;
  color: inherit;
  transition: transform .18s ease, border-color .18s ease,
              background-color .18s ease, box-shadow .18s ease;
}
.bv-card:hover {
  transform: translateY(-3px);
  background: ${C.surfaceHi};
  border-color: rgba(224, 178, 76, .45);
  box-shadow: 0 10px 30px -12px rgba(0, 0, 0, .7);
}
.bv-card:focus-visible {
  outline: 2px solid ${C.gold};
  outline-offset: 2px;
}
.bv-card:hover .bv-arrow { color: ${C.gold}; transform: translateX(3px); }
.bv-arrow { transition: color .18s ease, transform .18s ease; }

/* Clamped so every card is the same height and the grid reads as a grid. The
   full text stays in the DOM for search and screen readers. */
.bv-desc {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 260px min gives four columns on a desktop, which lays eight cards out as two
   clean rows instead of the ragged 3+3+2 a 300px min produced. */
.bv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: 16px;
}

/* One line, always. Card heights already match via the clamped description, but
   a tagline that wrapped pushed that card's description down a line and broke
   the alignment across the row. */
.bv-tagline {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Fluid so the hero never needs a breakpoint to stop overflowing a phone. */
.bv-hero-title { font-size: clamp(32px, 5.4vw, 56px); }
.bv-hero-sub { font-size: clamp(15px, 1.6vw, 18px); }

.bv-cta {
  transition: background-color .18s ease, border-color .18s ease,
              transform .18s ease;
}
.bv-cta:hover { transform: translateY(-1px); }
.bv-cta-primary:hover { background: ${C.goldBright}; }
.bv-cta-ghost:hover { border-color: ${C.gold}; color: ${C.text}; }

@media (max-width: 640px) {
  .bv-stats { gap: 20px !important; }
}
`;

function Card({ item }) {
  return (
    <Link to={item.path} className="bv-card">
      <div style={S.iconTile}>
        {item.icon ? (
          <img src={item.icon} alt="" style={S.iconImg} />
        ) : (
          <span style={{ fontSize: 28, lineHeight: 1 }}>{item.emoji}</span>
        )}
      </div>
      <div style={S.cardHead}>
        <h3 style={S.cardName}>{item.name}</h3>
        <span className="bv-arrow" style={S.arrow} aria-hidden="true">
          →
        </span>
      </div>
      <div className="bv-tagline" style={S.cardTagline}>
        {item.tagline}
      </div>
      <p className="bv-desc" style={S.cardDesc}>
        {item.description}
      </p>
    </Link>
  );
}

function Section({ id, eyebrow, title, blurb, items }) {
  return (
    <section id={id} style={S.section}>
      <div style={S.sectionHead}>
        <div style={S.eyebrow}>
          <span style={S.eyebrowRule} />
          {eyebrow}
        </div>
        <h2 style={S.sectionTitle}>{title}</h2>
        <p style={S.sectionBlurb}>{blurb}</p>
      </div>
      <div className="bv-grid">
        {items.map((item) => (
          <Card key={item.path} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="bv-home" style={S.page}>
      <style>{HOME_CSS}</style>

      {/* ── Hero ── */}
      <header style={S.hero}>
        {/* Two stacked washes: a warm gold bloom behind the headline and a fine
            grid, so the hero has some depth instead of being a flat gradient
            with one line of text in the middle of it. */}
        <div style={S.heroGlow} aria-hidden="true" />
        <div style={S.heroGrid} aria-hidden="true" />
        <div style={S.heroInner}>
          <div style={S.brandRow}>
            <span style={S.brandDot} />
            Bullion Ventures LLC
          </div>
          <h1 className="bv-hero-title" style={S.heroTitle}>
            Apps and tools that make{" "}
            <span style={S.heroAccent}>everyday life</span> better.
          </h1>
          <p className="bv-hero-sub" style={S.heroSub}>
            A small studio shipping iOS apps and live, data-driven dashboards —
            from a baby monitor and a daycare photo vault to real-time market
            engines that price their own edge.
          </p>
          <div style={S.ctaRow}>
            <a href="#apps" className="bv-cta bv-cta-primary" style={S.ctaPrimary}>
              Browse the apps
            </a>
            <a href="#tools" className="bv-cta bv-cta-ghost" style={S.ctaGhost}>
              See the live tools
            </a>
          </div>
          {/* Counts come straight off the two arrays, so they can't drift out of
              date when a product is added. */}
          <div className="bv-stats" style={S.stats}>
            <Stat n={apps.length + tools.length} label="Products shipped" />
            <Stat n={apps.length} label="Apps" />
            <Stat n={tools.length} label="Live tools" />
          </div>
        </div>
      </header>

      <main style={S.main}>
        <Section
          id="apps"
          eyebrow="Apps"
          title="Apps and products"
          blurb="Each one has its own landing page, support and privacy pages — the things people download and use."
          items={apps}
        />
        <Section
          id="tools"
          eyebrow="Live tools"
          title="Live tools and dashboards"
          blurb="Single-purpose utilities that open right here in the browser and update on their own, several wired to live market and sports data."
          items={tools}
        />
      </main>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div>
      <div style={S.statNum}>{n}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

const S = {
  page: { backgroundColor: C.bg, color: C.text, minHeight: "100%" },

  hero: {
    position: "relative",
    overflow: "hidden",
    borderBottom: `1px solid ${C.border}`,
    padding: "88px 24px 72px",
  },
  heroGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(120% 90% at 50% -20%, rgba(224,178,76,.16) 0%, rgba(224,178,76,.04) 38%, transparent 68%)",
    pointerEvents: "none",
  },
  heroGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px)",
    backgroundSize: "56px 56px",
    // Fades the grid out toward the bottom so it reads as texture, not a table.
    maskImage:
      "radial-gradient(100% 70% at 50% 0%, #000 30%, transparent 80%)",
    WebkitMaskImage:
      "radial-gradient(100% 70% at 50% 0%, #000 30%, transparent 80%)",
    pointerEvents: "none",
  },
  heroInner: {
    position: "relative",
    maxWidth: 880,
    margin: "0 auto",
    textAlign: "center",
  },
  brandRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: C.gold,
    border: `1px solid rgba(224,178,76,.28)`,
    background: "rgba(224,178,76,.06)",
    borderRadius: 999,
    padding: "6px 14px",
    marginBottom: 26,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: C.gold,
    boxShadow: `0 0 10px ${C.gold}`,
  },
  heroTitle: {
    margin: "0 0 18px",
    fontWeight: 800,
    lineHeight: 1.08,
    letterSpacing: "-0.025em",
    color: "#fff",
  },
  heroAccent: {
    background: `linear-gradient(100deg, ${C.goldBright}, ${C.gold})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },
  heroSub: {
    margin: "0 auto",
    maxWidth: 620,
    color: C.dim,
    lineHeight: 1.65,
  },
  ctaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginTop: 30,
  },
  ctaPrimary: {
    background: C.gold,
    color: "#171208",
    fontWeight: 700,
    fontSize: 14.5,
    padding: "12px 22px",
    borderRadius: 10,
    border: "1px solid transparent",
  },
  ctaGhost: {
    color: C.dim,
    fontWeight: 600,
    fontSize: 14.5,
    padding: "12px 22px",
    borderRadius: 10,
    border: `1px solid ${C.border}`,
  },
  stats: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 44,
    marginTop: 46,
    paddingTop: 30,
    borderTop: `1px solid ${C.border}`,
  },
  statNum: {
    fontSize: 26,
    fontWeight: 800,
    color: C.text,
    letterSpacing: "-0.02em",
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: C.muted,
    marginTop: 4,
  },

  main: { maxWidth: 1280, margin: "0 auto", padding: "0 24px 88px" },
  section: { paddingTop: 68 },
  sectionHead: { maxWidth: 640, marginBottom: 26 },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 12,
  },
  eyebrowRule: { width: 22, height: 2, background: C.gold, borderRadius: 2 },
  sectionTitle: {
    margin: "0 0 8px",
    fontSize: 27,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#fff",
  },
  sectionBlurb: { margin: 0, fontSize: 14.5, color: C.muted, lineHeight: 1.6 },

  iconTile: {
    width: 50,
    height: 50,
    borderRadius: 13,
    background: "#0f0f14",
    border: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  // Emoji and PNG icons used to render at very different weights (40px glyph vs
  // a 64px image); one tile size for both keeps the grid even.
  iconImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardHead: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginTop: 2,
  },
  cardName: {
    margin: 0,
    fontSize: 16.5,
    fontWeight: 700,
    color: C.text,
    letterSpacing: "-0.01em",
  },
  arrow: { marginLeft: "auto", color: C.muted, fontSize: 15, fontWeight: 700 },
  cardTagline: {
    fontSize: 12.5,
    fontWeight: 600,
    color: C.gold,
    marginTop: -4,
  },
  cardDesc: { margin: 0, fontSize: 13.5, color: C.muted, lineHeight: 1.6 },
};
