import { Link } from 'react-router-dom';

const products = [
  { label: 'Debriefly', path: '/debriefly' },
  { label: 'Slumbr', path: '/slumbr' },
  { label: 'Mancave Displays', path: '/mancave-displays' },
  { label: 'Sales Tax Tracker', path: '/receipt-tax-tracker' },
  { label: 'Learn & Play!', path: '/learn-and-play' },
];

export default function Footer() {
  return (
    /* Palette tracks src/pages/Home.jsx — the links were the old template
       indigo, which was the one bit of purple left once the home page went
       gold. */
    <footer style={{
      backgroundColor: '#0a0a0d',
      borderTop: '1px solid #24242e',
      padding: '34px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px 20px',
        justifyContent: 'center',
        marginBottom: 22,
      }}>
        {products.map((p) => (
          <Link key={p.path} to={p.path} style={{
            fontSize: 13,
            color: '#b6b6c6',
            fontWeight: 500,
          }}>
            {p.label}
          </Link>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: '#83839a' }}>
        © 2026 Bullion Ventures LLC
      </div>
    </footer>
  );
}
