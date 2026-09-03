import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, Typography, CircularProgress } from "@mui/material";
import "./WeatherForecast.css";

import { conditionName } from "../../lib/weatherConditions";
const WeatherWidget = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const defaultLatitude = 29.8021; // Default latitude for ZIP code 77018
  const defaultLongitude = -95.3988; // Default longitude for ZIP code 77018

  /* Resolve to the browser's coordinates, or null when geolocation is missing or
   * refused — one path instead of three copies of the fallback. */
  const readCoords = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error("Geolocation is not supported by this browser");
        return resolve(null);
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => {
          console.error("Error getting user location:", error);
          resolve(null);
        },
      );
    });

  const getUserLocation = async () => {
    const coords = await readCoords();
    const lat = coords ? coords.latitude : defaultLatitude;
    const lon = coords ? coords.longitude : defaultLongitude;
    setLatitude(lat);
    setLongitude(lon);
    if (!coords) {
      setError("Unable to retrieve your location, using default location");
      setLoading(false);
    }
    fetchWeatherData(lat, lon);
  };

  const fetchWeatherData = async (latitude, longitude) => {
    try {
      const response = await axios.get(
        `https://sheline-art-website-api.herokuapp.com/patrick/tesla-dashboard-weather?lat=${latitude}&lon=${longitude}`,
      );
      console.log("🚀 ~ fetchWeatherData ~ response:", response);
      setWeatherData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setError("Failed to fetch weather data");
      setLoading(false);
    }
  };
  useEffect(() => {
    // Async wrapper keeps the lookup off the effect's synchronous path.
    (async () => {
      await getUserLocation();
    })();
  }, []);

  useEffect(() => {
    const intervalInMilliseconds = 5 * 60 * 1000;
    const intervalId = setInterval(() => {
      getUserLocation();
    }, intervalInMilliseconds);

    return () => clearInterval(intervalId);
  }, []);

  const currentWeather = weatherData?.currentWeather;
  const dailyForecasts = weatherData?.forecastDaily.days;
  if (loading) {
    return (
      <Card
        sx={{
          minWidth: 225,
          background: "#19C3FB",
          color: "white",
          borderRadius: "15px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          alignContent: "center",
        }}>
        <CircularProgress />
      </Card>
    );
  }

  if (error) {
    return <Typography variant="p">{error}</Typography>;
  }
  const celsiusToFahrenheit = (celsius) => {
    return (celsius * 9) / 5 + 32;
  };
  console.log("🚀 ~ WeatherWidget ~ currentWeather:", currentWeather);
  return (
    <Card
      onClick={() =>
        window.open(`https://www.windy.com/${latitude}/${longitude}?radar,${latitude},${longitude},8`, "_blank")
      }
      sx={{
        minWidth: 225,
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.1)), ${
          currentWeather?.daylight === false ? "url(/images/weather/night-sky.jpg)"
          : currentWeather?.daylight === false && currentWeather?.conditionCode.toLowerCase().includes("rain") ?
            "url(/images/weather/night-sky-rain.jpg)"
          : currentWeather?.conditionCode.toLowerCase().includes("cloud") ? "url(/images/weather/clouds.jpg)"
          : currentWeather?.conditionCode.toLowerCase().includes("clear") ? "url(/images/weather/clear.jpg)"
          : currentWeather?.conditionCode.toLowerCase().includes("rain") ? "url(/images/weather/rain.jpg)"
          : "#19C3FB"
        }`,
        backgroundSize: "cover",
        backgroundColor: "black",
        color: "white",
        borderRadius: "15px",
      }}>
      <CardContent
        sx={{
          color: "white",
        }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexDirection: "row",
            alignItems: "center",
          }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Typography
                sx={{
                  color: "white",
                }}
                variant="h1"
                component="div">
                {Math.round(celsiusToFahrenheit(currentWeather?.temperature))}°
              </Typography>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Typography
                  sx={{
                    color: "white",
                    fontFamily: "'Baloo Bhaijaan', cursive",
                    textAlign: "center",
                  }}
                  variant="h5"
                  color="textSecondary">
                  Rain
                </Typography>
                <Typography
                  sx={{
                    color: "white",
                    fontFamily: "'Baloo Bhaijaan', cursive",
                    textAlign: "center",
                  }}
                  variant="h5"
                  color="textSecondary">
                  {dailyForecasts[0].precipitationChance.toLocaleString("en-us", {
                    maximumFractionDigits: 0,
                  })}
                  %
                </Typography>
              </div>
            </div>
            <Typography
              sx={{
                color: "white",
                fontFamily: "'Baloo Bhaijaan', cursive",
                textAlign: "center",
              }}
              variant="h5">
              {conditionName(currentWeather?.conditionCode, "Unknown condition code")}
            </Typography>
            <Typography
              sx={{
                color: "white",
                fontFamily: "'Baloo Bhaijaan', cursive",
                textAlign: "center",
              }}
              variant="h2"
              color="textSecondary">
              {Math.round(celsiusToFahrenheit(dailyForecasts[0].temperatureMin))}° -{" "}
              {Math.round(celsiusToFahrenheit(dailyForecasts[0].temperatureMax))}°
            </Typography>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
