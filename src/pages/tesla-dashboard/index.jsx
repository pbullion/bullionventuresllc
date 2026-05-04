import React, { useEffect, useState } from "react";
import DateTimeWidget from "./DateTime";
import NewsWidget from "./News";
import CurrentWeatherWidget from "./CurrentWeather";
import TimeWidget from "./Time";
import ForecastWeatherWidget from "./ForecastWeather";
import OddsScreen from "./OddsScreen";
import AstrosNextGameWidget from "./AstrosNextGameWidget";
import RocketsNextGameWidget from "./RocketsNextGameWidget";
import Time from "./Time";
import BaylorNextGameWidget from "./BaylorNextGameWidget";
import CalendarWidget from "./CalendarWidget";

function TeslaDashboard() {
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, 1000000000);

    return () => clearInterval(interval);
  }, []);
  // tesla 1180x919
  return (
    <React.Fragment>
      <main style={{ backgroundColor: "#000", height: "100vh", paddingTop: 1 }}>
        <div style={{ display: "flex", margin: 10, justifyContent: "space-around" }}>
          {/* <DateTimeWidget /> */}
          <Time />
          <CurrentWeatherWidget />
          <ForecastWeatherWidget />
          <AstrosNextGameWidget />
          {/* <RocketsNextGameWidget /> */}
          {/* <BaylorNextGameWidget /> */}
          <CalendarWidget />
        </div>
        <div style={{ display: "flex", margin: 10, justifyContent: "space-around" }}>
          <OddsScreen />
          <NewsWidget />
        </div>
      </main>
    </React.Fragment>
  );
}
export default TeslaDashboard;
