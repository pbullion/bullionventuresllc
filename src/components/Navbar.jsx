import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <nav style={{
      backgroundColor: '#0f0f12',
      borderBottom: '1px solid #2a2a45',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link to="/" style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#f0f0f5',
          letterSpacing: '-0.3px',
        }}>
          Bullion Ventures LLC
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {!isHome && (
            <Link to="/" style={{
              fontSize: 14,
              color: '#a0a0b8',
              fontWeight: 500,
            }}>
              Home
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
