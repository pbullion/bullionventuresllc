import React from "react";

/* Bet-input modal — the one piece kept from the old elite-edge-advisors admin
   screen: paste (or auto-fetch) the MyBookie JSON payload, and it matches every
   pending wager to an ESPN game, converts it to our bet shape, and saves the
   tickets to the backend. Logic ported verbatim from
   elite-edge-advisors/src/modules/screens/AdminScreen/TodaysBets.js. */

const API_BASE = "https://sheline-art-website-api.herokuapp.com/elite-edge-advisors";
const PARLAYS_URL = "https://sheline-art-website-api.herokuapp.com/parlays";

// Map MyBookie name variants to ESPN displayName equivalents
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
  // World Cup: bookie name -> ESPN displayName (both sides run through normalizeName,
  // so keys/values are the normalized forms — e.g. ESPN's "Bosnia-Herzegovina" loses its
  // hyphen and becomes "bosniaherzegovina", while the bookie sends "Bosnia and Herzegovina").
  usa: "united states",
  "bosnia and herzegovina": "bosniaherzegovina",
  "congo dr": "congo dr",
};

const normalizeName = (name) => {
  const normalized = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return nameAliases[normalized] || normalized;
};

const getAllGamesForToday = async () => {
  return await fetch(PARLAYS_URL)
    .then((res) => res.json())
    .then((data) => {
      return [
        ...(data.games?.filter((x) => x !== null) ?? []),
        ...(data.nhlGames?.filter((x) => x !== null) ?? []),
        ...(data.nflGames?.filter((x) => x !== null) ?? []),
        ...(data.nbaGames?.filter((x) => x !== null) ?? []),
        ...(data.ncaaFootball?.filter((x) => x !== null) ?? []),
        ...(data.ncaaBasketball?.filter((x) => x !== null) ?? []),
        ...(data.worldCupGames?.filter((x) => x !== null) ?? []),
        ...(data.wnbaGames?.filter((x) => x !== null) ?? []),
      ];
    });
};

const transformBets = async (allGames, bookieBet) => {
  const unmatched = [];
  const ourBets = bookieBet
    .map((bet) => {
      const [betOutcome, betTypeRaw, matchup] = bet.detailDescription.split("~~");
      const [awayTeamName, homeTeamName] = matchup.split(" vs. ");

      // Find the corresponding game using normalized name comparison
      // Also try swapped home/away since World Cup neutral-site games may differ between bookie and ESPN
      const game =
        allGames.find((game) => {
          return (
            normalizeName(game.awayTeam.name) === normalizeName(awayTeamName) &&
            normalizeName(game.homeTeam.name) === normalizeName(homeTeamName)
          );
        }) ||
        allGames.find((game) => {
          return (
            normalizeName(game.homeTeam.name) === normalizeName(awayTeamName) &&
            normalizeName(game.awayTeam.name) === normalizeName(homeTeamName)
          );
        });

      if (!game) {
        // No matching ESPN game (often the feed hasn't published it yet).
        // Track it so we can warn instead of silently dropping the leg.
        unmatched.push(bet.detailDescription);
        return null;
      }

      let betType = "";
      let outcome = betOutcome;
      let details = {};

      // Identify bet type and format correctly
      if (betTypeRaw.includes("Handicap")) {
        betType = "spread";
        const pointMatch = betOutcome.match(/(-?\d+\.?\d*)/);
        const point = pointMatch ? parseFloat(pointMatch[0]) : 0;
        details = {
          name: betOutcome.replace(/(-?\d+\.?\d*)/, "").trim(), // Team name
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
      } else if (betTypeRaw.includes("Winner") || betTypeRaw.includes("1x2") || betTypeRaw.includes("To qualify")) {
        betType = "moneyline";
        details = parseInt(bet.odds);
      }

      if (!betType) return null; // Skip unrecognized bet types

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
    .filter(Boolean); // Remove null values
  return { ourBets, unmatched };
};

const handleDeleteAllBets = async () => {
  const response = await fetch(`${API_BASE}/all-bets`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (response.status === 400) {
    throw new Error("Error deleting bets");
  }
};

// Save a single ticket (one parlay, or the combined straight-bets group) as its
// own row. Does NOT delete first — submitBookieBets clears once up front and then
// inserts each ticket so they don't clobber each other.
const saveTicket = async (bet) => {
  const bets = bet.map((x) => {
    return {
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
    };
  });
  const response = await fetch(`${API_BASE}/set-todays-bet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedBets: bets, todaysBetsLength: 0 }),
  });
  if (response.status === 400) {
    throw new Error("Error saving bets");
  }
};

const S = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 100000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: "#181a1f",
    border: "1px solid #333",
    borderRadius: 12,
    padding: 20,
    width: "min(680px, 100%)",
    color: "white",
    fontFamily: "'Baloo Bhaijaan', cursive",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  textarea: {
    width: "100%",
    minHeight: 140,
    boxSizing: "border-box",
    backgroundColor: "#0d0e11",
    color: "white",
    border: "1px solid #444",
    borderRadius: 8,
    padding: 10,
    fontFamily: "monospace",
    fontSize: 12,
    resize: "vertical",
  },
  row: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  btn: (bg) => ({
    backgroundColor: bg,
    color: "white",
    border: "none",
    borderRadius: 999,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Baloo Bhaijaan', cursive",
  }),
};

export default function InputBets({ onClose, onSaved }) {
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Pull the latest MyBookie payload that the local fetcher pushed to the
  // backend and drop it straight into the bets textarea, so it flows through the
  // exact same submitBookieBets() path as a manual paste.
  const autoFetchBookieBets = async () => {
    try {
      const response = await fetch(`${API_BASE}/mybookie-latest`);
      if (response.status === 404) {
        alert("No bets have been fetched yet. Run the MyBookie fetcher first (npm run fetch).");
        return;
      }
      if (!response.ok) {
        throw new Error(`Fetch failed with status ${response.status}`);
      }
      const { payload, updatedAt } = await response.json();
      setNote(JSON.stringify(payload));
      const when = updatedAt ? new Date(updatedAt).toLocaleString() : "unknown time";
      const count = Array.isArray(payload?.bets) ? payload.bets.length : 0;
      alert(`Loaded ${count} bet ticket(s) fetched at ${when}. Review, then click Submit.`);
    } catch (error) {
      alert(`Auto-fetch failed: ${error.message}`);
    }
  };

  const submitBookieBets = async () => {
    setBusy(true);
    try {
      const data = JSON.parse(note);
      const pending = data.bets.filter((bet) => bet.resultHeader === "PENDING");
      const parlays = pending.filter(
        (bet) => bet.completeDescription.includes("PARLAY") || bet.completeDescription.includes("TEASER"),
      );
      const straights = pending.filter((bet) => bet.completeDescription.includes("Straight Bet"));

      const games = await getAllGamesForToday();
      if (games === undefined || games.length === 0) {
        alert("No games available from the ESPN feed yet — try again later.");
        return;
      }

      const dropped = [];

      // Each parlay becomes its own ticket. Stamp every leg with the parlay's
      // overall stake (parlay legs carry null riskAmount/winAmount individually),
      // so the stake shows correctly regardless of how the consumer sorts the legs.
      const parlayTickets = await Promise.all(
        parlays.map(async (wager) => {
          const { ourBets, unmatched } = await transformBets(games, wager.detail);
          dropped.push(...unmatched);
          return ourBets.map((leg) => ({
            ...leg,
            riskAmount: wager.originalRiskAmount,
            winAmount: wager.originalWinAmount,
          }));
        }),
      );

      // All straight bets are grouped into a SINGLE ticket ("as if it is one parlay").
      // Its stake is the sum of every straight bet's risk/win.
      const straightResults = await Promise.all(
        straights.map(async (wager) => {
          const { ourBets, unmatched } = await transformBets(games, wager.detail);
          dropped.push(...unmatched);
          return ourBets;
        }),
      );
      const straightRisk = straights.reduce((sum, w) => sum + (w.originalRiskAmount ?? 0), 0);
      const straightWin = straights.reduce((sum, w) => sum + (w.originalWinAmount ?? 0), 0);
      const straightTicket = straightResults.flat().map((leg) => ({
        ...leg,
        riskAmount: straightRisk,
        winAmount: straightWin,
        // Tag so the consumer can group these together and push them last on mobile.
        ourBet: { ...leg.ourBet, isStraight: true },
      }));

      const tickets = parlayTickets.filter((ticket) => ticket.length > 0);
      if (straightTicket.length > 0) tickets.push(straightTicket);

      // Clear once, then insert each ticket as its own row so they don't clobber.
      await handleDeleteAllBets();
      for (const ticket of tickets) {
        await saveTicket(ticket);
      }

      const uniqueDropped = [...new Set(dropped)];
      if (uniqueDropped.length > 0) {
        alert(
          `These legs had no matching ESPN game and were left out:\n\n` +
            uniqueDropped.map((d) => `• ${d}`).join("\n") +
            `\n\nThe ESPN feed may not have published the game yet. Re-submit once it shows up.`,
        );
      }
      onSaved();
    } catch (error) {
      alert(`Submit failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <p style={S.title}>Input MyBookie Bets</p>
        <textarea
          style={S.textarea}
          placeholder="Paste the MyBookie JSON payload here, or use Auto-Fetch"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div style={S.row}>
          <button style={S.btn("#555")} onClick={onClose} disabled={busy}>
            Close
          </button>
          <button style={S.btn("#003366")} onClick={autoFetchBookieBets} disabled={busy}>
            Auto-Fetch from MyBookie
          </button>
          <button style={S.btn("#006B3D")} onClick={submitBookieBets} disabled={busy || !note.trim()}>
            {busy ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
