import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PrivateToolsModal from './PrivateTools';

/* Hold the wordmark this long to open the private-tools modal. Long enough not
 * to fire on a normal tap, short enough not to feel broken. */
const LONG_PRESS_MS = 550;

export default function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [showPrivate, setShowPrivate] = useState(false);
  const timer = useRef(null);
  // Set when a hold completes, so the click that follows the release doesn't
  // also navigate home — without this, every long press would open the modal
  // and then immediately route away behind it.
  const fired = useRef(false);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => clear, []);

  const startPress = () => {
    fired.current = false;
    clear();
    timer.current = setTimeout(() => {
      timer.current = null;
      fired.current = true;
      setShowPrivate(true);
    }, LONG_PRESS_MS);
  };

  const handleClick = (e) => {
    if (fired.current) {
      e.preventDefault();
      fired.current = false;
    }
  };

  return (
    /* Palette tracks src/pages/Home.jsx: near-black shell with a neutral
       border. The old #0f0f12 on #2a2a45 was a shade lighter than the page and
       bluish, which left a visible seam across the top of the home page. */
    <nav style={{
      backgroundColor: 'rgba(10, 10, 13, 0.85)',
      backdropFilter: 'saturate(140%) blur(10px)',
      WebkitBackdropFilter: 'saturate(140%) blur(10px)',
      borderBottom: '1px solid #24242e',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link
          to="/"
          onPointerDown={startPress}
          onPointerUp={clear}
          onPointerLeave={clear}
          onPointerCancel={clear}
          onClick={handleClick}
          // Long-pressing a link on iOS otherwise selects the text and raises
          // the share/copy callout, which would sit on top of the modal.
          onContextMenu={(e) => e.preventDefault()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontSize: 16.5,
            fontWeight: 700,
            color: '#f4f4f7',
            letterSpacing: '-0.01em',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            touchAction: 'manipulation',
          }}
        >
          {/* Small gold bar as a mark — the name is "Bullion", and the wordmark
              alone was indistinguishable from body text. */}
          <span
            aria-hidden="true"
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: 'linear-gradient(140deg, #f6d585, #e0b24c 60%, #b8862f)',
              boxShadow: '0 0 12px rgba(224, 178, 76, .35)',
              flexShrink: 0,
            }}
          />
          Bullion Ventures LLC
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {!isHome && (
            <Link to="/" style={{
              fontSize: 14,
              color: '#b6b6c6',
              fontWeight: 500,
            }}>
              Home
            </Link>
          )}
        </div>
      </div>

      <PrivateToolsModal
        open={showPrivate}
        onClose={() => setShowPrivate(false)}
      />
    </nav>
  );
}
