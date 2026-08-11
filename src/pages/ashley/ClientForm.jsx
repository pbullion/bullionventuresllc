import { useRef, useState } from "react";
import { api } from "./api.js";
import Field from "./Field.jsx";
import Modal from "./Modal.jsx";
import {
  DEPOSIT_SUBTYPE_LABEL,
  fmtMoney,
  LOAN_SUBTYPE_LABEL,
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

const BLANK_CONTACT = {
  first_name: "",
  last_name: "",
  title: "",
  phone_mobile: "",
  email: "",
};

const BLANK_ACCOUNT = {
  kind: "loan",
  subtype: "",
  label: "",
  balance: "",
  maturity_date: "",
};

export default function ClientForm({ client, meta, accounts = [], onClose, onSaved }) {
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
  /* Contacts and accounts are only editable here on CREATE — once the client
   * exists they are managed from its detail screen, where each one has its own
   * form and its own history. Entering them here means a new client arrives
   * complete instead of as a shell somebody has to come back and fill in. */
  /* _id is a stable React key for rows that can be removed from the middle —
   * an array index would make the wrong row lose its text. The counter starts at
   * 1 because the first row is seeded with that id below; it is only ever bumped
   * from an event handler, never during render. */
  const uid = useRef(1);
  const withId = (row) => ({ ...row, _id: ++uid.current });
  const stripId = (row) => {
    const out = { ...row };
    delete out._id;
    return out;
  };
  const [rows, setRows] = useState(() => [{ ...BLANK_CONTACT, _id: 1 }]);
  const [accts, setAccts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setRow = (id, k) => (e) =>
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, [k]: e.target.value } : r)));
  const addRow = () => setRows((rs) => [...rs, withId(BLANK_CONTACT)]);
  const dropRow = (id) => setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r._id !== id)));
  const namedRows = rows.filter((r) => r.first_name.trim() || r.last_name.trim());

  const setAcct = (id, k) => (e) =>
    setAccts((as) =>
      as.map((a) =>
        a._id !== id
          ? a
          : // Switching loan↔deposit clears the subtype, which belongs to the old
            // kind and would be rejected by the backend.
            { ...a, [k]: e.target.value, ...(k === "kind" ? { subtype: "" } : {}) }
      )
    );
  const addAcct = (kind) => setAccts((as) => [...as, withId({ ...BLANK_ACCOUNT, kind })]);
  const dropAcct = (id) => setAccts((as) => as.filter((a) => a._id !== id));

  const sumOf = (kind) =>
    accts
      .filter((a) => a.kind === kind)
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  /* Itemised accounts and the two aggregate boxes are the same numbers, so only
   * one of them is ever on screen. On create that's whether any account rows
   * exist; when editing, whether the client already has accounts (the backend
   * recomputes its totals from them, so typing over them here would not stick). */
  const itemised = editing ? accounts.length > 0 : accts.length > 0;

  // Either name will do — she may know the person before she knows the company.
  const canSave = Boolean(form.company_name.trim()) || (!editing && namedRows.length > 0);
  const tiers = meta?.tiers || ["A", "B", "C"];
  const portability = meta?.portability || Object.keys(PORTABILITY_LABEL);
  const statuses = meta?.clientStatuses || [];
  const loanSubtypes = meta?.loanSubtypes || Object.keys(LOAN_SUBTYPE_LABEL);
  const depositSubtypes = meta?.depositSubtypes || Object.keys(DEPOSIT_SUBTYPE_LABEL);

  async function save(e) {
    e.preventDefault();
    if (busy || !canSave) return;
    setBusy(true);
    setError("");
    try {
      let saved;
      if (editing) {
        saved = await api.patch(`/clients/${client.id}`, form);
      } else {
        /* Strip _id — it's a React key, not a column, and the backend's field maps
         * would ignore it anyway. Sending the aggregate totals alongside account
         * rows would be sending the same figure twice, so they're blanked when
         * the itemised path is in use and the backend derives them instead. */
        const payload = { ...form };
        if (itemised) {
          payload.loan_balance = "";
          payload.deposit_balance = "";
          payload.next_maturity_date = "";
        }
        saved = await api.post("/clients", {
          ...payload,
          // First named person becomes the primary contact, in one transaction.
          contacts: namedRows.map(stripId),
          accounts: accts.map(stripId),
        });
      }
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
          <Field
            label="Company name"
            hint={
              editing
                ? undefined
                : "Or just fill in the contact below — either name is enough to save."
            }
          >
            <input
              className="ash-input"
              value={form.company_name}
              onChange={set("company_name")}
              autoFocus
              placeholder={namedRows.length ? "(optional — you have a contact name)" : ""}
            />
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
            <Field label="Would they follow you?">
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

        {!editing && (
          <div className="ash-card">
            <div className="ash-h2">People</div>
            <div className="ash-muted" style={{ marginTop: -4, marginBottom: 10 }}>
              Whoever you actually talk to. The first one is the main contact; add
              as many as you need.
            </div>
            {rows.map((r, i) => (
              <div
                key={r._id}
                style={{
                  paddingTop: i === 0 ? 0 : 12,
                  marginTop: i === 0 ? 0 : 12,
                  borderTop: i === 0 ? "none" : "1px solid #e7ebef",
                }}
              >
                <div className="ash-between" style={{ marginBottom: 6 }}>
                  <div className="ash-tiny" style={{ fontWeight: 700 }}>
                    {i === 0 ? "Main contact" : `Person ${i + 1}`}
                  </div>
                  {rows.length > 1 && (
                    <button
                      className="ash-link"
                      type="button"
                      style={{ fontSize: 12, color: "#8794a1" }}
                      onClick={() => dropRow(r._id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="ash-grid2">
                  <Field label="First name">
                    <input className="ash-input" value={r.first_name} onChange={setRow(r._id, "first_name")} autoComplete="off" />
                  </Field>
                  <Field label="Last name">
                    <input className="ash-input" value={r.last_name} onChange={setRow(r._id, "last_name")} autoComplete="off" />
                  </Field>
                </div>
                <Field label="Title">
                  <input className="ash-input" placeholder="CFO" value={r.title} onChange={setRow(r._id, "title")} />
                </Field>
                <div className="ash-grid2">
                  <Field label="Mobile">
                    <input className="ash-input" type="tel" inputMode="tel" value={r.phone_mobile} onChange={setRow(r._id, "phone_mobile")} />
                  </Field>
                  <Field label="Email">
                    <input className="ash-input" type="email" inputMode="email" value={r.email} onChange={setRow(r._id, "email")} />
                  </Field>
                </div>
              </div>
            ))}
            <button
              className="ash-btn ash-btn-ghost ash-btn-sm"
              type="button"
              onClick={addRow}
              style={{ marginTop: 12 }}
            >
              + Add another person
            </button>
          </div>
        )}

        <div className="ash-card">
          <div className="ash-h2">Banking relationship</div>

          {/* Editing: accounts live on the detail screen, so say so rather than
              showing boxes whose contents would be overwritten on the next save. */}
          {editing && itemised && (
            <div className="ash-muted" style={{ marginTop: -4, marginBottom: 10 }}>
              This client has {accounts.length} account
              {accounts.length === 1 ? "" : "s"} listed. Loan and deposit totals are
              added up from those — edit them under &ldquo;Loans &amp; deposits&rdquo;.
            </div>
          )}

          {!editing && (
            <>
              {accts.map((a) => {
                const isDeposit = a.kind === "deposit";
                const subs = isDeposit ? depositSubtypes : loanSubtypes;
                const labels = isDeposit ? DEPOSIT_SUBTYPE_LABEL : LOAN_SUBTYPE_LABEL;
                return (
                  <div
                    key={a._id}
                    style={{
                      paddingTop: 10,
                      marginBottom: 10,
                      borderTop: "1px solid #e7ebef",
                    }}
                  >
                    <div className="ash-between" style={{ marginBottom: 6 }}>
                      <div className="ash-tiny" style={{ fontWeight: 700 }}>
                        {isDeposit ? "Deposit account" : "Loan"}
                      </div>
                      <button
                        className="ash-link"
                        type="button"
                        style={{ fontSize: 12, color: "#8794a1" }}
                        onClick={() => dropAcct(a._id)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="ash-grid2">
                      <Field label="Loan or deposit">
                        <select className="ash-select" value={a.kind} onChange={setAcct(a._id, "kind")}>
                          <option value="loan">Loan</option>
                          <option value="deposit">Deposit</option>
                        </select>
                      </Field>
                      <Field label={isDeposit ? "Account type" : "Facility type"}>
                        <select className="ash-select" value={a.subtype} onChange={setAcct(a._id, "subtype")}>
                          {subs.map((s) => (
                            <option key={s} value={s}>{labels[s] ?? prettify(s)}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="ash-grid2">
                      <Field label="What she calls it">
                        <input
                          className="ash-input"
                          placeholder={isDeposit ? "Main operating" : "Operating LOC"}
                          value={a.label}
                          onChange={setAcct(a._id, "label")}
                        />
                      </Field>
                      <Field label="Balance">
                        <input
                          className="ash-input"
                          inputMode="decimal"
                          placeholder="0"
                          value={a.balance}
                          onChange={setAcct(a._id, "balance")}
                        />
                      </Field>
                    </div>
                    {!isDeposit && (
                      <Field label="Maturity / renewal">
                        <input
                          className="ash-input"
                          type="date"
                          value={a.maturity_date}
                          onChange={setAcct(a._id, "maturity_date")}
                        />
                      </Field>
                    )}
                  </div>
                );
              })}

              <div className="ash-row" style={{ gap: 8, marginBottom: itemised ? 10 : 0 }}>
                <button className="ash-btn ash-btn-ghost ash-btn-sm" type="button" onClick={() => addAcct("loan")}>
                  + Add loan
                </button>
                <button className="ash-btn ash-btn-ghost ash-btn-sm" type="button" onClick={() => addAcct("deposit")}>
                  + Add deposit
                </button>
              </div>

              {itemised && (
                <div className="ash-tiny" style={{ marginBottom: 10 }}>
                  Totals from the accounts above — loans {fmtMoney(sumOf("loan"))}, deposits{" "}
                  {fmtMoney(sumOf("deposit"))}. Next maturity is taken from the
                  earliest loan.
                </div>
              )}
            </>
          )}

          {/* The quick path: one number each, for a client whose breakdown she
              doesn't have yet. Hidden as soon as accounts are itemised, so the
              same figure is never entered in two places. */}
          {!itemised && (
            <>
              <div className="ash-grid2">
                <Field label="Loan balance">
                  <input className="ash-input" inputMode="decimal" placeholder="0" value={form.loan_balance} onChange={set("loan_balance")} />
                </Field>
                <Field label="Deposit balance">
                  <input className="ash-input" inputMode="decimal" placeholder="0" value={form.deposit_balance} onChange={set("deposit_balance")} />
                </Field>
              </div>
              <Field label="Next maturity / renewal">
                <input className="ash-input" type="date" value={form.next_maturity_date} onChange={set("next_maturity_date")} />
              </Field>
            </>
          )}

          <Field label="Annual fee income">
            <input className="ash-input" inputMode="decimal" placeholder="0" value={form.annual_fee_income} onChange={set("annual_fee_income")} />
          </Field>
          <Field
            label="Credit facilities"
            hint={
              itemised
                ? "Anything the itemised accounts above don't cover."
                : "Line of credit, term loan, CRE, equipment…"
            }
          >
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
          <button className="ash-btn" type="submit" disabled={busy || !canSave} style={{ flex: 1 }}>
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

