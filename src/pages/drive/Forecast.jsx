/* Six-day outlook. Rain chance is only printed when it is worth acting on —
 * a "4%" on every dry row is five pieces of noise around the one that matters. */

import { WeatherIcon } from "./icons";
import { cToF } from "./data";

const dayLabel = (iso, index) => {
  if (index === 0) return "Today";
  return new Date(iso).toLocaleDateString([], { weekday: "short" });
};

function Forecast({ weather }) {
  const days = (weather?.forecastDaily?.days || []).slice(0, 6);

  return (
    <section className="dcard">
      <div className="dcard__head">
        <span className="dcard__title">Forecast</span>
      </div>
      <div className="dcard__body">
        {days.length === 0 ?
          <div className="dempty">Waiting on forecast…</div>
        : <div className="dfc">
            {days.map((d, i) => {
              const pop = Math.round((d.precipitationChance || 0) * 100);
              return (
                <div key={d.forecastStart} className={`dfc__row${i === 0 ? " dfc__row--today" : ""}`}>
                  <span className="dfc__day">{dayLabel(d.forecastStart, i)}</span>
                  <WeatherIcon code={d.conditionCode} className="dfc__icon" />
                  <span className="dfc__pop">{pop >= 20 ? `${pop}%` : ""}</span>
                  <span className="dfc__temps">
                    <span>{cToF(d.temperatureMax)}°</span>
                    <span className="dfc__lo">{cToF(d.temperatureMin)}°</span>
                  </span>
                </div>
              );
            })}
          </div>
        }
      </div>
    </section>
  );
}

export default Forecast;
