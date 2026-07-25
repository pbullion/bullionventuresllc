# Handoff — bullionventuresllc

I built and ran this repo solo. This is the letter I wish someone had handed me
when the site stopped being "a marketing page" and quietly became the frontend
for half a dozen live backend projects. Written 2026-07-24 from the code and git
history as they stand today.

## What this is

The Bullion Ventures LLC website: a single Vite + React SPA (React 19, Vite 8,
react-router-dom 7) that started as a landing page with App Store-required
privacy/support pages for my iOS apps, and grew into the web frontend for my
personal tools — most importantly the **Kalshi betting UI** (`/my-bets` and
`/totals-value`), plus a Tesla in-car dashboard, a Gulf hurricane tracker, and
the Elite Edge Advisors bet board. One repo, one deploy, every tool is a page.

## Current state (as of 2026-07-24)

Live, actively developed, healthy. First commit 2026-05-02; the last two weeks
of history are almost entirely My Bets / Totals Value work (the Kalshi betting
UI is where all the energy is). Lint was cleared to zero on 2026-07-24.

What works today:

- **Betting pages** (`/my-bets`, `/totals-value`) — live, polished, polling
  real Kalshi data through the backend. This is the flagship.
- **Static app pages** (debriefly, slumbr, zargle, mancave-displays,
  receipt-tax-tracker, learn-and-play, palladium-2026, wedding-photos,
  daycare-memory-vault) — Home/Privacy/Support(/Terms) each. These exist
  mostly so the App Store listings have URLs to point at. Rarely touched.
- **Tesla dashboard** (`/tesla-dashboard`) — weather, clock, calendar, news,
  sports widgets, and an odds screen, designed for the car browser. Older code
  (mixed axios, MUI, CSS files); works, but it's the messiest corner.
- **Gulf Hurricane** (`/gulf-hurricane`) — NHC storm data via the backend
  proxy + direct NOAA imagery. Added July 2026, seasonal.
- **Elite Edge Advisors** (`/elite-edge-advisors`) — ported from the separate
  `elite_edge_vip`-adjacent web repo on 2026-07-17 ("Port Elite Edge Advisors
  bet board"). The bet board plus the MyBookie-JSON input modal
  ([InputBets.jsx](../src/pages/elite-edge-advisors/InputBets.jsx)). **Not yet
  on the homepage** — see Known issues.
- **Farkle scorer, Mothers Day 2026 gift page** — static, done.

Stubs/orphans: `src/pages/kentucky-derby/Tracker.jsx` was added 2026-05-02 and
never wired into `App.jsx` — no route, no card, dead code since day one.

`TODO.md` at the repo root is **half stale**: the Elite Edge migration it
describes happened (page + JSON-input modal both exist), but the "add it to the
home page as well" part never did. The remote branch `origin/elite-edge-migration`
was an earlier attempt at the same port and is **not merged** — the work landed
on master via a different commit; the branch is safe to delete.

## Architecture in five minutes

There is deliberately almost none. One SPA, client-side routing, zero build-time
configuration, zero environment variables, no state library, no tests.

```
Browser
  └── React SPA (AWS Amplify, auto-deploy on push to master)
        ├── src/App.jsx ......... every route + the hideChrome logic
        ├── src/pages/<tool>/ ... one folder per tool/app page
        └── data pages fetch →
              ├── https://sheline-art-website-api.herokuapp.com  (shared backend)
              ├── site.api.espn.com  (public ESPN API, called directly)
              └── nhc.noaa.gov / cdn.star.nesdis.noaa.gov  (images via <img>)
```

The shared backend is the sibling repo
`~/Code/my-sites-apps-backends/sheline-art-website-api` (Express + Postgres on
Heroku, one route file per project). **Read its `docs/HANDOFF.md` for platform
constraints** — 30s request timeout, `{}` error responses, boot-time table
creation, deploy/rollback — I don't repeat them here.

Every coupling is a hardcoded URL string in a page file; there is no shared
schema or type contract anywhere. That's the tradeoff I accepted for having no
build config: the cost is that a backend response reshape breaks this site
silently at runtime.

### Backend couplings (verified against the code, 2026-07-24)

| Page | Backend route(s) | Endpoints used |
| --- | --- | --- |
| `/my-bets` | `/kalshi` | `GET /balance`, `/positions`, `/settlements` — 15s background poll |
| `/totals-value` | `/kalshi` | `GET /totals-value?min_edge=`, `/totals-value/performance`, `/auto-bets` + `/status` `/activity` `/scenarios` `/review`; `POST /auto-bets/daily-cap`, `/auto-bets/kill\|enable`, `/auto-bets/segments` — 30s poll; writes are PIN-gated |
| `/elite-edge-advisors` | `/elite-edge-advisors`, `/odds`, `/parlays` | `GET /get-all-bets`, `/odds/all-odds`; `POST /unhide-all-bets`, per-bet `/:id`; the InputBets modal saves to `/elite-edge-advisors` and `/parlays` |
| `/gulf-hurricane` | `/nhc` | `GET /current-storms` (backend proxies NHC's CurrentStorms.json because that feed has no CORS; the graphics load straight from nhc.noaa.gov) |
| `/tesla-dashboard` | `/patrick`, `/odds-screen` | `GET /patrick/tesla-dashboard-weather?lat&lon` (Apple WeatherKit proxy), `/patrick/all-data-2/mancavedisplaysllc@gmail.com` (hardcoded user), `/odds-screen/check-subscription/:email`, `/odds-screen/tracking/:user` |

Two corrections to what the **backend's** HANDOFF.md counterpart table says
about this repo: this site does **not** call `/bullion-ventures` and does
**not** call `/weather`. Weather comes through `/patrick/tesla-dashboard-weather`,
and `/bullion-ventures` is a push-notification module (below), not a website
API. The backend table also omits `/odds`, `/odds-screen`, and `/parlays`,
which this site does call. The table above is the accurate one.

For the betting UI's **data model** — what a position/leg/value-bet looks like,
how the scanner and auto-bettor work — do not re-derive it from the JSX. It is
documented in the backend repo:

- `sheline-art-website-api/docs/betting-engine.md`
- `sheline-art-website-api/docs/auto-bet-spec.md`
- `sheline-art-website-api/docs/totals-value.md`

### The `routes/bullion_ventures.js` backend module (namesake, not a site API)

Confusingly, the backend route named after this LLC serves **push
notifications**, and this website never calls it. It's 465 lines (live, last
touched 2026-07-22) that send Expo pushes to Patrick's phone and log them to
`briefly_sent_notifications` so the Briefly iOS app renders them as rich cards.
It exports `sendOwnerPush`, which the Kalshi auto-bettor lazy-requires
(`kalshi.js:3382` — deliberate, breaks a circular dependency).

**Recurring pushes were hard-disabled on 2026-07-22**, and the why is written
in the code itself (`bullion_ventures.js:215-233` and `:379-389`): it had two
crons — a 15-minute "live bet update" summary and a 2-minute totals-value
alert — and once the auto-bettor started placing bets itself and pushing on
each PLACED bet plus a daily wrap and errors, the recurring pushes became
redundant spam. They were first env-gated off (`BULLION_RECURRING_PUSHES`,
2026-07-21), then **commented out entirely** the next day so the env var can't
revive them — the comment says "Do not re-enable without explicit owner
go-ahead." The send functions and their manual test endpoints
(`POST /bullion-ventures/push/test`, `POST /bullion-ventures/totals-value/push/test`)
still work, and `GET /bullion-ventures/live` shows what a push would contain.
No scan side effects were lost: the auto-bet supervisor scans every 60s, which
keeps prediction logging and closing-line capture running.

## The map: where to go for what

| Want to… | Open |
| --- | --- |
| Add/remove a route, change nav/footer visibility | [src/App.jsx](../src/App.jsx) (`hideChrome` at :55-65) |
| Add a homepage card | `products` array in [src/pages/Home.jsx:3](../src/pages/Home.jsx) |
| Change the My Bets cards/sorting/polling | [src/pages/my-bets/index.jsx](../src/pages/my-bets/index.jsx) (1,737 lines, single file; data load ~:1350-1410) |
| Change the Totals Value scanner UI or Auto-Bet panel | [src/pages/totals-value/index.jsx](../src/pages/totals-value/index.jsx) (PIN flow ~:744-820) |
| Fix MyBookie→ESPN team-name matching | `nameAliases` in [src/pages/elite-edge-advisors/InputBets.jsx](../src/pages/elite-edge-advisors/InputBets.jsx) |
| Elite Edge bet board | [src/pages/elite-edge-advisors/index.jsx](../src/pages/elite-edge-advisors/index.jsx) (2,855 lines — the biggest file in the repo) |
| Hurricane feeds/imagery | [src/pages/gulf-hurricane/index.jsx](../src/pages/gulf-hurricane/index.jsx) (feed URLs at the top) |
| Tesla dashboard widgets | [src/pages/tesla-dashboard/](../src/pages/tesla-dashboard/) — one file per widget, `OddsScreen.jsx` is the big one |
| Any static app page (privacy/support) | `src/pages/<app>/Privacy.jsx` etc. |
| Betting data model | backend repo `docs/betting-engine.md` / `auto-bet-spec.md` / `totals-value.md` |
| Backend endpoint behavior | `sheline-art-website-api/routes/<project>.js` + its `CLAUDE.md`/`docs/HANDOFF.md` |

## Running it locally

```bash
npm install
npm run dev        # Vite dev server (default port 5173)
npm run lint       # eslint . — the only check that exists; keep it at zero
npm run build      # vite build → dist/
```

No `.env`, no local services. Every page talks to the **production** backend
(the Heroku URL is hardcoded), so local dev reads live data — including live
betting data. The betting pages' write actions (daily cap, kill/enable,
segments) are PIN-checked server-side, so browsing locally is safe; just don't
type the PIN into a page you're actively hacking on unless you mean it.

There are no tests. `npm run lint` is the whole safety net.

## Environment and configuration

None. Zero environment variables, zero `import.meta.env` usage, no
build-time config. The API base URLs are hardcoded per page (grep for
`herokuapp.com`). The one piece of client-side state that resembles a secret is
`localStorage["bv_autobet_pin"]` — the totals-value page remembers the auto-bet
PIN after first use and clears it on a 403. The PIN itself lives only in the
backend's config; it is not in this repo.

## Deploy and environments

- **Prod is the only environment.** AWS Amplify watches `origin/master` and
  auto-builds/ships on every push. There is no manual step, no staging, no
  preview environment, and deliberately no `amplify.yml`/`vercel.json` in the
  repo — build settings live in the Amplify console.
- To roll back: revert the commit and push, or use the Amplify console's
  redeploy-a-previous-build. I always did the former.
- The backend deploys separately (`git push heroku main` from the backend
  repo). A frontend change that needs a new endpoint must ship **after** the
  backend one; there's no versioning to save you.
- When a data page misbehaves in prod, check the backend first
  (`heroku logs --tail -a sheline-art-website-api`) — nine times out of ten
  the SPA is fine and the backend returned `{}` (its global error handler
  serializes thrown Errors to an empty object; see the backend CLAUDE.md).

## Landmines

- **Every push to master is a production deploy.** Never push a half-finished
  page to master; there is no staging to catch it.
- **The four-step new-page checklist** (route in `App.jsx`, `hideChrome` if
  full-screen, homepage card in `Home.jsx`) is real — I forgot step 4 myself
  on elite-edge-advisors and it's still missing. A page without a card is
  invisible to everyone but you.
- **`/wnba-value` must keep redirecting to `/totals-value`** (`App.jsx:96`).
  The old URL is on my phone home screen and possibly in push notification
  history. Same reason the backend still honors old `WNBA_*` env names.
- **No API contract.** If you reshape a backend response, this site fails
  silently — often as an eternally-empty page, because most fetch handlers
  default to `[]`/`{}` on non-ok. Grep this repo for the endpoint path before
  touching any backend response shape (the backend's CLAUDE.md says the same
  about `patrick.js` specifically — Raspberry Pis consume it too).
- **The betting pages poll aggressively** (15s my-bets, 30s totals-value
  auto-bet panel, faster around live games). If you add a new poll, keep the
  interval sane — the backend proxies to Kalshi's real API and every
  browser tab multiplies the load.
- **Auto-bet controls follow a deliberate asymmetry** (mirrors the backend):
  killing/tightening is one click, enabling/loosening prompts for the PIN. If
  you rework that panel, preserve the asymmetry — it's the safety model for a
  system that places real-money orders.
- **ESPN's `site.api.espn.com` is an unofficial public API** called straight
  from the browser (tesla-dashboard widgets, elite-edge odds matching). No
  key, no SLA. When a widget dies for no reason, ESPN changed something.
- **MyBookie team names ≠ ESPN team names.** The `nameAliases` map in
  `InputBets.jsx` exists because bet-matching fails without it ("USA" vs
  "United States", "Bosnia and Herzegovina" vs "Bosnia-Herzegovina" — both
  sides pass through `normalizeName` first, so aliases are stored in
  normalized form). When a saved bet won't match its game, add an alias; don't
  fight the normalizer.
- **`OddsScreen.jsx:106` hardcodes `mancavedisplaysllc@gmail.com`** as the
  data user. That's my account; the odds screen is effectively single-tenant.
- **Gulf-hurricane's proxy split is deliberate**: NHC's CurrentStorms.json has
  no CORS headers (hence the backend proxy), but their PNG/JPG imagery allows
  cross-origin `<img>` loads (hence direct URLs). Don't "simplify" by
  proxying the images — they're large and the Heroku dyno doesn't need that.
- **Do not re-enable the recurring push crons** in the backend's
  `bullion_ventures.js` — they are commented out on purpose, twice over (see
  above). The auto-bettor's own pushes replaced them.

## Decisions and why

- **One SPA for everything** instead of a repo per tool: I'm one person, and
  the marginal cost of a new tool here is a folder, a route, and a card.
  Accepted costs: a betting page and a daycare privacy page share one deploy
  and one dependency tree.
- **Hardcoded prod API URLs, no env layer.** With no staging backend there is
  nothing to switch to, so an env indirection would be ceremony. If a staging
  backend ever exists, introduce `import.meta.env.VITE_API_BASE` then, not
  before.
- **Elite Edge was ported, not linked.** The old standalone web app had
  accounts, admin screens, and infra I didn't want. I kept exactly two things
  (per TODO.md): the bet-board screen and the MyBookie JSON input, the latter
  ported verbatim from the old `AdminScreen/TodaysBets.js` into
  `InputBets.jsx`. The account-creation machinery was deliberately left
  behind; don't reconstruct it. (The React Native picks app `elite_edge_vip`
  still exists separately and talks to the same backend route.)
- **Recurring pushes → event-driven pushes** (2026-07-21/22): once the
  auto-bettor pushed on every placed bet + daily wrap + errors, periodic
  summaries were noise. First env-gated, then hard-commented so a stray
  config change can't bring the spam back. The scan side effects the alert
  cron used to provide (prediction logging, closing-line capture) were
  already covered by the auto-bet supervisor's 60s loop.
- **`hideChrome` as a path-prefix list** rather than per-route layout
  components: crude but obvious. With this many tiny pages, one visible list
  in `App.jsx` beats a layout abstraction.
- **What I'd do differently:** pick one date library and one HTTP client
  (see debt), and split the two giant page files before they grow further.

## Known issues and debt (ranked by real consequence)

1. ~~Elite Edge Advisors has no homepage card~~ — **fixed 2026-07-24**; the
   card is in `Home.jsx` now, closing the last open half of TODO.md.
   (Wedding-photos and mothers-day-2026 are still cardless on purpose —
   they're private/gift pages.)
2. **41 MB of unused HEIC originals** committed at
   `src/pages/mothers-day-2026/pics/`. The page serves the JPG copies from
   `public/mothers-day-2026/pics/` (6 MB); the HEICs are imported by nothing.
   They bloat every clone and every Amplify build fetch. Safe to delete the
   `src` copy (verify with a grep for `HEIC` first — there are none today).
3. **Three date libraries** (`moment` + `moment-timezone`, `date-fns`) and
   **two HTTP clients** (axios in tesla-dashboard/zargle/elite-edge, fetch
   everywhere newer). New code should use `date-fns` and `fetch`; migrating
   old code is nice-to-have.
4. **Two monolith page files**: `elite-edge-advisors/index.jsx` (2,855 lines)
   and `my-bets/index.jsx` (1,737). Both work; both are unpleasant to edit.
5. **`kentucky-derby/Tracker.jsx` is orphaned** — never routed. Delete it or
   wire it up next May.
6. **Stale branch** `origin/elite-edge-migration` — superseded by the port
   that landed on master 2026-07-17; delete it.
7. **README.md is the stock Vite template.** Worthless; this file and
   CLAUDE.md are the real docs.
8. **MUI (`@mui/*` + emotion) is a heavy dependency used by only two page
   families** (tesla-dashboard, elite-edge). Everything newer uses inline
   styles. Fine for now; know it's there before adding it to new pages.

## If I had two more weeks

1. ~~Add the Elite Edge homepage card~~ (done 2026-07-24) and delete the stale
   branch + orphaned Kentucky Derby page.
2. Delete the 41 MB HEIC directory.
3. Split `my-bets/index.jsx` into components — it's the file I edit most and
   the churn history (30+ commits in July) says it'll keep growing.
4. Standardize on fetch + date-fns in tesla-dashboard, drop axios/moment from
   the dependency tree if nothing else uses them afterward.
5. A smoke test in CI: `npm run build` + lint on PR. Amplify building master
   is currently the first time anyone learns the build broke.

## Open questions

- **Did anything ever call the backend's `/weather` route from this site?**
  The backend HANDOFF's counterpart table says this repo talks to `/weather`
  (and `/bullion-ventures`); the code today calls neither. I believe the table
  row was written from memory and is simply wrong/stale — but I haven't
  checked historical revisions of the tesla-dashboard files to rule out that
  a `/weather` call was removed at some point.
- **Is the OddsScreen subscription check (`/odds-screen/check-subscription`)
  still meaningful**, or a relic of when Mancave Displays had paying users? I
  never confirmed whether any non-me user loads that screen.
- **`browser-detect` in OddsScreen** — used, but I never re-verified what the
  Tesla browser actually reports these days; the detection may be vestigial.

## External dependencies and accounts

- **AWS Amplify** — hosting + CI for this repo; watches GitHub
  `pbullion/bullionventuresllc` master. If the AWS account lapses, the site
  goes dark but nothing else breaks.
- **Heroku `sheline-art-website-api`** — every data page's backend. Owned by
  the same person; see that repo's HANDOFF for its own dependency list
  (Kalshi, Apple WeatherKit, Twilio, etc.). If it's down, the static pages
  still render; every data page shows empty states.
- **ESPN public API** — no account, no key, no guarantees.
- **NOAA/NHC imagery** — public, no account.
- **GitHub `pbullion/bullionventuresllc`** — the deploy trigger; force-pushing
  master is deploying.
