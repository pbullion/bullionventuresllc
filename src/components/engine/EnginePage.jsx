import { C } from "./theme.js";

/* The page shell all five betting screens sit in.
 *
 * They had three different paddings, three different column widths and two
 * different ways of centering. Two of them (/weather-value, /gas-value) set an
 * inline `maxWidth: 1100` on `.bv-shell`, which silently defeated the rail
 * breakpoint: above 1200px the shell wants `--bv-main-w + 340`, so a 1100px cap
 * squeezed a 960px column and a 320px rail into 1100 and both lost.
 *
 * `mainWidth` feeds `--bv-main-w` — set it to whatever column width the page
 * needs and the rail arithmetic in index.css follows. Don't cap the shell.
 */
export default function EnginePage({
  mainWidth = "960px",
  css,
  rail,
  safeArea = true,
  children,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        /* Notch and home-indicator insets, on by default (2026-08-31). These
         * pages are read on a phone more than anywhere else, and without the
         * insets the header sits under the notch in landscape and the last row
         * of the deepest table sits under the home indicator. /engine-limits
         * had them hand-written from the start; the rest inherited a flat
         * 16/12/40 and were the odd ones out. `max()` and `calc()` mean a
         * device with no insets — every desktop browser — gets exactly the
         * padding it had before, so this is a no-op off a phone. */
        padding: safeArea
          ? "max(16px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) calc(40px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))"
          : "16px 12px 40px",
        WebkitTextSizeAdjust: "100%",
        /* App.jsx wraps every route in a column flex container, so this div is
         * a flex item — and a flex item's `min-width: auto` refuses to shrink
         * below min-content. The wide tables inside made that ~600px, so on a
         * phone the whole PAGE scrolled sideways (header and Kill button off
         * screen) instead of each table scrolling inside its own
         * `overflowX: auto` wrapper. Pinning the width makes it shrink. */
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {css ? <style>{css}</style> : null}
      <div className="bv-shell" style={{ "--bv-main-w": mainWidth }}>
        <div className="bv-main">{children}</div>
        {/* OpenBetsRail renders its own <aside className="bv-rail">, so the
            rail is a sibling of .bv-main and is NOT wrapped again here — a
            second bv-rail would take the flex slot and leave the real one
            stacked underneath it on desktop. */}
        {rail}
      </div>
    </div>
  );
}
