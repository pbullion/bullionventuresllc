import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const shim = (name) => fileURLToPath(new URL(`./src/pages/file-drop/viewers/shims/${name}.js`, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // File Drop's /file-drop/view parses Outlook .msg files with two Node-first
    // packages, and a browser build replaces Node built-ins with EMPTY modules
    // — both would throw as the lazy email chunk loads. Nothing else in this
    // app imports either name (checked 2026-09-17); each shim's header says
    // exactly what it covers. Exact-match patterns, so `stream-foo` and
    // `iconv-lite/…` subpaths are untouched. `buffer` needs no alias: the npm
    // `buffer` package is a dependency, and Vite prefers an installed package
    // over the built-in name.
    alias: [
      { find: /^stream$/, replacement: shim('stream') },
      { find: /^iconv-lite$/, replacement: shim('iconv-lite') },
    ],
  },
  build: {
    // Explicit floor for older iPhones (2026-08-05). Without a target, Vite's
    // default emits raw ES2020-ES2022 syntax (`??`, `||=`, class fields) that
    // iOS Safari < ~15 fails to PARSE — the single bundle dies before React
    // mounts and every route white-screens on the phone while desktop is
    // fine. This downlevels syntax only (it does not polyfill runtime APIs) —
    // keep new code off bleeding-edge APIs or guard them.
    target: "safari12",
  },
})
