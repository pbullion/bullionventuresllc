import { useState } from "react";
import { api } from "./api.js";
import Field from "./Field.jsx";
import Modal from "./Modal.jsx";
import { PREFERRED_LABEL, prettify } from "./ui.js";

/* Add or edit one person at a client. Three phone slots because a commercial
 * client's real reachable number is rarely the one on file — mobile is what
 * actually gets answered. */

const BLANK = {
  first_name: "",
  last_name: "",
  title: "",
  role: "",
  email: "",
  email_alt: "",
  phone_mobile: "",
  phone_office: "",
  phone_alt: "",
  preferred_channel: "",
  linkedin: "",
  birthday: "",
  notes: "",
  is_primary: false,
  do_not_contact: false,
};

export default function ContactForm({ clientId, contact, meta, onClose, onSaved }) {
  const editing = Boolean(contact);
  const [form, setForm] = useState(() => {
    if (!contact) return BLANK;
    const out = { ...BLANK };
    for (const k of Object.keys(BLANK)) {
      const v = contact[k];
      out[k] =
        typeof BLANK[k] === "boolean" ? Boolean(v) : v === null || v === undefined ? "" : String(v);
    }
    return out;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const check = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));
  const named = form.first_name.trim() || form.last_name.trim();
  const channels = meta?.preferredChannels || Object.keys(PREFERRED_LABEL);

  async function save(e) {
    e.preventDefault();
    if (busy || !named) return;
    setBusy(true);
    setError("");
    try {
      const saved = editing
        ? await api.patch(`/contacts/${contact.id}`, form)
        : await api.post(`/clients/${clientId}/contacts`, form);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? "Edit contact" : "New contact"} onClose={onClose}>
      {error && <div className="ash-err">{error}</div>}
      <form onSubmit={save}>
        <div className="ash-card">
          <div className="ash-grid2">
            <Field label="First name">
              <input className="ash-input" value={form.first_name} onChange={set("first_name")} autoFocus autoComplete="off" />
            </Field>
            <Field label="Last name">
              <input className="ash-input" value={form.last_name} onChange={set("last_name")} autoComplete="off" />
            </Field>
          </div>
          <div className="ash-grid2">
            <Field label="Title">
              <input className="ash-input" placeholder="CFO" value={form.title} onChange={set("title")} />
            </Field>
            <Field label="Role in the relationship">
              <input className="ash-input" placeholder="Decision maker" value={form.role} onChange={set("role")} />
            </Field>
          </div>
        </div>

        <div className="ash-card">
          <div className="ash-h2">How to reach them</div>
          <Field label="Mobile">
            <input className="ash-input" type="tel" inputMode="tel" value={form.phone_mobile} onChange={set("phone_mobile")} />
          </Field>
          <div className="ash-grid2">
            <Field label="Office">
              <input className="ash-input" type="tel" inputMode="tel" value={form.phone_office} onChange={set("phone_office")} />
            </Field>
            <Field label="Other phone">
              <input className="ash-input" type="tel" inputMode="tel" value={form.phone_alt} onChange={set("phone_alt")} />
            </Field>
          </div>
          <Field label="Email">
            <input className="ash-input" type="email" inputMode="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field
            label="Personal / alternate email"
            hint="Worth having — a work address stops being reliable if your contact changes jobs too."
          >
            <input className="ash-input" type="email" inputMode="email" value={form.email_alt} onChange={set("email_alt")} />
          </Field>
          <div className="ash-grid2">
            <Field label="Prefers">
              <select className="ash-select" value={form.preferred_channel} onChange={set("preferred_channel")}>
                {channels.map((c) => (
                  <option key={c} value={c}>{PREFERRED_LABEL[c] ?? prettify(c)}</option>
                ))}
              </select>
            </Field>
            <Field label="Birthday">
              <input className="ash-input" placeholder="Mar 14" value={form.birthday} onChange={set("birthday")} />
            </Field>
          </div>
          <Field label="LinkedIn">
            <input className="ash-input" inputMode="url" value={form.linkedin} onChange={set("linkedin")} />
          </Field>
        </div>

        <div className="ash-card">
          <Field label="Notes about this person">
            <textarea
              className="ash-textarea"
              placeholder="Kids' names, alma mater, hates being called before 9…"
              value={form.notes}
              onChange={set("notes")}
            />
          </Field>
          <label className="ash-row" style={{ gap: 9, fontSize: 14, padding: "6px 0" }}>
            <input type="checkbox" checked={form.is_primary} onChange={check("is_primary")} style={{ width: 18, height: 18 }} />
            Main contact for this client
          </label>
          <label className="ash-row" style={{ gap: 9, fontSize: 14, padding: "6px 0" }}>
            <input type="checkbox" checked={form.do_not_contact} onChange={check("do_not_contact")} style={{ width: 18, height: 18 }} />
            Do not contact
          </label>
        </div>

        <div className="ash-row" style={{ gap: 8 }}>
          <button className="ash-btn" type="submit" disabled={busy || !named} style={{ flex: 1 }}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add contact"}
          </button>
          <button className="ash-btn ash-btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
