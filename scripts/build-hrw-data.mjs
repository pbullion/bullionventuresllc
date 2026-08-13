/* Builds public/data/hrw-2026.json from the Houston Restaurant Weeks Google
 * Sheet. Run it by hand when the sheet changes; the output is committed so the
 * site has no runtime dependency on Google:
 *
 *   node scripts/build-hrw-data.mjs
 *
 * The sheet has three tabs. We read two of them — "Restaurants" (one row per
 * participating restaurant) and "Menu Items" (one row per dish). The third,
 * "Ingredient word count", is a scratch analysis and is deliberately ignored.
 *
 * Tabs are addressed by numeric gid, which is ugly (a recreated tab gets a new
 * gid, and only the Restaurants gid is visible in the sheet URL) but necessary:
 * the friendlier gviz endpoint, which takes a tab NAME, silently dropped 26 of
 * the 9,223 dish rows — all of one restaurant's later courses — with a 200 and
 * no warning. To re-find a gid, open the tab in the browser and read `gid=` out
 * of the address bar.
 *
 * The join key is Source URL, NOT restaurant name: two locations of
 * McCormick & Schmick's share a name, and only the source URL tells their rows
 * apart. (The Menu Items tab's own Neighborhood column is wrong for the second
 * of those two — trust the Restaurants tab for everything but the dish.)
 *
 * The map view needs coordinates, which the sheet does not have, so this script
 * geocodes too. See geocode() below.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHEET_ID = "1FfIsFuLdPew9f8BXXpkDObyXsAnRLcMLrZuq88aWY9g";
const TABS = { restaurants: "995059429", menuItems: "1262648354" };
const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../public/data/hrw-2026.json");
// Geocoding is slow and rate-limited, so results are cached by address string
// and the cache is committed. It is plain JSON and hand-editable: to correct a
// bad pin, fix its entry here rather than teaching the parser a new trick.
const GEOCACHE = resolve(here, "hrw-geocache.json");
const UA = "bullionventuresllc-hrw-build/1.0 (+https://bullionventuresllc.com)";

const tabUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;

// Minimal RFC-4180 parser. The sheet is full of quoted fields containing commas
// and newlines (dish descriptions, addresses), so a split(",") will not do.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function fetchTab(label, gid) {
  const res = await fetch(tabUrl(gid));
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
  const text = await res.text();
  // A sheet that has stopped being link-shareable answers 200 with a sign-in
  // page, which would otherwise parse as one nonsense row.
  if (text.trimStart().startsWith("<"))
    throw new Error(`${label}: got HTML, not CSV — is the sheet still public?`);
  const rows = parseCsv(text);
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
    return o;
  });
}

const list = (s) =>
  (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

// Source URLs are inconsistently trailing-slashed between the two tabs.
const key = (url) => (url || "").replace(/\/+$/, "");

// The last path segment of the source URL is already a unique, stable,
// human-readable slug ("mccormick-schmicks" vs "mccormick-schmicks-2"), so
// there is no need to invent one from the name.
const slugOf = (url) => key(url).split("/").pop();

// "Dinner: $55 per person; Lunch: $25 per person" → { Dinner: "$55 per person", … }
function parsePrices(s) {
  const out = {};
  for (const seg of (s || "").split(";")) {
    const m = seg.match(/^\s*([^:]+):\s*(.+)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

const dollars = (s) => {
  const m = (s || "").match(/\$\s*(\d+)/);
  return m ? Number(m[1]) : null;
};

const MEAL_ORDER = ["Lunch", "Brunch", "Dinner", "Togo"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Case, punctuation and spacing all vary between a dish and its description
// where the two are meant to be the same string.
const flatten = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/* ------------------------------------------------------------------ geocoding
 * Addresses in the sheet are inconsistent — most are
 * "1550 Lamar Street, Houston, TX, USA", but some carry a suite, some lead with
 * the restaurant's own name, and roughly thirty have a street with no house
 * number at all ("Turner's, Ambassador Way, Houston, TX, USA").
 *
 * Two passes, in precision order:
 *   1. US Census batch geocoder — free, no key, one request for all 385, and
 *      returns rooftop matches. It needs a house number, so it matched 310.
 *   2. OSM Nominatim, structured (street/city/state), for whatever Census
 *      missed. It happily returns a street centreline when there is no number,
 *      which is good enough for a city map. Rate-limited to 1 req/sec by their
 *      usage policy, hence the sleep — this pass takes about 90 seconds on a
 *      cold cache and zero on a warm one.
 *   3. Nominatim again, free-text on "<restaurant>, <city>, TX". This catches
 *      the suburban strip-mall addresses whose street OSM does not know
 *      ("700 Baybrook Mall g 100") but whose business it does.
 * Anything still unmatched gets no pin and is listed at the end of the run.
 */
function splitAddress(addr) {
  const s = (addr || "").replace(/,\s*(USA|United States)\.?\s*$/i, "").trim();
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  let state = "TX";
  let zip = "";
  const tail = parts.at(-1) || "";
  const m = tail.match(/^([A-Z]{2})\s*(\d{5})?$/);
  if (m) {
    state = m[1];
    zip = m[2] || "";
    parts.pop();
  } else {
    // "…, Houston TX 77006" — city, state and zip crammed into one field.
    const m2 = tail.match(/^(.*?)\s+([A-Z]{2})\s+(\d{5})$/);
    if (m2) {
      parts[parts.length - 1] = m2[1];
      state = m2[2];
      zip = m2[3];
    }
  }
  const city = parts.length > 1 ? parts.pop() : "Houston";
  // Prefer the last part that starts with a house number; fall back to the last
  // part, which for a leading-name address is the bare street.
  const street = ([...parts].reverse().find((p) => /^\d/.test(p)) || parts.at(-1) || "")
    // Suite/unit numbers are noise to both geocoders and cost Census matches.
    // They come in every shape the sheet's contributors could think of:
    // "ste 104", "suite a4", "unit b 290", "#130".
    .replace(/,?\s*\b(ste|suite|unit|apt|bldg|building)\b\.?\s*[\w-]*(\s+[\w-]{1,4})?$/i, "")
    .replace(/\s*#\s*[\w-]+$/, "")
    .trim();
  return { street, city, state, zip };
}

async function censusBatch(addresses) {
  const csv = addresses
    .map(({ id, street, city, state, zip }) =>
      [id, street, city, state, zip]
        .map((v) => `"${String(v).replace(/"/g, "")}"`)
        .join(","),
    )
    .join("\n");
  const body = new FormData();
  body.append("benchmark", "Public_AR_Current");
  body.append("addressFile", new Blob([csv], { type: "text/csv" }), "addr.csv");
  const res = await fetch(
    "https://geocoding.geo.census.gov/geocoder/locations/addressbatch",
    { method: "POST", body },
  );
  if (!res.ok) throw new Error(`census: HTTP ${res.status}`);
  const out = new Map();
  for (const row of parseCsv(await res.text())) {
    // id, input, "Match"|"No_Match", matchType, matchedAddress, "lon,lat", …
    if (row[2] !== "Match" || !row[5]) continue;
    const [lon, lat] = row[5].split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lon))
      out.set(row[0], { lat, lon, precision: "rooftop" });
  }
  return out;
}

async function nominatim(params, precision) {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("limit", "1");
  u.searchParams.set("country", "US");
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const [hit] = await res.json();
  if (!hit) return null;
  return { lat: Number(hit.lat), lon: Number(hit.lon), precision };
}

const byStreet = ({ street, city, state }) =>
  nominatim({ street, city, state }, "street");
// Free-text sometimes finds a street the structured query does not, because
// structured matching insists the street belong to the named city and these
// addresses often name a suburb OSM files under Houston.
const byAddress = ({ street, city, state }) =>
  nominatim({ q: `${street}, ${city}, ${state}` }, "street");
const byName = (name, { city, state }) =>
  nominatim({ q: `${name}, ${city}, ${state}` }, "area");

// OSM stores street names spelled out. "811 Buffalo Pk Dr" finds nothing;
// "811 Buffalo Park Drive" finds it. Only worth trying after the plain forms
// have failed, so the table can stay this short.
const ABBR = {
  pk: "Park", dr: "Drive", rd: "Road", st: "Street", ave: "Avenue",
  av: "Avenue", blvd: "Boulevard", pkwy: "Parkway", fwy: "Freeway",
  hwy: "Highway", ln: "Lane", ct: "Court", cir: "Circle", sq: "Square",
  n: "North", s: "South", e: "East", w: "West",
};
const byExpanded = ({ street, city, state }) => {
  const spelled = street
    .split(/\s+/)
    .map((w) => ABBR[w.toLowerCase().replace(/\.$/, "")] ?? w)
    .join(" ");
  if (spelled === street) return null;
  return nominatim({ q: `${spelled}, ${city}, ${state}` }, "street");
};

async function geocode(restaurants) {
  let cache = {};
  try {
    cache = JSON.parse(await readFile(GEOCACHE, "utf8"));
  } catch {
    console.log("no geocache — geocoding from scratch, this takes a few minutes");
  }

  // `null` in the cache means "every geocoder has already been asked and none of
  // them knows this address" — without recording those, each re-run spent a
  // minute re-asking Nominatim about the same eighteen strip malls. Delete an
  // entry (or the file) to force a retry.
  const todo = restaurants.filter(
    (r) => r.address && cache[r.address] === undefined,
  );
  if (todo.length) {
    const parsed = todo.map((r, i) => ({ id: String(i), ...splitAddress(r.address) }));
    const withNumber = parsed.filter((p) => /^\d/.test(p.street));
    console.log(`geocoding ${todo.length} new addresses (${withNumber.length} via Census)…`);
    let hits = new Map();
    try {
      hits = await censusBatch(withNumber);
    } catch (e) {
      console.warn(`census batch failed (${e.message}) — falling back to Nominatim`);
    }
    for (const p of parsed) {
      const found = hits.get(p.id);
      if (found) cache[todo[Number(p.id)].address] = found;
    }
    const left = parsed.filter((p) => !cache[todo[Number(p.id)].address]);
    if (left.length) console.log(`${left.length} left for Nominatim (~${left.length * 2}s)…`);
    for (const p of left) {
      const r = todo[Number(p.id)];
      for (const lookup of [
        p.street ? () => byStreet(p) : null,
        p.street ? () => byAddress(p) : null,
        p.street ? () => byExpanded(p) : null,
        () => byName(r.name, p),
      ]) {
        if (!lookup || cache[r.address]) continue;
        try {
          const found = await lookup();
          if (found) cache[r.address] = found;
        } catch (e) {
          console.warn(`nominatim ${r.address}: ${e.message}`);
        }
        await sleep(1100); // Nominatim usage policy: 1 request per second, max.
      }
      if (!cache[r.address]) cache[r.address] = null; // asked everyone; nobody knew
    }
    await writeFile(GEOCACHE, JSON.stringify(cache, null, 1) + "\n");
  }

  for (const r of restaurants) {
    const g = cache[r.address];
    if (g) {
      r.lat = Number(g.lat.toFixed(6));
      r.lon = Number(g.lon.toFixed(6));
      r.geo = g.precision;
    }
  }
  return restaurants.filter((r) => r.lat == null).map((r) => r.name);
}

/* ---------------------------------------------------------------------- build */
const [restaurantRows, dishRows] = await Promise.all([
  fetchTab("Restaurants", TABS.restaurants),
  fetchTab("Menu Items", TABS.menuItems),
]);

// Dishes grouped by restaurant → meal → course, keeping sheet order within each
// group (the sheet lists courses and dishes in the order the menu prints them).
// About a hundred rows are exact duplicates of another row — same restaurant,
// meal, course, dish AND description — which is a scrape artifact and reads as a
// rendering bug on the page, so they are dropped. Rows that repeat a dish name
// with a DIFFERENT description are kept: a few menus really do list, say, three
// "Salad Bar Buffet" lines with different highlights.
const byRestaurant = new Map();
for (const d of dishRows) {
  const k = key(d["Source URL"]);
  if (!k || !d.Dish) continue;
  if (!byRestaurant.has(k)) byRestaurant.set(k, new Map());
  const meals = byRestaurant.get(k);
  const meal = d["Menu Type"] || "Dinner";
  if (!meals.has(meal))
    meals.set(meal, { note: d["Menu Note"] || "", courses: new Map(), seen: new Set() });
  const m = meals.get(meal);
  if (!m.note && d["Menu Note"]) m.note = d["Menu Note"];
  const course = d.Course || "Menu";
  const dedupe = `${course} ${d.Dish} ${d.Description}`;
  if (m.seen.has(dedupe)) continue;
  m.seen.add(dedupe);
  if (!m.courses.has(course)) m.courses.set(course, []);
  // ~400 rows repeat the dish name as its own description ("Caesar Salad" /
  // "CAESAR SALAD"). Rendered, that reads as a bug in the page rather than a
  // quirk of the sheet, so the description is dropped when it says nothing new.
  const same = flatten(d.Description) === flatten(d.Dish);
  m.courses
    .get(course)
    .push({ n: d.Dish, d: same ? undefined : d.Description || undefined });
}

const restaurants = restaurantRows
  .filter((r) => r.Restaurant)
  .map((r) => {
    const k = key(r["Source URL"]);
    const prices = parsePrices(r["Menu Prices"]);
    const meals = byRestaurant.get(k) || new Map();
    const menus = [...meals.entries()]
      .sort((a, b) => MEAL_ORDER.indexOf(a[0]) - MEAL_ORDER.indexOf(b[0]))
      .map(([type, m]) => ({
        type,
        price: prices[type] || "",
        cost: dollars(prices[type]),
        note: m.note || undefined,
        courses: [...m.courses.entries()].map(([name, dishes]) => ({ name, dishes })),
      }));
    // Menu Types on the Restaurants tab is the authoritative list of meals
    // served — a handful of restaurants advertise a meal the Menu Items tab has
    // no dishes for, and the filters have to still find them.
    const mealTypes = list(r["Menu Types"]).sort(
      (a, b) => MEAL_ORDER.indexOf(a) - MEAL_ORDER.indexOf(b),
    );
    return {
      slug: slugOf(r["Source URL"]),
      name: r.Restaurant,
      cuisines: list(r.Cuisine),
      neighborhoods: list(r.Neighborhood),
      address: r.Address || undefined,
      phone: r.Phone || undefined,
      parking: list(r.Parking),
      specialHours: r["Special Hours"] || undefined,
      reservations: r["Reservation Status"] || undefined,
      mealTypes,
      // Price per meal rather than a flat list of prices, so the page can answer
      // "who does a $25 LUNCH" instead of "who does $25 and also lunch".
      prices: Object.fromEntries(
        mealTypes.map((t) => [t, dollars(prices[t])]).filter(([, v]) => v),
      ),
      links: {
        reservation: r["Reservation Link"] || undefined,
        website: r.Website || undefined,
        instagram: r.Instagram || undefined,
        facebook: r.Facebook || undefined,
        youtube: r.YouTube || undefined,
        linkedin: r.LinkedIn || undefined,
        hrw: r["Source URL"] || undefined,
      },
      benefiting: r.Benefiting || undefined,
      menus,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

const slugs = new Set(restaurants.map((r) => r.slug));
if (slugs.size !== restaurants.length)
  throw new Error("duplicate slugs — source URLs are no longer unique");

const unpinned = await geocode(restaurants);
const noMenu = restaurants.filter((r) => !r.menus.length).map((r) => r.name);

await mkdir(dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify({
    event: restaurantRows[0]?.Event || "Houston Restaurant Weeks",
    generated: new Date().toISOString().slice(0, 10),
    source: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`,
    restaurants,
  }),
);

const dishes = restaurants.reduce(
  (n, r) =>
    n +
    r.menus.reduce((m, x) => m + x.courses.reduce((c, y) => c + y.dishes.length, 0), 0),
  0,
);
console.log(`${restaurants.length} restaurants, ${dishes} dishes → ${OUT}`);
console.log(`pinned ${restaurants.length - unpinned.length}/${restaurants.length}`);
if (unpinned.length) console.log(`no coordinates: ${unpinned.join(", ")}`);
if (noMenu.length) console.log(`no menu rows: ${noMenu.join(", ")}`);
