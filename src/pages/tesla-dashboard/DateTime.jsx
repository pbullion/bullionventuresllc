import React, { useState, useEffect } from "react";
import "./DateTime.css";
import { Card, CardContent, Typography, CircularProgress, Box } from "@mui/material";

const DateTimeWidget = () => {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const formattedMonth = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "America/Chicago",
  }).format(dateTime);
  const formattedDay = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    timeZone: "America/Chicago",
  }).format(dateTime);

  return (
    <div className="date-time-widget" style={{ border: "1px solid black" }}>
      <div className="date-time-content">
        <Typography
          variant="p"
          style={{
            fontSize: "2.5rem",
            margin: 0,
            padding: "5px 0px",
            display: "flex",
            justifyContent: "center",
            backgroundColor: "red",
            borderRadius: "5px",
            textAlign: "center",
            fontFamily: "'Baloo Bhaijaan', cursive",
          }}>
          {formattedMonth.replace(",", "")}
        </Typography>
        <Typography
          variant="p"
          style={{
            fontSize: "7rem",
            margin: 0,
            padding: 0,
            textAlign: "right",
            fontFamily: "'Baloo Bhaijaan', cursive",
            color: "black",
          }}>
          {formattedDay.replace(",", "")}
        </Typography>
      </div>
    </div>
  );
};

export default DateTimeWidget;
