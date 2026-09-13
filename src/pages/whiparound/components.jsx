import { Fragment, useState } from "react";
import { LINE, T, W } from "./theme";
import { useMeasuredSize } from "./hooks";

/* The furniture every screen shares — ports of whiparound-firetv's
 * ui/Components.kt and ui/TeamLogo.kt. One definition each, so the screens in
 * the rotation cannot drift apart on the small type.
 *
 * Compose -> CSS, as every screen here uses it:
 *   Modifier.weight(1f)            flex: "1 1 0", minWidth/minHeight: 0
 *   an unweighted Row child        flexShrink: 0 (unless it may ellipsize)
 *   Arrangement.spacedBy(n.pt)     gap: n
 *   maxLines = 1 + Ellipsis        <Text lines={1}>
 *   .border(1.dp, c)               ...edge(c) — inside the bounds, 2 stage px
 */

/// A Compose `Text`. Size is in stage px (= tvOS pt) and there is no default
/// below the floor on purpose: a missing size fell through to Material's 14sp on
/// the Fire TV and read as a deliberately small label.
export function Text({
  children,
  size = 34,
  weight = W.normal,
  color = T.text,
  spacing,
  lines,
  align,
  style,
  ...rest
}) {
  let clamp = null;
  if (lines === 1) {
    clamp = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 };
  } else if (lines > 1) {
    clamp = {
      display: "-webkit-box",
      WebkitLineClamp: lines,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
      minWidth: 0,
    };
  }
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing: spacing,
        lineHeight: LINE,
        textAlign: align,
        ...clamp,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/// A titled card. Same furniture as kalshi-live-firetv.
export function Panel({ children, gap = 10, style, ...rest }) {
  return (
    <div
      style={{
        background: T.panel,
        boxShadow: `inset 0 0 0 2px ${T.border}`,
        borderRadius: 18,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap,
        minWidth: 0,
        minHeight: 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/// A pill: the league, the channel, MOCK DATA.
export function Chip({ text, color = T.muted, fill = T.chipBg, size = 26, style }) {
  return (
    <div
      style={{
        color,
        background: fill,
        fontSize: size,
        fontWeight: W.black,
        lineHeight: LINE,
        borderRadius: 9,
        padding: "6px 14px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      {text}
    </div>
  );
}

/// The excitement score as a bar — the number alone has no scale.
export function HeatBar({ score, height = 14, heatColor, style }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  return (
    <div
      style={{
        width: "100%",
        height,
        background: T.chipBg,
        borderRadius: height / 2,
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ width: `${pct}%`, height, background: heatColor, borderRadius: height / 2 }} />
    </div>
  );
}

/* Bases and outs, drawn. Empty bases are OUTLINES rather than omitted — a
 * missing diamond means "no data", an empty one means "nobody on". Second base
 * at the top, first on the right: the reader's orientation, not the batter's. */
export function BaseDiamond({ situation, side = 104 }) {
  const w = side;
  const h = (w * 0.22) / 2;
  const bag = (cx, cy, on) => {
    const points = `${cx},${cy - h} ${cx + h},${cy} ${cx},${cy + h} ${cx - h},${cy}`;
    return on ? (
      <polygon points={points} fill={T.amber} />
    ) : (
      <polygon points={points} fill="none" stroke={T.muted} strokeWidth={w * 0.035} />
    );
  };
  const outs = situation?.outs ?? 0;
  const r = w * 0.055;
  return (
    <svg
      width={w}
      height={w}
      viewBox={`0 0 ${w} ${w}`}
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
    >
      {bag(w * 0.5, w * 0.2, situation?.onSecond)}
      {bag(w * 0.82, w * 0.5, situation?.onFirst)}
      {bag(w * 0.18, w * 0.5, situation?.onThird)}
      {[0, 1, 2].map((i) => {
        const cx = w * 0.5 + (i - 1) * w * 0.17;
        return i < outs ? (
          <circle key={i} cx={cx} cy={w * 0.86} r={r} fill={T.hot} />
        ) : (
          <circle
            key={i}
            cx={cx}
            cy={w * 0.86}
            r={r}
            fill="none"
            stroke={T.muted}
            strokeWidth={w * 0.022}
          />
        );
      })}
    </svg>
  );
}

/// "+22 more scheduled". The noun is a parameter because a truncation note that
/// lies about what it truncated is worse than none.
export function MoreNote({ hidden, noun = "" }) {
  if (!(hidden > 0)) return null;
  return (
    <Text size={30} weight={W.semibold} color={T.muted} align="center" style={{ width: "100%" }}>
      {[`+${hidden} more`, noun].filter(Boolean).join(" ")}
    </Text>
  );
}

export function Note({ text, style }) {
  return (
    <div style={{ flex: "1 1 0", minHeight: 0, ...style }}>
      <Text size={36} color={T.muted} lines={2} style={{ padding: "12px 0" }}>
        {text}
      </Text>
    </div>
  );
}

/// Panel headings — "NEXT UP", "THE WEEK". A heading is a label, so it sits ON
/// the 34 floor rather than above it.
export function Heading({ text, color = T.muted, style }) {
  return (
    <Text size={34} weight={W.black} color={color} spacing={1.6} style={style}>
      {text}
    </Text>
  );
}

// Tracks MoreNote's own type size, so the last row cannot overlap it.
const NOTE_ROOM = 44;

/* Draws as many rows as the space it was ACTUALLY given can hold, and says how
 * many it dropped. Hand-measured caps are wrong the moment a font size changes,
 * and wrong silently, by clipping off the bottom of the screen.
 *
 * It takes the slack in its column (flex 1 1 0) — the equivalent of the Compose
 * rule that the panel around it must be the slack-taking element, or there is
 * no height to measure against. `height` is a row's height in stage px, as a
 * number or a function of the item. At least one row always: "+18 more" and
 * nothing else is useless. */
export function AdaptiveRows({ items, height, spacing = 8, noun = "", renderRow, style }) {
  const [ref, size] = useMeasuredSize();
  const rowHeight = typeof height === "function" ? height : () => height;
  let shown = 0;
  if (size) {
    const fitting = (reserving) => {
      let used = 0;
      let count = 0;
      for (const item of items) {
        const next = used + (count === 0 ? 0 : spacing) + rowHeight(item);
        if (next > size.height - reserving) break;
        used = next;
        count += 1;
      }
      return Math.max(1, count);
    };
    const loose = fitting(0);
    shown = loose >= items.length ? items.length : fitting(NOTE_ROOM);
  }
  return (
    <div
      ref={ref}
      style={{ flex: "1 1 0", minHeight: 0, width: "100%", overflow: "hidden", ...style }}
    >
      {size && (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing }}>
          {items.slice(0, shown).map((item, i) => (
            <Fragment key={i}>{renderRow(item, i)}</Fragment>
          ))}
          <MoreNote hidden={items.length - shown} noun={noun} />
        </div>
      )}
    </div>
  );
}

/// URLs that failed, so a dead CDN is not re-requested every time the rotation
/// comes round.
const failedLogos = new Set();

/* One badge. A LOGO IS DECORATION AND NEVER THE ANSWER — every row that draws
 * one also carries the abbreviation. It occupies its size whether or not the
 * image ever arrives, so rows do not twitch sideways as logos land. */
export function TeamLogo({ url, size, style }) {
  const [failedFor, setFailedFor] = useState(null);
  const dead = !url || failedFor === url || failedLogos.has(url);
  return (
    <div style={{ width: size, height: size, flexShrink: 0, ...style }}>
      {!dead && (
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          decoding="async"
          referrerPolicy="no-referrer"
          style={{ display: "block", width: size, height: size, objectFit: "contain" }}
          onError={() => {
            failedLogos.add(url);
            setFailedFor(url);
          }}
        />
      )}
    </div>
  );
}
