import React, { useState, useEffect } from "react";
import axios from "axios";

const AstrosNextGameWidget = () => {
  const [nextGame, setNextGame] = useState(null);

  useEffect(() => {
    const fetchNextGame = async () => {
      try {
        let currentDate = new Date();
        let nextGame = null;

        while (!nextGame) {
          const formattedDate = currentDate.toISOString().split("T")[0].replace(/-/g, "");
          const response = await axios.get(
            `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${formattedDate}-${formattedDate}`,
          );

          const games = response.data.events;
          nextGame = games.find((game) => game.competitions[0].competitors.some((team) => team.team.abbreviation === "HOU"));

          if (!nextGame) {
            currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
          }
        }

        if (nextGame) {
          const homeTeam = nextGame.competitions[0].competitors.find((team) => team.team.abbreviation === "HOU");
          const opponent = nextGame.competitions[0].competitors.find((team) => team.team.abbreviation !== "HOU");

          const isAstrosHome = homeTeam.homeAway === "home";

          setNextGame({
            homeTeam: {
              name: homeTeam.team.displayName,
              logo: homeTeam.team.logo,
              record: homeTeam.records[0]?.summary || "N/A",
            },
            opponent: {
              name: opponent.team.displayName,
              logo: opponent.team.logo,
              record: opponent.records[0]?.summary || "N/A",
            },
            date: nextGame.date,
            location: nextGame.competitions[0].venue.fullName,
            isAstrosHome,
          });
        }
      } catch (error) {
        console.error("Error fetching Astros next game details from ESPN scoreboard API:", error);
      }
    };

    fetchNextGame();
  }, []);

  if (!nextGame) {
    return <div>Loading Astros next game details...</div>;
  }

  return (
    <div
      style={{
        backgroundColor: "#002D62", // Astros blue background
        padding: "10px",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        textAlign: "center",
      }}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ textAlign: "center" }}>
          <img
            src="https://a.espncdn.com/i/teamlogos/mlb/500/hou.png" // Astros logo
            alt="Astros Logo"
            style={{ width: "60px", height: "60px", marginRight: "20px" }}
          />
          <p style={{ margin: 0, fontSize: "14px", color: "gray" }}>{nextGame.homeTeam.record}</p>
        </div>
        <span style={{ fontSize: "20px", fontWeight: "bold" }}>{nextGame.isAstrosHome ? "vs" : "@"}</span>
        <div style={{ textAlign: "center" }}>
          <img
            src={nextGame.opponent.logo} // Opponent's logo
            alt={`${nextGame.opponent.name} Logo`}
            style={{ width: "60px", height: "60px", marginLeft: "20px" }}
          />
          <p style={{ margin: 0, fontSize: "14px", color: "gray" }}>{nextGame.opponent.record}</p>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "20px", color: "white" }}>
          {new Date(nextGame.date).toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </p>
        <p style={{ margin: 0, fontSize: "20px", color: "white" }}>
          {new Date(nextGame.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
        </p>
        <p style={{ margin: 0, fontSize: "12px", color: "gray" }}>{nextGame.location}</p>
      </div>
    </div>
  );
};

export default AstrosNextGameWidget;
