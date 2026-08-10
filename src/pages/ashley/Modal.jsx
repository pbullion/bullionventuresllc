import { useEffect } from "react";

/* Bottom-sheet on a phone, centered dialog on a desktop (see .ash-modal-bg).
 * Body scroll is locked while it's open so the sheet doesn't drag the page
 * underneath it on iOS. */
export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="ash-modal-bg"
      onClick={(e) => {
        // Only a click on the backdrop itself closes — not one that started on
        // a control inside the sheet.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ash-modal">
        <div className="ash-modal-head">
          <div className="ash-modal-title">{title}</div>
          <button className="ash-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
