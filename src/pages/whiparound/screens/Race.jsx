import { Panel, Text } from "../components";
import { T, W, streakColor } from "../theme";

/* The playoff race — a port of RaceScreen / DivisionCard / ColumnLabel in
 * whiparound-firetv's ui/Slate.kt.
 *
 * HIS TWO DIVISIONS, SIDE BY SIDE (Patrick, 2026-09-02): the baseball table is
 * `standings` and the football one `nflStandings`, both chosen by the BACKEND
 * (WHIPAROUND_DIVISION / WHIPAROUND_NFL_DIVISION), so nothing here names a
 * division. Either can be null — the NFL table is gated on ESPN's season window
 * from February to August — and whichever is present takes the whole width.
 *
 * Runs every lap, live or idle: since the board screen left the rotation this is
 * the only place standings appear at all.
 *
 * NEVER RE-SORT. The backend orders rows by ESPN's own playoff seed; this screen
 * draws them in the order they arrive.
 */
export function RaceScreen({ standings, nflStandings }) {
  const cards = [standings, nflStandings].filter(Boolean);
  if (cards.length === 0) return null;
  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "row",
        gap: 14,
      }}
    >
      {/* No dimming between the two: both divisions are his, so neither is
          reference material behind the other. */}
      {cards.map((group, i) => (
        <DivisionCard key={i} group={group} />
      ))}
    </div>
  );
}

// Fixed column widths, so the two divisions beside each other line their numbers
// up instead of each measuring its own content.
const ABBR_W = 112;
const REC_W = 150;
const GB_W = 96;
const STRK_W = 96;
const ODDS_W = 120;

const blank = (s) => s == null || s.trim() === "";

/* ONE DIVISION AS A TABLE. Columns: abbreviation, name, record, GB, STRK and —
 * only where the feed carries them — playoff odds.
 *
 * L10 STAYS DELETED: everyone in a division hovers near .500 over ten games, and
 * STRK answers the same question in one glyph and a colour. `lastTen` is still
 * parsed if it is ever missed.
 *
 * This is the only screen that prints a team's record from the STANDINGS feed;
 * the scoreboard feed may not count the in-progress game, so the two disagree. */
function DivisionCard({ group }) {
  // MLB sends playoff odds; the NFL block does not. An empty labelled column of
  // dashes reads as a failed fetch, so the column exists only when some row has one.
  const odds = group.teams.some((t) => !blank(t.playoffPct));
  return (
    <Panel style={{ flex: "1 1 0" }}>
      <Text
        size={30}
        weight={W.black}
        color={T.text}
        spacing={1.4}
        lines={1}
        style={{ flexShrink: 0 }}
      >
        {group.name.toUpperCase()}
      </Text>
      {/* A leading spacer, then the labels flush to the panel's content edge —
          the Kotlin row carries no REC column and none of the rows' 10pt side
          padding, so it is ported as drawn. */}
      <div style={{ display: "flex", alignItems: "center", width: "100%", flexShrink: 0 }}>
        <div style={{ flex: "1 1 0", minWidth: 0 }} />
        <ColumnLabel text="GB" width={GB_W} />
        <ColumnLabel text="STRK" width={STRK_W} />
        {odds && <ColumnLabel text="POST" width={ODDS_W} />}
      </div>
      {/* THE ROWS TAKE THE WHOLE PANEL AND ARE BANDED. Five rows compacted and
          centred left two empty bands of panel; spread with nothing behind them
          they read as floating text. A tall row with a faint band behind it is a
          table row. */}
      {group.teams.map((t, i) => {
        /* THE LEADER IS THE TOP ROW THAT IS ALSO LEVEL WITH ITSELF, not rank 1.
         * ESPN once sent a West with its two worst teams first; testing games
         * behind too means a broken order highlights NOBODY rather than crowning
         * a last-place team. Games behind alone is not enough — before a game is
         * played the whole division is level. */
        const lead = i === 0 && t.gamesBehind == null;
        const color = lead ? T.text : T.muted;
        return (
          <div
            key={i}
            style={{
              flex: "1 1 0",
              minHeight: 0,
              width: "100%",
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              borderRadius: 8,
              /* The leader's band is a shade stronger. Bands sit on the EVEN rows
               * so the leader (always index 0) is banded and the row under it is
               * not — banding the odd rows read as one double-height block. */
              background: lead ? T.chipBg : i % 2 === 0 ? T.rowBand : "transparent",
            }}
          >
            <Cell width={ABBR_W} size={40} weight={W.black} color={color} align="left">
              {t.abbr}
            </Cell>
            {/* Muted on every row, leader included: the abbreviation already
                carries the brightness that says first place. */}
            <Text
              size={34}
              weight={W.bold}
              color={T.muted}
              lines={1}
              style={{ flex: "1 1 0" }}
            >
              {t.name ?? ""}
            </Text>
            <Cell width={REC_W} size={38} weight={W.bold} color={color}>
              {t.record}
            </Cell>
            <Cell width={GB_W} size={34} weight={W.bold} color={T.muted}>
              {t.gbLabel}
            </Cell>
            <Cell width={STRK_W} size={34} weight={W.black} color={streakColor(t.streak)}>
              {t.streak ?? "—"}
            </Cell>
            {odds && (
              <Cell width={ODDS_W} size={32} weight={W.bold} color={T.muted}>
                {blank(t.playoffPct) ? "—" : t.playoffPct}
              </Cell>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

/// A fixed-width `maxLines = 1` column with Compose's default Clip overflow (no
/// ellipsis), end-aligned unless told otherwise.
function Cell({ width, size, weight, color, align = "right", children }) {
  return (
    <Text
      size={size}
      weight={weight}
      color={color}
      lines={1}
      align={align}
      style={{ width, flexShrink: 0, textOverflow: "clip" }}
    >
      {children}
    </Text>
  );
}

/* 26pt, as the Kotlin draws it. Like this screen's 30pt heading and 32pt odds it
 * is under the 34 floor and not among CLAUDE.md's listed exceptions — ported as
 * drawn rather than resized, so the two boards on the wall agree. */
function ColumnLabel({ text, width }) {
  return (
    <Text
      size={26}
      weight={W.black}
      color={T.muted}
      spacing={1.2}
      lines={1}
      align="right"
      style={{ width, flexShrink: 0, textOverflow: "clip" }}
    >
      {text}
    </Text>
  );
}
