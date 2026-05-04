import React from "react";
import "./CalendarWidget.css";

const CalendarWidget = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = today.getDate();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days = [];

  // Fill in the blanks for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }

  // Fill in the days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="calendar-widget">
      <div className="calendar-header">
        <h2 style={{ margin: 0 }}>
          {today.toLocaleString("default", { month: "long" }).toUpperCase()} {currentYear}
        </h2>
      </div>
      <div className="calendar-grid">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div key={index} className="calendar-day-header">
            {day}
          </div>
        ))}
        {days.map((day, index) => (
          <div key={index} className={`calendar-day ${day === currentDate ? "current-day" : ""}`}>
            {day || ""}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarWidget;
