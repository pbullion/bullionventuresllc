import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

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
 * `robots` tag below is for, since there is no site-wide robots.txt. If any of
 * this ever needs to be genuinely private, the fix is auth on the routes and on
 * the backend endpoints they read, not a quieter list. */
export default function Jump() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = "Jump to — Bullion Ventures LLC";
    /* Injected rather than put in index.html: this is a SPA with one shared
     * document head, so a static tag would hide the whole site. Removed on
     * unmount so navigating away restores the default. */
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = "Bullion Ventures LLC";
      meta.remove();
    };
  }, []);

  /* Drop the row for the page you are already on — /jump is in the list so the
   * modal offers it, and a link to here from here is dead weight. Matching on
   * pathname rather than hardcoding "/jump" means this keeps working if the
   * route is ever moved or aliased. */
  const groups = PRIVATE_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((t) => t.path !== pathname),
  })).filter((g) => g.items.length > 0);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <main style={S.page}>
      <style>{CSS}</style>
      <div style={S.shell}>
        <header style={S.head}>
          <div style={S.eyebrow}>Private</div>
          <h1 style={S.title}>Jump to</h1>
          <p style={S.note}>
            {total} unlisted {total === 1 ? "page" : "pages"} — none of these are
            on the home page. The same list is one press-and-hold on the
            wordmark away.
          </p>
        </header>

        {groups.map((group) => (
          <section key={group.label} style={S.group}>
            <h2 style={S.groupLabel}>
              {group.label}
              <span style={S.groupCount}>{group.items.length}</span>
            </h2>
            <div style={S.grid}>
              {group.items.map((t) => (
                <Link key={t.path} to={t.path} className="bv-jump-row">
                  <span style={S.tile} aria-hidden="true">
                    <span style={{ fontSize: 22, lineHeight: 1 }}>
                      {t.emoji}
                    </span>
                  </span>
                  <span style={S.body}>
                    <span style={S.name}>{t.name}</span>
                    <span style={S.tagline}>{t.tagline}</span>
                    <span style={S.path}>{t.path}</span>
                  </span>
                  <span style={S.arrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

const CSS = `
.bv-jump-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 13px 14px;
  border-radius: 13px;
  background: #101015;
  border: 1px solid #24242e;
  color: inherit;
  text-decoration: none;
  transition: background-color .15s ease, border-color .15s ease,
    transform .15s ease;
}
.bv-jump-row:hover {
  background: #1b1b23;
  border-color: rgba(224, 178, 76, .45);
  transform: translateY(-1px);
}
.bv-jump-row:focus-visible {
  outline: 2px solid #e0b24c;
  outline-offset: 2px;
}
/* The lift is decoration; anyone who has asked not to see motion loses it and
   keeps every colour cue. */
@media (prefers-reduced-motion: reduce) {
  .bv-jump-row { transition: none; }
  .bv-jump-row:hover { transform: none; }
}
`;

const S = {
  page: {
    flex: 1,
    background: "#0a0a0d",
    color: "#f4f4f7",
    /* Left/right insets for a notched phone in landscape; the bottom one keeps
     * the last row clear of the home indicator. `max()`/`calc()` make this a
     * no-op anywhere without insets. */
    padding:
      "36px max(18px, env(safe-area-inset-right)) calc(56px + env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left))",
    boxSizing: "border-box",
    /* This is a flex item of App.jsx's column, and a flex item's implicit
       min-width: auto refuses to shrink below min-content — the same trap
       EnginePage documents. */
    width: "100%",
    minWidth: 0,
  },
  shell: { maxWidth: 940, margin: "0 auto" },
  head: { marginBottom: 26 },
  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#e0b24c",
    marginBottom: 6,
  },
  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#f4f4f7",
  },
  note: {
    margin: "10px 0 0",
    fontSize: 13.5,
    lineHeight: 1.55,
    color: "#83839a",
    maxWidth: 560,
  },
  group: { marginBottom: 26 },
  groupLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "0 0 10px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.13em",
    textTransform: "uppercase",
    color: "#5f5f74",
  },
  groupCount: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 0,
    color: "#5f5f74",
    background: "#15151c",
    border: "1px solid #24242e",
    borderRadius: 999,
    padding: "1px 7px",
  },
  /* auto-fill rather than auto-fit: a group with one row (none today, but
     Banking is two) keeps a card-width tile instead of stretching it across
     the whole 940px shell.
     min(290px, 100%) rather than a bare 290px, which is the same fix
     /my-bets already carries (see its `gameList`): a bare fixed floor is the
     track's minimum contribution and is NOT clamped to the container, so
     anything under ~326px — a 320px phone, or a split-screen pane on a tablet
     or foldable — pans the whole page sideways instead of wrapping. */
  grid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fill, minmax(min(290px, 100%), 1fr))",
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 11,
    background: "#17171e",
    border: "1px solid #24242e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: { minWidth: 0 },
  name: {
    display: "block",
    fontSize: 15,
    fontWeight: 700,
    color: "#f4f4f7",
  },
  tagline: {
    display: "block",
    fontSize: 12.5,
    color: "#83839a",
    marginTop: 1,
  },
  /* Deliberately NOT the group label's #5f5f74, which is 3.0:1 on this card and
     fails AA. That colour is fine for a heading you skim; the path is the one
     string on the page you might have to read a character at a time and then
     type into another device, so it gets 4.7:1 — still dimmer than the tagline
     above it, so the hierarchy survives. */
  path: {
    display: "block",
    marginTop: 3,
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
    fontSize: 11.5,
    color: "#7a7a92",
  },
  arrow: {
    marginLeft: "auto",
    paddingLeft: 6,
    color: "#83839a",
    fontSize: 15,
    fontWeight: 700,
  },
};
