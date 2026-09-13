import { AdaptiveRows, BaseDiamond, Chip, Heading, HeatBar, Panel, TeamLogo, Text } from "../components";
import { useMeasuredSize } from "../hooks";
import { kickoffLabel } from "../format";
import { LINE, T, W, heat, side, streakColor } from "../theme";

/* The board fallback — a port of GamesPage and everything under it (Hero,
 * HeroSide, RankRow, FinalRow, ClimbFlag, StandingsPanel, StandingRowView,
 * EmptyBoard) in whiparound-firetv's ui/Board.kt.
 *
 * NOT IN THE ROTATION. Patrick removed the ranking screen on 2026-08-30 ("i
 * already have another screen on something else showing everything"). It still
 * renders whenever a pinned screen has no data or every secondary stands down —
 * a wall with a board on it beats a wall with nothing on it. Do not put it back
 * in the cycle.
 *
 * NEVER RE-SORT. `live` arrives ranked by the backend's excitement score, with
 * the configured college team's game pinned first; a client that re-sorts is a
 * second opinion on a ranking that should have one.
 *
 * THE HEAT RAMP IS "LOOK NOW", NOT GOOD/BAD. Cool to hot says how much is
 * happening in a game, and nothing about whether anybody's team is winning.
 */

/* Row height bounds. The floor is what a two-line row NEEDS (a 54pt matchup and
 * a 34pt situation line plus padding); a floor under the type clips rather than
 * drops. The ceiling sits just above what five rows can share, so a light slate
 * spends its slack on JUST FINISHED instead of on posters. */
const MIN_ROW = 126;
const MAX_ROW = 190;

/// Below this a finals section is one squeezed row and a heading — worse than
/// the empty space it replaces.
const FINALS_MIN_ROOM = 200;

const ROW_SPACING = 8;

// Compose `maxLines = 1` with no Ellipsis: clipped, not "…".
const CLIP = { whiteSpace: "nowrap", overflow: "hidden", minWidth: 0 };

/* A Compose Row measures its unweighted children in order, so a later child is
 * the one squeezed. CSS shrinks every child in proportion; a huge shrink factor
 * on the later child makes it give up all its width before an earlier one
 * gives up any. */
const YIELD = 10000;

// ClimbFlag's breathing: 0.35 -> 1 alpha, 700ms linear, reversing.
const KEYFRAMES = "@keyframes whipGamesClimb { from { opacity: 0.35; } to { opacity: 1; } }";

const gapX = (w) => <div style={{ width: w, flexShrink: 0 }} />;

/// "12:04 - 3rd" alone, or "Q4 · 2:10" — the clock only when status lacks it.
const statusLine = (game) => [game.status, game.clockLabel].filter((s) => s != null).join(" · ");

export function GamesPage({ state }) {
  const live = state.slate.live;
  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <style>{KEYFRAMES}</style>
      {live.length === 0 ? <EmptyBoard state={state} /> : <LiveBoard state={state} live={live} />}
    </div>
  );
}

/* The 38/62 split. Each weighted side is a plain wrapper so the Panel's own
 * padding does not skew the split — CSS adds padding to a zero flex basis,
 * Compose's weight does not. */
function Split({ left, right }) {
  return (
    <div style={{ flex: "1 1 0", minHeight: 0, minWidth: 0, display: "flex", gap: 14 }}>
      <div
        style={{
          flex: "38 1 0",
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {left}
      </div>
      <div style={{ flex: "62 1 0", minWidth: 0, minHeight: 0, display: "flex" }}>{right}</div>
    </div>
  );
}

function LiveBoard({ state, live }) {
  const { slate } = state;
  /* Teams the standings panel below already covers. The scoreboard feed's
   * record may not count the game being played (HOU read 63-63 in the hero and
   * 64-63 under it), so the hero yields — but only for teams the panel lists; a
   * Yankees game still wants its record. Matched on the abbreviation, as on the
   * Fire TV. */
  const covered = new Set((slate.standings?.teams ?? []).map((t) => t.abbr));
  return (
    <Split
      left={
        <>
          <Hero game={live[0]} climbing={state.climbing.has(live[0].id)} covered={covered} />
          {/* Under the hero: the hero says a score, the race says what that
              score is worth. */}
          {slate.standings && <StandingsPanel standings={slate.standings} live={live} />}
        </>
      }
      right={
        <Panel style={{ flex: "1 1 0" }}>
          {/* Only when there is a next. With one live game the hero IS the
              ranking, and a heading with nothing under it reads as rows that
              failed to load. */}
          {live.length > 1 && <Heading text="NEXT UP" style={{ flexShrink: 0 }} />}
          <RankList state={state} live={live} />
        </Panel>
      }
    />
  );
}

/* Rows divide the space they were given: measure, divide, cap. A fixed height
 * left the panel 85% empty on a three-game night; a tier by game count cannot
 * know how tall the panel is. Whatever the capped rows leave goes to what just
 * ended — on a heavy slate the live rows take everything and the finals vanish
 * on their own, which is the only place finals appear on this board. */
function RankList({ state, live }) {
  const [ref, size] = useMeasuredSize();
  // Rank carried with the row, not looked up later — a doubleheader is two
  // equal-looking rows.
  const rest = live.slice(1).map((game, i) => ({ rank: i + 2, game }));

  let body = null;
  if (size) {
    const avail = size.height;
    const even = rest.length === 0 ? MIN_ROW : (avail - ROW_SPACING * (rest.length - 1)) / rest.length;
    const rowHeight = Math.min(Math.max(even, MIN_ROW), MAX_ROW);
    const used = rowHeight * rest.length + ROW_SPACING * Math.max(rest.length - 1, 0);
    const leftover = avail - used;
    const finals = state.slate.final;

    body = (
      <>
        <AdaptiveRows
          items={rest}
          height={rowHeight}
          spacing={ROW_SPACING}
          noun="live"
          style={{ flex: "none", height: Math.min(used, avail) }}
          renderRow={({ rank, game }) => (
            <RankRow
              game={game}
              rank={rank}
              climbing={state.climbing.has(game.id)}
              height={rowHeight}
            />
          )}
        />
        {leftover > FINALS_MIN_ROOM && finals.length > 0 && (
          <>
            <Heading text="JUST FINISHED" style={{ flexShrink: 0 }} />
            {/* Asks for leftover - 48 and, as in Compose, is squeezed to what the
                column really has left under the heading. */}
            <AdaptiveRows
              items={finals}
              height={74}
              spacing={6}
              noun="final"
              style={{ flex: "0 1 auto", height: leftover - 48 }}
              renderRow={(game) => <FinalRow game={game} />}
            />
          </>
        )}
      </>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        flex: "1 1 0",
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: ROW_SPACING,
      }}
    >
      {body}
    </div>
  );
}

/* Rank 1, given the space to be read from the doorway. The TV number is the
 * largest thing on the panel — larger than the score and the teams — because
 * this board's answer is a place to look. */
function Hero({ game, climbing, covered }) {
  const hc = heat(game.score);
  /* With no TV mapping (the DEFAULT — WHIPAROUND_TVS unset) the panel loses its
   * largest element and the matchup has to become it, or the hero is a small
   * score floating in a tall empty card. */
  const teamSize = game.tv != null ? 52 : 86;
  /* The reasons often restate the subtitle verbatim ("one score" over ONE
   * SCORE). A reason already shouted a line above is dropped; two at most. */
  const reasons = game.why
    .filter((r) => r.toLowerCase() !== game.subtitle.toLowerCase())
    .slice(0, 2);
  const diamond =
    game.situation?.hasBases && game.sport === "baseball" ? game.situation : null;

  return (
    <Panel style={{ flex: "1 1 0", width: "100%" }}>
      {/* CLIPPED AT THE CONTENT BOX, which is what Compose does. The hero's
          content can be taller than its card — a baseball hero with runners on
          (diamond), a two-line situation and reason chips is ~29pt over with
          no TV mapping and ~34pt over with one — and a Compose Column squeezes
          its last children to the room left, so the heat bar goes to nothing
          and the chips are cut. Unclipped CSS would paint them over the
          standings panel instead. */}
      <div
        style={{
          flex: "1 1 0",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Chip text={game.leagueLabel} color={T.text} size={28} />
          {gapX(8)}
          {/* The channel lives here, beside the league, rather than in a row of
              its own at the bottom — that row cost most of a matchup line. */}
          {game.broadcast != null && (
            <>
              <Chip text={game.broadcast} color={T.muted} />
              {gapX(8)}
            </>
          )}
          {/* Says WHY this game is on top when it is not the ranking's choice:
              the backend pins the configured college team's game whatever its
              score, and without the badge a 31-0 blowout above a thriller reads
              as a broken ranking. */}
          {game.isMyTeam && (
            <>
              <Chip text="MY TEAM" color={T.bg} fill={T.warm} size={26} />
              {gapX(8)}
            </>
          )}
          {climbing && <ClimbFlag />}
          <div style={{ flex: "1 1 0" }} />
          <Text size={70} weight={W.black} color={hc} style={{ flexShrink: 0 }}>
            {game.score ?? "—"}
          </Text>
        </div>

        {game.tv != null && (
          <Text size={110} weight={W.black} color={hc} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
            {`TV ${game.tv}`}
          </Text>
        )}

        {/* Half the slack above the matchup, half below — one spacer at the
            bottom left a tall void under the situation line. */}
        <div style={{ flex: "1 1 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
          <HeroSide
            abbr={game.away.abbr}
            score={game.away.score}
            leads={game.awayLeads}
            tied={game.tied}
            size={teamSize}
            record={covered.has(game.away.abbr) ? null : game.away.record}
            logo={game.away.logo}
          />
          <HeroSide
            abbr={game.home.abbr}
            score={game.home.score}
            leads={game.homeLeads}
            tied={game.tied}
            size={teamSize}
            record={covered.has(game.home.abbr) ? null : game.home.record}
            logo={game.home.logo}
          />
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", flexShrink: 0 }}>
          {/* One line tall even when a live game has no status and no clock —
              a Compose Text("") still takes its line, and without the floor the
              rows below it jump up. */}
          <Text size={50} weight={W.black} lines={1} style={{ flex: "1 1 0", minHeight: 50 * LINE }}>
            {statusLine(game)}
          </Text>
          {/* Rides the clock line: both are the state of this game right now. */}
          {game.homeWinPct != null && (
            <Text size={30} weight={W.black} color={T.muted} style={{ flexShrink: 0 }}>
              {`${game.home.abbr} ${game.homeWinPct}%`}
            </Text>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {game.subtitle !== "" && (
              <Text size={46} weight={W.bold} color={T.warm} lines={2}>
                {game.subtitle}
              </Text>
            )}
            {reasons.length > 0 && (
              <div style={{ display: "flex", gap: 8, minWidth: 0, overflow: "hidden" }}>
                {reasons.map((r, i) => (
                  <Chip key={i} text={r.toUpperCase()} size={24} style={{ flexShrink: i === 0 ? 0 : 1, minWidth: 0 }} />
                ))}
              </div>
            )}
          </div>
          {/* Baseball only: a football situation has no bases, and a diamond
              with nothing to say reads as "nobody on". */}
          {diamond && <BaseDiamond situation={diamond} side={92} />}
        </div>

        <div style={{ flex: "1 1 0" }} />

        {/* The hero keeps its bar — one number and no list beside it to give
            that number a scale. */}
        <HeatBar score={game.score} height={18} heatColor={hc} style={{ flexShrink: 0 }} />
      </div>
    </Panel>
  );
}

function HeroSide({ abbr, score, leads, tied, size, record, logo }) {
  const color = side(leads, tied);
  return (
    <div style={{ display: "flex", alignItems: "flex-end" }}>
      {/* Scaled off the abbreviation's own size, so the badge stays in
          proportion in both hero layouts. */}
      <TeamLogo url={logo} size={size - 4} style={{ marginBottom: 4 }} />
      {gapX(10)}
      <Text size={size} weight={W.black} color={color} style={{ flexShrink: 0, ...CLIP }}>
        {abbr}
      </Text>
      {record != null && (
        <>
          {gapX(12)}
          <Text
            size={28}
            weight={W.bold}
            color={T.muted}
            style={{ flexShrink: 0, whiteSpace: "nowrap", paddingBottom: 10 }}
          >
            {record}
          </Text>
        </>
      )}
      <div style={{ flex: "1 1 0" }} />
      <Text size={size + 6} weight={W.black} color={color} style={{ flexShrink: 0 }}>
        {score ?? "–"}
      </Text>
    </div>
  );
}

/* One row of the ranked list: rank, TV, matchup, score. The row is a CARD on
 * the deck colour with a full-height heat rail — the rail's colour answers "is
 * anything hot" from the doorway before any type is read. There is no little
 * heat bar under the score: in a sorted list the rank and the rail give the
 * number its scale. */
function RankRow({ game, rank, climbing, height }) {
  const hc = heat(game.score);
  return (
    <div
      style={{
        width: "100%",
        height,
        // A climbing row lifts off the deck rather than getting an outline.
        background: climbing ? T.chipBg : T.bg,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 10,
          alignSelf: "stretch",
          flexShrink: 0,
          background: hc,
          borderRadius: "14px 0 0 14px",
        }}
      />
      <div
        style={{
          flex: "1 1 0",
          minWidth: 0,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* A number, not implied by order: "3" is legible mid-glance in a way
            "the third row down" is not. */}
        <Text size={48} weight={W.black} color={T.muted} align="center" style={{ width: 52, flexShrink: 0 }}>
          {rank}
        </Text>

        {/* The TV column keeps its width whether or not a game is mapped, so
            the matchups stay in one vertical line down the list. */}
        <div style={{ width: 112, flexShrink: 0, display: "flex", overflow: "hidden" }}>
          {game.tv != null ? (
            <Chip text={`TV ${game.tv}`} color={hc} size={32} style={{ flexShrink: 1, minWidth: 0 }} />
          ) : (
            <Chip text={game.leagueLabel} size={26} style={{ flexShrink: 1, minWidth: 0 }} />
          )}
        </div>

        <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
            {/* Both badges lead, away then home — the order the score is
                written in. */}
            <TeamLogo url={game.away.logo} size={40} />
            <TeamLogo url={game.home.logo} size={40} />
            {gapX(12)}
            <Text size={54} weight={W.black} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
              {game.line}
            </Text>
            {gapX(14)}
            <Text size={34} weight={W.black} color={T.muted} lines={1}>
              {statusLine(game)}
            </Text>
            {/* Compose measures this row in order, so when room runs out it is
                the flag that yields, not the status before it. */}
            {climbing && (
              <>
                <div style={{ width: 10, flexShrink: YIELD, minWidth: 0 }} />
                <ClimbFlag yields />
              </>
            )}
          </div>
          {game.subtitle !== "" && (
            // Warm when it is a live situation, muted when it is only the
            // reasons.
            <Text
              size={34}
              weight={W.bold}
              color={game.situationText != null ? T.warm : T.muted}
              lines={1}
            >
              {game.subtitle}
            </Text>
          )}
        </div>

        <Text size={58} weight={W.black} color={hc} align="right" style={{ width: 120, flexShrink: 0 }}>
          {game.score ?? "—"}
        </Text>
      </div>
    </div>
  );
}

/// One finished game. Compact on purpose — this section exists only because
/// there was space going spare, so it must never crowd out the live rows.
function FinalRow({ game }) {
  return (
    <div
      style={{
        width: "100%",
        height: 74,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Chip text={game.leagueLabel} size={24} />
      <Text size={40} weight={W.bold} color={T.muted} lines={1} style={{ flex: "1 1 0" }}>
        {game.line}
      </Text>
      <Text size={26} weight={W.black} color={T.border} style={{ flexShrink: 0 }}>
        FINAL
      </Text>
    </div>
  );
}

/// "▲ HEATING UP", breathing. Marks a game whose score jumped since the last
/// poll — the one thing the ranking itself cannot tell you.
function ClimbFlag({ yields = false }) {
  return (
    <Text
      size={28}
      weight={W.black}
      color={T.hot}
      style={{
        flexShrink: yields ? YIELD : 0,
        minWidth: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        animation: "whipGamesClimb 700ms linear infinite alternate",
      }}
    >
      ▲ HEATING UP
    </Text>
  );
}

/* The division race. Compact and natural-height: context for the hero, not a
 * feature — the moment it competes with the live rows it is doing harm. Teams
 * playing right now carry a dot, which ties the table to the games above it.
 * Rendered in BOTH states; idle, it is the most interesting thing available. */
function StandingsPanel({ standings, live }) {
  const playing = new Set(live.flatMap((g) => [g.home.abbr, g.away.abbr]));
  return (
    <Panel style={{ width: "100%", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Text size={34} weight={W.black} color={T.muted} spacing={1.6} lines={1} style={{ flex: "1 1 0" }}>
          {standings.name.toUpperCase()}
        </Text>
        <Text size={26} weight={W.black} color={T.muted} style={{ flexShrink: 0, whiteSpace: "pre" }}>
          {"GB    STRK"}
        </Text>
      </div>
      {/* Tighter than the Panel's 10: a division table is one object. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {standings.teams.map((row, i) => (
          <StandingRowView
            key={i}
            row={row}
            isPlaying={playing.has(row.abbr)}
            // The first row AND no games behind — ESPN once sent a West
            // division worst-first and this panel crowned a 60-88 team. The
            // backend orders by playoff seed; this is the belt.
            isLeader={i === 0 && row.gamesBehind == null}
          />
        ))}
      </div>
    </Panel>
  );
}

function StandingRowView({ row, isPlaying, isLeader }) {
  // Only the leader gets full-brightness text, so first place reads without
  // the GB column.
  const leaderColor = isLeader ? T.text : T.muted;
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
      {/* A dot, not the word "live" — the word is wider than the team. */}
      <div style={{ width: 22, flexShrink: 0 }}>
        {isPlaying && <div style={{ width: 18, height: 18, borderRadius: 9, background: T.hot }} />}
      </div>
      <Text size={38} weight={W.black} color={leaderColor} style={{ width: 104, flexShrink: 0, ...CLIP }}>
        {row.abbr}
      </Text>
      <Text size={36} weight={W.bold} color={leaderColor} style={{ flex: "1 1 0", ...CLIP }}>
        {row.record}
      </Text>
      {/* GB green on rank 1, as the Kotlin has it (the leader test above is the
          brightness only). */}
      <Text
        size={34}
        weight={W.black}
        color={row.rank === 1 ? T.up : T.muted}
        align="right"
        style={{ width: 80, flexShrink: 0 }}
      >
        {row.gbLabel}
      </Text>
      {/* L10 IS DELETED: five numeric columns could not all clear the floor on
          this side of the board, and STRK answers it in one glyph and a colour.
          `row.lastTen` is still parsed. */}
      <Text
        size={34}
        weight={W.black}
        color={streakColor(row.streak)}
        align="right"
        style={{ width: 84, flexShrink: 0 }}
      >
        {row.streak ?? "—"}
      </Text>
    </div>
  );
}

/* Nothing live — most weekday mornings. It has to look like a working board,
 * so it says which state it is in (connecting vs nothing live) and shows what
 * is coming instead of an empty panel. */
function EmptyBoard({ state }) {
  const { slate } = state;
  return (
    <Split
      left={
        <>
          {/* Standings where the hero would be: an idle board is exactly when
              the division race is worth looking at. */}
          {slate.standings && <StandingsPanel standings={slate.standings} live={[]} />}
          {/* Natural height, not the slack — a big near-empty card reads as
              content that failed to load. */}
          <Panel style={{ width: "100%", flexShrink: 0 }}>
            <Text size={56} weight={W.black}>
              {state.lastSuccess == null ? "connecting…" : "nothing live"}
            </Text>
            {state.lastError != null && (
              <Text size={32} color={T.hot} style={{ maxHeight: 3 * 32 * LINE, overflow: "hidden" }}>
                {state.lastError}
              </Text>
            )}
            {/* Said once, here, where there is room — the board works without
                the mapping, it just cannot name a screen. */}
            {!slate.tvMapConfigured && (
              <Text size={30} color={T.muted}>
                No TV mapping set. Set WHIPAROUND_TVS to label screens.
              </Text>
            )}
          </Panel>
          {/* The leftover, as background rather than inside a card. */}
          <div style={{ flex: "1 1 0" }} />
        </>
      }
      right={
        <Panel style={{ flex: "1 1 0" }}>
          <Heading text="COMING UP" style={{ flexShrink: 0 }} />
          <AdaptiveRows
            items={slate.upcoming}
            height={72}
            noun="scheduled"
            renderRow={(game) => <ComingUpRow game={game} now={state.now} />}
          />
        </Panel>
      }
    />
  );
}

function ComingUpRow({ game, now }) {
  return (
    <div style={{ width: "100%", height: 72, display: "flex", alignItems: "center" }}>
      <Chip text={game.leagueLabel} size={26} />
      {gapX(16)}
      <Text size={42} weight={W.bold} style={{ flex: "1 1 0", ...CLIP }}>
        {`${game.away.abbr} at ${game.home.abbr}`}
      </Text>
      {/* CENTRAL, not ESPN's Eastern `status`. */}
      <Text size={32} weight={W.bold} color={T.muted} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
        {kickoffLabel(game, now)}
      </Text>
    </div>
  );
}
