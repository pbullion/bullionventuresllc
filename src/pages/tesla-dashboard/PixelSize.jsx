import "./DateTime.css";
import { Typography } from "@mui/material";

// Diagnostic widget: just reports the viewport size, for dialing in the Tesla
// browser's layout. (It carried a clock's worth of unused date/time plumbing.)
const DateTimeWidget = () => {
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
