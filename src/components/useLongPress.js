import { useEffect, useRef } from "react";

/* Press-and-hold gesture, shared by the two triggers that open the private-tools
 * modal: the navbar wordmark and the hero badge on the home page. It lived
 * inline in Navbar.jsx until the hero badge needed the identical behaviour —
 * duplicating a timer, a "did it fire" flag and four pointer handlers is how the
 * two drift apart.
 *
 * 550ms: long enough not to fire on a normal tap, short enough not to feel
 * broken. */
export const LONG_PRESS_MS = 550;

export default function useLongPress(onLongPress, ms = LONG_PRESS_MS) {
  const timer = useRef(null);
  // Set when a hold completes, so the click that follows the release can be
  // swallowed by the caller. Without it, long-pressing a link opens the modal
  // and then immediately routes away behind it.
  const fired = useRef(false);
  // The callback is almost always an inline arrow, so it's a new function every
  // render. Reading it through a ref keeps the handlers below stable instead of
  // rebuilding the whole gesture on each render.
  const cb = useRef(onLongPress);
  useEffect(() => {
    cb.current = onLongPress;
  }, [onLongPress]);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => clear, []);

  const start = () => {
    fired.current = false;
    clear();
    timer.current = setTimeout(() => {
      timer.current = null;
      fired.current = true;
      cb.current();
    }, ms);
  };

  return {
    /* True exactly once per completed hold. Call it from the click handler that
     * follows the release to decide whether to preventDefault() that click. */
    consumeFired: () => {
      if (!fired.current) return false;
      fired.current = false;
      return true;
    },
    /* Spread onto the trigger element. onContextMenu is part of the gesture, not
     * decoration: long-pressing on iOS otherwise selects the text and raises the
     * share/copy callout, which sits on top of the modal. */
    handlers: {
      onPointerDown: start,
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu: (e) => e.preventDefault(),
    },
  };
}
