import React, { useState } from "react";

const WIN_SCORE = 10000;
const QUICK_ADD = [50, 100, 150, 200, 250, 300, 400, 500, 600, 1000, 1500, 2000, 2500, 3000];

/* ─── Persistence ─── */
const STORAGE_KEY = "farkle_game";
function loadSaved() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

/* ─── Main component ─── */
export default function Farkle() {
  const saved = loadSaved();
  const [phase, setPhase] = useState(saved?.phase ?? "setup");
  const [playerNames, setPlayerNames] = useState(saved?.playerNames ?? ["Player 1", "Player 2"]);
  const [scores, setScores] = useState(saved?.scores ?? []);
  const [currentIdx, setCurrentIdx] = useState(saved?.currentIdx ?? 0);
  const [turnScore, setTurnScore] = useState(saved?.turnScore ?? 0);
  const [turnsTaken, setTurnsTaken] = useState(saved?.turnsTaken ?? []);
  const [flash, setFlash] = useState("");
  const [winnerIdx, setWinnerIdx] = useState(saved?.winnerIdx ?? null);

  React.useEffect(() => {
    if (phase === "setup") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ phase, playerNames, scores, currentIdx, turnScore, turnsTaken, winnerIdx }),
      );
    } catch {
      /* private mode / quota — the game still plays, just unsaved */
    }
  }, [phase, playerNames, scores, currentIdx, turnScore, turnsTaken, winnerIdx]);

  function showFlash(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(""), 3000);
  }

  const names = playerNames.map((n) => n.trim()).filter(Boolean);

  function startGame() {
    if (names.length < 2) return;
    setScores(Array(names.length).fill(0));
    setCurrentIdx(0);
    setTurnScore(0);
    setTurnsTaken(Array(names.length).fill(0));
    setFlash("");
    setWinnerIdx(null);
    setPhase("playing");
  }

  function updateName(i, val) {
    setPlayerNames((prev) => prev.map((n, idx) => (idx === i ? val : n)));
  }

  function addPlayer() {
    if (playerNames.length < 8) setPlayerNames((prev) => [...prev, `Player ${prev.length + 1}`]);
  }

  function removePlayer(i) {
    if (playerNames.length > 2) setPlayerNames((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addToTurn(pts) {
    setTurnScore((prev) => prev + pts);
  }

  function doFarkle() {
    showFlash(`Farkle! ${names[currentIdx]} scores 0 this turn.`);
    nextTurn(scores);
  }

  function doBankTurn() {
    if (turnScore <= 0) return;
    const newScores = scores.map((s, i) => (i === currentIdx ? s + turnScore : s));
    if (newScores[currentIdx] >= WIN_SCORE) {
      setScores(newScores);
      setWinnerIdx(currentIdx);
      setPhase("gameover");
      return;
    }
    nextTurn(newScores);
  }

  function nextTurn(updatedScores) {
    setScores(updatedScores);
    setTurnsTaken((prev) => prev.map((t, i) => (i === currentIdx ? t + 1 : t)));
    setCurrentIdx((prev) => (prev + 1) % names.length);
    setTurnScore(0);
  }

  function resetGame() {
    localStorage.removeItem(STORAGE_KEY);
    setPhase("setup");
    setPlayerNames(["Player 1", "Player 2"]);
    setScores([]);
    setCurrentIdx(0);
    setTurnScore(0);
    setTurnsTaken([]);
    setFlash("");
    setWinnerIdx(null);
  }

  const page = {
    minHeight: "100vh",
    background: "#0f0f12",
    color: "#f0f0f5",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: "flex",
    flexDirection: "column",
  };

  /* ══ SETUP ══ */
  if (phase === "setup") {
    return (
      <div style={page}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🎲</div>
            <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 6px", color: "#fff", letterSpacing: "-0.5px" }}>
              Farkle
            </h1>
            <p style={{ fontSize: 14, color: "#606080", margin: 0 }}>
              Score Tracker • First to {WIN_SCORE.toLocaleString()} wins
            </p>
          </div>

          <div style={{ background: "#1a1a2e", borderRadius: 16, padding: "24px 20px", marginBottom: 16 }}>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#606080",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 20px",
              }}>
              Players (2–8)
            </h2>
            {playerNames.map((name, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  style={{
                    flex: 1,
                    background: "#0f0f12",
                    border: "1px solid #2a2a45",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#f0f0f5",
                    fontSize: 15,
                    outline: "none",
                  }}
                />
                {playerNames.length > 2 && (
                  <button
                    onClick={() => removePlayer(i)}
                    style={{
                      background: "#2a1a1a",
                      border: "none",
                      borderRadius: 10,
                      color: "#ef4444",
                      width: 42,
                      cursor: "pointer",
                      fontSize: 16,
                    }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            {playerNames.length < 8 && (
              <button
                onClick={addPlayer}
                style={{
                  background: "none",
                  border: "1px dashed #2a2a45",
                  borderRadius: 10,
                  color: "#6c63ff",
                  width: "100%",
                  padding: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  marginTop: 4,
                }}>
                + Add Player
              </button>
            )}
          </div>

          <button
            onClick={startGame}
            disabled={names.length < 2}
            style={{
              width: "100%",
              padding: 14,
              background: names.length >= 2 ? "#6c63ff" : "#2a2a45",
              color: names.length >= 2 ? "#fff" : "#404060",
              border: "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: names.length >= 2 ? "pointer" : "default",
              letterSpacing: 0.5,
              marginBottom: 24,
            }}>
            Start Game →
          </button>

          <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "16px 20px" }}>
            <h3
              style={{
                fontSize: 12,
                color: "#606080",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 12px",
              }}>
              Scoring Reference
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 6, columnGap: 16 }}>
              {[
                ["Single 1", "100 pts"],
                ["Single 5", "50 pts"],
                ["Triple 1s", "1,000 pts"],
                ["Triple 2s – 6s", "face × 100"],
                ["4 of a kind", "2× triple"],
                ["5 of a kind", "3× triple"],
                ["6 of a kind", "4× triple"],
                ["1–6 Straight", "1,500 pts"],
                ["Three Pairs", "1,500 pts"],
              ].map(([rule, pts]) => (
                <React.Fragment key={rule}>
                  <span style={{ fontSize: 12, color: "#a0a0b8" }}>{rule}</span>
                  <span style={{ fontSize: 12, color: "#f0f0f5", fontWeight: 600, textAlign: "right" }}>{pts}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══ GAME OVER ══ */
  if (phase === "gameover") {
    const sorted = names
      .map((name, i) => ({ name, score: scores[i], isWinner: i === winnerIdx }))
      .sort((a, b) => b.score - a.score);
    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];
    return (
      <div style={page}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>🏆</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>{names[winnerIdx]} Wins!</h1>
          <p style={{ color: "#606080", fontSize: 14, margin: "0 0 40px" }}>Reached {WIN_SCORE.toLocaleString()} points</p>
          <div style={{ background: "#1a1a2e", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
            {sorted.map((p, i) => (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 20px",
                  background: p.isWinner ? "rgba(108,99,255,0.15)" : "transparent",
                  borderBottom: i < sorted.length - 1 ? "1px solid #2a2a45" : "none",
                }}>
                <span style={{ fontSize: 20, width: 28 }}>{medals[i]}</span>
                <span style={{ flex: 1, fontWeight: 600, textAlign: "left", color: p.isWinner ? "#a78bfa" : "#f0f0f5" }}>
                  {p.name}
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: p.isWinner ? "#a78bfa" : "#f0f0f5" }}>
                  {p.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={resetGame}
            style={{
              width: "100%",
              padding: 14,
              background: "#6c63ff",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
            }}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  /* ══ PLAYING ══ */
  const leaderboardSorted = names
    .map((name, i) => ({ name, score: scores[i], turns: turnsTaken[i] ?? 0, isCurrent: i === currentIdx }))
    .sort((a, b) => b.score - a.score);
  const leaderScore = leaderboardSorted[0]?.score ?? 0;
  const maxTurns = leaderboardSorted.length > 0 ? Math.max(...leaderboardSorted.map((p) => p.turns)) : 0;

  return (
    <div style={page}>
      {/* Scoreboard strip */}
      <div style={{ background: "#1a1a2e", borderBottom: "1px solid #2a2a45", padding: "12px 16px" }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            width: "100%",
          }}>
          {names.map((name, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: i === currentIdx ? "#6c63ff" : "#0f0f12",
                border: `1px solid ${i === currentIdx ? "#6c63ff" : "#2a2a45"}`,
                borderRadius: 12,
                padding: "10px 8px",
                textAlign: "center",
                transition: "all 0.2s",
              }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  marginBottom: 4,
                  color: i === currentIdx ? "rgba(255,255,255,0.75)" : "#606080",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                {name}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: i === currentIdx ? "#fff" : "#f0f0f5" }}>
                {scores[i].toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {/* Turn info */}
        <div style={{ textAlign: "center", padding: "14px 0 10px" }}>
          <div style={{ fontSize: 14, color: "#a0a0b8", marginBottom: 10 }}>
            <strong style={{ color: "#fff" }}>{names[currentIdx]}</strong>'s Turn
          </div>
        </div>

        {/* Flash */}
        {flash && (
          <div
            style={{
              background: "#1a1a2e",
              border: "1px solid #2a2a45",
              borderRadius: 10,
              padding: "10px 16px",
              textAlign: "center",
              fontSize: 14,
              color: "#a78bfa",
              marginBottom: 10,
            }}>
            {flash}
          </div>
        )}

        {/* Three-column layout: scoring ref | score entry | leaderboard */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", width: "100%" }}>
          {/* Scoring reference panel */}
          <div
            style={{
              background: "#1a1a2e",
              border: "1px solid #2a2a45",
              borderRadius: 12,
              padding: "14px 16px",
              minWidth: 150,
              flexShrink: 0,
            }}>
            <div
              style={{
                fontSize: 10,
                color: "#606080",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 600,
                marginBottom: 10,
              }}>
              Scoring
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 7, columnGap: 12 }}>
              {[
                ["Single 1", "100"],
                ["Single 5", "50"],
                ["Triple 1s", "300"],
                ["Triple 2–6", "N×100"],
                ["4 of a kind", "1,000"],
                ["5 of a kind", "2,000"],
                ["6 of a kind", "3,000"],
                ["1–6 Straight", "1,500"],
                ["3 Pairs", "1,500"],
                ["4 + pair", "1,500"],
                ["2 Triplets", "2,500"],
              ].map(([rule, pts]) => (
                <React.Fragment key={rule}>
                  <span style={{ fontSize: 20, color: "#a0a0b8", fontWeight: 500 }}>{rule}</span>
                  <span style={{ fontSize: 20, color: "#f0f0f5", fontWeight: 500, textAlign: "right" }}>{pts}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Score entry panel */}
          <div style={{ flex: 1 }}>
            {/* Turn score display */}
            <div
              style={{
                background: turnScore > 0 ? "#2a1e00" : "#1a1a2e",
                border: `2px solid ${turnScore > 0 ? "#f59e0b" : "#2a2a45"}`,
                borderRadius: 16,
                padding: "18px 20px",
                textAlign: "center",
                marginBottom: 12,
              }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#606080",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  marginBottom: 6,
                }}>
                Turn Score
              </div>
              <div style={{ fontSize: 48, fontWeight: 900, color: turnScore > 0 ? "#f59e0b" : "#2a2a45", lineHeight: 1 }}>
                {turnScore.toLocaleString()}
              </div>
              {turnScore > 0 && (
                <button
                  onClick={() => setTurnScore(0)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#604020",
                    fontSize: 11,
                    cursor: "pointer",
                    marginTop: 6,
                    textDecoration: "underline",
                  }}>
                  clear
                </button>
              )}
            </div>

            {/* Quick-add grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
              {QUICK_ADD.map((pts) => (
                <button
                  key={pts}
                  onClick={() => addToTurn(pts)}
                  style={{
                    background: "#1e1e32",
                    border: "1px solid #2a2a45",
                    borderRadius: 10,
                    color: "#c0c0d8",
                    padding: 25,
                    fontSize: 25,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}>
                  +{pts >= 1000 ? `${pts / 1000}k` : pts}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={doFarkle}
                style={{
                  background: "#2a1a1a",
                  border: "2px solid #ef4444",
                  borderRadius: 14,
                  color: "#ef4444",
                  padding: "20px 6px",
                  fontSize: 20,
                  fontWeight: 700,
                  cursor: "pointer",
                }}>
                Farkle!
              </button>
              <button
                onClick={doBankTurn}
                disabled={turnScore <= 0}
                style={{
                  background: turnScore > 0 ? "#1a3a1a" : "#1a1a2e",
                  border: `2px solid ${turnScore > 0 ? "#4ade80" : "#2a2a45"}`,
                  borderRadius: 14,
                  color: turnScore > 0 ? "#4ade80" : "#404060",
                  padding: "20px 6px",
                  fontSize: 20,
                  fontWeight: 700,
                  cursor: turnScore > 0 ? "pointer" : "default",
                }}>
                {turnScore > 0 ? `Bank ${turnScore.toLocaleString()}` : "Bank"}
              </button>
            </div>
          </div>

          {/* Leaderboard panel */}
          <div
            style={{
              background: "#1a1a2e",
              border: "1px solid #2a2a45",
              borderRadius: 12,
              padding: "20px 24px",
              width: 260,
              flexShrink: 0,
            }}>
            <div
              style={{
                fontSize: 11,
                color: "#606080",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 600,
                marginBottom: 14,
              }}>
              Standings
            </div>
            {leaderboardSorted.map((p, rank) => {
              const ptsBehind = leaderScore - p.score;
              const turnsBehind = maxTurns - p.turns;
              return (
                <div
                  key={p.name}
                  style={{
                    padding: "9px 0",
                    borderBottom: rank < leaderboardSorted.length - 1 ? "1px solid #2a2a45" : "none",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: "#404060", width: 16, flexShrink: 0 }}>{rank + 1}</span>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: p.isCurrent ? 700 : 500,
                          color: p.isCurrent ? "#a78bfa" : "#c0c0d8",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 100,
                        }}>
                        {p.name}
                      </span>
                    </div>
                    <span
                      style={{ fontSize: 18, fontWeight: 800, color: p.isCurrent ? "#a78bfa" : "#f0f0f5", flexShrink: 0 }}>
                      {p.score.toLocaleString()}
                    </span>
                  </div>
                  {rank > 0 && (ptsBehind > 0 || turnsBehind > 0) && (
                    <div style={{ paddingLeft: 21, marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {ptsBehind > 0 && (
                        <span style={{ fontSize: 12, color: "#ef4444" }}>-{ptsBehind.toLocaleString()} pts</span>
                      )}
                      {turnsBehind > 0 && (
                        <span style={{ fontSize: 12, color: "#f59e0b" }}>
                          {ptsBehind > 0 ? "· " : ""}
                          {turnsBehind} turn{turnsBehind > 1 ? "s" : ""} behind
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* New game link */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button
            onClick={resetGame}
            style={{
              background: "none",
              border: "none",
              color: "#404060",
              fontSize: 11,
              cursor: "pointer",
              textDecoration: "underline",
            }}>
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
