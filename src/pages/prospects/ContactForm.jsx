import { useState } from "react";
import { api } from "./api.js";
import { Field } from "./Sheet.jsx";
import { ROLE_LABEL } from "./ui.js";

/* Add or edit a person at a company.
 *
 * The seeded catalog ships some officer names from public filings, flagged
 * unverified — this form is where one of those becomes a real contact with a
 * direct line, and where the "verify" badge gets cleared once she has confirmed
 * it. Saving an edit to a seeded name clears the flag automatically, because
 * having opened the record and typed something IS the confirmation. */
export default function ContactForm({ companyId, contact, meta, onCancel, onSaved, onDeleted }) {
  const editing = Boolean(contact?.id);
  const [form, setForm] = useState(() => ({
    first_name: contact?.first_name || "",
    last_name: contact?.last_name || "",
    title: contact?.title || "",
    role: contact?.role || "",
    email: contact?.email || "",
    phone_office: contact?.phone_office || "",
    phone_mobile: contact?.phone_mobile || "",
    linkedin: contact?.linkedin || "",
    notes: contact?.notes || "",
    is_primary: contact?.is_primary || false,
    do_not_contact: contact?.do_not_contact || false,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const check = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.first_name.trim() && !form.last_name.trim()) {
      setError("Give them a name — even just a first name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // Editing a seeded name is the confirmation, so the badge comes off.
      const body = editing && contact.unverified ? { ...form, unverified: false } : form;
      if (editing) await api.patch(`/contacts/${contact.id}`, body);
      else await api.post(`/companies/${companyId}/contacts`, body);
      onSaved?.();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="pros-err">{error}</div>}

      {editing && contact.unverified && (
        <div className="pros-warn">
          This name came out of a public filing when the list was built. Saving any change here marks
          it confirmed and drops the “verify” badge.
        </div>
      )}

      <div className="pros-card">
        <div className="pros-grid2">
          <Field label="First name">
            <input
              className="pros-input"
              value={form.first_name}
              onChange={set("first_name")}
              autoComplete="off"
              autoFocus={!editing}
            />
          </Field>
          <Field label="Last name">
            <input
              className="pros-input"
              value={form.last_name}
              onChange={set("last_name")}
              autoComplete="off"
            />
          </Field>
        </div>
        <div className="pros-grid2">
          <Field label="Title">
            <input
              className="pros-input"
              value={form.title}
              onChange={set("title")}
              placeholder="Chief Financial Officer"
            />
          </Field>
          <Field label="Role" hint="What they are to you — drives nothing but the label.">
            <select className="pros-select" value={form.role} onChange={set("role")}>
              {(meta?.contactRoles || Object.keys(ROLE_LABEL)).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r] ?? r}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="pros-card">
        <div className="pros-h2">How to reach them</div>
        <Field label="Email">
          <input
            className="pros-input"
            value={form.email}
            onChange={set("email")}
            inputMode="email"
            autoCapitalize="off"
            autoComplete="off"
          />
        </Field>
        <div className="pros-grid2">
          <Field label="Office phone">
            <input
              className="pros-input"
              value={form.phone_office}
              onChange={set("phone_office")}
              inputMode="tel"
            />
          </Field>
          <Field label="Mobile" hint="Gets a text button as well as a call button.">
            <input
              className="pros-input"
              value={form.phone_mobile}
              onChange={set("phone_mobile")}
              inputMode="tel"
            />
          </Field>
        </div>
        <Field label="LinkedIn profile">
          <input
            className="pros-input"
            value={form.linkedin}
            onChange={set("linkedin")}
            autoCapitalize="off"
          />
        </Field>
        <Field label="Notes">
          <textarea className="pros-textarea" value={form.notes} onChange={set("notes")} />
        </Field>
        <div className="pros-row" style={{ gap: 18 }}>
          <label className="pros-row" style={{ gap: 8, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={form.is_primary} onChange={check("is_primary")} />
            Main contact
          </label>
          <label className="pros-row" style={{ gap: 8, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={form.do_not_contact} onChange={check("do_not_contact")} />
            Do not contact
          </label>
        </div>
      </div>

      <div className="pros-row">
        <button className="pros-btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Add them"}
        </button>
        <button className="pros-btn pros-btn-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
        {editing && (
          <button
            className="pros-btn pros-btn-danger pros-btn-sm"
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm("Remove this contact? Anything logged against them stays.")) return;
              setBusy(true);
              try {
                await api.del(`/contacts/${contact.id}`);
                onDeleted?.();
              } catch (err) {
                setError(err.message);
                setBusy(false);
              }
            }}
          >
            Remove
          </button>
        )}
      </div>
    </form>
  );
}
