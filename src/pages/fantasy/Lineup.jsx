/* THE ONE LINEUP RENDERER, shared by /fantasy/sleeper and /fantasy/espn.
 *
 * The backend normalises both providers into the same slot object, so there is
 * exactly one component here and no per-provider fork. Everything that differs
 * is a FIELD THAT IS NULL, never a different shape:
 *
 *   field      Sleeper                     ESPN
 *   slot       QB/RB/WR/TE/FLEX/SUPER_FLEX/DEF/K   QB/RB/WR/TE/FLEX/D/ST/K/BE/IR
 *   points     players_points[pid]         actual appliedTotal
 *   projected  pts_ppr, or null            projected appliedTotal, or null
 *   played     ALWAYS null (unknown)       true | false
 *   injury     'Q'|'D'|'O'|'IR'|… or null  ALWAYS null (mBoxscore has none)
 *   opponent   'CAR' or null               ALWAYS null
 *   bench      ALWAYS []                   7 rows
 *
 * Three of those are the reason this file is careful rather than clever:
 *
 * 1. A RAW PLAYER ID MUST NEVER REACH THE SCREEN. Sleeper matchups carry player
 *    ids, not names; the backend resolves them from the weekly projections
 *    endpoint and, when it cannot, sends name:null plus a flag. So `name` is
 *    the only thing rendered — `slot.playerId` exists for devtools and is
 *    deliberately never printed. (routes/sleeperFantasyFootball.js prints the
 *    id as the name in production right now, to three frontends. That is the
 *    bug this rule exists to not repeat.)
 * 2. `projected: null` IS NOT 0.00. Some starters genuinely have no published
 *    projection (10 of 134 in BIGGER dynasty in week 1 — injured or inactive
 *    players rotowire does not publish). It renders as an em dash, and the side
 *    total says it is partial rather than quietly under-reporting.
 * 3. `played: null` MEANS UNKNOWN, NOT "hasn't played". Sleeper gives us no
 *    kickoff time, so only an explicit `false` is allowed to grey a score out.
 *    Treating null as false would grey out every Sleeper score forever.
 *
 * NO ErrorBoundary EXISTS IN THIS APP. A throw in here blanks the whole site,
 * so every read goes through a helper that tolerates null.
 */
import { C, S, fmtPts, score } from "./theme.js";
import { asArray } from "./useFantasyFeed.js";
import { TeamName, Chip } from "./ui.jsx";

/* Amber = playing through it, red = not playing. Anything the backend has not
 * seen before falls through to muted rather than to a colour that implies a
 * severity we did not read. */
const INJURY_COLOR = {
  Q: C.amber,
  D: C.amber,
  O: C.red,
  IR: C.red,
  SUS: C.red,
  PUP: C.red,
};

function lineupOf(side) {
  return (side && side.lineup) || null;
}
function slotsOf(side) {
  const l = lineupOf(side);
  return asArray(l && l.slots);
}
function benchOf(side) {
  const l = lineupOf(side);
  return asArray(l && l.bench);
}
function totalsOf(side) {
  const l = lineupOf(side);
  return (l && l.totals) || {};
}

/* A team name short enough for a 44px-tall column header. */
function shortName(side) {
  const n = (side && side.name) || "";
  return n.length > 18 ? `${n.slice(0, 17)}…` : n || "—";
}

function PlayerCell({ slot, align }) {
  if (!slot) return <div style={S.playerCell} />;

  /* THE WHOLE POINT OF THIS COMPONENT. name is null in two different ways and
   * both of them have words, not an id:
   *   empty      — Sleeper writes player_id '0' for an unfilled starting slot
   *                (34 of 168 starters in one of these leagues in week 1), so
   *                this WILL be on screen; it is his opponents' problem, not a
   *                bug in ours.
   *   unresolved — the projections payload did not contain that id. Zero of 600
   *                live ids hit this today, and it still ships: a bad week is
   *                not the time to find out the fallback was never written. */
  const named = typeof slot.name === "string" && slot.name.trim() !== "";
  const label = named
    ? slot.name
    : slot.empty === true
      ? "Empty"
      : "Unknown player";

  const meta = [slot.pos, slot.nfl].filter(Boolean).join(" · ");
  const opp = slot.opponent ? `vs ${slot.opponent}` : "";
  const sub = [meta, opp].filter(Boolean).join("  ");

  const inj =
    typeof slot.injury === "string" && slot.injury.trim() !== ""
      ? slot.injury.trim()
      : null;

  const parts = [
    <span
      key="name"
      style={{
        fontWeight: 600,
        color: named ? C.text : C.muted,
        fontStyle: named ? "normal" : "italic",
        overflow: "hidden",
        textOverflow: "ellipsis",
        minWidth: 0,
      }}
    >
      {label}
    </span>,
    inj ? (
      <span
        key="inj"
        title={`Injury status: ${inj}`}
        style={{
          color: INJURY_COLOR[inj] || C.muted,
          fontSize: 9.5,
          fontWeight: 800,
          border: `1px solid ${INJURY_COLOR[inj] || C.border}`,
          borderRadius: 4,
          padding: "0 3px",
          flexShrink: 0,
        }}
      >
        {inj}
      </span>
    ) : null,
    sub ? (
      <span
        key="sub"
        style={{
          color: C.muted,
          fontSize: "0.82em",
          flexShrink: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {sub}
      </span>
    ) : null,
  ].filter(Boolean);

  return (
    <div
      style={{
        ...S.playerCell,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
      }}
    >
      {/* Mirrored on the away side so both names sit against the outside edge
          of the card and the slot labels stay the spine down the middle. */}
      {align === "right" ? parts.slice().reverse() : parts}
    </div>
  );
}

function PointsCell({ slot }) {
  const pts = slot ? slot.points : null;
  /* Only an explicit false greys a score out — see the header. Sleeper's null
     must render exactly like a normal score. */
  const notYet = slot ? slot.played === false : false;
  return (
    <div
      style={{
        ...S.numCell,
        fontWeight: 700,
        color: notYet ? C.muted : C.text,
      }}
      title={notYet ? "Has not played yet" : undefined}
    >
      {slot ? fmtPts(pts) : ""}
    </div>
  );
}

function ProjCell({ slot }) {
  return (
    <div style={{ ...S.numCell, color: C.muted, fontSize: "0.88em" }}>
      {slot ? fmtPts(slot.projected) : ""}
    </div>
  );
}

function Row({ home, away, bench }) {
  /* The slot label is the same on both sides by construction (the backend
     aligns them), but a bye has only one side and a malformed payload could
     have neither — hence the fallback chain rather than home.slot. */
  const label = (home && home.slot) || (away && away.slot) || "—";
  return (
    <div style={bench ? { ...S.lineupRow, ...S.benchRow } : S.lineupRow}>
      <PlayerCell slot={home} align="left" />
      <PointsCell slot={home} />
      <ProjCell slot={home} />
      <div style={S.slotCell}>{label}</div>
      <ProjCell slot={away} />
      <PointsCell slot={away} />
      <PlayerCell slot={away} align="right" />
    </div>
  );
}

function HeadRow({ game }) {
  return (
    <div style={S.lineupHead}>
      <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {shortName(game.home)}
      </div>
      <div style={S.numCell}>Pts</div>
      <div style={S.numCell}>Proj</div>
      <div style={{ ...S.slotCell, fontSize: 9.5 }}>Slot</div>
      <div style={S.numCell}>Proj</div>
      <div style={S.numCell}>Pts</div>
      <div
        style={{ overflow: "hidden", textOverflow: "ellipsis", textAlign: "right" }}
      >
        {game.away ? shortName(game.away) : ""}
      </div>
    </div>
  );
}

/* One side of the score header: name, live total, and the projected total with
 * its own honesty flag. */
function SideScore({ side, winning }) {
  if (!side) return null;
  const t = totalsOf(side);
  const missing = Number(t.projectedMissing) || 0;
  return (
    <div style={S.gameSide}>
      <TeamName team={side} />
      <span
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            color: winning ? C.green : C.text,
          }}
        >
          {fmtPts(side.points)}
        </span>
        <span
          style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap" }}
          title={
            missing > 0
              ? `${missing} starter${missing === 1 ? "" : "s"} have no published projection, so this total is partial`
              : undefined
          }
        >
          {/* projectedLive is ESPN's own "what this team finishes on" number
              and is null on Sleeper; show it when it exists, the static sum
              otherwise. The asterisk is the partial-total flag. */}
          proj {fmtPts(t.projectedLive != null ? t.projectedLive : t.projected)}
          {missing > 0 ? "*" : ""}
        </span>
      </span>
    </div>
  );
}

/* Win probability and yet-to-play: ESPN only, and ABSENT rather than zero on
 * Sleeper. A "0 yet to play" chip on a Sunday morning would be a flat lie. */
function ExtraChips({ game }) {
  const bits = [];
  const sides = [game.home, game.away];
  sides.forEach((side, i) => {
    if (!side) return;
    const t = totalsOf(side);
    if (typeof t.winProbability === "number" && Number.isFinite(t.winProbability)) {
      bits.push(
        <Chip key={`wp${i}`}>
          {shortName(side)} {Math.round(t.winProbability * 100)}% to win
        </Chip>,
      );
    }
  });
  sides.forEach((side, i) => {
    if (!side) return;
    const t = totalsOf(side);
    if (typeof t.yetToPlay === "number" && Number.isFinite(t.yetToPlay)) {
      bits.push(
        <Chip key={`ytp${i}`}>
          {shortName(side)} {t.yetToPlay} yet to play
        </Chip>,
      );
    }
  });
  if (bits.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        margin: "8px 0 0",
      }}
    >
      {bits}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        margin: "8px 0 2px",
      }}
    >
      {children}
    </div>
  );
}

/* THE COMPONENT. `game` is one normalized h2h game; `showBench` is ESPN-only
 * (Sleeper sides come back with bench:[] anyway, so this is belt to that
 * braces — 17 bench players per side do not fit the vertical budget and the
 * slot-aligned layout does not apply to them). */
export default function Lineup({ game, showBench }) {
  if (!game) return null;

  const bye = game.kind === "bye";
  const home = game.home || null;
  const away = bye ? null : game.away || null;

  const homeSlots = slotsOf(home);
  const awaySlots = slotsOf(away);
  const rows = Math.max(homeSlots.length, awaySlots.length);

  /* Leader in green — but only once somebody has actually scored, so a
     0.00 vs 0.00 pre-kickoff card does not crown a "leader". */
  const hp = score(home && home.points);
  const ap = score(away && away.points);
  const live = hp > 0 || ap > 0;

  const homeBench = showBench ? benchOf(home) : [];
  const awayBench = showBench ? benchOf(away) : [];
  const benchRows = Math.max(homeBench.length, awayBench.length);

  return (
    <div style={{ minWidth: 0 }}>
      <SideScore side={home} winning={live && !bye && hp > ap} />
      {bye ? (
        <div style={{ fontSize: 12, color: C.muted, padding: "4px 0" }}>
          No matchup this week — bye
        </div>
      ) : (
        <SideScore side={away} winning={live && ap > hp} />
      )}

      <ExtraChips game={game} />

      {rows === 0 ? (
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
          No lineup came back for this matchup.
        </div>
      ) : (
        <div style={{ marginTop: 8, minWidth: 0 }}>
          <HeadRow game={game} />
          {Array.from({ length: rows }, (_, i) => (
            <Row
              key={`s${i}`}
              home={homeSlots[i] || null}
              away={awaySlots[i] || null}
            />
          ))}
          {benchRows > 0 ? (
            <>
              <SectionLabel>Bench</SectionLabel>
              {Array.from({ length: benchRows }, (_, i) => (
                <Row
                  key={`b${i}`}
                  home={homeBench[i] || null}
                  away={awayBench[i] || null}
                  bench
                />
              ))}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
