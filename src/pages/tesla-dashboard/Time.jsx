import React, { useState, useEffect } from "react";
import Clock from "react-clock";
import "./Clock.css";
import "react-clock/dist/Clock.css";

const DateTimeWidget = () => {
  const [dateTime, setDateTime] = useState(new Date());
  const [value, setValue] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setValue(new Date()), 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    const intervalId = setInterval(() => {
      setDateTime(
        new Intl.DateTimeFormat("en-US", {
          day: "numeric",
          timeZone: "America/Chicago",
        })
      );
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="light-fancy-clock-container">
      <Clock
        value={value}
        size={200}
        minuteHandLength={70}
        minuteHandWidth={4}
        hourHandLength={50}
        hourHandWidth={7}
        renderMinuteMarks={false}
      />
    </div>
  );
};

export default DateTimeWidget;
