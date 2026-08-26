import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PrivateToolsModal from './PrivateTools';
import useLongPress from './useLongPress';
import Logo from './Logo';

export default function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [showPrivate, setShowPrivate] = useState(false);
  // Hold the wordmark to open the unlisted-pages modal. The same gesture is on
  // the hero badge in src/pages/Home.jsx; both share src/components/useLongPress.js.
  const press = useLongPress(() => setShowPrivate(true));

  // Swallow the click that follows a completed hold, or the modal opens and the
  // link immediately routes home behind it.
  const handleClick = (e) => {
    if (press.consumeFired()) e.preventDefault();
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
          {...press.handlers}
          onClick={handleClick}
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
