/* THE TROPICS — a port of whiparound-firetv's Tropics.kt, plus Mock.tropics().
 *
 * Deliberately thin. Which basin counts (Atlantic only), what a category is and
 * the order (the Gulf first, the strongest first inside that) are all decided
 * once in the backend's routes/whiparound.js, `GET /whiparound/tropics`. This
 * file parses and nothing else — a client that re-sorts is a second opinion.
 *
 * ABSENT MEANS NO. `active` false is a screen that leaves the rotation, which is
 * what it is for most of the year and all of the winter. slots.js reads
 * `active` and nothing else.
 *
 * Wire: {active, count, in_gulf, storms:[{id, name, headline, category, in_gulf,
 * wind_mph, pressure_mb, position, movement, advisory}]}.
 */

import { bool, int, isObj, objects, str } from "./wire";

export const EMPTY_TROPICS = Object.freeze({ active: false, inGulf: false, storms: [] });

/// `optInt(key).takeIf { it > 0 }` behind an isNull guard: a zero category,
/// wind or pressure is not a reading, and "0 MPH" on a storm board is a
/// fabrication rather than a gap.
function positive(o, key) {
  const n = int(o, key);
  return n != null && n > 0 ? n : null;
}

function parseStorm(o) {
  return {
    id: str(o, "id"),
    name: str(o, "name"),
    headline: str(o, "headline"),
    // Null below hurricane strength — a tropical storm is not on the scale.
    category: positive(o, "category"),
    inGulf: bool(o, "in_gulf", false),
    windMph: positive(o, "wind_mph"),
    pressureMb: positive(o, "pressure_mb"),
    position: str(o, "position"),
    movement: str(o, "movement"),
    advisory: str(o, "advisory"),
  };
}

/* THROWS on anything that is not an object, as `JSONObject(text)` does on the
 * stick. useBoard's catch then keeps the last good copy — the one feed on this
 * board where a stale value beats none, because a six-hour-old advisory is
 * still the advisory. */
export function parseTropics(json) {
  if (!isObj(json)) throw new Error("tropics: payload is not an object");
  const storms = objects(json, "storms").map(parseStorm);
  return {
    // Trust the list over the flag if they ever disagree: a screen that says a
    // storm is coming and shows none is the worse of the two failures.
    active: bool(json, "active", false) && storms.length > 0,
    inGulf: bool(json, "in_gulf", false),
    storms,
  };
}

/* Two storms, one of them in the Gulf — Mock.kt's fixture, byte for byte.
 *
 * Built to put both halves of the layout on screen at once: a lead storm with
 * the Gulf chip and a full set of facts, plus a second to prove the ALSO ACTIVE
 * panel. `pressure_mb` is deliberately null on the second storm. Run through
 * the real parser on purpose, so a wire change breaks the preview exactly as it
 * would break production.
 */
const MOCK_JSON = `
{
  "active": true, "count": 2, "in_gulf": true,
  "storms": [
    {
      "id": "al092026", "name": "Imelda",
      "headline": "CATEGORY 2 HURRICANE", "category": 2,
      "in_gulf": true, "wind_mph": 100, "pressure_mb": 964,
      "position": "27.4N 92.1W", "movement": "NNW at 10 mph",
      "advisory": "SUN, 8/30 · 4:00 PM CT"
    },
    {
      "id": "al102026", "name": "Jerry",
      "headline": "TROPICAL STORM", "category": null,
      "in_gulf": false, "wind_mph": 50, "pressure_mb": null,
      "position": "19.8N 58.3W", "movement": "WNW at 14 mph",
      "advisory": "SUN, 8/30 · 4:00 PM CT"
    }
  ]
}
`;

export function mockTropics() {
  return parseTropics(JSON.parse(MOCK_JSON));
}
