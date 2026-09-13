import { useEffect, useState } from "react";
import {
  canPickScreen,
  enterFullscreen,
  exitFullscreen,
  isFullscreen,
  listScreens,
  toggleFullscreen,
} from "./fullscreen";

/* The only controls on the page, and they are invisible until the mouse moves.
 *
 * The Fire TV board has none at all ("nothing on a television should be a
 * control anyone in the room can reach with a remote"). A browser tab needs
 * one: nothing else can put it full screen. So this sits OUTSIDE the scaled
 * stage, in ordinary screen pixels for a person at a desk, fades out after a
 * couple of seconds without movement, and takes the cursor with it — a wall
 * board with an arrow parked on it reads as a computer someone walked away from.
 *
 * IT FADES EVEN WITH THE POINTER RESTING ON IT. The obvious hover-to-keep-open
 * rule left the panel on the wall indefinitely right after the most common click
 * of all — Full screen — because the pointer is still sitting on that button.
 * Moving the mouse over the panel keeps it up; stopping lets it go.
 *
 * Nothing here changes data. Skip and pause only move the rotation, and a
 * reload forgets both.
 */

const bar = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const button = {
  font: "inherit",
  fontWeight: 600,
  color: "#E8EAED",
  background: "#1C2430",
  border: "1px solid #252C3A",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export default function Controls({
  visible,
  label,
  detail,
  canSkip,
  paused,
  onPrev,
  onNext,
  onTogglePause,
}) {
  const [full, setFull] = useState(isFullscreen);
  const [screens, setScreens] = useState(null);
  const [pickError, setPickError] = useState(null);

  useEffect(() => {
    const onChange = () => setFull(isFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const pick = async () => {
    try {
      setPickError(null);
      setScreens(await listScreens());
    } catch {
      setPickError("Display access was blocked — drag this window onto the monitor instead.");
    }
  };

  const sendTo = async (screen) => {
    try {
      await enterFullscreen(screen);
      setScreens(null);
    } catch {
      setPickError("That display refused full screen. Try the button on the monitor itself.");
    }
  };

  return (
    <div
      onDoubleClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        maxWidth: "calc(100vw - 32px)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        padding: "10px 12px",
        background: "rgba(21, 26, 36, 0.94)",
        border: "1px solid #252C3A",
        borderRadius: 12,
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
        color: "#E8EAED",
        font: "14px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 250ms ease",
      }}
    >
      <div style={bar}>
        <div style={{ textAlign: "right", marginRight: 4 }}>
          <div style={{ fontWeight: 700 }}>{label}</div>
          <div style={{ color: "#8A93A6", fontSize: 12 }}>{detail}</div>
        </div>
        <button type="button" style={button} onClick={onPrev} disabled={!canSkip} title="Previous screen (←)">
          ◀
        </button>
        <button
          type="button"
          style={button}
          onClick={onTogglePause}
          disabled={!canSkip}
          title="Pause the rotation (space)"
        >
          {paused ? "▶ Resume" : "❚❚ Pause"}
        </button>
        <button type="button" style={button} onClick={onNext} disabled={!canSkip} title="Next screen (→)">
          ▶
        </button>
        <button
          type="button"
          style={{ ...button, background: "#1A93CF", borderColor: "#1A93CF" }}
          onClick={() => (full ? exitFullscreen().catch(() => {}) : toggleFullscreen())}
          title="Full screen (F)"
        >
          {full ? "Exit full screen" : "⛶ Full screen"}
        </button>
        {canPickScreen() && !screens && (
          <button type="button" style={button} onClick={pick} title="Send the board to another display">
            Choose display…
          </button>
        )}
      </div>

      {screens && (
        <div style={bar}>
          {screens.screens.map((s, i) => (
            <button key={`${s.label}-${i}`} type="button" style={button} onClick={() => sendTo(s)}>
              {s.label || (s.isPrimary ? "Primary display" : `Display ${i + 1}`)} · {s.width}×{s.height}
              {s === screens.current ? " (this one)" : ""}
            </button>
          ))}
          <button type="button" style={button} onClick={() => setScreens(null)}>
            Cancel
          </button>
        </div>
      )}

      {pickError && <div style={{ color: "#FF5C33", fontSize: 12 }}>{pickError}</div>}

      <div style={{ color: "#8A93A6", fontSize: 12 }}>
        F or double-click: full screen · ← → skip · space: pause · ⌃⌘F keeps full screen across reloads
      </div>
    </div>
  );
}
