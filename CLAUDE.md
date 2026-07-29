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

## Git

**Always `git pull` before `git push`.** Commits reach these repos from other
machines and from other Claude sessions, so pushing without pulling first either
gets rejected or silently interleaves your work with someone else's.

```bash
git pull --rebase && git push
```

`--rebase` keeps history linear (these are single-author repos — no merge commits
for your own work). On a conflict, resolve it and `git rebase --continue`; never
force-push to get around a rejected push.

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
- **Every auto-bet control is PIN-gated** on `/totals-value` AND
  `/crypto-value` — kill, enable and daily-cap alike. The PIN lives in
  `localStorage["bv_autobet_pin"]` and is verified server-side; both pages go
  through their own `postWithPin` helper, which caches on success and reprompts
  once on 401. Changed 2026-07-27 at Patrick's request; before that kill was
  open and only loosening prompted. Note the tradeoff this accepted: the
  emergency stop now needs the PIN on a browser that has never used it.
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
