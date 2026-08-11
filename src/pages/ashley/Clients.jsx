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
  const load = useCallback(
    (isLive = () => true) => {
      const active = FILTERS.find((f) => f.key === filter) || FILTERS[0];
      const params = new URLSearchParams({ ...active.params, sort });
      if (query) params.set("q", query);
      return api
        .get(`/clients?${params.toString()}`)
        .then((data) => {
          if (!isLive()) return;
          setClients(data.clients);
          setError("");
        })
        .catch((e) => isLive() && setError(e.message));
    },
    [filter, sort, query]
  );

  /* Ignore a response whose filter is no longer the selected one: tapping
   * "Tier A" then "Moved" quickly could otherwise leave Tier A's rows sitting
   * under the Moved pill. */
  useEffect(() => {
    let live = true;
    load(() => live);
    return () => {
      live = false;
    };
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

      {/* Adding a client is a button in the content, beside the search box.
          It used to be a floating one pinned bottom-right, which Patrick found
          hard to find (2026-08-11): on a wide screen it sits in a corner nowhere
          near anything you were reading, and on a narrow one it covers the edge
          of whichever card is at the bottom. One button, where the eye already
          is, on every screen size. */}
      <div className="ash-search">
        <input
          className="ash-input"
          type="search"
          placeholder="Search companies or people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="ash-btn ash-addbtn"
          onClick={() => setCreating(true)}
        >
          + Add client
        </button>
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
          /* 16px, not 13: iOS Safari zooms the page when a focused control is
             under 16px, and the zoom does not undo itself. */
          style={{ width: "auto", padding: "10px", fontSize: 16, maxWidth: "62%", minHeight: 44 }}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>Sort: {s.label}</option>
          ))}
        </select>
      </div>

      {clients !== null && clients.length === 0 && (
        <div className="ash-card" style={{ textAlign: "center", padding: "26px 16px" }}>
          {query || filter !== "all" ? (
            <div className="ash-muted">Nothing matches. Try a different search or filter.</div>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1f4e79", marginBottom: 6 }}>
                No clients yet
              </div>
              <div className="ash-muted" style={{ marginBottom: 16 }}>
                Add them one at a time, or paste your whole list in at once from
                Settings → Import.
              </div>
              <button className="ash-btn" onClick={() => setCreating(true)}>
                + Add your first client
              </button>
            </>
          )}
        </div>
      )}

      {(clients || []).map((c) => (
        <ClientCard key={c.id} client={c} onOpen={() => setOpenId(c.id)} />
      ))}

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
