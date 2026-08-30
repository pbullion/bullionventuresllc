TODO

- ~~in the elite-edge-advisors repo i want to pull that into bullion ventures. i want to add it to the home page as well.~~
  **DONE 2026-07-24.** Ported 2026-07-17 (`/elite-edge-advisors`: bet board + the JSON-input
  modal in `src/pages/elite-edge-advisors/InputBets.jsx`, no account-creation machinery, per
  the spec below); homepage card added 2026-07-24. Details in `docs/HANDOFF.md`.

-what you'll be carrying over is the account screen, the page that loads first. and then from the admin screen i want the input that takes the json and does the magic with it to save the bets. so maybe just add a btn on the top of the screen that opens a modal to input and save the bets. we DONT need any of the account creation stuff etc, just what i described.

---

- **Learn & Play Food Explorer — restaurant kids-menus needs new food art.**
  Adding a restaurant picker to `childrens-game` → `src/screens/FoodScreen.js`
  (tap a restaurant, the grid filters to that restaurant's kids-meal items).
  Pictures come from the app's own set in `assets/images/food/` — we are NOT
  scraping restaurants' photos. The 36 existing images skew American
  diner/breakfast, but the target neighborhoods (Garden Oaks, River Oaks,
  Montrose, Oak Forest, Timbergrove, Memorial) are Tex-Mex heavy, so several
  kids menus map to zero art. Scope decision 2026-08-30: ship only what current
  art covers, so every item below is a restaurant that renders thin or empty
  until the art exists.

  Match the existing style: photographic, on white, ~200–700px, and COMPRESS —
  the 36 current files are already 35MB and `childrens-game/CLAUDE.md` forbids
  adding uncompressed media (repo is ~260MB of history).

  **CONFIRMED — read off a real menu, blocking a specific restaurant:**
  | file to add | item | blocks |
  |---|---|---|
  | `corn_dog.png` | Corn Dog | James Coney Island (only gap — other 5 items map) |
  | `quesadilla.png` | Cheese Quesadilla | La Mexicana |
  | `cheese_enchilada.png` | Cheese Enchilada | La Mexicana |
  | `soft_taco.png` | Ground Beef Soft Taco | La Mexicana |
  | `tamale.png` | Pork Tamale | La Mexicana |
  | `mexican_rice.png` | Rice (every La Mexicana kids plate) | La Mexicana |
  | `refried_beans.png` | Beans (every La Mexicana kids plate) | La Mexicana |
  | `apple_juice.png` | Apple Juice (kids-meal drink choice) | James Coney Island |

  Without the six Tex-Mex items, La Mexicana shows **nothing at all** — all four
  of its kids plates are quesadilla / enchilada / taco / tamale.

  **EXPECTED — standard kids-menu items with no art, not yet tied to a
  specific restaurant (18 of 20 menus still to read):**
  `grilled_cheese` · `fish_sticks` · `pbj` · `broccoli` · `mashed_potatoes` ·
  `ice_cream` · `side_salad` · `milk`

  Already covered, no art needed: burger, hot_dog, chicken_tenders,
  mac_and_cheese, french_fries, tater_tots, pizza, spaghetti, noodles, corn,
  green_beans, apple, cookie.

  Verified working so far: **James Coney Island** 5/6 items map, **Beck's Prime**
  4/4 map. Tex-Mex spots (La Mexicana, Molina's, Berryhill, Tacos A Go Go,
  Los Tios, Chuy's, Lupe Tortilla) are the ones that need this art to be viable.
