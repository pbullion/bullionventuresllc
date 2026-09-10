/* COMPONENTS ONLY for the Fantasy Leagues screens — every constant and
 * formatter is in ./theme.js, because eslint's
 * react-refresh/only-export-components fails a file that exports both.
 *
 * LeagueCard is the ONE league shell used by both screens and both providers.
 * A Sleeper league and the ESPN league render through the same component; the
 * only thing `provider` decides is the text in a chip. Layout branches on
 * league.format ('h2h' | 'guillotine'), which is the thing that actually
 * changes the shape of the data.
 *
 * LeagueCard also owns the two states that look identical on both screens —
 * status 'error' and status 'pre_draft' — so neither screen has to repeat
 * them. A card in either state still renders its NAME and provider chip: five
 * clean cards where there should be six would quietly imply there are five
 * leagues, which is the /nhc lesson (an upstream failure must never render as
 * calm).
 *
 * Deliberately does NOT import src/components/engine/* — that is the betting
 * screens' shell, and pages.js ENGINE_PAGES is the Kalshi nav.
 */
import { Link } from "react-router-dom";
import { C, S, PROVIDER_LABEL } from "./theme.js";

/* Full-screen message box for first paint and for a dead backend. Copied from
 * ffdraft/index.jsx's Center — these pages are chrome-less, so an early return
 * has to paint its own background or the user gets a white screen. */
export function Center({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.muted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        padding: 20,
        textAlign: "center",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <div style={{ maxWidth: 420 }}>{children}</div>
    </div>
  );
}

/* The total-failure screen's only control. Before the first successful load
 * there is no PageHeader and therefore no Refresh button, so without this the
 * one way out of "could not reach the fantasy feed" is a full browser reload —
 * and the hook's reload() is sitting right there. /engine-limits keeps its
 * refresh reachable during an outage; so does this. */
export function RetryButton({ onClick, label }) {
  return (
    <div style={{ marginTop: 14 }}>
      <button type="button" onClick={onClick} style={S.refreshBtn}>
        {label || "Try again"}
      </button>
    </div>
  );
}

export function Shell({ children }) {
  return (
    <div style={S.shell}>
      <div style={S.main}>{children}</div>
    </div>
  );
}

/* The only navigation these two screens have — App.jsx hides the site Navbar
 * on /fantasy*, and only the standings row is listed in privatePages.js. */
export function TabStrip({ active }) {
  return (
    // overflowX: with Lineup + Waivers added 2026-09-10 this is 4 tabs; the
    // scroller is a safety net on a narrow phone rather than a wrap, which
    // would push the page content down by a variable amount tab-count to tab-count.
    <nav style={{ ...S.tabs, overflowX: "auto", WebkitOverflowScrolling: "touch", flexWrap: "nowrap" }}>
      <Link to="/fantasy" style={{ ...S.tab(active === "standings"), flexShrink: 0 }}>
        Standings
      </Link>
      <Link to="/fantasy/matchups" style={{ ...S.tab(active === "matchups"), flexShrink: 0 }}>
        Matchups
      </Link>
      <Link to="/fantasy/lineup" style={{ ...S.tab(active === "lineup"), flexShrink: 0 }}>
        Lineup
      </Link>
      <Link to="/fantasy/waivers" style={{ ...S.tab(active === "waivers"), flexShrink: 0 }}>
        Waivers
      </Link>
    </nav>
  );
}

export function Chip({ children, color }) {
  return (
    <span style={color ? { ...S.chip, color, borderColor: color } : S.chip}>
      {children}
    </span>
  );
}

export function StatePanel({ children }) {
  return <div style={S.statePanel}>{children}</div>;
}

/* Avatar + name, used in both the standings table and the matchup cards.
 * `avatar` is null for most guillotine users and for every ESPN team without a
 * logo, so the <img> is conditional rather than a broken-image box. */
export function TeamName({ team, bold }) {
  if (!team) return <span style={{ color: C.muted }}>—</span>;
  const name = team.name || "Unnamed team";
  const owner = team.owner;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        minWidth: 0,
      }}
    >
      {team.avatar ? (
        <img src={team.avatar} alt="" style={S.avatar} loading="lazy" />
      ) : null}
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            fontWeight: bold || team.isMine ? 800 : 600,
            color: team.isMine ? C.blue : C.text,
          }}
        >
          {name}
        </span>
        {owner && owner !== name ? (
          <span style={{ color: C.muted, fontSize: 11.5, marginLeft: 6 }}>
            {owner}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/* An error.code the page can say something useful about. Anything else falls
 * through to the server's own message — never to a bare "error". */
function errorText(error) {
  const code = error && error.code;
  if (code === "espn-cookies-expired" || code === "espn-cookies-missing") {
    return "ESPN sign-in expired — refresh ESPN_S2 / ESPN_SWID on Heroku.";
  }
  const msg = (error && error.message) || "no detail from the server";
  return `Could not read this league: ${msg}`;
}

export function LeagueCard({ league, children }) {
  const provider = PROVIDER_LABEL[league.provider] || league.provider || "—";
  const isGuillotine = league.format === "guillotine";
  const teamCount = league.totalTeams;

  let body;
  if (league.status === "error") {
    body = <StatePanel>{errorText(league.error)}</StatePanel>;
  } else if (league.status === "pre_draft") {
    /* TDMPFFL XIV today, and the ESPN league until it drafts. A clean
     * "not started" card — never a crash, never twelve empty rows. */
    body = (
      <StatePanel>
        {league.note || "Draft has not happened yet."}
      </StatePanel>
    );
  } else {
    body = children;
    /* A league can also carry a non-fatal error alongside real data. Say so
     * above the data rather than dropping it. */
    if (league.error) {
      body = (
        <>
          <div style={{ marginBottom: 10 }}>
            <StatePanel>{errorText(league.error)}</StatePanel>
          </div>
          {children}
        </>
      );
    }
  }

  return (
    <section style={S.card}>
      <header style={S.cardHead}>
        <span style={S.cardTitle}>{league.name || "Unnamed league"}</span>
        <Chip>{provider}</Chip>
        {teamCount ? <Chip>{teamCount} teams</Chip> : null}
        {isGuillotine ? <Chip color={C.purple}>Guillotine</Chip> : null}
        {league.status === "complete" ? <Chip>Final</Chip> : null}
      </header>
      {body}
    </section>
  );
}

/* Header block shared by both screens: title, the week/season line, a manual
 * refresh, and the stale banner. Kept here so the two tabs cannot drift. */
export function PageHeader({ title, subtitle, stale, asOf, onRefresh }) {
  return (
    <>
      <div style={S.headerRow}>
        <div style={{ minWidth: 0 }}>
          <h1 style={S.h1}>{title}</h1>
          {subtitle ? <div style={S.sub}>{subtitle}</div> : null}
        </div>
        <button type="button" onClick={onRefresh} style={S.refreshBtn}>
          Refresh
        </button>
      </div>
      {stale ? (
        <div style={S.staleBanner}>
          Showing last good data{asOf ? ` from ${asOf}` : ""} — the live read
          failed.
        </div>
      ) : null}
    </>
  );
}
