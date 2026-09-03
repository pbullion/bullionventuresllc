/* Sorts a grocery list into store aisles, so the shopping trip is one pass
 * through the store instead of criss-crossing it — the list arrives grouped by
 * the meal each ingredient came from, which is the least useful order to shop in.
 *
 * FIRST MATCH WINS, and the order below is load-bearing, not alphabetical:
 *
 *   - Bakery sits above Meat so "Hot Dog Buns" and "Hamburger Buns" land in
 *     bakery instead of being grabbed by the "hot dog" / "burger" meat patterns.
 *     "Hot Dogs" has no bun/bread word, so it still falls through to meat.
 *   - Produce sits above Pantry so "green beans" is produce while a bare "beans"
 *     is a pantry can. Produce therefore matches ONLY "green bean", never "bean".
 *   - Frozen and Drinks sit above Pantry so "ice cream" and "juice" don't get
 *     swallowed by the broad pantry list.
 *   - "ham" is anchored with word boundaries; without them it matches
 *     "hamburger". Same for "ice" (vs "ice cream") and "corn" (vs "cornstarch").
 *   - Produce claims only a QUALIFIED or PLURAL pepper — "bell pepper", "green
 *     pepper", "peppers" — and lets a bare "Pepper" fall through to the spice
 *     rack in Pantry, which is what a recipe means by it. It used to match the
 *     bare singular and filed the breakfast casserole's ⅛ tsp of black pepper
 *     under Produce.
 *   - "meat" is anchored against "Meat Church", a BBQ rub brand. Without it the
 *     sausage-ball recipe's Holy Cow rub was sent to the butcher counter.
 *   - Two negative lookaheads fix collisions the ordering alone cannot, because
 *     they run the other way: "garlic bread" is bakery but Produce is checked
 *     first and matched the garlic, and "bread crumbs" is pantry but bakery's
 *     bare "bread" claimed it. Both were caught by running the real list through
 *     this file rather than by reading it.
 *
 * Anything unmatched lands in "Other" rather than being guessed at — a wrong
 * aisle sends you to the far side of the store, an honest "Other" doesn't.
 */

const AISLES = [
  {
    label: "Produce",
    re: /\b(lettuce|tomato|onion|avocado|potato|apple|banana|lime|lemon|cilantro|garlic(?!\s*bread)|cucumber|celery|carrot|spinach|salad|kale|cabbage|squash|zucchini|watermelon|melon|strawberr|blueberr|raspberr|berries|grape|broccoli|mushroom|jalapen|jalapeño|bell pepper|green pepper|peppers\b|green bean|asparagus|corn\b|fruit|veggie|vegetable|herb|lettuce|scallion|shallot|ginger|pineapple|peach|pear|orange|cantaloupe)/i,
  },
  {
    label: "Bakery & bread",
    re: /\b(bread(?!\s*crumb)|bun|buns|roll|rolls|tortilla|croissant|crosant|bagel|kolache|donut|doughnut|muffin|biscuit|pita|baguette|cake|pie crust|hoagie|sub roll)/i,
  },
  {
    label: "Meat & seafood",
    re: /\b(beef|steak|brisket|ribs|sirloin|tenderloin|ground meat|ground turkey|meat\b(?!\s*church)|chicken|wings|pork|bacon|sausage|smokies|boudain|boudin|hot ?dog|frank|burger|patt(?:y|ies)|\bham\b|turkey|salami|pepperoni|shrimp|fish|salmon|tilapia|crab|crawfish|oyster|lobster|deli)/i,
  },
  {
    label: "Dairy & eggs",
    re: /\b(milk|cheese|queso|egg|eggs|butter|yogurt|yoghurt|cream cheese|sour cream|half and half|creamer|whipped cream)/i,
  },
  {
    label: "Frozen",
    re: /\b(frozen|ice cream|popsicle|freeze pop|frozen pizza|hash ?brown|tater tot|waffle|pizza roll)/i,
  },
  {
    label: "Drinks",
    re: /\b(water|beer|wine|seltzer|soda|coke|sprite|dr pepper|juice|coffee|tea\b|gatorade|lemonade|liquor|vodka|whiskey|tequila|rum|margarita|mixer|koolaid|kool-aid)/i,
  },
  {
    label: "Pantry & snacks",
    re: /\b(rice|bean|pasta|noodle|sauce|salsa|ketchup|mustard|mayo|mayonnaise|relish|pickle|oil|vinegar|sugar|flour|salt|\bpepper\b|peppercorn|spice|seasoning|rub\b|bisquick|baking mix|pancake mix|baking powder|baking soda|chips|tortilla chips|queso dip|dip\b|cereal|oat|granola|peanut butter|jelly|jam\b|honey|syrup|broth|stock\b|can\b|canned|crackers|cookies|candy|marshmallow|smore|s'more|chocolate|popcorn|nuts|snack|bread crumbs|panko|taco shell|taco seasoning|ranch|bbq|barbecue)/i,
  },
  {
    label: "Ice & household",
    re: /\b(\bice\b|paper towel|napkin|foil|aluminum|ziploc|zip ?lock|baggie|trash bag|garbage bag|plate|cup\b|cups|utensil|fork|spoon|knife|solo|charcoal|propane|lighter|matches|sunscreen|bug spray|soap|detergent|sponge|toilet paper|wipes)/i,
  },
];

export const AISLE_ORDER = [...AISLES.map((a) => a.label), "Other"];

/* The aisle for one item name. */
export function aisleFor(name) {
  const n = String(name || "").toLowerCase();
  for (const a of AISLES) if (a.re.test(n)) return a.label;
  return "Other";
}

/* Ticked rows sink. Every checklist on the trip page sorts through here, and
 * they all answer the same question — what is still left to do — which an A-Z
 * list stops answering the moment half of it is struck through and scattered
 * among the rest. Checked rows go to the bottom of whatever group they are in
 * (their aisle, their family) rather than to the bottom of the page, so the
 * heading above a row still tells the truth about it.
 *
 * Sorting is locale-aware and case-insensitive so "Boudain" and "beans"
 * interleave the way a person reads them rather than uppercase-first.
 *
 * `checked` is read the same way off a raw tp_items row and off a rolled-up
 * shopping row — the rollup sets it only when every part is ticked, which is
 * the same "this is done" the checkbox draws. A row with no `checked` field at
 * all counts as unchecked and keeps its A-Z place. */
function byDoneThenName(a, b) {
  if (Boolean(a.checked) !== Boolean(b.checked)) return a.checked ? 1 : -1;
  return String(a.name).localeCompare(String(b.name), "en", { sensitivity: "base" });
}

/* Groups items into aisles and sorts inside each, returning them in
 * store-walk order with empty aisles dropped. */
export function groupByAisle(items) {
  const buckets = new Map(AISLE_ORDER.map((label) => [label, []]));
  items.forEach((item) => buckets.get(aisleFor(item.name)).push(item));
  return AISLE_ORDER.map((label) => ({
    label,
    items: buckets.get(label).slice().sort(byDoneThenName),
  })).filter((g) => g.items.length > 0);
}

/* Plain A-Z with the ticked rows underneath, for the non-grocery categories
 * (Packing, Beach gear, Kids) where an aisle means nothing. */
export function sortByName(items) {
  return items.slice().sort(byDoneThenName);
}
