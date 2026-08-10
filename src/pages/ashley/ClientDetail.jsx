import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import ClientForm from "./ClientForm.jsx";
import ContactForm from "./ContactForm.jsx";
import LogOutreach from "./LogOutreach.jsx";
import {
  channelLabel,
  CHANNEL_ICON,
  contactName,
  daysAgoLabel,
  dueLabel,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  outcomeLabel,
  PORTABILITY_LABEL,
  prettify,
  statusColor,
  statusLabel,
  telHref,
  tierColor,
} from "./ui.js";

/* One client: the relationship detail, every person at it, and every touch in
 * order. The contact rows are the working surface — each phone number and email
 * is a real link, so a call is one tap and logging it is two more. */
export default function ClientDetail({ clientId, meta, onBack, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [contactEdit, setContactEdit] = useState(null); // {} for new, contact for edit
  const [logging, setLogging] = useState(null); // { contactId } when open
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [flash, setFlash] = useState("");

  /* setState in the promise callbacks, not after an await — the effect below
   * calls load(), and react-hooks rejects a setState reached synchronously from
   * an effect body. */
  const load = useCallback(
    () =>
      api
        .get(`/clients/${clientId}`)
        .then(setData)
        .catch((e) => setError(e.message)),
    [clientId]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Any write here changes the dashboard's counts too.
  const changed = useCallback(
    async (message) => {
      await load();
      onChanged();
      if (message) {
        setFlash(message);
        window.setTimeout(() => setFlash(""), 4000);
      }
    },
    [load, onChanged]
  );

  if (error) {
    return (
      <>
        <BackBar onBack={onBack} />
        <div className="ash-err">{error}</div>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <BackBar onBack={onBack} />
        <div className="ash-muted" style={{ padding: "24px 2px" }}>Loading…</div>
      </>
    );
  }

  const { client, contacts, outreach } = data;
  const sc = statusColor(client.status);
  const tc = tierColor(client.tier);
  const address = [
    client.address_line1,
    client.address_line2,
    [client.city, client.state].filter(Boolean).join(", "),
    client.postal_code,
  ]
    .filter(Boolean)
    .join(" · ");

  async function archive() {
    await api.del(`/clients/${client.id}`);
    onChanged();
    onBack();
  }

  return (
    <>
      <BackBar onBack={onBack} />
      {flash && <div className="ash-ok">{flash}</div>}

      <div className="ash-card">
        <div className="ash-between">
          <div style={{ minWidth: 0 }}>
            <div className="ash-row" style={{ gap: 8 }}>
              <span className="ash-tierchip" style={{ background: tc.bg, color: tc.fg, borderColor: tc.border }}>
                {client.tier}
              </span>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{client.company_name}</span>
            </div>
            {client.dba && <div className="ash-muted" style={{ marginTop: 2 }}>dba {client.dba}</div>}
            <div className="ash-row" style={{ gap: 6, marginTop: 8 }}>
              <span className="ash-chip" style={{ background: sc.bg, color: sc.fg }}>
                {statusLabel(client.status)}
              </span>
              {client.contacted_since_departure ? (
                <span className="ash-chip" style={{ background: "#e3f5e6", color: "#1e7a35" }}>
                  Contacted since you left
                </span>
              ) : (
                <span className="ash-chip" style={{ background: "#fdf2e0", color: "#8a5a10" }}>
                  Not yet contacted
                </span>
              )}
            </div>
          </div>
          <button className="ash-btn ash-btn-ghost ash-btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>

        <div className="ash-divide" />

        <dl className="ash-dl">
          {client.industry && (<><dt>Industry</dt><dd>{client.industry}</dd></>)}
          {client.relationship_since && (<><dt>Client since</dt><dd>{client.relationship_since}</dd></>)}
          <dt>Loans</dt><dd>{fmtMoney(client.loan_balance)}</dd>
          <dt>Deposits</dt><dd>{fmtMoney(client.deposit_balance)}</dd>
          {client.annual_fee_income !== null && (<><dt>Fee income</dt><dd>{fmtMoney(client.annual_fee_income)}</dd></>)}
          {client.next_maturity_date && (<><dt>Next maturity</dt><dd>{fmtDate(client.next_maturity_date)}</dd></>)}
          <dt>Portability</dt>
          <dd>{PORTABILITY_LABEL[client.portability] || prettify(client.portability)}</dd>
          {client.referral_source && (<><dt>Referred by</dt><dd>{client.referral_source}</dd></>)}
          {address && (<><dt>Address</dt><dd>{address}</dd></>)}
          {client.website && (
            <>
              <dt>Website</dt>
              <dd>
                <a href={/^https?:\/\//i.test(client.website) ? client.website : `https://${client.website}`} target="_blank" rel="noreferrer">
                  {client.website}
                </a>
              </dd>
            </>
          )}
          <dt>Last touch</dt>
          <dd>
            {client.last_touch_at ? `${daysAgoLabel(client.last_touch_at)} (${outreach.length} total)` : "never"}
          </dd>
        </dl>

        {client.credit_facilities && (
          <>
            <div className="ash-divide" />
            <div className="ash-label">Credit facilities</div>
            <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{client.credit_facilities}</div>
          </>
        )}
        {client.notes && (
          <>
            <div className="ash-divide" />
            <div className="ash-label">Notes</div>
            <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{client.notes}</div>
          </>
        )}

        <button className="ash-btn ash-btn-block" style={{ marginTop: 14 }} onClick={() => setLogging({})}>
          Log outreach
        </button>
      </div>

      <div className="ash-card">
        <div className="ash-between">
          <div className="ash-h2" style={{ marginBottom: 0 }}>
            People {contacts.length > 0 && <span className="ash-tiny">({contacts.length})</span>}
          </div>
          <button className="ash-btn ash-btn-ghost ash-btn-sm" onClick={() => setContactEdit({})}>
            + Add
          </button>
        </div>

        {contacts.length === 0 ? (
          <p className="ash-muted" style={{ marginBottom: 0 }}>
            No people yet — add whoever you actually talk to here.
          </p>
        ) : (
          <div style={{ marginTop: 11 }}>
            {contacts.map((c) => (
              <ContactCard
                key={c.id}
                contact={c}
                onEdit={() => setContactEdit(c)}
                onLog={() => setLogging({ contactId: c.id })}
                onRemoved={() => changed("Removed.")}
              />
            ))}
          </div>
        )}
      </div>

      <div className="ash-card">
        <div className="ash-h2">History</div>
        {outreach.length === 0 ? (
          <p className="ash-muted" style={{ marginBottom: 0 }}>Nothing logged yet.</p>
        ) : (
          <ul className="ash-timeline">
            {outreach.map((o) => (
              <TimelineRow key={o.id} item={o} onChanged={changed} />
            ))}
          </ul>
        )}
      </div>

      <div className="ash-card">
        {confirmDelete ? (
          <>
            <div style={{ fontSize: 14, marginBottom: 10 }}>
              Archive <strong>{client.company_name}</strong>? It disappears from the
              list and stops counting in your totals, but nothing is deleted — you
              can bring it back with the &ldquo;Archived&rdquo; filter.
            </div>
            <div className="ash-row" style={{ gap: 8 }}>
              <button className="ash-btn ash-btn-danger" onClick={archive}>Archive it</button>
              <button className="ash-btn ash-btn-ghost" onClick={() => setConfirmDelete(false)}>Keep it</button>
            </div>
          </>
        ) : client.archived ? (
          <div className="ash-row" style={{ justifyContent: "space-between" }}>
            <span className="ash-muted">This client is archived.</span>
            <button
              className="ash-btn ash-btn-ghost ash-btn-sm"
              onClick={async () => {
                await api.patch(`/clients/${client.id}`, { archived: false });
                changed("Restored.");
              }}
            >
              Restore
            </button>
          </div>
        ) : (
          <button className="ash-btn ash-btn-danger ash-btn-sm" onClick={() => setConfirmDelete(true)}>
            Archive this client
          </button>
        )}
      </div>

      {editing && (
        <ClientForm
          client={client}
          meta={meta}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            changed("Saved.");
          }}
        />
      )}
      {contactEdit && (
        <ContactForm
          clientId={client.id}
          contact={contactEdit.id ? contactEdit : null}
          meta={meta}
          onClose={() => setContactEdit(null)}
          onSaved={() => {
            setContactEdit(null);
            changed("Saved.");
          }}
        />
      )}
      {logging && (
        <LogOutreach
          client={client}
          contacts={contacts}
          meta={meta}
          presetContactId={logging.contactId}
          onClose={() => setLogging(null)}
          onSaved={(result) => {
            setLogging(null);
            changed(
              result?.statusAdvancedTo
                ? `Logged — moved to ${statusLabel(result.statusAdvancedTo).toLowerCase()}.`
                : "Logged."
            );
          }}
        />
      )}
    </>
  );
}

function BackBar({ onBack }) {
  return (
    <button className="ash-link" onClick={onBack} style={{ marginBottom: 6 }}>
      ← All clients
    </button>
  );
}

function ContactCard({ contact, onEdit, onLog, onRemoved }) {
  const [showDelete, setShowDelete] = useState(false);
  return (
    <div className="ash-contact">
      <div className="ash-between">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {contactName(contact)}
            {contact.is_primary && (
              <span className="ash-chip" style={{ background: "#e6f0fa", color: "#1f4e79", marginLeft: 7 }}>
                Main
              </span>
            )}
            {contact.do_not_contact && (
              <span className="ash-chip" style={{ background: "#fdeceb", color: "#9c3128", marginLeft: 7 }}>
                Do not contact
              </span>
            )}
          </div>
          {(contact.title || contact.role) && (
            <div className="ash-muted">{[contact.title, contact.role].filter(Boolean).join(" · ")}</div>
          )}
          {contact.preferred_channel && (
            <div className="ash-tiny">Prefers {contact.preferred_channel.replace(/_/g, " ")}</div>
          )}
        </div>
        <button className="ash-link" onClick={onEdit} style={{ fontSize: 12 }}>Edit</button>
      </div>

      {/* Real tel:/sms:/mailto: links — this is the whole point of the app on a
          phone. Tap to dial, then tap Log to record it. */}
      <div className="ash-actions">
        {contact.phone_mobile && (
          <a className="ash-iconbtn" href={telHref(contact.phone_mobile)}>📞 {contact.phone_mobile}</a>
        )}
        {contact.phone_mobile && (
          <a className="ash-iconbtn" href={`sms:${contact.phone_mobile.replace(/[^\d+]/g, "")}`}>💬 Text</a>
        )}
        {contact.phone_office && (
          <a className="ash-iconbtn" href={telHref(contact.phone_office)}>🏢 {contact.phone_office}</a>
        )}
        {contact.phone_alt && (
          <a className="ash-iconbtn" href={telHref(contact.phone_alt)}>📱 {contact.phone_alt}</a>
        )}
        {contact.email && <a className="ash-iconbtn" href={`mailto:${contact.email}`}>✉️ Email</a>}
        {contact.email_alt && <a className="ash-iconbtn" href={`mailto:${contact.email_alt}`}>✉️ Alt</a>}
        {contact.linkedin && (
          <a
            className="ash-iconbtn"
            href={/^https?:\/\//i.test(contact.linkedin) ? contact.linkedin : `https://${contact.linkedin}`}
            target="_blank"
            rel="noreferrer"
          >
            💼 LinkedIn
          </a>
        )}
        <button className="ash-iconbtn" onClick={onLog}>📝 Log</button>
      </div>

      {contact.email && <div className="ash-tiny" style={{ marginTop: 6 }}>{contact.email}</div>}
      {contact.birthday && <div className="ash-tiny">Birthday: {contact.birthday}</div>}
      {contact.notes && (
        <div style={{ fontSize: 13, marginTop: 6, whiteSpace: "pre-wrap", color: "#48545f" }}>{contact.notes}</div>
      )}

      <div style={{ marginTop: 8 }}>
        {showDelete ? (
          <div className="ash-row" style={{ gap: 7 }}>
            <span className="ash-tiny">
              Remove {contactName(contact)}? Their call history stays on this client.
            </span>
            <button
              className="ash-btn ash-btn-danger ash-btn-sm"
              onClick={async () => {
                await api.del(`/contacts/${contact.id}`);
                onRemoved();
              }}
            >
              Remove
            </button>
            <button className="ash-link" onClick={() => setShowDelete(false)}>Cancel</button>
          </div>
        ) : (
          <button className="ash-link" style={{ fontSize: 12, color: "#8794a1" }} onClick={() => setShowDelete(true)}>
            Remove person
          </button>
        )}
      </div>
    </div>
  );
}

function TimelineRow({ item, onChanged }) {
  const [busy, setBusy] = useState(false);

  async function toggleFollowUp() {
    setBusy(true);
    try {
      await api.post(`/outreach/${item.id}/follow-up-done`, { done: !item.follow_up_done });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="ash-tl-item">
      <span className="ash-tl-icon">{CHANNEL_ICON[item.channel] || "📌"}</span>
      <div className="ash-tl-body">
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {channelLabel(item.channel)} · {outcomeLabel(item.outcome)}
          {item.direction === "inbound" && (
            <span className="ash-tiny" style={{ marginLeft: 6 }}>(they reached out)</span>
          )}
        </div>
        <div className="ash-tiny">
          {fmtDateTime(item.occurred_at)}
          {contactName(item) && ` · ${contactName(item)}`}
          {item.title ? `, ${item.title}` : ""}
        </div>
        {item.notes && (
          <div style={{ fontSize: 13, marginTop: 5, whiteSpace: "pre-wrap", color: "#3a4652" }}>{item.notes}</div>
        )}
        {item.next_follow_up_date && (
          <div className="ash-row" style={{ gap: 8, marginTop: 6 }}>
            <span
              className="ash-chip"
              style={
                item.follow_up_done
                  ? { background: "#eef1f5", color: "#6b7785", textDecoration: "line-through" }
                  : { background: "#fdf2e0", color: "#8a5a10" }
              }
            >
              {dueLabel(item.next_follow_up_date)}
            </span>
            <button className="ash-link" style={{ fontSize: 12 }} disabled={busy} onClick={toggleFollowUp}>
              {item.follow_up_done ? "Reopen" : "Mark done"}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
