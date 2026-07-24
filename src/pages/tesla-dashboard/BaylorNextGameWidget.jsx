import { useState, useEffect } from "react";
import axios from "axios";

const BaylorNextGameWidget = () => {
  const [nextGame, setNextGame] = useState(null);

  useEffect(() => {
    const fetchNextGame = async () => {
      try {
        let currentDate = new Date();
        let nextGame = null;

        while (!nextGame) {
          const formattedDate = currentDate.toISOString().split("T")[0].replace(/-/g, "");
          const response = await axios.get(
            `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&limit=900&dates=${formattedDate}-${formattedDate}`,
          );

          const games = response.data.events;
          nextGame = games.find((game) => game.competitions[0].competitors.some((team) => team.team.abbreviation === "BAY"));

          if (!nextGame) {
            currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
          }
        }

        if (nextGame) {
          const baylorTeam = nextGame.competitions[0].competitors.find((team) => team.team.abbreviation === "BAY");
          const opponent = nextGame.competitions[0].competitors.find((team) => team.team.abbreviation !== "BAY");

          const isBaylorHome = baylorTeam.homeAway === "home";

          setNextGame({
            baylor: {
              name: baylorTeam.team.displayName,
              logo: baylorTeam.team.logo,
              record: baylorTeam.records[0]?.summary || "N/A",
            },
            opponent: {
              name: opponent.team.displayName,
              logo: opponent.team.logo,
              record: opponent.records[0]?.summary || "N/A",
            },
            date: nextGame.date,
            location: nextGame.competitions[0].venue.fullName,
            isBaylorHome,
          });
        }
      } catch (error) {
        console.error("Error fetching Baylor Bears next game details from ESPN scoreboard API:", error);
      }
    };

    fetchNextGame();
  }, []);

  if (!nextGame) {
    return <div>Loading Baylor Bears next game details...</div>;
  }

  return (
    <div
      style={{
        backgroundColor: "#FFB81C", // Baylor gold background
        padding: "10px",
        borderRadius: "8px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ textAlign: "center" }}>
          <img
            src={nextGame.baylor.logo} // Baylor Bears logo
            alt="Baylor Bears Logo"
            style={{ width: "60px", height: "60px", marginRight: "20px" }}
          />
          <p style={{ margin: 0, fontSize: "14px", color: "white" }}>{nextGame.baylor.record}</p>
        </div>
        <span style={{ fontSize: "20px", fontWeight: "bold" }}>{nextGame.isBaylorHome ? "vs" : "@"}</span>
        <div style={{ textAlign: "center" }}>
          <img
            src={nextGame.opponent.logo} // Opponent's logo
            alt={`${nextGame.opponent.name} Logo`}
            style={{ width: "60px", height: "60px", marginLeft: "20px" }}
          />
          <p style={{ margin: 0, fontSize: "14px", color: "white" }}>{nextGame.opponent.record}</p>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "20px", color: "black" }}>
          {new Date(nextGame.date).toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </p>
        <p style={{ margin: 0, fontSize: "20px", color: "black" }}>
          {new Date(nextGame.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
        </p>
        <p style={{ margin: 0, fontSize: "12px", color: "white" }}>{nextGame.location}</p>
      </div>
    </div>
  );
};

export default BaylorNextGameWidget;
