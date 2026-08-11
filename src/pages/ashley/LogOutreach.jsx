import { useState } from "react";
import { api } from "./api.js";
import Field from "./Field.jsx";
import Modal from "./Modal.jsx";
import {
  channelLabel,
  CHANNEL_ICON,
  contactName,
  nowLocalInput,
  outcomeLabel,
  statusLabel,
  todayYmd,
} from "./ui.js";

/* Log a touch. The most-used screen in the app, so it opens pre-filled for the
 * common case — an outbound call, right now, to the primary contact — and can be
 * saved in one tap.
 *
 * Logging also advances the client's status server-side (no_answer → attempted,
 * spoke → reached, and so on), which is why there's no status picker here. */

// Quick follow-up offsets, since typing a date on a phone is the slow part.
const SNOOZE = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "In a month", days: 30 },
];

const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function LogOutreach({ client, contacts, meta, presetContactId, onClose, onSaved }) {
  const primary = contacts.find((c) => c.is_primary) || contacts[0];
  const [form, setForm] = useState({
    contact_id: String(presetContactId || primary?.id || ""),
    channel: "call",
    direction: "outbound",
    outcome: "no_answer",
    occurred_at: nowLocalInput(),
    notes: "",
    next_follow_up_date: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const channels = meta?.channels || ["call", "voicemail", "email", "text", "in_person", "other"];
  const outcomes = meta?.outcomes || ["no_answer", "spoke", "other"];

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      /* datetime-local gives "2026-08-10T14:22" with no zone. new Date() reads
       * that as LOCAL time and toISOString converts properly — sending the raw
       * string would have Postgres store 14:22 UTC, i.e. 9:22am Central. */
      const localIso = form.occurred_at ? new Date(form.occurred_at).toISOString() : undefined;
      const result = await api.post(`/clients/${client.id}/outreach`, {
        ...form,
        contact_id: form.contact_id || null,
        occurred_at: localIso,
      });
      onSaved(result);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={`Log outreach — ${client.display_name || client.company_name}`} onClose={onClose}>
      {error && <div className="ash-err">{error}</div>}
      <form onSubmit={save}>
        <div className="ash-card">
          <Field label="Who">
            <select className="ash-select" value={form.contact_id} onChange={set("contact_id")}>
              <option value="">(nobody in particular)</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contactName(c)}
                  {c.title ? ` — ${c.title}` : ""}
                </option>
              ))}
            </select>
          </Field>

          {/* Channel and direction are pill groups, not single controls, so they
              keep a plain heading — a <label> can only point at one input. */}
          <div className="ash-field">
            <span className="ash-label">How</span>
            <div className="ash-filters" style={{ marginBottom: 0 }}>
              {channels.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="ash-pill"
                  aria-pressed={form.channel === c}
                  onClick={() => setForm((f) => ({ ...f, channel: c }))}
                >
                  {CHANNEL_ICON[c] || "📌"} {channelLabel(c)}
                </button>
              ))}
            </div>
          </div>

          <div className="ash-field">
            <span className="ash-label">Which way</span>
            <div className="ash-row" style={{ gap: 8 }}>
              {(meta?.directions || ["outbound", "inbound"]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className="ash-pill"
                  aria-pressed={form.direction === d}
                  onClick={() => setForm((f) => ({ ...f, direction: d }))}
                >
                  {d === "outbound" ? "I reached out" : "They contacted me"}
                </button>
              ))}
            </div>
          </div>

          <Field label="What happened">
            <select className="ash-select" value={form.outcome} onChange={set("outcome")}>
              {outcomes.map((o) => (
                <option key={o} value={o}>{outcomeLabel(o)}</option>
              ))}
            </select>
          </Field>

          <Field label="When">
            <input className="ash-input" type="datetime-local" value={form.occurred_at} onChange={set("occurred_at")} />
          </Field>

          <Field label="Notes">
            <textarea
              className="ash-textarea"
              placeholder="What was said, what they asked for, what you promised…"
              value={form.notes}
              onChange={set("notes")}
            />
          </Field>
        </div>

        <div className="ash-card">
          <div className="ash-h2">Follow up</div>
          <div className="ash-filters" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className="ash-pill"
              aria-pressed={!form.next_follow_up_date}
              onClick={() => setForm((f) => ({ ...f, next_follow_up_date: "" }))}
            >
              None
            </button>
            {SNOOZE.map((s) => {
              const ymd = plusDays(s.days);
              return (
                <button
                  key={s.days}
                  type="button"
                  className="ash-pill"
                  aria-pressed={form.next_follow_up_date === ymd}
                  onClick={() => setForm((f) => ({ ...f, next_follow_up_date: ymd }))}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <input
            className="ash-input"
            type="date"
            min={todayYmd()}
            value={form.next_follow_up_date}
            onChange={set("next_follow_up_date")}
          />
          <div className="ash-tiny" style={{ marginTop: 5 }}>
            Anything with a date here shows up on the Follow-ups tab until you
            check it off.
          </div>
        </div>

        <div className="ash-row" style={{ gap: 8 }}>
          <button className="ash-btn" type="submit" disabled={busy} style={{ flex: 1 }}>
            {busy ? "Saving…" : "Log it"}
          </button>
          <button className="ash-btn ash-btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
        <div className="ash-tiny" style={{ textAlign: "center", marginTop: 8 }}>
          Currently {statusLabel(client.status).toLowerCase()} — logging this may move
          them along.
        </div>
      </form>
    </Modal>
  );
}
