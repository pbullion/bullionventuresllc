/* Totals an ingredient that more than one meal needs, so the shopping list says
 * "2 lb breakfast sausage" once instead of "1 lb" twice on two different days.
 *
 * This exists because of how the list is BUILT: an ingredient row belongs to the
 * meal that needs it (tp_items.meal_id), which is right for the meal cards and
 * wrong for the store. Sunday's breakfast casserole and Monday's sausage balls
 * each want a pound of sausage and each want a can of crescent rolls; shopping
 * from the raw rows means four separate lines and a real chance of coming home
 * with half of what the week needs.
 *
 * The grouping is deliberately CONSERVATIVE. A wrong merge is much worse than a
 * missed one: a missed merge shows you two lines that add up fine in your head,
 * a wrong merge silently tells you to buy one bag of cheese when you needed two.
 * So names group only on an exact normalized match or an explicit alias below —
 * nothing is inferred from substrings, stemming, or word overlap.
 */

/* Same canonical spellings the backend stores (see cleanUnit in
 * routes/tripPlanner.js). Duplicated on purpose rather than fetched: this file
 * also has to normalize the 39 rows that were typed in before units existed.
 * If you add one, add it in BOTH places or quantities stop totalling. */
const UNIT_ALIASES = {
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  oz: "oz", ounce: "oz", ounces: "oz",
  c: "cup", cup: "cup", cups: "cup",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  // Deliberately no bare "t"/"T" — see the note in routes/tripPlanner.js. A
  // capital T is a tablespoon and a lowercase t is a teaspoon; a
  // case-insensitive map has to guess, and guessing wrong is a 3x error.
  tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  can: "can", cans: "can",
  pkg: "pkg", package: "pkg", packages: "pkg", pack: "pkg", packs: "pkg",
  bottle: "bottle", bottles: "bottle",
  bag: "bag", bags: "bag",
  box: "box", boxes: "box",
  jar: "jar", jars: "jar",
  dozen: "dozen",
  ct: "ct", count: "ct",
  qt: "qt", quart: "qt", quarts: "qt",
  gal: "gal", gallon: "gal", gallons: "gal",
};

export function normalizeUnit(unit) {
  const raw = String(unit || "").trim();
  if (!raw) return "";
  return UNIT_ALIASES[raw.toLowerCase().replace(/\.$/, "")] || raw;
}

/* Abbreviations stay as they are — nobody writes "2 lbs of flour" on a list and
 * "2 tsps" reads like a typo. Only the words that look wrong unpluralized get
 * an s. */
const PLURAL = {
  cup: "cups", can: "cans", bottle: "bottles", bag: "bags", box: "boxes",
  jar: "jars", pkg: "pkgs", qt: "quarts", gal: "gallons", loaf: "loaves", head: "heads",
};

// Only a quantity ABOVE one pluralizes: "¾ cups milk" reads like a typo, and so
// does "0.5 cans". Anything at or under 1 keeps the singular.
function pluralize(unit, qty) {
  if (!PLURAL[unit] || !(Number(qty) > 1)) return unit;
  return PLURAL[unit];
}

/* Cooking quantities are fractions on the card and floats in the column: the
 * casserole's "3/4 cup milk" is stored 0.75 and "1/8 tsp pepper" is 0.125.
 * Rendering those back as decimals makes a familiar recipe unreadable, so the
 * common kitchen fractions get their glyph back. Anything that isn't one of
 * them falls through to a trimmed decimal rather than being forced into the
 * nearest fraction — "0.35 lb" is honest, "1/3 lb" would be a lie. */
const FRACTIONS = [
  [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.375, "⅜"], [0.5, "½"],
  [0.625, "⅝"], [2 / 3, "⅔"], [0.75, "¾"], [0.875, "⅞"],
];

export function formatQty(n) {
  if (n == null || !Number.isFinite(Number(n))) return "";
  const v = Number(n);
  const whole = Math.floor(v);
  const frac = v - whole;
  if (frac < 0.001) return String(whole);
  const hit = FRACTIONS.find(([f]) => Math.abs(frac - f) < 0.01);
  if (hit) return whole ? `${whole}${hit[1]}` : hit[1];
  return String(Math.round(v * 100) / 100);
}

export function formatAmount(qty, unit) {
  const u = normalizeUnit(unit);
  const q = formatQty(qty);
  if (!q) return u; // "a bag of ice" — unit with no number is still worth saying
  return u ? `${q} ${pluralize(u, Number(qty))}` : q;
}

/* Names that mean the same grocery purchase. LEFT side is the normalized form
 * that appears on a row; RIGHT side is what it counts as.
 *
 * Every entry here is a judgement that two different strings send you to the
 * same shelf, so each one is a deliberate addition, never a pattern. The list
 * below came from reading the actual Labor Day rows against the recipes, not
 * from guessing at what people might type:
 *
 *   - The casserole says "shredded cheddar cheese", the Meat Church recipe says
 *     "shredded sharp cheddar cheese", and a row typed in August just says
 *     "cheese". The first two are one bag. "cheese" is left ALONE — it was
 *     typed for taco night and might be a Mexican blend, and merging it would
 *     quietly under-buy the cheddar.
 *   - "crescent dinner rolls" and "crescent rolls" are the same can.
 *   - "jimmy dean sausage" (the casserole names the brand) and "breakfast
 *     sausage" (what Meat Church calls it) are the same roll of sausage.
 *     "smoked sausage", "lil smokies" and "boudain" are NOT — different aisle
 *     habits, different products, and they stay separate.
 */
const NAME_ALIASES = {
  "shredded cheddar cheese": "cheddar cheese",
  "shredded sharp cheddar cheese": "cheddar cheese",
  "sharp cheddar cheese": "cheddar cheese",
  "cheddar cheese, shredded": "cheddar cheese",
  "crescent dinner rolls": "crescent rolls",
  "crescent roll": "crescent rolls",
  "jimmy dean sausage": "breakfast sausage",
  "jimmy dean breakfast sausage": "breakfast sausage",
  "pork breakfast sausage": "breakfast sausage",
};

export function normalizeName(name) {
  const n = String(name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,]+$/, "")
    .trim();
  return NAME_ALIASES[n] || n;
}

/* Sums the parts of one group, per unit.
 *
 * Units are only added together when they MATCH. 8 oz of cheddar and 2 cups of
 * cheddar are the same cheese and not the same measurement, and there is no
 * honest conversion without knowing the density of shredded cheese — so the row
 * reads "8 oz + 2 cups" and lets the person holding the bag decide. Guessing a
 * conversion here would produce a confident number that is wrong, which is the
 * one outcome a shopping list cannot afford. Same reasoning as the "Other"
 * bucket in groceryAisles.js.
 *
 * Parts with no quantity at all contribute nothing to the total and are counted
 * separately, so a rolled-up row can say "2 lb (+1 more)" rather than pretending
 * the unquantified row doesn't exist.
 */
export function totalParts(parts) {
  const byUnit = new Map(); // insertion-ordered, so the first unit seen leads
  let unquantified = 0;
  for (const p of parts) {
    if (p.qty == null || !Number.isFinite(Number(p.qty))) {
      unquantified += 1;
      continue;
    }
    const u = normalizeUnit(p.unit);
    byUnit.set(u, (byUnit.get(u) || 0) + Number(p.qty));
  }
  const segments = [...byUnit.entries()].map(([unit, qty]) =>
    formatAmount(Math.round(qty * 10000) / 10000, unit)
  );
  return { text: segments.join(" + "), segments, unquantified };
}

/* Groups a category's items into shopping rows.
 *
 * Returns one entry per distinct ingredient, carrying every underlying tp_items
 * row so the UI can show the per-meal breakdown and tick them all off together.
 *
 * Order out is first-appearance order, which is the order the rows arrived in —
 * callers roll up FIRST and sort the result (sortByName / groupByAisle), so
 * nothing here needs to be sorted and the order this returns is not what ends
 * up on screen. It only has to be deterministic, so a re-render doesn't shuffle
 * two rows that sort equal.
 *
 * `parts.length === 1` is the ordinary case and should render exactly like the
 * list always has — the rollup is invisible until something actually overlaps.
 */
export function rollUpItems(items) {
  const groups = new Map();
  for (const item of items) {
    const key = normalizeName(item.name);
    if (!groups.has(key)) groups.set(key, { key, parts: [] });
    groups.get(key).parts.push(item);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    name: displayName(g),
    // Every underlying row has to be ticked for the line to count as bought.
    checked: g.parts.every((p) => p.checked),
    total: totalParts(g.parts),
  }));
}

/* What a rolled-up row calls itself.
 *
 * A row typed as "Jimmy Dean Sausage" and a row typed as "Breakfast Sausage"
 * merge into one line, and picking whichever happened to sort first labels the
 * combined 2 lb with one meal's brand — it reads as if both meals wanted Jimmy
 * Dean. When the merged rows disagree on wording the line falls back to the
 * shared name they were matched on; the per-meal breakdown underneath still
 * shows exactly what each recipe asked for. A group whose rows all say the same
 * thing keeps that text verbatim, capitalisation and all. */
function displayName(g) {
  const distinct = new Set(g.parts.map((p) => String(p.name).trim()));
  if (distinct.size === 1) return g.parts[0].name;
  return g.key.charAt(0).toUpperCase() + g.key.slice(1);
}
