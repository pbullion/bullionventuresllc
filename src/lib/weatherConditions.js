/* WeatherKit condition codes, in words.
 *
 * Every WeatherKit consumer on this site gets its display names from here. The
 * list came out of the Tesla dashboard, which held it as two parallel arrays
 * zipped together by index — correct, but one insertion in the wrong array
 * silently re-labels every condition after it, and nothing would have caught
 * that. One object, one pair per line, removes the failure mode.
 *
 * Three of these are the reason a shared map is worth having at all:
 * MixedRainAndSleet, MixedRainAndSnow and MixedSnowAndSleet read as "Mixed Rain
 * & Sleet" and so on. Everything else happens to match what you would get by
 * inserting spaces before the capitals — those three do not.
 */
export const CONDITION_NAMES = {
  Clear: "Clear",
  Cloudy: "Cloudy",
  Dust: "Dust",
  Fog: "Fog",
  Haze: "Haze",
  MostlyClear: "Mostly Clear",
  MostlyCloudy: "Mostly Cloudy",
  PartlyCloudy: "Partly Cloudy",
  ScatteredThunderstorms: "Scattered Thunderstorms",
  Smoke: "Smoke",
  Breezy: "Breezy",
  Windy: "Windy",
  Drizzle: "Drizzle",
  HeavyRain: "Heavy Rain",
  Rain: "Rain",
  Showers: "Showers",
  Flurries: "Flurries",
  HeavySnow: "Heavy Snow",
  MixedRainAndSleet: "Mixed Rain & Sleet",
  MixedRainAndSnow: "Mixed Rain & Snow",
  MixedRainfall: "Mixed Rainfall",
  MixedSnowAndSleet: "Mixed Snow & Sleet",
  ScatteredShowers: "Scattered Showers",
  ScatteredSnowShowers: "Scattered Snow Showers",
  Sleet: "Sleet",
  Snow: "Snow",
  SnowShowers: "Snow Showers",
  Blizzard: "Blizzard",
  BlowingSnow: "Blowing Snow",
  FreezingDrizzle: "Freezing Drizzle",
  FreezingRain: "Freezing Rain",
  Frigid: "Frigid",
  Hail: "Hail",
  Hot: "Hot",
  Hurricane: "Hurricane",
  IsolatedThunderstorms: "Isolated Thunderstorms",
  SevereThunderstorm: "Severe Thunderstorm",
  Thunderstorm: "Thunderstorm",
  Tornado: "Tornado",
  TropicalStorm: "Tropical Storm",
};

/* `code` in words, or `fallback` when it isn't one we know.
 *
 * With no fallback an unknown code is de-camelCased rather than dropped:
 * WeatherKit adds codes over time, and a page showing "Thundersnow" for
 * something unrecognised is better than one showing a blank or a raw
 * identifier. Callers that would rather say so explicitly pass their own
 * fallback.
 */
export function conditionName(code, fallback) {
  if (!code) return fallback ?? "";
  return CONDITION_NAMES[code] || fallback || String(code).replace(/([a-z])([A-Z])/g, "$1 $2");
}
