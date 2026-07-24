import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, Typography, Box } from "@mui/material";
import "./WeatherForecast.css";

const WeatherWidget = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  useEffect(() => {
    const fetchWeatherData = async (latitude, longitude) => {
      try {
        const response = await axios.get(
          `https://sheline-art-website-api.herokuapp.com/patrick/tesla-dashboard-weather?lat=${latitude}&lon=${longitude}`,
        );
        console.log("🚀 ~ fetchWeatherData ~ response:", response);
        setWeatherData(response.data);
      } catch (error) {
        console.error("Error fetching weather data:", error);
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
          },
        );
      } else {
        console.error("Geolocation is not supported by this browser");
      }
    };

    getUserLocation();
  }, []);

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
          {dailyForecasts?.slice(0, 6).map((day, index) => (
            <Box
              key={index}
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "3px" }}>
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
                {day.precipitationType !== "clear" ?
                  `${(day.precipitationChance * 100).toLocaleString("en-us", { maximumFractionDigits: 0 })}%`
                : "0%"}
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
