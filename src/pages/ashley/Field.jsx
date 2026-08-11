import { cloneElement, isValidElement, useId } from "react";

/* One labelled form control.
 *
 * The <label> WRAPS the control rather than sitting beside it, which associates
 * the two without threading an id through every call site. That association is
 * what makes tapping the label focus the input — worth having on a phone, where
 * the label is a bigger target than the field.
 *
 * The hint deliberately sits OUTSIDE the label: any text inside a label becomes
 * part of the control's accessible name, so an inline hint turns "Notes" into
 * "Notes Anything worth remembering before you call." It's wired up with
 * aria-describedby instead, which is what a description is for.
 *
 * Because the label/control association is implicit, a Field must contain
 * exactly ONE control — a label wrapping two inputs only labels the first. Use
 * two Fields instead. */
export default function Field({ label, hint, required, children }) {
  const hintId = useId();
  const control =
    hint && isValidElement(children)
      ? cloneElement(children, { "aria-describedby": hintId })
      : children;

  return (
    <div className="ash-field">
      <label className="ash-label-wrap">
        <span className="ash-label">
          {label}
          {required && <span style={{ color: "#a33328" }}> *</span>}
        </span>
        {control}
      </label>
      {hint && (
        <span id={hintId} className="ash-tiny" style={{ display: "block", marginTop: 3 }}>
          {hint}
        </span>
      )}
    </div>
  );
}
