TODO

- ~~in the elite-edge-advisors repo i want to pull that into bullion ventures. i want to add it to the home page as well.~~
  **DONE 2026-07-24.** Ported 2026-07-17 (`/elite-edge-advisors`: bet board + the JSON-input
  modal in `src/pages/elite-edge-advisors/InputBets.jsx`, no account-creation machinery, per
  the spec below); homepage card added 2026-07-24. Details in `docs/HANDOFF.md`.

-what you'll be carrying over is the account screen, the page that loads first. and then from the admin screen i want the input that takes the json and does the magic with it to save the bets. so maybe just add a btn on the top of the screen that opens a modal to input and save the bets. we DONT need any of the account creation stuff etc, just what i described.

---

- **Learn & Play Food Explorer — restaurant kids-menus needs new food art.**
  Restaurant picker added to `childrens-game` → `src/screens/FoodScreen.js`
  (tap a restaurant, the grid filters to that restaurant's kids-meal items).
  Data lives in `childrens-game/src/data/restaurants.js`. Pictures come from the
  app's own set in `assets/images/food/` — we are NOT scraping restaurants'
  photos. Scope decision (Patrick, 2026-08-30): ship only what current art
  covers, so every item below is real menu food we can't show yet.

  Match the existing style — photographic, ~200-700px — and COMPRESS: the 36
  current files are already 35MB and `childrens-game/CLAUDE.md` forbids adding
  uncompressed media (repo is ~260MB of history).

  **Ranked by how many restaurants each unblocks.** Every item was read off a
  real published menu on 2026-08-30, not guessed.

  | # | file to add | unblocks |
  |---|---|---|
  | 1 | `grilled_cheese.png` | **3** — Barnaby's, Beck's Prime, Cafe Express |
  | 2 | `corn_dog.png` | **2** — Barnaby's, James Coney Island |
  | 3 | `milk.png` | **2** — Beck's Prime, McDonald's |
  | 4 | `apple_juice.png` | **2** — Beck's Prime, James Coney Island |
  | 5 | `ice_cream.png` | 1 — Barnaby's |
  | 6 | `quesadilla.png` | La Mexicana |
  | 7 | `cheese_enchilada.png` | La Mexicana |
  | 8 | `soft_taco.png` | La Mexicana |
  | 9 | `tamale.png` | La Mexicana |
  | 10 | `mexican_rice.png` | La Mexicana |
  | 11 | `refried_beans.png` | La Mexicana |

  Items 6-11 are one block: La Mexicana's kids menu is four Tex-Mex plates each
  served with rice and beans, so it shows **nothing at all** until all six
  exist. It is in the data with an empty `items` and is filtered out of the
  picker by `RESTAURANTS_WITH_ART` — it appears on its own once the art lands.
  That same six unblocks the other Tex-Mex spots in these neighborhoods
  (Molina's, Berryhill, Tacos A Go Go, Los Tios, Chuy's, Lupe Tortilla).

  Live now with art (6): Barnaby's Cafe 7 items, Beck's Prime 5, James Coney
  Island 5, Cafe Express 4, McDonald's 4, Chick-fil-A 4 (Chick-fil-A needs no
  new art at all).

  **Still to do — get to 30 restaurants.** Each one needs its real kids menu
  read; chain kids-menu URLs are mostly guesses that 404, so the reliable
  method is: find the menu from the site's own nav, screenshot it, transcribe.
  Fast food maps onto existing art far better than Tex-Mex does (nuggets →
  chicken_tenders, apple slices → apple, fries → french_fries), so it is the
  cheapest way to grow the list.
