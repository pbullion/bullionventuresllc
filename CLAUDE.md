# Agent notes for bullionventuresllc

Vite + React marketing/tools site for Bullion Ventures LLC. Single SPA; each
project/tool is a page under `src/pages/`, wired up in `src/App.jsx`.

## Deploy

- **Hosted on AWS Amplify.** It auto-deploys on push to the `master` branch —
  there is no manual deploy step. Push to `origin/master` and Amplify builds and
  ships it. (No `vercel.json`/`netlify.toml` in the repo for this reason.)

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
   not skip it.

## Backend

Data-driven tools call the shared Sheline backend at
`https://sheline-art-website-api.herokuapp.com` (e.g. `/kalshi` for My Bets &
Totals Value, `/nhc/current-storms` for the Gulf Hurricane screen). That backend
lives in the `shelineArtWebsiteAPI` repo and deploys separately via
`git push heroku main`.
