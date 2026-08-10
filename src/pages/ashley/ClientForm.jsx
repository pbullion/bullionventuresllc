import { useState } from "react";
import { api } from "./api.js";
import Field from "./Field.jsx";
import Modal from "./Modal.jsx";
import {
  PORTABILITY_LABEL,
  statusLabel,
  TIER_HINT,
  prettify,
} from "./ui.js";

/* Create/edit a client. Only the company name is required — she'll be entering
 * these from memory and from a spreadsheet, and a form that refuses to save
 * without a ZIP code just means the record never gets created. */

const BLANK = {
  company_name: "",
  dba: "",
  industry: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  website: "",
  relationship_since: "",
  tier: "B",
  portability: "unknown",
  status: "not_started",
  loan_balance: "",
  deposit_balance: "",
  annual_fee_income: "",
  credit_facilities: "",
  next_maturity_date: "",
  referral_source: "",
  notes: "",
};

export default function ClientForm({ client, meta, onClose, onSaved }) {
  const editing = Boolean(client);
  const [form, setForm] = useState(() => {
    if (!client) return BLANK;
    // NUMERIC columns come back as strings ("2400000.50") and NULLs as null; the
    // inputs need "" for empty, and the trailing .00 is noise in a text box.
    const out = { ...BLANK };
    for (const k of Object.keys(BLANK)) {
      const v = client[k];
      out[k] = v === null || v === undefined ? "" : String(v);
    }
    for (const k of ["loan_balance", "deposit_balance", "annual_fee_income"]) {
      if (out[k]) out[k] = String(Number(out[k]));
    }
    return out;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const tiers = meta?.tiers || ["A", "B", "C"];
  const portability = meta?.portability || Object.keys(PORTABILITY_LABEL);
  const statuses = meta?.clientStatuses || [];

  async function save(e) {
    e.preventDefault();
    if (busy || !form.company_name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const saved = editing
        ? await api.patch(`/clients/${client.id}`, form)
        : await api.post("/clients", form);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? "Edit client" : "New client"} onClose={onClose}>
      {error && <div className="ash-err">{error}</div>}
      <form onSubmit={save}>
        <div className="ash-card">
          <Field label="Company name" required>
            <input className="ash-input" value={form.company_name} onChange={set("company_name")} autoFocus required />
          </Field>
          <div className="ash-grid2">
            <Field label="DBA / trade name">
              <input className="ash-input" value={form.dba} onChange={set("dba")} />
            </Field>
            <Field label="Industry">
              <input className="ash-input" value={form.industry} onChange={set("industry")} />
            </Field>
          </div>
          <div className="ash-grid2">
            <Field label="Priority tier" hint={TIER_HINT[form.tier]}>
              <select className="ash-select" value={form.tier} onChange={set("tier")}>
                {tiers.map((t) => (
                  <option key={t} value={t}>Tier {t}</option>
                ))}
              </select>
            </Field>
            <Field label="Will they follow you?">
              <select className="ash-select" value={form.portability} onChange={set("portability")}>
                {portability.map((p) => (
                  <option key={p} value={p}>{PORTABILITY_LABEL[p] || prettify(p)}</option>
                ))}
              </select>
            </Field>
          </div>
          {editing && (
            <Field label="Status" hint="Usually set for you when you log a call.">
              <select className="ash-select" value={form.status} onChange={set("status")}>
                {statuses.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div className="ash-card">
          <div className="ash-h2">Banking relationship</div>
          <div className="ash-grid2">
            <Field label="Loan balance">
              <input className="ash-input" inputMode="decimal" placeholder="0" value={form.loan_balance} onChange={set("loan_balance")} />
            </Field>
            <Field label="Deposit balance">
              <input className="ash-input" inputMode="decimal" placeholder="0" value={form.deposit_balance} onChange={set("deposit_balance")} />
            </Field>
          </div>
          <div className="ash-grid2">
            <Field label="Annual fee income">
              <input className="ash-input" inputMode="decimal" placeholder="0" value={form.annual_fee_income} onChange={set("annual_fee_income")} />
            </Field>
            <Field label="Next maturity / renewal">
              <input className="ash-input" type="date" value={form.next_maturity_date} onChange={set("next_maturity_date")} />
            </Field>
          </div>
          <Field label="Credit facilities" hint="Line of credit, term loan, CRE, equipment…">
            <textarea className="ash-textarea" value={form.credit_facilities} onChange={set("credit_facilities")} />
          </Field>
          <div className="ash-grid2">
            <Field label="Relationship since">
              <input className="ash-input" placeholder="2019" value={form.relationship_since} onChange={set("relationship_since")} />
            </Field>
            <Field label="Referral source">
              <input className="ash-input" value={form.referral_source} onChange={set("referral_source")} />
            </Field>
          </div>
        </div>

        <div className="ash-card">
          <div className="ash-h2">Company details</div>
          <Field label="Address">
            <input className="ash-input" value={form.address_line1} onChange={set("address_line1")} placeholder="Street address" />
          </Field>
          <Field label="Suite / floor">
            <input className="ash-input" value={form.address_line2} onChange={set("address_line2")} />
          </Field>
          <div className="ash-grid2">
            <Field label="City">
              <input className="ash-input" value={form.city} onChange={set("city")} />
            </Field>
            <div className="ash-row" style={{ gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: "0 0 84px" }}>
                <Field label="State">
                  <input className="ash-input" value={form.state} onChange={set("state")} />
                </Field>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Field label="ZIP">
                  <input className="ash-input" inputMode="numeric" value={form.postal_code} onChange={set("postal_code")} />
                </Field>
              </div>
            </div>
          </div>
          <Field label="Website">
            <input className="ash-input" inputMode="url" value={form.website} onChange={set("website")} />
          </Field>
          <Field label="Notes" hint="Anything worth remembering before you call.">
            <textarea className="ash-textarea" value={form.notes} onChange={set("notes")} />
          </Field>
        </div>

        <div className="ash-row" style={{ gap: 8 }}>
          <button className="ash-btn" type="submit" disabled={busy || !form.company_name.trim()} style={{ flex: 1 }}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add client"}
          </button>
          <button className="ash-btn ash-btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

