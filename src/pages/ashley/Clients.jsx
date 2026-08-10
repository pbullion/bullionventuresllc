import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import ClientDetail from "./ClientDetail.jsx";
import ClientForm from "./ClientForm.jsx";
import {
  daysAgoLabel,
  dueLabel,
  fmtMoneyShort,
  statusColor,
  statusLabel,
  tierColor,
} from "./ui.js";

/* The book. Search hits company names AND the people at them, so looking up
 * "Ruiz" finds the company whose CFO is Ruiz. */

const FILTERS = [
  { key: "all", label: "All", params: {} },
  { key: "uncontacted", label: "Not contacted", params: { uncontacted: "true" } },
  { key: "active", label: "In progress", params: { status: "active" } },
  { key: "moved", label: "Moved", params: { status: "moved" } },
  { key: "a", label: "Tier A", params: { tier: "A" } },
  { key: "b", label: "Tier B", params: { tier: "B" } },
  { key: "c", label: "Tier C", params: { tier: "C" } },
  { key: "archived", label: "Archived", params: { includeArchived: "true" } },
];

const SORTS = [
  { value: "tier", label: "Tier" },
  { value: "oldest_touch", label: "Longest since contact" },
  { value: "name", label: "Name" },
  { value: "loans", label: "Loan size" },
  { value: "deposits", label: "Deposit size" },
  { value: "status", label: "Status" },
];

export default function Clients({ meta, version, bump }) {
  const [clients, setClients] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("tier");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  /* State is set inside the promise callbacks rather than after an await: the
   * effect below calls load(), and react-hooks flags a setState that happens
   * synchronously in the call chain of an effect body. */
  const load = useCallback(() => {
    const active = FILTERS.find((f) => f.key === filter) || FILTERS[0];
    const params = new URLSearchParams({ ...active.params, sort });
    if (query) params.set("q", query);
    return api
      .get(`/clients?${params.toString()}`)
      .then((data) => {
        setClients(data.clients);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [filter, sort, query]);

  useEffect(() => {
    load();
  }, [load, version]);

  if (openId) {
    return (
      <ClientDetail
        clientId={openId}
        meta={meta}
        onBack={() => setOpenId(null)}
        onChanged={bump}
      />
    );
  }

  return (
    <>
      {error && <div className="ash-err">{error}</div>}

      <div className="ash-search">
        <input
          className="ash-input"
          type="search"
          placeholder="Search companies or people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="ash-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className="ash-pill"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="ash-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <span className="ash-tiny">
          {clients === null ? "Loading…" : `${clients.length} client${clients.length === 1 ? "" : "s"}`}
        </span>
        <select
          className="ash-select"
          style={{ width: "auto", padding: "7px 10px", fontSize: 13 }}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>Sort: {s.label}</option>
          ))}
        </select>
      </div>

      {clients !== null && clients.length === 0 && (
        <div className="ash-card">
          <div className="ash-muted">
            {query || filter !== "all"
              ? "Nothing matches. Try a different search or filter."
              : "No clients yet. Add one below, or paste your whole list in from Settings → Import."}
          </div>
        </div>
      )}

      {(clients || []).map((c) => (
        <ClientCard key={c.id} client={c} onOpen={() => setOpenId(c.id)} />
      ))}

      <button className="ash-fab" onClick={() => setCreating(true)}>+ Client</button>

      {creating && (
        <ClientForm
          meta={meta}
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            setCreating(false);
            bump();
            // Straight into the new client, because the next thing she needs is
            // to add the people at it.
            setOpenId(saved.id);
          }}
        />
      )}
    </>
  );
}

function ClientCard({ client, onOpen }) {
  const sc = statusColor(client.status);
  const tc = tierColor(client.tier);
  const cold = !client.contacted_since_departure;

  return (
    <div className="ash-card ash-card-tap" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="ash-between">
        <div className="ash-row" style={{ gap: 8, minWidth: 0, flex: 1 }}>
          <span className="ash-tierchip" style={{ background: tc.bg, color: tc.fg, borderColor: tc.border }}>
            {client.tier}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, overflowWrap: "anywhere" }}>
              {client.company_name}
              {client.archived && <span className="ash-tiny" style={{ marginLeft: 6 }}>(archived)</span>}
            </div>
            <div className="ash-tiny">
              {client.contact_count === 0
                ? "no contacts yet"
                : `${client.contact_count} ${client.contact_count === 1 ? "person" : "people"}`}
              {client.industry ? ` · ${client.industry}` : ""}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{fmtMoneyShort(client.loan_balance)}</div>
          <div className="ash-tiny">loans</div>
        </div>
      </div>

      <div className="ash-row" style={{ gap: 6, marginTop: 10 }}>
        <span className="ash-chip" style={{ background: sc.bg, color: sc.fg }}>
          {statusLabel(client.status)}
        </span>
        {cold ? (
          <span className="ash-chip" style={{ background: "#fdf2e0", color: "#8a5a10" }}>
            Not contacted
          </span>
        ) : (
          <span className="ash-tiny">last touch {daysAgoLabel(client.last_touch_at)}</span>
        )}
        {client.next_follow_up_date && (
          <span className="ash-chip" style={{ background: "#e6f0fa", color: "#1f4e79" }}>
            {dueLabel(client.next_follow_up_date)}
          </span>
        )}
      </div>
    </div>
  );
}
