import * as React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { Button } from "@mui/material";
import TextField from "@mui/material/TextField";
import moment from "moment";
import ReactLoading from "react-loading";

const isDev = window.location.hostname === "localhost";

function AdminScreen() {
  const [note, setNote] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [todaysBets, setTodaysBets] = React.useState([]);
  const [finalScores, setFinalScores] = React.useState([]);

  // ── name helpers ──────────────────────────────────────────────────────────
  const nameAliases = {
    "penn quakers": "pennsylvania quakers",
    "uconn huskies": "connecticut huskies",
    "umass minutemen": "massachusetts minutemen",
    "smu mustangs": "smu mustangs",
    "lsu tigers": "lsu tigers",
    "usc trojans": "usc trojans",
    "ucf knights": "ucf knights",
    "pitt panthers": "pittsburgh panthers",
    "ole miss rebels": "mississippi rebels",
  };

  const normalizeName = (name) => {
    const normalized = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    return nameAliases[normalized] || normalized;
  };

  // ── fetch helpers ─────────────────────────────────────────────────────────
  const getAllGamesForToday = async () => {
    const devURL = `http://localhost:3001/parlays`;
    const url = `https://sheline-art-website-api.herokuapp.com/parlays`;
    return await fetch(isDev ? devURL : url)
      .then((res) => res.json())
      .then((data) => {
        return [
          ...data.games.filter((x) => x !== null),
          ...(data.nhlGames?.filter((x) => x !== null) ?? []),
          ...(data.nflGames?.filter((x) => x !== null) ?? []),
          ...(data.nbaGames?.filter((x) => x !== null) ?? []),
          ...(data.ncaaFootball?.filter((x) => x !== null) ?? []),
          ...(data.ncaaBasketball?.filter((x) => x !== null) ?? []),
        ];
      });
  };

  const getTodaysBets = async () => {
    const devURL = `http://localhost:3001/elite-edge-advisors/get-all-bets`;
    const url = `https://sheline-art-website-api.herokuapp.com/elite-edge-advisors/get-all-bets`;
    const scores = await getFinalScores(moment().format("YYYYMMDD"));
    setFinalScores(scores);
    await fetch(isDev ? devURL : url)
      .then((res) => res.json())
      .then((data) => {
        const { ourBets } = data;
        const filtered = ourBets?.map((bet) =>
          Object.fromEntries(Object.entries(bet).filter(([_, v]) => v != null))
        );
        const allBets = filtered.map((unParsedBet) => {
          const keys = Object.keys(unParsedBet).filter((key) => key.includes("bet"));
          const bets = keys.map((key) => unParsedBet[key]);
          return bets.map((bet) => JSON.parse(bet));
        });
        allBets.length > 0 && setTodaysBets(...allBets);
      });
  };

  const getFinalScores = async (date) => {
    return await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${moment(date).format("YYYYMMDD")}`
    )
      .then((res) => res.json())
      .then((data) => data.events ?? []);
  };

  // ── transform + save ──────────────────────────────────────────────────────
  const transformBets = async (allGames, bookieBet) => {
    const ourBets = bookieBet
      .map((bet) => {
        const [betOutcome, betTypeRaw, matchup] = bet.detailDescription.split("~~");
        const [awayTeamName, homeTeamName] = matchup.split(" vs. ");

        const game = allGames.find(
          (g) =>
            normalizeName(g.awayTeam.name) === normalizeName(awayTeamName) &&
            normalizeName(g.homeTeam.name) === normalizeName(homeTeamName)
        );
        if (!game) return null;

        let betType = "";
        let outcome = betOutcome;
        let details = {};

        if (betTypeRaw.includes("Handicap")) {
          betType = "spread";
          const pointMatch = betOutcome.match(/(-?\d+\.?\d*)/);
          const point = pointMatch ? parseFloat(pointMatch[0]) : 0;
          details = {
            name: betOutcome.replace(/(-?\d+\.?\d*)/, "").trim(),
            price: parseInt(bet.odds),
            point,
          };
        } else if (betTypeRaw.includes("Total")) {
          betType = "overUnder";
          const overUnderMatch = betOutcome.toLowerCase();
          outcome = overUnderMatch.includes("over") ? "over" : "under";
          const pointMatch = bet.detailDescription.match(/-?\d+\.?\d*/);
          const point = pointMatch ? parseFloat(pointMatch[0]) : 0;
          details = {
            name: outcome === "over" ? "Over" : "Under",
            price: parseInt(bet.odds),
            point,
          };
        } else if (betTypeRaw.includes("Winner")) {
          betType = "moneyline";
          details = parseInt(bet.odds);
        }

        if (!betType) return null;

        return {
          riskAmount: bet.riskAmount,
          winAmount: bet.winAmount,
          awayTeam: game.awayTeam.name,
          homeTeam: game.homeTeam.name,
          awayTeamAbbr: game.awayTeam.team.abbreviation,
          homeTeamAbbr: game.homeTeam.team.abbreviation,
          date: game.date,
          espnGameId: game.espnGameId,
          ourBet: {
            tempID: game.espnGameId,
            note: "",
            outcome: outcome.includes("(") ? outcome.replace(/\([^)]+\)/, "") : outcome,
            type: betType,
            details,
          },
          details: game.details,
        };
      })
      .filter(Boolean);

    await handleSaveBets(ourBets);
  };

  const handleDeleteAllBets = async () => {
    const devUrl = `http://localhost:3001/elite-edge-advisors/all-bets`;
    const url = `https://sheline-art-website-api.herokuapp.com/elite-edge-advisors/all-bets`;
    await fetch(isDev ? devUrl : url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
  };

  const handleSaveBets = async (bets) => {
    const payload = bets.map((x) => ({
      riskAmount: x.riskAmount,
      winAmount: x.winAmount,
      awayTeam: x.awayTeam,
      homeTeam: x.homeTeam,
      awayTeamAbbr: x.awayTeamAbbr,
      homeTeamAbbr: x.homeTeamAbbr,
      date: x.date,
      espnGameId: x.espnGameId,
      ourBet: x.ourBet,
      details: x.details,
    }));
    try {
      await handleDeleteAllBets();
      const devUrl = `http://localhost:3001/elite-edge-advisors/set-todays-bet`;
      const url = `https://sheline-art-website-api.herokuapp.com/elite-edge-advisors/set-todays-bet`;
      const response = await fetch(isDev ? devUrl : url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedBets: payload,
          todaysBetsLength: todaysBets.length,
        }),
      });
      if (response.status === 400) throw new Error("Error saving bets");
      await getTodaysBets();
    } catch (error) {
      alert(error);
    }
  };

  const submitBookieBets = async () => {
    try {
      const data = JSON.parse(note);
      const noteJSON = data.bets
        .filter((bet) => bet.resultHeader === "PENDING")
        .filter(
          (bet) =>
            bet.completeDescription.includes("PARLAY") ||
            bet.completeDescription.includes("TEASER")
        )
        .map((bet) => bet.detail);

      const games = await getAllGamesForToday();
      setIsLoading(true);
      await getTodaysBets();
      if (games !== undefined && games.length > 0) {
        await Promise.all(noteJSON.map((bookieBet) => transformBets(games, bookieBet)));
      }
      setIsLoading(false);
      setNote("");
      alert("Bets saved!");
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    getTodaysBets();
  }, []);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        backgroundColor: "#111",
        minHeight: "100vh",
        padding: "32px 16px",
        color: "white",
        fontFamily: "'Baloo Bhaijaan', cursive",
      }}>
      <Typography variant="h4" style={{ marginBottom: 24, color: "white" }}>
        Elite Edge Admin
      </Typography>

      {/* ── JSON paste input ── */}
      <Grid container spacing={2} alignItems="center" style={{ marginBottom: 32 }}>
        <Grid item xs={12} sm={10}>
          <TextField
            label="Paste MyBookie JSON here"
            multiline
            minRows={4}
            fullWidth
            value={note}
            onChange={(e) => setNote(e.target.value)}
            InputProps={{ style: { backgroundColor: "white", color: "#111" } }}
            InputLabelProps={{ style: { color: "#aaa" } }}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button
            variant="contained"
            color="success"
            fullWidth
            disabled={isLoading || !note.trim()}
            onClick={submitBookieBets}
            style={{ height: 56 }}>
            {isLoading ? "Saving…" : "Submit"}
          </Button>
        </Grid>
      </Grid>

      {/* ── loading ── */}
      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
          <ReactLoading type="spin" color="green" height={80} width={80} />
        </div>
      )}

      {/* ── current saved bets ── */}
      {!isLoading && todaysBets.length > 0 && (
        <>
          <Typography variant="h6" style={{ marginBottom: 12, color: "#aaa" }}>
            Currently saved ({todaysBets.length} leg{todaysBets.length !== 1 ? "s" : ""})
          </Typography>
          <Grid container spacing={1}>
            {todaysBets.map((bet, idx) => {
              const score = finalScores?.find((x) => x.id === bet.espnGameId);
              const awayScore = parseInt(score?.competitions[0].competitors[1].score) || 0;
              const homeScore = parseInt(score?.competitions[0].competitors[0].score) || 0;
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
                  <div
                    style={{
                      border: "1px solid #444",
                      borderRadius: 6,
                      padding: "12px 16px",
                      backgroundColor: "#1e1e1e",
                    }}>
                    <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: "0.95rem" }}>
                      {bet.awayTeam} vs {bet.homeTeam}
                    </p>
                    <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "#ccc" }}>
                      {bet.ourBet?.type?.toUpperCase()} —{" "}
                      {bet.ourBet?.outcome}
                      {bet.ourBet?.type === "overUnder" && ` ${bet.ourBet?.details?.point}`}
                      {bet.ourBet?.type === "spread" &&
                        ` (${bet.ourBet?.details?.point > 0 ? "+" : ""}${bet.ourBet?.details?.point})`}
                    </p>
                    {score && (
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#888" }}>
                        {awayScore} – {homeScore} ({score.status?.type?.shortDetail})
                      </p>
                    )}
                  </div>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {!isLoading && todaysBets.length === 0 && (
        <Typography style={{ color: "#666", marginTop: 16 }}>No bets saved yet.</Typography>
      )}
    </div>
  );
}

export default AdminScreen;
