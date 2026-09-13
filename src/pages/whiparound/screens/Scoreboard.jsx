import { AdaptiveRows, BaseDiamond, Chip, Heading, Note, Panel, TeamLogo, Text } from "../components";
import { useMeasuredSize } from "../hooks";
import { T, W, edge } from "../theme";
import {
  CELL_WEIGHT,
  DECK,
  GRID,
  LAMP,
  LAMP_DIM,
  MATCHUP_ROW_MAX,
  MATCHUP_ROW_MIN,
  MATCHUP_SPACING,
  MONO,
  PLAY_ROW_MAX,
  PLAY_ROW_MIN,
  PLAY_SPACING,
  TOTAL_WEIGHT,
  clipLines,
  evenRow,
  railColor,
  teamWeight,
} from "./ScoreboardLook";

/* THE STADIUM BOARD — a port of whiparound-firetv's ui/Scoreboard.kt. One team,
 * one game, the whole screen, for the Astros, the Cowboys and the Rockets.
 *
 * Everything else on the wall answers "where should I look"; this answers "what
 * is the score". One component for three sports: a line score, a totals block,
 * what is happening now, what already happened, and the numbers. The sports
 * differ in the CONTENTS of three panels and nothing else.
 *
 * IT LOOKS LIKE THE BOARD OVER THE OUTFIELD WALL, and that is functional:
 *   - The deck is darker than the app and the numerals are amber and MONOSPACED,
 *     so an inning column stays a column.
 *   - RUNS ARE THE BIG NUMBER and they live in the R column. Repeating the score
 *     somewhere larger would be the same number twice on one screen.
 *   - AN INNING NOT YET BATTED IS BLANK, NOT ZERO. The backend sends a short
 *     array on purpose and the grid pads it with nothing.
 *
 * Units are stage px = tvOS pt. Every Compose weight is wrapped so a padded
 * panel still gets exactly its share (a padded flex item with basis 0 starts
 * from its padding and ends up wider than its weight).
 */

const grow = (w) => ({ flex: `${w} 1 0`, minWidth: 0, minHeight: 0 });
const spacer = { flex: "1 1 0", minWidth: 0, minHeight: 0 };

export function ScoreboardScreen({ board }) {
  const rail = railColor(board.teamColorHex);
  return (
    <div style={{ ...grow(1), display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ ...grow(0.46), display: "flex" }}>
        <Deck board={board} rail={rail} />
      </div>
      <div style={{ ...grow(0.54), display: "flex", gap: 12 }}>
        {/* Before first pitch there are no plays and no box score, so the bottom
            half is ONE panel. Padding the three-panel layout with empty cards
            would say the feed had failed; a pregame board genuinely has less. */}
        {board.isPregame ? (
          <Slot weight={1}>
            <MatchupPanel board={board} />
          </Slot>
        ) : (
          <>
            {/* 0.26 / 0.44 / 0.30: the left panel has room to give (a winner and
                a margin, or a batter and a diamond); the two on the right were
                the ones truncating. */}
            <Slot weight={0.26}>
              <NowPanel board={board} rail={rail} />
            </Slot>
            <Slot weight={0.44}>
              <BigPlaysPanel board={board} />
            </Slot>
            <Slot weight={0.3}>
              <StatsPanel board={board} />
            </Slot>
          </>
        )}
      </div>
    </div>
  );
}

function Slot({ weight, children }) {
  return <div style={{ ...grow(weight), display: "flex" }}>{children}</div>;
}

/* ─────────────── the deck ─────────────── */

function Deck({ board, rail }) {
  return (
    <div
      style={{
        ...grow(1),
        background: DECK,
        ...edge(GRID, 1),
        borderRadius: 18,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        overflow: "hidden",
      }}
    >
      <DeckHeader board={board} rail={rail} />
      {/* NO GRID BEFORE FIRST PITCH. Nine empty inning columns and three dashes
          is a scoreboard whose data failed to load — it shipped that way once and
          read exactly like an outage. */}
      {board.isPregame ? (
        <PregameDeck board={board} />
      ) : (
        <>
          <ColumnLabels board={board} />
          {/* Away on top, home underneath — the order every scoreboard uses, not
              the order the payload happens to be in. */}
          <SideRow board={board} side={board.away} isHome={false} />
          <SideRow board={board} side={board.home} isHome />
          {board.leaders.length > 0 && <LeaderStrip board={board} />}
        </>
      )}
    </div>
  );
}

function DeckHeader({ board, rail }) {
  /* THE STATUS IS THE LOUDEST THING after the runs — "B7" tells a fan more than
   * the score does. Pregame it is the backend's CENTRAL label, never ESPN's
   * Eastern one; live the half-inning code or quarter; final the word. */
  const status =
    board.periodLabel ?? (board.isPregame ? board.startLabel : null) ?? board.status?.toUpperCase() ?? "";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", flexShrink: 0 }}>
      <div style={{ width: 10, height: 42, background: rail, borderRadius: 5, flexShrink: 0 }} />
      <Text size={40} weight={W.black} spacing={2.6} style={{ flexShrink: 0, ...clipLines(40) }}>
        {board.title.toUpperCase()}
      </Text>
      <Chip text={board.leagueLabel} color={T.muted} size={24} />
      {board.venue ? (
        <Text size={28} weight={W.bold} color={T.muted} lines={1} style={spacer}>
          {board.venue.toUpperCase()}
        </Text>
      ) : (
        <div style={spacer} />
      )}
      {board.broadcast && <Chip text={board.broadcast.toUpperCase()} color={T.muted} size={24} />}
      <Text
        size={40}
        weight={W.black}
        color={board.isLive ? LAMP : T.text}
        style={{ fontFamily: MONO, flexShrink: 0, ...clipLines(40) }}
      >
        {status}
      </Text>
      {/* The half-inning code is terse on purpose, so the sentence sits beside it
          while it is being played. */}
      {board.isLive && board.periodLabel != null && board.status && (
        <Text size={28} weight={W.bold} color={T.muted} style={{ flexShrink: 0, ...clipLines(28) }}>
          {board.status.toUpperCase()}
        </Text>
      )}
    </div>
  );
}

/// Away, "AT", home — the only thing a board can honestly say before a pitch is
/// thrown. Both sides the same size: with no result to lean on, dimming the
/// opponent would dim half the information.
function PregameDeck({ board }) {
  return (
    <div style={{ ...grow(1), display: "flex", alignItems: "center", width: "100%" }}>
      <MatchupSide side={board.away} />
      <Text size={38} weight={W.black} color={T.muted} spacing={2} style={{ flexShrink: 0 }}>
        AT
      </Text>
      <MatchupSide side={board.home} />
    </div>
  );
}

function MatchupSide({ side }) {
  return (
    <div style={{ ...grow(1), display: "flex", alignItems: "center", gap: 14 }}>
      <div style={spacer} />
      <TeamLogo url={side.logo} size={84} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Text size={48} weight={W.black} spacing={1} lines={1}>
          {(side.name ?? side.abbr).toUpperCase()}
        </Text>
        <Text size={32} weight={W.bold} color={T.muted} style={clipLines(32)}>
          {side.record ?? "—"}
        </Text>
      </div>
      <div style={spacer} />
    </div>
  );
}

function ColumnLabels({ board }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", flexShrink: 0 }}>
      <div style={grow(teamWeight(board))} />
      {board.columns.map((c, i) => (
        <Cell key={`c${i}`} text={c} color={T.muted} size={30} weight={CELL_WEIGHT} />
      ))}
      <div style={{ width: 10, flexShrink: 0 }} />
      {board.totals.map((t, i) => (
        <Cell key={`t${i}`} text={t} color={T.muted} size={30} weight={TOTAL_WEIGHT} />
      ))}
    </div>
  );
}

function SideRow({ board, side, isHome }) {
  // Ours gets the bright name; the opponent is dimmed. Which game this is should
  // be readable before any number is.
  const ours = (board.mySide === "home") === isHome;
  return (
    <div style={{ ...grow(1), display: "flex", alignItems: "center", width: "100%" }}>
      <div style={{ ...grow(teamWeight(board)), display: "flex", alignItems: "center", gap: 10 }}>
        <TeamLogo url={side.logo} size={58} />
        <div style={{ ...grow(1), display: "flex", flexDirection: "column" }}>
          <Text size={46} weight={W.black} spacing={1} color={ours ? T.text : T.muted} lines={1}>
            {(side.name ?? side.abbr).toUpperCase()}
          </Text>
          {side.record && (
            <Text size={28} weight={W.bold} color={T.muted} style={clipLines(28)}>
              {side.record}
            </Text>
          )}
        </div>
      </div>

      {/* One cell per column, padded with BLANKS rather than zeros: "0" in an
          inning nobody has played claims the team was retired in it, which in
          the bottom of the 9th of a game the home team is winning is backwards. */}
      {board.columns.map((_, i) => {
        const raw = side.linescore[i];
        const v = raw ? raw : null;
        return (
          <Cell
            key={`c${i}`}
            text={v ?? ""}
            // A zero is DIMMED, not hidden: the zeros are what make the innings
            // that scored jump out.
            color={v == null || v === "0" ? LAMP_DIM : LAMP}
            size={48}
            weight={CELL_WEIGHT}
          />
        );
      })}

      <div style={{ width: 10, flexShrink: 0 }} />

      {/* R H E — the runs are the score and the biggest numeral on the screen.
          Football and basketball have one total column and it is the same idea. */}
      {board.totals.map((label, i) => {
        const value =
          label === "R" || label === "T"
            ? side.score
            : label === "H"
              ? side.hits
              : label === "E"
                ? side.errors
                : null;
        const isRuns = i === 0;
        return (
          <Cell
            key={`t${i}`}
            text={value == null ? "–" : String(value)}
            color={isRuns ? T.text : LAMP}
            size={isRuns ? 76 : 48}
            weight={TOTAL_WEIGHT}
          />
        );
      })}
    </div>
  );
}

/// Every numeral on the deck goes through here, so the monospacing and the
/// centring cannot drift between the labels, the innings and the totals.
function Cell({ text, color, size, weight }) {
  return (
    <Text
      size={size}
      weight={W.black}
      color={color}
      align="center"
      style={{ ...grow(weight), fontFamily: MONO, ...clipLines(size) }}
    >
      {text}
    </Text>
  );
}

/* The line under the line score: who is doing the damage. One row, both teams,
 * each side's leaders joined into one sentence because they are read as one —
 * "Walker 3-4, HR, 2 RBI · Wesneski 5.0 IP, 6 K" is a team's night in eleven
 * words. */
function LeaderStrip({ board }) {
  const line = (pick) =>
    board.leaders
      .map(pick)
      .filter(Boolean)
      .map((p) => [p.name, p.line].filter((s) => s != null).join(" "))
      .join("  ·  ");
  const away = line((r) => r.away);
  const home = line((r) => r.home);
  if (away === "" && home === "") return null;
  return (
    <div style={{ display: "flex", gap: 18, width: "100%", flexShrink: 0 }}>
      {[
        [board.away.abbr, away],
        [board.home.abbr, home],
      ].map(([abbr, text], i) => (
        <div key={i} style={{ ...grow(1), display: "flex", alignItems: "center", gap: 8 }}>
          <Text size={28} weight={W.black} color={T.muted} style={{ fontFamily: MONO, flexShrink: 0 }}>
            {abbr}
          </Text>
          {/* `pre`, because the separator is two spaces a side on purpose. */}
          <Text size={30} weight={W.bold} lines={1} style={{ whiteSpace: "pre" }}>
            {text === "" ? "—" : text}
          </Text>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── right now ─────────────── */

function NowPanel({ board, rail }) {
  return (
    <Panel style={{ ...grow(1), overflow: "hidden" }}>
      <NowBody board={board} rail={rail} />
    </Panel>
  );
}

function NowBody({ board, rail }) {
  if (board.isPregame) return <PregameBody board={board} />;
  if (board.sport === "baseball") {
    return board.isLive ? <BaseballNow board={board} /> : <BaseballFinal board={board} />;
  }
  /* Basketball has no situation worth drawing — possession and a shot clock,
   * neither of which reads from ten feet — so its live panel carries the MARGIN.
   * The final panel is shared with football: "who won and by how much" is the
   * same sentence in both sports. */
  if (board.sport === "basketball" && board.isLive) return <BasketballNow board={board} />;
  if (board.isLive) return <FootballNow board={board} rail={rail} />;
  return <FootballFinal board={board} />;
}

/* A Note straight under its heading. In Compose the Note fills the rest of the
 * column and any weighted Spacer beside it gets nothing; two CSS flex spacers
 * would split the height with it instead, so they are left out. `afterSpacer`
 * keeps the one extra gap a zero-height Spacer before the Note still costs. */
function HeadedNote({ heading, text, afterSpacer = false }) {
  return (
    <>
      <Heading text={heading} />
      {afterSpacer && <div style={{ height: 0, flexShrink: 0 }} />}
      <Note text={text} />
    </>
  );
}

/// Not reachable from ScoreboardScreen today (pregame draws THE MATCHUP instead
/// of the three panels), kept so NowPanel's branches are the Kotlin's.
function PregameBody({ board }) {
  const heading =
    board.sport === "baseball" ? "FIRST PITCH" : board.sport === "basketball" ? "TIP-OFF" : "KICKOFF";
  return (
    <>
      <Heading text={heading} />
      <div style={spacer} />
      <Text size={44} weight={W.black} style={clipLines(44, 2)}>
        {board.status ?? "SCHEDULED"}
      </Text>
      <div style={{ height: 6, flexShrink: 0 }} />
      {[board.venue, board.broadcast].filter(Boolean).map((s, i) => (
        <Text key={i} size={32} weight={W.bold} color={T.muted} style={clipLines(32)}>
          {s}
        </Text>
      ))}
      <div style={spacer} />
    </>
  );
}

function BaseballNow({ board }) {
  const now = board.now;
  if (now == null) return <HeadedNote heading="IN PROGRESS" text="Waiting on the next pitch." />;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", width: "100%", flexShrink: 0 }}>
        <div style={{ ...grow(1), display: "flex", flexDirection: "column", gap: 8 }}>
          {/* THE BATTER, OR WHO IS DUE UP — never a blank heading. ESPN publishes
              no batter between half-innings, and AT THE PLATE over nothing reads
              as a failed fetch; DUE UP is what the real board switches to. */}
          {now.batter != null ? (
            <>
              <Heading text="AT THE PLATE" />
              <PersonLine who={now.batter} />
              {now.pitcher && (
                <>
                  <div style={{ height: 4, flexShrink: 0 }} />
                  <Heading text="ON THE MOUND" />
                  <PersonLine who={now.pitcher} />
                </>
              )}
            </>
          ) : now.dueUp.length > 0 ? (
            <>
              <Heading text="DUE UP" />
              {now.dueUp.map((p, i) => (
                <PersonLine key={i} who={p} compact />
              ))}
            </>
          ) : (
            <>
              <Heading text="IN PROGRESS" />
              {now.lastPlay && (
                <Text size={32} color={T.muted} style={clipLines(32, 3)}>
                  {now.lastPlay}
                </Text>
              )}
            </>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
          <BaseDiamond situation={now.asSituation} side={108} />
          {now.count && (
            <Text size={48} weight={W.black} color={LAMP} style={{ fontFamily: MONO }}>
              {now.count}
            </Text>
          )}
        </div>
      </div>
      {/* The last play at the foot of the panel — in baseball that is the PITCH,
          which is what the board at the park shows. Only with a batter to attach
          it to: between innings the panel is already saying who is due up. */}
      {now.batter != null && now.lastPlay && (
        <>
          <div style={spacer} />
          <Heading text="LAST PLAY" />
          <Text size={32} lines={3} style={{ flexShrink: 0 }}>
            {now.lastPlay}
          </Text>
        </>
      )}
    </>
  );
}

function BaseballFinal({ board }) {
  const decisions = board.decisions;
  if (decisions == null) return <HeadedNote heading="FINAL" text="Game over." />;
  return (
    <>
      <Heading text="FINAL" />
      <div style={spacer} />
      {decisions.rows.map(({ mark, who }) => (
        <div key={mark} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexShrink: 0 }}>
          <Text
            size={40}
            weight={W.black}
            color={mark === "L" ? T.down : T.up}
            style={{ fontFamily: MONO, flexShrink: 0 }}
          >
            {mark}
          </Text>
          <PersonLine who={who} compact style={{ flexShrink: 1 }} />
        </div>
      ))}
      <div style={spacer} />
    </>
  );
}

function FootballNow({ board, rail }) {
  const now = board.now;
  if (now == null) return <HeadedNote heading="ON THE FIELD" text="Between plays." />;
  return (
    <>
      <Heading text="ON THE FIELD" />
      <div style={{ height: 2, flexShrink: 0 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {/* The ball first — down and distance means the opposite thing depending
            on who has it. */}
        {now.possessionAbbr && <Chip text={`● ${now.possessionAbbr}`} color={T.text} fill={rail} size={28} />}
        {now.isRedZone && <Chip text="RED ZONE" color={T.hot} size={28} />}
      </div>
      <div style={{ height: 4, flexShrink: 0 }} />
      <Text size={50} weight={W.black} style={{ flexShrink: 0, ...clipLines(50) }}>
        {now.downDistance ?? "—"}
      </Text>
      {now.spot && (
        <Text size={32} weight={W.bold} color={T.muted} style={{ flexShrink: 0, ...clipLines(32) }}>
          {`at ${now.spot}`}
        </Text>
      )}
      <div style={spacer} />
      {now.lastPlay && (
        <>
          <Heading text="LAST PLAY" />
          <Text size={32} lines={3} style={{ flexShrink: 0 }}>
            {now.lastPlay}
          </Text>
        </>
      )}
    </>
  );
}

function BasketballNow({ board }) {
  const a = board.away.score;
  const h = board.home.score;
  if (a == null || h == null) {
    return (
      <>
        <Heading text="ON THE FLOOR" />
        <div style={{ height: 2, flexShrink: 0 }} />
        <Note text="Tipped off." />
      </>
    );
  }
  /* THE MARGIN, in words: the deck is already saying it in digits and the deck
   * is the thing nobody reads across a room. A basketball score changes every
   * twenty seconds; the number that matters is the gap. */
  const gap = Math.abs(a - h);
  const leader = a > h ? board.away : board.home;
  const clock = [board.periodLabel, board.clock].filter((s) => s != null);
  return (
    <>
      <Heading text="ON THE FLOOR" />
      <div style={{ height: 2, flexShrink: 0 }} />
      {gap === 0 ? (
        <Text size={50} weight={W.black} color={T.hot} style={{ flexShrink: 0, ...clipLines(50) }}>
          TIED
        </Text>
      ) : (
        <>
          <Text size={46} weight={W.black} lines={1} style={{ flexShrink: 0 }}>
            {(leader.name ?? leader.abbr).toUpperCase()}
          </Text>
          {/* A two-possession game late is the one worth looking up for, and
              basketball's one-possession unit is 6 — the backend's `oneScore`. */}
          <Text
            size={40}
            weight={W.black}
            color={gap <= 6 ? T.hot : T.muted}
            style={{ flexShrink: 0, ...clipLines(40) }}
          >
            {`by ${gap}`}
          </Text>
        </>
      )}
      <div style={spacer} />
      {clock.length > 0 && (
        <>
          <Heading text="CLOCK" />
          <Text size={36} weight={W.bold} style={{ flexShrink: 0, ...clipLines(36) }}>
            {clock.join(" · ")}
          </Text>
        </>
      )}
    </>
  );
}

function FootballFinal({ board }) {
  const a = board.away.score;
  const h = board.home.score;
  if (a == null || h == null) return <HeadedNote heading="FINAL" text="Game over." afterSpacer />;
  // The margin — the one thing the line score makes you do arithmetic for.
  // Nothing else about a finished game belongs in this slot.
  const winner = a > h ? board.away : board.home;
  const loser = a > h ? board.home : board.away;
  return (
    <>
      <Heading text="FINAL" />
      <div style={spacer} />
      <Text size={46} weight={W.black} lines={1} style={{ flexShrink: 0 }}>
        {(winner.name ?? winner.abbr).toUpperCase()}
      </Text>
      <Text size={34} weight={W.bold} color={T.muted} style={{ flexShrink: 0, ...clipLines(34) }}>
        {a === h ? "tie" : `by ${Math.abs(a - h)} over ${loser.abbr}`}
      </Text>
      <div style={spacer} />
    </>
  );
}

/// `style` lets a Row parent let it shrink sideways so the name ellipsizes; in a
/// column it must not shrink vertically, hence the default.
function PersonLine({ who, compact = false, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flexShrink: 0, ...style }}>
      <Text size={compact ? 34 : 42} weight={W.black} lines={1}>
        {who.name}
      </Text>
      {who.line && (
        <Text size={compact ? 28 : 32} weight={W.bold} color={T.muted} lines={1}>
          {who.line}
        </Text>
      )}
    </div>
  );
}

/* ─────────────── what already happened ─────────────── */

function BigPlaysPanel({ board }) {
  return (
    <Panel style={{ ...grow(1), overflow: "hidden" }}>
      <Heading text="BIG PLAYS" />
      {board.bigPlays.length === 0 ? (
        <Note text={board.isLive ? "Nobody has scored yet." : "No scoring."} />
      ) : (
        <PlayRows board={board} />
      )}
    </Panel>
  );
}

/* ROWS DIVIDE THE SPACE THEY WERE GIVEN. A fixed height was wrong both ways at
 * once: three plays left the panel two-thirds empty, and nine clipped a row to
 * one line with the important half missing. Measure and divide, then clamp. */
function PlayRows({ board }) {
  const [ref, size] = useMeasuredSize();
  const plays = board.bigPlays;
  return (
    <div ref={ref} style={{ ...grow(1), width: "100%", display: "flex", flexDirection: "column" }}>
      {size && (
        <PlayList
          board={board}
          rowHeight={evenRow(size.height, plays.length, PLAY_SPACING, PLAY_ROW_MIN, PLAY_ROW_MAX)}
        />
      )}
    </div>
  );
}

function PlayList({ board, rowHeight }) {
  return (
    <AdaptiveRows
      items={board.bigPlays}
      height={rowHeight}
      spacing={PLAY_SPACING}
      noun="scoring plays"
      renderRow={(play) => <BigPlayRow play={play} board={board} height={rowHeight} />}
    />
  );
}

function BigPlayRow({ play, board, height }) {
  // Whose play it was, so a wall of scoring plays is scannable for ours. The
  // sides carry no team id, so this matches the configured team id rather than
  // guessing from the text.
  const ours = play.teamId != null && play.teamId === board.teamId;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        height,
        flexShrink: 0,
        background: T.chipBg,
        borderRadius: 10,
        padding: "8px 14px",
      }}
    >
      <Text
        size={28}
        weight={W.black}
        color={T.muted}
        style={{ fontFamily: MONO, width: 80, flexShrink: 0, ...clipLines(28) }}
      >
        {play.at ?? ""}
      </Text>
      {/* A home run and a single that scored a runner read as the same sentence
          at ten feet. The mark is what a stadium board actually flashes. */}
      {play.kind && (
        <Text size={26} weight={W.black} color={LAMP} style={{ fontFamily: MONO, flexShrink: 0 }}>
          {play.kind}
        </Text>
      )}
      <Text
        size={30}
        weight={ours ? W.bold : W.normal}
        color={ours ? T.text : T.muted}
        lines={2}
        style={grow(1)}
      >
        {play.text}
      </Text>
      {play.scoreLabel && (
        <Text size={32} weight={W.black} style={{ fontFamily: MONO, flexShrink: 0, ...clipLines(32) }}>
          {play.scoreLabel}
        </Text>
      )}
    </div>
  );
}

/* ─────────────── the numbers ─────────────── */

function StatsPanel({ board }) {
  return (
    <Panel style={{ ...grow(1), overflow: "hidden" }}>
      <Heading text="GAME STATS" />
      {board.stats.length === 0 ? (
        <Note text="No box score yet." />
      ) : (
        <>
          {/* The two abbreviations over their own columns — without them it is
              two numbers per row and no way to tell which is which. */}
          <div style={{ display: "flex", alignItems: "center", width: "100%", flexShrink: 0 }}>
            <div style={spacer} />
            {[board.away.abbr, board.home.abbr].map((abbr, i) => (
              <Cell key={i} text={abbr} color={T.muted} size={28} weight={0.42} />
            ))}
          </div>
          {/* 36, and MEASURED: football sends eight rows and baseball seven. At 40
              the eighth did not fit and the Cowboys board read "+2 more stats" —
              a stats panel hiding stats to make room for a count of them. Do not
              raise it without re-checking the eight. */}
          <AdaptiveRows
            items={board.stats}
            height={36}
            spacing={4}
            noun="stats"
            renderRow={(row) => (
              <div style={{ display: "flex", alignItems: "center", width: "100%", height: 36 }}>
                <Text size={26} weight={W.bold} color={T.muted} lines={1} style={spacer}>
                  {row.label}
                </Text>
                {[row.away, row.home].map((v, i) => (
                  <Cell key={i} text={v ?? "—"} color={T.text} size={30} weight={0.42} />
                ))}
              </div>
            )}
          />
        </>
      )}
    </Panel>
  );
}

/* The pregame panel: who is starting and who leads what. `leaders` carries both
 * — the probables come down as a row like any other — and the rows are named on
 * the wire, so a sport with different categories renders without a change. */
function MatchupPanel({ board }) {
  return (
    <Panel style={{ ...grow(1), overflow: "hidden" }}>
      <Heading text="THE MATCHUP" />
      {board.leaders.length === 0 ? (
        <Note text="No preview available." />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", width: "100%", flexShrink: 0 }}>
            <div style={{ width: 180, flexShrink: 0 }} />
            {[board.away.abbr, board.home.abbr].map((abbr, i) => (
              <Text key={i} size={28} weight={W.black} color={T.muted} style={{ ...grow(1), fontFamily: MONO }}>
                {abbr}
              </Text>
            ))}
          </div>
          <MatchupRows board={board} />
        </>
      )}
    </Panel>
  );
}

// Divided rather than fixed, for the same reason the scoring plays are.
function MatchupRows({ board }) {
  const [ref, size] = useMeasuredSize();
  return (
    <div ref={ref} style={{ ...grow(1), width: "100%", display: "flex", flexDirection: "column" }}>
      {size && (
        <MatchupList
          board={board}
          rowHeight={evenRow(size.height, board.leaders.length, MATCHUP_SPACING, MATCHUP_ROW_MIN, MATCHUP_ROW_MAX)}
        />
      )}
    </div>
  );
}

function MatchupList({ board, rowHeight }) {
  return (
    <AdaptiveRows
      items={board.leaders}
      height={rowHeight}
      spacing={MATCHUP_SPACING}
      noun="categories"
      renderRow={(row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", height: rowHeight }}>
          <Text
            size={28}
            weight={W.black}
            color={T.muted}
            spacing={1.2}
            style={{ width: 170, flexShrink: 0, ...clipLines(28) }}
          >
            {row.label}
          </Text>
          {[row.away, row.home].map((who, i) => (
            <div key={i} style={{ ...grow(1), display: "flex", flexDirection: "column" }}>
              {who == null ? (
                <Text size={32} color={T.muted}>
                  —
                </Text>
              ) : (
                <PersonLine who={who} compact />
              )}
            </div>
          ))}
        </div>
      )}
    />
  );
}
