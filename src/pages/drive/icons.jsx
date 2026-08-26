/* Line-art weather + UI icons for /drive.
 *
 * Drawn rather than pulled from a font or an emoji so they stay one weight and
 * one colour with the rest of the board — emoji render as full-colour blobs in
 * the Tesla browser and wreck the look. All of them inherit currentColor and
 * scale with the box they are given. */

import React from "react";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

const Sun = () => (
  <>
    <circle cx="12" cy="12" r="4.1" {...S} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <line
        key={deg}
        x1="12"
        y1="3.1"
        x2="12"
        y2="5.2"
        transform={`rotate(${deg} 12 12)`}
        {...S}
      />
    ))}
  </>
);

const Moon = () => <path d="M19 14.6A7.6 7.6 0 0 1 9.4 5a7.7 7.7 0 1 0 9.6 9.6Z" {...S} />;

const Cloud = ({ y = 0 }) => (
  <path
    d={`M7.4 ${18 + y}h9.3a3.6 3.6 0 0 0 .3-7.2 5.3 5.3 0 0 0-10.1-1A3.6 3.6 0 0 0 7.4 ${18 + y}Z`}
    {...S}
  />
);

const Drops = ({ n = 3, y = 0 }) =>
  Array.from({ length: n }, (_, i) => (
    <line key={i} x1={8 + i * 3.4} y1={18.4 + y} x2={6.8 + i * 3.4} y2={21.6 + y} {...S} />
  ));

const ICONS = {
  clear: (
    <svg viewBox="0 0 24 24">
      <Sun />
    </svg>
  ),
  night: (
    <svg viewBox="0 0 24 24">
      <Moon />
    </svg>
  ),
  partly: (
    <svg viewBox="0 0 24 24">
      <circle cx="8.6" cy="8.2" r="3.2" {...S} />
      {[0, 90, 180, 270].map((d) => (
        <line key={d} x1="8.6" y1="2.6" x2="8.6" y2="4" transform={`rotate(${d} 8.6 8.2)`} {...S} />
      ))}
      <path d="M10 19h7.2a3.3 3.3 0 0 0 .3-6.6 4.9 4.9 0 0 0-9.3-.9A3.3 3.3 0 0 0 10 19Z" {...S} />
    </svg>
  ),
  partlyNight: (
    <svg viewBox="0 0 24 24">
      <path d="M13.6 9.4A5.2 5.2 0 0 1 7 2.9a5.3 5.3 0 1 0 6.6 6.5Z" {...S} />
      <path d="M10 20h7.2a3.3 3.3 0 0 0 .3-6.6 4.9 4.9 0 0 0-9.3-.9A3.3 3.3 0 0 0 10 20Z" {...S} />
    </svg>
  ),
  cloudy: (
    <svg viewBox="0 0 24 24">
      <Cloud y={-1} />
    </svg>
  ),
  rain: (
    <svg viewBox="0 0 24 24">
      <Cloud y={-3} />
      <Drops n={3} y={-3} />
    </svg>
  ),
  drizzle: (
    <svg viewBox="0 0 24 24">
      <Cloud y={-3} />
      <Drops n={2} y={-3} />
    </svg>
  ),
  storm: (
    <svg viewBox="0 0 24 24">
      <Cloud y={-4} />
      <path d="M13 14.2 10.2 18h3l-2.4 3.6" {...S} />
    </svg>
  ),
  snow: (
    <svg viewBox="0 0 24 24">
      <Cloud y={-3} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <line x1={7.6 + i * 3.4} y1="17.6" x2={7.6 + i * 3.4} y2="20.6" {...S} />
          <line x1={6.3 + i * 3.4} y1="18.4" x2={8.9 + i * 3.4} y2="19.8" {...S} />
          <line x1={8.9 + i * 3.4} y1="18.4" x2={6.3 + i * 3.4} y2="19.8" {...S} />
        </g>
      ))}
    </svg>
  ),
  fog: (
    <svg viewBox="0 0 24 24">
      <Cloud y={-4} />
      <line x1="5.6" y1="17.6" x2="18.4" y2="17.6" {...S} />
      <line x1="7.4" y1="20.4" x2="16.6" y2="20.4" {...S} />
    </svg>
  ),
  wind: (
    <svg viewBox="0 0 24 24">
      <path d="M3.5 8.5h9.2a2.6 2.6 0 1 0-2.6-2.6" {...S} />
      <path d="M3.5 12.5h13a2.6 2.6 0 1 1-2.6 2.6" {...S} />
      <path d="M3.5 16.6h7.2a2.4 2.4 0 1 1-2.4 2.4" {...S} />
    </svg>
  ),
};

/* WeatherKit condition codes are a long CamelCase enum ("ScatteredThunderstorms",
 * "MostlyClear", "BlowingDust", ...). Matching on substrings rather than
 * enumerating the whole list means a code Apple adds later still lands on a
 * sensible icon instead of falling through to blank. Order matters: thunder
 * before rain, because thunderstorm codes also contain neither. */
function conditionIcon(code, daylight = true) {
  const c = String(code || "").toLowerCase();
  if (c.includes("thunder")) return "storm";
  if (c.includes("snow") || c.includes("sleet") || c.includes("flurr") || c.includes("ice") || c.includes("hail"))
    return "snow";
  if (c.includes("drizzle")) return "drizzle";
  if (c.includes("rain") || c.includes("shower")) return "rain";
  if (c.includes("fog") || c.includes("haze") || c.includes("smok") || c.includes("dust")) return "fog";
  if (c.includes("wind") || c.includes("breez")) return "wind";
  if (c.includes("mostlycloudy") || c === "cloudy") return "cloudy";
  if (c.includes("partlycloudy") || c.includes("mostlyclear"))
    return daylight ? "partly" : "partlyNight";
  if (c.includes("clear") || c.includes("hot") || c.includes("sunny"))
    return daylight ? "clear" : "night";
  if (c.includes("cloud")) return "cloudy";
  return daylight ? "partly" : "partlyNight";
}

export function WeatherIcon({ code, daylight = true, className }) {
  const node = ICONS[conditionIcon(code, daylight)] || ICONS.partly;
  return React.cloneElement(node, { className, "aria-hidden": true });
}

export function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" width="55%" height="55%" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.6-5.9" {...S} />
      <path d="M20 4v4.4h-4.4" {...S} />
    </svg>
  );
}
