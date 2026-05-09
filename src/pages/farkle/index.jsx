import React, { useState } from 'react';

const WIN_SCORE = 10000;

/* ─── Pip layout for each die face ─── */
const PIP_MAP = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

/* ─── Score calculator ─── */
function calcScore(values) {
  if (!values.length) return { score: 0, parts: [] };
  const counts = Array(7).fill(0);
  values.forEach(v => counts[v]++);

  // Special 6-dice combos
  if (values.length === 6) {
    if (counts.slice(1).every(c => c === 1))
      return { score: 1500, parts: ['1–6 Straight!'] };
    if (counts.slice(1).filter(c => c === 2).length === 3)
      return { score: 1500, parts: ['Three Pairs!'] };
  }

  let score = 0;
  const parts = [];
  for (let f = 1; f <= 6; f++) {
    const c = counts[f];
    if (c >= 3) {
      const base = f === 1 ? 1000 : f * 100;
      const mult = c === 3 ? 1 : c === 4 ? 2 : c === 5 ? 3 : 4;
      const pts = base * mult;
      score += pts;
      const label = ['', '', '', 'Triple', '4-of-a-kind', '5-of-a-kind', '6-of-a-kind'][c];
      parts.push(`${label} ${f}s = ${pts}`);
    } else {
      if (f === 1 && c) { score += c * 100; parts.push(`${c}× 1 = ${c * 100}`); }
      if (f === 5 && c) { score += c * 50;  parts.push(`${c}× 5 = ${c * 50}`); }
    }
  }
  return { score, parts };
}

/* ─── Best-keep finder (tries all 2^n subsets of free dice) ─── */
function findBestKeep(diceList) {
  const free = diceList.map((d, i) => ({ ...d, origIdx: i })).filter(d => !d.locked);
  if (!free.length) return new Set();
  let best = { score: 0, indices: new Set() };
  for (let mask = 1; mask < (1 << free.length); mask++) {
    const sel = [], vals = [];
    for (let j = 0; j < free.length; j++) {
      if (mask & (1 << j)) { sel.push(free[j].origIdx); vals.push(free[j].value); }
    }
    const { score } = calcScore(vals);
    if (score > best.score) best = { score, indices: new Set(sel) };
  }
  return best.indices;
}

/* ─── P(not farkling) with N dice remaining ─── */
const ROLL_ODDS = [0, 33, 56, 72, 84, 92, 98];

/* ─── Die face SVG-like pip display ─── */
function DieFace({ value, size = 60, color = '#1e1b4b' }) {
  const pips = PIP_MAP[value] || [];
  const pip = Math.round(size * 0.17);
  const pad = Math.round(size * 0.13);
  return (
    <div style={{
      width: size, height: size, padding: pad,
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(3, 1fr)',
      boxSizing: 'border-box',
    }}>
      {Array.from({ length: 9 }, (_, i) => {
        const r = Math.floor(i / 3), c = i % 3;
        const hasPip = pips.some(([pr, pc]) => pr === r && pc === c);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {hasPip && <div style={{ width: pip, height: pip, borderRadius: '50%', background: color }} />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Individual Die Card ─── */
function DieCard({ die, onInc, onDec, onToggle, suggested }) {
  const { value, kept, locked } = die;
  const showSug = suggested && !kept && !locked;

  const bg        = locked ? '#1e1734' : kept ? '#fef3c7' : showSug ? '#f0fdf4' : '#ffffff';
  const border    = locked ? '#3b2f6e' : kept  ? '#f59e0b' : showSug ? '#22c55e' : '#e5e7eb';
  const pipColor  = locked ? '#6b5b95' : kept  ? '#92400e' : showSug ? '#15803d' : '#1e1b4b';
  const arrowClr  = locked ? '#3b2f6e' : kept  ? '#b45309' : showSug ? '#16a34a' : '#9ca3af';
  const shadow    = kept ? '0 0 18px rgba(245,158,11,0.35)' : showSug ? '0 0 14px rgba(34,197,94,0.32)' : '0 2px 8px rgba(0,0,0,0.1)';

  const btnBase = {
    background: 'none', border: 'none',
    color: arrowClr, fontSize: 14,
    cursor: locked ? 'default' : 'pointer',
    padding: '2px 14px', lineHeight: 1,
    borderRadius: 4,
  };

  return (
    <div style={{
      background: bg,
      border: `2px solid ${border}`,
      borderRadius: 12,
      padding: '6px 6px 8px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      boxShadow: shadow,
      transition: 'all 0.15s',
      userSelect: 'none',
    }}>
      {/* ▲ increment */}
      <button onClick={!locked ? onInc : undefined} style={btnBase} aria-label="increase">▲</button>

      {/* Pip face — tap to toggle keep */}
      <div
        onClick={!locked ? onToggle : undefined}
        style={{ cursor: locked ? 'default' : 'pointer', borderRadius: 6 }}
      >
        <DieFace value={value} size={60} color={pipColor} />
      </div>

      {/* ▼ decrement */}
      <button onClick={!locked ? onDec : undefined} style={btnBase} aria-label="decrease">▼</button>

      {/* Keep toggle or locked badge */}
      {locked ? (
        <div style={{
          fontSize: 9, color: '#6b5b95', letterSpacing: 1.5,
          textTransform: 'uppercase', fontWeight: 700,
        }}>LOCKED</div>
      ) : (
        <button
          onClick={onToggle}
          style={{
            background: kept ? '#f59e0b' : showSug ? '#22c55e' : '#f3f4f6',
            color: kept ? '#fff' : showSug ? '#fff' : '#6b7280',
            border: 'none', borderRadius: 6,
            padding: '4px 0', fontSize: 10, fontWeight: 700,
            letterSpacing: 0.8, cursor: 'pointer', width: '100%',
            textTransform: 'uppercase',
          }}
        >{kept ? '✓ KEPT' : showSug ? '★ KEEP' : 'KEEP'}</button>
      )}
    </div>
  );
}

/* ─── Persistence ─── */
const STORAGE_KEY = 'farkle_game';
function initDice() {
  return Array.from({ length: 6 }, () => ({ value: 1, kept: false, locked: false }));
}
function loadSaved() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

/* ─── Main component ─── */
export default function Farkle() {
  const saved = loadSaved();
  const [phase, setPhase]             = useState(saved?.phase ?? 'setup');
  const [playerNames, setPlayerNames] = useState(saved?.playerNames ?? ['Player 1', 'Player 2']);
  const [scores, setScores]           = useState(saved?.scores ?? []);
  const [currentIdx, setCurrentIdx]   = useState(saved?.currentIdx ?? 0);
  const [dice, setDice]               = useState(() => saved?.dice ?? initDice());
  const [turnBanked, setTurnBanked]   = useState(saved?.turnBanked ?? 0);
  const [flash, setFlash]             = useState('');
  const [winnerIdx, setWinnerIdx]     = useState(saved?.winnerIdx ?? null);

  // Persist game state on every change (skip setup phase — nothing to save)
  React.useEffect(() => {
    if (phase === 'setup') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(
        { phase, playerNames, scores, currentIdx, dice, turnBanked, winnerIdx }
      ));
    } catch {}
  }, [phase, playerNames, scores, currentIdx, dice, turnBanked, winnerIdx]);

  function showFlash(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 3000);
  }

  const names = playerNames.map(n => n.trim()).filter(Boolean);

  /* ── Setup actions ── */
  function startGame() {
    if (names.length < 2) return;
    setScores(Array(names.length).fill(0));
    setCurrentIdx(0);
    setDice(initDice());
    setTurnBanked(0);
    setFlash('');
    setWinnerIdx(null);
    setPhase('playing');
  }

  function updateName(i, val) {
    setPlayerNames(prev => prev.map((n, idx) => idx === i ? val : n));
  }

  function addPlayer() {
    if (playerNames.length < 8)
      setPlayerNames(prev => [...prev, `Player ${prev.length + 1}`]);
  }

  function removePlayer(i) {
    if (playerNames.length > 2)
      setPlayerNames(prev => prev.filter((_, idx) => idx !== i));
  }

  /* ── Playing computed values ── */
  const keptValues = dice.filter(d => d.kept && !d.locked).map(d => d.value);
  const { score: keptScore, parts: keptParts } = calcScore(keptValues);
  const turnTotal = turnBanked + keptScore;

  /* ── Suggestion + roll odds ── */
  const suggestedIndices = findBestKeep(dice);
  const remainingCount   = dice.filter(d => !d.locked && !d.kept).length;
  const rollOdds         = ROLL_ODDS[remainingCount] ?? 0;
  const oddsColor        = rollOdds >= 80 ? '#4ade80' : rollOdds >= 55 ? '#fbbf24' : '#ef4444';

  /* ── Dice actions ── */
  function incDie(i) {
    setDice(prev => prev.map((d, idx) =>
      idx === i ? { ...d, value: d.value === 6 ? 1 : d.value + 1 } : d
    ));
  }

  function decDie(i) {
    setDice(prev => prev.map((d, idx) =>
      idx === i ? { ...d, value: d.value === 1 ? 6 : d.value - 1 } : d
    ));
  }

  function toggleKept(i) {
    setDice(prev => prev.map((d, idx) =>
      idx === i ? { ...d, kept: !d.kept } : d
    ));
  }

  /* ── Turn actions ── */
  function doFarkle() {
    showFlash(`🎲 Farkle! ${names[currentIdx]} scores 0 this turn.`);
    nextTurn(scores);
  }

  function doKeepAndRoll() {
    if (!keptScore) { showFlash('Select at least one scoring die first!'); return; }
    const newBanked = turnBanked + keptScore;
    const newDice   = dice.map(d => d.kept && !d.locked ? { ...d, locked: true, kept: false } : d);
    const allLocked = newDice.every(d => d.locked);
    if (allLocked) {
      showFlash('🔥 Hot Dice! Roll all 6 again!');
      setTurnBanked(newBanked);
      setDice(initDice());
    } else {
      setTurnBanked(newBanked);
      setDice(newDice);
    }
  }

  function doBankTurn() {
    if (turnTotal <= 0) { showFlash('No score to bank yet!'); return; }
    const newScores = scores.map((s, i) => i === currentIdx ? s + turnTotal : s);
    if (newScores[currentIdx] >= WIN_SCORE) {
      setScores(newScores);
      setWinnerIdx(currentIdx);
      setPhase('gameover');
      return;
    }
    showFlash(`${names[currentIdx]} banked ${turnTotal.toLocaleString()} pts!`);
    nextTurn(newScores);
  }

  function nextTurn(updatedScores) {
    setScores(updatedScores);
    setCurrentIdx(prev => (prev + 1) % names.length);
    setDice(initDice());
    setTurnBanked(0);
  }

  function resetGame() {
    localStorage.removeItem(STORAGE_KEY);
    setPhase('setup');
    setPlayerNames(['Player 1', 'Player 2']);
    setScores([]);
    setCurrentIdx(0);
    setDice(initDice());
    setTurnBanked(0);
    setFlash('');
    setWinnerIdx(null);
  }

  /* ─── Base page style ─── */
  const page = {
    minHeight: '100%',
    background: '#0f0f12',
    color: '#f0f0f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: 40,
  };

  /* ════════════════════════════════════════
      SETUP PHASE
  ════════════════════════════════════════ */
  if (phase === 'setup') {
    return (
      <div style={page}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 20px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🎲</div>
            <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 6px', color: '#fff', letterSpacing: '-0.5px' }}>
              Farkle
            </h1>
            <p style={{ fontSize: 14, color: '#606080', margin: 0 }}>Score Tracker • First to {WIN_SCORE.toLocaleString()} wins</p>
          </div>

          {/* Player setup */}
          <div style={{ background: '#1a1a2e', borderRadius: 16, padding: '24px 20px', marginBottom: 16 }}>
            <h2 style={{
              fontSize: 13, fontWeight: 600, color: '#606080',
              textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 20px',
            }}>Players (2–8)</h2>

            {playerNames.map((name, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  value={name}
                  onChange={e => updateName(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  style={{
                    flex: 1, background: '#0f0f12',
                    border: '1px solid #2a2a45', borderRadius: 10,
                    padding: '10px 14px', color: '#f0f0f5',
                    fontSize: 15, outline: 'none',
                  }}
                />
                {playerNames.length > 2 && (
                  <button
                    onClick={() => removePlayer(i)}
                    style={{
                      background: '#2a1a1a', border: 'none', borderRadius: 10,
                      color: '#ef4444', width: 42, cursor: 'pointer', fontSize: 16,
                    }}
                  >✕</button>
                )}
              </div>
            ))}

            {playerNames.length < 8 && (
              <button
                onClick={addPlayer}
                style={{
                  background: 'none', border: '1px dashed #2a2a45', borderRadius: 10,
                  color: '#6c63ff', width: '100%', padding: 10,
                  cursor: 'pointer', fontSize: 14, marginTop: 4,
                }}
              >+ Add Player</button>
            )}
          </div>

          {/* Start button */}
          <button
            onClick={startGame}
            disabled={names.length < 2}
            style={{
              width: '100%', padding: 14,
              background: names.length >= 2 ? '#6c63ff' : '#2a2a45',
              color: names.length >= 2 ? '#fff' : '#404060',
              border: 'none', borderRadius: 12,
              fontSize: 16, fontWeight: 700,
              cursor: names.length >= 2 ? 'pointer' : 'default',
              letterSpacing: 0.5, marginBottom: 24,
            }}
          >Start Game →</button>

          {/* Scoring reference */}
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '16px 20px' }}>
            <h3 style={{
              fontSize: 12, color: '#606080', textTransform: 'uppercase',
              letterSpacing: '0.1em', margin: '0 0 12px',
            }}>Scoring Reference</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, columnGap: 16 }}>
              {[
                ['Single 1',      '100 pts'],
                ['Single 5',       '50 pts'],
                ['Triple 1s',   '1,000 pts'],
                ['Triple 2s – 6s', 'face × 100'],
                ['4 of a kind',   '2× triple'],
                ['5 of a kind',   '3× triple'],
                ['6 of a kind',   '4× triple'],
                ['1–6 Straight', '1,500 pts'],
                ['Three Pairs',  '1,500 pts'],
              ].map(([rule, pts]) => (
                <React.Fragment key={rule}>
                  <span style={{ fontSize: 12, color: '#a0a0b8' }}>{rule}</span>
                  <span style={{ fontSize: 12, color: '#f0f0f5', fontWeight: 600, textAlign: 'right' }}>{pts}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════
      GAME OVER PHASE
  ════════════════════════════════════════ */
  if (phase === 'gameover') {
    const sorted = names
      .map((name, i) => ({ name, score: scores[i], isWinner: i === winnerIdx }))
      .sort((a, b) => b.score - a.score);
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

    return (
      <div style={page}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>🏆</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
            {names[winnerIdx]} Wins!
          </h1>
          <p style={{ color: '#606080', fontSize: 14, margin: '0 0 40px' }}>
            Reached {WIN_SCORE.toLocaleString()} points
          </p>

          <div style={{ background: '#1a1a2e', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
            {sorted.map((p, i) => (
              <div
                key={p.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 20px',
                  background: p.isWinner ? 'rgba(108,99,255,0.15)' : 'transparent',
                  borderBottom: i < sorted.length - 1 ? '1px solid #2a2a45' : 'none',
                }}
              >
                <span style={{ fontSize: 20, width: 28 }}>{medals[i]}</span>
                <span style={{
                  flex: 1, fontWeight: 600, textAlign: 'left',
                  color: p.isWinner ? '#a78bfa' : '#f0f0f5',
                }}>{p.name}</span>
                <span style={{
                  fontSize: 18, fontWeight: 800,
                  color: p.isWinner ? '#a78bfa' : '#f0f0f5',
                }}>{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <button
            onClick={resetGame}
            style={{
              width: '100%', padding: 14,
              background: '#6c63ff', color: '#fff',
              border: 'none', borderRadius: 12,
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}
          >Play Again</button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════
      PLAYING PHASE
  ════════════════════════════════════════ */
  return (
    <div style={page}>

      {/* ── Scoreboard ── */}
      <div style={{
        background: '#1a1a2e',
        borderBottom: '1px solid #2a2a45',
        padding: '10px 0',
        overflowX: 'auto',
      }}>
        <div style={{
          display: 'flex', gap: 8, padding: '0 16px',
          minWidth: 'max-content', margin: '0 auto',
          justifyContent: names.length <= 4 ? 'center' : 'flex-start',
        }}>
          {names.map((name, i) => (
            <div
              key={i}
              style={{
                background: i === currentIdx ? '#6c63ff' : '#0f0f12',
                border: `1px solid ${i === currentIdx ? '#6c63ff' : '#2a2a45'}`,
                borderRadius: 10, padding: '7px 14px', textAlign: 'center',
                minWidth: 80, transition: 'all 0.2s',
              }}
            >
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
                textTransform: 'uppercase', marginBottom: 2,
                color: i === currentIdx ? 'rgba(255,255,255,0.75)' : '#606080',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90,
              }}>{name}</div>
              <div style={{
                fontSize: 18, fontWeight: 800,
                color: i === currentIdx ? '#fff' : '#f0f0f5',
              }}>{scores[i].toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 12px' }}>

        {/* ── Turn info ── */}
        <div style={{ textAlign: 'center', padding: '14px 0 10px' }}>
          <div style={{ fontSize: 14, color: '#a0a0b8', marginBottom: 10 }}>
            <strong style={{ color: '#fff' }}>{names[currentIdx]}</strong>'s Turn
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 0 }}>
            {[
              { label: 'Banked',    value: turnBanked, color: turnBanked > 0 ? '#4ade80' : '#2a2a45' },
              { label: 'Selected', value: keptScore,  color: keptScore  > 0 ? '#fbbf24' : '#2a2a45' },
              { label: 'Turn Total', value: turnTotal, color: turnTotal  > 0 ? '#ffffff' : '#2a2a45' },
            ].map(({ label, value, color }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <div style={{ width: 1, background: '#2a2a45', margin: '0 16px' }} />}
                <div style={{ textAlign: 'center', minWidth: 70 }}>
                  <div style={{ fontSize: 10, color: '#606080', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{value.toLocaleString()}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Score breakdown ── */}
        {keptParts.length > 0 && (
          <div style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: 10, padding: '8px 14px',
            marginBottom: 10, textAlign: 'center',
          }}>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>{keptParts.join('  +  ')}</span>
          </div>
        )}

        {/* ── Flash message ── */}
        {flash && (
          <div style={{
            background: '#1a1a2e', border: '1px solid #2a2a45',
            borderRadius: 10, padding: '10px 16px',
            textAlign: 'center', fontSize: 14, color: '#a78bfa',
            marginBottom: 10,
          }}>{flash}</div>
        )}

        {/* ── Dice grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10, marginBottom: 14,
        }}>
          {dice.map((die, i) => (
            <DieCard
              key={i}
              die={die}
              onInc={() => incDie(i)}
              onDec={() => decDie(i)}
              onToggle={() => toggleKept(i)}
              suggested={suggestedIndices.has(i)}
            />
          ))}
        </div>

        {/* ── Roll probability banner ── */}
        {remainingCount > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#1a1a2e', border: '1px solid #2a2a45',
            borderRadius: 10, padding: '8px 14px', marginBottom: 10,
          }}>
            <span style={{ fontSize: 12, color: '#606080' }}>
              Keep &amp; roll <strong style={{ color: '#a0a0b8' }}>{remainingCount} {remainingCount === 1 ? 'die' : 'dice'}</strong>
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: oddsColor }}>
              {rollOdds}% to score
            </span>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {/* Farkle */}
          <button
            onClick={doFarkle}
            style={{
              background: '#2a1a1a', border: '1px solid #ef4444',
              borderRadius: 12, color: '#ef4444',
              padding: '12px 6px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 22 }}>🎲</span>
            <span>Farkle!</span>
          </button>

          {/* Keep & Roll */}
          <button
            onClick={doKeepAndRoll}
            style={{
              background: keptScore > 0 ? '#1a1a3e' : '#1a1a2e',
              border: `1px solid ${keptScore > 0 ? '#6c63ff' : '#2a2a45'}`,
              borderRadius: 12, color: keptScore > 0 ? '#a78bfa' : '#404060',
              padding: '12px 6px', fontSize: 13, fontWeight: 700,
              cursor: keptScore > 0 ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 22 }}>🔒</span>
            <span>Keep &amp; Roll</span>
          </button>

          {/* Bank */}
          <button
            onClick={doBankTurn}
            style={{
              background: turnTotal > 0 ? '#1a3a1a' : '#1a1a2e',
              border: `1px solid ${turnTotal > 0 ? '#4ade80' : '#2a2a45'}`,
              borderRadius: 12, color: turnTotal > 0 ? '#4ade80' : '#404060',
              padding: '12px 6px', fontSize: 13, fontWeight: 700,
              cursor: turnTotal > 0 ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 22 }}>✅</span>
            <span>Bank {turnTotal > 0 ? turnTotal.toLocaleString() : ''}</span>
          </button>
        </div>

        {/* ── Help / New game ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#404060', lineHeight: 1.6 }}>
            ▲▼ set value&nbsp;&nbsp;•&nbsp;&nbsp;tap pip or KEEP to select
          </span>
          <button
            onClick={resetGame}
            style={{
              background: 'none', border: 'none', color: '#404060',
              fontSize: 11, cursor: 'pointer', textDecoration: 'underline',
            }}
          >New Game</button>
        </div>
      </div>
    </div>
  );
}
