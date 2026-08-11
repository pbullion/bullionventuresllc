import { useEffect, useState } from "react";
import { api } from "./api.js";
import {
  channelLabel,
  CHANNEL_ICON,
  contactName,
  daysAgoLabel,
  fmtDate,
  fmtMoneyShort,
  outcomeLabel,
  statusColor,
  statusLabel,
  tierColor,
} from "./ui.js";

/* "How is the move going" — the screen that answers whether anyone has been
 * missed. Everything on it is measured from the departure date in Settings:
 * "contacted" means contacted SINCE she left, not ever. */
export default function Dashboard({ version, onGoToClients }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    api
      .get("/dashboard")
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [version]);

  if (error) return <div className="ash-err">{error}</div>;
  if (!data) return <div className="ash-muted" style={{ padding: "24px 2px" }}>Loading…</div>;

  const t = data.totals;
  const pct = t.total_clients ? Math.round((t.contacted / t.total_clients) * 100) : 0;

  if (!t.total_clients) {
    return (
      <div className="ash-card ash-empty">
        <div className="ash-h2">Nothing here yet</div>
        <p className="ash-muted">
          Add your clients on the Clients tab — or paste your whole list in at once
          from Settings → Import.
        </p>
        <button className="ash-btn" onClick={onGoToClients}>
          Add your first client
        </button>
      </div>
    );
  }

  return (
    <>
      {!data.departureDate && (
        <div className="ash-card" style={{ background: "#fdf7e8", borderColor: "#f0e0b8" }}>
          <strong style={{ fontSize: 14 }}>Set your departure date</strong>
          <div className="ash-muted" style={{ marginTop: 4 }}>
            Until you set it in Settings, every call ever logged counts as
            &ldquo;contacted&rdquo; — with it, this page only counts outreach since
            your last day.
          </div>
        </div>
      )}

      <div className="ash-card">
        <div className="ash-between">
          <div className="ash-h2" style={{ marginBottom: 4 }}>Reached since you left</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ash-blue-dark)" }}>{pct}%</div>
        </div>
        <div className="ash-bar">
          <div className="ash-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="ash-muted" style={{ marginTop: 7 }}>
          {t.contacted} of {t.total_clients} clients contacted
          {data.departureDate ? ` since ${fmtDate(data.departureDate)}` : ""}
          {t.total_clients - t.contacted > 0 && (
            <> &middot; <strong>{t.total_clients - t.contacted} still untouched</strong></>
          )}
        </div>
      </div>

      <div className="ash-stats" style={{ marginBottom: 12 }}>
        <Stat n={t.moved} label="Moved over" />
        <Stat n={t.total_clients - t.moved - t.closed_lost} label="In progress" />
        <Stat n={t.closed_lost} label="Not coming" />
        <Stat n={data.followUps.overdue} label="Overdue" alert={data.followUps.overdue > 0} />
      </div>

      {/* Dollars follow the relationships, and this is the number she'll be asked
          for at the new bank. */}
      <div className="ash-card">
        <div className="ash-h2">Balances</div>
        <div className="ash-scroll-x">
          <table className="ash-table">
            <thead>
              <tr><th /><th>Whole book</th><th>Moved over</th></tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: "#6b7785" }}>Loans</td>
                <td style={{ fontWeight: 700 }}>{fmtMoneyShort(t.total_loans)}</td>
                <td style={{ fontWeight: 700, color: "#1e7a35" }}>{fmtMoneyShort(t.moved_loans)}</td>
              </tr>
              <tr>
                <td style={{ color: "#6b7785" }}>Deposits</td>
                <td style={{ fontWeight: 700 }}>{fmtMoneyShort(t.total_deposits)}</td>
                <td style={{ fontWeight: 700, color: "#1e7a35" }}>{fmtMoneyShort(t.moved_deposits)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="ash-card">
        <div className="ash-h2">By tier</div>
        {data.byTier.map((row) => {
          const tc = tierColor(row.tier);
          const p = row.n ? Math.round((row.contacted / row.n) * 100) : 0;
          return (
            <div key={row.tier} style={{ marginBottom: 10 }}>
              <div className="ash-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                <span className="ash-row" style={{ gap: 7 }}>
                  <span
                    className="ash-tierchip"
                    style={{ background: tc.bg, color: tc.fg, borderColor: tc.border }}
                  >
                    {row.tier}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {row.contacted} of {row.n} contacted
                  </span>
                </span>
                <span className="ash-tiny">{p}%</span>
              </div>
              <div className="ash-bar" style={{ height: 7 }}>
                <div className="ash-bar-fill" style={{ width: `${p}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="ash-card">
        <div className="ash-h2">Where everyone stands</div>
        {data.byStatus
          .slice()
          .sort((a, b) => b.n - a.n)
          .map((s) => {
            const c = statusColor(s.status);
            return (
              <div
                key={s.status}
                className="ash-row"
                style={{ justifyContent: "space-between", padding: "5px 0" }}
              >
                <span className="ash-chip" style={{ background: c.bg, color: c.fg }}>
                  {statusLabel(s.status)}
                </span>
                <strong style={{ fontSize: 15 }}>{s.n}</strong>
              </div>
            );
          })}
      </div>

      {data.nextUp.length > 0 && (
        <div className="ash-card">
          <div className="ash-h2">Nobody has called these yet</div>
          <div className="ash-muted" style={{ marginTop: -4, marginBottom: 10 }}>
            Highest tier first, then biggest loan balance.
          </div>
          {data.nextUp.map((c) => {
            const tc = tierColor(c.tier);
            return (
              <div
                key={c.id}
                className="ash-row"
                style={{ justifyContent: "space-between", padding: "7px 0", borderTop: "1px solid #eef1f5" }}
              >
                <span className="ash-row" style={{ gap: 8, minWidth: 0 }}>
                  <span
                    className="ash-tierchip"
                    style={{ background: tc.bg, color: tc.fg, borderColor: tc.border }}
                  >
                    {c.tier}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.display_name || c.company_name}
                  </span>
                </span>
                <span className="ash-tiny" style={{ whiteSpace: "nowrap" }}>
                  {fmtMoneyShort(c.loan_balance)}
                  {c.contact_count === 0 && " · no contacts"}
                </span>
              </div>
            );
          })}
          <button className="ash-btn ash-btn-ghost ash-btn-block" style={{ marginTop: 12 }} onClick={onGoToClients}>
            Open the client list
          </button>
        </div>
      )}

      {data.recentActivity.length > 0 && (
        <div className="ash-card">
          <div className="ash-h2">Latest activity</div>
          <ul className="ash-timeline">
            {data.recentActivity.map((o) => (
              <li key={o.id} className="ash-tl-item">
                <span className="ash-tl-icon">{CHANNEL_ICON[o.channel] || "📌"}</span>
                <div className="ash-tl-body">
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{o.display_name || o.company_name}</div>
                  <div className="ash-muted">
                    {channelLabel(o.channel)} &middot; {outcomeLabel(o.outcome)}
                    {contactName(o) && ` · ${contactName(o)}`}
                  </div>
                  <div className="ash-tiny">{daysAgoLabel(o.occurred_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Stat({ n, label, alert }) {
  return (
    <div className="ash-stat" style={alert ? { borderColor: "#f0cdc8", background: "#fdf6f5" } : undefined}>
      <div className="ash-stat-n" style={alert ? { color: "#a33328" } : undefined}>{n}</div>
      <div className="ash-stat-l">{label}</div>
    </div>
  );
}
