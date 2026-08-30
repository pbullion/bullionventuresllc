TODO

- ~~in the elite-edge-advisors repo i want to pull that into bullion ventures. i want to add it to the home page as well.~~
  **DONE 2026-07-24.** Ported 2026-07-17 (`/elite-edge-advisors`: bet board + the JSON-input
  modal in `src/pages/elite-edge-advisors/InputBets.jsx`, no account-creation machinery, per
  the spec below); homepage card added 2026-07-24. Details in `docs/HANDOFF.md`.

-what you'll be carrying over is the account screen, the page that loads first. and then from the admin screen i want the input that takes the json and does the magic with it to save the bets. so maybe just add a btn on the top of the screen that opens a modal to input and save the bets. we DONT need any of the account creation stuff etc, just what i described.

---

- **Learn & Play Food Explorer — food art needed (49 restaurants live).**
  Restaurant picker in `childrens-game` → `src/screens/FoodScreen.js`; data in
  `src/data/restaurants.js`. Tap a restaurant, the grid filters to that
  restaurant's real kids-meal items. **49 restaurants, 45 showing**, averaging
  3.9 items each. Pictures come from the app's own set in
  `assets/images/food/` — we do NOT scrape restaurants' photos. Scope decision
  (Patrick, 2026-08-30): ship only what current art covers, so everything below
  is real menu food we can't show yet.

  Match the existing style — photographic, ~200-700px — and COMPRESS: the 36
  current files are already 35MB and `childrens-game/CLAUDE.md` forbids adding
  uncompressed media (repo is ~260MB of history).

  **Ranked by how many of the 49 restaurants each unblocks.** The first two are
  worth more than the entire rest of the list combined.

  | # | file to add | unblocks |
  |---|---|---|
  | 1 | `grilled_cheese.png` | **18** |
  | 2 | `milk.png` | **16** |
  | 3 | `corn_dog.png` | **8** |
  | 4 | `apple_juice.png` | **8** |
  | 5 | `quesadilla.png` | **8** |
  | 6 | `ice_cream.png` | **7** |
  | 7 | `soft_taco.png` | 6 |
  | 8 | `grilled_chicken.png` | 5 |
  | 9 | `applesauce.png` | 4 |
  | 10 | `broccoli.png` | 4 |
  | 11 | `mexican_rice.png` | 4 |
  | 12 | `refried_beans.png` | 4 |

  Long tail, one restaurant each: `waffle` `french_toast` `hash_browns`
  `mashed_potatoes` `coleslaw` `onion_rings` `egg_roll` `sandwich` `soup`
  `mini_sub` `breadsticks` `cinnamon_sticks` `steak_bites` `wings` `grapes`
  `ravioli` `burrito` `churros` `fried_fish` `chicken_leg` `chopped_steak`
  `roast_beef_slider` `cheese_enchilada` `tamale`.

  **Four restaurants show nothing at all** — La Mexicana, Torchy's Tacos, Lupe
  Tortilla, Taco Cabana. All four kids menus are entirely Tex-Mex. They sit in
  the data with empty `items`, filtered out by `RESTAURANTS_WITH_ART`, and
  appear on their own once `quesadilla` + `soft_taco` + `mexican_rice` +
  `refried_beans` exist.

  **Need no new art at all:** Chick-fil-A, Denny's, Cracker Barrel, Cheddar's.
  **Richest entries:** Cheesecake Factory (9 items), Applebee's and Chili's (6).

  **Data confidence:** each entry records a `source`. `"official"` (6) was read
  off the restaurant's own published menu. `"search"` (43) came from published
  chain menu listings, which lag seasonal changes — re-check before leaning on
  one. Molina's Cantina and Goode Company were attempted and deliberately left
  out: neither publishes kids items anywhere findable, and guessing would put
  food on a kid's screen the restaurant may not serve.
