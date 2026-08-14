/* Palette and the one injected stylesheet shared by the two HRW pages.
 *
 * Same dark shell and gold accent as the rest of the site (see Home.jsx) so the
 * page belongs here, with the three HRW price points as the only other colours
 * that carry meaning. Everything an inline style object can express stays
 * inline, per repo convention; this file holds only what it can't — hover,
 * focus, transitions, keyframes, line clamping, media queries, and the handful
 * of Leaflet class overrides that drag its default white popups into the dark.
 */
export const C = {
  bg: "#0a0a0d",
  surface: "#14141a",
  surfaceHi: "#1b1b23",
  border: "#24242e",
  borderHi: "#333341",
  text: "#f4f4f7",
  dim: "#b6b6c6",
  muted: "#83839a",
  gold: "#e0b24c",
  goldBright: "#f6d585",
  mint: "#5eead4",
  rose: "#fb7185",
};

export const HRW_CSS = `
.hrw a { text-decoration: none; color: inherit; }
.hrw *, .hrw *::before, .hrw *::after { box-sizing: border-box; }

.hrw-hero-title { font-size: clamp(30px, 5.2vw, 52px); }
.hrw-hero-sub { font-size: clamp(14px, 1.5vw, 17px); }

/* Cards ------------------------------------------------------------------ */
.hrw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 14px;
}
.hrw-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  background: ${C.surface};
  border: 1px solid ${C.border};
  border-radius: 14px;
  padding: 16px 16px 14px;
  transition: transform .16s ease, border-color .16s ease,
              background-color .16s ease, box-shadow .16s ease;
}
.hrw-card:hover {
  transform: translateY(-2px);
  background: ${C.surfaceHi};
  border-color: rgba(224, 178, 76, .45);
  box-shadow: 0 12px 28px -14px rgba(0, 0, 0, .8);
}
.hrw-card:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
.hrw-card:hover .hrw-name { color: ${C.goldBright}; }
.hrw-name { transition: color .16s ease; }

/* Two lines of cuisine list, so every card in a row is the same height. */
.hrw-clamp2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Controls --------------------------------------------------------------- */
.hrw-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid ${C.border};
  background: ${C.surface};
  color: ${C.dim};
  padding: 7px 13px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color .14s ease, border-color .14s ease,
              color .14s ease, transform .14s ease;
}
.hrw-chip:hover { border-color: ${C.borderHi}; color: ${C.text}; }
.hrw-chip:active { transform: scale(.96); }
.hrw-chip[aria-pressed="true"] {
  background: rgba(224, 178, 76, .14);
  border-color: ${C.gold};
  color: ${C.goldBright};
}
.hrw-chip:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }

.hrw-input, .hrw-select {
  background: ${C.surface};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 11px 13px;
  font-size: 15px;
  font-family: inherit;
  width: 100%;
  /* iOS zooms the whole page on focus for anything under 16px. */
  -webkit-appearance: none;
  appearance: none;
}
.hrw-select { padding-right: 34px; cursor: pointer; }
.hrw-input:focus, .hrw-select:focus {
  outline: none;
  border-color: ${C.gold};
  box-shadow: 0 0 0 3px rgba(224, 178, 76, .14);
}
.hrw-input::placeholder { color: ${C.muted}; }

/* On a phone the List/Map toggle beside the search box squeezed the field down
   to about 180px, which truncated the placeholder mid-word. Give the search the
   whole row and drop the toggle beneath it. */
.hrw-searchrow { display: flex; gap: 9px; align-items: center; }
.hrw-searchbox { position: relative; flex: 1; }
.hrw-viewtoggle { flex-shrink: 0; }
@media (max-width: 520px) {
  .hrw-searchrow { flex-wrap: wrap; }
  .hrw-searchbox { flex: 1 1 100%; }
  /* Full width rather than shoved right. Dropped to its own row it read as a
     leftover — as a two-up segmented control it reads as a choice. */
  .hrw-viewtoggle { flex: 1 1 100%; }
  .hrw-viewtoggle button { flex: 1; }
}

/* The three dropdowns + the Near me / Surprise me chips.
   Sizing lives here, not inline, because the mobile rule has to be able to
   override it — an inline width wins over any stylesheet. */
.hrw-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 10px; }
.hrw-filters .hrw-select { width: auto; max-width: 200px; font-size: 13px; padding: 8px 30px 8px 12px; }
.hrw-count { margin-left: auto; font-size: 13px; font-weight: 600; }
@media (max-width: 520px) {
  /* A select is as wide as its longest option, so neighbourhood and cuisine
     were ~200px each: 8px too wide to share a 375px row, which left the first
     one sitting alone next to a hole. Halving them pairs them up. */
  /* All three, including the short sort one: half-width puts every dropdown on
     the same two-column grid, so the rows line up instead of each one being as
     wide as whatever its longest option happens to be. */
  /* flex-grow 0 on purpose: growing to fill the leftover space made the sort
     select the width of "whatever the chip beside it isn't", which is a
     different edge on every row. */
  .hrw-filters .hrw-select { flex: 0 1 calc(50% - 4px); min-width: 0; max-width: none; }
}

/* Star toggle sits over the card link, so it needs its own stacking context. */
.hrw-star {
  position: relative;
  z-index: 2;
  background: none;
  border: 0;
  padding: 2px;
  margin: -2px;
  font-size: 19px;
  line-height: 1;
  cursor: pointer;
  color: ${C.muted};
  transition: transform .14s ease, color .14s ease;
}
.hrw-star:hover { transform: scale(1.18); color: ${C.gold}; }
.hrw-star[aria-pressed="true"] { color: ${C.gold}; }
.hrw-star:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }

/* Reviews ---------------------------------------------------------------- */
/* The star picker. Bigger than the favourite star and with a real hit area —
   it's the primary control of the review form and it gets used with a thumb. */
.hrw-rate {
  background: none;
  border: 0;
  padding: 2px 3px;
  font-size: 27px;
  line-height: 1;
  cursor: pointer;
  color: ${C.muted};
  transition: transform .12s ease, color .12s ease;
}
.hrw-rate:hover { transform: scale(1.12); color: ${C.gold}; }
.hrw-rate[data-on] { color: ${C.gold}; }
.hrw-rate:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }

/* Sticky filter bar ------------------------------------------------------ */
.hrw-sticky {
  position: sticky;
  top: 0;
  z-index: 400; /* above Leaflet's panes (400) but below its popups (700) */
  background: rgba(10, 10, 13, .92);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid ${C.border};
}

/* Chip rows scroll sideways on a phone, where there is no room to wrap and a
   swipe is natural. On anything wider they wrap, because a hidden chip on a
   desktop just looks like a missing filter. */
.hrw-scroller {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 2px;
}
.hrw-scroller::-webkit-scrollbar { display: none; }
/* Below the wrap breakpoint the row always ends on a chip sliced in half at the
   screen edge, which reads as a rendering bug rather than as "swipe for more".
   Fading the last few pixels says the same thing on purpose. */
@media (max-width: 699px) {
  .hrw-scroller {
    -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 24px), transparent);
    mask-image: linear-gradient(90deg, #000 calc(100% - 24px), transparent);
  }
}
@media (min-width: 700px) {
  .hrw-scroller { flex-wrap: wrap; overflow-x: visible; row-gap: 8px; }
}

/* Book / phone / directions / website / Instagram / HRW page. */
.hrw-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 6px; }
@media (max-width: 520px) {
  /* Six links of six different widths wrapped into three ragged rows, each
     ending somewhere different. A two-column grid lines them up, and every
     button gets a bigger thumb target out of it. The first one — the booking
     link, or the phone number when there's nothing to book — spans the row,
     because it's the one people came for. */
  .hrw-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .hrw-actions > * { text-align: center; }
  .hrw-actions > :first-child { grid-column: 1 / -1; }
}

/* The hero's date pill. "… 2026 · Aug 1 – Sep 7" broke after the separator on a
   phone, leaving the dot dangling at the end of the first line; the date itself
   must never break mid-range. */
.hrw-pill { display: inline-flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 7px; }
.hrw-pill-dates { white-space: nowrap; }
@media (max-width: 520px) {
  .hrw-pill-sep { display: none; }
}

/* Menus ------------------------------------------------------------------ */
.hrw-dish { padding: 11px 0; border-top: 1px solid ${C.border}; }
.hrw-dish:first-child { border-top: 0; }

.hrw-mark { background: rgba(224, 178, 76, .22); color: ${C.goldBright}; border-radius: 3px; }

/* Leaflet, dragged into the dark ---------------------------------------- */
.hrw-map { background: ${C.bg}; border-radius: 14px; }
/* CARTO's dark basemap is tuned for maps that fill a white page; dropped into a
   near-black panel its street labels all but vanish, so lift it a little. */
.hrw-map .leaflet-tile-pane { filter: saturate(.9) brightness(1.35) contrast(1.05); }
.hrw-map .leaflet-popup-content-wrapper,
.hrw-map .leaflet-popup-tip {
  background: ${C.surfaceHi};
  color: ${C.text};
  border: 1px solid ${C.borderHi};
  box-shadow: 0 14px 34px -14px rgba(0, 0, 0, .9);
}
.hrw-map .leaflet-popup-content-wrapper { border-radius: 12px; }
.hrw-map .leaflet-popup-content { margin: 12px 14px; font-family: inherit; }
.hrw-map .leaflet-popup-close-button { color: ${C.muted}; }
.hrw-map .leaflet-popup-close-button:hover { color: ${C.text}; }
.hrw-map .leaflet-container { font-family: inherit; }
.hrw-map .leaflet-bar a {
  background: ${C.surfaceHi};
  color: ${C.text};
  border-bottom-color: ${C.border};
}
.hrw-map .leaflet-bar a:hover { background: ${C.border}; }
.hrw-map .leaflet-control-attribution {
  background: rgba(10, 10, 13, .78);
  color: ${C.muted};
}
.hrw-map .leaflet-control-attribution a { color: ${C.dim}; }

/* A pin the eye can find: filled dot, dark ring so it reads on any tile. */
.hrw-pin {
  border-radius: 50%;
  border: 2px solid rgba(10, 10, 13, .85);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .22);
  transition: transform .12s ease;
}
.hrw-pin-fave { box-shadow: 0 0 0 2px ${C.gold}, 0 0 12px rgba(224, 178, 76, .7); }

@keyframes hrw-spin { to { transform: rotate(360deg); } }
.hrw-spinner {
  width: 26px;
  height: 26px;
  border: 3px solid ${C.border};
  border-top-color: ${C.gold};
  border-radius: 50%;
  animation: hrw-spin .8s linear infinite;
}

/* The "happening now" dot. Slow enough to read as a pulse rather than a blink. */
@keyframes hrw-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(94, 234, 212, .55); }
  70% { box-shadow: 0 0 0 7px rgba(94, 234, 212, 0); }
}
.hrw-live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${C.mint};
  display: inline-block;
  flex-shrink: 0;
  animation: hrw-pulse 2s ease-out infinite;
}

@keyframes hrw-in { from { opacity: 0; transform: translateY(6px); } }
.hrw-in { animation: hrw-in .22s ease both; }

@media (prefers-reduced-motion: reduce) {
  .hrw *, .hrw *::before { animation-duration: .01ms !important; transition: none !important; }
  .hrw-card:hover { transform: none; }
}
`;
