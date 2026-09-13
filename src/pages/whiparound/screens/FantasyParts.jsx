import { T, W } from "../theme";
import { Text } from "../components";

/* The pieces both fantasy screens share — ports of the `internal` composables in
 * whiparound-firetv's ui/Fantasy.kt (Tag, LeadMark, Footnote), which
 * ui/Matchup.kt borrows from it. */

/// A 34pt line and no chip — the footnote's fixed height, counted in both
/// screens' arithmetic.
const FOOT = 41;

/* A state, said in a WORD.
 *
 * What a Chip would say, at the same 34pt, without the 12px of vertical padding
 * a pill costs — so it sits on a 41px line where a chip (51.8px at the floor)
 * would clip. The first Fire TV version used real chips there and clipped them
 * top and bottom. Uppercase and letter-spaced so it reads as a label. */
export function Tag({ text, color }) {
  return (
    <Text
      size={34}
      weight={W.black}
      color={color}
      spacing={1.4}
      style={{ whiteSpace: "nowrap", overflow: "hidden", flexShrink: 0 }}
    >
      {text}
    </Text>
  );
}

/* WHO IS AHEAD, DRAWN RATHER THAN TYPED. ▲ and ▼ are one font substitution away
 * from a tofu box, and a drawn mark carries the colour at a size no character
 * would. NULL IS A LEVEL BAR, NOT A TRIANGLE: before kickoff (or in a real tie)
 * a triangle pointing anywhere would invent a leader. */
export function LeadMark({ leading, side = 48 }) {
  const w = side;
  const h = side;
  const color = leading === true ? T.up : leading === false ? T.down : T.muted;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", flexShrink: 0 }}>
      {leading == null ? (
        <rect x={w * 0.12} y={h * 0.44} width={w * 0.76} height={h * 0.12} fill={color} />
      ) : leading ? (
        <polygon
          points={`${w * 0.5},${h * 0.18} ${w * 0.9},${h * 0.78} ${w * 0.1},${h * 0.78}`}
          fill={color}
        />
      ) : (
        <polygon
          points={`${w * 0.5},${h * 0.82} ${w * 0.9},${h * 0.22} ${w * 0.1},${h * 0.22}`}
          fill={color}
        />
      )}
    </svg>
  );
}

/* THE LEAGUES WITH NOTHING TO SAY, IN ONE LINE — drawn ONCE A LAP by whichever
 * screen passes `show` (the first matchup screen, or SURVIVOR when there are no
 * matchups). A league that has not drafted, or whose fetch failed, otherwise
 * looks exactly like a league that does not exist.
 *
 * Emits nothing when it has nothing to say, so it costs no height and no gap.
 *
 * THE BACKEND'S OWN `failed` COUNT, never the number of `errors` keys: those
 * include provider-level notes (`projections`, `espn`, `week`), and counting
 * them said "1 LEAGUE DOWN" for one dead league, for five, and for none. */
export function Footnote({ fantasy, show }) {
  if (!show) return null;
  const line = fantasy.pendingLine;
  const down = fantasy.failed;
  if (line == null && down === 0) return null;
  return (
    <div
      style={{
        width: "100%",
        height: FOOT,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Text size={34} weight={W.bold} color={T.muted} lines={1} style={{ flex: "1 1 0" }}>
        {line ?? ""}
      </Text>
      {/* A word, not a chip: this row is 41px and a chip is 51.8. The hot
          colour carries it, like the board's own LEAGUE DOWN signal. */}
      {down > 0 && (
        <Tag text={down === 1 ? "1 LEAGUE DOWN" : `${down} LEAGUES DOWN`} color={T.hot} />
      )}
    </div>
  );
}
