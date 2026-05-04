import React, { useEffect, useRef, useState } from "react";
import {
  Grid,
  Typography,
  FormControl,
  Switch,
  ListItemText,
  ListItemSecondaryAction,
  List,
  ListItem,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  DialogContent,
  Slider,
  Box,
  CircularProgress,
} from "@mui/material";
import { WiDaySunny, WiDayCloudy, WiThunderstorm, WiSnow } from "weather-icons-react";
import { useParams } from "react-router-dom";
import ReactLoading from "react-loading";
import SettingsIcon from "@mui/icons-material/Settings";
import SportsFootballIcon from "@mui/icons-material/SportsFootball";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball";
import SportsHockeyIcon from "@mui/icons-material/SportsHockey";
import "./oddsScreen.css";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import { parseISO, formatDistanceToNow } from "date-fns";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import browserDetect from "browser-detect";
import moment from "moment";
import momentTimezone from "moment-timezone";

function OddsScreen(props) {
  const browserData = browserDetect();
  const { email, defaultFontSize } = useParams();
  const { selectOddsDisplay } = props;
  const [textSize, setTextSize] = useState(2);
  const [screenWidth, setScreenWidth] = useState(500);
  const [screenHeight, setScreenHeight] = useState(500);
  const [allGames, setAllGames] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [onlyOneColumn, setOnlyOneColumn] = useState(false);
  const [justTop25Basketball, setJustTop25Basketball] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isBehindTheScenesLoading, setIsBehindTheScenesLoading] = useState(false);
  const [user, setUser] = useState("pbullion@gmail.com");
  const [lastUpdated, setLastUpdated] = useState(moment().format("h:mm:ss"));
  const [sports_to_display, setSportsToDisplay] = useState(["NFL", "MLB", "NBA", "NHL", "NCAABASKETBALL"]);
  const isLoadingRef = useRef(isLoading);
  const sportsToDisplayRef = useRef(sports_to_display);
  const [sessionID, setSessionID] = useState("");
  const sessionIDRef = useRef(sessionID);
  sessionIDRef.current = sessionID;
  sportsToDisplayRef.current = sports_to_display;
  isLoadingRef.current = isLoading;

  // useEffect(() => {
  //   if (user) {
  //     handleResize();
  //   }
  // }, [user]);

  function convertToDate(dateStr) {
    const currentYear = new Date().getFullYear();
    const formattedDateStr = `${dateStr} ${currentYear}`;
    return new Date(formattedDateStr);
  }

  function convertToMonthDayString(dateStr) {
    const currentYear = new Date().getFullYear();
    const formattedDateStr = `${dateStr} ${currentYear}`;
    const jsDate = new Date(formattedDateStr);
    return moment(jsDate).format("MMMM D");
  }

  useEffect(() => {
    if (defaultFontSize) {
      setTextSize(parseFloat(defaultFontSize));
    } else {
      setTextSize(1.3);
    }
    setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // useEffect(() => {
  //   handleResize();
  // }, [sports_to_display]);

  useEffect(() => {
    const getUpdate = () => {
      setIsBehindTheScenesLoading(true);
      checkSubscription(user);
    };
    const intervalId = setInterval(getUpdate, 15000);
    return () => clearInterval(intervalId);
  }, [user]);

  const checkSubscription = async (email) => {
    const url = `https://sheline-art-website-api.herokuapp.com/odds-screen/check-subscription/${email}`;
    const requestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    };
    fetch(url, requestOptions)
      .then((response) => response.json())
      .then((data) => {
        fetchGames();
      });
  };

  useEffect(() => {}, [allGames]);

  const isDateToday = (dateStr) => {
    if (dateStr === undefined) return false;
    const today = new Date();
    const [month, day] = dateStr.split(" ");
    return today.getDate() === parseInt(day) && today.toLocaleString("en-us", { month: "long" }) === month;
  };
  const fetchGames = async () => {
    const currentTime = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const centralTime = new Date(currentTime);
    const currentHour = centralTime.getHours();
    const url = `https://sheline-art-website-api.herokuapp.com/patrick/all-data-2/mancavedisplaysllc@gmail.com`;
    // const url = `http://localhost:3001/patrick/all-data-2/mancavedisplaysllc@gmail.com`;
    const requestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    };
    const isInTimeFrame = true;
    if (isInTimeFrame || isLoadingRef.current) {
      fetch(url, requestOptions)
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          console.log(data);
          const filteredData = data
            .filter((x) => {
              if (x[0][0].includes("logo") || x[0][0].includes("ncaa")) return x;
            })
            .map((x) => x.splice(0, 1) && x)
            .map((league) => {
              return league
                .filter((x) => !x[0].includes("final"))
                .filter((x) => !x[0].includes("postponed"))
                .map((x) => {
                  const league = x[0].split(" ")[2].toUpperCase();
                  const isPregame = x[0].includes("pregame");
                  if (isPregame && (league === "NFL" || league === "NCAAFOOTBALL" || league === "NCAABASKETBALL")) {
                    const dateParts = x[20].match(/(\w+), (\w+) (\d+)(?:st|nd|rd|th)/);
                    const dayOfWeek = dateParts[1];
                    const month = dateParts[2];
                    const day = dateParts[3];
                    const year = new Date().getFullYear();
                    const fullDateStr = `${month} ${day}, ${month === "January" ? "2024" : year} ${x[11]}`;
                    const dateStr = `${month} ${day}`;
                    const timeUntilString = new Date(`${dateStr}, ${year} ${x[11]} PM`);
                    const jsDate = new Date(fullDateStr);
                    return {
                      homeTeam: x[10],
                      awayTeam: x[5],
                      homeMoneyLine: x[16],
                      awayMoneyLine: x[15],
                      homeSpread: x[23],
                      awaySpread: x[22],
                      overUnder: x[17],
                      fullDate: jsDate,
                      dateStr: dateStr,
                      time: momentTimezone(moment(x[11], "h:mm A")).tz(userTimezone).format("h:mm"),
                      date: x[20],
                      sport: league,
                      inProgress: !isPregame,
                      timeUntilString: formatDistanceToNow(timeUntilString, { addSuffix: false }),
                      conferences: x[24],
                      tvChannel: x[25],
                      id: x[29],
                      weather: x[26],
                      temperature: x[27],
                      indoors: x[28],
                    };
                  } else if (!isPregame && (league === "NFL" || league === "NCAAFOOTBALL")) {
                    return {
                      homeTeam: x[10],
                      awayTeam: x[5],
                      homeSpread: x[20],
                      awaySpread: x[19],
                      homeScore: x[13],
                      awayScore: x[12],
                      quarter:
                        x[11] === "TIME" ? "HALF"
                        : x[11].includes("of") ? "End"
                        : x[14],
                      clock:
                        x[11] === "TIME" ? "TIME"
                        : x[11].includes("of") ? x[11].split("of ")[1]
                        : x[11],
                      homeMoneyLine: x[23],
                      awayMoneyLine: x[22],
                      overUnder: x[21],
                      time: momentTimezone(moment(x[11], "h:mm A")).tz(userTimezone).format("h:mm"),
                      sport: league,
                      inProgress: !isPregame,
                      tvChannel: x[25],
                      id: x[26],
                    };
                  } else if (!isPregame && league === "NCAABASKETBALL") {
                    return {
                      homeTeam: x[10],
                      awayTeam: x[5],
                      homeSpread: x[23],
                      awaySpread: x[22],
                      homeScore: x[13],
                      awayScore: x[12],
                      quarter:
                        x[11] === "TIME" ? "HALF"
                        : x[11].includes("of") ? "End"
                        : x[14],
                      clock:
                        x[11] === "TIME" ? "TIME"
                        : x[11].includes("of") ? x[11].split("of ")[1]
                        : x[11],
                      homeMoneyLine: x[20],
                      awayMoneyLine: x[19],
                      overUnder: x[21],
                      time: momentTimezone(moment(x[11], "h:mm A")).tz(userTimezone).format("h:mm"),
                      sport: league,
                      inProgress: !isPregame,
                      conferences: x[24],
                      tvChannel: x[25],
                      id: x[26],
                    };
                  } else if (isPregame && league === "NBA") {
                    const dateParts = x[20].match(/(\w+), (\w+) (\d+)(?:st|nd|rd|th)/);
                    const dayOfWeek = dateParts[1];
                    const month = dateParts[2];
                    const day = dateParts[3];
                    const year = new Date().getFullYear();
                    const fullDateStr = `${month} ${day}, ${month === "January" ? "2024" : year} ${x[11]}`;
                    const dateStr = `${month} ${day}`;
                    const jsDate = new Date(fullDateStr);
                    const timeUntilString = new Date(`${dateStr}, ${year} ${x[11]} PM`);
                    return {
                      homeTeam: x[10],
                      awayTeam: x[5],
                      homeSpread: x[23],
                      awaySpread: x[22],
                      homeMoneyLine: x[16],
                      awayMoneyLine: x[15],
                      overUnder: x[17],
                      time: momentTimezone(moment(x[11], "h:mm A")).tz(userTimezone).format("h:mm"),
                      sport: league,
                      fullDate: jsDate,
                      dateStr: dateStr,
                      inProgress: !isPregame,
                      timeUntilString: formatDistanceToNow(timeUntilString, { addSuffix: false }),
                      tvChannel: x[25],
                      id: x[29],
                    };
                  } else if (!isPregame && league === "NBA") {
                    return {
                      homeTeam: x[10],
                      awayTeam: x[5],
                      homeMoneyLine: x[20],
                      awayMoneyLine: x[19],
                      homeScore: x[13],
                      awayScore: x[12],
                      quarter:
                        x[11] === "TIME" ? "HALF"
                        : x[11].includes("of") ? "End"
                        : x[14],
                      clock:
                        x[11] === "TIME" ? "TIME"
                        : x[11].includes("of") ? x[11].split("of ")[1]
                        : x[11],
                      homeSpread: x[23],
                      awaySpread: x[22],
                      overUnder: x[21],
                      time: momentTimezone(moment(x[11], "h:mm A")).tz(userTimezone).format("h:mm"),
                      sport: league,
                      inProgress: !isPregame,
                      tvChannel: x[25],
                      id: x[26],
                    };
                  } else if (isPregame && league === "NHL") {
                    const dateParts = x[20].match(/(\w+), (\w+) (\d+)(?:st|nd|rd|th)/);
                    const dayOfWeek = dateParts[1];
                    const month = dateParts[2];
                    const day = dateParts[3];
                    const year = new Date().getFullYear();
                    const fullDateStr = `${month} ${day}, ${month === "January" ? "2024" : year} ${x[11]}`;
                    const dateStr = `${month} ${day}`;
                    const jsDate = new Date(fullDateStr);
                    const timeUntilString = new Date(`${dateStr}, ${year} ${x[11]} PM`);
                    return {
                      homeTeam: x[10],
                      awayTeam: x[5],
                      homeSpread: x[23],
                      awaySpread: x[22],
                      homeMoneyLine: x[16],
                      awayMoneyLine: x[15],
                      overUnder: x[17],
                      time: momentTimezone(moment(x[11], "h:mm A")).tz(userTimezone).format("h:mm"),
                      sport: league,
                      fullDate: jsDate,
                      dateStr: dateStr,
                      inProgress: !isPregame,
                      tvChannel: x[25],
                      id: x[29],
                      date: x[20],
                      timeUntilString: formatDistanceToNow(timeUntilString, { addSuffix: false }),
                    };
                  } else if (!isPregame && league === "NHL") {
                    return {
                      homeTeam: x[10],
                      awayTeam: x[5],
                      homeMoneyLine: x[20],
                      awayMoneyLine: x[19],
                      homeScore: x[13],
                      awayScore: x[12],
                      quarter:
                        x[11] === "TIME" ? "HALF"
                        : x[11].includes("of") ? "End"
                        : x[14],
                      clock:
                        x[11] === "TIME" ? "TIME"
                        : x[11].includes("of") ? x[11].split("of ")[1]
                        : x[11],
                      homeSpread: x[23],
                      awaySpread: x[22],
                      overUnder: x[21],
                      time: momentTimezone(moment(x[11], "h:mm A")).tz(userTimezone).format("h:mm"),
                      sport: league,
                      tvChannel: x[25],
                      id: x[26],
                      inProgress: !isPregame,
                    };
                  } else if (isPregame && league === "MLB") {
                    return {
                      homeTeam: x[10],
                      awayTeam: x[5],
                      homeSpread: x[23],
                      awaySpread: x[22],
                      homeMoneyLine: x[16],
                      awayMoneyLine: x[15],
                      overUnder: x[17],
                      time: momentTimezone(moment(x[11], "h:mm A")).tz(userTimezone).format("h:mm"),
                      sport: league,
                      fullDate: convertToDate(x[20] + " " + x[11]),
                      dateStr: convertToMonthDayString(x[20] + " " + x[11]),
                      inProgress: !isPregame,
                      tvChannel: x[25],
                      id: x[29],
                      date: x[20],
                      awayStartingPitcher: x[18],
                      homeStartingPitcher: x[19],
                    };
                  } else if (!isPregame && league === "MLB") {
                    return {
                      homeTeam: x[10],
                      awayTeam: x[5],
                      homeMoneyLine: x[27],
                      awayMoneyLine: x[26],
                      homeScore: x[13],
                      awayScore: x[12],
                      quarter:
                        x[11] === "TIME" ? "HALF"
                        : x[11].includes("of") ? "End"
                        : x[11],
                      clock: x[22] + " out",
                      homeSpread: x[21],
                      awaySpread: "",
                      overUnder: x[28],
                      time: momentTimezone(moment(x[11], "h:mm A")).tz(userTimezone).format("h:mm"),
                      sport: league,
                      tvChannel: x[25],
                      id: x[26],
                      inProgress: !isPregame,
                      onFirst: x[31],
                      onSecond: x[32],
                      onThird: x[33],
                    };
                  } else {
                    return null;
                    // return {
                    // homeTeam: x[5],
                    // awayTeam: x[10],
                    // homeSpread: x[23],
                    // awaySpread: x[22],
                    // homeScore: 23,
                    // awayScore: 44,
                    // quarter: "1st",
                    // clock: "11:21",
                    // homeMoneyLine: x[16],
                    // awayMoneyLine: x[15],
                    // overUnder: x[17],
                    // time: momentTimezone(moment(x[11], "h:mm A")).tz(userTimezone).format("h:mm"),
                    // sport: league,
                    // tvChannel: x[25],
                    // id: x[26],
                    // inProgress: !isPregame,
                    // };
                  }
                });
            });
          const sorted = []
            .concat(...filteredData)
            .filter((x) => x !== null)
            .sort((a, b) => {
              // First, sort by inProgress status, putting true values before false
              if (a.inProgress && !b.inProgress) {
                return -1;
              } else if (!a.inProgress && b.inProgress) {
                return 1;
              }

              // Then, sort by fullDate
              if (a.fullDate < b.fullDate) {
                return -1;
              } else if (a.fullDate > b.fullDate) {
                return 1;
              }

              // If fullDate is equal, sort by time (assuming time is in 'hh:mm' format)
              // You might need to adjust this if your time format is different
              let aTime = a.time.split(":").map(Number);
              let bTime = b.time.split(":").map(Number);
              aTime = aTime[0] * 60 + aTime[1]; // Convert time to minutes for easier comparison
              bTime = bTime[0] * 60 + bTime[1]; // Convert time to minutes for easier comparison

              return aTime - bTime;
            })
            .filter((x) => x.awayTeam !== "TBD" && x.homeTeam !== "TBD");
          setAllGames(sorted);
          let formattedTimeInUserTimezone = momentTimezone.tz(new Date(), userTimezone).format("h:mm:ss");
          setLastUpdated(formattedTimeInUserTimezone);
          setTimeout(() => {
            setIsLoading(false);
          }, 0);
          setIsBehindTheScenesLoading(false);
        });
    }
    if (sessionIDRef.current === "") {
      const urlTracking = `https://sheline-art-website-api.herokuapp.com/odds-screen/tracking/${user}`;
      const requestOptionsTracking = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ os: browserData.os, browser: browserData.name }),
      };
      fetch(urlTracking, requestOptionsTracking)
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          setSessionID(data.id);
        });
    } else {
      const urlTracking = `https://sheline-art-website-api.herokuapp.com/odds-screen/tracking/${
        sessionIDRef.current
      }/${isInTimeFrame ? "true" : "false"}`;
      const requestOptionsTracking = {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      };
      fetch(urlTracking, requestOptionsTracking).then((response) => {
        return response.json();
      });
    }
  };

  // const handleResize = () => {
  //   const screenWidthHalf = window.innerWidth / 2;
  //   const screenHeight = window.innerHeight;
  //   setScreenWidth(Math.floor(screenWidthHalf) - 100);
  //   setScreenHeight(screenHeight);
  // };

  // window.addEventListener("resize", handleResize);

  const handleSwitchChange = (sport) => {
    setSportsToDisplay((prevValue) => {
      if (prevValue.includes(sport)) {
        return prevValue.filter((s) => s !== sport);
      } else {
        return [...prevValue, sport];
      }
    });
  };

  const handleFormat = (event, newSports) => {
    setSportsToDisplay(newSports);
  };
  const getWeatherIcon = (weather) => {
    if (weather === undefined) return null;
    if (weather.includes("Sunny") || weather.includes("sun")) {
      return <WiDaySunny size={26} color={"yellow"} style={{ marginLeft: 3, marginRight: 3 }} />;
    } else if (weather.includes("cloudy") || weather.includes("Cloudy") || weather.includes("clouds")) {
      return <WiDayCloudy size={24} color={"yellow"} style={{ marginLeft: 3, marginRight: 3 }} />;
    } else if (weather.includes("rain") || weather.includes("Rain")) {
      return <WiThunderstorm size={24} color={"yellow"} style={{ marginLeft: 3, marginRight: 3 }} />;
    } else if (weather.includes("snow") || weather.includes("Snow")) {
      return <WiSnow size={24} color={"yellow"} style={{ marginLeft: 3, marginRight: 3 }} />;
    }
  };
  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: "black",
          display: "flex",
          width: "52%",
          height: 650,
          flexDirection: "column",
          justifyContent: "center",
          alignContent: "center",
          alignItems: "center",
          borderRadius: 10,
        }}>
        <CircularProgress style={{ color: "green" }} />
      </div>
    );
  }
  const getColor = (idx) => {
    if (
      idx === 0 ||
      idx === 4 ||
      idx === 8 ||
      idx === 3 ||
      idx === 7 ||
      idx === 12 ||
      idx === 16 ||
      idx === 20 ||
      idx === 24 ||
      idx === 28
    ) {
      return "#4cff00";
    } else {
      return "#fffd01";
    }
  };
  return (
    <div
      style={{
        backgroundColor: "black",
        display: "flex",
        width: "52%",
        height: 650,
        flexDirection: "column",
        borderRadius: 10,
        overflow: "hidden",
        justifyContent: "space-between",
      }}>
      <div
        style={{
          backgroundColor: "black",
          borderRadius: 10,
          padding: "0px 10px",
          display: "grid",
          gridTemplateColumns: "1fr", // Changed to one column
          gridGap: 8,
          gap: 3,
          width: "100%",
        }}>
        {allGames
          .filter((x) => sportsToDisplayRef.current.includes(x.sport))
          .filter((x) => {
            if (
              justTop25Basketball &&
              x.sport === "NCAABASKETBALL" &&
              (x.homeTeam.includes("#") || x.awayTeam.includes("#"))
            ) {
              return x;
            } else if (x.sport !== "NCAABASKETBALL") {
              return x;
            } else if (!justTop25Basketball) {
              return x;
            }
          })
          .map((game, idx) => {
            return (
              <div
                key={idx}
                style={{
                  cursor: "pointer",
                  color: getColor(idx),
                }}>
                {(
                  game.dateStr !== undefined &&
                  !isDateToday(game.dateStr) &&
                  game.dateStr !==
                    allGames
                      .filter((x) => sportsToDisplayRef.current.includes(x.sport))
                      .filter((x) => {
                        if (
                          justTop25Basketball &&
                          x.sport === "NCAABASKETBALL" &&
                          (x.homeTeam.includes("#") || x.awayTeam.includes("#"))
                        ) {
                          return x;
                        } else if (x.sport !== "NCAABASKETBALL") {
                          return x;
                        } else if (!justTop25Basketball) {
                          return x;
                        }
                      })[
                      (
                        allGames
                          .filter((x) => sportsToDisplayRef.current.includes(x.sport))
                          .filter((x) => {
                            if (
                              justTop25Basketball &&
                              x.sport === "NCAABASKETBALL" &&
                              (x.homeTeam.includes("#") || x.awayTeam.includes("#"))
                            ) {
                              return x;
                            } else if (x.sport !== "NCAABASKETBALL") {
                              return x;
                            } else if (!justTop25Basketball) {
                              return x;
                            }
                          }).length === 1
                      ) ?
                        0
                      : idx - 1
                    ].dateStr
                ) ?
                  <Typography variant={"h6"} style={{ fontSize: `${textSize}rem` }} color={"white"}>
                    {game.dateStr}
                  </Typography>
                : null}
                <Grid container>
                  <Grid item xs={1} style={{ display: "flex", alignItems: "center" }}>
                    {game.sport === "NFL" || game.sport === "NCAAFOOTBALL" ?
                      <SportsFootballIcon style={{ fontSize: `${textSize}rem`, color: "white" }} />
                    : game.sport === "NBA" || game.sport === "NCAABASKETBALL" ?
                      <SportsBasketballIcon style={{ fontSize: `${textSize}rem`, color: "white" }} />
                    : game.sport === "MLB" ?
                      <SportsBaseballIcon style={{ fontSize: `${textSize}rem`, color: "white" }} />
                    : <SportsHockeyIcon style={{ fontSize: `${textSize}rem`, color: "white" }} />}
                  </Grid>
                  <Grid item xs={5}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <Typography
                        variant={"h6"}
                        style={{
                          fontSize: `${textSize}rem`,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                        }}>
                        {game.awayTeam}
                      </Typography>
                      {parseInt(game.awayScore) > parseInt(game.homeScore) ?
                        <ArrowLeftIcon
                          style={{
                            fontSize: `${textSize}rem`,
                            color: idx % 2 === 0 ? "red" : "red",
                          }}
                        />
                      : null}
                    </div>
                  </Grid>
                  {game.awayScore ?
                    <React.Fragment>
                      <Grid item xs={1}>
                        <Typography variant={"h6"} style={{ fontSize: `${textSize}rem`, textAlign: "center" }}>
                          {game.awayScore}
                        </Typography>
                      </Grid>
                      <Grid
                        item
                        xs={1}
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                        }}>
                        <Typography
                          variant={"h6"}
                          style={{
                            display: "flex",
                            alignItems: "flex-end",
                            fontSize: `${
                              game.quarter === "HALF" || game.quarter === "TIME" ? textSize - 0.2
                              : game.sport === "MLB" ? textSize - 0.25
                              : textSize
                            }rem`,
                          }}
                          color={idx % 2 === 0 ? "orange" : "#00b4dd"}>
                          {game.quarter.replace("Top", "T").replace("Bot", "B").replace("Mid", "M").replace("End", "E")}
                        </Typography>
                      </Grid>
                    </React.Fragment>
                  : game.sport === "MLB" ?
                    <>
                      <Grid item xs={1}>
                        <Typography variant={"h6"} style={{ textAlign: "right", fontSize: `${textSize - 0.4}rem` }}>
                          {game.awayStartingPitcher &&
                            game.awayStartingPitcher
                              .replace(/\d+(\.\d+)?/g, "")
                              .trim()
                              .replace(/\s+/g, " ")
                              .replace("-", "")
                              .split(".")[1]}
                        </Typography>
                      </Grid>
                      <Grid item xs={1}></Grid>
                    </>
                  : <Grid item xs={2} style={{ display: "flex", alignItems: "center", justifyContent: "end" }}>
                      {/* <Typography variant={"h6"} style={{ fontSize: `${textSize - 0.2}rem`, textAlign: "center" }} color={"red"}>
                          {!game.timeUntilString.includes("day") &&
                            game.timeUntilString.replace("about ", "").replace("minutes", "min").replace("minute", "min")}
                        </Typography> */}
                      {game.sport === "NFL" && !game.indoors && (
                        <Typography
                          variant={"h6"}
                          style={{ fontSize: `${textSize - 0.2}rem`, textAlign: "center" }}
                          color={"yellow"}>
                          {game.temperature}°
                        </Typography>
                      )}
                      {game.sport === "NFL" && !game.indoors && getWeatherIcon(game.weather)}
                      {game.sport === "NFL" && !game.indoors && (
                        <Typography
                          variant={"h6"}
                          style={{ fontSize: `${textSize - 0.2}rem`, textAlign: "center" }}
                          color={"yellow"}>
                          {game.weather
                            .toUpperCase()
                            .replace("PARTLY ", "")
                            .replace("INTERMITTENT ", "")
                            .replace("THUNDERSTORMS ", "STORMS")
                            .replace("MOSTLY ", "")
                            .replace("HAZY ", "")}
                        </Typography>
                      )}
                    </Grid>
                  }
                  <Grid item xs={1}>
                    <Typography
                      variant={"h6"}
                      style={{ textAlign: "center", fontSize: `${textSize}rem` }}
                      color={
                        game.sport === "MLB" ? "orange"
                        : idx % 2 === 0 ?
                          "green"
                        : "yellow"
                      }>
                      {game.sport !== "MLB" && game.awaySpread === "" ? "-" : game.awaySpread}
                    </Typography>
                  </Grid>
                  <Grid item xs={2}>
                    <Typography
                      variant={"h6"}
                      style={{
                        textAlign: "center",
                        fontSize: `${game.awayMoneyLine && game.awayMoneyLine.length > 4 ? textSize - 0.2 : textSize}rem`,
                      }}>
                      {game.awayMoneyLine === "" ? "-" : game.awayMoneyLine}
                    </Typography>
                  </Grid>
                  <Grid item xs={1} style={{ display: "flex", alignItems: "flex-end" }}>
                    <Typography variant={"h6"} style={{ textAlign: "left", fontSize: `${textSize}rem` }}>
                      O/U
                    </Typography>
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={1}>
                    <Typography
                      variant={"h6"}
                      style={{
                        fontSize: `${
                          game.clock === undefined && game.clock !== game.time ? textSize - 0.3 : textSize - 0.5
                        }rem`,
                      }}
                      color={game.clock === undefined && game.clock !== game.time ? "red" : "#00b4dd"}>
                      {game.clock === undefined && game.clock !== game.time ?
                        game.time
                      : game.tvChannel &&
                        game.tvChannel
                          .replace("NHLPP|", "")
                          .replace("USA Net", "USA")
                          .replace("CW NETWORK", "CW")
                          .replace("BIG12|", "")
                          .replace("NHL NET", "NHLN")
                          .replace("Peacock", "PEA")
                          .replace("NBA TV", "NBAT")
                      }
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <Typography
                        variant={"h6"}
                        style={{
                          fontSize: `${textSize}rem`,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                        }}>
                        {game.homeTeam}
                      </Typography>
                      {parseInt(game.homeScore) > parseInt(game.awayScore) ?
                        <ArrowLeftIcon
                          style={{
                            fontSize: `${textSize}rem`,
                            color: idx % 2 === 0 ? "red" : "red",
                          }}
                        />
                      : null}
                    </div>
                  </Grid>
                  <Grid item xs={1}>
                    {game.homeScore ?
                      <Typography variant={"h6"} style={{ textAlign: "center", fontSize: `${textSize}rem` }}>
                        {game.homeScore}
                      </Typography>
                    : game.homeStartingPitcher ?
                      <Typography variant={"h6"} style={{ textAlign: "right", fontSize: `${textSize - 0.3}rem` }}>
                        {game.homeStartingPitcher &&
                          game.homeStartingPitcher
                            .replace(/\d+(\.\d+)?/g, "")
                            .trim()
                            .replace(/\s+/g, " ")
                            .replace("-", "")
                            .split(".")[1]}
                      </Typography>
                    : <Typography
                        variant={"h6"}
                        style={{ textAlign: "right", fontSize: `${textSize - 0.25}rem` }}
                        color={"#00b4dd"}>
                        {game.tvChannel &&
                          game.tvChannel
                            .replace(" ", "")
                            .replace("NHLPP|", "")
                            .replace("USA Net", "USA")
                            .replace("CW NETWORK", "CW")
                            .replace("BIG12|", "")}
                      </Typography>
                    }
                  </Grid>
                  <Grid
                    item
                    xs={1}
                    style={{
                      justifyContent: "center",
                      display: "flex",
                      alignItems: "flex-start",
                    }}>
                    <Typography
                      variant={"h6"}
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        fontSize:
                          (
                            game.clock === "HALF" ||
                            game.clock === "TIME" ||
                            (game.clock !== undefined &&
                              game.clock.length > 4 &&
                              textSize > 1 &&
                              allGames.filter((x) => sportsToDisplayRef.current.includes(x.sport)).length > 13)
                          ) ?
                            `${textSize - 0.25}rem`
                          : `${textSize}rem`,
                      }}
                      color={idx % 2 === 0 ? "orange" : "#00b4dd"}>
                      {game.clock}
                    </Typography>
                  </Grid>
                  <Grid item xs={1}>
                    <Typography
                      variant={"h6"}
                      style={{ textAlign: "center", fontSize: `${textSize}rem` }}
                      color={
                        game.sport === "MLB" ? "orange"
                        : idx % 2 === 0 ?
                          "green"
                        : "yellow"
                      }>
                      {game.homeSpread === "" ? "-" : game.homeSpread}
                    </Typography>
                  </Grid>
                  <Grid item xs={2}>
                    <Typography
                      variant={"h6"}
                      style={{
                        textAlign: "center",
                        fontSize: `${game.homeMoneyLine && game.homeMoneyLine.length > 4 ? textSize - 0.2 : textSize}rem`,
                      }}>
                      {game.homeMoneyLine === "" ? "-" : game.homeMoneyLine}
                    </Typography>
                  </Grid>
                  <Grid item xs={1}>
                    <Typography
                      variant={"h6"}
                      style={{
                        textAlign: "left",
                        fontSize: `${game.overUnder && game.overUnder.length > 4 ? textSize - 0.2 : textSize}rem`,
                      }}>
                      {game.overUnder === "" ? "-" : game.overUnder}
                    </Typography>
                  </Grid>
                </Grid>
              </div>
            );
          })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex" }}>
          <Typography
            variant={"h3"}
            style={{
              fontFamily: "'Baloo Bhaijaan', cursive",
              fontWeight: 400,
              fontSize: "1.5rem",
            }}
            color={"white"}>
            Odds by BETMGM
          </Typography>
        </div>
        <div style={{ display: "flex" }}>
          <SettingsIcon style={{ fontSize: 25, color: "white", marginLeft: 10 }} onClick={() => setIsSettingsOpen(true)} />
          <Typography
            variant={"h3"}
            onClick={() => setIsSettingsOpen(true)}
            style={{
              fontFamily: "'Baloo Bhaijaan', cursive",
              fontWeight: 400,
              fontSize: "1.5rem",
            }}
            color={"white"}>
            mancavedisplays.com
          </Typography>
        </div>
        <Dialog open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} maxWidth="xxl" fullWidth>
          <DialogTitle>Select Sports to Display</DialogTitle>
          <DialogContent>
            <ToggleButtonGroup
              color="secondary"
              value={sports_to_display}
              onChange={handleFormat}
              aria-label="text formatting"
              style={{ flexWrap: "wrap" }}>
              {["NFL", "MLB", "NBA", "NHL", "NCAABASKETBALL"].map((sport, index) => (
                <ToggleButton key={index} value={sport} aria-label={sport}>
                  {sport}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <List disablePadding>
              <ListItem disableGutters>
                <ListItemText>
                  <Typography variant="body2">Only Show Top 25 Basketball</Typography>
                </ListItemText>
                <FormControl variant="outlined">
                  <ListItemSecondaryAction style={{ paddingRight: 2 }}>
                    <Switch
                      color="secondary"
                      checked={justTop25Basketball}
                      onClick={() => setJustTop25Basketball(!justTop25Basketball)}
                    />
                  </ListItemSecondaryAction>
                </FormControl>
              </ListItem>
            </List>
            <Typography variant="h6" style={{ marginTop: 10 }}>
              Font Size
            </Typography>
            <Box sx={{}}>
              <Slider
                aria-label="Small steps"
                defaultValue={1}
                step={0.25}
                marks
                min={0.25}
                max={3}
                valueLabelDisplay="auto"
                value={textSize}
                onChange={(e, value) => setTextSize(value)}
              />
            </Box>
            <List disablePadding>
              <ListItem disableGutters>
                <ListItemText>
                  <Typography variant="body2">Only Show One Column (vertical displays)</Typography>
                </ListItemText>
                <FormControl variant="outlined">
                  <ListItemSecondaryAction style={{ paddingRight: 2 }}>
                    <Switch color="secondary" checked={onlyOneColumn} onClick={() => setOnlyOneColumn(!onlyOneColumn)} />
                  </ListItemSecondaryAction>
                </FormControl>
              </ListItem>
            </List>
            <Typography variant="h6" style={{ marginTop: 10 }}>
              TIPS
            </Typography>
            <Typography variant="h6" style={{ fontSize: "0.8rem" }}>
              - Bookmark {window.location.href} so you don't have to login everytime
            </Typography>
            <Typography variant="h6" style={{ fontSize: "0.8rem" }}>
              - Add '/2.5' (any number, but probably no larger than 3.5) after the url to autochange the font size if your
              screen always loads small text *** ex. {window.location.href}
              /2.5
            </Typography>
          </DialogContent>
          <DialogActions>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <Button onClick={() => setIsSettingsOpen(false)}>Close</Button>
            </div>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}
export default OddsScreen;
