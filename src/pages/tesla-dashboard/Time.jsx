import { useState, useEffect } from "react";
import Clock from "react-clock";
import "./Clock.css";
import "react-clock/dist/Clock.css";

const DateTimeWidget = () => {
  const [value, setValue] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setValue(new Date()), 1000);

    return () => {
      clearInterval(interval);
    };
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
