import { useEffect, useRef, useState } from "react";
import { CARD_COLORS } from "./ui.js";

/* New project / edit project. The only modal on the page.
 *
 * A project is created rarely and carries three fields; a task is created
 * constantly and carries one. That asymmetry is why tasks get an always-visible
 * input on the card and projects get this. */
export default function ProjectModal({ project, onSave, onClose }) {
  const [name, setName] = useState(project?.name || "");
  const [subtitle, setSubtitle] = useState(project?.subtitle || "");
  // "" means "derive a color from the name" — see colorFor() in ui.js. Picking a
  // swatch is what opts out of that.
  const [color, setColor] = useState(project?.color || "");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    // onSave owns the error toast; re-enabling on failure lets the form be
    // retried without losing what was typed.
    const ok = await onSave({ name: trimmed, subtitle: subtitle.trim(), color });
    if (!ok) setSaving(false);
  };

  return (
    <div className="pb-modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="pb-modal" onSubmit={submit}>
        <h2>{project ? "Edit project" : "New project"}</h2>

        <div className="pb-field">
          <label htmlFor="pb-name">Name</label>
          <input
            id="pb-name"
            ref={nameRef}
            className="pb-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="cellr"
            maxLength={120}
          />
        </div>

        <div className="pb-field">
          <label htmlFor="pb-sub">Note (optional)</label>
          <input
            id="pb-sub"
            className="pb-input"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Expo app · TestFlight"
            maxLength={160}
          />
        </div>

        <div className="pb-field">
          <label>Color</label>
          <div className="pb-swatches" style={{ padding: "2px 0" }}>
            {CARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`pb-swatch${color === c ? " pb-swatch-on" : ""}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
                onClick={() => setColor(color === c ? "" : c)}
              />
            ))}
          </div>
        </div>

        <div className="pb-modal-acts">
          <button type="button" className="pb-btn-plain" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="pb-btn" disabled={!name.trim() || saving}>
            {saving ? "Saving…" : project ? "Save" : "Add project"}
          </button>
        </div>
      </form>
    </div>
  );
}
