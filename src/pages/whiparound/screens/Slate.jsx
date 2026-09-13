import { Fragment } from "react";
import { Chip, Heading, Note, TeamLogo, Text } from "../components";
import { useMeasuredSize } from "../hooks";
import { kickoff } from "../format";
import { LINE, T, W, edge, side } from "../theme";
import {
  BLOCK_GAP,
  GAP,
  HEAD,
  HEAD_GAP,
  NOTE,
  PER_ROW,
  TITLE_GAP,
  comingUpToday,
  finalTag,
  groupBlocks,
  layoutBlocks,
  noGamesTodayText,
  sharedDay,
  shortChannel,
} from "./SlateLayout";

/* COMING UP and FINAL TODAY — ported from whiparound-firetv's ui/Slate.kt
 * (TonightScreen, FinalsScreen and their cards; RaceScreen is Race.jsx).
 *
 * The two questions the live screens cannot answer — "what else is on" and
 * "what did I miss" — spending the upcoming and final games the backend already
 * sends (COMING UP only the part still to come TODAY, since 2026-09-13). CARDS
 * IN LEAGUE BLOCKS (Patrick, 2026-08-31: "seperate out the games by league…
 * make them more card like with additional info"): the league is said once per
 * block instead of as a chip on every row, and the room that buys goes to the
 * kickoff in CENTRAL, the channel, and both records on a final. Fewer games
 * fit, and each heading says "16 OF 24" so the truncation belongs to a league.
 * The layout rules live in SlateLayout.js.
 *
 * The small type on the cards (26 time, 22 channel chip, 24 record, 28 count)
 * is the Kotlin's own, and the height budget is built on it — see CARD_MIN.
 */

const spacer = (width) => <div style={{ width, flexShrink: 0 }} />;

/* WHAT IS STILL TO COME TODAY — and a sentence when nothing is (Patrick,
 * 2026-09-13: "dont display nhl, nba, on the coming up. only display games
 * coming up that day, if no games, say that").
 *
 * The screen's fourth version. The third showed every upcoming game with today
 * and tomorrow picked out by brightness, which that afternoon put NHL preseason,
 * an October NBA game and nineteen November college basketball rows under
 * today's eight real games. The rule itself is comingUpToday in SlateLayout.js;
 * index.jsx only draws this once the slate has loaded. */
export function TonightScreen({ slate, now }) {
  const games = comingUpToday(slate.upcoming, now);
  if (games.length === 0) return <NoGamesToday message={noGamesTodayText(slate, now)} />;
  return (
    <LeagueBlocks
      title={`COMING UP TODAY · ${games.length}`}
      games={games}
      chronological
      // Every card is today and the title says so once, so a card carries only its time.
      card={(g, height) => <ScheduledCard game={g} now={now} height={height} blockDay="TODAY" />}
    />
  );
}

/* NOTHING LEFT TODAY, SAID IN WORDS.
 *
 * The screen stays in the rotation rather than standing down, because the answer
 * is what he asked for — a wall that silently skips COMING UP says nothing about
 * whether anything is on. Headline type, centred, one line: the panel is the
 * sentence. "NO MORE" once the day has had a game, so Sunday at 11 PM does not
 * read as though nothing was on. */
function NoGamesToday({ message }) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Heading text="COMING UP TODAY" style={{ flexShrink: 0 }} />
      <div
        style={{
          flex: "1 1 0",
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text size={86} weight={W.black} spacing={2} align="center" lines={1}>
          {message}
        </Text>
      </div>
    </div>
  );
}

export function FinalsScreen({ games }) {
  return (
    <LeagueBlocks
      title={`FINAL TODAY · ${games.length}`}
      games={games}
      card={(g, height) => <FinalCard game={g} height={height} />}
    />
  );
}

/* One scheduled game. EVERY ONE IS BRIGHT, AND NONE CARRIES AN ACCENT EDGE:
 * both used to mark the games happening today or tomorrow against the fixtures
 * behind them, and since COMING UP became today's games only there is nothing
 * behind them to mark against.
 *
 * The day is dropped when the block heading already carries it — compared, not
 * assumed, so a card that differs from its block still says its own day. With
 * no parseable `start` it falls back to ESPN's label: a wrong-zone time beats a
 * card that does not say when. */
function ScheduledCard({ game, now, height, blockDay }) {
  const k = kickoff(game, now);
  const left = k ? (k.day === blockDay ? k.time : `${k.day} · ${k.time}`) : (game.status ?? "");
  return (
    <Card height={height}>
      <Matchup game={game} joiner="at" bright />
      <Meta left={left} right={game.broadcast} />
    </Card>
  );
}

/* One finished game as a two-line box score — the scores land in a column, so a
 * glance across a block compares like with like. The records say what the
 * result did to the season. */
function FinalCard({ game, height }) {
  return (
    <Card height={height}>
      <SideLine
        team={game.away}
        leads={game.awayLeads}
        tied={game.tied}
        // Only the away line carries the tag, so the two lines cannot disagree
        // about how the game ended.
        tag={finalTag(game)}
      />
      <SideLine team={game.home} leads={game.homeLeads} tied={game.tied} tag={null} />
    </Card>
  );
}

function SideLine({ team, leads, tied, tag }) {
  const color = side(leads, tied);
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", flexShrink: 0 }}>
      <TeamLogo url={team.logo} size={30} />
      {spacer(8)}
      <Text size={34} weight={W.black} color={color} lines={1} style={{ flexShrink: 0 }}>
        {team.abbr}
      </Text>
      {spacer(10)}
      <Text
        size={24}
        weight={W.semibold}
        color={T.muted}
        lines={1}
        // A Compose Text of "" still takes a line's height; an empty div does not.
        style={{ flex: "1 1 0", minHeight: `${LINE}em` }}
      >
        {team.record ?? ""}
      </Text>
      {tag && (
        <>
          <Text size={24} weight={W.black} color={T.warm} lines={1} style={{ flexShrink: 0 }}>
            {tag}
          </Text>
          {spacer(10)}
        </>
      )}
      <Text size={40} weight={W.black} color={color} lines={1} style={{ flexShrink: 0 }}>
        {team.score != null ? String(team.score) : "–"}
      </Text>
    </div>
  );
}

/// "UAPB at MIZ", each badge in front of its own team: beside its abbreviation
/// a logo is what the eye lands on; bunched at the left it is decoration.
function Matchup({ game, joiner, bright }) {
  const color = bright ? T.text : T.muted;
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", flexShrink: 0 }}>
      <TeamLogo url={game.away.logo} size={30} />
      {spacer(8)}
      <Text size={34} weight={W.black} color={color} lines={1} style={{ flexShrink: 0 }}>
        {game.away.abbr}
      </Text>
      {/* The Kotlin pads with literal spaces; `pre` keeps CSS from collapsing them. */}
      <Text
        size={26}
        weight={W.bold}
        color={T.muted}
        lines={1}
        style={{ flexShrink: 0, whiteSpace: "pre" }}
      >
        {`  ${joiner}  `}
      </Text>
      <TeamLogo url={game.home.logo} size={30} />
      {spacer(8)}
      <Text size={34} weight={W.black} color={color} lines={1} style={{ flex: "1 1 0" }}>
        {game.home.abbr}
      </Text>
    </div>
  );
}

/* When on the left, what channel on the right. THE TIME DOES NOT GIVE WAY — it
 * was the ellipsizing element until 2026-09-12, which made the answer the only
 * thing that could lose. The chip, the extra, absorbs any shortfall. */
function Meta({ left, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", flexShrink: 0 }}>
      <Text
        size={26}
        weight={W.bold}
        color={T.muted}
        lines={1}
        style={{ flexShrink: 0, minHeight: `${LINE}em` }}
      >
        {left}
      </Text>
      <div style={{ flex: "1 1 0", minWidth: 0 }} />
      {right != null && (
        <>
          {spacer(8)}
          <Chip text={shortChannel(right)} size={22} style={{ flexShrink: 1, minWidth: 0 }} />
        </>
      )}
    </div>
  );
}

/* THE CARD. It carried an accent edge (2dp = 4 stage px) for an imminent game
 * until 2026-09-13, when COMING UP became today's games only and every card on
 * it would have carried one; see ScheduledCard. An inset rail down the left was
 * tried before the edge and read as a thicker border — worth knowing before
 * reaching for either again. */
function Card({ height, children }) {
  return (
    <div
      style={{
        width: "100%",
        height,
        boxSizing: "border-box",
        background: T.panel,
        borderRadius: 12,
        ...edge(T.border, 2),
        padding: "10px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

/* The screen: a title, then one block per league. `dayOf` opts a screen into
 * the shared-day heading; neither screen passes one today — FINAL TODAY's title
 * already says the day, and so does COMING UP TODAY's. */
function LeagueBlocks({ title, games, chronological = false, dayOf = null, card }) {
  const blocks = groupBlocks(games, chronological);
  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: TITLE_GAP,
      }}
    >
      <Heading text={title} style={{ flexShrink: 0 }} />
      {blocks.length === 0 ? (
        <Note text="Nothing to show." />
      ) : (
        <Blocks blocks={blocks} dayOf={dayOf} card={card} />
      )}
    </div>
  );
}

/// The Compose BoxWithConstraints: nothing draws until the height is known, so
/// the budget is never spent against a guess.
function Blocks({ blocks, dayOf, card }) {
  const [ref, size] = useMeasuredSize();
  return (
    <div
      ref={ref}
      style={{
        flex: "1 1 0",
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        // Centre what a short slate leaves over (spacedBy … CenterVertically).
        justifyContent: "center",
        gap: BLOCK_GAP,
      }}
    >
      {size && <BlockList blocks={blocks} height={size.height} dayOf={dayOf} card={card} />}
    </div>
  );
}

function BlockList({ blocks, height, dayOf, card }) {
  const { rows, rowHeight } = layoutBlocks(blocks, height);
  // The leagues that did not fit at all, named and counted — a league missing
  // from this screen otherwise looks exactly like one with nothing on.
  const omitted = blocks.filter((_, i) => rows[i] === 0);
  return (
    <>
      {blocks.map((block, i) => {
        // No heading over nothing: that reads as a league whose fetch failed.
        if (rows[i] === 0) return null;
        const shown = block.games.slice(0, rows[i] * PER_ROW);
        // From what is DRAWN, not the whole league: sixteen of forty-one
        // Saturday games can share a day even when the tail does not.
        const day = dayOf ? sharedDay(shown, dayOf) : null;
        const lines = [];
        for (let at = 0; at < shown.length; at += PER_ROW) lines.push(shown.slice(at, at + PER_ROW));
        return (
          <div
            key={block.key}
            style={{ display: "flex", flexDirection: "column", gap: HEAD_GAP, flexShrink: 0 }}
          >
            <BlockHeading
              label={block.label}
              shown={shown.length}
              total={block.games.length}
              day={day}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
              {lines.map((line, r) => (
                // A fixed four-column grid, so a short last row keeps the
                // grid's widths instead of one card stretching across.
                <div
                  key={r}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${PER_ROW}, minmax(0, 1fr))`,
                    columnGap: GAP,
                    height: rowHeight,
                  }}
                >
                  {line.map((g, c) => (
                    <Fragment key={`${g.id}:${c}`}>{card(g, rowHeight, day)}</Fragment>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {omitted.length > 0 && (
        <Text
          size={28}
          weight={W.bold}
          color={T.muted}
          lines={1}
          style={{ height: NOTE, flexShrink: 0 }}
        >
          {`ALSO · ${omitted.map((b) => `${b.label.toUpperCase()} ${b.games.length}`).join(" · ")}`}
        </Text>
      )}
    </>
  );
}

function BlockHeading({ label, shown, total, day }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", height: HEAD, flexShrink: 0 }}>
      <Text size={34} weight={W.black} color={T.text} spacing={1.6} lines={1} style={{ flexShrink: 0 }}>
        {label.toUpperCase()}
      </Text>
      {spacer(14)}
      {/* "16 OF 24" only when some are missing. A count that always reads
          "24 OF 24" trains the eye to skip it on the day it matters. */}
      <Text size={28} weight={W.bold} color={T.muted} lines={1} style={{ flexShrink: 0 }}>
        {shown < total ? `${shown} OF ${total}` : `${total}`}
      </Text>
      {/* The block's shared day, in the heading's colour: it is what a reader
          is looking for rather than checking. */}
      {day && (
        <>
          {spacer(14)}
          <Text size={28} weight={W.black} color={T.text} spacing={1.2} lines={1} style={{ flexShrink: 0 }}>
            {day}
          </Text>
        </>
      )}
      {spacer(14)}
      {/* The rule that makes a heading a heading rather than a first row. */}
      <div style={{ flex: "1 1 0", minWidth: 0, height: 2, background: T.border }} />
    </div>
  );
}
