import { Fragment } from "react";
import { T, W, edge } from "../theme";
import { Chip, Heading, MoreNote, Note, Text } from "../components";
import { useMeasuredSize } from "../hooks";
import { fmtPoints } from "../models/fantasy";
import { Footnote, Tag } from "./FantasyParts";

/* THE GUILLOTINE LEAGUES — a port of SurvivorScreen and its row in
 * whiparound-firetv's ui/Fantasy.kt.
 *
 * Not head-to-head — there is no opponent, ever — so these are not matchups and
 * the 2026-09-13 per-matchup split did not reach them: one screen, all of
 * `fantasy.survivor`, in the backend's tightest-to-the-cut order. He asked for
 * four things: his score, his rank this week, who is on the block, and how many
 * teams are left (the rank's denominator, "8TH OF 18"). `climb` was added by
 * review — the distance out of the cut is the one number he can act on.
 *
 * EVERY NUMBER IS A PROJECTION NOW (Patrick, 2026-09-13: "on all of the whip
 * arounds, for fantasy, i want everything based off of projections, NOT the
 * actual score"). When the envelope says `basis:"projected"`
 * (`s.projectedBasis`) the backend ranks the field on the projections — the
 * rank, who is on the block, `margin`, `safe`, `climb` — and this row puts
 * `s.basis` in the big slot ALWAYS, with his actual demoted to SCORE on the
 * detail line. Without the flag the row is exactly the legacy one below (the
 * points basis, the legacy branches, unchanged), so an undeployed or
 * rolled-back backend can never produce a half-projected row.
 *
 * THE TIE FOR THE CUT IS THE ALARM, AND IT IS NOT ALWAYS ONE. `safe` is strict
 * on the basis (the projections, or points on an older backend), so tied for
 * last is never green; but before the field has played, being last means
 * little — on points the whole field is tied on 0.0, on projections he may
 * simply project last on a Tuesday — and a board that shouts every Sunday
 * morning has trained the room to ignore it by kickoff. THE ALARM IS `s.alarm`
 * (safe == false && field_started, not while he has won), unchanged on both
 * bases, and the chip, the score colour and the block line's colour all read
 * it. Add nothing hot here without routing it through `alarm`. On the projected
 * basis the not-yet wording appears only when `field_level` (the whole field
 * level on the projections — a projections outage, which the producer reports
 * with every team played, so it reads "18 OF 18 PLAYED"); an ordinary early
 * week says TIED FOR LAST or LAST in amber instead, because a projected
 * standing is news. The cut slot's COLOUR still keeps the points timing —
 * amber for any standing, a clear one too, until `field_started` (see
 * SurvivorRow).
 *
 * A WON LEAGUE READS AS A WIN: a green WINNER pill, WON THE LEAGUE, LAST TEAM
 * STANDING. NO LOGOS, for the half-SVG, half-webp reason in models/fantasy.js.
 *
 * THE HEIGHT ARITHMETIC (every piece fixed, for the reason ui/Slate.kt gives —
 * a heading measured by eye drew the last line off the bottom):
 *   946 screen - 44 HEAD - 12 gap = 890 for the rows on an ordinary day;
 *   837 with the footnote (41 + 12, only when there are no matchups), 831 with
 *   the MOCK/LEAGUE DOWN chip row, 778 with both.
 *   ROW_MIN = LEAGUE_LINE 56 + MAIN 88 + SUB 41 + 2 x 6 + 2 x 12 padding = 221.
 * RowStack drops a row when min x n + 14 x (n-1) exceeds the room less the 58px
 * the "+N more" note then costs, and grows the kept rows into [min, ROW_MAX]:
 *   rows   890           837           831           778
 *   1-2    360*          360*          360*          360*
 *   3      287.3         269.7         267.7         250.1
 *   4      3 @ 268 +1    3 @ 250 +1    3 @ 248 +1    3 @ 231 +1
 *   5      3 @ 268 +2    3 @ 250 +2    3 @ 248 +2    3 @ 231 +2
 *   6      3 @ 268 +3    3 @ 250 +3    3 @ 248 +3    3 @ 231 +3
 *   (* held at ROW_MAX and centred.) His real screen is two cards at 360; the
 *   mock carries six rows (five until 2026-09-13) and `?mock=1` draws three.
 */
const HEAD = 44;
/// A chip at the 34 floor is 51.8px tall (34 x 1.171875 + 6px padding twice);
/// the ON THE BLOCK / WINNER pill is the only real chip on either screen, and
/// this line buys the room for it.
const LEAGUE_LINE_CHIP = 56;
const SUB_LINE = 41;
const LINE_GAP = 6;
/// A 72px number is an 84.4px line box. The main line takes the row's slack.
const MAIN_LINE = 88;

/* EACH LEAGUE IS A CARD (2026-09-12): bare rows in one Panel read as a terminal
 * dump — two lines of text floating in ~70% black. The card's padding IS charged
 * to the row minimum, because a card whose text touches its border is worse
 * than no card. */
const CARD_PAD_V = 12;
const CARD_PAD_H = 18;
const CARD_RADIUS = 12;

const SURVIVOR_ROW_MIN = LEAGUE_LINE_CHIP + MAIN_LINE + SUB_LINE + LINE_GAP * 2 + CARD_PAD_V * 2;

/* Rows grow to fill a short screen, but only this far: without a ceiling his
 * two leagues would be two 438px slabs. Two centred cards with a margin above
 * and below read as a deliberate two-card screen, which is what it is. */
const ROW_MAX = 360;

/// ~45 characters at 34px Black; a longer league name ellipsizes rather than
/// pushing the rule and the pill off the row.
const LEAGUE_NAME_MAX = 900;

const STACK_GAP = 14;
/// Tracks MoreNote's own 30px type — the same figure AdaptiveRows uses.
const NOTE = 44;

export function SurvivorScreen({ fantasy }) {
  return (
    <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* HEADED "GUILLOTINE", NOT "SURVIVOR" (2026-09-12): guillotine is the
          format's name and both of his leagues'; survivor is the NFL pick-one
          pool, which he is not in. The page name and the wire keep "survivor". */}
      <ScreenHead title="GUILLOTINE" fantasy={fantasy} />
      {fantasy.survivor.length === 0 ? (
        <Note text="No guillotine leagues playing." />
      ) : (
        <RowStack
          items={fantasy.survivor}
          noun="league"
          min={SURVIVOR_ROW_MIN}
          renderRow={(s, h) => <SurvivorRow s={s} height={h} />}
        />
      )}
      {/* Once a lap: here only when there are no matchup screens to carry it. */}
      <Footnote fantasy={fantasy} show={fantasy.matchups.length === 0} />
    </div>
  );
}

/* One Heading with the week joined in (the AP poll screen's pattern), keeping
 * this row at 44px instead of the 56 a chip would cost. No season YEAR: no
 * other screen dates itself. */
function ScreenHead({ title, fantasy }) {
  const text = [title, fantasy.weekLabel, fantasy.seasonTypeLabel].filter((x) => x != null).join(" · ");
  return (
    <div style={{ height: HEAD, flexShrink: 0, display: "flex", alignItems: "center" }}>
      <Heading text={text} style={{ whiteSpace: "nowrap" }} />
    </div>
  );
}

/* As many rows as the space actually given can hold, each grown to fill it, and
 * the remainder NAMED.
 *
 * Not AdaptiveRows: that leaves the slack at the bottom, right for a twenty-game
 * list and wrong for three cards (a fifth of the screen black under them). This
 * finds how many fit at `min`, then spends the whole budget on them up to
 * ROW_MAX, centred. The note only costs height on the days it draws, and
 * dropping a row is what makes it draw — so the budget depends on the answer.
 * `noun` is SINGULAR and pluralised here: "+1 more leagues" gets photographed. */
function RowStack({ items, noun, min, renderRow }) {
  const [ref, size] = useMeasuredSize();
  let drawn = 0;
  let height = min;
  if (size && items.length > 0) {
    const room = (d) => size.height - (d < items.length ? NOTE + STACK_GAP : 0);
    const need = (d) => min * d + STACK_GAP * (d - 1);
    drawn = items.length;
    while (drawn > 1 && need(drawn) > room(drawn)) drawn -= 1;
    height = Math.min(ROW_MAX, Math.max(min, (room(drawn) - STACK_GAP * (drawn - 1)) / drawn));
  }
  const hidden = items.length - drawn;
  return (
    <div
      ref={ref}
      style={{
        flex: "1 1 0",
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        // Centred: two rows pinned to the top of room for four read as a screen
        // that failed to finish loading.
        justifyContent: "center",
        gap: STACK_GAP,
      }}
    >
      {size && (
        <>
          {items.slice(0, drawn).map((item, i) => (
            <Fragment key={item.id ?? i}>{renderRow(item, height)}</Fragment>
          ))}
          <MoreNote hidden={hidden} noun={hidden === 1 ? noun : `${noun}s`} />
        </>
      )}
    </div>
  );
}

/* One guillotine league. On the projected basis (2026-09-13), the alarm:
 *
 *   GUILLOTINE ─────────────────────────────  [ON THE BLOCK]
 *   107.9      17TH OF 18                           TIED FOR LAST
 *   ON THE BLOCK · YOU + 1 MORE ON 107.9   NEEDS 3.3 · SCORE 22.6 · 8 TO PLAY
 *
 * and the same standing before half the field has kicked off — same geometry,
 * the words kept, no alarm anywhere on it:
 *
 *   GUILLOTINE ───────────────────────────────────────  PROJECTED
 *   107.9      17TH OF 18                           TIED FOR LAST   (amber)
 *   ON THE BLOCK · YOU + 1 MORE ON 107.9   NEEDS 3.3 · 8 TO PLAY
 *
 * On the legacy points basis the big number is his score once his lineup has
 * started (or whenever the alarm is on) and his projection before; the detail
 * line carries PROJ instead of SCORE; and before half the field has kicked off
 * the cut slot says "8 OF 18 PLAYED" rather than TIED FOR LAST.
 */
function SurvivorRow({ s, height }) {
  const started = !s.notStarted;
  // `basis:"projected"` on the envelope. Every projected branch below tests
  // this; the rest is the legacy row, unchanged. See the header.
  const projected = s.projectedBasis;
  const alarm = s.alarm;
  const cutColor = projected
    ? /* PROJECTED BASIS: the WORDS moved onto the projections, the COLOURS KEPT
       * THEIR TIMING. Hot if and only if `alarm`, tested straight after the win
       * so nothing below can pre-empt it. Amber for last-but-no-alarm (he
       * projects last and the field has not played enough for the room to be
       * told), for a level field, whose words are `fieldLabel`, and — exactly
       * as on points — for ANY standing while `fieldIdle`, a clear one
       * included. Green waits for the field's football the way hot does: a
       * Tuesday's "+12.0 CLEAR" is amber and turns green once the cushion is
       * being played for. That order also keeps FIELD NOT READ amber, the only
       * colour it has ever drawn in (an empty or one-entry field is never
       * `field_started`). It is the legacy order below with the alarm and the
       * level field put in front of it. This branch's first cut (2026-09-13)
       * tested `safe == null` first and dropped `fieldIdle`, which drew the
       * Tuesday cushion green and FIELD NOT READ muted. */
      s.won
      ? T.up
      : alarm
        ? T.hot
        : s.safe === false
          ? T.amber
          : s.fieldLevel
            ? T.amber
            : s.fieldIdle
              ? T.amber
              : s.safe == null
                ? T.muted
                : T.up
    : /* LEGACY, in the Kotlin's order: green for a win, amber while the field
       * has not played enough for last place to mean anything (even when clear
       * — a cushion against teams that have not played is not a cushion),
       * muted when the field could not be read, hot only on the alarm. */
      s.won
      ? T.up
      : s.fieldIdle
        ? T.amber
        : s.safe == null
          ? T.muted
          : s.safe === true
            ? T.up
            : T.hot;
  return (
    <div
      style={{
        width: "100%",
        height,
        flexShrink: 0,
        background: T.panel,
        borderRadius: CARD_RADIUS,
        ...edge(),
        padding: `${CARD_PAD_V}px ${CARD_PAD_H}px`,
        display: "flex",
        flexDirection: "column",
        gap: LINE_GAP,
      }}
    >
      <LeagueLine league={s.league}>
        {projected
          ? /* PROJECTED BASIS: the big number is ALWAYS the projection, so the
               word shows whenever no pill is taking the line — the row still
               carries at most one thing here. Muted, like the matchup screen's:
               a label on every row all week, not a warning. */
            !alarm && !s.won && <Tag text="PROJECTED" color={T.muted} />
          : /* LEGACY, and NOT WHILE THE ALARM IS ON. `alarm` is field-scoped
               and can fire while his own lineup is still pre-game; the row then
               shows his actual 0.0, and a PROJECTED tag beside it would
               contradict the number. */
            !started && !alarm && <Tag text="PROJECTED" color={T.amber} />}
        {/* Mutually exclusive by construction (`alarm` is false while he has
            won), so the row carries AT MOST ONE pill — what LEAGUE_LINE_CHIP
            is measured for. A filled pill reads from the doorway. */}
        {s.won ? (
          <Chip text="WINNER" color={T.bg} fill={T.up} size={34} />
        ) : alarm ? (
          <Chip text="ON THE BLOCK" color={T.bg} fill={T.hot} size={34} />
        ) : null}
      </LeagueLine>

      <div
        style={{
          width: "100%",
          flex: "1 1 0",
          minHeight: MAIN_LINE,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* PROJECTED BASIS: always the number he was ranked on, alarm or not —
            the block line quotes the same units, so "107.9" beside "ON THE
            BLOCK · YOU + 1 MORE ON 107.9" agrees with itself; his actual is on
            the detail line. LEGACY: HIS ACTUAL WHENEVER THE ALARM IS ON, never
            the projection: on the block on points, the zero is the whole
            answer. */}
        <Big
          text={fmtPoints(projected ? s.basis : started || alarm ? s.points : s.projected)}
          size={72}
          color={alarm ? T.hot : T.text}
        />
        <Big text={s.rankLabel ?? "—"} size={48} color={T.text} />
        <div style={{ flex: "1 1 0" }} />
        <Big text={projected ? s.projectedCutLabel : s.cutLabel} size={48} color={cutColor} />
      </div>

      <SubLine
        // LAST TEAM STANDING when he has won — `on_the_block` is null there.
        left={s.statusLine ?? ""}
        /* Hot only when the ALARM is on and he is the one down there. It keyed
         * on `mine` alone until 2026-09-10 and lit every Sunday morning on a row
         * whose chip and score were deliberately quiet. */
        leftColor={s.won ? T.up : alarm && s.block?.mine === true ? T.hot : T.muted}
        // NEEDS · SCORE · TO PLAY on projections; NEEDS · PROJ · TO PLAY on the
        // legacy basis. See `projectedDetail` / `detail`.
        right={projected ? s.projectedDetail : s.detail}
      />
    </div>
  );
}

/* The league's own name as the card's heading. The trailing rule costs no
 * height, where a divider between rows cost 29px a boundary. */
function LeagueLine({ league, children }) {
  return (
    <div
      style={{
        width: "100%",
        height: LEAGUE_LINE_CHIP,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <Text
        size={34}
        weight={W.black}
        spacing={1.6}
        lines={1}
        style={{ flex: "0 1 auto", maxWidth: LEAGUE_NAME_MAX }}
      >
        {league.toUpperCase()}
      </Text>
      {/* A raw 1.dp rule: 2 stage px. */}
      <div style={{ flex: "1 1 0", minWidth: 0, height: 2, background: T.border }} />
      {children}
    </div>
  );
}

function Big({ text, size, color }) {
  return (
    <Text size={size} weight={W.black} color={color} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
      {text}
    </Text>
  );
}

/// The third line: who is on the block, and what he needs, what he has scored
/// (what he is projected for, on the legacy basis) and what is left to play.
/// Both halves at the 34 floor — detail lives there.
function SubLine({ left, leftColor, right }) {
  return (
    <div
      style={{
        width: "100%",
        height: SUB_LINE,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Text size={34} weight={W.black} color={leftColor} lines={1} style={{ flex: "1 1 0" }}>
        {left}
      </Text>
      {right != null && (
        <Text size={34} weight={W.black} color={T.muted} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
          {right}
        </Text>
      )}
    </div>
  );
}
