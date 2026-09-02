import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import { PRIVATE_GROUPS } from "../lib/privatePages.js";

/* The press-and-hold modal listing every unlisted page — the list itself is
 * src/lib/privatePages.js, shared with the /jump page that renders the same
 * groups full-screen. Add a page there, not here.
 *
 * Reminder, because it is easy to read this modal as a gate: it is obscurity
 * only. Every path in the list is a public, unauthenticated route; /ashley is
 * the sole exception and it is routes/ashley.js that protects it, not this. */

const MODAL_CSS = `
@keyframes bv-modal-in {
  from { opacity: 0; transform: translateY(8px) scale(.98); }
  to   { opacity: 1; transform: none; }
}
.bv-modal-card { animation: bv-modal-in .16s ease-out; }
.bv-modal-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 11px;
  border: 1px solid transparent;
  color: inherit;
  text-decoration: none;
  transition: background-color .15s ease, border-color .15s ease;
}
.bv-modal-row:hover {
  background: #1b1b23;
  border-color: rgba(224, 178, 76, .4);
}
.bv-modal-row:focus-visible {
  outline: 2px solid #e0b24c;
  outline-offset: 1px;
}
.bv-modal-close:hover { color: #f4f4f7 !important; }
`;

export default function PrivateToolsModal({ open, onClose }) {
  /* Escape to close, and the page behind must not scroll while it's up. Both are
   * cleaned up on close as well as unmount — an early return before this hook
   * would break hook order, so the effect guards on `open` internally instead. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  /* Portalled to <body> on purpose. The trigger lives in <nav>, which carries a
   * backdrop-filter — and backdrop-filter makes an element a containing block
   * for position:fixed descendants. Rendered in place, the backdrop's inset:0
   * resolved to the 60px navbar instead of the viewport, so the card centred on
   * the header and got clipped. */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unlisted pages"
      onClick={onClose}
      style={S.backdrop}
    >
      <style>{MODAL_CSS}</style>
      {/* Clicks inside the card must not reach the backdrop's close handler. */}
      <div
        className="bv-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={S.card}
      >
        <div style={S.head}>
          <div>
            <div style={S.eyebrow}>Private</div>
            <h2 style={S.title}>Jump to</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="bv-modal-close"
            style={S.close}
          >
            ✕
          </button>
        </div>
        <p style={S.note}>Unlisted — none of these are on the home page.</p>
        {PRIVATE_GROUPS.map((group) => (
          <div key={group.label} style={S.group}>
            <div style={S.groupLabel}>{group.label}</div>
            <div style={S.list}>
              {group.items.map((t) => (
                <Link
                  key={t.path}
                  to={t.path}
                  onClick={onClose}
                  className="bv-modal-row"
                >
                  <span style={S.tile}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>
                      {t.emoji}
                    </span>
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={S.name}>{t.name}</span>
                    <span style={S.tagline}>{t.tagline}</span>
                  </span>
                  <span style={S.arrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

const S = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    // Opaque scrim rather than a blur, for the same iOS compositing reason the
    // navbar dropped its backdrop-filter. A darker alpha reads the same here.
    background: "rgba(4, 4, 6, .88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85vh",
    overflowY: "auto",
    background: "#101015",
    border: "1px solid #24242e",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 30px 80px -20px rgba(0,0,0,.85)",
  },
  head: { display: "flex", alignItems: "flex-start", gap: 12 },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#e0b24c",
    marginBottom: 4,
  },
  title: {
    margin: 0,
    fontSize: 19,
    fontWeight: 800,
    color: "#f4f4f7",
    letterSpacing: "-0.01em",
  },
  close: {
    marginLeft: "auto",
    background: "transparent",
    border: "none",
    color: "#83839a",
    fontSize: 15,
    cursor: "pointer",
    padding: 4,
    lineHeight: 1,
  },
  note: { margin: "8px 0 14px", fontSize: 12.5, color: "#83839a" },
  // The group heading sits inset by 12px so it lines up with the row text
  // above/below it rather than with the card edge.
  group: { marginBottom: 12 },
  groupLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.13em",
    textTransform: "uppercase",
    color: "#5f5f74",
    padding: "0 12px 6px",
  },
  list: { display: "flex", flexDirection: "column", gap: 2 },
  tile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "#17171e",
    border: "1px solid #24242e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  name: {
    display: "block",
    fontSize: 14.5,
    fontWeight: 700,
    color: "#f4f4f7",
  },
  tagline: {
    display: "block",
    fontSize: 12,
    color: "#83839a",
    marginTop: 1,
  },
  arrow: {
    marginLeft: "auto",
    color: "#83839a",
    fontSize: 14,
    fontWeight: 700,
  },
};
