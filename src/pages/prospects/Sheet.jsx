import { useEffect, useRef } from "react";

/* Bottom sheet. Everything modal on /prospects uses it — filters, forms, the
 * importer — because a centered dialog on a phone puts its controls out of
 * thumb reach and its close button above the fold once the content scrolls.
 *
 * Anchored to the bottom under 700px and centered above it, so the same
 * component is a normal dialog on a laptop. */
export default function Sheet({ title, onClose, children, footer }) {
  const panelRef = useRef(null);

  // Escape closes, and the body stops scrolling behind the sheet — without that,
  // a flick on iOS scrolls the list underneath instead of the sheet's content.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="pros-scrim"
      /* Only a click that STARTED on the scrim closes it. Without the target
         check, dragging a text selection inside the sheet and releasing over the
         scrim threw away whatever she had just typed. */
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pros-sheet" ref={panelRef} role="dialog" aria-modal="true" aria-label={title}>
        <div className="pros-sheet-head">
          <div className="pros-sheet-title">{title}</div>
          <button className="pros-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

/* A labelled control. The <label> WRAPS its input so tapping the label focuses
 * it — which on a phone roughly doubles the size of every target in a form. */
export function Field({ label, hint, children }) {
  return (
    <div className="pros-field">
      <label className="pros-label-wrap">
        <span className="pros-label">{label}</span>
        {children}
      </label>
      {hint && (
        <div className="pros-tiny" style={{ marginTop: 5, lineHeight: 1.45 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

// A wrap of toggles instead of <select multiple>, which is unusable on a phone.
export function MultiToggle({ options, selected, onChange }) {
  const set = new Set(selected);
  return (
    <div className="pros-toggles">
      {options.map((o) => {
        const value = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        const on = set.has(value);
        return (
          <button
            key={value}
            type="button"
            className="pros-toggle"
            aria-pressed={on}
            onClick={() => {
              const next = new Set(set);
              if (on) next.delete(value);
              else next.add(value);
              onChange([...next]);
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
