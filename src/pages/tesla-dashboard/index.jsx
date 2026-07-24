import React, { useEffect } from "react";
import NewsWidget from "./News";
import CurrentWeatherWidget from "./CurrentWeather";
import ForecastWeatherWidget from "./ForecastWeather";
import OddsScreen from "./OddsScreen";
import AstrosNextGameWidget from "./AstrosNextGameWidget";
import Time from "./Time";
import CalendarWidget from "./CalendarWidget";

function TeslaDashboard() {

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
