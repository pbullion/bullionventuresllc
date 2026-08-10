import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import ClientDetail from "./ClientDetail.jsx";
import {
  channelLabel,
  CHANNEL_ICON,
  contactName,
  dueLabel,
  fmtDate,
  outcomeLabel,
  telHref,
  tierColor,
} from "./ui.js";

/* Everything she promised to circle back on, oldest promise first. A follow-up is
 * an outreach row carrying a next_follow_up_date, so each item here still shows
 * the conversation that created it — you can see what you said you'd do before
 * you pick up the phone. */

const RANGES = [
  { days: 0, label: "Due now" },
  { days: 7, label: "Next 7 days" },
  { days: 30, label: "Next 30 days" },
  { days: 3650, label: "Everything" },
];

export default function FollowUps({ meta, version, bump }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [openId, setOpenId] = useState(null);

  /* setState lives in the promise callbacks, not after an await — the effect
   * below calls load(), and react-hooks rejects a setState reached
   * synchronously from an effect body. */
  const load = useCallback(
    () =>
      api
        .get(`/follow-ups?days=${days}`)
        .then((data) => {
          setItems(data.followUps);
          setError("");
        })
        .catch((e) => setError(e.message)),
    [days]
  );

  useEffect(() => {
    load();
  }, [load, version]);

  async function markDone(id) {
    // Drop it locally first so the tap feels instant, then resync the counts.
    setItems((list) => (list || []).filter((i) => i.id !== id));
    await api.post(`/outreach/${id}/follow-up-done`, { done: true });
    bump();
  }

  if (openId) {
    return (
      <ClientDetail clientId={openId} meta={meta} onBack={() => setOpenId(null)} onChanged={bump} />
    );
  }

  const overdue = (items || []).filter((i) => i.overdue);
  const upcoming = (items || []).filter((i) => !i.overdue);

  return (
    <>
      {error && <div className="ash-err">{error}</div>}

      <div className="ash-filters">
        {RANGES.map((r) => (
          <button
            key={r.days}
            className="ash-pill"
            aria-pressed={days === r.days}
            onClick={() => setDays(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {items === null && <div className="ash-muted" style={{ padding: "20px 2px" }}>Loading…</div>}

      {items !== null && items.length === 0 && (
        <div className="ash-card">
          <div className="ash-h2">Nothing outstanding</div>
          <div className="ash-muted">
            When you log a call, set a follow-up date and it shows up here until you
            check it off.
          </div>
        </div>
      )}

      {overdue.length > 0 && (
        <>
          <div className="ash-h2" style={{ color: "#a33328", marginTop: 4 }}>
            Overdue ({overdue.length})
          </div>
          {overdue.map((i) => (
            <FollowUpCard key={i.id} item={i} onDone={() => markDone(i.id)} onOpen={() => setOpenId(i.client_id)} />
          ))}
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <div className="ash-h2" style={{ marginTop: overdue.length ? 18 : 4 }}>
            Coming up ({upcoming.length})
          </div>
          {upcoming.map((i) => (
            <FollowUpCard key={i.id} item={i} onDone={() => markDone(i.id)} onOpen={() => setOpenId(i.client_id)} />
          ))}
        </>
      )}
    </>
  );
}

function FollowUpCard({ item, onDone, onOpen }) {
  const tc = tierColor(item.tier);
  const phone = item.phone_mobile || item.phone_office;

  return (
    <div className="ash-card" style={item.overdue ? { borderColor: "#f0cdc8" } : undefined}>
      <div className="ash-between">
        <div className="ash-row" style={{ gap: 8, minWidth: 0 }}>
          <span className="ash-tierchip" style={{ background: tc.bg, color: tc.fg, borderColor: tc.border }}>
            {item.tier}
          </span>
          <div style={{ minWidth: 0 }}>
            <button
              className="ash-link"
              style={{ fontSize: 15, fontWeight: 700, textDecoration: "none", padding: 0, textAlign: "left" }}
              onClick={onOpen}
            >
              {item.company_name}
            </button>
            {contactName(item) && (
              <div className="ash-tiny">
                {contactName(item)}
                {item.title ? `, ${item.title}` : ""}
              </div>
            )}
          </div>
        </div>
        <span
          className="ash-chip"
          style={
            item.overdue
              ? { background: "#fdeceb", color: "#9c3128" }
              : { background: "#e6f0fa", color: "#1f4e79" }
          }
        >
          {dueLabel(item.next_follow_up_date)}
        </span>
      </div>

      <div className="ash-tiny" style={{ marginTop: 9 }}>
        Set after: {CHANNEL_ICON[item.channel] || "📌"} {channelLabel(item.channel)} ·{" "}
        {outcomeLabel(item.outcome)} on {fmtDate(String(item.occurred_at).slice(0, 10))}
      </div>
      {item.notes && (
        <div style={{ fontSize: 13, marginTop: 6, whiteSpace: "pre-wrap", color: "#3a4652" }}>{item.notes}</div>
      )}

      <div className="ash-actions">
        {phone && <a className="ash-iconbtn" href={telHref(phone)}>📞 Call</a>}
        {phone && <a className="ash-iconbtn" href={`sms:${phone.replace(/[^\d+]/g, "")}`}>💬 Text</a>}
        {item.email && <a className="ash-iconbtn" href={`mailto:${item.email}`}>✉️ Email</a>}
        <button className="ash-iconbtn" onClick={onOpen}>📂 Open client</button>
        <button className="ash-iconbtn" style={{ borderColor: "#bfe0c7", color: "#1e7a35" }} onClick={onDone}>
          ✓ Done
        </button>
      </div>
    </div>
  );
}
