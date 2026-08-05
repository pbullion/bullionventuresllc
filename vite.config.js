import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
