# Agent notes for bullionventuresllc

Vite + React marketing/tools site for Bullion Ventures LLC. Single SPA; each
project/tool is a page under `src/pages/`, wired up in `src/App.jsx`.

See `docs/HANDOFF.md` for architecture rationale, the full backend-coupling
table, known issues, and roadmap.

## Commands

```bash
npm install
npm run dev        # Vite dev server
npm run lint       # eslint . — the only check; keep it at zero errors
npm run build      # vite build → dist/
```

No tests, no CI. Local dev hits the **production** backend (URLs are
hardcoded); there are no env vars anywhere in this repo.

## Deploy

- **Hosted on AWS Amplify.** It auto-deploys on push to the `master` branch —
  there is no manual deploy step. Push to `origin/master` and Amplify builds and
  ships it. (No `vercel.json`/`netlify.toml` in the repo for this reason.)
- Every push to master is therefore a **production deploy**. There is no
  staging. Roll back by reverting and pushing.

## Adding a new page/tool — ALWAYS also add it to the homepage

When you add a new tool/page, do **all** of these, not just the route:

1. Create the page under `src/pages/<name>/index.jsx` (or `Home.jsx`).
2. Import it and add a `<Route>` in `src/App.jsx`.
3. If it's a full-screen tool that should hide the site nav/footer, add its path
   to the `hideChrome` logic in `src/App.jsx` (see `isMyBets`, `isTotalsValue`,
   `isGulfHurricane`, etc.).
4. **Add a card to the homepage.** Append an entry to the `products` array in
   `src/pages/Home.jsx` (icon or emoji, `name`, `path`, `description`) so the new
   tool is discoverable from the landing page. This step is easy to forget — do
   not skip it. (Wedding-photos and mothers-day-2026 are cardless on purpose —
   private pages.)

## Backend

Data-driven tools call the shared Sheline backend at
`https://sheline-art-website-api.herokuapp.com` (e.g. `/kalshi` for My Bets &
Totals Value, `/nhc/current-storms` for the Gulf Hurricane screen). That backend
lives in the `shelineArtWebsiteAPI` repo and deploys separately via
`git push heroku main`.

Full coupling map (verified 2026-07-24; details in `docs/HANDOFF.md`):

| Page | Backend routes |
| --- | --- |
| `/my-bets`, `/totals-value` | `/kalshi` |
| `/crypto-value` | `/kalshi-crypto` |
| `/elite-edge-advisors` | `/elite-edge-advisors`, `/odds`, `/parlays` |
| `/gulf-hurricane` | `/nhc` |
| `/tesla-dashboard` | `/patrick`, `/odds-screen` |

- The site does **not** call `/bullion-ventures` (that backend route is
  push-notification plumbing, not a website API) and does **not** call
  `/weather` (dashboard weather comes via `/patrick/tesla-dashboard-weather`).
- For the betting UI's data model, read the backend repo's
  `docs/betting-engine.md`, `docs/auto-bet-spec.md`, and `docs/totals-value.md`
  — do not re-derive it from the JSX. The crypto page's data model is
  `docs/crypto-engine-spec.md` in the same repo.
- There is no shared schema contract — couplings are hardcoded URL strings.
  Grep this repo for the endpoint path before reshaping any backend response.
- Backend platform constraints (30s timeout, `{}` error bodies, deploys) are
  in `sheline-art-website-api/docs/HANDOFF.md`.

## Conventions

- One folder per tool under `src/pages/`; pages are self-contained single
  files with inline style objects (no CSS-in-JS lib in new code).
- New code uses `fetch` and `date-fns`. `axios`, `moment`, and MUI appear only
  in older pages (tesla-dashboard, elite-edge, zargle) — don't spread them.
- API base URLs are `const API_BASE = "..."` at the top of the page file.

## Hard rules and gotchas

- **Never remove the `/wnba-value` → `/totals-value` redirect** in
  `src/App.jsx` — the old URL is still in the wild.
- **Preserve the auto-bet control asymmetry** on `/totals-value` AND
  `/crypto-value`: kill/tighten is one click, enable/loosen prompts for the
  PIN (stored in `localStorage["bv_autobet_pin"]`, verified server-side). It
  mirrors the backend's safety model for real-money betting.
- **Do not re-enable the recurring push crons** in the backend's
  `routes/bullion_ventures.js` — hard-disabled 2026-07-22 (commented out, not
  env-gated) because the auto-bettor's per-bet pushes made them redundant
  spam. The code comments there say why; manual `/push/test` still works.
- Betting pages poll (15s my-bets, 30s totals-value panel). Keep any new
  polling interval ≥ that order — every tab multiplies Kalshi API load.
- ESPN (`site.api.espn.com`) is called directly from the browser with no key —
  when a sports widget breaks for no visible reason, suspect ESPN first.
- MyBookie↔ESPN team-name mismatches are fixed by adding to `nameAliases` in
  `src/pages/elite-edge-advisors/InputBets.jsx` (normalized form), not by
  changing `normalizeName`.
- `src/pages/kentucky-derby/Tracker.jsx` is orphaned (no route) — slated for
  deletion; don't build on it. Same for the unused HEIC originals in
  `src/pages/mothers-day-2026/pics/` (the page serves `public/` JPGs).
