import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PrivateToolsModal from './PrivateTools';
import Logo from './Logo';

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
    /* Solid, NOT translucent + backdrop-filter. A blurred sticky bar is a known
       iOS WebKit compositing hazard that can blank the whole page — and this bar
       renders on every route outside App.jsx's hideChrome list, which matches a
       white screen on the home page and every app landing page while the
       chrome-less betting screens kept working. It was also what made the
       private-tools modal a containing-block child and clip to the header.
       The blur was decoration on a near-black bar; the solid fill looks the
       same. Suspected cause of the 2026-08 iOS regression — do not reintroduce
       backdrop-filter here. */
    <nav style={{
      backgroundColor: '#0a0a0d',
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
          {/* The ingot mark — the name is "Bullion", and the wordmark alone was
              indistinguishable from body text. 20px, not 16: the mark is wider
              than it is tall, so it needs the extra width to carry the same
              optical weight the old square chip had. */}
          <Logo size={20} />
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
