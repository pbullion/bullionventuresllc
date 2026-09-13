import { T, W, edge, side as sideColor } from "../theme";
import { Heading, Text } from "../components";
import { fmtMargin, fmtPoints } from "../models/fantasy";
import { Footnote, LeadMark, Tag } from "./FantasyParts";

/* ONE HEAD-TO-HEAD MATCHUP, THE WHOLE SCREEN — a port of whiparound-firetv's
 * ui/Matchup.kt (Patrick, 2026-09-13: "each FF matchup gets its own
 * slide/screen"). slots.js gives the rotation one FANTASY slot per entry in
 * `fantasy.matchups`, in the backend's doubt order. This REVERSES his own
 * 2026-09-09 combined screen; do not fold them back to save wall time.
 *
 * A SCOREBOARD, NOT A BIGGER ROW: his side left, theirs right, the state of the
 * game between. What the screen bought over the row — his own team name, both
 * records, and a pip per starter (played muted at the outer edge, still to play
 * in the accent colour) — none of it invented.
 *
 * EVERY STATE RULE FROM THE ROW STILL HOLDS (they are rules about the payload):
 *   - `notStarted` INVERTS THE HIERARCHY: the projection takes the big number,
 *     each side says PROJECTED, the centre draws a level bar over NOT STARTED.
 *   - A REAL TIE is `realTie`, never the wire's `tied` (true of every 0-0).
 *   - A BYE (`them: null`): nothing dimmed, nothing leads, no mark at all.
 *   - NO LOGOS: ESPN sends SVG, Sleeper webp, and half badges reads as broken.
 * The geometry is identical across all of those states, so the screen does not
 * jump when the first player scores.
 *
 * THE HEIGHT ARITHMETIC (every line is its type x 1.171875 plus a few px):
 *   SIDE   = NAME 64 + SCORE 264 + DETAIL 56 + PIPS 28 + TO_PLAY 56 + 4 x 12 = 516
 *   CENTRE = MARK 120 + STATE 88 + TAG 41 + 2 x 12                          = 273
 *   946 screen - 76 head - 12 gap = 858 card, 810 inside its padding; less 53
 *   for the footnote and 59 for the MOCK/LEAGUE DOWN chip row = 698 at the
 *   tightest (the mock's first screen). 516 <= 698, so nothing clips.
 * WIDTH: 1872 - 36 x 2 = 1800 inside; the centre takes 360 and two 24px gaps,
 * leaving 696 a side against "174.9" at 220px (~560, measured on the stick). A
 * team name ellipsizes; 52px fits "Keith's 25 year old Scotch".
 */
const HEAD = 76;
const NAME = 64;
const SCORE = 264;
const DETAIL = 56;
const PIPS = 28;
const TO_PLAY = 56;
const GAP = 12;

const MARK = 120;
const STATE = 88;
const TAG = 41;
const CENTRE = 360;

const PAD_H = 36;
const PAD_V = 24;
const RADIUS = 12;

/// Wide enough to read as pieces at five starters, narrow enough that twenty
/// still fit the side without touching.
const PIP_MAX = 40;
const PIP_GAP = 8;
/// Past this the pieces are not drawn at all — a payload carrying a roster size
/// instead of a starter count would otherwise paint across the centre column.
const PIP_LIMIT = 30;

export function MatchupScreen({ fantasy, m, index }) {
  return (
    <div
      style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", gap: GAP }}
    >
      <MatchupHead fantasy={fantasy} m={m} index={index} />
      <MatchupCard m={m} />
      {/* Once a lap: it belongs to the payload, not to any one league, and the
          same NOT DRAFTED line on three screens in a row is three times the noise. */}
      <Footnote fantasy={fantasy} show={index === 0} />
    </div>
  );
}

/* The league is the title — the one thing that says which of his leagues this
 * is. "2 OF 3" because the screens run back to back; without it three
 * scoreboards in a row read as one screen that keeps changing its mind. */
function MatchupHead({ fantasy, m, index }) {
  const count = fantasy.matchups.length;
  const heading = [
    "FANTASY",
    fantasy.weekLabel,
    fantasy.seasonTypeLabel,
    // "1 OF 1" is a count of nothing.
    count > 1 ? `${index + 1} OF ${count}` : null,
  ]
    .filter((x) => x != null)
    .join(" · ");
  return (
    <div style={{ height: HEAD, flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
      {/* Weighted, so the heading on the right keeps its width and a long
          league name ellipsizes instead of pushing it off the screen. */}
      <Text size={64} weight={W.black} spacing={1.6} lines={1} style={{ flex: "1 1 0" }}>
        {m.league.toUpperCase()}
      </Text>
      <Heading text={heading} style={{ flexShrink: 0, whiteSpace: "nowrap" }} />
    </div>
  );
}

function MatchupCard({ m }) {
  const started = !m.notStarted;
  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        width: "100%",
        background: T.panel,
        borderRadius: RADIUS,
        ...edge(),
        padding: `${PAD_V}px ${PAD_H}px`,
        display: "flex",
        alignItems: "center",
        gap: 24,
      }}
    >
      <Side
        side={m.me}
        started={started}
        /* Bright unless there is a leader and it is not him — never dimmed on a
         * bye (nobody played him) or before kickoff (dimming would name a
         * leader out of a 0-0). */
        color={started && !m.bye ? sideColor(m.leading === true, m.realTie) : T.text}
        end={false}
      />
      <Centre m={m} started={started} />
      {m.bye ? (
        <Bye />
      ) : (
        <Side
          side={m.them}
          started={started}
          color={started ? sideColor(m.leading === false, m.realTie) : T.text}
          end
        />
      )}
    </div>
  );
}

/* One team. `end` mirrors it for the right-hand side, so both scores sit at the
 * outer edges and the centre column owns the middle of the screen. */
function Side({ side, started, color, end }) {
  const remaining = side?.remaining ?? null;
  const played = side?.played ?? null;
  const toPlay =
    remaining == null
      ? ""
      : remaining > 0
        ? `${remaining} TO PLAY`
        : // Monday night after the last game the side is final, which is news.
          // A projections outage sends 0 and 0, and that is not "all played".
          (played ?? 0) > 0
          ? "ALL PLAYED"
          : "";
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: GAP }}>
      <Line text={side?.label ?? "—"} height={NAME} size={52} weight={W.bold} color={T.text} end={end} />
      <Aligned height={SCORE} end={end}>
        {/* Before kickoff the big number is the PROJECTION — the score is zero
            and says nothing. Ellipsized rather than clipped past the ~136px of
            slack: clipped digits are a wrong score that is believed. */}
        <Text size={220} weight={W.black} color={color} lines={1}>
          {fmtPoints(started ? side?.points : side?.projected)}
        </Text>
      </Aligned>
      <Aligned height={DETAIL} end={end}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {side?.record != null && (
            <>
              <Words text={side.record} color={T.muted} />
              <Words text="·" color={T.muted} />
            </>
          )}
          {/* Says WHICH number is the big one, in the same slot either way. */}
          {started ? (
            <Words text={`PROJ ${fmtPoints(side?.projected)}`} color={T.muted} />
          ) : (
            <Words text="PROJECTED" color={T.amber} />
          )}
        </div>
      </Aligned>
      <Pips played={played} remaining={remaining} end={end} />
      <Line text={toPlay} height={TO_PLAY} size={44} weight={W.black} color={T.muted} end={end} />
    </div>
  );
}

/* Where the game stands: who is ahead, by how much, and the one tag that
 * changes how both numbers read. */
function Centre({ m, started }) {
  // A bye leaves this empty: the right-hand side already says BYE at 220px,
  // and a second one in the middle read as a stutter on the emulator.
  let state = null;
  if (m.bye) {
    // (nothing)
  } else if (!started) {
    state = <Tag text="NOT STARTED" color={T.amber} />;
  } else if (m.realTie) {
    state = <StateNumber text="TIED" color={T.text} />;
  } else {
    state = (
      <StateNumber
        text={fmtMargin(m.margin)}
        color={m.leading === true ? T.up : m.leading === false ? T.down : T.muted}
      />
    );
  }
  return (
    <div
      style={{
        width: CENTRE,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: GAP,
      }}
    >
      <Centred height={MARK}>
        {/* A bye has no mark at all: a level bar would say "tied". `realTie`,
            not `tied` — the wire reports leading:false for equal scores, and an
            unguarded mark draws a red triangle over two identical numbers. */}
        {!m.bye && <LeadMark leading={started && !m.realTie ? m.leading : null} side={MARK} />}
      </Centred>
      <Centred height={STATE}>{state}</Centred>
      <Centred height={TAG}>
        {/* Both totals are short of what the period will finish at. */}
        {m.multiPeriod && <Tag text="MULTI-WEEK" color={T.amber} />}
      </Centred>
    </div>
  );
}

/* The right-hand side on a bye, on the same lines as a real side, so the card
 * is centred identically and nothing jumps the week an opponent returns. */
function Bye() {
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: GAP }}>
      <Line text="No opponent" height={NAME} size={52} weight={W.bold} color={T.muted} end />
      <Aligned height={SCORE} end>
        <Text size={220} weight={W.black} color={T.muted} style={{ whiteSpace: "nowrap", overflow: "hidden" }}>
          BYE
        </Text>
      </Aligned>
      <Line text="THIS WEEK" height={DETAIL} size={44} weight={W.black} color={T.muted} end />
      <div style={{ height: PIPS, flexShrink: 0 }} />
      <div style={{ height: TO_PLAY, flexShrink: 0 }} />
    </div>
  );
}

/* EACH STARTER AS A PIECE, counted from the OUTER edge on both sides — so the
 * played pieces sit at both edges and the ones still to play meet in the
 * middle. The pieces narrow to fit (capped at PIP_MAX so five do not turn into
 * slabs). Nothing is drawn when either count is missing (an older backend),
 * when both are zero (a projections outage), or past PIP_LIMIT; the height is
 * reserved in every case. */
function Pips({ played, remaining, end }) {
  const box = { width: "100%", height: PIPS, flexShrink: 0 };
  const n = played == null || remaining == null ? 0 : played + remaining;
  if (n < 1 || n > PIP_LIMIT) return <div style={box} />;
  return (
    <div style={{ ...box, display: "flex", flexDirection: end ? "row-reverse" : "row", gap: PIP_GAP }}>
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          style={{
            // Equal basis and equal shrink: every piece gets
            // min(PIP_MAX, (width - gaps) / n), the Kotlin's coerceIn(1, PIP_MAX).
            flex: `0 1 ${PIP_MAX}px`,
            minWidth: 1,
            height: PIPS,
            borderRadius: PIPS * 0.25,
            background: i < played ? T.muted : T.accent,
          }}
        />
      ))}
    </div>
  );
}

/// A fixed-height line whose content sits at the start or the end, vertically
/// centred — the one piece of geometry every line on this screen shares.
function Aligned({ height, end, children }) {
  return (
    <div
      style={{
        width: "100%",
        height,
        flexShrink: 0,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: end ? "flex-end" : "flex-start",
      }}
    >
      {children}
    </div>
  );
}

function Centred({ height, children }) {
  return (
    <div
      style={{
        height,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function Line({ text, height, size, weight, color, end }) {
  return (
    <Aligned height={height} end={end}>
      <Text size={size} weight={weight} color={color} lines={1}>
        {text}
      </Text>
    </Aligned>
  );
}

function Words({ text, color }) {
  return (
    <Text size={44} weight={W.black} color={color} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
      {text}
    </Text>
  );
}

function StateNumber({ text, color }) {
  return (
    <Text size={72} weight={W.black} color={color} style={{ whiteSpace: "nowrap" }}>
      {text}
    </Text>
  );
}
