import { useState } from "react";
import { api } from "./api.js";
import { Field } from "./Sheet.jsx";
import { OWNERSHIP_LABEL, statusLabel } from "./ui.js";

/* Add or edit a company. Used both for "she found one the catalog missed" and
 * "the seeded record is thin — here's the real address and the main line".
 *
 * Only the name is required. A prospect she just heard about on a job site is
 * worth capturing with nothing but a name, and demanding a website or a revenue
 * figure at that moment is how a list stops getting used. */
export default function CompanyForm({ company, meta, onCancel, onSaved }) {
  const editing = Boolean(company?.id);
  const [form, setForm] = useState(() => ({
    name: company?.name || "",
    dba: company?.dba || "",
    industry: company?.industry || "",
    sector: company?.sector || "",
    description: company?.description || "",
    address_line1: company?.address_line1 || "",
    address_line2: company?.address_line2 || "",
    city: company?.city || "",
    state: company?.state || "TX",
    postal_code: company?.postal_code || "",
    website: company?.website || "",
    phone: company?.phone || "",
    email: company?.email || "",
    linkedin: company?.linkedin || "",
    ownership: company?.ownership || "unknown",
    ticker: company?.ticker || "",
    parent_company: company?.parent_company || "",
    /* Shown in millions, stored in dollars. A banker says "sixty million", not
       "60000000", and the round trip below is the only place that conversion
       lives on this screen. */
    revenue_low_m: toM(company?.revenue_low),
    revenue_high_m: toM(company?.revenue_high),
    revenue_basis: company?.revenue_basis || "unknown",
    employees: company?.employees ?? "",
    founded: company?.founded ?? "",
    status: company?.status || "new",
    priority: company?.priority || "B",
    referred_by: company?.referred_by || "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim()) {
      setError("A company name is the one thing this needs.");
      return;
    }
    setBusy(true);
    setError("");

    const { revenue_low_m, revenue_high_m, ...rest } = form;
    const body = {
      ...rest,
      revenue_low: fromM(revenue_low_m),
      revenue_high: fromM(revenue_high_m),
    };
    /* An unedited "unknown" basis with real numbers in it would claim less than
       she knows — if she typed a figure and left the basis alone, call it an
       estimate rather than unverified. */
    if (body.revenue_basis === "unknown" && (body.revenue_low || body.revenue_high)) {
      body.revenue_basis = "estimate";
    }

    try {
      const res = editing
        ? await api.patch(`/companies/${company.id}`, body)
        : await api.post("/companies", body);
      onSaved?.(res.company);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="pros-err">{error}</div>}

      <div className="pros-card">
        <Field label="Company name">
          <input className="pros-input" value={form.name} onChange={set("name")} autoFocus={!editing} />
        </Field>
        <div className="pros-grid2">
          <Field label="DBA / trade name">
            <input className="pros-input" value={form.dba} onChange={set("dba")} />
          </Field>
          <Field label="Industry">
            <input
              className="pros-input"
              value={form.industry}
              onChange={set("industry")}
              placeholder="Oilfield services"
            />
          </Field>
        </div>
        <Field label="Sector" hint="Used by the sector filter — reuse an existing name to group with it.">
          <input
            className="pros-input"
            value={form.sector}
            onChange={set("sector")}
            placeholder="Industrial Manufacturing"
          />
        </Field>
        <Field label="What they do">
          <textarea className="pros-textarea" value={form.description} onChange={set("description")} />
        </Field>
      </div>

      <div className="pros-card">
        <div className="pros-h2">How to reach them</div>
        <Field label="Website">
          <input
            className="pros-input"
            value={form.website}
            onChange={set("website")}
            inputMode="url"
            autoCapitalize="off"
            placeholder="example.com"
          />
        </Field>
        <div className="pros-grid2">
          <Field label="Main phone">
            <input className="pros-input" value={form.phone} onChange={set("phone")} inputMode="tel" />
          </Field>
          <Field label="General email">
            <input
              className="pros-input"
              value={form.email}
              onChange={set("email")}
              inputMode="email"
              autoCapitalize="off"
            />
          </Field>
        </div>
        <Field label="Street address" hint="Leave blank and the map link searches by name and city instead.">
          <input className="pros-input" value={form.address_line1} onChange={set("address_line1")} />
        </Field>
        <Field label="Suite / floor">
          <input className="pros-input" value={form.address_line2} onChange={set("address_line2")} />
        </Field>
        <div className="pros-grid2">
          <Field label="City">
            <input className="pros-input" value={form.city} onChange={set("city")} />
          </Field>
          <div className="pros-row" style={{ gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: "0 0 78px" }}>
              <Field label="State">
                <input className="pros-input" value={form.state} onChange={set("state")} maxLength={2} />
              </Field>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Field label="ZIP">
                <input
                  className="pros-input"
                  value={form.postal_code}
                  onChange={set("postal_code")}
                  inputMode="numeric"
                />
              </Field>
            </div>
          </div>
        </div>
        <Field label="LinkedIn page" hint="Optional — left blank, the page links a LinkedIn search instead.">
          <input
            className="pros-input"
            value={form.linkedin}
            onChange={set("linkedin")}
            autoCapitalize="off"
          />
        </Field>
      </div>

      <div className="pros-card">
        <div className="pros-h2">Size and ownership</div>
        <div className="pros-grid2">
          <Field label="Revenue, low ($M)">
            <input
              className="pros-input"
              value={form.revenue_low_m}
              onChange={set("revenue_low_m")}
              inputMode="decimal"
              placeholder="50"
            />
          </Field>
          <Field label="Revenue, high ($M)">
            <input
              className="pros-input"
              value={form.revenue_high_m}
              onChange={set("revenue_high_m")}
              inputMode="decimal"
              placeholder="250"
            />
          </Field>
        </div>
        <Field
          label="How good is that number?"
          hint="It changes what the card says under the figure, and it is the difference between a number you can quote and one you have to confirm."
        >
          <select className="pros-select" value={form.revenue_basis} onChange={set("revenue_basis")}>
            <option value="unknown">No figure / unverified</option>
            <option value="filing">Reported by the company</option>
            <option value="estimate">Estimate</option>
            <option value="not_reported">Parent doesn&apos;t break it out</option>
          </select>
        </Field>
        <div className="pros-grid2">
          <Field label="Employees">
            <input
              className="pros-input"
              value={form.employees}
              onChange={set("employees")}
              inputMode="numeric"
            />
          </Field>
          <Field label="Year founded">
            <input
              className="pros-input"
              value={form.founded}
              onChange={set("founded")}
              inputMode="numeric"
            />
          </Field>
        </div>
        <div className="pros-grid2">
          <Field label="Ownership">
            <select className="pros-select" value={form.ownership} onChange={set("ownership")}>
              {(meta?.ownership || Object.keys(OWNERSHIP_LABEL)).map((o) => (
                <option key={o} value={o}>
                  {OWNERSHIP_LABEL[o] || o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ticker">
            <input
              className="pros-input"
              value={form.ticker}
              onChange={set("ticker")}
              autoCapitalize="characters"
            />
          </Field>
        </div>
        <Field label="Parent company">
          <input className="pros-input" value={form.parent_company} onChange={set("parent_company")} />
        </Field>
      </div>

      <div className="pros-card">
        <div className="pros-h2">Your side of it</div>
        <div className="pros-grid2">
          <Field label="Status">
            <select className="pros-select" value={form.status} onChange={set("status")}>
              {(meta?.statuses || ["new"]).map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className="pros-select" value={form.priority} onChange={set("priority")}>
              {(meta?.priorities || ["A", "B", "C"]).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Referred by">
          <input className="pros-input" value={form.referred_by} onChange={set("referred_by")} />
        </Field>
      </div>

      <div className="pros-row">
        <button className="pros-btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Add the company"}
        </button>
        <button className="pros-btn pros-btn-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// Dollars → millions for display, without a trailing ".0" on round numbers.
function toM(dollars) {
  if (dollars === null || dollars === undefined || dollars === "") return "";
  const m = Number(dollars) / 1e6;
  if (!Number.isFinite(m)) return "";
  return String(Number(m.toFixed(3)));
}

/* Millions → dollars. Accepts "250", "$250", "1.2b" and "250m" — she is typing
 * into a field labelled ($M) but people paste what they have, and a stray "b"
 * meaning billions must not land as 1.2 million. */
function fromM(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  const m = /^\$?\s*([\d,]*\.?\d+)\s*([kmb])?/i.exec(raw);
  if (!m) return "";
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return "";
  const suffix = (m[2] || "").toLowerCase();
  if (suffix === "b") return String(n * 1e9);
  if (suffix === "k") return String(n * 1e3);
  // Bare, or an explicit "m": the field is labelled millions.
  return String(n * 1e6);
}
