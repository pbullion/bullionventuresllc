/* Grouping the 385 rows into PLACES — the unit a review belongs to.
 *
 * A review is about a restaurant, not about a spreadsheet row, and this list has
 * a lot of rows that are the same restaurant twice: six Fadi's, twenty
 * Saltgrass, five Black Walnut. "The bavette was overcooked" written at Fadi's
 * Katy should be readable by someone looking at Fadi's Galleria, so reviews key
 * on a PLACE — a brand — and every location of that brand shows the same set.
 *
 * The source spreadsheet has no brand column, so the grouping is derived from
 * the names, which spell the location out in three different ways:
 *
 *   "Fadi's Mediterranean - Katy"          a dash and a neighbourhood
 *   "Saltgrass Steak House Katy (Mason)"   a parenthetical, and no dash at all
 *   "Sotos Cantina #1"                     a number
 *
 * The dash and paren cases are mechanical. The bare-suffix case is not, and it
 * is where a naive rule does real damage: "Mastro's Ocean Club" and "Mastro's
 * Steakhouse" are different restaurants, as are "Fielding's Local", "Fielding's
 * Steak" and "Fielding's Wood Grill". So trailing words are only dropped when
 * they name a PLACE IN HOUSTON — the vocabulary comes from the dataset's own
 * neighborhood column plus the street and highway words it doesn't cover — and
 * even then the shortened form is only adopted if it COLLIDES with another
 * restaurant. A lone name keeps its full form, which is why "Sushi by Hidden"
 * and "SUSHI BY THE HEIGHTS" stay two restaurants.
 *
 * Anything the rules get wrong is fixed in OVERRIDES below, by hand, per slug —
 * same idea as scripts/hrw-geocache.json. That is the intended place for
 * corrections; don't tune the regexes to chase one restaurant.
 *
 * NOTE: the resulting key is what reviews are STORED under in the backend
 * (hrw_reviews.place). Changing how a key is computed orphans the reviews filed
 * under the old one — if a group has to be re-cut later, migrate the rows.
 */

/* slug → place key. The one correction the rules can't reach: a real second
 * location whose name doesn't say so in any way a rule can see. */
const OVERRIDES = {
  // "Palazzo's Cafe - Briargrove" and "Palazzo's Westchase" are the same
  // restaurant; one row says Cafe and the other doesn't, so there is no shared
  // prefix to find.
  "palazzos-westchase": "palazzos-cafe",
};

/* Words that follow a brand name to say WHICH one. Most come from the dataset's
 * neighborhood column (see buildLocations); these are the ones it never contains —
 * street types, suburbs and landmarks that appear only inside a name.
 *
 * Words that could be the POINT of a name stay out on purpose: "Green" and
 * "Waterway" would collapse Hearsay on the Green and Hearsay on The Waterway
 * into one "Hearsay on the", and those read as two restaurants. */
const EXTRA_LOCATION_WORDS = `
  houston htx tx texas
  freeway fwy hwy highway beltway tollway parkway pkwy
  ave avenue blvd boulevard rd road dr drive ln lane
  north south east west northwest northeast southwest southeast
  city centre center town square plaza mall
  woodlands willowbrook willow brook baytown fulshear gulfgate gulf
  meyerland caney new deer mason campbell speedway fountain view
  felipe san briargrove westheimer voss ranch cinco magnolia eldridge buffalo
  woodway hedwig ashford dairy baybrook
`
  .trim()
  .split(/\s+/);

/* Tokens that are never a location on their own, even though they turn up
 * inside neighborhood names ("Inside the Loop", "East End Revitalized"). */
const STOPWORDS = new Set(["the", "of", "and", "at", "on", "in", "inside", "end", "revitalized", "area"]);

export function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Chão → chao
    // Apostrophes CLOSE UP rather than becoming a space, so "Morton's The
    // Steakhouse" and "Mortons The Steakhouse" — the same restaurant, typed two
    // ways in the same spreadsheet — normalize to the same word. Both kinds of
    // quote, since the sheet has Eddie V's and Eddie V’s.
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const slugify = (s) => normalize(s).replace(/\s+/g, "-");

/* The name with everything that identifies a LOCATION rather than a restaurant
 * cut off the end — parentheticals, "#2", and anything after the first spaced
 * dash. The dash has to be spaced: "Gyu-Kaku" is a brand, "Adair Kitchen- San
 * Felipe" is a location. */
function baseName(name) {
  return String(name || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s*#\s*\d+/g, " ")
    .split(/\s*[-–—]\s+/)[0];
}

/* The location vocabulary, in two halves.
 *
 * PHRASES are whole neighbourhoods ("river oaks", "the woodlands", "cottage
 * grove"); WORDS are the ones that are a neighbourhood all by themselves
 * ("katy", "montrose") plus the extras above.
 *
 * The split is the point. Taking neighbourhoods apart into loose tokens — the
 * first version of this — put "cottage" in the vocabulary by way of Cottage
 * Grove, which trimmed "Thai Cottage" down to "Thai" and swept Thai Cafe and
 * Thai Cuisine & Sushi Bar into the same place. A word only earns the right to
 * be dropped on its own if it names somewhere on its own.
 */
function buildLocations(restaurants) {
  const words = new Set(EXTRA_LOCATION_WORDS);
  const phrases = new Set();
  for (const r of restaurants)
    for (const hood of r.neighborhoods || [])
      // "La Porte/Shoreacres" and "Briargrove Park/Walnutbend" are two places
      // in one cell.
      for (const part of hood.split("/")) {
        const tokens = normalize(part).split(" ").filter(Boolean);
        if (!tokens.length) continue;
        if (tokens.length === 1) {
          if (!STOPWORDS.has(tokens[0])) words.add(tokens[0]);
        } else phrases.add(tokens.join(" "));
      }
  return { words, phrases };
}

/* Drop trailing location words — "thai cottage bellaire" → "thai cottage".
 * Never down to nothing, and a bare number counts as a location because a few
 * names end in a highway ("El Tiempo Cantina 290").
 *
 * It has to be able to trim to a SINGLE word: plenty of brands here are one
 * ("Churrascos Memorial City", "Grotto Downtown", "Zanti River Oaks"). Stopping
 * at two, as this first did, left every one-word brand split across its own
 * locations. What keeps that safe is the collision check in pass 2, not a
 * length floor. */
function trimLocation(tokens, { words, phrases }) {
  const out = tokens.slice();
  while (out.length > 1) {
    // Longest phrase first, so "zanti the woodlands" loses both words and not
    // just the one it ends with.
    let n = 0;
    for (let len = Math.min(3, out.length - 1); len >= 2; len--) {
      if (phrases.has(out.slice(-len).join(" "))) {
        n = len;
        break;
      }
    }
    const last = out[out.length - 1];
    // Two digits or more: highways ("El Tiempo Cantina 290", "I-45 North").
    // A single digit belongs to the name far more often than not — stripping it
    // turned District 7 Memorial and District 7 Midtown into "District".
    if (!n && (words.has(last) || /^\d{2,3}$/.test(last))) n = 1;
    if (!n) break;
    out.length -= n;
  }
  return out;
}

/* The first `n` normalized tokens of a name, given back as the ORIGINAL words —
 * so a group of twenty is headed "Saltgrass Steak House" rather than
 * "saltgrass steak house". Words and tokens are not one-to-one (one "Gyu-Kaku"
 * is two tokens, one "Chef's" is two), which is why this counts rather than
 * slices. */
function wordsForTokens(name, n) {
  const words = String(name).trim().split(/\s+/);
  let used = 0;
  for (let i = 0; i < words.length; i++) {
    used += normalize(words[i]).split(" ").filter(Boolean).length;
    if (used >= n) return words.slice(0, i + 1).join(" ");
  }
  return words.join(" ");
}

/* slug → { key, name, count }, where `key` is shared by every location of a
 * brand and `name` is the brand as it should be printed ("Fadi's
 * Mediterranean", not "Fadi's Mediterranean - Katy").
 *
 * Memoised on the restaurant array, which data.js hands out as a single frozen
 * fetch — so this runs once per page load, not once per render.
 */
const cache = new WeakMap();

export function placeIndex(restaurants) {
  if (!restaurants) return new Map();
  const hit = cache.get(restaurants);
  if (hit) return hit;

  const locations = buildLocations(restaurants);

  // Pass 1: the mechanical key (dash/paren/number stripped) for every row, and
  // the shorter candidate that dropping trailing location words would give.
  const rows = restaurants.map((r) => {
    const base = baseName(r.name);
    const tokens = normalize(base).split(" ").filter(Boolean);
    const trimmed = trimLocation(tokens, locations);
    return { slug: r.slug, base, tokens, full: tokens.join(" "), short: trimmed.join(" ") };
  });

  // Pass 2: a shortened form is only worth having if some other row shares it —
  // otherwise it's a brand word being mistaken for a neighbourhood.
  const shortCounts = new Map();
  for (const row of rows) shortCounts.set(row.short, (shortCounts.get(row.short) || 0) + 1);
  for (const row of rows) {
    const merge = row.short !== row.full && shortCounts.get(row.short) > 1;
    row.place = merge ? row.short : row.full;
  }

  /* Pass 3: adopt an established brand by PREFIX. The vocabulary can't know
   * that Gessner, Navigation and Stafford are places, so three El Tiempo rows
   * come out of pass 2 alone — but "el tiempo cantina" is by then a known
   * multi-location brand, and they all start with it. Same for the Saltgrass
   * whose suffix is a highway ("I-45 North") and the one Gyu-Kaku that says
   * "Japanese BBQ" before the neighbourhood.
   *
   * Only a brand that ALREADY has two or more locations can be adopted, which
   * is what keeps "Fielding's Local" from swallowing "Fielding's Steak": no
   * bare "fielding s" brand exists for them to collapse into. */
  const placeCounts = new Map();
  for (const row of rows) placeCounts.set(row.place, (placeCounts.get(row.place) || 0) + 1);
  for (const row of rows) {
    if (placeCounts.get(row.place) > 1) continue;
    // Longest prefix wins.
    for (let n = row.tokens.length - 1; n >= 1; n--) {
      const prefix = row.tokens.slice(0, n).join(" ");
      if (placeCounts.get(prefix) > 1) {
        row.place = prefix;
        break;
      }
    }
  }

  const keyed = rows.map((row) => ({
    slug: row.slug,
    key: OVERRIDES[row.slug] || slugify(row.place),
    name: wordsForTokens(row.base, row.place.split(" ").length),
  }));

  // Pass 3: count the locations per key, and let the shortest display name in a
  // group win — an override can drag a longer name into an existing group.
  const groups = new Map();
  for (const k of keyed) {
    const g = groups.get(k.key);
    if (!g) groups.set(k.key, { name: k.name, count: 1 });
    else {
      g.count += 1;
      if (k.name.length < g.name.length) g.name = k.name;
    }
  }

  const index = new Map(
    keyed.map((k) => [k.slug, { key: k.key, ...groups.get(k.key) }]),
  );
  cache.set(restaurants, index);
  return index;
}

/* The place a single restaurant belongs to. Falls back to its own name so a
 * caller without the full list still gets a usable key. */
export function placeOf(restaurants, r) {
  return (
    placeIndex(restaurants).get(r.slug) || {
      key: slugify(baseName(r.name)),
      name: r.name,
      count: 1,
    }
  );
}

/* Every restaurant in a place, in name order — the "also at" list on a
 * restaurant page. */
export function siblingsOf(restaurants, r) {
  const index = placeIndex(restaurants);
  const key = index.get(r.slug)?.key;
  if (!key) return [];
  return restaurants
    .filter((x) => x.slug !== r.slug && index.get(x.slug)?.key === key)
    .sort((a, b) => a.name.localeCompare(b.name));
}
