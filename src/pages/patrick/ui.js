/* Colors and the stylesheet for /patrick — the project board.
 *
 * Same split as src/pages/prospects/ui.js: the backend owns the data, this file
 * owns only what it looks like. Injected as a <style> tag from index.jsx rather
 * than imported as a .css file, because nothing else in this repo ships CSS
 * files and a page-scoped string can't leak rules into another route. */

/* Card accents. Each is dark enough to carry white text (all measured at or
 * above 4.5:1 on white) because the accent is used both as a title-bar fill and
 * as text — a lighter set would force a second shade per hue, which is what
 * /prospects had to do for its amber.
 *
 * Deliberately NOT /prospects' teal-and-amber or /ashley's PNC blue-and-orange
 * as the page accent: three unlisted tools at three URLs should not be mistaken
 * for each other at a glance. Teal is still IN this list, because here it is one
 * of nine per-project choices rather than the page's identity. */
export const CARD_COLORS = [
  "#4338ca", // indigo
  "#0369a1", // blue
  "#0f766e", // teal
  "#15803d", // green
  "#b45309", // amber
  "#b91c1c", // red
  "#be185d", // pink
  "#6d28d9", // violet
  "#475569", // slate
];

/* A project with no color picked gets a stable one derived from its name, so a
 * board of nine projects doesn't open as nine identical gray cards. Stable
 * rather than random: the same name always lands on the same hue, so renaming is
 * the only thing that ever changes a card's color, and re-mounting the page
 * doesn't reshuffle the wall. */
export function colorFor(project) {
  if (project.color) return project.color;
  const name = String(project.name || "");
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

/* Open tasks in board order — the ordering the "Next up" strip reads, so it
 * lives here rather than being re-derived at each call site. */
export const openTasks = (project) => (project.tasks || []).filter((t) => !t.done);
export const doneTasks = (project) => (project.tasks || []).filter((t) => t.done);

export const PB_CSS = `
/* Palette: near-black wall, white cards, indigo chrome. The dark wall is doing a
   job — with 10-25 cards on screen at once, a light background makes the gutters
   read as the subject and the cards as holes in it. Dark reverses that: the
   white cards are the content, the wall recedes. */
.pb-root {
  min-height: 100vh; background: #1a1d24; color: #e8eaee;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-text-size-adjust: 100%;
  --pb-indigo: #4338ca;
  --pb-indigo-lift: #5b50e0;
  --pb-card: #ffffff;
  --pb-ink: #1f2430;
  --pb-muted: #6b7480;
  --pb-line: #e4e7ec;
  --pb-wall-line: #2b303a;
}
.pb-shell { max-width: 1680px; margin: 0 auto; padding: 0 16px 96px; }

/* ── Header ──────────────────────────────────────────────────────────────── */
.pb-top {
  position: sticky; top: 0; z-index: 30;
  background: #14161c; border-bottom: 1px solid var(--pb-wall-line);
}
.pb-top-in {
  max-width: 1680px; margin: 0 auto; padding: 12px 16px;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.pb-brand { font-size: 17px; font-weight: 700; letter-spacing: .2px; }
.pb-counts { font-size: 13px; color: #9aa3ae; }
.pb-top-spacer { flex: 1 1 auto; }
.pb-btn {
  background: var(--pb-indigo); color: #fff; border: none; border-radius: 9px;
  padding: 9px 14px; font-size: 14px; font-weight: 600; font-family: inherit;
  cursor: pointer; min-height: 40px; white-space: nowrap;
}
.pb-btn:hover { background: var(--pb-indigo-lift); }
.pb-btn-ghost {
  background: transparent; color: #c3c9d2; border: 1px solid #363c47;
}
.pb-btn-ghost:hover { background: #232833; color: #fff; }

/* ── Next up ─────────────────────────────────────────────────────────────── */
/* One row, one chip per project, each showing that project's TOP open task.
   Horizontally scrollable rather than wrapped: wrapping to four rows would push
   the wall itself off screen, which defeats the point of the page. */
.pb-nextup { padding: 14px 0 4px; }
.pb-nextup-label {
  font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase;
  color: #7f8896; margin-bottom: 8px;
}
.pb-nextup-row {
  display: flex; gap: 9px; overflow-x: auto; padding-bottom: 8px;
  scrollbar-width: thin;
}
.pb-chip {
  display: flex; align-items: center; gap: 9px; flex: 0 0 auto; max-width: 340px;
  background: #232833; border: 1px solid #333947; border-left: 4px solid var(--chip);
  border-radius: 10px; padding: 8px 12px 8px 10px;
}
/* Stacked, not inline: the project name and the task have to be two lines, and
   both children are inline elements by default — a span and a button — so
   without this they run together as "CELLRTestFlight build". */
.pb-chip-text { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }
.pb-chip-proj {
  font-size: 10.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
  color: #9aa3ae; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pb-chip-task {
  font-size: 13.5px; color: #edeff3; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; background: none; border: none; padding: 0;
  font-family: inherit; cursor: pointer; text-align: left; max-width: 280px;
}
.pb-chip-task:hover { text-decoration: underline; }

/* ── The wall ────────────────────────────────────────────────────────────── */
/* auto-fill, not auto-fit: with three projects on a wide monitor, auto-fit would
   stretch three cards across 1600px. auto-fill keeps a card a card and leaves
   the empty tracks empty. */
.pb-wall {
  display: grid; gap: 14px; align-items: start;
  grid-template-columns: repeat(auto-fill, minmax(278px, 1fr));
}
/* color-scheme: light on every white surface. The wall is dark but the cards and
   the modal are white, and in a browser set to dark mode the UA styles form
   controls to match the SYSTEM, not the surface — which rendered the modal's
   inputs as dark boxes on white. Declaring it per surface pins the caret,
   scrollbars and control chrome to the surface they actually sit on. */
.pb-card {
  background: var(--pb-card); color: var(--pb-ink); border-radius: 12px;
  color-scheme: light;
  box-shadow: 0 1px 3px rgba(0,0,0,.3); overflow: hidden;
  display: flex; flex-direction: column;
}
.pb-card-flash { animation: pb-flash 1.2s ease-out; }
@keyframes pb-flash {
  0% { box-shadow: 0 0 0 3px var(--accent); }
  100% { box-shadow: 0 1px 3px rgba(0,0,0,.3); }
}
.pb-card-head {
  padding: 11px 12px 10px; border-top: 4px solid var(--accent);
  display: flex; align-items: flex-start; gap: 8px;
}
.pb-card-title-wrap { flex: 1 1 auto; min-width: 0; }
.pb-card-title {
  font-size: 15px; font-weight: 700; line-height: 1.25; color: var(--pb-ink);
  background: none; border: none; padding: 0; font-family: inherit; cursor: text;
  text-align: left; width: 100%; word-break: break-word;
}
.pb-card-title:hover { text-decoration: underline dotted; text-underline-offset: 3px; }
.pb-card-sub {
  font-size: 11.5px; color: var(--pb-muted); margin-top: 2px; word-break: break-word;
}
.pb-card-count {
  font-size: 11px; font-weight: 700; color: var(--accent); white-space: nowrap;
  padding-top: 2px;
}
.pb-menu-btn {
  background: none; border: none; color: #9aa3ae; cursor: pointer; font-size: 17px;
  line-height: 1; padding: 2px 4px; border-radius: 6px;
}
.pb-menu-btn:hover { background: #f1f3f6; color: var(--pb-ink); }

/* ── Tasks ───────────────────────────────────────────────────────────────── */
.pb-tasks { list-style: none; margin: 0; padding: 0 0 2px; }
.pb-task {
  display: flex; align-items: flex-start; gap: 8px; padding: 6px 10px 6px 12px;
  border-top: 1px solid var(--pb-line);
}
.pb-task:hover { background: #f7f8fa; }
.pb-check {
  flex: 0 0 auto; width: 17px; height: 17px; margin-top: 2px; border-radius: 5px;
  border: 1.5px solid #b8bfc9; background: #fff; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; line-height: 1; color: #fff;
}
.pb-check:hover { border-color: var(--accent); }
.pb-check-on { background: var(--accent); border-color: var(--accent); }
.pb-task-text {
  flex: 1 1 auto; font-size: 13.5px; line-height: 1.35; color: var(--pb-ink);
  background: none; border: none; padding: 0; font-family: inherit; cursor: text;
  text-align: left; word-break: break-word; min-width: 0;
}
.pb-task-done .pb-task-text { color: #98a0ab; text-decoration: line-through; }

/* Row actions appear on hover on a mouse and are ALWAYS visible on touch —
   hover-only controls are unreachable on a phone, and this page is dense enough
   that showing them permanently on desktop would be noise. */
.pb-task-acts { flex: 0 0 auto; display: flex; gap: 1px; opacity: 0; }
.pb-task:hover .pb-task-acts, .pb-task:focus-within .pb-task-acts { opacity: 1; }
@media (hover: none) { .pb-task-acts { opacity: 1; } }
.pb-act {
  background: none; border: none; color: #98a0ab; cursor: pointer; font-size: 12px;
  line-height: 1; padding: 3px 5px; border-radius: 5px;
}
.pb-act:hover { background: #e9ecf1; color: var(--pb-ink); }

.pb-edit {
  flex: 1 1 auto; font-size: 13.5px; line-height: 1.35; font-family: inherit;
  border: 1px solid var(--accent); border-radius: 6px; padding: 3px 6px;
  color: var(--pb-ink); min-width: 0; width: 100%; box-sizing: border-box;
}
.pb-edit:focus { outline: 2px solid var(--accent); outline-offset: -1px; }

/* ── Done pile ───────────────────────────────────────────────────────────── */
.pb-done-toggle {
  width: 100%; text-align: left; background: none; border: none;
  border-top: 1px solid var(--pb-line); padding: 7px 12px;
  font-size: 12px; font-weight: 600; color: var(--pb-muted); cursor: pointer;
  font-family: inherit;
}
.pb-done-toggle:hover { background: #f7f8fa; color: var(--pb-ink); }
.pb-clear-done {
  background: none; border: none; color: var(--pb-muted); font-size: 11.5px;
  font-family: inherit; cursor: pointer; padding: 6px 12px 8px; text-align: left;
}
.pb-clear-done:hover { color: #b91c1c; text-decoration: underline; }

/* ── Add box ─────────────────────────────────────────────────────────────── */
/* Permanently visible at the bottom of every card. The single most common thing
   done on this page is "add a task", and putting it behind a + button would cost
   a click every time for no space saved. */
.pb-add { border-top: 1px solid var(--pb-line); padding: 7px 10px 9px 12px; margin-top: auto; }
.pb-add-input {
  width: 100%; box-sizing: border-box; border: 1px solid transparent; border-radius: 7px;
  padding: 6px 8px; font-size: 13.5px; font-family: inherit; color: var(--pb-ink);
  background: #f2f4f7;
}
.pb-add-input::placeholder { color: #98a0ab; }
.pb-add-input:focus { outline: none; border-color: var(--accent); background: #fff; }

/* ── Popover menu ────────────────────────────────────────────────────────── */
.pb-pop-scrim { position: fixed; inset: 0; z-index: 60; background: rgba(12,14,18,.45); }
.pb-pop {
  position: fixed; z-index: 61; background: #fff; color: var(--pb-ink); color-scheme: light;
  border-radius: 12px; box-shadow: 0 12px 34px rgba(0,0,0,.4); padding: 8px;
  width: 236px; max-width: calc(100vw - 24px);
}
.pb-pop-item {
  display: block; width: 100%; text-align: left; background: none; border: none;
  padding: 9px 10px; border-radius: 8px; font-size: 14px; font-family: inherit;
  color: var(--pb-ink); cursor: pointer;
}
.pb-pop-item:hover { background: #f1f3f6; }
.pb-pop-danger { color: #b91c1c; }
.pb-pop-label {
  font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: var(--pb-muted); padding: 8px 10px 5px;
}
.pb-swatches { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 10px 8px; }
.pb-swatch {
  width: 24px; height: 24px; border-radius: 7px; border: 2px solid transparent;
  cursor: pointer; padding: 0;
}
.pb-swatch-on { border-color: var(--pb-ink); }

/* ── Modal (new project / edit project) ──────────────────────────────────── */
.pb-modal-scrim {
  position: fixed; inset: 0; z-index: 70; background: rgba(12,14,18,.55);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.pb-modal {
  background: #fff; color: var(--pb-ink); border-radius: 14px; padding: 18px;
  color-scheme: light;
  width: 100%; max-width: 400px; box-shadow: 0 20px 50px rgba(0,0,0,.45);
}
.pb-modal h2 { margin: 0 0 14px; font-size: 17px; }
.pb-field { margin-bottom: 12px; }
.pb-field label {
  display: block; font-size: 12px; font-weight: 600; color: var(--pb-muted);
  margin-bottom: 5px;
}
/* 16px, so iOS Safari doesn't zoom the page when the field takes focus. */
.pb-input {
  width: 100%; box-sizing: border-box; border: 1px solid #cfd5dd; border-radius: 9px;
  background: #fff;
  padding: 10px 11px; font-size: 16px; font-family: inherit; color: var(--pb-ink);
}
.pb-input:focus { outline: 2px solid var(--pb-indigo); outline-offset: -1px; border-color: var(--pb-indigo); }
.pb-modal-acts { display: flex; gap: 9px; justify-content: flex-end; margin-top: 16px; }
.pb-btn-plain {
  background: #eef0f4; color: var(--pb-ink); border: none; border-radius: 9px;
  padding: 9px 14px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer;
}
.pb-btn-plain:hover { background: #e2e6ec; }

/* ── Empty state ─────────────────────────────────────────────────────────── */
.pb-empty { text-align: center; padding: 76px 16px; color: #9aa3ae; }
.pb-empty h2 { color: #e8eaee; font-size: 20px; margin: 0 0 8px; }
.pb-empty p { margin: 0 auto 20px; max-width: 420px; font-size: 14px; line-height: 1.5; }

/* ── Toast ───────────────────────────────────────────────────────────────── */
.pb-toast {
  position: fixed; color-scheme: light; left: 50%; transform: translateX(-50%); bottom: 22px; z-index: 80;
  background: #fff; color: var(--pb-ink); border-radius: 11px; padding: 11px 13px;
  box-shadow: 0 10px 30px rgba(0,0,0,.4); display: flex; align-items: center; gap: 12px;
  font-size: 14px; max-width: calc(100vw - 24px);
}
.pb-toast-err { background: #fdecea; color: #8f2f25; }
.pb-toast-undo {
  background: none; border: none; color: var(--pb-indigo); font-weight: 700;
  font-size: 14px; font-family: inherit; cursor: pointer; padding: 2px 4px;
}
.pb-toast-undo:hover { text-decoration: underline; }

@media (max-width: 560px) {
  .pb-shell { padding: 0 11px 88px; }
  .pb-wall { grid-template-columns: 1fr; }
}
`;
