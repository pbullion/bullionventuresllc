import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import {
  BASIS_LABEL,
  BASIS_NOTE,
  KIND_ICON,
  OWNERSHIP_LABEL,
  areaFor,
  contactName,
  dueLabel,
  fmtDateTime,
  kindLabel,
  mailHref,
  mapsHref,
  nowLocalInput,
  personSearchHref,
  prettyHost,
  priorityColor,
  researchLinks,
  revenueLabel,
  roleLabel,
  smsHref,
  statusColor,
  statusLabel,
  telHref,
  todayYmd,
  withProtocol,
} from "./ui.js";
import Sheet, { Field } from "./Sheet.jsx";
import CompanyForm from "./CompanyForm.jsx";
import ContactForm from "./ContactForm.jsx";

/* One company. Reached at /prospects/:slug, which is bookmarkable — she texts
 * herself the link for tomorrow's call.
 *
 * Ordered by what she needs standing in a lobby: who to call and how, then what
 * to know before dialling, then where the relationship stands, then history. The
 * research links come FIRST because the most common use of this screen is two
 * minutes of prep before a call. */
export default function CompanyDetail({ slug, meta, onBack, onCompanyChange, onDeleted }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [contactEdit, setContactEdit] = useState(null); // {} for new, row for edit
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* setState in the promise callbacks, not after an await — the effect below
   * calls load(), and react-hooks rejects a setState reached synchronously from
   * an effect body. Same shape and same reason as ashley/ClientDetail.jsx:43. */
  const load = useCallback(
    () =>
      api
        .get(`/companies/${encodeURIComponent(slug)}`)
        .then((d) => {
          setData(d);
          setError(""); // clear a previous failure, or one blip wedges the screen
        })
        .catch((e) => setError(e.message)),
    [slug]
  );

  useEffect(() => {
    load();
  }, [load]);

  const company = data?.company;

  useEffect(() => {
    if (company?.name) document.title = `${company.name} — Prospects`;
  }, [company?.name]);

  /* Every single-tap control (status, priority, contacted, follow-up) writes
   * straight through. The list behind this screen is told about it so going back
   * doesn't show a stale card. */
  const patch = useCallback(
    async (body) => {
      if (!company) return;
      setBusy(true);
      try {
        const { company: updated } = await api.patch(`/companies/${company.id}`, body);
        setData((d) => ({ ...d, company: { ...d.company, ...updated } }));
        onCompanyChange?.(updated);
        setError("");
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [company, onCompanyChange]
  );

  if (error && !data) {
    return (
      <>
        <div className="pros-top">
          <div className="pros-top-in">
            <button className="pros-back" onClick={onBack}>
              ‹ All prospects
            </button>
          </div>
        </div>
        <div className="pros-shell">
          <div className="pros-err">{error}</div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <div className="pros-top">
          <div className="pros-top-in">
            <button className="pros-back" onClick={onBack}>
              ‹ All prospects
            </button>
          </div>
        </div>
        <div className="pros-shell">
          <div className="pros-card pros-empty">Loading…</div>
        </div>
      </>
    );
  }

  const { contacts, notes } = data;
  const status = statusColor(company.status);
  const prio = priorityColor(company.priority);
  const due = dueLabel(company.next_follow_up_date);
  const rev = revenueLabel(company);
  const links = researchLinks(company);

  return (
    <>
      <div className="pros-top">
        <div className="pros-top-in">
          <button className="pros-back" onClick={onBack}>
            ‹ All prospects
          </button>
          <div className="pros-top-row" style={{ marginTop: 2, paddingBottom: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div className="pros-brand">{company.name}</div>
              <div className="pros-sub">
                {/* Dedupe: areaFor("Houston") is "Houston", so a Houston company
                    read "Houston · Houston" here. */}
                {[
                  company.dba && `dba ${company.dba}`,
                  company.city,
                  areaFor(company.city) === company.city ? null : areaFor(company.city),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <button className="pros-icon-btn" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="pros-shell">
        {error && <div className="pros-err">{error}</div>}

        {company.archived && (
          <div className="pros-warn">
            Archived — hidden from the list. “Put back in the list” below undoes it.
          </div>
        )}

        {company.do_not_contact && (
          <div className="pros-err">
            Marked <strong>do not contact</strong>. Don&apos;t reach out without checking why.
          </div>
        )}

        {/* Reach them — only the channels that actually exist. An empty tel: link
            that dials nothing is worse than no button. */}
        <div className="pros-card">
          <div className="pros-row" style={{ gap: 8, marginBottom: 2 }}>
            <span
              className="pros-prio"
              style={{ background: prio.bg, color: prio.fg, borderColor: prio.border }}
            >
              {company.priority}
            </span>
            <span className="pros-chip" style={{ background: status.bg, color: status.fg }}>
              {statusLabel(company.status)}
            </span>
            {due.text && <span className={`pros-due pros-due-${due.tone}`}>{due.text}</span>}
          </div>
          {company.description && (
            <p className="pros-muted" style={{ margin: "10px 0 0", lineHeight: 1.55 }}>
              {company.description}
            </p>
          )}
          <div className="pros-acts">
            {company.phone && (
              <a className="pros-act" href={telHref(company.phone)}>
                📞 {company.phone}
              </a>
            )}
            {company.email && (
              <a className="pros-act" href={mailHref(company.email)}>
                ✉️ {company.email}
              </a>
            )}
            <button
              className="pros-act"
              disabled={busy}
              onClick={() => patch({ contacted: !company.contacted })}
            >
              {company.contacted ? "✓ Contacted" : "○ Mark contacted"}
            </button>
          </div>
        </div>

        {/* Two minutes of prep, one tap each. These are live searches rather than
            stored values on purpose — see the note in ui.js. */}
        <div className="pros-card">
          <div className="pros-h2">Look them up</div>
          <div className="pros-research">
            {links.map((l) => (
              <a
                key={l.key}
                className="pros-rlink"
                href={l.href}
                target="_blank"
                rel="noreferrer"
              >
                <span className="pros-rlink-ico">{l.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="pros-rlink-l" style={{ display: "block" }}>
                    {l.label}
                  </span>
                  {l.sub && <span className="pros-rlink-s" style={{ display: "block" }}>{l.sub}</span>}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* What's known */}
        <div className="pros-card">
          <div className="pros-h2">The company</div>
          <dl className="pros-facts">
            {company.industry && (
              <>
                <dt>Industry</dt>
                <dd>{company.industry}</dd>
              </>
            )}
            {company.sector && (
              <>
                <dt>Sector</dt>
                <dd>{company.sector}</dd>
              </>
            )}
            <dt>Revenue</dt>
            <dd>
              {rev ? (
                <>
                  {rev}{" "}
                  <span className="pros-tiny">({BASIS_LABEL[company.revenue_basis]})</span>
                </>
              ) : (
                <span className="pros-muted">not filled in</span>
              )}
            </dd>
            {company.employees ? (
              <>
                <dt>Employees</dt>
                <dd>{Number(company.employees).toLocaleString()}</dd>
              </>
            ) : null}
            <dt>Ownership</dt>
            <dd>
              {OWNERSHIP_LABEL[company.ownership] || company.ownership}
              {company.ticker ? ` · ${company.ticker}` : ""}
            </dd>
            {company.parent_company && (
              <>
                <dt>Parent</dt>
                <dd>{company.parent_company}</dd>
              </>
            )}
            {company.founded ? (
              <>
                <dt>Founded</dt>
                <dd>{company.founded}</dd>
              </>
            ) : null}
            <dt>Location</dt>
            <dd>
              <a href={mapsHref(company)} target="_blank" rel="noreferrer">
                {[
                  company.address_line1,
                  company.address_line2,
                  [company.city, company.state].filter(Boolean).join(", "),
                  company.postal_code,
                ]
                  .filter(Boolean)
                  .join(" · ") || `${company.city || "Houston area"} — search on the map`}
              </a>
            </dd>
            {company.website && (
              <>
                <dt>Website</dt>
                <dd>
                  <a href={withProtocol(company.website)} target="_blank" rel="noreferrer">
                    {prettyHost(company.website)}
                  </a>
                </dd>
              </>
            )}
            {company.referred_by && (
              <>
                <dt>Referred by</dt>
                <dd>{company.referred_by}</dd>
              </>
            )}
          </dl>
          {company.revenue_basis && company.revenue_basis !== "filing" && rev && (
            <div className="pros-warn" style={{ marginTop: 13, marginBottom: 0 }}>
              {BASIS_NOTE[company.revenue_basis]}
            </div>
          )}
          {company.source_note && (
            <div className="pros-tiny" style={{ marginTop: 11, lineHeight: 1.5 }}>
              <strong>Note:</strong> {company.source_note}
            </div>
          )}
        </div>

        {/* Her overlay */}
        <div className="pros-card">
          <div className="pros-h2">Where it stands</div>
          <div className="pros-grid2">
            <Field label="Status">
              <select
                className="pros-select"
                value={company.status}
                disabled={busy}
                onChange={(e) => patch({ status: e.target.value })}
              >
                {(meta?.statuses || [company.status]).map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                className="pros-select"
                value={company.priority}
                disabled={busy}
                onChange={(e) => patch({ priority: e.target.value })}
              >
                {(meta?.priorities || ["A", "B", "C"]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="pros-grid2">
            <Field label="Next follow-up">
              <input
                className="pros-input"
                type="date"
                value={company.next_follow_up_date || ""}
                disabled={busy}
                onChange={(e) => patch({ next_follow_up_date: e.target.value })}
              />
            </Field>
            <Field label="First contacted">
              <input
                className="pros-input"
                type="date"
                value={company.first_contacted_on || ""}
                disabled={busy}
                onChange={(e) => patch({ first_contacted_on: e.target.value })}
              />
            </Field>
          </div>
          <WorkingNotes
            key={company.notes}
            company={company}
            onSave={(notes) => patch({ notes })}
            busy={busy}
          />
        </div>

        {/* People */}
        <div className="pros-card">
          <div className="pros-between" style={{ marginBottom: 4 }}>
            <div className="pros-h2" style={{ marginBottom: 0 }}>
              Who to talk to
            </div>
            <button className="pros-btn pros-btn-ghost pros-btn-sm" onClick={() => setContactEdit({})}>
              + Add
            </button>
          </div>

          {contacts.length === 0 && (
            <p className="pros-muted" style={{ lineHeight: 1.55 }}>
              Nobody yet. Use <strong>Find the CFO</strong> above — then add whoever you turn up, so
              the number is here next time.
            </p>
          )}

          {contacts.map((p) => (
            <div className="pros-person" key={p.id}>
              <div className="pros-between">
                <div style={{ minWidth: 0 }}>
                  <div className="pros-row" style={{ gap: 7 }}>
                    <span style={{ fontWeight: 650 }}>{contactName(p)}</span>
                    {p.is_primary && (
                      <span className="pros-chip" style={{ background: "var(--p-teal-tint)", color: "var(--p-teal-dark)" }}>
                        Primary
                      </span>
                    )}
                    {p.unverified && <span className="pros-verify">verify</span>}
                  </div>
                  <div className="pros-muted" style={{ marginTop: 2 }}>
                    {[p.title, p.role ? roleLabel(p.role) : ""].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button className="pros-link" onClick={() => setContactEdit(p)}>
                  Edit
                </button>
              </div>
              {p.unverified && (
                <div className="pros-tiny" style={{ marginTop: 6, lineHeight: 1.45 }}>
                  From a public filing when the list was built — confirm they still hold the job
                  before you use the name.
                </div>
              )}
              <div className="pros-acts">
                {p.phone_office && (
                  <a className="pros-act" href={telHref(p.phone_office)}>
                    📞 Office
                  </a>
                )}
                {p.phone_mobile && (
                  <>
                    <a className="pros-act" href={telHref(p.phone_mobile)}>
                      📱 Mobile
                    </a>
                    <a className="pros-act pros-act-flat" href={smsHref(p.phone_mobile)}>
                      💬 Text
                    </a>
                  </>
                )}
                {p.email && (
                  <a className="pros-act" href={mailHref(p.email)}>
                    ✉️ Email
                  </a>
                )}
                <a
                  className="pros-act pros-act-flat"
                  href={p.linkedin ? withProtocol(p.linkedin) : personSearchHref(p, company)}
                  target="_blank"
                  rel="noreferrer"
                >
                  in {p.linkedin ? "Profile" : "Find on LinkedIn"}
                </a>
              </div>
              {p.notes && (
                <div className="pros-tiny" style={{ marginTop: 7, whiteSpace: "pre-wrap" }}>
                  {p.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        <LogTouch
          company={company}
          contacts={contacts}
          meta={meta}
          onLogged={(updated) => {
            load();
            if (updated) onCompanyChange?.(updated);
          }}
        />

        {/* History */}
        <div className="pros-card">
          <div className="pros-h2">History</div>
          {notes.length === 0 && (
            <p className="pros-muted" style={{ margin: 0 }}>
              Nothing logged yet.
            </p>
          )}
          <ul className="pros-timeline">
            {notes.map((n) => (
              <li className="pros-tl-item" key={n.id}>
                <span className="pros-tl-ico">{KIND_ICON[n.kind] || "📝"}</span>
                <div className="pros-tl-body">
                  <div className="pros-between">
                    <div className="pros-tl-when">
                      {kindLabel(n.kind)} · {fmtDateTime(n.occurred_at)}
                      {n.first_name || n.last_name
                        ? ` · ${contactName({ first_name: n.first_name, last_name: n.last_name })}`
                        : ""}
                    </div>
                    <button
                      className="pros-link"
                      style={{ fontSize: 12 }}
                      onClick={async () => {
                        if (!window.confirm("Delete this entry?")) return;
                        try {
                          await api.del(`/notes/${n.id}`);
                          load();
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  {n.body && <div className="pros-tl-text">{n.body}</div>}
                  {n.next_follow_up_date && (
                    <div className="pros-row" style={{ marginTop: 6, gap: 8 }}>
                      <span className={`pros-due pros-due-${dueLabel(n.next_follow_up_date).tone}`}>
                        {n.follow_up_done ? "done" : dueLabel(n.next_follow_up_date).text}
                      </span>
                      {!n.follow_up_done && (
                        <button
                          className="pros-link"
                          style={{ fontSize: 12 }}
                          onClick={async () => {
                            try {
                              await api.post(`/notes/${n.id}/follow-up-done`);
                              load();
                            } catch (e) {
                              setError(e.message);
                            }
                          }}
                        >
                          Mark done
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="pros-card">
          <div className="pros-h2">Housekeeping</div>
          <div className="pros-row">
            <button
              className="pros-btn pros-btn-ghost pros-btn-sm"
              disabled={busy}
              onClick={() => patch({ do_not_contact: !company.do_not_contact })}
            >
              {company.do_not_contact ? "Allow contact again" : "Mark do not contact"}
            </button>
            <button
              className="pros-btn pros-btn-ghost pros-btn-sm"
              disabled={busy}
              onClick={() => patch({ archived: !company.archived })}
            >
              {company.archived ? "Put back in the list" : "Archive (hide it)"}
            </button>
            <button
              className="pros-btn pros-btn-danger pros-btn-sm"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          </div>
          <div className="pros-tiny" style={{ marginTop: 10, lineHeight: 1.5 }}>
            Archiving hides it and keeps everything — find it again with “Show archived” in
            Filters. Deleting removes it and its notes for good.
            {company.is_seed
              ? " Because it came from the seeded catalog, the delete is remembered so it won't reappear on the next deploy — and it can be restored, empty, from the ⋯ menu."
              : ""}
          </div>
        </div>
      </div>

      {editing && (
        <Sheet title="Edit company details" onClose={() => setEditing(false)}>
          <CompanyForm
            company={company}
            meta={meta}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              setEditing(false);
              setData((d) => ({ ...d, company: { ...d.company, ...updated } }));
              onCompanyChange?.(updated);
            }}
          />
        </Sheet>
      )}

      {contactEdit && (
        <Sheet
          title={contactEdit.id ? "Edit contact" : "Add a contact"}
          onClose={() => setContactEdit(null)}
        >
          <ContactForm
            companyId={company.id}
            contact={contactEdit.id ? contactEdit : null}
            meta={meta}
            onCancel={() => setContactEdit(null)}
            onSaved={() => {
              setContactEdit(null);
              load();
            }}
            onDeleted={() => {
              setContactEdit(null);
              load();
            }}
          />
        </Sheet>
      )}

      {confirmDelete && (
        <Sheet title="Delete this company?" onClose={() => setConfirmDelete(false)}>
          <div className="pros-card">
            <p style={{ marginTop: 0, lineHeight: 1.6 }}>
              <strong>{company.name}</strong> and everything logged against it —{" "}
              {company.contact_count || 0} contact{company.contact_count === 1 ? "" : "s"} and{" "}
              {company.note_count || 0} note{company.note_count === 1 ? "" : "s"} — will be
              deleted.
              {company.is_seed
                ? " The catalog record itself can be restored later from the ⋯ menu, but the notes and contacts cannot."
                : " There is no undo."}
            </p>
            <p className="pros-muted" style={{ lineHeight: 1.6 }}>
              If you only want it out of the way, archive it instead — that keeps everything.
            </p>
            <div className="pros-row">
              <button
                className="pros-btn pros-btn-danger"
                onClick={async () => {
                  try {
                    await api.del(`/companies/${company.id}`);
                    onDeleted?.();
                  } catch (e) {
                    setError(e.message);
                    setConfirmDelete(false);
                  }
                }}
              >
                Delete it
              </button>
              <button
                className="pros-btn pros-btn-ghost"
                onClick={async () => {
                  setConfirmDelete(false);
                  await patch({ archived: true });
                  onBack();
                }}
              >
                Archive instead
              </button>
              <button className="pros-btn pros-btn-ghost" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}

/* Free-text notes with an explicit save, unlike everything else on this screen.
 * A textarea that writes on every keystroke would fire a PATCH per character;
 * one that writes on blur loses the paragraph when iOS Safari drops focus to
 * show the keyboard's autocomplete bar.
 *
 * The caller passes key={company.notes}, so a change from the server (another
 * device, or an edit through the company form) remounts this and resets the
 * draft. That is React's own answer to "reset state when a prop changes" — the
 * effect-plus-setState version of it is what react-hooks rejects. Typing does
 * not remount, because company.notes only moves when a save lands. */
function WorkingNotes({ company, onSave, busy }) {
  const [draft, setDraft] = useState(company.notes || "");

  const dirty = draft !== (company.notes || "");

  return (
    <div className="pros-field" style={{ marginBottom: 0 }}>
      <label className="pros-label-wrap">
        <span className="pros-label">Working notes</span>
        <textarea
          className="pros-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What matters about this one — banking relationships, timing, who knows whom."
        />
      </label>
      <div className="pros-row" style={{ marginTop: 8 }}>
        <button
          className="pros-btn pros-btn-sm"
          disabled={!dirty || busy}
          onClick={() => onSave(draft)}
        >
          {dirty ? "Save notes" : "Saved"}
        </button>
        {dirty && (
          <button className="pros-link" onClick={() => setDraft(company.notes || "")}>
            Discard
          </button>
        )}
      </div>
    </div>
  );
}

/* Logging a call is the thing she does most, so it is a card on the page rather
 * than a button that opens a form. Picking a kind other than "Note" is what makes
 * it a touch — the backend flips contacted and nudges the status forward, so she
 * never logs a call and then has to remember a dropdown. */
function LogTouch({ company, contacts, meta, onLogged }) {
  const [kind, setKind] = useState("call");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState(nowLocalInput);
  const [contactId, setContactId] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const kinds = meta?.noteKinds || ["call", "voicemail", "email", "text", "meeting", "note"];

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { company: updated } = await api.post(`/companies/${company.id}/notes`, {
        kind,
        body,
        occurred_at: when ? new Date(when).toISOString() : undefined,
        contact_id: contactId || undefined,
        next_follow_up_date: followUp || undefined,
      });
      setBody("");
      setFollowUp("");
      setWhen(nowLocalInput());
      setOpen(false);
      onLogged?.(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="pros-card">
        <div className="pros-between">
          <div className="pros-h2" style={{ marginBottom: 0 }}>
            Log a call or a note
          </div>
          <button className="pros-btn pros-btn-sm" onClick={() => setOpen(true)}>
            + Log
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pros-card">
      <div className="pros-h2">Log a call or a note</div>
      {error && <div className="pros-err">{error}</div>}
      <form onSubmit={submit}>
        <div className="pros-field">
          <span className="pros-label">What happened</span>
          <div className="pros-toggles">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                className="pros-toggle"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {KIND_ICON[k] || "📝"} {kindLabel(k)}
              </button>
            ))}
          </div>
        </div>

        <Field label="Notes">
          <textarea
            className="pros-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Who you got, what they said, what to do next."
          />
        </Field>

        <div className="pros-grid2">
          <Field label="When">
            <input
              className="pros-input"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </Field>
          <Field label="Follow up on">
            <input
              className="pros-input"
              type="date"
              value={followUp}
              min={todayYmd()}
              onChange={(e) => setFollowUp(e.target.value)}
            />
          </Field>
        </div>

        {contacts.length > 0 && (
          <Field label="Who you spoke to">
            <select
              className="pros-select"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">— nobody in particular —</option>
              {contacts.map((p) => (
                <option key={p.id} value={p.id}>
                  {contactName(p)}
                  {p.title ? ` — ${p.title}` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="pros-row">
          <button className="pros-btn" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save it"}
          </button>
          <button className="pros-btn pros-btn-ghost" type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
        {kind !== "note" && (
          <div className="pros-tiny" style={{ marginTop: 10, lineHeight: 1.5 }}>
            Saving this marks {company.name} contacted and moves the status forward if it hasn&apos;t
            been already.
          </div>
        )}
      </form>
    </div>
  );
}
