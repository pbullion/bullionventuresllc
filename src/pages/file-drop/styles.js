/* File Drop — shared look. Warm and light on purpose: the upload page is for
 * someone who is not a developer, possibly nervous about moving years of
 * files. Calm beats clever. Class names are prefixed `fd-`. */

export const C = {
  bg: "#f6f2ea",
  card: "#ffffff",
  border: "#e4ddd0",
  text: "#1f2328",
  muted: "#5f6b78",
  faint: "#8a94a0",
  accent: "#2f6f55",
  accentSoft: "#e6f1eb",
  gold: "#a87a22",
  danger: "#a8321f",
  dangerSoft: "#fbece8",
  warnSoft: "#fdf4e1",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
};

export const CSS = `
.fd-page {
  flex: 1;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: ${C.bg};
  color: ${C.text};
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  padding: 32px max(16px, env(safe-area-inset-right)) calc(64px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  min-height: 100vh;
}
.fd-shell { max-width: 760px; margin: 0 auto; }
.fd-shell.wide { max-width: 1040px; }
.fd-card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  min-width: 0;
}
.fd-card h2 { margin: 0 0 10px; font-size: 18px; }
.fd-btn {
  appearance: none;
  border: 1px solid ${C.accent};
  background: ${C.accent};
  color: #fff;
  border-radius: 11px;
  padding: 11px 18px;
  font-size: 15px;
  font-weight: 650;
  cursor: pointer;
  line-height: 1.2;
  font-family: inherit;
}
.fd-btn:hover { filter: brightness(1.08); }
.fd-btn:disabled { opacity: .5; cursor: default; filter: none; }
.fd-btn.big { padding: 15px 22px; font-size: 17px; }
.fd-btn.ghost { background: #fff; color: ${C.accent}; }
.fd-btn.quiet { background: transparent; color: ${C.muted}; border-color: ${C.border}; }
.fd-btn.danger { background: ${C.danger}; border-color: ${C.danger}; }
.fd-btn.danger-ghost { background: #fff; color: ${C.danger}; border-color: #e6b8ae; }
.fd-btn.small { padding: 6px 10px; font-size: 13px; border-radius: 8px; }
.fd-btn:focus-visible, .fd-input:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
.fd-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.fd-input {
  box-sizing: border-box;
  width: 100%;
  font: inherit;
  font-size: 16px;
  padding: 11px 13px;
  border: 1px solid ${C.border};
  border-radius: 10px;
  background: #fff;
  color: ${C.text};
}
.fd-drop {
  border: 2px dashed ${C.border};
  border-radius: 14px;
  padding: 26px 16px;
  text-align: center;
  color: ${C.muted};
  transition: background-color .15s ease, border-color .15s ease;
}
.fd-drop.over { background: ${C.accentSoft}; border-color: ${C.accent}; color: ${C.accent}; }
.fd-stats {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(min(140px, 100%), 1fr));
}
.fd-stat { background: ${C.bg}; border-radius: 11px; padding: 10px 12px; min-width: 0; }
.fd-stat b { display: block; font-size: 19px; overflow-wrap: anywhere; }
.fd-stat span { font-size: 12.5px; color: ${C.muted}; }
.fd-bar { height: 14px; background: #ece5d8; border-radius: 999px; overflow: hidden; }
.fd-bar > div { height: 100%; background: ${C.accent}; border-radius: 999px; transition: width .3s ease; }
.fd-list { list-style: none; margin: 0; padding: 0; font-size: 13.5px; }
.fd-list li {
  display: flex; gap: 10px; align-items: baseline; justify-content: space-between;
  padding: 6px 0; border-top: 1px solid #f0ebe1; min-width: 0;
}
.fd-list li:first-child { border-top: 0; }
.fd-path { font-family: ${C.mono}; font-size: 12.5px; overflow-wrap: anywhere; min-width: 0; }
.fd-note { font-size: 13.5px; color: ${C.muted}; line-height: 1.55; margin: 6px 0 0; }
.fd-ok { background: ${C.accentSoft}; color: ${C.accent}; border-radius: 11px; padding: 11px 14px; font-weight: 600; }
.fd-bad { background: ${C.dangerSoft}; color: ${C.danger}; border-radius: 11px; padding: 11px 14px; }
.fd-warn { background: ${C.warnSoft}; color: #7a5712; border-radius: 11px; padding: 11px 14px; }
.fd-code {
  font-family: ${C.mono}; font-size: 13px; background: #1f2328; color: #f3efe6;
  padding: 12px 14px; border-radius: 10px; overflow-x: auto; white-space: pre;
}
.fd-folder { border-top: 1px solid #f0ebe1; padding: 10px 0; }
.fd-folder:first-child { border-top: 0; }
.fd-folder-head { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
.fd-folder-name {
  appearance: none; background: none; border: 0; padding: 0; font: inherit; color: ${C.text};
  font-weight: 650; cursor: pointer; text-align: left; overflow-wrap: anywhere; flex: 1 1 200px; min-width: 0;
}
.fd-muted { color: ${C.muted}; font-size: 13px; }
@media (prefers-reduced-motion: reduce) {
  .fd-bar > div, .fd-drop { transition: none; }
}
`;
