import { Heading, Panel, Text } from "../components";
import { conditionGlyph } from "../models/slate";
import { LINE, T, W } from "../theme";
import { BAR_FLOOR, BAR_RANGE, lerpColor, rainColor, uvColor } from "./WeatherRules";

/* The weather screen — a port of whiparound-firetv's ui/Weather.kt.
 *
 * The bottom strip can only say what it is doing NOW, in one ellipsized line;
 * the forward questions (does the afternoon hold, does the evening game get
 * rained on, what does the week do) need columns. Three bands, coarse to fine:
 * now, the next twelve hours, the week.
 *
 * A MISSING VALUE RENDERS "—" RATHER THAN BEING DROPPED — the opposite of the
 * strip's rule, deliberately. The strip is a sentence, where an absent clause is
 * invisible; these are LABELLED slots, and an empty labelled slot has to say so
 * or the panel looks like it forgot a number. (The condition and feels-like on
 * the NOW card are not labelled slots, and are omitted when absent, as there.)
 *
 * The strip's own weather half stands down on this screen (index.jsx), and the
 * slot only exists with a forecast (slots.js). A pinned WEATHER can still arrive
 * with no forecast, so each band below stands down on its own list.
 */

/// Compose `maxLines = 1` with the default TextOverflow.Clip: cut, no "…".
/// flexShrink 0 because overflow:hidden also drops a flex item's automatic
/// min-height to 0, and an overflowing column would then squeeze its top label
/// — on the stick the Column squeezes its LAST child, never the first.
const CLIP = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  maxWidth: "100%",
  flexShrink: 0,
};

/* A card fills its Weighted box. overflow:hidden stands in for the Compose
 * Column's constraint: there the last child is handed whatever height is left
 * and is cut inside the card, so nothing ever crosses a card edge (a long city
 * name wrapping the heading pushed the condition line through the border
 * without it). It clips at the padding edge, so a few px of Compose-sized
 * overrun stays visible in the 18px padding rather than slicing descenders. */
const CARD = { flex: "1 1 0", overflow: "hidden" };

/// A weighted Spacer.
const SPRING = { flex: "1 1 0", minHeight: 0, minWidth: 0 };

/* A Compose `Modifier.weight(n)`. The grow sits on this UNPADDED box, never on
 * the Panel: CSS flex-basis 0 is an exact ratio only for items with no padding —
 * a border-box Panel keeps its 36px of padding as a floor and only the rest is
 * shared, which measured the bands at 288/341/290 against Compose's 312/331/275
 * and pushed the NOW card's content through its border with the chip row up.
 * Cards that can stand down return before rendering this, so their share goes
 * to the others as a Compose weight with no child does. */
function Weighted({ grow, children }) {
  return (
    <div
      style={{
        flex: `${grow} 1 0`,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

export function WeatherScreen({ w }) {
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
      {/* 0.34 / 0.36 / 0.30, from 0.42 / 0.34 / 0.28: the top band had room to
          give; the two column strips under it ran out of height the moment
          their type cleared the floor. Integer grows so the three sum exactly
          (a CSS grow total under 1 leaves free space undistributed), and a band
          that stands down gives its share to the others, as a Compose weight
          with no child does. */}
      <div
        style={{
          flex: "34 1 0",
          minHeight: 0,
          width: "100%",
          display: "flex",
          gap: 14,
        }}
      >
        {/* The board's hero-and-list 0.38/0.62 split, so the screens share a
            spine rather than each inventing its own geometry. */}
        <NowCard w={w} grow={38} />
        <TodayCard w={w} grow={62} />
      </div>
      {/* The hourly band carries the temperature profile as well as the
          numbers, so it earns the extra height over the week below it. */}
      <HourlyCard hours={w.hourly} grow={36} />
      <DailyCard days={w.daily} grow={30} />
    </div>
  );
}

/// Current conditions, sized to be read from the far side of the room.
function NowCard({ w, grow }) {
  return (
    <Weighted grow={grow}>
      <Panel style={CARD}>
        <Heading text={w.city.toUpperCase()} />
        <div style={SPRING} />
        <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
          <Text size={116} weight={W.black} style={CLIP}>
            {w.tempLabel ?? "—"}
          </Text>
          <div style={SPRING} />
          <Text size={64} style={{ flexShrink: 0 }}>
            {w.glyph}
          </Text>
        </div>
        {/* CONDITION AND FEELS-LIKE SHARE A LINE, and they have to: stacked, this
          card asked for ~349 inside ~322 and the last line rendered sliced by
          the card's bottom edge on the wall (2026-09-12). Pairing them saves a
          whole 34px line plus its gap without shrinking any type. Feels-like is
          the muted qualifier, measured first so the condition is what
          ellipsizes; it appears only when it differs by 3+ (the strip's rule,
          in feelsLabel). */}
        <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
          {w.conditionLabel && (
            <Text size={40} weight={W.bold} lines={1} style={{ flex: "0 1 auto" }}>
              {w.conditionLabel}
            </Text>
          )}
          {w.feelsLabel && (
            <>
              <div style={{ width: 14, flexShrink: 0 }} />
              <Text size={34} weight={W.bold} color={T.muted} style={CLIP}>
                {w.feelsLabel}
              </Text>
            </>
          )}
        </div>
        <div style={SPRING} />
      </Panel>
    </Weighted>
  );
}

/// Today's numbers in labelled slots. Two rows of four rather than one of
/// eight: eight across gives each tile ~120px and the values set narrower than
/// their own labels.
function TodayCard({ w, grow }) {
  return (
    <Weighted grow={grow}>
      <Panel style={CARD}>
        <Heading text="TODAY" />
        <StatRow>
          <Stat label="HIGH" value={w.high != null ? `${w.high}°` : null} />
          <Stat label="LOW" value={w.low != null ? `${w.low}°` : null} tint={T.muted} />
          <Stat
            label="RAIN"
            value={w.rainChance != null ? `${w.rainChance}%` : null}
            tint={rainColor(w.rainChance)}
          />
          {/* Raw mph here, not the strip's "calm" — this is a labelled number. */}
          <Stat
            label="WIND"
            value={
              w.windMph != null ? [`${w.windMph}mph`, w.windDir].filter(Boolean).join(" ") : null
            }
            size={34}
          />
        </StatRow>
        <StatRow>
          <Stat label="HUMIDITY" value={w.humidity != null ? `${w.humidity}%` : null} />
          <Stat
            label="UV"
            value={w.uvIndex != null ? String(w.uvIndex) : null}
            tint={uvColor(w.uvIndex)}
          />
          <Stat label="SUNRISE" value={w.sunrise} size={34} />
          <Stat label="SUNSET" value={w.sunset} size={34} />
        </StatRow>
      </Panel>
    </Weighted>
  );
}

/* A Compose Row takes its default Alignment.Top, and each Stat wraps its
 * content, so the Stat's own Arrangement.Center is a no-op on the Fire TV: the
 * tiles sit at the TOP of their half-card, every label on one line. */
function StatRow({ children }) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      {children}
    </div>
  );
}

/* The next twelve hours, as numbers AND as a shape. The bars show where the
 * afternoon peaks and how fast it comes off, which twelve numbers in a row do
 * not at a glance. Scaled across the hours actually shown, not an absolute
 * range, or on a Houston August day every bar sits pinned at the top. */
function HourlyCard({ hours, grow }) {
  if (hours.length === 0) return null;
  const temps = hours.map((h) => h.temp).filter((t) => t != null);
  const lo = temps.length > 0 ? Math.min(...temps) : null;
  const hi = temps.length > 0 ? Math.max(...temps) : null;
  return (
    <Weighted grow={grow}>
      <Panel style={CARD}>
        {/* The heading counts what is drawn — a short list says so. */}
        <Heading text={`NEXT ${hours.length} HOURS`} />
        <div
          style={{
            flex: "1 1 0",
            minHeight: 0,
            width: "100%",
            display: "flex",
          }}
        >
          {hours.map((h, i) => (
            <Cell key={i}>
              <Text size={30} weight={W.black} color={T.muted} style={CLIP}>
                {h.label}
              </Text>
              <Text size={38}>{conditionGlyph(h.condition)}</Text>
              <Text size={48} weight={W.black} style={CLIP}>
                {h.temp != null ? `${h.temp}°` : "—"}
              </Text>
              <RainLine chance={h.rainChance} />
              <div style={SPRING} />
              <TempBar temp={h.temp} lo={lo} hi={hi} />
            </Cell>
          ))}
        </div>
      </Panel>
    </Weighted>
  );
}

/// One hour's bar. A flat span draws every bar at the floor rather than
/// dividing by a zero range; an hour with no temperature draws none.
function TempBar({ temp, lo, hi }) {
  if (temp == null || lo == null || hi == null) return null;
  const span = hi - lo;
  const fraction = span <= 0 ? 0 : (temp - lo) / span;
  return (
    <div
      style={{
        alignSelf: "stretch",
        flexShrink: 0,
        margin: "0 10px",
        height: BAR_FLOOR + BAR_RANGE * fraction,
        // Warm at this window's peak, cool at its trough — a relative ramp,
        // "hottest part of the afternoon", not an absolute temperature scale.
        background: lerpColor(T.cool, T.hot, fraction),
        borderRadius: 3,
      }}
    />
  );
}

function DailyCard({ days, grow }) {
  if (days.length === 0) return null;
  return (
    <Weighted grow={grow}>
      <Panel style={CARD}>
        <Heading text="THE WEEK" />
        <div
          style={{
            flex: "1 1 0",
            minHeight: 0,
            width: "100%",
            display: "flex",
          }}
        >
          {days.map((d, i) => (
            <Cell key={i}>
              {/* Today at full brightness; the rest of the week is reference. */}
              <Text
                size={32}
                weight={W.black}
                color={d.label === "TODAY" ? T.text : T.muted}
                style={CLIP}
              >
                {d.label}
              </Text>
              <Text size={42}>{conditionGlyph(d.condition)}</Text>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 6,
                  maxWidth: "100%",
                }}
              >
                <Text size={48} weight={W.black} style={CLIP}>
                  {d.high != null ? `${d.high}°` : "—"}
                </Text>
                {d.low != null && (
                  <Text size={34} weight={W.bold} color={T.muted} style={CLIP}>
                    {`${d.low}°`}
                  </Text>
                )}
              </div>
              <RainLine chance={d.rainChance} />
              {/* THE WEEK'S BARS ARE GONE (whiparound-firetv CLAUDE.md, "What this
                redesign deleted"): they filled an empty bottom third that this
                type size no longer leaves. Seven daily highs already read as a
                trend; one afternoon's shape does not, so the hourly bars stay. */}
              <div style={SPRING} />
            </Cell>
          ))}
        </div>
      </Panel>
    </Weighted>
  );
}

/* ── shared bits ── */

/// One column of the hourly or daily strip: an equal share of the width, the
/// full height (or the spring below the numbers is a no-op and the row pins
/// itself to the top of the panel), contents centred.
function Cell({ children }) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

/* Zero-chance hours and days print nothing rather than "0%" — twelve columns of
 * "0%" is noise that hides the one afternoon hour saying 60. The line keeps its
 * height when blank (a Compose Text of "" is still one line tall), so the
 * columns do not change shape between a dry hour and a wet one. */
function RainLine({ chance }) {
  return (
    <Text
      size={30}
      weight={W.bold}
      color={rainColor(chance)}
      style={{ ...CLIP, minHeight: 30 * LINE }}
    >
      {chance != null && chance > 0 ? `${chance}%` : ""}
    </Text>
  );
}

/// A labelled slot. An absent value is "—" in muted, never an empty tile.
function Stat({ label, value, tint = T.text, size = 46 }) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Text size={26} weight={W.black} color={T.muted} spacing={1.2} style={CLIP}>
        {label}
      </Text>
      <Text size={size} weight={W.black} color={value == null ? T.muted : tint} style={CLIP}>
        {value ?? "—"}
      </Text>
    </div>
  );
}
