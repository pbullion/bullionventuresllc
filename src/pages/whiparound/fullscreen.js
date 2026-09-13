/* Full screen, for a board meant to live on an external monitor.
 *
 * TWO WAYS IN, AND THEY BEHAVE DIFFERENTLY ACROSS A RELOAD:
 *   - This page's button / F key / double-click uses the Fullscreen API. It
 *     needs a click to start and it ENDS on reload, so index.jsx never reloads
 *     itself while it is on.
 *   - The browser's own full screen (⌃⌘F in Chrome and Safari on a Mac) is
 *     window-level and survives a reload. For a monitor left on the board for
 *     days, that is the sturdier choice.
 *
 * PICKING THE MONITOR: Chromium's Window Management API can put the page full
 * screen on a DIFFERENT display than the one the window is on, so the board
 * can be sent to the wall monitor from the laptop's own screen. It asks for a
 * permission once. Anywhere it is missing, the fallback is the ordinary one:
 * drag the window onto the monitor, then go full screen.
 */

export function isFullscreen() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

export async function enterFullscreen(screen) {
  const el = document.documentElement;
  if (el.requestFullscreen) {
    return el.requestFullscreen(screen ? { navigationUI: "hide", screen } : { navigationUI: "hide" });
  }
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  return undefined;
}

export async function exitFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  return undefined;
}

export async function toggleFullscreen() {
  try {
    if (isFullscreen()) await exitFullscreen();
    else await enterFullscreen();
  } catch {
    // Refused (no user gesture, or an embedded frame). Nothing to recover.
  }
}

/// True only where the monitor picker can work: Chromium, with a second display.
export function canPickScreen() {
  return typeof window.getScreenDetails === "function" && window.screen?.isExtended === true;
}

/// Prompts for the window-management permission the first time.
export async function listScreens() {
  const details = await window.getScreenDetails();
  return { screens: [...details.screens], current: details.currentScreen };
}
