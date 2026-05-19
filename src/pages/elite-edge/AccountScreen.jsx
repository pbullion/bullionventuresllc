import * as React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { Button, useTheme } from "@mui/material";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import basesLoaded from "./assets/baseballBases/basesLoaded.png";
import first from "./assets/baseballBases/first.png";
import SportsFootballIcon from "@mui/icons-material/SportsFootball";
import firstAndSecond from "./assets/baseballBases/firstAndSecond.png";
import secondAndThird from "./assets/baseballBases/secondAndThird.png";
import firstAndThird from "./assets/baseballBases/firstAndThird.png";
import second from "./assets/baseballBases/second.png";
import third from "./assets/baseballBases/third.png";
import ReactLoading from "react-loading";
import Carousel from "react-material-ui-carousel";

const isDev = window.location.hostname === "localhost";

function TodaysBets() {
  const navigate = useNavigate();
  const targetDivRef = React.useRef(null);
  const theme = useTheme();
  const [time, setTime] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [todaysBets, setTodaysBets] = React.useState([]);
  const [totals, setTotals] = React.useState({ risk: 0, win: 0 });
  const [fontUpsize, setFontUpsize] = React.useState(true);
  const [finalScores, setFinalScores] = React.useState([]);
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const colors = {
    darkRed: "#A43036",
    lightRed: "#FF4F4B",
    yellow: "#FFD301",
    lightGreen: "#7BB662",
    midGreen: "#639754",
    darkGreen: "#006B3D",
    pregame: "#003366",
    lightPurple: "#da8ee7",
    darkPurple: "#bb28bf",
  };

  // --- NEW: odds helpers ----------------------------------------------------

  // Normalize typical league keys
  const normalizeLeague = (s) => {
    if (!s) return "";
    const k = String(s).toLowerCase();
    if (k.includes("mlb")) return "baseball_mlb";
    if (k.includes("nba")) return "basketball_nba";
    if (k.includes("nfl")) return "americanfootball_nfl";
    if (k.includes("ncaaf")) return "americanfootball_ncaaf";
    if (k.includes("nhl")) return "icehockey_nhl";
    return k;
  };

  // Try to get league key from ESPN scoreboard link (present on your score objects)
  const leagueFromESPNScore = (score) => {
    const href = score?.links?.[0]?.href || "";
    if (href.includes("/mlb/")) return "baseball_mlb";
    if (href.includes("/nba/")) return "basketball_nba";
    if (href.includes("/nfl/")) return "americanfootball_nfl";
    if (href.includes("/nhl/")) return "icehockey_nhl";
    if (href.includes("/college-football/")) return "americanfootball_ncaaf";
    if (href.includes("/mens-college-basketball/")) return "basketball_ncaab"; // not used by odds feed here
    return "";
  };

  // Text normalization for fuzzy match
  function normalizeName(raw) {
    if (!raw) return "";
    let s = String(raw)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\bst\b\.?/g, "saint")
      .replace(/\s+/g, " ")
      .trim();

    // very light aliasing
    s = s.replace(/\bla\b/g, "los angeles").replace(/\bny\b/g, "new york");
    return s;
  }

  // Levenshtein distance + similarity
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    const v0 = new Array(b.length + 1);
    const v1 = new Array(b.length + 1);
    for (let i = 0; i <= b.length; i++) v0[i] = i;
    for (let i = 0; i < a.length; i++) {
      v1[0] = i + 1;
      for (let j = 0; j < b.length; j++) {
        const cost = a[i] === b[j] ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
    }
    return v1[b.length];
  }
  function similarity(a, b) {
    const A = normalizeName(a);
    const B = normalizeName(b);
    if (!A || !B) return 0;
    if (A === B) return 1;
    const d = levenshtein(A, B);
    const m = Math.max(A.length, B.length) || 1;
    return 1 - d / m;
  }
  const toMillis = (d) => (typeof d === "string" ? Date.parse(d) : new Date(d).getTime());
  const withinWindow = (t1, t2, ms) => Math.abs(toMillis(t1) - toMillis(t2)) <= ms;

  // oddsObj from your getAllOdds => { leagueKey: [games...] }
  function extractMyBookieFromOdds(oddsObj) {
    return Object.entries(oddsObj || {}).flatMap(([leagueKey, games]) => {
      const league = normalizeLeague(leagueKey);
      return (games || []).flatMap((game) => {
        const picks = (game.bookmakers || []).filter((b) => b.key === "mybookieag");
        return picks.map((b) => ({
          league,
          commence_time: game.commence_time,
          home_team: game.home_team,
          away_team: game.away_team,
          markets: b.markets || [],
          _game: game,
          _bookmaker: b,
        }));
      });
    });
  }

  // Match one ESPN score to the best MyBookie candidate
  function matchMyBookieToScore(score, mybookie, opts = {}) {
    if (!score) return null;
    const { timeWindowMs = 36 * 60 * 60 * 1000, threshold = 0.82 } = opts;

    const league = leagueFromESPNScore(score);
    const date = score?.date;
    const homeName = score?.competitions?.[0]?.competitors?.[0]?.team?.displayName || "";
    const awayName = score?.competitions?.[0]?.competitors?.[1]?.team?.displayName || "";

    const cands = mybookie.filter(
      (o) => normalizeLeague(o.league) === normalizeLeague(league) && withinWindow(date, o.commence_time, timeWindowMs),
    );

    let best = null;
    let bestScore = -1;
    for (const c of cands) {
      const sHome = Math.max(similarity(homeName, c.home_team), similarity(homeName, c.away_team));
      const sAway = Math.max(similarity(awayName, c.home_team), similarity(awayName, c.away_team));

      // require that home/away both map well, regardless of side
      // use average as composite
      const comp = (sHome + sAway) / 2;
      if (comp > bestScore) {
        bestScore = comp;
        best = c;
      }
    }
    return bestScore >= threshold ? { ...best, _matchScore: bestScore } : null;
  }

  // --------------------------------------------------------------------------

  function convertToMinutes(timeString) {
    const [time, modifier] = timeString?.split(" ")[0].split(":") || [0, 0];
    let hours = parseInt(time, 10);
    const minutes = parseInt(modifier, 10);
    if (timeString?.includes("PM") && hours < 12) {
      hours += 12;
    } else if (timeString?.includes("AM") && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  }

  const getInningBackgroundColor = (won, bet, index, type) => {
    if (bet.status.type.name === "STATUS_SCHEDULED") {
      return { backgroundColor: colors.pregame, color: "white" };
    } else if (bet.status.type.name === "STATUS_FINAL" && won) {
      return { backgroundColor: colors.darkGreen, color: "white" };
    } else if (bet.status.type.name === "STATUS_FINAL" && !won) {
      return { backgroundColor: colors.darkRed, color: "white" };
    } else if (
      bet.status.type.name === "STATUS_IN_PROGRESS" &&
      index === bet.status.period &&
      type === "away" &&
      bet.status.type.detail.toLowerCase().includes("top")
    ) {
      return { backgroundColor: colors.darkPurple, color: "white" };
    } else if (
      bet.status.type.name === "STATUS_IN_PROGRESS" &&
      index === bet.status.period &&
      type === "home" &&
      bet.status.type.detail.toLowerCase().includes("bot")
    ) {
      return { backgroundColor: colors.darkPurple, color: "white" };
    } else if (
      bet.status.type.name === "STATUS_IN_PROGRESS" &&
      index === bet.status.period &&
      type === "home" &&
      bet.status.type.detail.toLowerCase().includes("top")
    ) {
      return { backgroundColor: "transparent", color: "transparent" };
    } else if (bet.status.type.name === "STATUS_IN_PROGRESS" && index > bet.status.period) {
      return { backgroundColor: "transparent", color: "transparent" };
    } else {
      return { backgroundColor: colors.lightPurple, color: "white" };
    }
  };

  const getTotalRemaining = (score, overUnder, type) => {
    const homeTeamScore = parseInt(score.competitions[0].competitors[0].score);
    const awayTeamScore = parseInt(score.competitions[0].competitors[1].score);
    const remaining = overUnder - (homeTeamScore + awayTeamScore);
    const remainingPointsStr = type === "under" ? `Left: ${remaining}` : `Need: ${remaining}`;
    return `Total: ${homeTeamScore + awayTeamScore}  - ${remainingPointsStr}`;
  };

  const getTodaysBets = async () => {
    setIsLoading(true);
    try {
      const time = moment().format("h:mm:ss a");
      setTime(time);
      const devURL = `http://localhost:3001/elite-edge-advisors/get-all-bets`;
      const url = `${"https://sheline-art-website-api.herokuapp.com/elite-edge-advisors/get-all-bets"}`;

      // --- NEW: load odds + extract MyBookie ---------------------------------
      const oddsRes = await getAllOdds(); // [{ league, odds }]
      const odds = {};
      oddsRes.forEach((item) => {
        odds[item.league] = item.odds;
      });
      const mybookie = extractMyBookieFromOdds(odds);
      // -----------------------------------------------------------------------

      const scoresMLB = await getFinalScores(moment().format("YYYYMMDD"));
      const scoresNBA = await getFinalScoresNBA(moment().format("YYYYMMDD"));
      const scoresNHL = await getFinalScoresNHL(moment().format("YYYYMMDD"));
      const scoresNFL = await getFinalScoresNFL(moment().format("YYYYMMDD"));
      const scoresNCAAFootball = await getFinalScoresNCAAFootball(moment().format("YYYYMMDD"));
      const scoresNCAABasketball = await getFinalScoresNCAABasketball(moment().format("YYYYMMDD"));
      const scores = [
        ...scoresMLB,
        ...scoresNHL,
        ...scoresNFL,
        ...scoresNBA,
        ...scoresNCAAFootball,
        ...scoresNCAABasketball,
      ];
      setFinalScores([
        ...scoresMLB,
        ...scoresNHL,
        ...scoresNFL,
        ...scoresNBA,
        ...scoresNCAAFootball,
        ...scoresNCAABasketball,
      ]);

      await fetch(isDev ? devURL : url)
        .then((res) => res.json())
        .then((data) => {
          const { ourBets } = data;
          const filtered = ourBets.map((bet) => {
            return Object.fromEntries(Object.entries(bet).filter(([_, v]) => v != null));
          });
          const allTickets = filtered
            .filter((bet) => !bet.hide)
            .map((unParsedBet) => {
              const keys = Object.keys(unParsedBet).filter((key) => key.includes("bet"));
              const bets = keys.map((key) => unParsedBet[key]);
              const parsedBets = bets
                .map((bet) => JSON.parse(bet))
                .map((bet) => {
                  return { ...bet, id: unParsedBet.id };
                });
              return parsedBets;
            });

          if (allTickets.length === 0) {
            setIsLoading(false);
            return;
          }

          const runningBets = [];
          allTickets.forEach((ticket) => {
            const betsWithScores = ticket.map((bet) => {
              const score = scores?.find((x) => x.id === bet.espnGameId);

              // --- NEW: attach oddsMatch (MyBookie) for this score -------------
              const oddsMatch = score ? matchMyBookieToScore(score, mybookie) : null;
              // ------------------------------------------------------------------

              return { ...bet, score, oddsMatch };
            });

            const inProgress = betsWithScores.filter(
              (bet) =>
                bet.score?.status.type.name === "STATUS_IN_PROGRESS" ||
                bet.score?.status.type.name === "STATUS_HALFTIME" ||
                bet.score?.status.type.name === "STATUS_END_PERIOD" ||
                bet.score?.status.type.name === "STATUS_RAIN_DELAY",
            );
            const scheduled = betsWithScores.filter((bet) => bet.score?.status.type.name === "STATUS_SCHEDULED");
            const finals = betsWithScores.filter(
              (bet) =>
                bet.score?.status.type.name === "STATUS_FINAL" ||
                bet.score?.status.type.name === "STATUS_POSTPONED" ||
                bet.score?.status.type.name === "STATUS_DELAYED",
            );
            ticket.length > 0 &&
              runningBets.push([
                ...inProgress.sort((a, b) => a.score.id - b.score.id),
                ...scheduled
                  .sort((a, b) => a.score.id - b.score.id)
                  .sort(
                    (a, b) =>
                      convertToMinutes(a.details.type.shortDetail.split(" - ")[1]) -
                      convertToMinutes(b.details.type.shortDetail.split(" - ")[1]),
                  ),
                ...finals.sort((a, b) => a.score.id - b.score.id),
              ]);
          });
          let risk = 0;
          let win = 0;
          runningBets.forEach((bet) => {
            if (!bet) return;
            risk += bet[0].riskAmount;
            win += bet[0].winAmount;
          });
          setTodaysBets(runningBets);
          setTotals({ risk, win });
          setIsLoading(false);
        });
    } catch (err) {
      console.error("getTodaysBets error:", err);
      setIsLoading(false);
    }
  };

  const getAllOdds = async () => {
    return await fetch(`https://sheline-art-website-api.herokuapp.com/odds/all-odds`)
      .then((response) => response.json())
      .then((data) => data.oddsRes);
  };

  const getFinalScores = async (date) => {
    return await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${moment(date).format("YYYYMMDD")}`,
    )
      .then((response) => response.json())
      .then((data) => data.events ?? []);
  };
  const getFinalScoresNHL = async (date) => {
    return await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${moment(date).format("YYYYMMDD")}`,
    )
      .then((response) => response.json())
      .then((data) => data.events ?? []);
  };
  const getFinalScoresNBA = async (date) => {
    return await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${moment(date).format("YYYYMMDD")}`,
    )
      .then((response) => response.json())
      .then((data) => data.events ?? []);
  };
  const getFinalScoresNFL = async (date) => {
    return await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${moment(date).format("YYYYMMDD")}`,
    )
      .then((response) => response.json())
      .then((data) => data.events ?? []);
  };
  const getFinalScoresNCAAFootball = async (date) => {
    return await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&dates=${moment(
        date,
      ).format("YYYYMMDD")}`,
    )
      .then((response) => response.json())
      .then((data) => data.events ?? []);
  };
  const getFinalScoresNCAABasketball = async (date) => {
    return await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&dates=${moment(
        date,
      ).format("YYYYMMDD")}`,
    )
      .then((response) => response.json())
      .then((data) => data.events ?? []);
  };

  React.useEffect(() => {
    getTodaysBets();
    window.innerWidth < 1400 && setFontUpsize(false);
  }, []);

  React.useEffect(() => {
    if (autoRefresh) {
      getTodaysBets();
      const interval = setInterval(() => {
        getTodaysBets();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getBaseImgSrc = (score) => {
    const { onFirst, onSecond, onThird } = score.competitions[0].situation;
    if (onFirst && onSecond && onThird) {
      return (
        <img
          alt="baseImage"
          style={{ height: window.innerWidth < 1930 ? 25 : 50, width: window.innerWidth < 1930 ? 25 : 50, marginLeft: 10 }}
          src={basesLoaded}
        />
      );
    } else if (onFirst && !onSecond && !onThird) {
      return (
        <img
          alt="baseImage"
          style={{ height: window.innerWidth < 1930 ? 25 : 50, width: window.innerWidth < 1930 ? 25 : 50, marginLeft: 10 }}
          src={first}
        />
      );
    } else if (!onFirst && onSecond && !onThird) {
      return (
        <img
          alt="baseImage"
          style={{ height: window.innerWidth < 1930 ? 25 : 50, width: window.innerWidth < 1930 ? 25 : 50, marginLeft: 10 }}
          src={second}
        />
      );
    } else if (!onFirst && !onSecond && onThird) {
      return (
        <img
          alt="baseImage"
          style={{ height: window.innerWidth < 1930 ? 25 : 50, width: window.innerWidth < 1930 ? 25 : 50, marginLeft: 10 }}
          src={third}
        />
      );
    } else if (onFirst && onSecond && !onThird) {
      return <img alt="baseImage" style={{ height: 40, width: 40, marginLeft: 10 }} src={firstAndSecond} />;
    } else if (onFirst && !onSecond && onThird) {
      return <img alt="baseImage" style={{ height: 40, width: 40, marginLeft: 10 }} src={firstAndThird} />;
    } else if (!onFirst && onSecond && onThird) {
      return <img alt="baseImage" style={{ height: 40, width: 40, marginLeft: 10 }} src={secondAndThird} />;
    }
  };

  const handleUnhideAll = async () => {
    try {
      const devUrl = `${"http://localhost:3001/elite-edge-advisors/set-todays-bet"}`;
      const url = `https://sheline-art-website-api.herokuapp.com/elite-edge-advisors/unhide-all-bets`;
      const response = await fetch(isDev ? devUrl : url, { method: "PUT", headers: { "Content-Type": "application/json" } });
      if (response.status === 400) {
        throw new Error("Error deleting bets");
      } else {
        getTodaysBets();
      }
    } catch (error) {
      alert(error);
    }
  };

  const handleHideBet = async (bet) => {
    try {
      if (window.confirm("Are you sure you want to hide this bet?")) {
        const devUrl = `${"http://localhost:3001/elite-edge-advisors/set-todays-bet"}`;
        const url = `https://sheline-art-website-api.herokuapp.com/elite-edge-advisors/${bet[0].id}`;
        const response = await fetch(isDev ? devUrl : url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        });
        if (response.status === 400) {
          throw new Error("Error deleting bets");
        } else {
          getTodaysBets();
        }
      } else {
        return;
      }
    } catch (error) {
      alert(error);
    }
  };

  const getLinescore = (linescore, bet) => {
    if (bet.score?.competitions[0].format.regulation.periods === 9) {
      if (linescore?.length > 8) return linescore.map((x) => x.value);
      else if (linescore?.length < 9) {
        const bets = new Array(9 - linescore?.length).fill("");
        bets.unshift(...linescore.map((x) => x.value));
        return bets;
      } else {
        const bets = new Array(9).fill("");
        return bets;
      }
    } else if (bet.score?.competitions[0].format.regulation.periods === 3) {
      if (linescore?.length > 2) return linescore.map((x) => x.value);
      else if (linescore?.length < 3) {
        const bets = new Array(3 - linescore?.length).fill("-");
        bets.unshift(...linescore.map((x) => x.value));
        return bets;
      } else {
        const bets = new Array(3).fill("-");
        return bets;
      }
    } else if (bet.score?.competitions[0].format.regulation.periods === 2) {
      if (linescore?.length > 2) return linescore.map((x) => x.value);
      else if (linescore?.length < 3) {
        const bets = new Array(2 - linescore?.length).fill("-");
        bets.unshift(...linescore.map((x) => x.value));
        return bets;
      } else {
        const bets = new Array(2).fill("-");
        return bets;
      }
    } else if (bet.score?.competitions[0].format.regulation.periods === 4) {
      if (linescore?.length === 4) return linescore.map((x) => x.value);
      else if (linescore?.length < 4 && linescore?.length > 0) {
        const bets = new Array(4 - linescore?.length).fill("-");
        bets.unshift(...linescore.map((x) => x.value));
        return bets;
      } else {
        const bets = new Array(4).fill("");
        return bets;
      }
    }
  };

  const getColorForBackground = (won, bet, tied) => {
    const { score, ourBet } = bet;
    if (score.status.type.name === "STATUS_SCHEDULED") {
      return { backgroundColor: colors.pregame, color: "white" };
    } else if (score.status.type.name === "STATUS_FINAL" && won) {
      return { backgroundColor: colors.darkGreen, color: "white" };
    } else if (score.status.type.name === "STATUS_FINAL" && !won) {
      return { backgroundColor: colors.darkRed, color: "white" };
    } else if (tied) {
      return { backgroundColor: colors.yellow, color: "black" };
    } else if (won) {
      return { backgroundColor: colors.lightGreen, color: "white" };
    } else {
      return { backgroundColor: colors.lightRed, color: "white" };
    }
  };

  const getGameStatus = (score) => {
    const periods = score.competitions[0].format.regulation.periods;
    const comp = score.competitions[0];
    return (
      periods === 9 ? `${score.status.type.detail} ● ${comp.situation.balls}-${comp.situation.strikes} ● ${comp.outsText}`
      : periods === 3 ? `${score.status.type.detail}`
      : periods === 2 || periods === 4 ? `${score.status.type.shortDetail}`
      : `${score.status.type.shortDetail} ${
          score?.status.type.name !== "STATUS_HALFTIME" ? "○ " + comp.situation.downDistanceText : ""
        }`
    );
  };
  const getSpread = (bet, side) => {
    const om = bet?.oddsMatch ?? undefined; // null/undefined-safe
    const away = om?.away_team ?? bet?.awayTeam ?? ""; // fallback to other fields or empty
    const home = om?.home_team ?? bet?.homeTeam ?? "";
    const name = side === "away" ? away : home;

    // Guard: if we have no markets, stop early
    if (!om?.markets?.length || !name) return null;

    const point = om.markets
      ?.find((m) => m?.key === "spreads")
      ?.outcomes?.find((o) => o?.name?.toLowerCase?.() === name.toLowerCase())?.point;

    if (point == null) return null; // nothing available
    return point >= 0 ? `+${point}` : `${point}`;
  };

  const getDarkBgColor = (color) => {
    if (color === "#3FD76F") return "#006B3D"; // dark green
    if (color === "red") return "#A43036"; // dark red
    if (color === "yellow") return "#8B7000"; // dark yellow
    return "#333333"; // fallback dark gray
  };

  const getOverUnder = (bet) => {
    console.log("🚀 ~ getOverUnder ~ bet:", bet);
    const om = bet?.oddsMatch ?? undefined;
    if (!om?.markets?.length) return null;

    const oddsmatchPoint = om.markets?.find((m) => m?.key === "totals")?.outcomes?.find((o) => o?.name === "Over")?.point;
    if (oddsmatchPoint == null) return null;

    // Get the bet type and our bet point
    const betType = bet?.ourBet?.outcome?.trim()?.toLowerCase(); // "over" or "under"
    const ourBetPoint = bet?.ourBet?.details?.point;

    if (!betType || ourBetPoint == null) {
      return { value: oddsmatchPoint, color: "white" }; // fallback
    }

    // Compare odds to determine color
    let color = "white";
    if (betType === "under") {
      // For under bets: we want the actual total to be less
      // If oddsmatchPoint < ourBetPoint, we're winning (green)
      // If oddsmatchPoint > ourBetPoint, we're losing (red)
      color =
        oddsmatchPoint < ourBetPoint ? "#3FD76F"
        : oddsmatchPoint > ourBetPoint ? "red"
        : "yellow";
    } else if (betType === "over") {
      // For over bets: we want the actual total to be more
      // If oddsmatchPoint > ourBetPoint, we're winning (green)
      // If oddsmatchPoint < ourBetPoint, we're losing (red)
      color =
        oddsmatchPoint > ourBetPoint ? "#3FD76F"
        : oddsmatchPoint < ourBetPoint ? "red"
        : "yellow";
    }

    return { value: oddsmatchPoint, color };
  };

  // Helper function to get spread with color coding
  const getSpreadWithColor = (spreadPoint, ourBetOutcome) => {
    if (spreadPoint == null) return null;

    let color = "white";
    // Negative spread = team is favored (good for us if we bet on them)
    // Positive spread = team is underdog (bad odds for us if we bet on them)
    if (spreadPoint < 0) {
      color = "#3FD76F"; // favored (favorable) - bright green
    } else if (spreadPoint > 0) {
      color = "red"; // underdog (unfavorable)
    } else {
      color = "yellow"; // pick'em (neutral)
    }

    return { value: spreadPoint >= 0 ? `+${spreadPoint}` : `${spreadPoint}`, color };
  };

  // Helper function to determine if moneyline bet is predicted to win
  const getMoneylineSpreadColor = (homeTeamDisplayName, awayTeamDisplayName, ourBetOutcome, bet) => {
    const side = ourBetOutcome.trim() === homeTeamDisplayName ? "home" : "away";
    const spreadPoint = getSpread(bet, side);

    if (spreadPoint == null) return null;

    const numSpread = parseFloat(spreadPoint);
    let color = "white";

    // Negative spread = favored to win (green)
    // Positive spread = underdog (red)
    if (numSpread < 0) {
      color = "#3FD76F"; // favored - bright green
    } else if (numSpread > 0) {
      color = "red"; // underdog
    } else {
      color = "yellow"; // pick'em
    }

    return { value: spreadPoint, color };
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          flexDirection: "row",
          backgroundColor: "black",
          height: "100vh",
          justifyContent: "center",
          textAlign: "center",
          alignContent: "center",
          alignItems: "center",
          color: "white",
        }}>
        <ReactLoading type={"spin"} color={"green"} height={150} width={150} />
      </div>
    );
  } else if (window.innerWidth < 700) {
    return (
      <div style={{ backgroundColor: "black" }}>
        {/* <Carousel autoPlay={false} animation="slide" timeout={500}> */}
        {todaysBets
          .sort((x, y) => y[0].winAmount - x[0].winAmount)
          .map((x, idx) => (
            <>
              <div
                style={{
                  color: "white",
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0px 10px",
                }}>
                <div
                  style={{
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                  <p
                    onClick={() => {
                      handleUnhideAll();
                    }}
                    style={{
                      margin: 0,
                      padding: "0 0 0px 0",
                      fontSize: 10,
                      textAlign: "center",
                      fontFamily: "'Baloo Bhaijaan', cursive",
                    }}>
                    {idx + 1} of {todaysBets.length}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      padding: "0 0 0 0",
                      fontSize: 10,
                      textAlign: "center",
                      fontFamily: "'Baloo Bhaijaan', cursive",
                    }}>
                    $
                    {totals.risk.toLocaleString("en-us", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}{" "}
                    to win $
                    {totals.win.toLocaleString("en-us", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}{" "}
                    ($
                    {(totals.risk + totals.win).toLocaleString("en-us", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                    )
                  </p>
                </div>
                <p
                  style={{
                    margin: 0,
                    padding: "0 0 0 0",
                    fontSize: 20,
                    textAlign: "center",
                    fontWeight: "bold",
                    fontFamily: "'Baloo Bhaijaan', cursive",
                  }}
                  onClick={() => {
                    handleHideBet(x);
                  }}>
                  ${x[0].riskAmount} to win $
                  {x[0].winAmount.toLocaleString("en-us", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  width: "100%",
                  gridGap: 0,
                  marginBottom: todaysBets.length - 1 === idx ? 0 : 0,
                  // justifyContent: "flex-start",
                  // flexDirection: "row",
                  // alignContent: "center",
                  backgroundColor: "black",
                  // height: "100vh",
                  textAlign: "center",
                }}>
                {/* <Grid container spacing={0} style={{}} ref={targetDivRef}> */}
                {x?.length > 0 &&
                  x.map((bet, idx) => {
                    const periods = Array.from(
                      { length: bet.score?.competitions[0].format.regulation.periods },
                      (v, k) => k + 1,
                    );
                    const homeTeamID = bet.score?.competitions[0].competitors[0].id;
                    const possession = bet.score?.competitions[0].situation?.possession === homeTeamID ? "home" : "away";
                    const awayTeamDisplayName = bet.score?.competitions[0].competitors[1].team.displayName;
                    const homeTeamDisplayName = bet.score?.competitions[0].competitors[0].team.displayName;
                    const awayTeamScore =
                      bet.ourBet?.type === "spread" && bet.ourBet?.outcome.trim() === awayTeamDisplayName ?
                        parseInt(bet.score?.competitions[0].competitors[1].score) + bet.ourBet?.details.point
                      : parseInt(bet.score?.competitions[0].competitors[1].score);
                    const homeTeamScore =
                      bet.ourBet?.type === "spread" && bet.ourBet?.outcome.trim() === homeTeamDisplayName ?
                        parseInt(bet.score?.competitions[0].competitors[0].score) + bet.ourBet?.details.point
                      : parseInt(bet.score?.competitions[0].competitors[0].score);
                    const homeTeamLineScore = getLinescore(bet.score?.competitions[0].competitors[0].linescores, bet);
                    const awayTeamLineScore = getLinescore(bet.score?.competitions[0].competitors[1].linescores, bet);
                    const shortDetail = bet.details.type.shortDetail;
                    const time = shortDetail.split("- ")[1]?.split(" E")[0];
                    const momentTime = moment(time, "h:mm a").subtract(1, "hour").format("h:mm a");
                    const totalScore = homeTeamScore + awayTeamScore;
                    if (bet.ourBet?.type === "overUnder") {
                      const tied =
                        (bet.ourBet?.outcome.trim() === "over" && totalScore === bet.ourBet?.details.point) ||
                        (bet.ourBet?.outcome.trim() === "under" && totalScore === bet.ourBet?.details.point);
                      const won =
                        (bet.ourBet?.outcome.trim() === "over" && totalScore > bet.ourBet?.details.point) ||
                        (bet.ourBet?.outcome.trim() === "under" && totalScore < bet.ourBet?.details.point);
                      return (
                        <div
                          // onClick={() => {
                          //   window.open(bet.score.links[0]?.href, "_blank");
                          // }}
                          style={{
                            fontFamily: "'Baloo Bhaijaan', cursive",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignContent: "center",
                            cursor: "pointer",
                            alignItems: "center",
                            width: "50vw",
                            border:
                              won ?
                                `1px solid ${getColorForBackground(won, bet, tied).backgroundColor}`
                              : `1px solid ${getColorForBackground(won, bet, tied).backgroundColor}`,
                            backgroundColor: getColorForBackground(won, bet, tied).backgroundColor,
                            padding: "5px 0px",
                            color: getColorForBackground(won, bet).color,
                          }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.7rem",
                              fontWeight: "bold",
                            }}>
                            {bet.awayTeamAbbr} at {bet.homeTeamAbbr} {bet.ourBet?.outcome.trim().toUpperCase()}{" "}
                            {bet.ourBet?.details.point}
                          </p>
                          <div
                            style={{
                              fontFamily: "'Baloo Bhaijaan', cursive",
                              display: "flex",
                              flexDirection: "column",
                            }}>
                            {bet.score.status.type.name === "STATUS_SCHEDULED" && (
                              <p style={{ margin: 0, marginTop: 0 }}>{momentTime} CST</p>
                            )}
                            {bet.score.status.type.name === "STATUS_POSTPONED" && (
                              <p style={{ margin: 0, marginTop: 0 }}>POSTPONED</p>
                            )}
                            {bet.score.status.type.name === "STATUS_DELAYED" && (
                              <p style={{ margin: 0, marginTop: 0 }}>DELAYED</p>
                            )}
                            {bet.score.status.type.name !== "STATUS_SCHEDULED" &&
                              bet.score.status.type.name !== "STATUS_FINAL" &&
                              bet.score.status.type.name !== "STATUS_RAIN_DELAY" &&
                              bet.score.status.type.name !== "STATUS_DELAYED" &&
                              bet.score.status.type.name !== "STATUS_POSTPONED" && (
                                <p style={{ margin: 0, fontSize: "0.7rem", marginTop: 0 }}>{getGameStatus(bet.score)}</p>
                              )}
                            {bet.score.status.type.name !== "STATUS_SCHEDULED" && (
                              <p style={{ margin: 0, fontSize: "0.7rem", marginTop: 0 }}>
                                {getTotalRemaining(bet.score, bet.ourBet?.details.point, bet.ourBet?.outcome.trim())}
                              </p>
                            )}
                          </div>
                          <div
                            style={{
                              fontFamily: "'Baloo Bhaijaan', cursive",
                              display: "flex",
                              flexDirection: "row",
                            }}>
                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "column",
                              }}>
                              {periods.length < 5 && (
                                <p
                                  style={{
                                    textAlign: "left",
                                    margin: 0,
                                    marginTop: 2,
                                    color: getColorForBackground(won, bet, tied).backgroundColor,
                                  }}>
                                  INN
                                </p>
                              )}
                              <p
                                style={{
                                  textAlign: "right",
                                  margin: 0,
                                  marginTop: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                }}>
                                {!bet.score.links[0].href?.includes("nba") &&
                                  possession === "away" &&
                                  periods.length === 4 && <SportsFootballIcon style={{ fontSize: 15 }} />}
                                {bet.awayTeamAbbr}
                              </p>
                              <p
                                style={{
                                  textAlign: "right",
                                  margin: 0,
                                  marginTop: 2,
                                  display: "flex",
                                  justifyContent: "flex-end",
                                  alignItems: "center",
                                }}>
                                {possession === "home" && periods.length === 4 && (
                                  <SportsFootballIcon style={{ fontSize: 15 }} />
                                )}
                                {bet.homeTeamAbbr}
                              </p>
                            </div>
                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "column",
                              }}>
                              {periods.length < 5 && (
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                  }}>
                                  {periods.map((x) => (
                                    <div style={{ marginLeft: 3, marginTop: 0, width: 25 }}>
                                      <p style={{ margin: 0, marginTop: 0, marginLeft: 0 }}>{x}</p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginTop: 2,
                                      marginLeft: 20,
                                      fontWeight: "bold",
                                    }}></p>
                                </div>
                              )}
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  marginLeft: 5,
                                  flexDirection: "row",
                                }}>
                                {periods.length < 5 &&
                                  awayTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 0,
                                        width: 25,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "away")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          marginLeft: 0,
                                          color: "white",
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                <p
                                  style={{
                                    textAlign: "right",
                                    margin: 0,
                                    marginTop: 2,
                                    display: "flex",
                                    alignItems: "center",
                                    marginLeft: 5,
                                    fontWeight: "bold",
                                  }}>
                                  {bet.score?.competitions[0].competitors[1].score}
                                </p>
                              </div>
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  marginLeft: 5,
                                  flexDirection: "row",
                                }}>
                                {periods.length < 5 &&
                                  homeTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 3,
                                        width: 25,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "home")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          marginLeft: 0,
                                          // color: getInningBackgroundColor(won, bet.score, idx + 1, "home")
                                          //   .color,
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                <p
                                  style={{
                                    textAlign: "right",
                                    margin: 0,
                                    marginTop: 2,
                                    display: "flex",
                                    alignItems: "center",
                                    marginLeft: 5,
                                    fontWeight: "bold",
                                  }}>
                                  {homeTeamScore}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div
                            style={{ display: "flex", justifyContent: "center", gap: "15px", width: "100%", marginTop: 5 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: fontUpsize ? "1rem" : "0.75rem",
                                color: "white !important",
                                border: `2px solid ${getDarkBgColor(getOverUnder(bet)?.color)}`,
                                backgroundColor: getDarkBgColor(getOverUnder(bet)?.color),
                                padding: "4px 8px",
                                borderRadius: "4px",
                              }}>
                              O/U: {getOverUnder(bet)?.value}
                            </p>
                          </div>
                        </div>
                      );
                    } else if (bet.ourBet?.type === "spread") {
                      const winner =
                        bet.ourBet?.outcome.trim() === bet.score?.competitions[0].competitors[1].team.displayName ?
                          "away"
                        : "home";
                      const won = winner === "home" ? homeTeamScore >= awayTeamScore : homeTeamScore <= awayTeamScore;
                      return (
                        <div
                          item
                          onClick={() => {
                            window.open(bet.score.links[0].href, "_blank");
                          }}
                          style={{
                            fontFamily: "'Baloo Bhaijaan', cursive",
                            display: "flex",
                            flexDirection: "column",
                            cursor: "pointer",
                            width: "50vw",
                            justifyContent: "center",
                            alignContent: "center",
                            alignItems: "center",
                            border:
                              won ?
                                `1px solid ${getColorForBackground(won, bet).backgroundColor}`
                              : `1px solid ${getColorForBackground(won, bet).backgroundColor}`,
                            backgroundColor: getColorForBackground(won, bet).backgroundColor,
                            padding: "5px 0px",
                            color: getColorForBackground(won, bet).color,
                          }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                            }}>
                            {bet.ourBet?.outcome
                              .trim()
                              .replace(/\([^)]+\)/, "")
                              .slice(0, 24)}{" "}
                            {bet.ourBet?.details.point > 0 ? "+" : null}
                            {bet.ourBet?.details.point}
                          </p>
                          <div
                            style={{
                              fontFamily: "'Baloo Bhaijaan', cursive",
                              display: "flex",
                              flexDirection: "column",
                            }}>
                            {bet.score.status.type.name === "STATUS_SCHEDULED" && (
                              <p style={{ margin: 0, marginTop: 3 }}>{momentTime} CST</p>
                            )}
                            {bet.score.status.type.name === "STATUS_DELAYED" && (
                              <p style={{ margin: 0, marginTop: 3 }}>DELAYED</p>
                            )}
                            {bet.score.status.type.name === "STATUS_POSTPONED" && (
                              <p style={{ margin: 0, marginTop: 3 }}>POSTPONED</p>
                            )}
                            {bet.score.status.type.name !== "STATUS_SCHEDULED" &&
                              bet.score.status.type.name !== "STATUS_FINAL" &&
                              bet.score.status.type.name !== "STATUS_RAIN_DELAY" &&
                              bet.score.status.type.name !== "STATUS_DELAYED" &&
                              bet.score.status.type.name !== "STATUS_POSTPONED" && (
                                <p style={{ margin: 0, marginTop: 0, fontSize: "0.7rem" }}>{getGameStatus(bet.score)}</p>
                              )}
                          </div>
                          <div
                            style={{
                              fontFamily: "'Baloo Bhaijaan', cursive",
                              display: "flex",
                              flexDirection: "row",
                            }}>
                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "column",
                              }}>
                              {periods.length < 5 && (
                                <p
                                  style={{
                                    textAlign: "left",
                                    margin: 0,
                                    marginTop: 2,
                                    color: getColorForBackground(won, bet).backgroundColor,
                                  }}>
                                  INN
                                </p>
                              )}
                              <p
                                style={{
                                  textAlign: "right",
                                  margin: 0,
                                  marginTop: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                }}>
                                {!bet.score.links[0].href?.includes("nba") &&
                                  possession === "away" &&
                                  periods.length === 4 && <SportsFootballIcon style={{ fontSize: 15 }} />}{" "}
                                {bet.awayTeamAbbr}
                              </p>
                              <p
                                style={{
                                  textAlign: "right",
                                  margin: 0,
                                  marginTop: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                }}>
                                {possession === "home" && periods.length === 4 && (
                                  <SportsFootballIcon style={{ fontSize: 15 }} />
                                )}{" "}
                                {bet.homeTeamAbbr}
                              </p>
                            </div>
                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "column",
                              }}>
                              {periods.length < 5 && (
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                  }}>
                                  {periods.map((x) => (
                                    <div style={{ marginLeft: 3, marginTop: 0, width: 25 }}>
                                      <p style={{ margin: 0, marginTop: 0, marginLeft: 0 }}>{x}</p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginTop: 2,
                                      marginLeft: 20,
                                      fontWeight: "bold",
                                    }}></p>
                                </div>
                              )}
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  marginLeft: 5,
                                  flexDirection: "row",
                                }}>
                                {periods.length < 5 &&
                                  awayTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 0,
                                        width: 25,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "away")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          marginLeft: 0,
                                          color: "white",
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                <p
                                  style={{
                                    margin: 0,
                                    marginTop: 2,
                                    marginLeft: 5,
                                    fontWeight: "bold",
                                  }}>
                                  {awayTeamScore}
                                </p>
                              </div>
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  marginLeft: 5,
                                  flexDirection: "row",
                                }}>
                                {periods.length < 5 &&
                                  homeTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 3,
                                        width: 25,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "home")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          marginLeft: 0,
                                          color: getInningBackgroundColor(won, bet.score, idx + 1, "home").color,
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                <p
                                  style={{
                                    margin: 0,
                                    marginTop: 2,
                                    marginLeft: 5,
                                    fontWeight: "bold",
                                  }}>
                                  {homeTeamScore}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div
                            style={{ display: "flex", justifyContent: "center", gap: "15px", width: "100%", marginTop: 5 }}>
                            {bet.ourBet?.type === "spread" && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: fontUpsize ? "1rem" : "0.75rem",
                                  color: "white !important",
                                  border: `2px solid ${getDarkBgColor(getSpreadWithColor(parseFloat(getSpread(bet, winner)), bet.ourBet?.outcome)?.color)}`,
                                  backgroundColor: getDarkBgColor(
                                    getSpreadWithColor(parseFloat(getSpread(bet, winner)), bet.ourBet?.outcome)?.color,
                                  ),
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                }}>
                                {bet.ourBet?.outcome.trim().split(" ")[0]}: {getSpread(bet, winner)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      const winner =
                        bet.ourBet?.outcome.trim() === bet.score?.competitions[0].competitors[1].team.displayName ?
                          "away"
                        : "home";
                      const won = winner === "home" ? homeTeamScore >= awayTeamScore : homeTeamScore <= awayTeamScore;
                      const tied = homeTeamScore === awayTeamScore;
                      return (
                        <div
                          onClick={() => {
                            window.open(bet.score.links[0].href, "_blank");
                          }}
                          style={{
                            fontFamily: "'Baloo Bhaijaan', cursive",
                            display: "flex",
                            width: "50vw",
                            flexDirection: "column",
                            justifyContent: "center",
                            cursor: "pointer",
                            alignContent: "center",
                            alignItems: "center",
                            border:
                              won ?
                                `1px solid ${getColorForBackground(won, bet, tied).backgroundColor}`
                              : `1px solid ${getColorForBackground(won, bet, tied).backgroundColor}`,
                            backgroundColor: getColorForBackground(won, bet, tied).backgroundColor,
                            padding: "5px 0px",
                            color: getColorForBackground(won, bet).color,
                          }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.7rem",
                              fontWeight: "bold",
                            }}>
                            {bet.ourBet?.outcome
                              .trim()
                              .replace(/\([^)]+\)/, "")
                              .slice(0, 24)}{" "}
                            ML {bet.ourBet?.details > 0 ? "+" : null}
                            {bet.ourBet?.details}
                          </p>
                          <div
                            style={{
                              fontFamily: "'Baloo Bhaijaan', cursive",
                              display: "flex",
                              flexDirection: "column",
                            }}>
                            {bet.score.status.type.name === "STATUS_SCHEDULED" && (
                              <p style={{ margin: 0, marginTop: 3 }}>{momentTime} CST</p>
                            )}
                            {bet.score.status.type.name === "STATUS_DELAYED" && (
                              <p style={{ margin: 0, marginTop: 3 }}>DELAYED</p>
                            )}
                            {bet.score.status.type.name === "STATUS_POSTPONED" && (
                              <p style={{ margin: 0, marginTop: 3 }}>POSTPONED</p>
                            )}
                            <div
                              style={{
                                margin: 0,
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "center",
                                alignItems: "center",
                                width: "100%",
                              }}>
                              {bet.score.status.type.name !== "STATUS_SCHEDULED" &&
                                bet.score.status.type.name !== "STATUS_FINAL" &&
                                bet.score.status.type.name !== "STATUS_RAIN_DELAY" &&
                                bet.score.status.type.name !== "STATUS_DELAYED" &&
                                bet.score.status.type.name !== "STATUS_POSTPONED" && (
                                  <React.Fragment>
                                    <p style={{ margin: 0, fontSize: "0.7rem" }}>{getGameStatus(bet.score)}</p>
                                    {getBaseImgSrc(bet.score)}
                                  </React.Fragment>
                                )}
                            </div>
                          </div>
                          <div
                            style={{
                              fontFamily: "'Baloo Bhaijaan', cursive",
                              display: "flex",
                              flexDirection: "row",
                            }}>
                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "column",
                              }}>
                              {periods.length < 5 && (
                                <p
                                  style={{
                                    textAlign: "left",
                                    margin: 0,
                                    marginTop: 2,
                                    color: getColorForBackground(won, bet, tied).backgroundColor,
                                  }}>
                                  INN
                                </p>
                              )}
                              <p
                                style={{
                                  textAlign: "right",
                                  margin: 0,
                                  marginTop: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                }}>
                                {!bet.score.links[0].href?.includes("nba") &&
                                  possession === "away" &&
                                  periods.length === 4 && <SportsFootballIcon style={{ fontSize: 15 }} />}{" "}
                                {bet.awayTeamAbbr}
                              </p>
                              <p
                                style={{
                                  textAlign: "right",
                                  margin: 0,
                                  marginTop: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                }}>
                                {possession === "home" && periods.length === 4 && (
                                  <SportsFootballIcon style={{ fontSize: 15 }} />
                                )}{" "}
                                {bet.homeTeamAbbr}
                              </p>
                            </div>
                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "column",
                              }}>
                              {periods.length < 5 && (
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                  }}>
                                  {periods.map((x) => (
                                    <div style={{ marginLeft: 3, marginTop: 0, width: 25 }}>
                                      <p style={{ margin: 0, marginTop: 0, marginLeft: 0 }}>{x}</p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginTop: 2,
                                      marginLeft: 5,
                                      fontWeight: "bold",
                                    }}></p>
                                </div>
                              )}
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  marginLeft: 5,
                                  flexDirection: "row",
                                }}>
                                {periods.length < 5 &&
                                  awayTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 0,
                                        width: 25,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "away")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          marginLeft: 0,
                                          color: "white",
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                <p
                                  style={{
                                    margin: 0,
                                    marginTop: 2,
                                    marginLeft: 5,
                                    fontWeight: "bold",
                                  }}>
                                  {bet.score?.competitions[0].competitors[1].score}
                                </p>
                              </div>
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  marginLeft: 5,
                                  flexDirection: "row",
                                }}>
                                {periods.length < 5 &&
                                  homeTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 3,
                                        width: 25,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "home")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          marginLeft: 0,
                                          color: getInningBackgroundColor(won, bet.score, idx + 1, "home").color,
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                <p
                                  style={{
                                    margin: 0,
                                    marginTop: 2,
                                    marginLeft: 5,
                                    fontWeight: "bold",
                                  }}>
                                  {bet.score?.competitions[0].competitors[0].score}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div
                            style={{ display: "flex", justifyContent: "center", gap: "15px", width: "100%", marginTop: 5 }}>
                            {bet.ourBet?.type === "moneyline" && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: fontUpsize ? "1rem" : "0.75rem",
                                  color: "white !important",
                                  border: `2px solid ${getDarkBgColor(getMoneylineSpreadColor(homeTeamDisplayName, awayTeamDisplayName, bet.ourBet?.outcome, bet)?.color)}`,
                                  backgroundColor: getDarkBgColor(
                                    getMoneylineSpreadColor(
                                      homeTeamDisplayName,
                                      awayTeamDisplayName,
                                      bet.ourBet?.outcome,
                                      bet,
                                    )?.color,
                                  ),
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                }}>
                                {bet.ourBet?.outcome.trim().split(" ")[0]}:{" "}
                                {
                                  getMoneylineSpreadColor(homeTeamDisplayName, awayTeamDisplayName, bet.ourBet?.outcome, bet)
                                    ?.value
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                  })}
                {/* </Grid> */}
              </div>
            </>
          ))}
        {/* </Carousel> */}
      </div>
    );
  } else {
    return (
      <Carousel autoPlay={true} animation="slide" indicators={false} interval={6000} stopAutoPlayOnHover={false} show>
        {todaysBets
          .sort((x, y) => y[0].winAmount - x[0].winAmount)
          .map((x, idx) => (
            <>
              <div
                style={{
                  backgroundColor: "black",
                  color: "white",
                  display: "flex",
                  width: "100%",
                  flexDirection: "row",
                  justifyContent: "space-around",
                  alignItems: "center",
                }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 30,
                    textAlign: "center",
                    fontFamily: "'Baloo Bhaijaan', cursive",
                  }}>
                  {idx + 1} of {todaysBets.length}
                </p>
                <p
                  onClick={() => {
                    handleHideBet(x);
                  }}
                  style={{
                    margin: 0,
                    fontSize: 40,
                    textAlign: "center",
                    fontWeight: "bold",
                    fontFamily: "'Baloo Bhaijaan', cursive",
                  }}>
                  ${x[0].riskAmount} to win $
                  {x[0].winAmount.toLocaleString("en-us", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p
                  onClick={() => {
                    handleUnhideAll();
                  }}
                  style={{
                    margin: 0,
                    fontSize: 30,
                    textAlign: "center",
                    fontFamily: "'Baloo Bhaijaan', cursive",
                  }}>
                  $
                  {totals.risk.toLocaleString("en-us", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}{" "}
                  to win $
                  {totals.win.toLocaleString("en-us", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}{" "}
                  ($
                  {(totals.risk + totals.win).toLocaleString("en-us", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                  )
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  flexDirection: "column",
                  backgroundColor: "black",
                  height: "100vh",
                  alignContent: "center",
                  textAlign: "center",
                }}>
                <Grid container spacing={0} style={{}} ref={targetDivRef}>
                  {x?.length > 0 &&
                    x.map((bet, idx) => {
                      const periods = Array.from(
                        { length: bet.score?.competitions[0].format.regulation.periods },
                        (v, k) => k + 1,
                      );
                      const homeTeamID = bet.score?.competitions[0].competitors[0].id;
                      const possession = bet.score?.competitions[0].situation?.possession === homeTeamID ? "home" : "away";
                      const awayTeamDisplayName = bet.score?.competitions[0].competitors[1].team.displayName;
                      const homeTeamDisplayName = bet.score?.competitions[0].competitors[0].team.displayName;
                      const awayTeamScore =
                        bet.ourBet?.type === "spread" && bet.ourBet?.outcome.trim() === awayTeamDisplayName ?
                          parseInt(bet.score?.competitions[0].competitors[1].score) + bet.ourBet?.details.point
                        : parseInt(bet.score?.competitions[0].competitors[1].score);
                      const homeTeamScore =
                        bet.ourBet?.type === "spread" && bet.ourBet?.outcome.trim() === homeTeamDisplayName ?
                          parseInt(bet.score?.competitions[0].competitors[0].score) + bet.ourBet?.details.point
                        : parseInt(bet.score?.competitions[0].competitors[0].score);
                      const homeTeamLineScore = getLinescore(bet.score?.competitions[0].competitors[0].linescores, bet);
                      const awayTeamLineScore = getLinescore(bet.score?.competitions[0].competitors[1].linescores, bet);
                      const shortDetail = bet.details.type.shortDetail;
                      const time = shortDetail.split("- ")[1]?.split(" E")[0];
                      const momentTime = moment(time, "h:mm a").subtract(1, "hour").format("h:mm a");
                      const totalScore = homeTeamScore + awayTeamScore;
                      if (bet.ourBet?.type === "overUnder") {
                        const tied =
                          (bet.ourBet?.outcome.trim() === "over" && totalScore === bet.ourBet?.details.point) ||
                          (bet.ourBet?.outcome.trim() === "under" && totalScore === bet.ourBet?.details.point);
                        const won =
                          (bet.ourBet?.outcome.trim() === "over" && totalScore > bet.ourBet?.details.point) ||
                          (bet.ourBet?.outcome.trim() === "under" && totalScore < bet.ourBet?.details.point);
                        return (
                          <Grid
                            item
                            xs={12}
                            sm={6}
                            md={4}
                            lg={4}
                            spacing={1}
                            onClick={() => {
                              bet.score.links[0].href && window.open(bet.score.links[0].href, "_blank");
                            }}
                            style={{
                              fontFamily: "'Baloo Bhaijaan', cursive",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              alignContent: "center",
                              cursor: "pointer",
                              alignItems: "center",
                              border:
                                won ?
                                  `1px solid ${getColorForBackground(won, bet, tied).backgroundColor}`
                                : `1px solid ${getColorForBackground(won, bet, tied).backgroundColor}`,
                              backgroundColor: getColorForBackground(won, bet, tied).backgroundColor,
                              padding: "5px 0px",
                              color: getColorForBackground(won, bet).color,
                            }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: fontUpsize ? "2.5rem" : "0.8rem",
                                fontWeight: "bold",
                                overflow: "hidden",
                              }}>
                              {bet.awayTeamAbbr} at {bet.homeTeamAbbr} {bet.ourBet?.outcome.trim().toUpperCase()}{" "}
                              {bet.ourBet?.details.point}
                            </p>
                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "column",
                              }}>
                              {bet.score.status.type.name === "STATUS_SCHEDULED" && (
                                <p
                                  style={{
                                    margin: 0,
                                    lineHeight: 1,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                  }}>
                                  {momentTime} CST
                                </p>
                              )}
                              {bet.score.status.type.name === "STATUS_POSTPONED" && (
                                <p
                                  style={{
                                    margin: 0,
                                    lineHeight: 1,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                  }}>
                                  POSTPONED
                                </p>
                              )}
                              {bet.score.status.type.name === "STATUS_DELAYED" && (
                                <p
                                  style={{
                                    margin: 0,
                                    lineHeight: 1,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                  }}>
                                  DELAYED
                                </p>
                              )}
                              {bet.score.status.type.name !== "STATUS_SCHEDULED" &&
                                bet.score.status.type.name !== "STATUS_FINAL" &&
                                bet.score.status.type.name !== "STATUS_RAIN_DELAY" &&
                                bet.score.status.type.name !== "STATUS_DELAYED" &&
                                bet.score.status.type.name !== "STATUS_POSTPONED" && (
                                  <p
                                    style={{
                                      margin: 0,
                                      lineHeight: 1,
                                      fontSize: fontUpsize ? "2rem" : "1rem",
                                    }}>
                                    {getGameStatus(bet.score)}
                                  </p>
                                )}
                              {bet.score.status.type.name !== "STATUS_SCHEDULED" && (
                                <p
                                  style={{
                                    margin: 0,
                                    lineHeight: 1,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                  }}>
                                  {getTotalRemaining(bet.score, bet.ourBet?.details.point, bet.ourBet?.outcome.trim())}
                                </p>
                              )}
                            </div>
                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "row",
                              }}>
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  flexDirection: "column",
                                }}>
                                <p
                                  style={{
                                    textAlign: "left",
                                    margin: 0,
                                    marginTop: 2,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                    color: getColorForBackground(won, bet, tied).backgroundColor,
                                  }}>
                                  INN
                                </p>
                                <p
                                  style={{
                                    textAlign: "right",
                                    margin: 0,
                                    marginTop: 2,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                  }}>
                                  {!bet.score.links[0].href?.includes("nba") &&
                                    possession === "away" &&
                                    periods.length === 4 && <SportsFootballIcon style={{ fontSize: 15 }} />}
                                  {bet.awayTeamAbbr}
                                </p>
                                <p
                                  style={{
                                    textAlign: "right",
                                    margin: 0,
                                    marginTop: 2,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    alignItems: "center",
                                  }}>
                                  {possession === "home" && periods.length === 4 && (
                                    <SportsFootballIcon style={{ fontSize: 15 }} />
                                  )}
                                  {bet.homeTeamAbbr}
                                </p>
                              </div>
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  flexDirection: "column",
                                }}>
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                  }}>
                                  {periods.map((x) => (
                                    <div
                                      style={{
                                        marginLeft: 3,
                                        fontSize: fontUpsize ? "2rem" : "1rem",
                                        marginTop: 0,
                                        width: fontUpsize ? 40 : 22,
                                      }}>
                                      <p style={{ margin: 0, marginTop: 0, marginLeft: 0 }}>{x}</p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginTop: 2,
                                      marginLeft: 20,
                                      fontWeight: "bold",
                                    }}></p>
                                </div>
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                  }}>
                                  {awayTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 0,
                                        fontSize: fontUpsize ? "2rem" : "1rem",
                                        width: fontUpsize ? 40 : 22,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "away")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          fontSize: fontUpsize ? "2rem" : "1rem",
                                          marginLeft: 0,
                                          color: "white",
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginTop: 2,
                                      marginLeft: 20,
                                      fontSize: fontUpsize ? "2rem" : "1rem",
                                      fontWeight: "bold",
                                    }}>
                                    {bet.score?.competitions[0].competitors[1].score}
                                  </p>
                                </div>
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                  }}>
                                  {homeTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 3,
                                        fontSize: fontUpsize ? "2rem" : "1rem",
                                        width: fontUpsize ? 40 : 22,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "home")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          fontSize: fontUpsize ? "2rem" : "1rem",
                                          marginLeft: 0,
                                          // color: getInningBackgroundColor(won, bet.score, idx + 1, "home")
                                          //   .color,
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginTop: 2,
                                      fontSize: fontUpsize ? "2rem" : "1rem",

                                      marginLeft: 20,
                                      fontWeight: "bold",
                                    }}>
                                    {homeTeamScore}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                gap: "30px",
                                width: "100%",
                                marginTop: 5,
                              }}>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: fontUpsize ? "2rem" : "1rem",
                                  color: "white !important",
                                  border: `2px solid ${getDarkBgColor(getOverUnder(bet)?.color)}`,
                                  backgroundColor: getDarkBgColor(getOverUnder(bet)?.color),
                                  padding: "6px 12px",
                                  borderRadius: "4px",
                                }}>
                                O/U: {getOverUnder(bet)?.value}
                              </p>
                            </div>
                          </Grid>
                        );
                      } else if (bet.ourBet?.type === "spread") {
                        const winner =
                          bet.ourBet?.outcome.trim() === bet.score?.competitions[0].competitors[1].team.displayName ?
                            "away"
                          : "home";
                        const won = winner === "home" ? homeTeamScore >= awayTeamScore : homeTeamScore <= awayTeamScore;
                        return (
                          <Grid
                            item
                            xs={12}
                            sm={6}
                            md={4}
                            lg={4}
                            spacing={1}
                            onClick={() => {
                              bet.score.links[0].href && window.open(bet.score.links[0].href, "_blank");
                            }}
                            style={{
                              fontFamily: "'Baloo Bhaijaan', cursive",
                              display: "flex",
                              flexDirection: "column",
                              cursor: "pointer",
                              justifyContent: "center",
                              alignContent: "center",
                              alignItems: "center",
                              border:
                                won ?
                                  `1px solid ${getColorForBackground(won, bet).backgroundColor}`
                                : `1px solid ${getColorForBackground(won, bet).backgroundColor}`,
                              backgroundColor: getColorForBackground(won, bet).backgroundColor,
                              padding: "5px 0px",
                              color: getColorForBackground(won, bet).color,
                            }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: fontUpsize ? "2.5rem" : "1.2rem",
                                fontWeight: "bold",
                              }}>
                              {bet.ourBet?.outcome
                                .trim()
                                .replace(/\([^)]+\)/, "")
                                .slice(0, 15)}{" "}
                              {bet.ourBet?.details.point > 0 ? "+" : null}
                              {bet.ourBet?.details.point}
                            </p>
                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "column",
                              }}>
                              {bet.score.status.type.name === "STATUS_SCHEDULED" && (
                                <p
                                  style={{
                                    margin: 0,
                                    lineHeight: 0.5,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                  }}>
                                  {momentTime} CST
                                </p>
                              )}
                              {bet.score.status.type.name === "STATUS_DELAYED" && (
                                <p
                                  style={{
                                    margin: 0,
                                    lineHeight: 0.5,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                  }}>
                                  DELAYED
                                </p>
                              )}
                              {bet.score.status.type.name === "STATUS_POSTPONED" && (
                                <p
                                  style={{
                                    margin: 0,
                                    lineHeight: 0.5,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                  }}>
                                  POSTPONED
                                </p>
                              )}
                              {bet.score.status.type.name !== "STATUS_SCHEDULED" &&
                                bet.score.status.type.name !== "STATUS_FINAL" &&
                                bet.score.status.type.name !== "STATUS_RAIN_DELAY" &&
                                bet.score.status.type.name !== "STATUS_DELAYED" &&
                                bet.score.status.type.name !== "STATUS_POSTPONED" && (
                                  <p
                                    style={{
                                      margin: 0,
                                      lineHeight: 0.5,
                                      fontSize: fontUpsize ? "2rem" : "1rem",
                                    }}>
                                    {getGameStatus(bet.score)}
                                  </p>
                                )}
                              <p style={{ margin: 0, lineHeight: 0.5, fontSize: "2rem" }}>{bet.ourBet?.note}</p>
                            </div>
                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "row",
                              }}>
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  flexDirection: "column",
                                }}>
                                <p
                                  style={{
                                    textAlign: "left",
                                    margin: 0,
                                    marginTop: 2,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                    color: getColorForBackground(won, bet).backgroundColor,
                                  }}>
                                  INN
                                </p>
                                <p
                                  style={{
                                    textAlign: "right",
                                    margin: 0,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                  }}>
                                  {!bet.score.links[0].href?.includes("nba") &&
                                    possession === "away" &&
                                    periods.length === 4 && <SportsFootballIcon style={{ fontSize: 15 }} />}{" "}
                                  {bet.awayTeamAbbr}
                                </p>
                                <p
                                  style={{
                                    textAlign: "right",
                                    margin: 0,
                                    marginTop: 2,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                  }}>
                                  {possession === "home" && periods.length === 4 && (
                                    <SportsFootballIcon style={{ fontSize: 15 }} />
                                  )}{" "}
                                  {bet.homeTeamAbbr}
                                </p>
                              </div>
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  flexDirection: "column",
                                }}>
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                  }}>
                                  {periods.map((x) => (
                                    <div
                                      style={{
                                        marginLeft: 3,
                                        marginTop: 0,
                                        width: fontUpsize ? 40 : 22,
                                      }}>
                                      <p style={{ margin: 0, marginTop: 0, marginLeft: 0 }}>{x}</p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginTop: 2,
                                      marginLeft: 20,
                                      fontWeight: "bold",
                                    }}></p>
                                </div>
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                  }}>
                                  {awayTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 0,
                                        width: fontUpsize ? 40 : 22,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "away")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          fontSize: fontUpsize ? "2rem" : "1rem",
                                          marginLeft: 0,
                                          color: "white",
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginTop: 2,
                                      marginLeft: 20,
                                      fontSize: fontUpsize ? "2rem" : "1rem",
                                      fontWeight: "bold",
                                    }}>
                                    {awayTeamScore}
                                  </p>
                                </div>
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                  }}>
                                  {homeTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 3,
                                        width: fontUpsize ? 40 : 22,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "home")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          marginLeft: 0,
                                          fontSize: fontUpsize ? "2rem" : "1rem",
                                          color: getInningBackgroundColor(won, bet.score, idx + 1, "home").color,
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginTop: 2,
                                      fontSize: fontUpsize ? "2rem" : "1rem",
                                      marginLeft: 20,
                                      fontWeight: "bold",
                                    }}>
                                    {homeTeamScore}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                gap: "30px",
                                width: "100%",
                                marginTop: 5,
                              }}>
                              {bet.ourBet?.type === "spread" && (
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                    color: "white !important",
                                    border: `2px solid ${getDarkBgColor(getSpreadWithColor(parseFloat(getSpread(bet, winner)), bet.ourBet?.outcome)?.color)}`,
                                    backgroundColor: getDarkBgColor(
                                      getSpreadWithColor(parseFloat(getSpread(bet, winner)), bet.ourBet?.outcome)?.color,
                                    ),
                                    padding: "6px 12px",
                                    borderRadius: "4px",
                                  }}>
                                  {bet.ourBet?.outcome.trim().split(" ")[0]}: {getSpread(bet, winner)}
                                </p>
                              )}
                            </div>
                          </Grid>
                        );
                      } else {
                        const winner =
                          bet.ourBet?.outcome.trim() === bet.score?.competitions[0].competitors[1].team.displayName ?
                            "away"
                          : "home";
                        const won = winner === "home" ? homeTeamScore >= awayTeamScore : homeTeamScore <= awayTeamScore;
                        const tied = homeTeamScore === awayTeamScore;
                        return (
                          <Grid
                            item
                            xs={12}
                            sm={6}
                            md={4}
                            lg={4}
                            spacing={1}
                            onClick={() => {
                              bet.score.links[0].href && window.open(bet.score.links[0].href, "_blank");
                            }}
                            style={{
                              fontFamily: "'Baloo Bhaijaan', cursive",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              cursor: "pointer",
                              alignContent: "center",
                              padding: "5px 0px",
                              alignItems: "center",
                              border:
                                won ?
                                  `1px solid ${getColorForBackground(won, bet, tied).backgroundColor}`
                                : `1px solid ${getColorForBackground(won, bet, tied).backgroundColor}`,
                              backgroundColor: getColorForBackground(won, bet, tied).backgroundColor,
                              color: getColorForBackground(won, bet).color,
                            }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: fontUpsize ? "2.5rem" : "1rem",
                                fontWeight: "bold",
                              }}>
                              {bet.ourBet?.outcome
                                .trim()
                                .replace(/\([^)]+\)/, "")
                                .slice(0, 24)}{" "}
                              ML {bet.ourBet?.details > 0 ? "+" : null}
                              {bet.ourBet?.details}
                            </p>
                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "column",
                              }}>
                              {bet.score.status.type.name === "STATUS_SCHEDULED" && (
                                <p style={{ margin: 0, lineHeight: 0.5 }}>{momentTime} CST</p>
                              )}
                              {bet.score.status.type.name === "STATUS_DELAYED" && (
                                <p style={{ margin: 0, lineHeight: 0.5 }}>DELAYED</p>
                              )}
                              {bet.score.status.type.name === "STATUS_POSTPONED" && (
                                <p style={{ margin: 0, lineHeight: 0.5 }}>POSTPONED</p>
                              )}
                              <div
                                style={{
                                  margin: 0,
                                  display: "flex",
                                  flexDirection: "row",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  width: "100%",
                                }}>
                                {bet.score.status.type.name !== "STATUS_SCHEDULED" &&
                                  bet.score.status.type.name !== "STATUS_FINAL" &&
                                  bet.score.status.type.name !== "STATUS_RAIN_DELAY" &&
                                  bet.score.status.type.name !== "STATUS_DELAYED" &&
                                  bet.score.status.type.name !== "STATUS_POSTPONED" && (
                                    <React.Fragment>
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: fontUpsize ? "2rem" : "1rem",
                                        }}>
                                        {getGameStatus(bet.score)}
                                      </p>
                                      {getBaseImgSrc(bet.score)}
                                    </React.Fragment>
                                  )}
                              </div>
                              <p style={{ margin: 0, marginTop: 0 }}>{bet.ourBet?.note}</p>
                            </div>

                            <div
                              style={{
                                fontFamily: "'Baloo Bhaijaan', cursive",
                                display: "flex",
                                flexDirection: "row",
                              }}>
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  flexDirection: "column",
                                }}>
                                <p
                                  style={{
                                    textAlign: "left",
                                    margin: 0,
                                    marginTop: 2,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                    color: getColorForBackground(won, bet, tied).backgroundColor,
                                  }}>
                                  INN
                                </p>
                                <p
                                  style={{
                                    textAlign: "right",
                                    margin: 0,
                                    marginTop: 2,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                  }}>
                                  {!bet.score.links[0].href?.includes("nba") &&
                                    possession === "away" &&
                                    periods.length === 4 && <SportsFootballIcon style={{ fontSize: 15 }} />}{" "}
                                  {bet.awayTeamAbbr}
                                </p>
                                <p
                                  style={{
                                    textAlign: "right",
                                    margin: 0,
                                    marginTop: 2,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                  }}>
                                  {possession === "home" && periods.length === 4 && (
                                    <SportsFootballIcon style={{ fontSize: 15 }} />
                                  )}{" "}
                                  {bet.homeTeamAbbr}
                                </p>
                              </div>
                              <div
                                style={{
                                  fontFamily: "'Baloo Bhaijaan', cursive",
                                  display: "flex",
                                  flexDirection: "column",
                                }}>
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                  }}>
                                  {periods.map((x) => (
                                    <div
                                      style={{
                                        marginLeft: 3,
                                        marginTop: 0,
                                        width: fontUpsize ? 40 : 22,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          marginLeft: 0,
                                          fontSize: fontUpsize ? "2rem" : "1rem",
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginTop: 2,
                                      marginLeft: 20,
                                      fontWeight: "bold",
                                    }}></p>
                                </div>
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                  }}>
                                  {awayTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 0,
                                        width: fontUpsize ? 40 : 22,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "away")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          marginTop: 0,
                                          marginLeft: 0,
                                          fontSize: fontUpsize ? "2rem" : "1rem",
                                          color: "white",
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginLeft: fontUpsize ? 20 : 5,
                                      fontSize: fontUpsize ? "2rem" : "1rem",
                                      fontWeight: "bold",
                                    }}>
                                    {bet.score?.competitions[0].competitors[1].score}
                                  </p>
                                </div>
                                <div
                                  style={{
                                    fontFamily: "'Baloo Bhaijaan', cursive",
                                    display: "flex",
                                    marginLeft: 5,
                                    flexDirection: "row",
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                  }}>
                                  {homeTeamLineScore?.map((x, idx) => (
                                    <div
                                      style={{
                                        border: `1px solid ${getColorForBackground(won, bet).color}`,
                                        marginLeft: 3,
                                        marginTop: 3,
                                        fontSize: fontUpsize ? "2rem" : "1rem",
                                        width: fontUpsize ? 40 : 22,
                                        backgroundColor: getInningBackgroundColor(won, bet.score, idx + 1, "home")
                                          .backgroundColor,
                                      }}>
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: fontUpsize ? "2rem" : "1rem",
                                          marginTop: 0,
                                          marginLeft: 0,
                                          color: getInningBackgroundColor(won, bet.score, idx + 1, "home").color,
                                        }}>
                                        {x}
                                      </p>
                                    </div>
                                  ))}
                                  <p
                                    style={{
                                      margin: 0,
                                      marginLeft: fontUpsize ? 20 : 5,
                                      fontWeight: "bold",
                                      fontSize: fontUpsize ? "2rem" : "1rem",
                                    }}>
                                    {bet.score?.competitions[0].competitors[0].score}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                gap: "30px",
                                width: "100%",
                                marginTop: 5,
                              }}>
                              {bet.ourBet?.type === "moneyline" && (
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: fontUpsize ? "2rem" : "1rem",
                                    color: "white !important",
                                    border: `2px solid ${getDarkBgColor(getMoneylineSpreadColor(homeTeamDisplayName, awayTeamDisplayName, bet.ourBet?.outcome, bet)?.color)}`,
                                    backgroundColor: getDarkBgColor(
                                      getMoneylineSpreadColor(
                                        homeTeamDisplayName,
                                        awayTeamDisplayName,
                                        bet.ourBet?.outcome,
                                        bet,
                                      )?.color,
                                    ),
                                    padding: "6px 12px",
                                    borderRadius: "4px",
                                  }}>
                                  {bet.ourBet?.outcome.trim().split(" ")[0]}:{" "}
                                  {
                                    getMoneylineSpreadColor(
                                      homeTeamDisplayName,
                                      awayTeamDisplayName,
                                      bet.ourBet?.outcome,
                                      bet,
                                    )?.value
                                  }
                                </p>
                              )}
                            </div>
                          </Grid>
                        );
                      }
                    })}
                </Grid>
              </div>
            </>
          ))}
      </Carousel>
    );
  }
}

export default TodaysBets;
