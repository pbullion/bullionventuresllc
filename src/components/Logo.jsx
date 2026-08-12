/* The Bullion Ventures mark — a cast ingot, drawn as one path with an evenodd
 * counter. Inline rather than an <img src="/favicon.svg"> so it inherits no
 * network request and can't flash in late on the sticky navbar.
 *
 * Kept in sync with public/favicon.svg by hand: same geometry, same gradient.
 * If you change one, change the other.
 *
 * The gradient id is fixed rather than generated. Two copies on one page both
 * point at the first definition, which is identical, so there is nothing to
 * collide over. */
export default function Logo({ size = 20, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, display: 'block', ...style }}
    >
      <defs>
        <linearGradient id="bvGold" x1="0" y1="0" x2=".72" y2="1">
          <stop offset="0" stopColor="#f6d585" />
          <stop offset=".55" stopColor="#e0b24c" />
          <stop offset="1" stopColor="#b8862f" />
        </linearGradient>
      </defs>
      <path
        fill="url(#bvGold)"
        fillRule="evenodd"
        d="M2 54 L62 54 L51 12 L13 12 Z M13.9 45 L50.1 45 L43.9 21 L20.1 21 Z"
      />
    </svg>
  );
}
