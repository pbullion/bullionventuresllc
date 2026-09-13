import { Chip, Heading, Note, Panel, Text } from "../components";
import { T, W } from "../theme";

/* THE TROPICS SCREEN — a port of whiparound-firetv's ui/Tropics.kt.
 *
 * The forecast screen answers "what is it doing this week"; this answers the
 * one question that outranks it on a Houston wall between June and November.
 *
 * NO NHC CONE GRAPHIC. Its labels are set for a phone at arm's length and
 * measure well under the 34pt floor scaled to a panel; a picture nobody can
 * read at ten feet is worse than four numbers they can. The wall says THAT
 * there is something and roughly how bad — the radar screen does the shapes.
 *
 * ONE STORM GETS THE SCREEN. A wall of four equal cards is a list, not a
 * warning. The backend sorts the Gulf first and the strongest first inside
 * that, so the head of the list is the one this room cares about; up to three
 * more get a line each underneath and any beyond that are not drawn (the
 * Kotlin's `take(3)`, no overflow note).
 *
 * Type under the 34 floor here — the 30pt fact labels, advisory line and Gulf
 * chip, the 26pt GULF chip — is the Kotlin's own sizing, ported as drawn so the
 * two boards on the wall agree.
 */

/* The second panel is sized by HOW MANY are in it, not by a constant. A fixed
 * third of the screen for one extra storm drew a heading, one row and four
 * hundred points of black — and the Atlantic has one other storm far more
 * often than it has three. */
const OTHER_SHARE = [0, 0.18, 0.26, 0.34];

// Compose `maxLines = 1` with no Ellipsis clips; only the lines that say
// Ellipsis in the Kotlin get the dots.
const CLIP = { textOverflow: "clip" };

// Unweighted children of a Compose Column keep their measured height.
const FIXED = { flexShrink: 0 };

export function TropicsScreen({ tropics }) {
  const lead = tropics.storms[0] ?? null;
  const root = {
    flex: "1 1 0",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  if (!lead) {
    // Non-null by construction — the slot only exists when a storm does. A pin
    // (?page=TROPICS) on a quiet day lands here, and says so rather than
    // falling back.
    return (
      <div style={root}>
        <Panel style={{ flex: "1 1 0", width: "100%" }}>
          <Heading text="THE TROPICS" style={FIXED} />
          <Note text="Nothing active in the Atlantic." />
        </Panel>
      </div>
    );
  }

  const others = tropics.storms.slice(1, 4);
  const share = Math.round(OTHER_SHARE[others.length] * 100);

  /* A GRID, NOT FLEX-GROW, for the split. Compose's weight divides the whole
   * height; CSS flex-grow divides only what is left after both panels' 18px
   * padding, which measured the lead 11px short of the Kotlin with three
   * others under a chip row — and that case has ~4px to spare. `fr` tracks
   * divide the full height like weight does; minmax(0, …) lets a long name
   * ellipsize instead of widening the track. */
  const split = {
    ...root,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gridTemplateRows:
      others.length > 0 ? `minmax(0, ${100 - share}fr) minmax(0, ${share}fr)` : "minmax(0, 1fr)",
    rowGap: 12,
  };

  return (
    <div style={split}>
      <LeadStorm storm={lead} />
      {others.length > 0 && (
        <Panel>
          <Heading text="ALSO ACTIVE" style={FIXED} />
          {others.map((s, i) => (
            <OtherStorm key={s.id ?? i} storm={s} />
          ))}
        </Panel>
      )}
    </div>
  );
}

function LeadStorm({ storm }) {
  // A category is the hot colour; a tropical storm is plain text.
  const strength = storm.category != null ? T.hot : T.text;
  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", ...FIXED }}>
        <Heading text="THE TROPICS" style={FIXED} />
        {/* THE GULF CHIP IS THE WHOLE POINT OF THE SCREEN, so it is the one thing
            on it in the hot colour as a fill. A category 4 off Bermuda is news;
            a tropical storm in the Gulf is a Tuesday that changes. */}
        {storm.inGulf && <Chip text="IN THE GULF" color={T.text} fill={T.hot} size={30} />}
      </div>

      <Text size={110} weight={W.black} color={T.text} lines={1} style={FIXED}>
        {(storm.name ?? "UNNAMED").toUpperCase()}
      </Text>
      {storm.headline != null && (
        <Text size={48} weight={W.black} color={strength} lines={1} style={FIXED}>
          {storm.headline}
        </Text>
      )}

      <div style={{ flex: "1 1 0", minHeight: 0 }} />

      {/* THE WIND SPEED IS THE SECOND THING, AND IT IS BIG. The two things a
          glance wants on a storm board are the name and how hard it is blowing;
          pressure, position and heading are detail you read once you care. */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, width: "100%", ...FIXED }}>
        <Text size={96} weight={W.black} color={strength} lines={1} style={{ ...CLIP, ...FIXED }}>
          {storm.windMph != null ? `${storm.windMph}` : "—"}
        </Text>
        <Text
          size={40}
          weight={W.black}
          color={T.muted}
          lines={1}
          style={{ ...CLIP, ...FIXED, paddingBottom: 14 }}
        >
          MPH
        </Text>
        <div style={{ flex: "1 1 0", minWidth: 0 }} />
        {storm.category != null && <CategoryScale category={storm.category} />}
      </div>

      <div style={{ flex: "1 1 0", minHeight: 0 }} />

      {/* A labelled slot with nothing in it has to say so — the weather screen's
          rule. An em dash, never an omitted column. */}
      <div style={{ display: "flex", gap: 18, width: "100%", ...FIXED }}>
        <Fact label="PRESSURE" value={storm.pressureMb != null ? `${storm.pressureMb} mb` : null} />
        <Fact label="MOVING" value={storm.movement} />
        <Fact label="POSITION" value={storm.position} />
      </div>
      {storm.advisory != null && (
        <Text size={30} weight={W.bold} color={T.muted} lines={1} style={{ ...CLIP, ...FIXED }}>
          {`ADVISORY ${storm.advisory}`}
        </Text>
      )}
    </Panel>
  );
}

/* Saffir-Simpson as five pips: "category 2" of what? Five lit-or-unlit blocks
 * answer that with no legend and no text. Absent below hurricane strength —
 * five empty boxes would say a tropical storm scored zero on a scale it is not
 * on. */
function CategoryScale({ category }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
      {[1, 2, 3, 4, 5].map((step) => {
        const lit = step <= category;
        return (
          <div
            key={step}
            style={{
              width: 34,
              height: lit ? 46 : 26,
              background: lit ? T.hot : T.border,
              borderRadius: 5,
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column" }}>
      <Text size={30} weight={W.black} color={T.muted} lines={1} style={CLIP}>
        {label}
      </Text>
      <Text size={46} weight={W.black} color={T.text} lines={1}>
        {value ?? "—"}
      </Text>
    </div>
  );
}

function OtherStorm({ storm }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", ...FIXED }}>
      {storm.inGulf && <Chip text="GULF" color={T.text} fill={T.hot} size={26} />}
      {/* Unweighted in the Kotlin, so it takes its natural width; allowed to clip
          only if a name could ever crowd out the wind. */}
      <Text size={40} weight={W.black} color={T.text} lines={1} style={{ ...CLIP, flexShrink: 1 }}>
        {(storm.name ?? "UNNAMED").toUpperCase()}
      </Text>
      <Text
        size={34}
        weight={W.bold}
        color={T.muted}
        lines={1}
        style={{ flex: "1 1 0", minWidth: 0 }}
      >
        {storm.headline ?? ""}
      </Text>
      {storm.windMph != null && (
        <Text size={36} weight={W.black} color={T.text} lines={1} style={{ ...CLIP, ...FIXED }}>
          {`${storm.windMph} mph`}
        </Text>
      )}
    </div>
  );
}
