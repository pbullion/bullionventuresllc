/* The shell every card on the board shares.
 *
 * It exists mainly to get the tap behaviour right in one place. A card is a
 * button AND a container of links, which is normally an accessibility mess; the
 * rule here is simple and consistent everywhere: a tap that lands on a link or
 * a control does that thing, and a tap on anything else opens the section full
 * screen. That is why the handler tests `closest("a, button")` rather than
 * comparing against the card element — the tap almost always lands on a
 * descendant of the link, not the link itself.
 *
 * It is a <section> with a role rather than a <button> because a button cannot
 * legally contain the anchors these cards are full of. */

function ExpandGlyph() {
  return (
    <svg className="dcard__grow" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14 4h6v6M20 4l-7.5 7.5M10 20H4v-6M4 20l7.5-7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Card({ title, note, actions, onExpand, children }) {
  const open = (e) => {
    if (e.target.closest?.("a, button")) return;
    onExpand?.();
  };

  return (
    <section
      className={`dcard${onExpand ? " is-tappable" : ""}`}
      onClick={onExpand ? open : undefined}
      role={onExpand ? "button" : undefined}
      tabIndex={onExpand ? 0 : undefined}
      onKeyDown={
        onExpand ?
          (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onExpand();
            }
          }
        : undefined
      }
    >
      <div className="dcard__head">
        <span className="dcard__title">{title}</span>
        <span className="dcard__spacer" />
        {note && <span className="dcard__note">{note}</span>}
        {actions}
        {onExpand && <ExpandGlyph />}
      </div>
      <div className="dcard__body">{children}</div>
    </section>
  );
}

export default Card;
