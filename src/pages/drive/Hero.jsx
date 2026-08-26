/* The glance band. Everything above the fold that has to be readable in the
 * time it takes to look up from the road: the clock, the temperature, and four
 * numbers that answer "do I need a jacket / how long is daylight". */

import { WeatherIcon } from "./icons";
import { cToF } from "./data";

/* "PartlyCloudy" -> "Partly Cloudy". WeatherKit hands back the raw enum. */
const humanize = (code) =>
  String(code || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim() || "—";

const clockTime = (d) => {
  const h = d.getHours();
  return {
    hm: `${((h + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, "0")}`,
    ampm: h < 12 ? "AM" : "PM",
  };
};

const timeShort = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s/g, "")
    : "—";

function Hero({ now, weather, place, onExpand }) {
  const cur = weather?.currentWeather;
  const today = weather?.forecastDaily?.days?.[0];
  const { hm, ampm } = clockTime(now);

  const temp = cToF(cur?.temperature);
  const feels = cToF(cur?.temperatureApparent);
  const hi = cToF(today?.temperatureMax);
  const lo = cToF(today?.temperatureMin);
  const daylight = cur?.daylight !== false;

  /* Before sunset show when the light goes; after it, show when it comes back.
   * A sunset time that has already passed is noise. */
  const sunsetPassed = today?.sunset ? new Date(today.sunset) < now : false;
  const sunLabel = sunsetPassed ? "Sunrise" : "Sunset";
  const sunValue = timeShort(sunsetPassed ? weather?.forecastDaily?.days?.[1]?.sunrise : today?.sunset);

  return (
    <header
      className={`dhero${onExpand ? " is-tappable" : ""}`}
      onClick={onExpand}
    >
      <div>
        <div className="dclock">
          <span>{hm}</span>
          <span className="dclock__ampm">{ampm}</span>
        </div>
        <div className="dclock__date">
          {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      <div className="dnow">
        <WeatherIcon code={cur?.conditionCode} daylight={daylight} className="dnow__icon" />
        <div style={{ minWidth: 0 }}>
          <div className="dnow__temp">{temp == null ? "--" : `${temp}°`}</div>
          <div className="dnow__cond">{cur ? humanize(cur.conditionCode) : "Loading weather"}</div>
          <div className="dnow__place">{place || "Locating…"}</div>
        </div>
      </div>

      <div className="dstats">
        <div className="dstat">
          <span className="dstat__k">Feels</span>
          <span className="dstat__v">{feels == null ? "—" : `${feels}°`}</span>
        </div>
        <div className="dstat">
          <span className="dstat__k">High / Low</span>
          <span className="dstat__v">{hi == null ? "—" : `${hi}° / ${lo}°`}</span>
        </div>
        <div className="dstat">
          <span className="dstat__k">{sunLabel}</span>
          <span className="dstat__v">{sunValue}</span>
        </div>
      </div>
    </header>
  );
}

export default Hero;
