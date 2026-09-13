import { Heading, Panel, TeamLogo, Text } from "../components";
import { formatCentral, startMillis } from "../format";
import { LINE, T, W } from "../theme";

/* College football, in three screens: the poll, the power conferences, and the
 * team — a port of whiparound-firetv's ui/Cfb.kt. None of it moves at the speed
 * of the board, which is why none of them earns much of a lap (slots.js).
 *
 * THE TEAM IS CONFIGURABLE and this file must not assume otherwise. Baylor is
 * the backend's default (`WHIPAROUND_CFB_TEAM`); its colour comes down the wire
 * as the team's own hex, so pointing the var elsewhere recolours the page
 * instead of leaving Baylor green behind.
 */

/// `maxLines = 1` with Compose's default overflow, which CLIPS. Only the lines
/// the Kotlin gives `TextOverflow.Ellipsis` get the ellipsis.
const clip = { textOverflow: "clip" };

/// `Spacer(Modifier.width(n.pt))` in a Row.
function Gap({ w }) {
  return <div style={{ width: w, flexShrink: 0 }} />;
}

/// `Spacer(Modifier.weight(1f))` in a Column.
function Fill() {
  return <div style={{ flex: "1 1 0", minHeight: 0 }} />;
}

/// `Modifier.weight(w)` on a Panel. A Compose weight INCLUDES the Panel's
/// padding, but CSS hands out free space only after every item's padding is
/// taken off, so a weighted Panel next to an unpadded sibling (or a differently
/// weighted Panel) lands ~15px off. The weight goes on this unpadded wrapper and
/// the Panel fills it.
function Weight({ grow, children }) {
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

/// The team's own colour, with the panel border as the fallback. A television is
/// not the place to throw on a malformed hex.
function teamColor(hex) {
  const raw = hex?.replace(/^#/, "");
  return raw && /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw}` : T.border;
}

/* THE POLL — twenty-five in two columns of thirteen rather than three of nine:
 * the ranking is the whole point, and a reader scanning for "where is Baylor"
 * follows one column down and then the next. */
export function PollScreen({ poll, myTeam }) {
  const half = Math.floor((poll.teams.length + 1) / 2);
  const columns = [poll.teams.slice(0, half), poll.teams.slice(half)];
  return (
    <Panel style={{ flex: "1 1 0" }}>
      <Heading
        text={[poll.name.toUpperCase(), poll.week?.toUpperCase()].filter(Boolean).join(" · ")}
      />
      <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", gap: 24 }}>
        {columns.map((column, c) => (
          <div
            key={c}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {column.map((t, i) => (
              <PollRow key={i} t={t} mine={myTeam != null && t.abbr === myTeam} />
            ))}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PollRow({ t, mine }) {
  const m = t.moved;
  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Text
        size={36}
        weight={W.black}
        color={T.muted}
        style={{ width: 58, flexShrink: 0, whiteSpace: "nowrap" }}
      >
        {t.rank}
      </Text>
      <TeamLogo url={t.logo} size={40} />
      <Gap w={10} />
      {/* The configured team is called out wherever it appears — the point of a
          wall is that you find your team without reading. */}
      <Text
        size={40}
        weight={mine ? W.black : W.bold}
        color={mine ? T.warm : T.text}
        lines={1}
        style={{ flex: "1 1 0" }}
      >
        {t.name ?? t.abbr ?? "—"}
      </Text>
      {/* First-place votes only for the teams that have any — the top few. */}
      {t.firstPlaceVotes != null && (
        <>
          <Text size={28} weight={W.bold} color={T.muted} style={{ flexShrink: 0 }}>
            {`(${t.firstPlaceVotes})`}
          </Text>
          <Gap w={8} />
        </>
      )}
      <Text size={32} weight={W.bold} color={T.muted} lines={1} style={{ ...clip, flexShrink: 0 }}>
        {t.record ?? ""}
      </Text>
      {/* Movement only when there is a previous poll to have moved from. */}
      {m != null && m !== 0 && (
        <>
          <Gap w={8} />
          <Text
            size={28}
            weight={W.black}
            color={m > 0 ? T.up : T.down}
            style={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {m > 0 ? `▲${m}` : `▼${-m}`}
          </Text>
        </>
      )}
    </div>
  );
}

/* THE POWER CONFERENCES — one column each. Four columns of sixteen to eighteen
 * rows only fits because each row carries an abbreviation and one record. The
 * conference record is preferred and the overall is the fallback, because ESPN
 * publishes no conference losses until games are played (models/cfb.js). */
export function ConferencesScreen({ conferences, myTeam }) {
  return (
    <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", gap: 14 }}>
      {conferences.map((conf, c) => (
        <Panel key={c} style={{ flex: "1 1 0" }}>
          <Heading text={shortConf(conf).toUpperCase()} />
          <div
            style={{
              flex: "1 1 0",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {conf.teams.map((t, i) => {
              const mine = myTeam != null && t.abbr === myTeam;
              return (
                <div
                  key={i}
                  style={{
                    flex: "1 1 0",
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <TeamLogo url={t.logo} size={34} />
                  <Gap w={9} />
                  {/* 30 and 26 are UNDER the 34 floor, and this is the one
                      screen allowed under it: eighteen Big Ten teams share a
                      column with a heading (~44 a row), so type at the floor
                      would clip rather than shrink. A conference table is
                      reference material you look one team up in, and that team
                      is in amber. Below 30 it stops being either. */}
                  <Text
                    size={30}
                    weight={mine ? W.black : W.bold}
                    color={mine ? T.warm : T.text}
                    lines={1}
                    style={{ ...clip, flex: "1 1 0" }}
                  >
                    {t.abbr ?? "—"}
                  </Text>
                  <Text
                    size={26}
                    weight={W.bold}
                    color={T.muted}
                    lines={1}
                    style={{ ...clip, flexShrink: 0 }}
                  >
                    {t.conference ?? t.overall ?? ""}
                  </Text>
                </div>
              );
            })}
          </div>
        </Panel>
      ))}
    </div>
  );
}

/// "Southeastern Conference" is 24 characters and there are four of these side
/// by side. ESPN's own abbreviation is what fits.
function shortConf(c) {
  switch (c.abbr) {
    case "sec":
      return "SEC";
    case "big10":
      return "Big Ten";
    case "big12":
      return "Big 12";
    case "acc":
      return "ACC";
    case "pac12":
      return "Pac-12";
    default:
      return c.name;
  }
}

/// Kotlin's `chunked`.
function chunked(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/* THE TEAM PAGE. In the preseason the record is 0-0 and every table is zeros,
 * so the things worth a wall are WHO THEY PLAY NEXT and the shape of the season:
 * the next game gets the hero, the schedule gets the rest. */
export function TeamScreen({ team }) {
  const accent = teamColor(team.colorHex);
  // Two columns of six for a twelve-game season. Chunked rather than fixed so a
  // thirteenth game — a conference title, a bowl — does not fall off.
  const perColumn = Math.max(Math.floor((team.games.length + 1) / 2), 1);
  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Weights 0.42 / 0.58 and 0.38 / 0.62, as whole-number grow factors. */}
      <div style={{ flex: "42 1 0", minHeight: 0, display: "flex", gap: 14 }}>
        <Weight grow={38}>
          <Panel style={{ flex: "1 1 0" }}>
            <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
              <div
                style={{
                  width: 10,
                  height: 46,
                  background: accent,
                  borderRadius: 5,
                  flexShrink: 0,
                }}
              />
              <Gap w={12} />
              <TeamLogo url={team.logo} size={52} />
              <Gap w={12} />
              <Text size={38} weight={W.black} spacing={1} lines={1} style={{ flex: "0 1 auto" }}>
                {(team.name ?? "—").toUpperCase()}
              </Text>
            </div>
            <Fill />
            <Text size={88} weight={W.black} lines={1} style={clip}>
              {team.record ?? "—"}
            </Text>
            {team.standing != null && (
              <Text size={34} weight={W.bold} color={T.muted} lines={1} style={clip}>
                {team.standing}
              </Text>
            )}
            <Fill />
          </Panel>
        </Weight>
        <Weight grow={62}>
          <NextGameCard game={team.next} accent={accent} />
        </Weight>
      </div>
      <Weight grow={58}>
        <Panel style={{ flex: "1 1 0" }}>
          <Heading text={`THE SEASON · ${team.games.length} GAMES`} />
          <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", gap: 18 }}>
            {chunked(team.games, perColumn).map((column, c) => (
              <div
                key={c}
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {column.map((g, i) => (
                  <ScheduleRow key={i} g={g} />
                ))}
              </div>
            ))}
          </div>
        </Panel>
      </Weight>
    </div>
  );
}

function NextGameCard({ game, accent }) {
  if (game == null) {
    return (
      <Panel style={{ flex: "1 1 0" }}>
        <Heading text="NEXT" />
        <Fill />
        <Text size={38} weight={W.bold} color={T.muted}>
          Season complete.
        </Text>
        <Fill />
      </Panel>
    );
  }
  /* The school's name, unless the school's name IS the abbreviation: "at #12
   * BYU" over "BYU" is the same three letters twice, and it happens for every
   * BYU, TCU, SMU, UCF and LSU. */
  const name =
    game.opponentName != null &&
    game.opponentName.toLowerCase() !== (game.opponentAbbr ?? "").toLowerCase()
      ? game.opponentName
      : null;
  return (
    <Panel style={{ flex: "1 1 0" }}>
      <Heading text="NEXT" />
      <Fill />
      <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
        <TeamLogo url={game.opponentLogo} size={76} />
        <Gap w={16} />
        {/* 56 — this line shipped on the stick with NO size and fell through to
            Material's 14sp, smaller than the venue under it. */}
        <Text size={56} weight={W.black} lines={1} style={{ flex: "0 1 auto" }}>
          {game.opponentLabel}
        </Text>
      </div>
      {name != null && (
        <Text size={36} weight={W.bold} color={accent} lines={1} style={clip}>
          {name}
        </Text>
      )}
      <Fill />
      {/* In Central, and a date rather than "TBD" when only the time is unset.
          This card is the one place on the page somebody plans an evening from.
          (minHeight: a Compose Text with no characters still takes a line.) */}
      <Text size={36} weight={W.bold} lines={1} style={{ ...clip, minHeight: 36 * LINE }}>
        {[whenLabel(game), game.broadcast].filter(Boolean).join(" · ")}
      </Text>
      {game.venue != null && (
        <Text size={30} weight={W.bold} color={T.muted} lines={1} style={clip}>
          {game.at === "neutral" ? `${game.venue} · neutral site` : game.venue}
        </Text>
      )}
    </Panel>
  );
}

/* WHEN A SCHEDULED GAME IS, IN THE ROOM'S OWN ZONE — and the TBD trap.
 *
 * `status` is ESPN's house string ("9/12 - 8:08 PM EDT"), Eastern, on a wall in
 * Houston; `date` is UTC, so a real kickoff is formatted in Central.
 *
 * ESPN sends "TBD" for most of a season, but a TBD game is one whose TIME is not
 * set, not one whose week is unknown — so it prints the date and nothing about a
 * time it does not have. AND THAT DATE IS READ IN EASTERN: ESPN's "time not set"
 * placeholder is MIDNIGHT EASTERN (04:00Z, 05:00Z after the clocks change), which
 * in Central lands on the PREVIOUS evening and would render a Saturday game as
 * Friday. A placeholder is an Eastern calendar date; a real kickoff is a real
 * instant. That split is the point, not an inconsistency.
 */
const EASTERN_DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "numeric",
  day: "numeric",
});

function easternDay(ms) {
  const p = {};
  for (const part of EASTERN_DAY.formatToParts(new Date(ms))) p[part.type] = part.value;
  return `${p.weekday} ${p.month}/${p.day}`.toUpperCase();
}

function whenLabel(g) {
  // Falls back to ESPN's prose when `date` is absent or unparseable: a
  // wrong-zone time still answers the question, and a blank does not.
  const ms = startMillis({ start: g.dateIso });
  if (ms == null) return g.status;
  const timeUnset = g.status != null && g.status.toUpperCase().includes("TBD");
  if (timeUnset) return easternDay(ms);
  return `${formatCentral(ms, "EEE M/d").toUpperCase()} · ${formatCentral(ms, "h:mm a").toUpperCase()}`;
}

function ScheduleRow({ g }) {
  /* A COMPLETED GAME WITH NO SCORE STILL SAYS WHO WON. A dropped score used to
   * fall through to `status`, so a 16-17 loss read as a bare grey "Final" for a
   * week beside a 0-1 record. `won` arrives even when the scores do not. */
  const result =
    g.scoreLabel ??
    (g.completed && g.won === true
      ? "W"
      : g.completed && g.won === false
        ? "L"
        : g.completed
          ? "FINAL"
          : whenLabel(g)) ??
    "";
  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        display: "flex",
        alignItems: "center",
      }}
    >
      <TeamLogo url={g.opponentLogo} size={34} />
      <Gap w={10} />
      {/* A played game is history and dims; what is still to come is what the
          room is asked about. */}
      <Text
        size={34}
        weight={W.bold}
        color={g.completed ? T.muted : T.text}
        lines={1}
        style={{ flex: "1 1 0" }}
      >
        {g.opponentLabel}
      </Text>
      <Text
        size={30}
        weight={g.completed ? W.black : W.bold}
        color={g.won === true ? T.up : g.won === false ? T.down : T.muted}
        lines={1}
        style={{ ...clip, flexShrink: 0 }}
      >
        {result}
      </Text>
    </div>
  );
}
