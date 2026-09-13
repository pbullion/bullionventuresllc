import { T, W, edge } from "./theme";
import { Text } from "./components";
import { comingUpToday } from "./screens/SlateLayout";

/* The bottom strip — a port of StatusStrip in whiparound-firetv's ui/Board.kt.
 *
 * NEXT is TWO matchups, not six: at 36pt six truncated in the middle of an
 * abbreviation ("SJSU@U…"), which reads as a strip that broke. It only shows
 * while something is live; COMING UP carries the rest of today's games.
 *
 * NEXT IS ON COMING UP'S TERMS (Patrick, 2026-09-13): today's games, no NHL or
 * NBA. Read raw, the strip said "NEXT  DEN@KC  MTL@TOR" under NO MORE GAMES
 * TODAY once Sunday night's game had kicked off — Monday's game and a hockey
 * preseason game six days out, neither dated. With nothing left today the NEXT
 * half stands down on its own.
 *
 * Weather drops its last clause (wind) when it shares the strip and is whole on
 * its own. On the weather SCREEN the weather half stands down — it would be the
 * same sentence the panel above is already shouting.
 */
export default function StatusStrip({ slate, now, showNext, showWeather }) {
  const next = showNext ? comingUpToday(slate.upcoming, now).slice(0, 2) : [];
  const weather = showWeather ? slate.weather : null;
  if (next.length === 0 && !weather) return null;
  const alone = next.length === 0;

  return (
    <div
      style={{
        height: 84,
        flexShrink: 0,
        background: T.panel,
        ...edge(),
        borderRadius: 14,
        padding: "0 18px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      {next.length > 0 && (
        <>
          <Text size={28} weight={W.black} color={T.muted} spacing={1.4} style={{ flexShrink: 0 }}>
            NEXT
          </Text>
          <Text size={36} weight={W.bold} lines={1} style={{ flex: "1 1 0", whiteSpace: "pre" }}>
            {next.map((g) => `${g.away.abbr}@${g.home.abbr}`).join("    ")}
          </Text>
        </>
      )}
      {weather && (
        <>
          {/* Left-aligned when it has the strip to itself, pushed right when
              sharing it. */}
          {alone ? (
            <div style={{ width: 2, flexShrink: 0 }} />
          ) : (
            <div style={{ flex: "1 1 0" }} />
          )}
          <Text size={28} weight={W.black} color={T.muted} spacing={1.4} style={{ flexShrink: 0 }}>
            {weather.city.toUpperCase()}
          </Text>
          {weather.tempLabel && (
            <Text size={48} weight={W.black} style={{ flexShrink: 0 }}>
              {weather.tempLabel}
            </Text>
          )}
          <Text
            size={34}
            weight={W.bold}
            color={T.muted}
            lines={1}
            style={alone ? { flex: "1 1 0" } : { flexShrink: 0 }}
          >
            {(alone ? weather.detail : weather.detail.slice(0, 3)).join(" · ")}
          </Text>
        </>
      )}
    </div>
  );
}
