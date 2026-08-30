TODO

- ~~in the elite-edge-advisors repo i want to pull that into bullion ventures. i want to add it to the home page as well.~~
  **DONE 2026-07-24.** Ported 2026-07-17 (`/elite-edge-advisors`: bet board + the JSON-input
  modal in `src/pages/elite-edge-advisors/InputBets.jsx`, no account-creation machinery, per
  the spec below); homepage card added 2026-07-24. Details in `docs/HANDOFF.md`.

-what you'll be carrying over is the account screen, the page that loads first. and then from the admin screen i want the input that takes the json and does the magic with it to save the bets. so maybe just add a btn on the top of the screen that opens a modal to input and save the bets. we DONT need any of the account creation stuff etc, just what i described.

---

- **Learn & Play Food Explorer — food art needed (31 restaurants live).**
  Restaurant picker in `childrens-game` → `src/screens/FoodScreen.js`; data in
  `src/data/restaurants.js`. Tap a restaurant, the grid filters to that
  restaurant's real kids-meal items. **31 restaurants, 29 showing.** Pictures
  come from the app's own set in `assets/images/food/` — we do NOT scrape
  restaurants' photos. Scope decision (Patrick, 2026-08-30): ship only what
  current art covers, so everything below is real menu food we can't show yet.

  Match the existing style — photographic, ~200-700px — and COMPRESS: the 36
  current files are already 35MB and `childrens-game/CLAUDE.md` forbids adding
  uncompressed media (repo is ~260MB of history).

  **Ranked by how many of the 31 restaurants each unblocks.** The top two are
  worth far more than everything else combined — `milk` and `grilled_cheese`
  together touch 21 restaurants.

  | # | file to add | unblocks |
  |---|---|---|
  | 1 | `milk.png` | **11** |
  | 2 | `grilled_cheese.png` | **10** |
  | 3 | `corn_dog.png` | **7** |
  | 4 | `apple_juice.png` | **5** |
  | 5 | `quesadilla.png` | **5** |
  | 6 | `grilled_chicken.png` | **4** |
  | 7 | `ice_cream.png` | 3 |
  | 8 | `soft_taco.png` | 3 |
  | 9 | `mashed_potatoes.png` | 2 |
  | 10 | `broccoli.png` | 2 |

  Then the single-restaurant long tail: `applesauce` `onion_rings` `egg_roll`
  `coleslaw` `sandwich` `soup` `mini_sub` `breadsticks` `cinnamon_sticks`
  `steak_bites` `wings` `grapes` `waffle` `french_toast` `fried_fish`
  `chicken_leg` `chopped_steak` `burrito` `churros`, plus the Tex-Mex block
  `cheese_enchilada` `tamale` `mexican_rice` `refried_beans`.

  **Two restaurants show nothing at all today** — La Mexicana and Torchy's
  Tacos. Both kids menus are entirely Tex-Mex (quesadilla, taco, tamale, rice,
  beans). They sit in the data with empty `items` and are filtered out by
  `RESTAURANTS_WITH_ART`; they appear on their own once that art lands.

  **Need no new art at all:** Chick-fil-A, Denny's, Cracker Barrel.

  **Data confidence:** each entry records a `source`. `"official"` (6 of them)
  was read off the restaurant's own published menu. `"search"` (25) came from
  published chain menu listings — good but they lag seasonal menu changes, so
  re-check against the chain's own menu before leaning on one.
