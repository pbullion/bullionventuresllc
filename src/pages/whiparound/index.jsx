import { useCallback, useEffect, useRef, useState } from "react";
import { FONT, LINE, STAGE_H, STAGE_W, T } from "./theme";
import { Chip } from "./components";
import StatusStrip from "./StatusStrip";
import Controls from "./Controls";
import { PageBoundary, ScreenBoundary } from "./Boundary";
import { isFullscreen, toggleFullscreen } from "./fullscreen";
import { reloadIfReachable } from "./reload";
import { POLL_SECONDS, useBoard } from "./useBoard";
import { findSlot, pinnedSlot, position, slotStart, slots } from "./slots";
import { boardFor } from "./models/scoreboards";
import { WeatherScreen } from "./screens/Weather";
import { TropicsScreen } from "./screens/Tropics";
import { RadarScreen } from "./screens/Radar";
import { MatchupScreen } from "./screens/Matchup";
import { SurvivorScreen } from "./screens/Survivor";
import { FinalsScreen, TonightScreen } from "./screens/Slate";
import { RaceScreen } from "./screens/Race";
import { ConferencesScreen, PollScreen, TeamScreen } from "./screens/Cfb";
import { ScoreboardScreen } from "./screens/Scoreboard";
import { GamesPage } from "./screens/Games";

/* /whiparound — THE WHIP-AROUND WALL BOARD, IN A BROWSER.
 *
 * A web port of whiparound-firetv (Kotlin/Compose, "The Smokehouse Live"): the
 * same rotation of up to fifteen kinds of screen, the same backend routes on the
 * same clocks, the same type scale. It exists so the board can go on a monitor
 * that has a computer behind it rather than a Fire TV stick (Patrick,
 * 2026-09-13: "a whip around screen like the fire tv one that i can make full
 * screen on an external monitor").
 *
 * THE STAGE IS A FIXED 1920x1080 CANVAS, SCALED TO THE WINDOW. Every size on it
 * is a tvOS point from the Kotlin, 1:1, and the whole stage is scaled with one
 * transform — so a 27" 1440p panel, a 4K panel and a laptop all render the same
 * layout, letterboxed on the board's own background when the window is not
 * 16:9. Nothing here may be gated on the window's CSS width (the lesson /drive
 * learned the hard way); the row budgets measure the stage, not the screen.
 *
 * KEEP IT IN STEP WITH THE STICKS. The rotation (slots.js), the poll cadences
 * (useBoard.js) and every screen are ports; a change to one board that is not
 * made to the other is two walls disagreeing. The Fire TV repo's CLAUDE.md
 * holds the reasons — read it before "improving" a rule here.
 *
 * URL flags, all off by default and none of them sticky — a reload without the
 * flag is the real board:
 *   ?page=SCORE_NFL   pin one screen (FANTASY_2 = the second matchup)
 *   ?mock=1           the Fire TV's preview fixtures, with a MOCK DATA chip
 *   ?fast=1           four seconds a screen, to walk the whole rotation
 *   ?shot=1           no controls, no wake lock — for headless screenshots
 */

function readParams() {
  const q = new URLSearchParams(window.location.search);
  const flag = (key) => ["1", "true", "yes"].includes((q.get(key) ?? "").toLowerCase());
  return { page: q.get("page"), mock: flag("mock"), fast: flag("fast"), shot: flag("shot") };
}

const TITLES = {
  BOARD: "Board",
  WEATHER: "Weather",
  TROPICS: "Tropics",
  RADAR: "Storm radar",
  FANTASY: "Fantasy",
  SURVIVOR: "Guillotine",
  TONIGHT: "Coming up today",
  FINALS: "Final today",
  RACE: "Standings",
  POLL: "College poll",
  CONFERENCES: "Conferences",
  TEAM: "College team",
  TEAM_2: "College team 2",
  SCORE_MLB: "Baseball board",
  SCORE_NFL: "Football board",
  SCORE_NBA: "Basketball board",
};

function titleOf(slot) {
  return slot.page === "FANTASY" ? `Fantasy ${slot.index + 1}` : TITLES[slot.page] ?? slot.page;
}

/// Three missed polls. One failure is a blip, and saying so every time trains
/// the room to ignore the signal.
const STALE_AFTER_S = POLL_SECONDS * 3;

/* A tab left on a monitor for days never picks up a deploy. After twelve hours
 * it reloads — but only when the site answers (see reload.js), and never while
 * the Fullscreen API is holding the page, because a reload ends that and only a
 * click can restart it. Browser-level full screen (⌃⌘F) survives, so that is
 * the mode to leave a wall in. */
const RELOAD_AFTER_MS = 12 * 60 * 60 * 1000;

/* Roboto in the weights the board uses, and Noto Sans Mono 900 for the stadium
 * boards' numerals (see screens/ScoreboardLook.js). Added on mount and removed
 * on unmount — one SPA, one document head — and the mono face is loaded here
 * rather than by its screen so it is in the document before the first stadium
 * board comes round. */
const FONT_HREFS = [
  "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;800;900&display=swap",
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Mono:wght@900&display=swap",
];

/// Screen switch — a port of the `when (page)` in Board.kt. Every branch falls
/// back to the games page rather than asserting: a rotation bug should cost one
/// screen, not the wall.
function Screen({ slot, board }) {
  const { slate, cfb, fantasy, scoreboards, tropics, tracks, radar, now } = board;
  const games = <GamesPage state={board} />;
  switch (slot.page) {
    case "WEATHER":
      return slate.weather ? <WeatherScreen w={slate.weather} /> : games;
    case "TROPICS":
      return <TropicsScreen tropics={tropics} />;
    case "RADAR":
      return tracks.any ? <RadarScreen tracks={tracks} radar={radar} /> : games;
    case "FANTASY": {
      const m = fantasy.hasMatchups ? fantasy.matchups[slot.index] : null;
      return m ? <MatchupScreen fantasy={fantasy} m={m} index={slot.index} /> : games;
    }
    case "SURVIVOR":
      return fantasy.hasSurvivor ? <SurvivorScreen fantasy={fantasy} /> : games;
    case "TONIGHT":
      // Only once the slate has loaded. Before that an empty list is not "no
      // games today", so a pinned COMING UP falls back like any screen with no
      // data; the rotation never adds the slot that early anyway.
      return board.lastSuccess != null ? <TonightScreen slate={slate} now={now} /> : games;
    case "FINALS":
      return <FinalsScreen games={slate.final} />;
    case "RACE":
      return slate.standings || slate.nflStandings ? (
        <RaceScreen standings={slate.standings} nflStandings={slate.nflStandings} />
      ) : (
        games
      );
    case "POLL":
      return cfb?.poll ? <PollScreen poll={cfb.poll} myTeam={cfb.team?.abbr ?? null} /> : games;
    case "CONFERENCES":
      return cfb?.conferences?.length > 0 ? (
        <ConferencesScreen conferences={cfb.conferences} myTeam={cfb.team?.abbr ?? null} />
      ) : (
        games
      );
    case "TEAM":
      return cfb?.teams?.[0] ? <TeamScreen team={cfb.teams[0]} /> : games;
    case "TEAM_2":
      return cfb?.teams?.[1] ? <TeamScreen team={cfb.teams[1]} /> : games;
    case "SCORE_MLB":
    case "SCORE_NFL":
    case "SCORE_NBA": {
      const b = boardFor(scoreboards, slot.page.slice("SCORE_".length).toLowerCase());
      return b ? <ScoreboardScreen board={b} /> : games;
    }
    default:
      return games;
  }
}

/// The board — a port of `Board()` in Board.kt, at 1920x1080 stage px.
function Stage({ board, slot }) {
  const { slate, mock } = board;
  // A league whose fetch failed renders exactly like a league with nothing on.
  const down = Object.keys(slate.errors);
  const ageS =
    board.lastSuccess == null ? 0 : Math.max(0, Math.floor((board.now - board.lastSuccess) / 1000));
  // A screen that threw gets another attempt on the next good poll.
  const retry = board.lastSuccess ?? 0;

  return (
    <div
      style={{
        position: "relative",
        width: STAGE_W,
        height: STAGE_H,
        background: T.bg,
        color: T.text,
        fontFamily: FONT,
        lineHeight: LINE,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "18px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* The two signals that survived the header, both conditional. */}
        {(mock || down.length > 0) && (
          <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
            {mock && <Chip text="MOCK DATA" color={T.bg} fill={T.hot} size={28} />}
            {down.length > 0 && (
              <Chip text={`${down.map((k) => k.toUpperCase()).join(" ")} DOWN`} color={T.hot} />
            )}
          </div>
        )}
        <div
          key={`${slot.page}:${slot.index}`}
          style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column" }}
        >
          <ScreenBoundary resetKey={retry}>
            <Screen slot={slot} board={board} />
          </ScreenBoundary>
        </div>
        <ScreenBoundary resetKey={retry}>
          <StatusStrip
            slate={slate}
            now={board.now}
            showNext={slate.live.length > 0}
            showWeather={slot.page !== "WEATHER"}
          />
        </ScreenBoundary>
      </div>
      {/* THE STALE SIGNAL: a rail, not a row — it takes no height, so the layout
          is identical whether the board is fresh or not. */}
      {ageS > STALE_AFTER_S && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: T.hot }} />
      )}
    </div>
  );
}

function stageScale() {
  return Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
}

function WhipAround() {
  const [params] = useState(readParams);
  const board = useBoard({ mock: params.mock });
  const [scale, setScale] = useState(stageScale);
  const [skewMs, setSkewMs] = useState(0);
  // The slot a pause is holding — see togglePause. Null while the rotation runs.
  const [paused, setPaused] = useState(null);
  const [awake, setAwake] = useState(true);
  const idleTimer = useRef(null);
  const actions = useRef(null);

  const pinned = pinnedSlot(params.page);
  const list = slots(board, params.fast);
  const canSkip = !pinned && list.length > 1;
  const elapsedMs = board.now - board.startedAt + skewMs;
  const held = paused ? findSlot(list, paused) : -1;
  let pos;
  if (held >= 0) {
    pos = { slot: list[held], index: held, into: Math.min(paused.into, list[held].seconds - 1) };
  } else {
    // A held slot that has left the rotation falls back to the clock frozen at
    // the moment of the pause, so the wall still does not move while paused.
    pos = position(list, paused ? paused.elapsedMs : elapsedMs);
  }
  const slot = pinned ?? pos.slot;

  /* Skipping jumps to the START of the neighbouring slot by moving the
   * rotation's clock — position is still derived from elapsed time, so the cycle
   * carries on from there. While paused it moves the held slot instead. */
  const skip = (direction) => {
    if (!canSkip || pos.index < 0) return;
    const next = (pos.index + direction + list.length) % list.length;
    const target = list[next];
    if (paused) {
      setPaused({ ...paused, listIndex: next, page: target.page, index: target.index, into: 0 });
      return;
    }
    setSkewMs(slotStart(list, next) * 1000 - (board.now - board.startedAt));
  };

  /* PAUSE HOLDS A SCREEN, NOT A MOMENT. It records which slot is up — its page,
   * its matchup index and its place in the list — and keeps showing that slot
   * even when the data reshapes the rotation underneath it. A game ending changes
   * every live/idle duration at once, and a frozen clock alone would land on a
   * different screen while the controls still said "paused". Resume restarts the
   * rotation from the held slot, at the point it was paused. */
  const togglePause = () => {
    if (!canSkip || pos.index < 0) return;
    if (!paused) {
      setPaused({
        listIndex: pos.index,
        page: pos.slot.page,
        index: pos.slot.index,
        into: pos.into,
        elapsedMs,
      });
      return;
    }
    const i = findSlot(list, paused);
    if (i >= 0) {
      const into = Math.min(paused.into, list[i].seconds - 1);
      setSkewMs((slotStart(list, i) + into) * 1000 - (board.now - board.startedAt));
    }
    setPaused(null);
  };

  useEffect(() => {
    actions.current = { skip, togglePause };
  });

  const poke = useCallback(() => {
    setAwake(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setAwake(false), 2500);
  }, []);

  // Title, fonts and noindex — added on mount and removed on unmount, because
  // this SPA shares one document head.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Whip-Around";
    const added = FONT_HREFS.map((href) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
      return link;
    });
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    return () => {
      document.title = previousTitle;
      added.forEach((link) => link.remove());
      robots.remove();
    };
  }, []);

  useEffect(() => {
    const onResize = () => setScale(stageScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // The controls show for a few seconds on load so the full-screen button can
  // be found, then leave with the cursor.
  useEffect(() => {
    idleTimer.current = setTimeout(() => setAwake(false), 5000);
    return () => clearTimeout(idleTimer.current);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "ArrowRight") {
        actions.current?.skip(1);
      } else if (e.key === "ArrowLeft") {
        actions.current?.skip(-1);
      } else if (e.key === " ") {
        e.preventDefault();
        actions.current?.togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Keep the monitor awake. The lock is dropped whenever the tab is hidden, so
  // it is re-requested each time it comes back — and never twice at once, or
  // the second sentinel would outlive the page.
  useEffect(() => {
    if (params.shot || !("wakeLock" in navigator)) return undefined;
    let alive = true;
    let lock = null;
    let pending = false;
    const acquire = async () => {
      if (!alive || lock || pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (!alive) {
          next.release();
          return;
        }
        lock = next;
        next.addEventListener("release", () => {
          if (lock === next) lock = null;
        });
      } catch {
        // Denied (battery saver, or no permission). The OS sleep setting wins.
      } finally {
        pending = false;
      }
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", acquire);
      lock?.release();
    };
  }, [params.shot]);

  useEffect(() => {
    const loadedAt = Date.now();
    let checking = false;
    const check = async () => {
      if (checking || Date.now() - loadedAt <= RELOAD_AFTER_MS) return;
      if (document.visibilityState !== "visible" || isFullscreen()) return;
      checking = true;
      try {
        await reloadIfReachable();
      } finally {
        checking = false;
      }
    };
    const id = setInterval(check, 10 * 60 * 1000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  // What the headless screenshot harness reads. Only in ?shot=1.
  useEffect(() => {
    if (!params.shot) return;
    window.__whip = {
      ready: board.lastSuccess != null,
      page: slot.page,
      index: slot.index,
      slots: list.map((s) => `${s.page}${s.page === "FANTASY" ? `#${s.index + 1}` : ""}:${s.seconds}s`),
      lastError: board.lastError,
      data: {
        live: board.slate.live.length,
        upcoming: board.slate.upcoming.length,
        final: board.slate.final.length,
        weather: Boolean(board.slate.weather),
        standings: Boolean(board.slate.standings),
        nflStandings: Boolean(board.slate.nflStandings),
        cfb: board.cfb ? { inSeason: board.cfb.inSeason, teams: board.cfb.teams.length } : null,
        boards: board.scoreboards.boards.map((b) => `${b.key}:${b.relevance}`),
        tropicsActive: board.tropics.active,
        tracksAny: board.tracks.any,
        radar: Boolean(board.radar),
        matchups: board.fantasy.matchups.length,
        survivor: board.fantasy.survivor.length,
      },
    };
  });

  const detail = pinned
    ? "pinned by ?page="
    : paused
      ? `${pos.index + 1} of ${list.length} · paused`
      : `${pos.index + 1} of ${list.length} · ${Math.max(0, slot.seconds - pos.into)}s left`;

  return (
    <div
      onMouseMove={poke}
      onDoubleClick={() => toggleFullscreen()}
      style={{
        position: "fixed",
        inset: 0,
        background: T.bg,
        overflow: "hidden",
        // Hidden with the controls, even with the pointer resting on them — an
        // arrow parked on a wall board reads as a computer someone walked away
        // from.
        cursor: awake ? "default" : "none",
        // A double-click toggles full screen; without this it also selects the
        // word under the pointer, and a highlight in the strip survives the
        // whole rotation.
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <div
        data-whip-stage=""
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: STAGE_W,
          height: STAGE_H,
          marginLeft: -STAGE_W / 2,
          marginTop: -STAGE_H / 2,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <Stage board={board} slot={slot} />
      </div>
      {!params.shot && (
        <Controls
          visible={awake}
          label={titleOf(slot)}
          detail={detail}
          canSkip={canSkip}
          paused={paused != null}
          onPrev={() => skip(-1)}
          onNext={() => skip(1)}
          onTogglePause={togglePause}
        />
      )}
    </div>
  );
}

export default function WhipAroundPage() {
  return (
    <PageBoundary>
      <WhipAround />
    </PageBoundary>
  );
}
