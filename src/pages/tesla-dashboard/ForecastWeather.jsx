import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, Typography, CircularProgress, Box } from "@mui/material";
import ClearIcon from "@mui/icons-material/WbSunny";
import CloudyIcon from "@mui/icons-material/Cloud";
import DustIcon from "@mui/icons-material/Grain";
import FogIcon from "@mui/icons-material/BlurOn";
import HazeIcon from "@mui/icons-material/WbCloudy";
import MostlyClearIcon from "@mui/icons-material/WbSunny";
import MostlyCloudyIcon from "@mui/icons-material/CloudQueue";
import PartlyCloudyIcon from "@mui/icons-material/CloudOutlined";
import ScatteredThunderstormsIcon from "@mui/icons-material/FlashOn";
import SmokeIcon from "@mui/icons-material/SmokeFree";
import BreezyIcon from "@mui/icons-material/Air";
import WindyIcon from "@mui/icons-material/Toys";
import DrizzleIcon from "@mui/icons-material/Grain";
import HeavyRainIcon from "@mui/icons-material/Opacity";
import RainIcon from "@mui/icons-material/Grain";
import ShowersIcon from "@mui/icons-material/Grain";
import FlurriesIcon from "@mui/icons-material/AcUnit";
import HeavySnowIcon from "@mui/icons-material/AcUnit";
import MixedRainAndSleetIcon from "@mui/icons-material/AcUnit";
import MixedRainAndSnowIcon from "@mui/icons-material/AcUnit";
import MixedRainfallIcon from "@mui/icons-material/AcUnit";
import MixedSnowAndSleetIcon from "@mui/icons-material/AcUnit";
import ScatteredShowersIcon from "@mui/icons-material/Grain";
import ScatteredSnowShowersIcon from "@mui/icons-material/AcUnit";
import SleetIcon from "@mui/icons-material/AcUnit";
import SnowIcon from "@mui/icons-material/AcUnit";
import SnowShowersIcon from "@mui/icons-material/AcUnit";
import BlizzardIcon from "@mui/icons-material/AcUnit";
import BlowingSnowIcon from "@mui/icons-material/AcUnit";
import FreezingDrizzleIcon from "@mui/icons-material/AcUnit";
import FreezingRainIcon from "@mui/icons-material/AcUnit";
import FrigidIcon from "@mui/icons-material/AcUnit";
import HailIcon from "@mui/icons-material/AcUnit";
import HotIcon from "@mui/icons-material/Whatshot";
import HurricaneIcon from "@mui/icons-material/Waves";
import IsolatedThunderstormsIcon from "@mui/icons-material/FlashOn";
import SevereThunderstormIcon from "@mui/icons-material/FlashOn";
import ThunderstormIcon from "@mui/icons-material/FlashOn";
import TornadoIcon from "@mui/icons-material/Toys";
import TropicalStormIcon from "@mui/icons-material/Waves";
import "./WeatherForecast.css";
import { set } from "date-fns";

const WeatherWidget = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const getWeatherIcon = (condition) => {
    const iconMap = {
      Clear: <ClearIcon />,
      Cloudy: <CloudyIcon />,
      Dust: <DustIcon />,
      Fog: <FogIcon />,
      Haze: <HazeIcon />,
      MostlyClear: <MostlyClearIcon />,
      MostlyCloudy: <MostlyCloudyIcon />,
      PartlyCloudy: <PartlyCloudyIcon />,
      ScatteredThunderstorms: <ScatteredThunderstormsIcon />,
      Smoke: <SmokeIcon />,
      Breezy: <BreezyIcon />,
      Windy: <WindyIcon />,
      Drizzle: <DrizzleIcon />,
      HeavyRain: <HeavyRainIcon />,
      Rain: <RainIcon />,
      Showers: <ShowersIcon />,
      Flurries: <FlurriesIcon />,
      HeavySnow: <HeavySnowIcon />,
      MixedRainAndSleet: <MixedRainAndSleetIcon />,
      MixedRainAndSnow: <MixedRainAndSnowIcon />,
      MixedRainfall: <MixedRainfallIcon />,
      MixedSnowAndSleet: <MixedSnowAndSleetIcon />,
      ScatteredShowers: <ScatteredShowersIcon />,
      ScatteredSnowShowers: <ScatteredSnowShowersIcon />,
      Sleet: <SleetIcon />,
      Snow: <SnowIcon />,
      SnowShowers: <SnowShowersIcon />,
      Blizzard: <BlizzardIcon />,
      BlowingSnow: <BlowingSnowIcon />,
      FreezingDrizzle: <FreezingDrizzleIcon />,
      FreezingRain: <FreezingRainIcon />,
      Frigid: <FrigidIcon />,
      Hail: <HailIcon />,
      Hot: <HotIcon />,
      Hurricane: <HurricaneIcon />,
      IsolatedThunderstorms: <IsolatedThunderstormsIcon />,
      SevereThunderstorm: <SevereThunderstormIcon />,
      Thunderstorm: <ThunderstormIcon />,
      Tornado: <TornadoIcon />,
      TropicalStorm: <TropicalStormIcon />,
    };

    return iconMap[condition] || <ClearIcon />;
  };
  useEffect(() => {
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
            setError("Unable to retrieve your location");
            setLoading(false);
          },
        );
      } else {
        setError("Geolocation is not supported by this browser");
        setLoading(false);
      }
    };

    getUserLocation();
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

  const dailyForecasts = weatherData?.forecastDaily.days;
  const celsiusToFahrenheit = (celsius) => {
    return (celsius * 9) / 5 + 32;
  };
  return (
    <Card
      onClick={() =>
        window.open(`https://www.windy.com/${latitude}/${longitude}?radar,${latitude},${longitude},8`, "_blank")
      }
      sx={{
        minWidth: 250,
        background: "#19C3FB",
        color: "white",
        borderRadius: "15px",
        paddingBottom: 0,
      }}>
      <CardContent
        className="custom-card-content"
        style={{ marginTop: 10 }}
        sx={{
          color: "white",
        }}>
        <Box>
          {dailyForecasts?.slice(1, 7).map((day, index) => (
            <Box key={index} display="flex" justifyContent="space-between" alignItems="center" style={{ marginTop: 3 }}>
              <Typography
                variant="p"
                style={{
                  fontFamily: "'Baloo Bhaijaan', cursive",
                  width: 40,
                  fontSize: "1.2rem",
                  margin: 0,
                  padding: 0,
                  textAlign: "left",
                }}>
                {new Date(day.forecastStart).toLocaleDateString("en-US", { weekday: "short" })}
              </Typography>
              <Typography
                variant="p"
                style={{
                  width: 40,
                  fontSize: "1.2rem",
                  margin: 0,
                  padding: 0,
                  textAlign: "right",
                  fontFamily: "'Baloo Bhaijaan', cursive",
                }}>
                {day.precipitationChance.toLocaleString("en-us", {
                  maximumFractionDigits: 0,
                })}
                %
              </Typography>
              <Typography
                variant="p"
                style={{
                  width: 40,
                  fontSize: "1.2rem",
                  margin: 0,
                  padding: 0,
                  textAlign: "right",
                  fontFamily: "'Baloo Bhaijaan', cursive",
                }}>
                {Math.round(celsiusToFahrenheit(day.temperatureMin))}°F
              </Typography>
              <Typography
                variant="p"
                style={{
                  width: 40,
                  fontSize: "1.2rem",
                  margin: 0,
                  padding: 0,
                  textAlign: "right",
                  fontFamily: "'Baloo Bhaijaan', cursive",
                }}>
                {Math.round(celsiusToFahrenheit(day.temperatureMax))}°F
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
