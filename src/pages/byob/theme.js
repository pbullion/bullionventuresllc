/* Palette and the one injected stylesheet shared by the two /byob pages.
 *
 * Same dark shell and gold accent as the rest of the site (see Home.jsx) so the
 * page belongs here. The one colour that carries meaning is the policy key —
 * mint for a place that charges nothing, gold for a corkage fee, grey for a
 * policy nobody has confirmed — which is why it is defined once, in data.js's
 * POLICY map, and only referenced from here.
 *
 * Everything an inline style object can express stays inline, per repo
 * convention; this file holds only what it can't — hover, focus, transitions,
 * keyframes, line clamping, media queries, and the Leaflet class overrides that
 * drag its default white popups into the dark.
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

export const BYOB_CSS = `
.byob a { text-decoration: none; color: inherit; }
.byob *, .byob *::before, .byob *::after { box-sizing: border-box; }

.byob-hero-title { font-size: clamp(30px, 5.2vw, 52px); }
.byob-hero-sub { font-size: clamp(14px, 1.5vw, 17px); }

/* Cards ------------------------------------------------------------------ */
.byob-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 14px;
}
.byob-card {
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
.byob-card:hover {
  transform: translateY(-2px);
  background: ${C.surfaceHi};
  border-color: rgba(224, 178, 76, .45);
  box-shadow: 0 12px 28px -14px rgba(0, 0, 0, .8);
}
.byob-card:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
.byob-card:hover .byob-name { color: ${C.goldBright}; }
.byob-name { transition: color .16s ease; }

/* Two lines of policy note, so every card in a row is the same height. */
.byob-clamp2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Controls --------------------------------------------------------------- */
.byob-chip {
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
.byob-chip:hover { border-color: ${C.borderHi}; color: ${C.text}; }
.byob-chip:active { transform: scale(.96); }
.byob-chip[aria-pressed="true"] {
  background: rgba(224, 178, 76, .14);
  border-color: ${C.gold};
  color: ${C.goldBright};
}
.byob-chip:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }

.byob-input, .byob-select {
  background: ${C.surface};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 11px 13px;
  /* 15px is not a typo but it is a floor: iOS zooms the whole page on focus for
     anything under 16px, and the search box is the one field here that gets
     focused on a phone — see the 16px override in the input's own styles. */
  font-size: 15px;
  font-family: inherit;
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
}
.byob-select { padding-right: 34px; cursor: pointer; }
.byob-input:focus, .byob-select:focus {
  outline: none;
  border-color: ${C.gold};
  box-shadow: 0 0 0 3px rgba(224, 178, 76, .14);
}
.byob-input::placeholder { color: ${C.muted}; }

/* On a phone the List/Map toggle beside the search box squeezes the field down
   far enough to truncate the placeholder mid-word. Give the search the whole
   row and drop the toggle beneath it as a two-up segmented control. */
.byob-searchrow { display: flex; gap: 9px; align-items: center; }
.byob-searchbox { position: relative; flex: 1; }
.byob-viewtoggle { flex-shrink: 0; }
@media (max-width: 520px) {
  .byob-searchrow { flex-wrap: wrap; }
  .byob-searchbox { flex: 1 1 100%; }
  .byob-viewtoggle { flex: 1 1 100%; }
  .byob-viewtoggle button { flex: 1; }
}

/* The dropdowns + the Near me / Surprise me chips. Sizing lives here, not
   inline, because the mobile rule has to be able to override it — an inline
   width wins over any stylesheet. */
.byob-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 10px; }
.byob-filters .byob-select { width: auto; max-width: 210px; font-size: 13px; padding: 8px 30px 8px 12px; }
.byob-count { margin-left: auto; font-size: 13px; font-weight: 600; }
@media (max-width: 520px) {
  /* A select is as wide as its longest option, and "The Woodlands, Spring &
     Tomball" is very long. Half-width puts every dropdown on the same
     two-column grid so the rows line up. flex-grow 0 on purpose: growing to
     fill the leftover space makes each select the width of "whatever the chip
     beside it isn't", which is a different edge on every row. */
  .byob-filters .byob-select { flex: 0 1 calc(50% - 4px); min-width: 0; max-width: none; }
}

/* Star toggle sits over the card link, so it needs its own stacking context. */
.byob-star {
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
.byob-star:hover { transform: scale(1.18); color: ${C.gold}; }
.byob-star[aria-pressed="true"] { color: ${C.gold}; }
.byob-star:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }

/* Sticky filter bar ------------------------------------------------------ */
.byob-sticky {
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
.byob-scroller {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 2px;
}
.byob-scroller::-webkit-scrollbar { display: none; }
/* Below the wrap breakpoint the row always ends on a chip sliced in half at the
   screen edge, which reads as a rendering bug rather than as "swipe for more".
   Fading the last few pixels says the same thing on purpose. */
@media (max-width: 699px) {
  .byob-scroller {
    -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 24px), transparent);
    mask-image: linear-gradient(90deg, #000 calc(100% - 24px), transparent);
  }
}
@media (min-width: 700px) {
  .byob-scroller { flex-wrap: wrap; overflow-x: visible; row-gap: 8px; }
}

/* Phone / directions / website on the detail page. */
.byob-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 6px; }
@media (max-width: 520px) {
  /* Links of four different widths wrap into ragged rows each ending somewhere
     different. A two-column grid lines them up and every button gets a bigger
     thumb target. The first one — the phone number — spans the row, because on
     this page in particular calling ahead is the thing people came to do. */
  .byob-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .byob-actions > * { text-align: center; }
  .byob-actions > :first-child { grid-column: 1 / -1; }
}

.byob-mark { background: rgba(224, 178, 76, .22); color: ${C.goldBright}; border-radius: 3px; }

/* Leaflet, dragged into the dark ---------------------------------------- */
.byob-map { background: ${C.bg}; border-radius: 14px; }
/* Esri's dark canvas is a mid-grey, so it needs pulling DOWN to sit against
   this page rather than lifting. Retune this number, not the tile URL, if the
   basemap ever looks wrong against the page. */
.byob-map .leaflet-tile-pane { filter: saturate(.9) brightness(.62) contrast(1.15); }
.byob-map .leaflet-container { font-family: inherit; }
.byob-map .leaflet-bar a {
  background: ${C.surfaceHi};
  color: ${C.text};
  border-bottom-color: ${C.border};
}
.byob-map .leaflet-bar a:hover { background: ${C.border}; }
.byob-map .leaflet-control-attribution {
  background: rgba(10, 10, 13, .78);
  color: ${C.muted};
}
.byob-map .leaflet-control-attribution a { color: ${C.dim}; }

/* A pin the eye can find: filled dot, dark ring so it reads on any tile. */
.byob-pin {
  border-radius: 50%;
  border: 2px solid rgba(10, 10, 13, .85);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .22);
  transition: transform .12s ease;
}
.byob-pin-fave { box-shadow: 0 0 0 2px ${C.gold}, 0 0 12px rgba(224, 178, 76, .7); }

@keyframes byob-spin { to { transform: rotate(360deg); } }
.byob-spinner {
  width: 26px;
  height: 26px;
  border: 3px solid ${C.border};
  border-top-color: ${C.gold};
  border-radius: 50%;
  animation: byob-spin .8s linear infinite;
}

@keyframes byob-in { from { opacity: 0; transform: translateY(6px); } }
.byob-in { animation: byob-in .22s ease both; }

@media (prefers-reduced-motion: reduce) {
  .byob *, .byob *::before { animation-duration: .01ms !important; transition: none !important; }
  .byob-card:hover { transform: none; }
}
`;
