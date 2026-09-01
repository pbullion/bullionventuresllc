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
4. **Add a card to the homepage.** Append an entry to either the `apps` or the
   `tools` array in `src/pages/Home.jsx` (`icon` or `emoji`, `name`, `path`,
   `tagline`, `description`) so the new tool is discoverable from the landing
   page. `apps` are products with their own landing/support/privacy pages;
   `tools` are single-page utilities that run in the browser here. This step is
   easy to forget — do not skip it. (Wedding-photos and mothers-day-2026 are
   cardless on purpose — private pages.)
   - **`/ashley` is cardless AND unlisted, on purpose.** Ashley's client
     transition tracker (`src/pages/ashley/`) is not on the home page — it isn't
     a tool for site visitors, it's one person's book of commercial-banking
     client relationships. It is in `PRIVATE_TOOLS` (added 2026-08-26) so
     Patrick can reach it without typing the URL. Unlike every other page here,
     it is **genuinely protected**: real
     email/password login, JWT in `localStorage["ash_token"]`, and
     `routes/ashley.js` requires a bearer token on every endpoint including the
     reads. Needs `ASHLEY_JWT_SECRET` and `ASHLEY_SIGNUP_CODE` set on Heroku.
   - **`/ffdraft` is cardless AND unlisted too** (Patrick, 2026-08-21).
     Fantasy football draft war room (`src/pages/ffdraft/`) synced to his
     private ESPN league via sheline `/ffdraft`. Personal tool — do not add a
     home page card; it's in `PRIVATE_TOOLS` instead.
   - **`/patrick` is cardless AND unlisted too.** Patrick's own project board
     (`src/pages/patrick/`) — one mini todo board per app he is still finishing.
     Not on the home page, no login. It's the first row of `PRIVATE_TOOLS`
     (2026-08-26) so the todo wall is one press-and-hold away. See its own
     section below.
   - **`/drive` is cardless too** (Patrick, 2026-08-26). The in-car dashboard
     (`src/pages/drive/`) is typed into the Tesla browser and left running; it
     is in `PRIVATE_TOOLS` but not on the home page. It shows live Kalshi
     balances on a public unauthenticated route, which was Patrick's explicit
     call — it is read-only and has no controls that can move money. See its own
     section below.
   - **Everything unlisted goes somewhere else.** The pages kept off the public
     home page — the seven Kalshi/betting screens (Patrick, 2026-07-30) plus
     `/patrick`, `/ffdraft`, `/ashley` and `/prospects` (2026-08-26) — live in
     `GROUPS` in `src/components/PrivateTools.jsx`. Add an unlisted page to the
     right group there instead of to `apps`/`tools`, and note that hiding it is
     obscurity only: every route but `/ashley` stays public and unauthenticated.

### The press-and-hold menu (`PrivateTools`)

`src/components/PrivateTools.jsx` renders one modal listing every unlisted page,
grouped **Patrick / Betting / Banking**. It has **two** triggers, both a 550ms
press-and-hold:

- the navbar wordmark (`src/components/Navbar.jsx`), on every page with chrome;
- the gold `Bullion Ventures LLC` badge in the home page hero
  (`src/pages/Home.jsx`), because the navbar scrolls away on a phone.

Both share `src/components/useLongPress.js` — put the gesture on a third trigger
by calling that hook, never by re-implementing the timer. Two rules the hook
encodes and a new trigger must respect:

1. **Swallow the click after a completed hold.** `press.consumeFired()` in
   `onClick` → `e.preventDefault()`. Without it the wordmark opens the modal and
   then routes home behind it.
2. **`onContextMenu` must be prevented and text selection disabled.** Holding on
   iOS otherwise raises the share/copy callout on top of the modal.

The hero badge is deliberately a `<span>`, not a `<button>`: no pointer cursor,
no tab stop, no keyboard path. It stays a decorative badge for everyone who
isn't looking for the gesture, which is the whole point.

## The one page with build-time data (`/hrw`)

Houston Restaurant Weeks gets all of its restaurant data without a backend.
`scripts/build-hrw-data.mjs` reads a public Google Sheet, geocodes the addresses,
and writes the committed static asset `public/data/hrw-2026.json` (385
restaurants, 9,127 dishes); the page fetches that file and filters in the
browser. **Reader reviews are the one exception** — they can't be static, so they
call `/hrw` on the Sheline backend; see the Backend section and
`src/pages/hrw/reviews.js`.

```bash
node scripts/build-hrw-data.mjs   # re-read the sheet, then commit the JSON
```

- **Read the header comment in that script before changing it.** Two
  non-obvious things are load-bearing: tabs are addressed by numeric **gid**
  (the gviz `?sheet=<name>` endpoint returns 200 while silently dropping rows),
  and rows join on **Source URL**, not restaurant name (two McCormick &
  Schmick's locations share a name).
- Geocoding pins 367 of 385. `scripts/hrw-geocache.json` is committed and
  hand-editable — fix a bad or missing pin there, not in the parser. Misses are
  cached as `null` on purpose; delete an entry to force a retry.
- Rationale, trade-offs and the full trap list: `docs/HANDOFF.md`.
- `leaflet` is a dependency of this page only, lazy-loaded in `MapView.jsx` and
  `MiniMap.jsx` so it stays out of the main bundle. Map tiles come from CARTO
  (free, keyless, attributed).
- **Reviews attach to a PLACE, not to a row.** The sheet has 20 Saltgrass rows
  and 6 Fadi's; `src/pages/hrw/places.js` groups the 385 rows into 285 places
  (41 of them multi-location) so a review written at one location is read at all
  of them. The grouping is derived from the names — it strips neighbourhood
  suffixes using the dataset's own neighborhood column — and it is deliberately
  conservative: a shortened name is only adopted when another row collides with
  it, which is what keeps "Fielding's Local" and "Fielding's Steak" apart.
  **Fix a wrong grouping in that file's `OVERRIDES` map, keyed by slug — don't
  tune the regexes.** Changing how a key is computed orphans the reviews already
  stored under the old key.

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
| `/weather-value` | `/kalshi-weather` |
| `/gas-value` | `/kalshi-gas` |
| `/morning-review` | `/kalshi/morning-report` + all four engines' `/auto-bets/status` |
| `/engine-limits` | `/kalshi-limits` (one call — all four engines' units and caps) |
| `/elite-edge-advisors` | `/elite-edge-advisors`, `/odds`, `/parlays` |
| `/gulf-hurricane` | `/nhc` |
| `/tesla-dashboard` | `/patrick`, `/odds-screen` |
| `/prospects` | `/prospects` |
| `/ashley` | `/ashley` |
| `/patrick` | `/patrick-board` (NOT `/patrick` — that prefix is the Tesla dashboard's feed) |
| `/hrw` | `/hrw` (reviews only — restaurant data is the static `public/data/hrw-2026.json`, see above) |

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

## `/prospects` — the Houston C&I prospect book

A second tool for the same person as `/ashley`, sharing no code with it on
purpose. `/ashley` works the book she already owns; `/prospects`
(`src/pages/prospects/`) works the market — greater-Houston C&I operating
companies over roughly $50M of revenue — and answers "who do I call next, and
what do I know before I dial". Routes are `/prospects` and `/prospects/:slug`,
both rendering `index.jsx`, so one company is bookmarkable.

- **Cardless AND unlisted, like `/ashley`** — not on the home page, not in
  `PRIVATE_TOOLS`. Reached by typing the URL.
- **Unlike `/ashley`, there is NO LOGIN** (Patrick, 2026-08-13). Anyone who
  reaches the URL can read, edit and delete the whole book. The seeded catalog is
  public information; the overlay of statuses, notes and contacts is not. Setting
  `PROSPECTS_ACCESS_CODE` on Heroku turns on a shared-code gate (sent as
  `X-Prospects-Code`, cached in `localStorage["pros_code"]`) with **no frontend
  change** — `GET /prospects/meta` reports whether it is on.
- **The catalog lives in the BACKEND repo**, not here — seeded on boot from
  `data/prospects-houston-seed.json`, keyed on slug with `ON CONFLICT DO
  NOTHING`. A redeploy inserts what is new to that file and never overwrites a
  row she has edited.
- **Revenue is a band with a basis attached**, never a bare number: `filing` for
  a public reporter, `estimate` for an outside guess at a private company,
  `not_reported` for a US arm that doesn't break itself out. Keep that
  distinction in any new UI — it is the difference between a figure she can quote
  and one she has to confirm.
- **The target band is $50–100M** (`TARGET_BAND` in `ui.js`), and it is the
  default filter on a first visit. **The seeded catalog does not cover it well
  and cannot be made to** — only ~22 of the 184 records overlap $50–100M and none
  sit wholly inside it, because revenue is publicly knowable only once a company
  is big enough to file or to be written about. Don't "fix" this by inventing
  figures for small private firms; a list that looks right and is wrong is worse
  than a short one. Real coverage comes from the importer.
- **Archive and delete are different, and both exist.** Archive is a PATCH of
  `archived` and loses nothing; the list fetches with `?archived=true` and hides
  them client-side so "Show archived" in Filters can bring one back. Delete is
  real, including for seeded rows — and it **tombstones the slug** in
  `pros_deleted_slugs`, because the seeder inserts any slug it can't find and the
  delete would otherwise undo itself on the next deploy. The ⋯ menu lists
  tombstoned companies with a "Put back" that restores the catalog record only
  (its notes and contacts are gone) — so don't present restore as a full undo.
- **No invented contact data, deliberately.** The seed ships no direct emails and
  no cell numbers, and the officer names it does carry are flagged `unverified`
  (a name from an August filing is wrong by October). Each company instead gets
  one-tap research links built from its own fields — `researchLinks` in `ui.js`:
  Google News, a LinkedIn people search for the CFO/treasurer/controller, EDGAR
  for public filers, the TX entity lookup. **Don't "improve" this by hardcoding
  people** — a stale name on a cold call is worse than a search that works.
- Search and filters run in the browser over one `GET /companies` (~190 KB for
  184 companies), so the list keeps working on a bad connection. Revisit only if
  it passes a few thousand rows.
- Phone-first: every number, email, address and website is a real
  `tel:`/`mailto:`/maps/`https` link, inputs are 16px so iOS doesn't zoom, and
  modals are bottom sheets (`Sheet.jsx`).

## `/patrick` — Patrick's project board

A wall of mini todo boards, one card per app he is still finishing
(`src/pages/patrick/`). Built 2026-08-13. The premise is that **everything is on
one screen**: no project route, no task detail view, no navigation at all. Every
write happens in place on the card. Anything that would need a second screen to
see or change a task does not belong on this page.

- **Backend is `/patrick-board`, not `/patrick`.** The `/patrick` prefix on the
  Sheline backend is 6,000+ lines of Tesla dashboard and sports scraping with its
  own crons; the board is a separate router (`routes/patrickBoard.js`) sharing
  nothing with it. Only the frontend path is `/patrick`.
- **A task is OPEN or DONE and nothing else** (Patrick, 2026-08-13, asked
  directly and against a doing/blocked middle state). Rank is expressed by ORDER
  instead — hence the `↑` on every open row, which is a `PATCH {top:true}` the
  backend resolves to `min(position) - 1` itself. Don't add a status field; add
  a way to order things.
- **The "Next up" strip reads the top open task of each card.** It is not a
  cross-project priority list — there is no ranking to build one from, and
  inventing one would be a number he'd have to maintain.
- **No login, no access code.** Same call as `/prospects`: anyone reaching the
  URL can read and edit. What's exposed is a list of his own side projects. If
  that changes, copy the `PROSPECTS_ACCESS_CODE` switch out of
  `routes/prospects.js` — a dozen lines, no frontend deploy.
- **Deletes are soft, so Undo is a real restore**, not a re-create with new ids.
  Deleting a project keeps its tasks and `POST /projects/:id/restore` brings the
  card back intact. Nothing purges the dead rows.
- **Every write is optimistic and a failure REFETCHES `/state`** rather than
  rolling back by hand. The whole board is one small request, so a refetch is
  both simpler and more truthful — it also picks up edits made on another device.
- The add box handles Enter itself instead of relying on implicit form
  submission. Typing a task and pressing Enter is the single most common action
  on the page; it doesn't get to depend on a browser corner case.
- **Capture is `POST /patrick-board/capture`** — a Siri Shortcut named "Claude"
  dictates a sentence and posts it. Routing is a leading project name
  (`"cellr fix the parser"` → the cellr board), everything else lands in an
  **Inbox** board created on first use and pinned to the front of the wall.
  Matching is done on WORDS, not whitespace tokens, because dictation supplies
  neither punctuation nor hyphens — `"southside app ..."`, `"southside-app ..."`
  and `"Southside App: ..."` all have to hit the same board. Longest name wins,
  which is what keeps `daycare-memory-vault` out of `daycare`.
  - It is the **one endpoint with a key** (`PATRICK_BOARD_CAPTURE_KEY`, sent as
    `X-Capture-Key`), and the key is required — unset returns 503. The rest of
    this API is open because using it means already having the unlisted URL; a
    capture URL lives in a Shortcut and writes on every call.
  - The response carries a `spoken` string ("Added to cellr.") for the Shortcut
    to read back. Naming the board IS the confirmation — it's how you learn the
    prefix was heard the way you meant it.
- **A task can be moved between boards** (`PATCH /tasks/:id {project_id}`, the
  `→` on a task row). This exists *for* capture — an Inbox that can't be filed
  is a dead end — and it appends to the destination rather than carrying its old
  position into a list it has never been ranked against.
- Local dev: `node scripts/patrick-board-local.js` in the backend repo (port
  3003) — `api.js` points at localhost automatically when served from localhost,
  so a UI experiment can't reorder the live board.

## `/gulf-hurricane` — the storm tracker

Rebuilt 2026-08-31 (Patrick: "more like tropicaltidbits.com/storminfo — the fact
I can see the one close to me in Houston"). **The radar map leads and the cards
carry the detail.** In order: the radar-and-track map, a formation-area card for
each disturbance, then a card per storm with the advisory line, the forecast
table and the six NHC graphics.

**A map is back, and it is a different map** (Patrick, 2026-08-31, later the
same day, with a weather.com Houston radar screenshot: "like this weather.com
radar that also has the latest hurricane track"). `RadarMap.jsx` leads the page:
animated RainViewer rain radar UNDER NHC's cone, forecast track and formation
areas, with a play/pause timeline. The cards and the NHC graphics below it are
unchanged.

Read that against what was removed earlier the same day, because the two are
easy to confuse:

- **Removed, and staying removed: `StormMap.jsx` and the "closest to Houston"
  headline** (Patrick, 2026-08-31, both crossed out in a screenshot: "remove
  these two things"). That map drew the track over an empty basemap — it
  answered "where is the storm", which the cards already answer in words. It is
  in git at f86cd79. **Don't put the headline back**, and don't re-add its
  closest-approach line from Houston to the track.
- **What earns the new one its place is the RADAR.** Rain is the one thing on
  this page a picture can say and a card cannot. A map here that is not radar-led
  is the map that was already rejected.
- **The timeline is not decoration.** RainViewer's frames run ~80 minutes back
  and up to ~30 forward (`nowcast`), and observed radar and a nowcast look
  identical on a map. The stamp, the "forecast" label and the divider on the
  scrubber are what keep them apart. `nowcast` is often an EMPTY array — the
  component has to render a loop with no forecast frames at all.
- **The cone is `interactive: false` on purpose.** It is a ~900-point polygon
  covering much of the frame; making it clickable swallows every tap meant for
  the track or the radar underneath.
- **A five-minute refresh is a DIFF, not a rebuild** — of the radar layers and
  of the play head. RainViewer's path for a given timestamp never changes, so
  the layers are keyed on `frame.time` (`radarLayersRef` is a Map) and a refresh
  adds the new frame and drops the one that aged out; rebuilding refetched
  eleven frames of tiles for nothing. The same key restores the frame the reader
  had scrubbed to (`shownTimeRef`) even though its INDEX moves as the window
  slides — otherwise the map jumps back to "now" under someone comparing older
  radar against the cone.
- **The map re-fits only when the framing actually changes** (`appliedFitRef`),
  keyed on which systems are present plus the extent rounded to a degree. The
  page refetches every five minutes and hands the component a new array each
  time; re-fitting on that would yank the view out from under a reader who had
  panned. A storm crawling a few miles between advisories must not re-frame.
- **Both of this page's backend bugs were fixed on 2026-08-31** — the entry
  here used to say they were outstanding, so read it as history:
  - **`forecast[].type` was null on every point**, which is why the Stage column
    was an em dash on every row and the map tooltip never showed a stage. NHC's
    TRACK placemarks carry no stage in their ExtendedData *or* their
    description; it is only in the point's `<styleUrl>` icon. The route reads
    that now and emits **prose** ("Tropical Storm", "Post-Tropical Depression"),
    not a code — so **do not pass `forecast[].type` through `CLASS_LABEL`**, it
    is already spelled out. `storm.classification` is still a code and still
    needs the table.
  - **A disturbance's `id` was an array index** minted before a re-sort, so
    `two-1` meant "whichever area has the best odds". It is now the invest label
    or the area's rounded centre. `RadarMap.jsx`'s fit key stays on `center`
    regardless — same information, no dependency on the backend's rounding.
  - **`CLASS_LABEL` in `storms.js` must stay in step with `STAGE_BY_CLASS` in
    the backend's `services/nhcTrack.js`.** A code in one and not the other makes
    one card contradict itself: the day the Stage column started rendering, an
    `LO` system read "LO" in the pill, "System" in the map tooltip and "Low" in
    the forecast table.
- `leaflet` is lazy-loaded here (`React.lazy` in `index.jsx`), as it is in
  `/drive` and `/hrw` — it is ~150 KB and has no business in the bundle a home
  page visitor downloads. Keep it that way.

- **The nearest storm's graphics open on their own** (`closestStormId` in
  `index.jsx`). Storms only — a disturbance is often closer, but NHC publishes
  no cone, surge or wind-arrival graphic for a system it has not designated, so
  there would be nothing to open. Ranked by `houstonScore`, the same
  backend-computed distance the card prints, so the card that opens is always
  the one showing the smallest number. It opens on MOUNT only: a five-minute
  refresh must never reopen a section the reader closed.

- **Disturbances (invests) are the point of the rebuild, not a bonus.** A system
  is absent from `CurrentStorms.json` until NHC *names* it, so the old page said
  "✓ No active tropical cyclones" while an invest sat in the Gulf — the exact
  situation it exists to warn about. They come from the graphical tropical
  weather outlook via the backend; see `routes/nhc.js` there for how that URL is
  discovered rather than hardcoded.
- **A disturbance card deliberately shows less than a storm card**: an area, two
  formation percentages, and a sentence saying no forecast track exists yet.
  Don't give it a track, a cone, or an intensity — NHC does not publish those
  for an undesignated system and inventing them would be the worst kind of wrong
  on this page.
- **Everything Houston-relative is computed in the BACKEND** (`services/
  stormGeo.js`), not here, so no two places on the page can disagree about a
  distance. `storms.js` holds only presentation — colours, labels, phrasings.
- **Distances are STATUTE MILES**, matching the NHC public advisory and how a
  Houston reader thinks. Nautical miles are the meteorological convention and
  are the wrong unit here.
- **Closest approach is sampled ALONG each forecast leg, not at its vertices.**
  NHC publishes positions 12–24 h apart, so a storm passing offshore makes its
  nearest pass between two of them; reporting the nearest vertex overstates the
  miss badly. That, and the compass/haversine maths, are covered by
  `test/stormGeo.test.js` in the backend repo.
- **Every other storm's graphics stay collapsed behind a tap.** Six full-width
  PNGs per storm is the heaviest thing on the page, so only the nearest one
  expands itself; the rest cost a tap. A figure whose image 404s hides itself
  and reports it upward, and a card whose graphics ALL fail says so and links
  NHC — six dead images otherwise look exactly like a closed section, which is
  how a wrong folder in the API went unnoticed for a day (`/nhc` PR #3).
- **An upstream failure must never render as calm.** `/nhc/current-storms`
  answers HTTP 200 with an `error` field when a product upstream is unreachable,
  so this page checks that field, not just `res.ok`, and the "no named storms"
  panel is gated on the feed having actually answered.

## `/drive` — the in-car dashboard

`src/pages/drive/` renders a full-bleed board for the **Tesla browser**
(~1180x919 on a Model 3/Y): clock, current conditions and a six-day forecast at
the car's own position, an animated rain radar, live/next games for the Astros,
Cowboys, Rockets and both Baylor teams, tappable AI and sports headlines, and
the live Kalshi portfolio. Cardless; in `PRIVATE_TOOLS`; typed into the car by
hand. `drive.css` derives every dimension from one `--u` viewport unit, so
retuning it for a different car screen is one `clamp()`.

**No new backend route, and every source is keyless** — WeatherKit and Kalshi via
the Sheline backend, ESPN for teams and sports headlines, HN Algolia for AI,
RainViewer for radar, Esri for the basemap. That is deliberate: this page is
left running in a car and must not be one expired key away from a blank screen.

Four things are load-bearing and easy to undo by accident:

- **Every ESPN scoreboard call passes `?dates=`.** The bare `/scoreboard` was
  still serving Aug 25 at 9:51am on Aug 26 — its idea of "today" rolls over
  late — so without the explicit date the board reports last night's final as
  the current game. The explicit date is also *cheaper* (~24 KB gzipped for a
  full slate, 1 KB for an empty one).
- **Scoreboards are only polled for leagues that have one of these teams playing
  within two days** (`activeLeagues()` in `data.js`). The car is on LTE; polling
  all five year-round is ~6 MB/hour for nothing.
- **Every poller refires on `visibilitychange`, and a page older than 12 hours
  reloads on wake.** The tab is suspended whenever the car sleeps, and a frozen
  clock next to day-old scores looks exactly like live data. The mount fetch
  ignores visibility on purpose — the car can restore the tab in the background.
- **The basemap is Esri, not CARTO.** `cartocdn` now stamps "API KEY REQUIRED"
  across its free tiles while still returning HTTP 200, so it fails by looking
  broken rather than by erroring. Note Esri serves `{z}/{y}/{x}` — row before
  column. `src/pages/hrw/` still uses CARTO and still shows the watermark.
- **Two map modules are shared with `/gulf-hurricane`, not owned by this page**
  (both extracted 2026-08-31, when that page needed the identical loop):
  `src/lib/basemap.js` (the Esri URLs and the `{z}/{y}/{x}` order) and
  `src/lib/rainviewer.js` (the frame index plus the two probed tile-server
  limits — radar stops at zoom 7 and returns an error IMAGE at HTTP 200 above
  it; `/512/` is a retina tile, not a wider one). `data.js` re-exports
  `fetchRadarFrames` so callers here are unchanged. Don't re-inline either.

The Kalshi card is **read-only and has no controls of any kind**. It shows live
balances on a public unauthenticated route, which was Patrick's explicit call
(2026-08-26) — obscurity only, same as the other unlisted pages here.

A **next-meeting card is deliberately absent, and the Morning Briefing's
Calendar panel was removed on 2026-08-30.** Both were fed by an Outlook
published-ICS URL that Microsoft revoked on 2026-08-28, and it cannot be
re-issued: the Opportune tenant has calendar publishing disabled, so "Shared
calendars" is gone from Outlook's settings entirely. There is no link to
republish. Reviving Opportune calendar data here means Microsoft Graph with a
registered app and tenant admin consent — do not wire another ICS URL. (The
`/calendar` route on the backend was deleted in the same pass; Briefly's
per-user iCal feeds are unrelated and untouched.)

## Conventions

- One folder per tool under `src/pages/`; pages are self-contained single
  files with inline style objects (no CSS-in-JS lib in new code).
- New code uses `fetch` and `date-fns`. `axios`, `moment`, and MUI appear only
  in older pages (tesla-dashboard, elite-edge, zargle) — don't spread them.
- API base URLs are `const API_BASE = "..."` at the top of the page file.
- **The logo geometry is duplicated on purpose** — `public/favicon.svg` (the
  tab) and `src/components/Logo.jsx` (inline, so the sticky navbar never flashes
  a late-loading image). Edit one, edit the other. `public/apple-touch-icon.png`
  and `public/images/logo-512.png` are generated from it with `rsvg-convert`;
  see `docs/logo-brief.md` for the command and the brand rationale.

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
- **`/engine-limits` is READ-ONLY on purpose.** It shows every engine's unit,
  max bet and caps in one place (`GET /kalshi-limits`, one call, rendered
  verbatim — the selection and ordering of the rows is `LIMIT_RANK` in the
  backend's `services/engineOverrides.js`, not a list in this repo). It has no
  controls at all: a page built to put twelve money limits on one screen is the
  wrong place to be one mis-tap from raising one, so each card links to the
  engine's own PIN-gated screen instead. Keep it that way. kalshi-live's Limits
  tab renders the same payload — add a knob to the backend map and it appears
  on both with no deploy here.
- **Do not re-enable the recurring push crons** in the backend's
  `routes/bullion_ventures.js` — hard-disabled 2026-07-22 (commented out, not
  env-gated) because the auto-bettor's per-bet pushes made them redundant
  spam. The code comments there say why; manual `/push/test` still works.
- **Trip Planner has TWO different PINs, and they are not interchangeable.**
  The *access* PIN is per trip, chosen when the trip is created, cached in
  `localStorage["bv_trip_access_<slug>"]` and sent as `x-trip-access-pin` on
  every request — it's what the families type to open a trip. The *admin* PIN
  is one shared value (`TRIP_PLANNER_PIN`, header `x-trip-pin`) and only guards
  deletes and the recycle bin. Sharing a trip must never hand anyone the second
  one. **Every backend call in `Trip.jsx` must go through `tripFetch()`** from
  `tripPin.js`; a raw `fetch` 401s on a locked trip and looks to the user like a
  save that silently did nothing. Trips created before 2026-08-13 have no access
  PIN and stay open — that's grandfathering, not a supported mode.
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
