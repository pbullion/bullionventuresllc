/* File Drop — the "Your files" page's own look, on top of styles.js (which
 * both File Drop pages being built at once leave alone). Same warm palette,
 * same `fd-` prefix. Everything here is sized for a phone first: controls are
 * at least 40px tall, text inputs are 16px so iOS doesn't zoom into them, and
 * long names wrap instead of widening the page. */

import { C } from "./styles.js";

const FOCUS = `outline: 2px solid ${C.gold}; outline-offset: 2px;`;

export const FILES_CSS = `
/* This page is used on a computer (Patrick, 2026-09-17: "it would only be on
 * web on a computer"), and it is a file list — the 1040px of the shared
 * \`.fd-shell.wide\` wastes half a laptop screen on a 948-file folder. It still
 * centres, and still collapses to one column on a narrow window.
 *
 * Written as TWO classes deliberately: \`.fd-shell.wide\` is also two, so a
 * single-class rule loses on specificity however late it is in the file (it
 * did, and the page stayed at 1040px until this was measured in the browser). */
.fd-shell.fd-files-shell { max-width: min(1440px, 100%); }
html:has(.fd-files) { scroll-padding-top: 150px; }
.fd-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.fd-files a.fd-btn { display: inline-flex; align-items: center; text-decoration: none; }
.fd-files .fd-btn.small { min-height: 40px; }
.fd-back {
  display: inline-flex; align-items: center; min-height: 40px; margin-bottom: 4px;
  color: ${C.muted}; font-size: 14px; font-weight: 600; text-decoration: none;
}
.fd-back:hover { color: ${C.accent}; text-decoration: underline; }
.fd-head-row { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; justify-content: space-between; }
.fd-head-row h1 { margin: 0; font-size: 28px; letter-spacing: -0.02em; }

.fd-toolbar {
  position: sticky; top: 0; z-index: 5;
  background: ${C.bg};
  padding: 10px 0;
  margin-bottom: 10px;
  box-shadow: 0 1px 0 ${C.border};
}
.fd-toolbar-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.fd-toolbar-row + .fd-toolbar-row { margin-top: 8px; }
.fd-toolbar .fd-input { min-height: 44px; }
.fd-toolbar .fd-grow { flex: 1 1 auto; }
@media (max-height: 560px) {
  .fd-toolbar { position: static; box-shadow: none; }
  html:has(.fd-files) { scroll-padding-top: 0; }
}

.fd-seg {
  display: inline-flex; flex: 0 0 auto; max-width: 100%;
  border: 1px solid ${C.border}; border-radius: 10px; overflow: hidden; background: #fff;
}
.fd-seg button {
  appearance: none; border: 0; background: transparent; font: inherit; font-size: 14px;
  color: ${C.muted}; padding: 0 12px; min-height: 40px; cursor: pointer;
}
.fd-seg button + button { border-left: 1px solid ${C.border}; }
.fd-seg button[aria-pressed="true"] { background: ${C.accentSoft}; color: ${C.accent}; font-weight: 650; }
.fd-seg button:focus-visible { ${FOCUS} outline-offset: -2px; }

.fd-select {
  font: inherit; font-size: 16px; color: ${C.text};
  min-height: 40px; max-width: 100%; padding: 0 8px;
  border: 1px solid ${C.border}; border-radius: 10px; background: #fff;
}
.fd-select:focus-visible { ${FOCUS} }

.fd-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.fd-chip {
  appearance: none; display: inline-flex; align-items: center; gap: 6px;
  min-height: 40px; max-width: 100%; padding: 0 12px;
  border: 1px solid ${C.border}; border-radius: 999px; background: #fff; color: ${C.text};
  font: inherit; font-size: 14px; line-height: 1.2; text-align: left; cursor: pointer;
  overflow-wrap: anywhere;
}
.fd-chip:hover { border-color: ${C.accent}; }
.fd-chip:focus-visible { ${FOCUS} }
.fd-chip-n { color: ${C.muted}; font-variant-numeric: tabular-nums; }
.fd-chip[aria-pressed="true"] { background: ${C.accent}; border-color: ${C.accent}; color: #fff; }
.fd-chip[aria-pressed="true"] .fd-chip-n { color: rgba(255, 255, 255, 0.85); }
/* Dimmed, not unreadable: a zero-count chip still says what it is and what
 * tapping it would give, so it keeps ${C.muted} (4.9:1 on the card) rather
 * than the ~2.8:1 of ${C.faint}. */
.fd-chip.zero { color: ${C.muted}; border-style: dashed; opacity: 0.85; }
.fd-chip.zero .fd-chip-n { color: ${C.muted}; }
.fd-chip.zero[aria-pressed="true"] { background: ${C.muted}; border-color: ${C.muted}; color: #fff; border-style: solid; }

.fd-crumbs ol {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-wrap: wrap; align-items: center; column-gap: 2px; font-size: 14.5px;
}
.fd-crumbs li { display: inline-flex; align-items: center; min-width: 0; max-width: 100%; }
.fd-crumbs li + li::before { content: "›"; color: ${C.faint}; padding: 0 4px; }
.fd-crumb {
  appearance: none; background: none; border: 0; font: inherit; color: ${C.accent};
  padding: 0 4px; min-height: 40px; cursor: pointer; text-align: left;
  overflow-wrap: anywhere; text-decoration: underline; text-underline-offset: 3px;
}
.fd-crumb:focus-visible { ${FOCUS} }
.fd-crumb-here { padding: 10px 4px; font-weight: 650; overflow-wrap: anywhere; }
.fd-crumb-here:focus { outline: none; }
.fd-crumb-here:focus-visible { ${FOCUS} }

.fd-summary { margin: 2px 4px 10px; font-size: 13.5px; color: ${C.muted}; }
.fd-narrow { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 12px; }
.fd-narrow > span { font-size: 13.5px; color: ${C.muted}; margin-right: 2px; }

.fd-listcard { padding: 8px 16px; }
.fd-rows { list-style: none; margin: 0; padding: 0; }
.fd-rows > li { border-top: 1px solid #f0ebe1; }
.fd-rows > li:first-child { border-top: 0; }
.fd-ico { flex: 0 0 28px; font-size: 22px; line-height: 1; text-align: center; }
/* display: block on all three because the folder row builds them out of
 * spans (it is one big button, and a button may not contain a div). */
.fd-row-main { display: block; flex: 1 1 0; min-width: 0; }
.fd-row-name { display: block; font-weight: 650; overflow-wrap: anywhere; }
.fd-row-meta { display: block; font-size: 13px; color: ${C.muted}; overflow-wrap: anywhere; }
.fd-folder-row {
  appearance: none; display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 10px 4px; min-height: 56px; background: none; border: 0; border-radius: 10px;
  font: inherit; color: inherit; text-align: left; cursor: pointer;
}
.fd-folder-row:hover { background: ${C.bg}; }
.fd-folder-row:focus-visible { ${FOCUS} outline-offset: -2px; }
.fd-chev { flex: 0 0 auto; color: ${C.faint}; font-size: 22px; line-height: 1; }
.fd-file { display: flex; align-items: center; gap: 12px; padding: 6px 4px; }
.fd-file-link {
  display: flex; align-items: center; min-height: 40px;
  color: ${C.text}; font-weight: 650; text-decoration: none; overflow-wrap: anywhere;
}
.fd-file-link:hover { color: ${C.accent}; text-decoration: underline; }
.fd-file-link:focus-visible { ${FOCUS} }
.fd-file-link > span { min-width: 0; }
.fd-folder-link {
  appearance: none; background: none; border: 0; padding: 0; margin: 0;
  display: flex; align-items: center; gap: 4px; min-height: 40px; max-width: 100%;
  font: inherit; font-size: 13px; color: ${C.accent}; text-align: left; cursor: pointer;
  overflow-wrap: anywhere;
}
.fd-folder-link > span:last-child { text-decoration: underline; text-underline-offset: 3px; min-width: 0; }
.fd-folder-link:focus-visible { ${FOCUS} }
.fd-row-err { margin: 4px 0 2px; font-size: 13px; color: ${C.danger}; overflow-wrap: anywhere; }
.fd-dl { flex: 0 0 auto; }
.fd-files mark { background: #f7e2a8; color: inherit; border-radius: 3px; }

.fd-gridnote { margin: 8px 0 12px; }
.fd-tiles {
  list-style: none; margin: 8px 0; padding: 0;
  display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}
.fd-tiles > li { min-width: 0; }
.fd-tile {
  appearance: none; display: flex; flex-direction: column; width: 100%; height: 100%;
  box-sizing: border-box; padding: 0; margin: 0; overflow: hidden;
  background: #fff; border: 1px solid ${C.border}; border-radius: 12px;
  font: inherit; color: inherit; text-align: left; text-decoration: none; cursor: pointer;
}
.fd-tile:hover { border-color: ${C.accent}; }
.fd-tile:focus-visible { ${FOCUS} }
.fd-tile-thumb {
  display: flex; align-items: center; justify-content: center;
  aspect-ratio: 4 / 3; max-width: 100%; overflow: hidden;
  background: ${C.bg}; font-size: 40px; line-height: 1;
}
.fd-tile-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.fd-tile-cap { display: block; padding: 8px 10px 10px; min-width: 0; }
.fd-tile-name {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  font-size: 13.5px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere;
}
.fd-tile-meta { display: block; margin-top: 2px; font-size: 12px; color: ${C.muted}; }

.fd-more { display: block; width: 100%; margin: 8px 0; min-height: 44px; }
.fd-empty-msg { margin: 14px 4px; color: ${C.muted}; }
.fd-empty-lead { margin: 0 0 10px; color: ${C.text}; font-weight: 650; }
.fd-linkbtn {
  appearance: none; background: none; border: 0; padding: 0 4px; min-height: 40px;
  font: inherit; color: ${C.accent}; font-weight: 650; cursor: pointer;
  text-decoration: underline; text-underline-offset: 3px;
}
.fd-linkbtn:focus-visible { ${FOCUS} }
.fd-clutter { display: flex; flex-wrap: wrap; align-items: center; gap: 0 6px; }

@media (max-width: 520px) {
  .fd-head-row h1 { font-size: 25px; }
  .fd-listcard { padding: 4px 10px; }
  .fd-file { gap: 10px; }
  .fd-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .fd-toolbar-row > .fd-seg.fd-scope { flex: 1 1 100%; }
  .fd-toolbar-row > .fd-seg.fd-scope button { flex: 1 1 50%; }
}
@media (prefers-reduced-motion: reduce) {
  html:has(.fd-files) { scroll-behavior: auto; }
}
`;
