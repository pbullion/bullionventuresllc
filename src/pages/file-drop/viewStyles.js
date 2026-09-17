/* File Drop — the look of /file-drop/view, built on `C` from styles.js.
 *
 * One string for the whole viewer, including the lazy renderers' classes, so
 * View.jsx renders a single <style> and a renderer chunk carries no CSS of its
 * own. Class names are `fd-v*` (the viewer) plus `fd-sheet*`, `fd-mail*`,
 * `fd-docx*` and `fd-zip*` (the renderers).
 *
 * Rules that are load-bearing:
 *  - The page is a flex column; `.fd-view.fixed` pins it to the viewport so a
 *    PDF, photo or video fills the space under the bar instead of the page
 *    growing. Long documents (text, email, spreadsheet, Word) keep the normal
 *    page scroll so a phone's browser chrome still collapses.
 *  - `color-scheme: light`: index.css declares the site dark, which would
 *    otherwise paint native controls, scrollbars and an iframe's own canvas
 *    dark inside these warm, light panels.
 *  - Everything wraps at 360px; tap targets are ≥ 40px; nothing is wider than
 *    the screen — the table, the Word pages and the code-ish blocks scroll
 *    inside their own box. */

import { C } from "./styles.js";

export const VIEW_CSS = `
.fd-view {
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 100vh;
  min-height: 100dvh;
  color-scheme: light;
}
.fd-view.fixed {
  height: 100vh;
  height: 100dvh;
  /* .fd-page is a flex item of App.jsx's column, and a flex item's own height
   * never decides its main size — so without a max-height the media pane grows
   * to the container's 100vh (the URL-bar-less height on a phone) and
   * overflow: hidden eats the bottom of it. max-height DOES clamp. */
  max-height: 100vh;
  max-height: 100dvh;
  min-height: 0;
  overflow: hidden;
}
.fd-vgutter { padding-left: max(16px, env(safe-area-inset-left)); padding-right: max(16px, env(safe-area-inset-right)); }

/* ---- top bar ---- */
.fd-vbar {
  position: sticky;
  top: 0;
  z-index: 6;
  background: ${C.bg};
  border-bottom: 1px solid ${C.border};
  padding-top: max(8px, env(safe-area-inset-top));
  padding-bottom: 10px;
}
.fd-vbar-in {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  align-items: flex-end;
  min-width: 0;
}
.fd-vhead { flex: 1 1 260px; min-width: 0; }
.fd-vback {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  color: ${C.accent};
  font-size: 14px;
  font-weight: 650;
  text-decoration: none;
}
.fd-vback:hover { text-decoration: underline; }
.fd-vtitle {
  margin: 0;
  font-size: 19px;
  line-height: 1.25;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}
.fd-vmeta { margin: 3px 0 0; font-size: 13px; color: ${C.muted}; overflow-wrap: anywhere; }
.fd-vactions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.fd-vpos { font-size: 13px; color: ${C.muted}; white-space: nowrap; }
.fd-view .fd-btn.small { min-height: 40px; padding: 8px 12px; }
.fd-view a:focus-visible, .fd-view button:focus-visible, .fd-view select:focus-visible,
.fd-view input:focus-visible, .fd-view [tabindex]:focus-visible {
  outline: 2px solid ${C.gold};
  outline-offset: 2px;
}

/* ---- body ---- */
.fd-vbody { flex: 1 1 auto; min-width: 0; padding-top: 16px; padding-bottom: calc(28px + env(safe-area-inset-bottom)); }
.fd-view.fixed .fd-vbody {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px max(10px, env(safe-area-inset-left)) calc(10px + env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-right));
}
.fd-vwrap { max-width: 1280px; margin: 0 auto; width: 100%; min-width: 0; }
.fd-vnote { flex-basis: 100%; margin: 0 0 2px; }
.fd-vcenter { display: flex; align-items: center; justify-content: center; flex: 1 1 auto; min-height: 0; }
.fd-vcenter .fd-card { max-width: 520px; width: 100%; margin: 0; }
.fd-vcard-title { margin: 0 0 8px; font-size: 17px; }

/* ---- native previews ---- */
.fd-vframe {
  flex: 1 1 auto;
  width: 100%;
  /* A floor, but never taller than the space there is: inside the hidden
   * column of .fd-view.fixed a flat 55vh could not shrink, and landscape
   * clipped the bottom of the page away. */
  min-height: min(55vh, 100%);
  border: 1px solid ${C.border};
  border-radius: 12px;
  background: #fff;
  display: block;
}
.fd-vimg { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; }
.fd-vimg.actual { display: block; overflow: auto; -webkit-overflow-scrolling: touch; }
.fd-vimg-btn {
  appearance: none;
  background: none;
  border: 0;
  padding: 0;
  margin: 0;
  cursor: zoom-in;
  display: block;
  max-width: 100%;
  max-height: 100%;
  line-height: 0;
}
.fd-vimg-btn img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
.fd-vimg.actual .fd-vimg-btn { cursor: zoom-out; max-width: none; max-height: none; }
.fd-vimg.actual .fd-vimg-btn img { max-width: none; max-height: none; object-fit: none; }
.fd-vmedia { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; }
.fd-vmedia video { max-width: 100%; max-height: 100%; background: #000; border-radius: 10px; }
.fd-vmedia audio { width: min(100%, 520px); }
.fd-vtext {
  margin: 0;
  font-family: ${C.mono};
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #fff;
  border: 1px solid ${C.border};
  border-radius: 12px;
  padding: 14px;
}
.fd-vhint { font-size: 13px; color: ${C.muted}; margin: 0 0 8px; }

/* ---- spreadsheets ---- */
.fd-sheet-tabs { display: flex; gap: 6px; overflow-x: auto; padding: 0 0 6px; margin: 0 0 8px; }
.fd-sheet-box {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  max-height: 72vh;
  border: 1px solid ${C.border};
  border-radius: 12px;
  background: #fff;
}
.fd-sheet { border-collapse: separate; border-spacing: 0; font-size: 13px; font-variant-numeric: tabular-nums; }
.fd-sheet th, .fd-sheet td {
  border-right: 1px solid #efe9dd;
  border-bottom: 1px solid #efe9dd;
  padding: 5px 8px;
  text-align: left;
  vertical-align: top;
  white-space: pre;
  max-width: 26em;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fd-sheet thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f3eee4;
  color: ${C.muted};
  font-weight: 650;
  text-align: center;
}
.fd-sheet tbody th {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #f8f4ec;
  color: ${C.faint};
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
}
.fd-sheet thead th:first-child { left: 0; z-index: 3; }

/* ---- email ---- */
.fd-mail-subject { margin: 0 0 10px; font-size: 20px; line-height: 1.3; overflow-wrap: anywhere; }
.fd-mail-meta { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 12px; margin: 0 0 14px; font-size: 14px; }
.fd-mail-meta dt { color: ${C.muted}; }
.fd-mail-meta dd { margin: 0; overflow-wrap: anywhere; }
.fd-mail-frame {
  width: 100%;
  height: 70vh;
  min-height: 320px;
  border: 1px solid ${C.border};
  border-radius: 12px;
  background: #fff;
  display: block;
}
.fd-mail-text {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #fff;
  border: 1px solid ${C.border};
  border-radius: 12px;
  padding: 14px;
}

/* ---- Word ---- */
.fd-docx { background: #ebe6db; border: 1px solid ${C.border}; border-radius: 12px; overflow: hidden; }
.fd-docx-fit { overflow: hidden; }
.fd-docx-fit.actual { overflow: auto; -webkit-overflow-scrolling: touch; }
.fd-docx-inner { width: max-content; min-width: 100%; transform-origin: 0 0; }
.fd-docx .docx-wrapper { background: transparent; padding: 14px 14px 0; }
.fd-docx .docx-wrapper > section.docx { box-shadow: 0 1px 8px rgba(31, 35, 40, 0.18); margin-bottom: 14px; }
.fd-docx iframe { max-width: 100%; }

/* ---- zip ---- */
.fd-zip-folder { margin: 14px 0 4px; font-size: 13px; font-weight: 650; color: ${C.muted}; overflow-wrap: anywhere; }
.fd-zip-folder:first-child { margin-top: 0; }

/* ---- rows shared by the attachment and zip lists ---- */
.fd-vlist { list-style: none; margin: 0; padding: 0; }
.fd-vrow {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  border-top: 1px solid #f0ebe1;
  min-width: 0;
}
.fd-vrow:first-child { border-top: 0; }
.fd-vrow-name { flex: 1 1 200px; min-width: 0; overflow-wrap: anywhere; font-size: 14px; }
.fd-vrow-size { font-size: 12.5px; color: ${C.muted}; white-space: nowrap; }
.fd-vrow-acts { display: flex; gap: 6px; flex-wrap: wrap; }
.fd-vrow-err { flex-basis: 100%; font-size: 12.5px; color: ${C.danger}; }

/* ---- toggles (view mode, sheet tabs) ---- */
.fd-vtoggle {
  appearance: none;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid ${C.border};
  border-radius: 9px;
  background: #fff;
  color: ${C.muted};
  cursor: pointer;
  white-space: nowrap;
}
.fd-vtoggle[aria-pressed="true"] { background: ${C.accentSoft}; border-color: ${C.accent}; color: ${C.accent}; }

@media (max-width: 520px) {
  .fd-vtitle { font-size: 17px; }
  .fd-mail-frame { height: 60vh; }
  .fd-sheet-box { max-height: 64vh; }
}
@media (prefers-reduced-motion: reduce) {
  .fd-docx-inner { transition: none; }
}
`;
