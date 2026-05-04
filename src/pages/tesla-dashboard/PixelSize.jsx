import React, { useState, useEffect } from "react";
import "./DateTime.css";
import { Card, CardContent, Typography, CircularProgress, Box } from "@mui/material";

const DateTimeWidget = () => {
  const [dateTime, setDateTime] = useState(new Date());

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(dateTime);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(dateTime);

  return (
    <div className="date-time-widget">
      <div className="date-time-content">
        <Typography
          variant="p"
          style={{
            fontSize: "2rem",
            margin: 0,
            padding: 0,
            textAlign: "right",
          }}>
          {window.innerHeight}x{window.innerWidth}
        </Typography>
      </div>
    </div>
  );
};

export default DateTimeWidget;
