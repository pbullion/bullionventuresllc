/* Palette and the one injected stylesheet for /kids-eat-free.
 *
 * Same dark shell and gold accent as the rest of the site (see /byob's
 * theme.js, which this is copied from) so the page belongs here. The one
 * colour that carries meaning is TODAY — a deal available today gets the mint
 * highlight, everything else stays neutral gold/grey, matching the "confirmed
 * vs call ahead" key from /byob's POLICY map.
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

export const KEF_CSS = `
.kef a { text-decoration: none; color: inherit; }
.kef *, .kef *::before, .kef *::after { box-sizing: border-box; }

.kef-hero-title { font-size: clamp(30px, 5.2vw, 52px); }
.kef-hero-sub { font-size: clamp(14px, 1.5vw, 17px); }

/* Day strip --------------------------------------------------------------- */
.kef-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.kef-day {
  border-radius: 10px;
  border: 1px solid ${C.border};
  background: ${C.surface};
  color: ${C.dim};
  padding: 9px 4px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  transition: background-color .14s ease, border-color .14s ease, color .14s ease;
}
.kef-day:hover { border-color: ${C.borderHi}; color: ${C.text}; }
.kef-day[aria-pressed="true"] {
  background: rgba(94, 234, 212, .16);
  border-color: ${C.mint};
  color: ${C.mint};
}
.kef-day-today { position: relative; }
.kef-day-today::after {
  content: "";
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${C.gold};
}
.kef-day[aria-pressed="true"].kef-day-today::after { background: #1a1405; }

/* Cards -------------------------------------------------------------------- */
.kef-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 14px;
}
.kef-card {
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
.kef-card:hover {
  transform: translateY(-2px);
  background: ${C.surfaceHi};
  border-color: rgba(224, 178, 76, .45);
  box-shadow: 0 12px 28px -14px rgba(0, 0, 0, .8);
}
.kef-card-today { border-color: rgba(94, 234, 212, .5); }
.kef-name { transition: color .16s ease; }
.kef-card:hover .kef-name { color: ${C.goldBright}; }

.kef-clamp2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Controls ------------------------------------------------------------------ */
.kef-chip {
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
.kef-chip:hover { border-color: ${C.borderHi}; color: ${C.text}; }
.kef-chip:active { transform: scale(.96); }
.kef-chip[aria-pressed="true"] {
  background: rgba(224, 178, 76, .14);
  border-color: ${C.gold};
  color: ${C.goldBright};
}
.kef-chip:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }

.kef-input, .kef-select {
  background: ${C.surface};
  border: 1px solid ${C.border};
  color: ${C.text};
  border-radius: 10px;
  padding: 11px 13px;
  font-size: 15px;
  font-family: inherit;
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
}
.kef-select { padding-right: 34px; cursor: pointer; }
.kef-input:focus, .kef-select:focus {
  outline: none;
  border-color: ${C.gold};
  box-shadow: 0 0 0 3px rgba(224, 178, 76, .14);
}
.kef-input::placeholder { color: ${C.muted}; }

.kef-searchrow { display: flex; gap: 9px; align-items: center; }
.kef-searchbox { position: relative; flex: 1; }
.kef-viewtoggle { flex-shrink: 0; }
@media (max-width: 520px) {
  .kef-searchrow { flex-wrap: wrap; }
  .kef-searchbox { flex: 1 1 100%; }
  .kef-viewtoggle { flex: 1 1 100%; }
  .kef-viewtoggle button { flex: 1; }
}

.kef-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 10px; }
.kef-filters .kef-select { width: auto; max-width: 210px; font-size: 13px; padding: 8px 30px 8px 12px; }
.kef-count { margin-left: auto; font-size: 13px; font-weight: 600; }
@media (max-width: 520px) {
  .kef-filters .kef-select { flex: 0 1 calc(50% - 4px); min-width: 0; max-width: none; }
}

.kef-sticky {
  position: sticky;
  top: 0;
  z-index: 400;
  background: rgba(10, 10, 13, .92);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid ${C.border};
}

@keyframes kef-spin { to { transform: rotate(360deg); } }
.kef-spinner {
  width: 26px;
  height: 26px;
  border: 3px solid ${C.border};
  border-top-color: ${C.gold};
  border-radius: 50%;
  animation: kef-spin .8s linear infinite;
}

@keyframes kef-in { from { opacity: 0; transform: translateY(6px); } }
.kef-in { animation: kef-in .22s ease both; }

/* Leaflet, dragged into the dark — identical treatment to /byob. */
.kef-map { background: ${C.bg}; border-radius: 14px; }
.kef-map .leaflet-tile-pane { filter: saturate(.9) brightness(.62) contrast(1.15); }
.kef-map .leaflet-container { font-family: inherit; }
.kef-map .leaflet-bar a {
  background: ${C.surfaceHi};
  color: ${C.text};
  border-bottom-color: ${C.border};
}
.kef-map .leaflet-bar a:hover { background: ${C.border}; }
.kef-map .leaflet-control-attribution {
  background: rgba(10, 10, 13, .78);
  color: ${C.muted};
}
.kef-map .leaflet-control-attribution a { color: ${C.dim}; }

.kef-pin {
  border-radius: 50%;
  border: 2px solid rgba(10, 10, 13, .85);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .22);
  transition: transform .12s ease;
}
.kef-pin-today { box-shadow: 0 0 0 2px ${C.mint}, 0 0 12px rgba(94, 234, 212, .7); }

@media (prefers-reduced-motion: reduce) {
  .kef *, .kef *::before { animation-duration: .01ms !important; transition: none !important; }
  .kef-card:hover { transform: none; }
}
`;
