import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, Typography, CircularProgress, Box } from "@mui/material";
import "./WeatherForecast.css";

const WeatherWidget = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const defaultLatitude = 29.8021; // Default latitude for ZIP code 77018
  const defaultLongitude = -95.3988; // Default longitude for ZIP code 77018

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          fetchWeatherData(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting user location:", error);
          setLatitude(defaultLatitude);
          setLongitude(defaultLongitude);
          fetchWeatherData(defaultLatitude, defaultLongitude);
          setError("Unable to retrieve your location, using default location");
          setLoading(false);
        },
      );
    } else {
      setError("Geolocation is not supported by this browser");
      setLatitude(defaultLatitude);
      setLongitude(defaultLongitude);
      fetchWeatherData(defaultLatitude, defaultLongitude);
      setLoading(false);
    }
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
    getUserLocation();
  }, []);

  const colors = {
    cloudy: {
      backgroundColor: "#D3D3D3",
      accentColors: ["#A9A9A9", "#FFFFFF"],
      description:
        "Light gray reflects the overcast nature of cloudy weather, while dark gray and white accents can provide depth and contrast.",
    },
    sun: {
      backgroundColor: "#fcea27",
      accentColors: ["white", "#87CEEB", "#FFFFFF"],
      description:
        "A light yellow background evokes the warmth and brightness of sunny weather. Bright yellow accents can enhance the cheerful feeling, while sky blue and white can provide a refreshing contrast.",
    },
    rain: {
      backgroundColor: "#ADD8E6",
      accentColors: ["#4682B4", "#708090", "#FFFFFF"],
      description:
        "Light blue gives a calming effect reminiscent of rainfall. Dark blue and gray accents can represent the heavier aspects of rain, while white can add a clean, crisp contrast.",
    },
    storm: {
      backgroundColor: "#2F4F4F",
      accentColors: ["#FFD700", "#800080", "#FFFFFF"],
      description:
        "Dark gray sets a dramatic tone appropriate for thunderstorms. Lightning yellow provides a striking contrast representing lightning, while purple can add depth and a sense of intensity. White can be used sparingly to highlight important elements.",
    },
  };
  useEffect(() => {
    const intervalInMilliseconds = 5 * 60 * 1000;
    const intervalId = setInterval(() => {
      getUserLocation();
    }, intervalInMilliseconds);

    return () => clearInterval(intervalId);
  }, []);

  function getConditionNames() {
    const conditionCodes = [
      "Clear",
      "Cloudy",
      "Dust",
      "Fog",
      "Haze",
      "MostlyClear",
      "MostlyCloudy",
      "PartlyCloudy",
      "ScatteredThunderstorms",
      "Smoke",
      "Breezy",
      "Windy",
      "Drizzle",
      "HeavyRain",
      "Rain",
      "Showers",
      "Flurries",
      "HeavySnow",
      "MixedRainAndSleet",
      "MixedRainAndSnow",
      "MixedRainfall",
      "MixedSnowAndSleet",
      "ScatteredShowers",
      "ScatteredSnowShowers",
      "Sleet",
      "Snow",
      "SnowShowers",
      "Blizzard",
      "BlowingSnow",
      "FreezingDrizzle",
      "FreezingRain",
      "Frigid",
      "Hail",
      "Hot",
      "Hurricane",
      "IsolatedThunderstorms",
      "SevereThunderstorm",
      "Thunderstorm",
      "Tornado",
      "TropicalStorm",
    ];

    const conditionNames = [
      "Clear",
      "Cloudy",
      "Dust",
      "Fog",
      "Haze",
      "Mostly Clear",
      "Mostly Cloudy",
      "Partly Cloudy",
      "Scattered Thunderstorms",
      "Smoke",
      "Breezy",
      "Windy",
      "Drizzle",
      "Heavy Rain",
      "Rain",
      "Showers",
      "Flurries",
      "Heavy Snow",
      "Mixed Rain & Sleet",
      "Mixed Rain & Snow",
      "Mixed Rainfall",
      "Mixed Snow & Sleet",
      "Scattered Showers",
      "Scattered Snow Showers",
      "Sleet",
      "Snow",
      "Snow Showers",
      "Blizzard",
      "Blowing Snow",
      "Freezing Drizzle",
      "Freezing Rain",
      "Frigid",
      "Hail",
      "Hot",
      "Hurricane",
      "Isolated Thunderstorms",
      "Severe Thunderstorm",
      "Thunderstorm",
      "Tornado",
      "Tropical Storm",
    ];

    const conditionsWithSpaces = {};
    for (let i = 0; i < conditionCodes.length; i++) {
      conditionsWithSpaces[conditionCodes[i]] = conditionNames[i];
    }

    return conditionsWithSpaces;
  }
  function getConditionName(code) {
    const conditionsWithSpaces = getConditionNames();
    return conditionsWithSpaces[code] || "Unknown condition code";
  }
  const getColor = (type, condition) => {
    if (type === "background") {
      if (condition?.includes("cloud")) {
        return colors.cloudy.backgroundColor;
      }
      if (condition?.includes("clear")) {
        return colors.sun.backgroundColor;
      } else return "#19C3FB";
    } else {
      if (condition?.includes("cloud")) {
        return colors.cloudy.accentColors[0];
      }
      if (condition?.includes("clear")) {
        return colors.sun.accentColors[0];
      } else return "white";
    }
  };
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
              {getConditionName(currentWeather?.conditionCode)}
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
