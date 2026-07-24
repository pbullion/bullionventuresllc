import { useState } from 'react';
import { Link } from 'react-router-dom';

const HORSES = [
  { num: 1, name: 'Renegade' },
  { num: 6, name: 'Commandment' },
  { num: 12, name: 'Chief Wallabee' },
  { num: 15, name: 'Emerging Market' },
  { num: 18, name: 'Further Ado' },
  { num: 99, name: 'Golden Tempo' },
];

const INITIAL_TICKETS = [
  { id: '294456773', type: 'win', label: 'Commandment win', horse: 6, risk: 15, payout: 60 },
  { id: '294456776', type: 'win', label: 'Chief Wallabee win', horse: 12, risk: 15, payout: 105 },
  { id: '294456777', type: 'win', label: 'Emerging Market win', horse: 15, risk: 15, payout: 135 },
  { id: '294456778', type: 'win', label: 'Golden Tempo win', horseName: 'Golden Tempo', risk: 15, payout: 495 },
  { id: '223959226', type: 'trifecta_straight', label: 'Straight trifecta 6/12/15', first: [6], second: [12], third: [15], risk: 1 },
  { id: '223959227', type: 'trifecta_straight', label: 'Straight trifecta 12/6/18', first: [12], second: [6], third: [18], risk: 1 },
  { id: '22395922', type: 'trifecta_wheel', label: 'Part-wheel 6 / 12,15,18 / 1,12,15,18', first: [6], second: [12, 15, 18], third: [1, 12, 15, 18], risk: 9 },
  { id: '22395923', type: 'trifecta_wheel', label: 'Part-wheel 12 / 6,15,18 / 1,6,15,18', first: [12], second: [6, 15, 18], third: [1, 6, 15, 18], risk: 9 },
  { id: '22395924', type: 'trifecta_wheel', label: 'Part-wheel 12 / 6,15,18 / 1,6,15,18', first: [12], second: [6, 15, 18], third: [1, 6, 15, 18], risk: 9 },
  { id: '22395925', type: 'trifecta_wheel', label: 'Part-wheel 15 / 6,12,18 / 1,6,12,18', first: [15], second: [6, 12, 18], third: [1, 6, 12, 18], risk: 9 },
];

function horseName(num) {
  const found = HORSES.find(h => h.num === num);
  return found ? found.name : `#${num}`;
}

function money(v) {
  const n = Number(v).toFixed(2);
  return '$' + (n.endsWith('.00') ? n.slice(0, -3) : n);
}

function ticketWins(t, finish) {
  if (!finish.first || !finish.second || !finish.third) return null;
  if (new Set([finish.first, finish.second, finish.third]).size < 3) return null;
  if (t.type === 'win') {
    if (t.horse) return finish.first === t.horse;
    return false;
  }
  const valid = t.first.includes(finish.first) && t.second.includes(finish.second) && t.third.includes(finish.third);
  return valid;
}

function ResultBadge({ result }) {
  if (result === true) return <span style={{ color: '#22c55e', fontWeight: 700 }}>WIN</span>;
  if (result === false) return <span style={{ color: '#ef4444', fontWeight: 700 }}>LOSS</span>;
  return <span style={{ color: '#f59e0b', fontWeight: 700 }}>PENDING</span>;
}

const s = {
  page: { backgroundColor: '#0d1016', color: '#f3f5f7', minHeight: '100%', fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' },
  wrap: { maxWidth: 1200, margin: '0 auto', padding: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 },
  card: { gridColumn: 'span 12', background: '#171a21', border: '1px solid #2a3040', borderRadius: 18, padding: 18, boxShadow: '0 10px 30px rgba(0,0,0,.25)' },
  cardHalf: { gridColumn: 'span 6' },
  cardThird: { gridColumn: 'span 4' },
  h1: { margin: '0 0 10px', fontSize: 28, fontWeight: 800 },
  h2: { margin: '0 0 10px', fontSize: 20, fontWeight: 700 },
  h3: { margin: '0 0 10px', fontSize: 16, fontWeight: 700 },
  sub: { color: '#97a0af', marginBottom: 18 },
  pill: { display: 'inline-block', padding: '6px 10px', borderRadius: 999, background: 'rgba(255,138,0,.12)', color: '#ffb24d', border: '1px solid rgba(255,138,0,.25)', fontSize: 12, marginRight: 8, marginBottom: 8 },
  horseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 10, marginTop: 10 },
  horseBtn: { border: '1px solid #2a3040', background: '#11151d', color: '#f3f5f7', borderRadius: 12, padding: '12px 10px', cursor: 'pointer', fontWeight: 700, textAlign: 'center', fontSize: 14 },
  horseBtnActive: { borderColor: '#ff8a00', background: 'rgba(255,138,0,.15)', color: 'white' },
  placementBlock: { marginBottom: 18 },
  placementTitle: { fontWeight: 700, marginBottom: 8 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  stat: { background: '#11151d', border: '1px solid #2a3040', borderRadius: 14, padding: 14 },
  statLabel: { color: '#97a0af', fontSize: 13 },
  statValue: { fontSize: 28, fontWeight: 800, marginTop: 6 },
  controls: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 },
  btnAction: { background: '#ff8a00', color: '#111', border: 'none', borderRadius: 12, padding: '10px 14px', fontWeight: 800, cursor: 'pointer', fontSize: 14 },
  btnSecondary: { background: '#11151d', color: '#f3f5f7', border: '1px solid #2a3040', borderRadius: 12, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  footerNote: { marginTop: 16, color: '#97a0af', fontSize: 13 },
  tiny: { fontSize: 12, color: '#97a0af' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 14 },
  th: { padding: '10px 8px', borderBottom: '1px solid #2a3040', textAlign: 'left', color: '#97a0af', fontWeight: 600 },
  td: { padding: '10px 8px', borderBottom: '1px solid #2a3040', textAlign: 'left', verticalAlign: 'top' },
  badge: { display: 'inline-block', padding: '4px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid #2a3040', background: '#11151d' },
  input: { width: '100%', background: '#11151d', color: '#f3f5f7', border: '1px solid #2a3040', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' },
  backLink: { display: 'inline-block', color: '#ff8a00', textDecoration: 'none', fontSize: 14, fontWeight: 600, marginBottom: 20 },
};

export default function KentuckyDerbyTracker() {
  const [finish, setFinish] = useState({ first: null, second: null, third: null });
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [newType, setNewType] = useState('win');
  const [newHorse, setNewHorse] = useState('');
  const [newRisk, setNewRisk] = useState('');
  const [newPayout, setNewPayout] = useState('');
  const [newTri, setNewTri] = useState('');

  function setPlace(place, num) {
    setFinish(prev => {
      const next = { ...prev };
      for (const key of ['first', 'second', 'third']) {
        if (key !== place && next[key] === num) next[key] = null;
      }
      next[place] = next[place] === num ? null : num;
      return next;
    });
  }

  function resetFinish() {
    setFinish({ first: null, second: null, third: null });
  }

  function addTicket() {
    if (newType === 'win') {
      if (!newHorse) return alert('Enter a horse name or number.');
      const num = Number(newHorse);
      setTickets(prev => [...prev, {
        id: 'manual-' + Date.now(),
        type: 'win',
        label: `Manual win bet ${newHorse}`,
        horse: Number.isFinite(num) && num > 0 ? num : undefined,
        horseName: Number.isFinite(num) && num > 0 ? undefined : newHorse,
        risk: Number(newRisk) || 0,
        payout: Number(newPayout) || 0,
      }]);
    } else {
      if (!newTri.match(/^\s*\d+\s*\/\s*\d+\s*\/\s*\d+\s*$/)) return alert('Enter trifecta like 6/12/15');
      const [a, b, c] = newTri.split('/').map(x => [Number(x.trim())]);
      setTickets(prev => [...prev, {
        id: 'manual-' + Date.now(),
        type: 'trifecta_straight',
        label: `Manual straight trifecta ${newTri}`,
        first: a, second: b, third: c,
        risk: Number(newRisk) || 1,
      }]);
    }
    setNewHorse(''); setNewRisk(''); setNewPayout(''); setNewTri('');
  }

  const riskTotal = tickets.reduce((s, t) => s + Number(t.risk || 0), 0);
  const winOnlyReturn = tickets.filter(t => t.type === 'win').reduce((s, t) => s + Number(t.payout || 0), 0);
  const results = tickets.map(t => ticketWins(t, finish));
  const winningCount = results.filter(r => r === true).length;
  const losingCount = results.filter(r => r === false).length;

  const finishSet = finish.first && finish.second && finish.third && new Set([finish.first, finish.second, finish.third]).size === 3;

  const raceHorses = HORSES.filter(h => h.num !== 99);

  // responsive column spans via inline — use span 6 for half, span 4 for third
  // on small screens this won't auto-collapse without media queries, but that's ok
  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <Link to="/" style={s.backLink}>← Back to Bullion Ventures</Link>
        <h1 style={s.h1}>Kentucky Derby Bet Tracker</h1>
        <div style={s.sub}>Set the official 1st, 2nd, and 3rd finishers, then this page grades your tickets automatically.</div>

        <div style={s.grid}>

          {/* Official Finish */}
          <div style={{ ...s.card, ...s.cardHalf }}>
            <h2 style={s.h2}>Official Finish</h2>
            {['first', 'second', 'third'].map((place, i) => (
              <div key={place} style={s.placementBlock}>
                <div style={s.placementTitle}>{['1st Place', '2nd Place', '3rd Place'][i]}</div>
                <div style={s.horseGrid}>
                  {raceHorses.map(h => (
                    <button
                      key={h.num}
                      style={{ ...s.horseBtn, ...(finish[place] === h.num ? s.horseBtnActive : {}) }}
                      onClick={() => setPlace(place, h.num)}
                    >
                      {h.num}
                      <small style={{ display: 'block', color: finish[place] === h.num ? '#ffb24d' : '#97a0af', fontWeight: 500, marginTop: 4, fontSize: 11 }}>{h.name}</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div style={s.controls}>
              <button style={s.btnAction} onClick={() => {}}>Grade My Bets</button>
              <button style={s.btnSecondary} onClick={resetFinish}>Reset Finish</button>
            </div>
            <div style={s.footerNote}>Tip: you can only use each horse once in the top 3. The page blocks duplicates automatically.</div>
          </div>

          {/* Summary */}
          <div style={{ ...s.card, ...s.cardHalf }}>
            <h2 style={s.h2}>Summary</h2>
            <div style={s.summaryGrid}>
              <div style={s.stat}><div style={s.statLabel}>Visible Risk</div><div style={s.statValue}>{money(riskTotal)}</div></div>
              <div style={s.stat}><div style={s.statLabel}>Potential Win Bets Return</div><div style={s.statValue}>{money(winOnlyReturn)}</div></div>
              <div style={s.stat}><div style={s.statLabel}>Winning Tickets</div><div style={s.statValue}>{winningCount}</div></div>
              <div style={s.stat}><div style={s.statLabel}>Losing Tickets</div><div style={s.statValue}>{losingCount}</div></div>
            </div>
            <div style={{ marginTop: 16 }}>
              {['1 Renegade', '6 Commandment', '12 Chief Wallabee', '15 Emerging Market', '18 Further Ado', 'Golden Tempo = win bet only'].map(p => (
                <span key={p} style={s.pill}>{p}</span>
              ))}
            </div>
            <div style={s.footerNote}>Trifecta payouts are pari-mutuel, so the page can tell you whether a trifecta ticket hit, but it cannot know the final payout until the track posts it.</div>
          </div>

          {/* Win Bets */}
          <div style={{ ...s.card, ...s.cardThird }}>
            <h3 style={s.h3}>Win Bets</h3>
            <div style={s.tiny}>These use the odds and amounts visible in your screenshots.</div>
            <table style={s.table}>
              <thead><tr><th style={s.th}>Horse</th><th style={s.th}>Risk</th><th style={s.th}>Return</th><th style={s.th}>Result</th></tr></thead>
              <tbody>
                {tickets.filter(t => t.type === 'win').map((t, i) => {
                  const horse = t.horse ? `#${t.horse} ${horseName(t.horse)}` : (t.horseName || t.label);
                  return (
                    <tr key={t.id + i}>
                      <td style={s.td}>{horse}</td>
                      <td style={s.td}>{money(t.risk)}</td>
                      <td style={s.td}>{money(t.payout)}</td>
                      <td style={s.td}><ResultBadge result={ticketWins(t, finish)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Trifectas */}
          <div style={{ ...s.card, ...s.cardThird }}>
            <h3 style={s.h3}>Trifectas</h3>
            <div style={s.tiny}>Straight and part-wheel trifecta tickets from your screenshots.</div>
            <table style={s.table}>
              <thead><tr><th style={s.th}>Ticket</th><th style={s.th}>Risk</th><th style={s.th}>Result</th></tr></thead>
              <tbody>
                {tickets.filter(t => t.type !== 'win').map((t, i) => (
                  <tr key={t.id + i}>
                    <td style={{ ...s.td, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{t.first.join(',')}/{t.second.join(',')}/{t.third.join(',')}</td>
                    <td style={s.td}>{money(t.risk)}</td>
                    <td style={s.td}><ResultBadge result={ticketWins(t, finish)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Outcome Notes */}
          <div style={{ ...s.card, ...s.cardThird }}>
            <h3 style={s.h3}>Outcome Notes</h3>
            {!finishSet ? (
              <div style={s.tiny}>Pick the first 3 finishers to see which tickets cash.</div>
            ) : (
              <div style={s.tiny}>
                <div><strong style={{ color: '#f3f5f7' }}>Official finish:</strong> #{finish.first} {horseName(finish.first)}, #{finish.second} {horseName(finish.second)}, #{finish.third} {horseName(finish.third)}</div>
                {(() => {
                  const wins = tickets.filter(t => ticketWins(t, finish) === true);
                  if (wins.length === 0) return <div style={{ marginTop: 10, color: '#ef4444', fontWeight: 700 }}>None of the visible tickets hit.</div>;
                  return (
                    <div style={{ marginTop: 10 }}>
                      <strong style={{ color: '#f3f5f7' }}>Cashing tickets:</strong>
                      <ul style={{ paddingLeft: 18, margin: '8px 0 0' }}>
                        {wins.map((t, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>{t.label}{t.payout ? ` — returns ${money(t.payout)}` : ' — trifecta payout depends on the final pool'}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* All Tickets */}
          <div style={s.card}>
            <h2 style={s.h2}>All Tickets</h2>
            <table style={s.table}>
              <thead><tr><th style={s.th}>Ticket ID</th><th style={s.th}>Type</th><th style={s.th}>Bet</th><th style={s.th}>Risk</th><th style={s.th}>Return</th><th style={s.th}>Result</th></tr></thead>
              <tbody>
                {tickets.map((t, i) => {
                  const desc = t.type === 'win'
                    ? (t.horse ? `Win bet on #${t.horse} ${horseName(t.horse)}` : `Win bet on ${t.horseName}`)
                    : `${t.first.join(',')}\u00a0/\u00a0${t.second.join(',')}\u00a0/\u00a0${t.third.join(',')}`;
                  return (
                    <tr key={t.id + i}>
                      <td style={s.td}>{t.id}</td>
                      <td style={s.td}><span style={s.badge}>{t.type.replace('_', ' ')}</span></td>
                      <td style={s.td}>{desc}</td>
                      <td style={s.td}>{money(t.risk)}</td>
                      <td style={s.td}>{t.payout ? money(t.payout) : <span style={{ color: '#97a0af' }}>pari-mutuel</span>}</td>
                      <td style={s.td}><ResultBadge result={ticketWins(t, finish)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Extra Ticket */}
          <div style={s.card}>
            <h2 style={s.h2}>Add Extra Ticket</h2>
            <div style={s.tiny}>For any ticket not visible in the screenshots. This stays in your browser on this page only.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr 1fr auto', gap: 10, marginTop: 12 }}>
              <select style={s.input} value={newType} onChange={e => setNewType(e.target.value)}>
                <option value="win">Win Bet</option>
                <option value="trifecta">Straight Trifecta</option>
              </select>
              <input style={s.input} type="text" placeholder="Horse name or # for win bet" value={newHorse} onChange={e => setNewHorse(e.target.value)} />
              <input style={s.input} type="number" placeholder="Risk" step="0.01" value={newRisk} onChange={e => setNewRisk(e.target.value)} />
              <input style={s.input} type="number" placeholder="Win amount" step="0.01" value={newPayout} onChange={e => setNewPayout(e.target.value)} />
              <input style={s.input} type="text" placeholder="For trifecta: 6/12/15" value={newTri} onChange={e => setNewTri(e.target.value)} />
              <button style={s.btnAction} onClick={addTicket}>Add</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
