/* The full-screen section view.
 *
 * BACK IS THREE THINGS, because in a car you get one attempt at it: the big
 * button top-left, the Escape key, and the browser's own back button. The last
 * one is why opening a section pushes a history entry — the Tesla browser has a
 * hardware-adjacent back control and a driver will reach for it before they
 * find anything on the page. index.jsx owns that history entry; this component
 * just calls onClose.
 *
 * The overlay renders over the board rather than replacing it, so closing is
 * instant and no card refetches on the way back — every poller upstream keeps
 * running the whole time the detail view is open. */

import { Suspense, lazy, useEffect } from "react";
import { KalshiPanel, NewsPanel, TeamsPanel, WeatherPanel } from "./panels";

const Radar = lazy(() => import("./Radar"));

const TITLES = {
  weather: "Weather",
  radar: "Radar",
  teams: "Scoreboard",
  news: "Headlines",
  kalshi: "Kalshi",
};

function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="dback__arrow">
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Detail({ section, onClose, weather, place, coords, frames, events, ai, sports, kalshi }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  let body = null;
  let action = null;

  if (section === "weather") {
    body = <WeatherPanel weather={weather} place={place} />;
  } else if (section === "radar") {
    body = (
      <Suspense fallback={<div className="dempty">Loading radar…</div>}>
        <Radar coords={coords} frames={frames} interactive />
      </Suspense>
    );
    action = (
      <a
        className="dpill"
        href={`https://www.windy.com/${coords.lat}/${coords.lon}?radar,${coords.lat},${coords.lon},8`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Windy ↗
      </a>
    );
  } else if (section === "teams") {
    body = <TeamsPanel events={events} />;
  } else if (section === "news") {
    body = <NewsPanel ai={ai} sports={sports} />;
  } else if (section === "kalshi") {
    body = <KalshiPanel data={kalshi} />;
    action = (
      <a
        className="dpill"
        href="https://kalshi.com/portfolio"
        target="_blank"
        rel="noopener noreferrer"
      >
        Portfolio ↗
      </a>
    );
  }

  return (
    <div className="ddetail" role="dialog" aria-label={TITLES[section]}>
      <header className="ddetail__bar">
        <button type="button" className="dback" onClick={onClose}>
          <BackArrow />
          Back
        </button>
        <h1 className="ddetail__title">{TITLES[section]}</h1>
        <span className="dcard__spacer" />
        {action}
      </header>
      <div className="ddetail__body">{body}</div>
    </div>
  );
}

export default Detail;
