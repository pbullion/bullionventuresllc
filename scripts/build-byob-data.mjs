/* Builds public/data/byob-houston.json from the hand-maintained seed list in
 * scripts/byob-seed.json. Run it by hand after editing the seed; the output is
 * committed so the site has no runtime dependency on anything:
 *
 *   node scripts/build-byob-data.mjs
 *
 * WHY A SEED FILE AND NOT A FEED. Unlike /hrw, which reads a Google Sheet
 * somebody else maintains, there is no authoritative list of Houston BYOB
 * restaurants anywhere. BYOB is the ABSENCE of a licence, so no TABC dataset
 * describes it, and the aggregators disagree with each other and with the
 * restaurants. Every row here therefore carries `sources` and a `checked` date,
 * and `byob.confirmed` says whether the policy came from the restaurant or a
 * guide (true) or only from a directory listing that says "BYOB" with no terms
 * (false). The page renders that distinction — an unconfirmed row reads "call
 * ahead" rather than quoting a fee it does not know.
 *
 * ADDING A RESTAURANT: add it to byob-seed.json with at least name, address,
 * city, region, cuisines, a byob block and one source, then re-run this. Do NOT
 * add a row you have not found a policy statement for. A list that looks right
 * and is wrong sends somebody to dinner with a bottle they cannot open.
 *
 * REMOVING ONE: restaurants close, and a closed BYOB restaurant is the single
 * most annoying kind of wrong entry. La Vista (Fountain View) and several
 * Jenni's locations were dropped before this file was first committed for
 * exactly that reason. When in doubt, drop it.
 *
 * The map view needs coordinates, which the seed does not carry, so this script
 * geocodes too — see geocode() below. It is the only part of the build that
 * touches the network, and it is entirely optional: a row that does not geocode
 * gets `lat: null` and simply has no pin. The page is a list first.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SEED = resolve(here, "byob-seed.json");
const OUT = resolve(here, "../public/data/byob-houston.json");
// Geocoding is slow and rate-limited, so results are cached by address string
// and the cache is committed. Same deal as scripts/hrw-geocache.json: it is
// plain JSON and hand-editable, so a wrong pin is fixed by editing its entry
// here rather than by teaching this script a new trick. A miss is cached as
// null on purpose — delete the entry to force a retry.
const GEOCACHE = resolve(here, "byob-geocache.json");
const UA = "bullionventuresllc-byob-build/1.0 (+https://bullionventuresllc.com)";

/* The order regions appear in the page's filter, coarse to the north and south
 * ends of the metro. Declared here rather than in the page so the seed and the
 * UI cannot drift: a region in the seed that is missing from this list is a
 * build error, not a silently mis-sorted dropdown. */
const REGION_ORDER = [
  "Central Houston",
  "North Houston & Spring Branch",
  "West Houston",
  "Southwest Houston & Chinatown",
  "The Woodlands, Spring & Tomball",
  "Katy & Cypress",
  "Sugar Land & Fort Bend",
  "Pearland, Clear Lake & south",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ geocoding
 * Two passes, in precision order, both keyless — the same pair /hrw uses and for
 * the same reasons:
 *   1. US Census batch geocoder — one request for the whole list, rooftop
 *      matches, but it insists on a house number and a clean street.
 *   2. OSM Nominatim free-text on "<name>, <city>, TX" for whatever Census
 *      missed. Rate-limited to 1 req/sec by their usage policy, hence the
 *      sleep. This is the pass that finds the strip-mall addresses: Census does
 *      not know "25510 Zion Lutheran Cemetery Rd" but OSM knows the restaurant.
 * Anything still unmatched gets no pin and is listed at the end of the run.
 */
function splitAddress(addr) {
  const parts = (addr || "").split(",").map((p) => p.trim()).filter(Boolean);
  let state = "TX";
  let zip = "";
  const tail = parts.at(-1) || "";
  const m = tail.match(/^([A-Z]{2})\s*(\d{5})?$/);
  if (m) {
    state = m[1];
    zip = m[2] || "";
    parts.pop();
  } else {
    const m2 = tail.match(/^(.*?)\s+([A-Z]{2})\s+(\d{5})$/);
    if (m2) {
      parts[parts.length - 1] = m2[1];
      state = m2[2];
      zip = m2[3];
    }
  }
  const city = parts.length > 1 ? parts.pop() : "Houston";
  // Suite numbers cost Census matches and tell OSM nothing.
  const street = (parts.find((p) => /^\d/.test(p)) || parts[0] || "")
    .replace(/,?\s*\b(ste|suite|unit|apt|bldg|building)\b\.?\s*[\w-]*$/i, "")
    .replace(/\s*#\s*[\w-]+$/, "")
    .trim();
  return { street, city, state, zip };
}

// Minimal RFC-4180 CSV parser — the Census batch endpoint answers in CSV with
// quoted fields containing commas.
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

async function nominatim(q, precision) {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("limit", "1");
  u.searchParams.set("countrycodes", "us");
  u.searchParams.set("q", q);
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  // Throw rather than return null: only a 200 carrying an empty array is a
  // genuine "OSM does not know this address". A 403 or a 429 is the network
  // saying no, and the caller must not record that as a miss — see the catch in
  // geocode() for why that distinction is load-bearing.
  if (!res.ok) throw new Error(`nominatim: HTTP ${res.status}`);
  const [hit] = await res.json();
  if (!hit) return null;
  return { lat: Number(hit.lat), lon: Number(hit.lon), precision };
}

async function geocode(restaurants) {
  let cache = {};
  try {
    cache = JSON.parse(await readFile(GEOCACHE, "utf8"));
  } catch {
    console.log("no geocache — geocoding from scratch, this takes a minute");
  }

  const todo = restaurants.filter((r) => !(r.address in cache));
  if (todo.length) {
    // Pass 1: everything at once, by street address.
    try {
      const hits = await censusBatch(
        todo.map((r) => ({ id: r.slug, ...splitAddress(r.address) })),
      );
      for (const r of todo) if (hits.has(r.slug)) cache[r.address] = hits.get(r.slug);
      console.log(`census matched ${hits.size}/${todo.length}`);
    } catch (e) {
      console.warn(`census pass failed (${e.message}) — falling back to OSM`);
    }

    // Pass 2: whatever is left, by name and city. One request per second.
    for (const r of todo) {
      if (r.address in cache) continue;
      const { street, city, state } = splitAddress(r.address);
      let hit = null;
      try {
        hit = await nominatim(`${street}, ${city}, ${state}`, "street");
        if (!hit) {
          await sleep(1100);
          hit = await nominatim(`${r.name}, ${city}, ${state}`, "area");
        }
      } catch (e) {
        // A THROW IS NOT A MISS, and the difference matters more here than it
        // looks. Caching a null on a network failure would poison the cache
        // permanently: the next run skips the address because it is "in" the
        // cache, and the restaurant never gets a pin no matter how many times
        // you re-run. Somewhere without egress to OSM — a sandboxed agent
        // session, say — that turns one bad run into a file that can never be
        // fixed except by hand. So leave the key absent and let the next run
        // try it again.
        console.warn(`osm: ${r.name}: ${e.message}`);
        await sleep(1100);
        continue;
      }
      // A genuine miss IS cached, as null, so a re-run doesn't ask again;
      // delete the entry by hand to retry one.
      cache[r.address] = hit;
      await sleep(1100);
    }
    await writeFile(GEOCACHE, JSON.stringify(cache, null, 2) + "\n");
  }

  const missing = [];
  for (const r of restaurants) {
    const hit = cache[r.address];
    r.lat = hit ? hit.lat : null;
    r.lon = hit ? hit.lon : null;
    r.precision = hit ? hit.precision : null;
    if (!hit) missing.push(r.name);
  }
  return missing;
}

/* ---------------------------------------------------------------------- build */
const seed = JSON.parse(await readFile(SEED, "utf8"));

const unknownRegions = [
  ...new Set(seed.restaurants.map((r) => r.region)),
].filter((x) => !REGION_ORDER.includes(x));
if (unknownRegions.length)
  throw new Error(
    `seed uses regions missing from REGION_ORDER: ${unknownRegions.join(", ")}`,
  );

const slugs = new Set();
for (const r of seed.restaurants) {
  if (slugs.has(r.slug)) throw new Error(`duplicate slug: ${r.slug}`);
  slugs.add(r.slug);
  if (!r.sources?.length) throw new Error(`${r.slug}: no sources`);
}

const restaurants = seed.restaurants.map((r) => ({ ...r }));
const missing = await geocode(restaurants);
restaurants.sort((a, b) => a.name.localeCompare(b.name));

const regions = REGION_ORDER.filter((x) =>
  restaurants.some((r) => r.region === x),
);
const cuisines = [...new Set(restaurants.flatMap((r) => r.cuisines))].sort();

await mkdir(dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    {
      built: new Date().toISOString().slice(0, 10),
      count: restaurants.length,
      pinned: restaurants.filter((r) => r.lat != null).length,
      regions,
      cuisines,
      restaurants,
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `wrote ${restaurants.length} restaurants (${
    restaurants.filter((r) => r.lat != null).length
  } pinned) → ${OUT}`,
);
if (missing.length)
  console.log(`no pin for ${missing.length}: ${missing.join(", ")}`);
