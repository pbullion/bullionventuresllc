/* Builds public/data/kids-eat-free-houston.json from the hand-maintained seed
 * list in scripts/kids-eat-free-seed.json. Run it by hand after editing the
 * seed; the output is committed so the site has no runtime dependency on
 * anything:
 *
 *   node scripts/build-kids-eat-free-data.mjs
 *
 * WHY A SEED FILE AND NOT A FEED. Same reasoning as /byob (see
 * build-byob-data.mjs): there is no single authoritative list of Houston
 * kids-eat-free deals. Every listicle disagrees slightly on terms, and deals
 * change without notice. Every row here therefore carries `sources` and a
 * `checked` date, and `confirmed` says whether the day/terms came from a guide
 * that quoted specific terms (true) or only from a search summary that hasn't
 * been read off a full page yet (false) — the page renders that distinction
 * rather than presenting every row with equal confidence.
 *
 * ADDING A DEAL: add it to kids-eat-free-seed.json with at least name,
 * address, region, daysOfWeek and one source, then re-run this. Don't add a
 * row you haven't found a real terms statement for.
 *
 * REMOVING ONE: restaurants close. Two entries (Mi Tierra Mexican Kitchen,
 * Lola's) were dropped before this file was first committed because Yelp
 * listed them CLOSED — same rule /byob follows. When in doubt, drop it.
 *
 * Geocoding follows the identical two-pass, keyless approach as /byob and
 * /hrw — see that script's comments for the full rationale. It is the only
 * part of this build that touches the network, and it is entirely optional: a
 * row that doesn't geocode gets `lat: null` and simply has no pin. The page is
 * a list first.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SEED = resolve(here, "kids-eat-free-seed.json");
const OUT = resolve(here, "../public/data/kids-eat-free-houston.json");
const GEOCACHE = resolve(here, "kids-eat-free-geocache.json");
const UA =
  "bullionventuresllc-kids-eat-free-build/1.0 (+https://bullionventuresllc.com)";

const REGION_ORDER = [
  "Garden Oaks & Oak Forest",
  "Houston Heights",
  "Near Northside",
  "Spring Branch",
  "Northwest Houston",
  "Central Houston & Med Center",
  "Uptown & Galleria",
  "Southeast Houston",
  "Memorial",
  "Southwest Houston",
  "Clear Lake / Bay Area",
  "West Houston",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ geocoding */
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
  const street = (parts.find((p) => /^\d/.test(p)) || parts[0] || "")
    .replace(/,?\s*\b(ste|suite|unit|apt|bldg|building)\b\.?\s*[\w-]*$/i, "")
    .replace(/\s*#\s*[\w-]+$/, "")
    .trim();
  return { street, city, state, zip };
}

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
    try {
      const hits = await censusBatch(
        todo.map((r) => ({ id: r.slug, ...splitAddress(r.address) })),
      );
      for (const r of todo) if (hits.has(r.slug)) cache[r.address] = hits.get(r.slug);
      console.log(`census matched ${hits.size}/${todo.length}`);
    } catch (e) {
      console.warn(`census pass failed (${e.message}) — falling back to OSM`);
    }

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
        console.warn(`osm: ${r.name}: ${e.message}`);
        await sleep(1100);
        continue;
      }
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
  if (!r.daysOfWeek?.length) throw new Error(`${r.slug}: no daysOfWeek`);
}

const restaurants = seed.restaurants.map((r) => ({ ...r }));
const missing = await geocode(restaurants);
restaurants.sort((a, b) => a.name.localeCompare(b.name));

const regions = REGION_ORDER.filter((x) =>
  restaurants.some((r) => r.region === x),
);
const cuisines = [...new Set(restaurants.map((r) => r.cuisine))].sort();

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
