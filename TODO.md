TODO

- ~~in the elite-edge-advisors repo i want to pull that into bullion ventures. i want to add it to the home page as well.~~
  **DONE 2026-07-24.** Ported 2026-07-17 (`/elite-edge-advisors`: bet board + the JSON-input
  modal in `src/pages/elite-edge-advisors/InputBets.jsx`, no account-creation machinery, per
  the spec below); homepage card added 2026-07-24. Details in `docs/HANDOFF.md`.

-what you'll be carrying over is the account screen, the page that loads first. and then from the admin screen i want the input that takes the json and does the magic with it to save the bets. so maybe just add a btn on the top of the screen that opens a modal to input and save the bets. we DONT need any of the account creation stuff etc, just what i described.

---

- **Learn & Play Food Explorer — food art needed (74 restaurants live).**
  Restaurant picker in `childrens-game` → `src/screens/FoodScreen.js`; data in
  `src/data/restaurants.js`. Tap a restaurant, the grid filters to that
  restaurant's kids-meal items. **74 restaurants, 69 showing.** Pictures come
  from the app's own set in `assets/images/food/` — we do NOT scrape
  restaurants' photos. Scope decision (Patrick, 2026-08-30): ship only what
  current art covers, so everything below is menu food we can't show yet.

  Match the existing style — photographic, ~200-700px — and COMPRESS: the 36
  current files are already 35MB and `childrens-game/CLAUDE.md` forbids adding
  uncompressed media (repo is ~260MB of history).

  **Ranked by how many of the 74 restaurants each unblocks.**

  | # | file to add | unblocks |
  |---|---|---|
  | 1 | `grilled_cheese.png` | **22** |
  | 2 | `milk.png` | **17** |
  | 3 | `quesadilla.png` | **14** |
  | 4 | `soft_taco.png` | **12** |
  | 5 | `mexican_rice.png` | **11** |
  | 6 | `refried_beans.png` | **10** |
  | 7 | `corn_dog.png` | **9** |
  | 8 | `apple_juice.png` | **9** |
  | 9 | `ice_cream.png` | 7 |
  | 10 | `grilled_chicken.png` | 5 |

  **The four Tex-Mex items (#3-#6) are effectively one job** — quesadilla, soft
  taco, mexican rice, refried beans. Doing all four unlocks the five
  restaurants that currently render EMPTY (La Mexicana, Torchy's, Lupe
  Tortilla, Taco Cabana, Tacos A Go Go) and fills out ten more Tex-Mex spots.
  In a Houston app this is arguably higher value than its raw rank suggests.

  `grilled_cheese` remains the single best image at 22 restaurants.

  Long tail, one or two restaurants each: `applesauce` `broccoli` `waffle`
  `french_toast` `hash_browns` `mashed_potatoes` `coleslaw` `onion_rings`
  `egg_roll` `sandwich` `soup` `mini_sub` `breadsticks` `cinnamon_sticks`
  `steak_bites` `wings` `grapes` `ravioli` `burrito` `churros` `fried_fish`
  `chicken_leg` `chopped_steak` `roast_beef_slider` `cheese_enchilada`
  `tamale` `brisket` `sausage_link` `gyro` `fried_rice` `orange_chicken`.

  **Need no new art at all:** Chick-fil-A, Denny's, Cracker Barrel, Cheddar's,
  Someburger, Star Pizza.
  **Richest entries:** Cheesecake Factory (9 items), Applebee's and Chili's (6).

  **Data confidence** — each entry records a `source`:
  - `"official"` (7) — read off the restaurant's own published menu.
  - `"search"` (42) — from published chain menu listings; these lag seasonal
    changes, so re-check before leaning on one.
  - `"inferred"` (25) — the restaurant publishes no kids items anywhere
    findable, so the list is inferred from cuisine (Patrick's call). Only
    near-universal items: tenders/fries/mac/burger/pizza for American,
    quesadilla/taco/rice/beans for Tex-Mex. Nothing distinctive to a single
    restaurant is invented, and each carries an `inferredFrom` note.

  Promoting an `inferred` or `search` entry to `official` just means someone
  actually reads that restaurant's menu — the data shape does not change.
