import { useEffect, useState } from "react";
import { api } from "./api.js";
import Field from "./Field.jsx";
import Importer from "./Importer.jsx";

/* Settings, the CSV tools, and the password change.
 *
 * The departure date matters more than it looks: every "contacted" number in the
 * app means "contacted on or after this date". Without it, a call logged years
 * ago at the old bank counts as having reached out about the move. */
export default function Settings({ me, bump }) {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/settings")
      .then((s) => {
        const clean = {};
        for (const k of [
          "departure_date", "previous_bank", "new_bank", "new_title",
          "new_email", "new_phone", "new_office", "nmls_id",
        ]) {
          clean[k] = s[k] === null || s[k] === undefined ? "" : String(s[k]);
        }
        setForm(clean);
      })
      .catch((e) => setError(e.message));
  }, []);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.put("/settings", form);
      setSaved(true);
      bump();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !form) return <div className="ash-err">{error}</div>;
  if (!form) return <div className="ash-muted" style={{ padding: "24px 2px" }}>Loading…</div>;

  return (
    <>
      {error && <div className="ash-err">{error}</div>}
      {saved && <div className="ash-ok">Saved.</div>}

      <form onSubmit={save}>
        <div className="ash-card">
          <div className="ash-h2">Your move</div>
          <Field
            label="Last day at your previous bank"
            hint="Everything on the dashboard counts outreach from this date forward."
          >
            <input className="ash-input" type="date" value={form.departure_date} onChange={set("departure_date")} />
          </Field>
          <div className="ash-grid2">
            <Field label="Previous bank">
              <input className="ash-input" value={form.previous_bank} onChange={set("previous_bank")} />
            </Field>
            <Field label="New bank">
              <input className="ash-input" value={form.new_bank} onChange={set("new_bank")} />
            </Field>
          </div>
        </div>

        <div className="ash-card">
          <div className="ash-h2">Your new details</div>
          <div className="ash-muted" style={{ marginTop: -4, marginBottom: 10 }}>
            Kept here so it&rsquo;s in one place when you&rsquo;re sending it to
            twenty people.
          </div>
          <Field label="Title">
            <input className="ash-input" value={form.new_title} onChange={set("new_title")} />
          </Field>
          <Field label="Work email">
            <input className="ash-input" type="email" inputMode="email" value={form.new_email} onChange={set("new_email")} />
            </Field>
          <div className="ash-grid2">
            <Field label="Mobile">
              <input className="ash-input" type="tel" inputMode="tel" value={form.new_phone} onChange={set("new_phone")} />
            </Field>
            <Field label="Office">
              <input className="ash-input" type="tel" inputMode="tel" value={form.new_office} onChange={set("new_office")} />
            </Field>
          </div>
          <Field label="NMLS ID">
            <input className="ash-input" value={form.nmls_id} onChange={set("nmls_id")} />
            </Field>
        </div>

        <button className="ash-btn ash-btn-block" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>

      <div style={{ height: 18 }} />
      <Importer onImported={bump} />
      <Exporter />
      <PasswordChange />

      <div className="ash-card">
        <div className="ash-h2">Account</div>
        <div className="ash-muted">
          Signed in as {me?.email || "—"}
          {me?.full_name ? ` (${me.full_name})` : ""}.
        </div>
      </div>
    </>
  );
}

function Exporter() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function download(type) {
    setBusy(type);
    setError("");
    try {
      await api.downloadCsv(type);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="ash-card">
      <div className="ash-h2">Export a backup</div>
      <div className="ash-muted" style={{ marginTop: -4, marginBottom: 11 }}>
        Downloads a spreadsheet you can open in Excel. Worth doing every so
        often — this is your book.
      </div>
      {error && <div className="ash-err">{error}</div>}
      <div className="ash-row" style={{ gap: 8 }}>
        <button className="ash-btn ash-btn-ghost ash-btn-sm" disabled={Boolean(busy)} onClick={() => download("clients")}>
          {busy === "clients" ? "…" : "Clients"}
        </button>
        <button className="ash-btn ash-btn-ghost ash-btn-sm" disabled={Boolean(busy)} onClick={() => download("contacts")}>
          {busy === "contacts" ? "…" : "Contacts"}
        </button>
        <button className="ash-btn ash-btn-ghost ash-btn-sm" disabled={Boolean(busy)} onClick={() => download("outreach")}>
          {busy === "outreach" ? "…" : "Call history"}
        </button>
      </div>
    </div>
  );
}

function PasswordChange() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/change-password", form);
      setDone(true);
      setOpen(false);
      setForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ash-card">
      <div className="ash-h2">Password</div>
      {done && <div className="ash-ok">Password changed.</div>}
      {!open ? (
        <button className="ash-btn ash-btn-ghost ash-btn-sm" onClick={() => setOpen(true)}>
          Change password
        </button>
      ) : (
        <form onSubmit={submit}>
          {error && <div className="ash-err">{error}</div>}
          <Field label="Current password">
            <input className="ash-input" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set("currentPassword")} required />
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            <input className="ash-input" type="password" autoComplete="new-password" value={form.newPassword} onChange={set("newPassword")} required />
            </Field>
          <div className="ash-row" style={{ gap: 8 }}>
            <button className="ash-btn ash-btn-sm" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Update password"}
            </button>
            <button className="ash-btn ash-btn-ghost ash-btn-sm" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
