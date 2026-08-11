import { useState } from "react";
import { api } from "./api.js";
import Field from "./Field.jsx";
import Modal from "./Modal.jsx";
import {
  DEPOSIT_SUBTYPE_LABEL,
  LOAN_SUBTYPE_LABEL,
  prettify,
  todayYmd,
} from "./ui.js";

/* Add or edit one loan or deposit account.
 *
 * A commercial client is not two numbers — it's a line of credit, a term note
 * and three deposit accounts, each with its own balance and its own maturity.
 * Saving here re-derives the client's loan/deposit totals on the backend, so the
 * list, the dashboard and the CSV export keep reporting the same figures.
 *
 * `moved` is per account on purpose: deposits usually come over first and a term
 * loan often stays until it matures, and the dashboard counts what actually
 * moved rather than crediting the whole relationship at once. */

const BLANK = {
  kind: "loan",
  subtype: "",
  label: "",
  balance: "",
  rate: "",
  maturity_date: "",
  notes: "",
  moved: false,
  moved_date: "",
};

export default function AccountForm({ clientId, account, meta, onClose, onSaved }) {
  const editing = Boolean(account);
  const [form, setForm] = useState(() => {
    if (!account) return BLANK;
    const out = { ...BLANK };
    for (const k of Object.keys(BLANK)) {
      const v = account[k];
      out[k] =
        typeof BLANK[k] === "boolean"
          ? Boolean(v)
          : v === null || v === undefined
            ? ""
            : String(v);
    }
    // NUMERIC comes back as "250000.00" / "5.2500"; the trailing zeros are noise
    // in a text box, the same way ClientForm handles the client's own totals.
    for (const k of ["balance", "rate"]) {
      if (out[k]) out[k] = String(Number(out[k]));
    }
    return out;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* Ticking "moved" stamps today unless a date is already there — she is usually
   * recording it the day it happens, and an unstamped moved account would drop
   * out of any date-based reporting later. */
  const setMoved = (e) => {
    const moved = e.target.checked;
    setForm((f) => ({
      ...f,
      moved,
      moved_date: moved ? f.moved_date || todayYmd() : f.moved_date,
    }));
  };

  /* Switching loan↔deposit clears the subtype: the backend rejects a deposit
   * subtype on a loan, so silently keeping "checking" on a term loan would turn
   * into a 400 on save with nothing on screen explaining why. */
  const setKind = (e) => {
    const kind = e.target.value;
    setForm((f) => ({ ...f, kind, subtype: "" }));
  };

  const isDeposit = form.kind === "deposit";
  const kinds = meta?.accountKinds || ["loan", "deposit"];
  const subtypes =
    (isDeposit ? meta?.depositSubtypes : meta?.loanSubtypes) ||
    Object.keys(isDeposit ? DEPOSIT_SUBTYPE_LABEL : LOAN_SUBTYPE_LABEL);
  const subtypeLabels = isDeposit ? DEPOSIT_SUBTYPE_LABEL : LOAN_SUBTYPE_LABEL;

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = editing
        ? await api.patch(`/accounts/${account.id}`, form)
        : await api.post(`/clients/${clientId}/accounts`, form);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit account" : isDeposit ? "New deposit account" : "New loan"}
      onClose={onClose}
    >
      {error && <div className="ash-err">{error}</div>}
      <form onSubmit={save}>
        <div className="ash-card">
          <div className="ash-grid2">
            <Field label="Loan or deposit">
              <select className="ash-select" value={form.kind} onChange={setKind}>
                {kinds.map((k) => (
                  <option key={k} value={k}>{prettify(k)}</option>
                ))}
              </select>
            </Field>
            <Field label={isDeposit ? "Account type" : "Facility type"}>
              <select className="ash-select" value={form.subtype} onChange={set("subtype")}>
                {subtypes.map((s) => (
                  <option key={s} value={s}>{subtypeLabels[s] ?? prettify(s)}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label="What she calls it"
            hint={isDeposit ? "Main operating, payroll, reserve…" : "Operating LOC, equipment note…"}
          >
            <input
              className="ash-input"
              value={form.label}
              onChange={set("label")}
              autoFocus
            />
          </Field>
          <div className="ash-grid2">
            <Field label="Balance">
              <input
                className="ash-input"
                inputMode="decimal"
                placeholder="0"
                value={form.balance}
                onChange={set("balance")}
              />
            </Field>
            <Field label="Rate" hint="Percent, e.g. 7.25">
              <input
                className="ash-input"
                inputMode="decimal"
                placeholder="—"
                value={form.rate}
                onChange={set("rate")}
              />
            </Field>
          </div>
          {!isDeposit && (
            <Field
              label="Maturity / renewal"
              hint="The client's next maturity is the earliest of these."
            >
              <input
                className="ash-input"
                type="date"
                value={form.maturity_date}
                onChange={set("maturity_date")}
              />
            </Field>
          )}
        </div>

        <div className="ash-card">
          <label className="ash-row" style={{ gap: 9, fontSize: 14, padding: "6px 0" }}>
            <input
              type="checkbox"
              checked={form.moved}
              onChange={setMoved}
              style={{ width: 18, height: 18 }}
            />
            This one has moved over
          </label>
          {form.moved && (
            <Field label="Moved on">
              <input
                className="ash-input"
                type="date"
                value={form.moved_date}
                onChange={set("moved_date")}
              />
            </Field>
          )}
          <Field label="Notes">
            <textarea
              className="ash-textarea"
              placeholder="Covenants, renewal history, who signs…"
              value={form.notes}
              onChange={set("notes")}
            />
          </Field>
        </div>

        <div className="ash-row" style={{ gap: 8 }}>
          <button className="ash-btn" type="submit" disabled={busy} style={{ flex: 1 }}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add it"}
          </button>
          <button className="ash-btn ash-btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
