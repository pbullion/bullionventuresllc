import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, getCode, setCode, setUnauthorizedHandler } from "./api.js";
import {
  PROS_CSS,
  REVENUE_BANDS,
  areaFor,
  contactName,
  dueLabel,
  daysAgoLabel,
  fmtDate,
  mailHref,
  mapsHref,
  matchesBand,
  TARGET_BAND,
  priorityColor,
  prettyHost,
  revenueLabel,
  statusColor,
  statusLabel,
  telHref,
  withProtocol,
  BASIS_LABEL,
} from "./ui.js";
import Sheet, { Field, MultiToggle } from "./Sheet.jsx";
import CompanyDetail from "./CompanyDetail.jsx";
import CompanyForm from "./CompanyForm.jsx";
import Importer from "./Importer.jsx";

/* /prospects — a commercial banker's Houston C&I calling list.
 *
 * Separate from /ashley on purpose. That page is her existing book and the
 * question is "have I moved this relationship". This one is the market: every
 * C&I operating company in greater Houston over roughly $50M of revenue, and
 * the question is "who do I call next, and what do I know before I dial".
 *
 * Unlisted like /ashley — no home page card, not in PrivateTools — but unlike
 * /ashley it has NO LOGIN (Patrick's call, 2026-08-13). Anyone who reaches the
 * URL can read and edit the book. The catalog itself is public information; what
 * is hers is the overlay of statuses, notes and contacts on top of it. Setting
 * PROSPECTS_ACCESS_CODE on the backend turns on a shared-code gate with no
 * frontend change.
 *
 * Built for a phone first. She works this list between meetings, so every phone
 * number, email, address and website is a real tel:/mailto:/maps/https link, the
 * search box lives inside the sticky header, and nothing needed to log a call is
 * more than two taps away. */

const SORTS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "revenue", label: "Revenue (high → low)" },
  { value: "priority", label: "Priority (A first)" },
  { value: "stale", label: "Longest since contact" },
  { value: "followup", label: "Follow-up date" },
  { value: "updated", label: "Recently updated" },
];

const FILTER_KEY = "pros_filters";

// "Clear all filters" means all of them, including the default band.
const EMPTY_FILTERS = {
  q: "",
  sectors: [],
  areas: [],
  bands: [],
  statuses: [],
  quick: [],
  sort: "name",
  // Archived companies ride along in the same payload and are filtered out here,
  // so unarchiving is possible without a second endpoint or a page reload.
  showArchived: false,
};

/* What she sees the first time, before she has touched anything: scoped to the
 * $50–100M band she actually prospects (Patrick, 2026-08-13).
 *
 * Worth knowing while reading the empty state: the seeded catalog was built to a
 * ">$50M" brief and skews large, so only ~22 of its 184 records overlap this
 * band and none sit wholly inside it — a company's revenue is only publicly
 * knowable when it is big enough to file. Real coverage of $50–100M comes from
 * importing a list; that is what the importer is for. */
const DEFAULT_FILTERS = { ...EMPTY_FILTERS, bands: [TARGET_BAND] };

// Quick chips, in the order they appear under the search box. Each is a
// predicate over one company plus today's date — kept here so the chip, its
// count and the filter can never disagree.
const QUICK = [
  {
    key: "untouched",
    label: "Not contacted",
    test: (c) => !c.contacted && !c.last_touch_at,
  },
  {
    key: "due",
    label: "Follow-up due",
    test: (c) => c.open_follow_up && dueLabel(c.open_follow_up).tone !== "later",
  },
  { key: "working", label: "In play", test: (c) => c.contacted && !isClosed(c.status) },
  { key: "a", label: "A priority", test: (c) => c.priority === "A" },
  { key: "target", label: "$50–100M", test: (c) => matchesBand(c, TARGET_BAND) },
  { key: "notes", label: "Has notes", test: (c) => Boolean(c.notes) || c.note_count > 0 },
];

const isClosed = (status) => ["won", "lost", "not_a_fit"].includes(status);

export default function Prospects() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [meta, setMeta] = useState(null);
  const [companies, setCompanies] = useState(null); // null until first load
  const [error, setError] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState("");

  const [filters, setFilters] = useState(() => {
    /* Filters survive a reload. She narrows to "Not contacted, middle market,
     * northwest side", calls three companies, and gets her working set back
     * instead of re-picking it — which on a phone is a dozen taps. */
    try {
      const saved = JSON.parse(window.localStorage.getItem(FILTER_KEY) || "null");
      return saved ? { ...EMPTY_FILTERS, ...saved } : DEFAULT_FILTERS;
    } catch {
      return DEFAULT_FILTERS;
    }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
    } catch {
      /* Private mode, or a full quota. Losing saved filters is not worth an
         error message. */
    }
  }, [filters]);

  useEffect(() => {
    document.title = "Houston C&I Prospects";
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setNeedCode(true));
    return () => setUnauthorizedHandler(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get("/companies?archived=true");
      setCompanies(data.companies || []);
      setError("");
    } catch (e) {
      // A 401 is the code gate, not a failure worth an error banner — the
      // handler above has already flipped to the prompt.
      if (e.status !== 401) setError(e.message);
      setCompanies([]);
    }
  }, []);

  useEffect(() => {
    api
      .get("/meta")
      .then((m) => {
        setMeta(m);
        if (m?.codeRequired && !getCode()) setNeedCode(true);
        else load();
      })
      .catch(() => {
        setMeta(null);
        load();
      });
  }, [load]);

  // Applied by both the detail screen and the quick actions, so one PATCH keeps
  // the list behind the detail in sync without a refetch of all 184 rows.
  const patchLocal = useCallback((company) => {
    setCompanies((prev) =>
      (prev || []).map((c) => (c.id === company.id ? { ...c, ...company } : c))
    );
  }, []);

  const sectors = useMemo(
    () => [...new Set((companies || []).map((c) => c.sector).filter(Boolean))].sort(),
    [companies]
  );
  const areas = useMemo(
    () => [...new Set((companies || []).map((c) => areaFor(c.city)))].sort(),
    [companies]
  );

  /* One pass, and the quick-chip counts come from the SAME predicate the chip
   * filters with — computed against everything else that is on, so a count never
   * promises rows that are about to be filtered out by another chip. */
  const { visible, quickCounts } = useMemo(() => {
    const all = companies || [];
    const needle = filters.q.trim().toLowerCase();

    const passesExceptQuick = (c, exclude) => {
      if (c.archived && !filters.showArchived) return false;
      if (needle) {
        const hay = [
          c.name,
          c.dba,
          c.industry,
          c.sector,
          c.city,
          c.ticker,
          c.parent_company,
          c.description,
          c.notes,
          c.referred_by,
          ...(c.contacts || []).map((p) => `${contactName(p)} ${p.title}`),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (filters.sectors.length && !filters.sectors.includes(c.sector)) return false;
      if (filters.areas.length && !filters.areas.includes(areaFor(c.city))) return false;
      if (filters.bands.length && !filters.bands.some((b) => matchesBand(c, b))) return false;
      if (filters.statuses.length && !filters.statuses.includes(c.status)) return false;
      for (const key of filters.quick) {
        if (key === exclude) continue;
        const q = QUICK.find((x) => x.key === key);
        if (q && !q.test(c)) return false;
      }
      return true;
    };

    const counts = {};
    for (const q of QUICK) {
      counts[q.key] = all.filter((c) => passesExceptQuick(c, q.key) && q.test(c)).length;
    }

    const rows = all.filter((c) => passesExceptQuick(c, null));

    const revOf = (c) => Number(c.revenue_high ?? c.revenue_low ?? 0);
    rows.sort((a, b) => {
      switch (filters.sort) {
        case "revenue":
          return revOf(b) - revOf(a) || a.name.localeCompare(b.name);
        case "priority":
          return a.priority.localeCompare(b.priority) || a.name.localeCompare(b.name);
        case "stale":
          /* Never contacted sorts FIRST, not last — an empty last_touch_at is
             the most stale a prospect can be, and treating it as "no date" would
             bury exactly the rows this sort exists to surface. */
          return (
            (a.last_touch_at ? Date.parse(a.last_touch_at) : -Infinity) -
              (b.last_touch_at ? Date.parse(b.last_touch_at) : -Infinity) ||
            a.name.localeCompare(b.name)
          );
        case "followup":
          // Rows with no follow-up go to the bottom rather than sorting as 1970.
          return (
            (a.open_follow_up || "9999-12-31").localeCompare(b.open_follow_up || "9999-12-31") ||
            a.name.localeCompare(b.name)
          );
        case "updated":
          return Date.parse(b.updated_at || 0) - Date.parse(a.updated_at || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return { visible: rows, quickCounts: counts };
  }, [companies, filters]);

  const stats = useMemo(() => {
    // Archived rows are out of the book, so they are out of the counts too.
    const all = (companies || []).filter((c) => !c.archived);
    return {
      total: all.length,
      contacted: all.filter((c) => c.contacted).length,
      inPlay: all.filter((c) => c.contacted && !isClosed(c.status)).length,
      due: all.filter((c) => c.open_follow_up && dueLabel(c.open_follow_up).tone !== "later").length,
      won: all.filter((c) => c.status === "won").length,
    };
  }, [companies]);

  const toggleQuick = (key) =>
    setFilters((f) => ({
      ...f,
      quick: f.quick.includes(key) ? f.quick.filter((k) => k !== key) : [...f.quick, key],
    }));

  const activeFilterCount =
    filters.sectors.length + filters.areas.length + filters.bands.length + filters.statuses.length;

  // ── The code gate, when the backend has one ────────────────────────────────
  if (needCode) {
    return (
      <div className="pros-root">
        <style>{PROS_CSS}</style>
        <div className="pros-shell" style={{ maxWidth: 420, paddingTop: 48 }}>
          <div className="pros-card">
            <div className="pros-h2">Houston C&amp;I Prospects</div>
            <p className="pros-muted" style={{ marginTop: 0, lineHeight: 1.55 }}>
              This list is behind an access code.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!codeDraft.trim()) return;
                setCode(codeDraft.trim());
                setNeedCode(false);
                setCodeDraft("");
                load();
              }}
            >
              <Field label="Access code">
                <input
                  className="pros-input"
                  type="password"
                  value={codeDraft}
                  onChange={(e) => setCodeDraft(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </Field>
              <button className="pros-btn pros-btn-block" type="submit">
                Open the list
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── One company ───────────────────────────────────────────────────────────
  if (slug) {
    return (
      <div className="pros-root">
        <style>{PROS_CSS}</style>
        <CompanyDetail
          slug={slug}
          meta={meta}
          onBack={() => navigate("/prospects")}
          onCompanyChange={patchLocal}
          onDeleted={() => {
            load();
            navigate("/prospects");
          }}
        />
      </div>
    );
  }

  // ── The list ──────────────────────────────────────────────────────────────
  return (
    <div className="pros-root">
      <style>{PROS_CSS}</style>

      <div className="pros-top">
        <div className="pros-top-in">
          <div className="pros-top-row">
            <div style={{ minWidth: 0 }}>
              <div className="pros-brand">Houston C&amp;I Prospects</div>
              <div className="pros-sub">
                {companies === null
                  ? "Loading…"
                  : `${stats.total} companies · ${stats.contacted} contacted · ${stats.due} due`}
              </div>
            </div>
            <div className="pros-row" style={{ gap: 6, flexWrap: "nowrap" }}>
              <button className="pros-icon-btn" onClick={() => setShowAdd(true)}>
                + Add
              </button>
              <button
                className="pros-icon-btn"
                onClick={() => setShowMore(true)}
                aria-label="More options"
              >
                ⋯
              </button>
            </div>
          </div>

          <div className="pros-search-wrap">
            <input
              className="pros-search"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search name, industry, city, contact…"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
            />
            {filters.q && (
              <button
                className="pros-search-clear"
                onClick={() => setFilters((f) => ({ ...f, q: "" }))}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="pros-quick">
            <button
              className="pros-quick-chip"
              aria-pressed={activeFilterCount > 0}
              onClick={() => setShowFilters(true)}
            >
              ⚙ Filters
              {activeFilterCount > 0 && <span className="pros-quick-count">{activeFilterCount}</span>}
            </button>
            {QUICK.map((q) => (
              <button
                key={q.key}
                className="pros-quick-chip"
                aria-pressed={filters.quick.includes(q.key)}
                onClick={() => toggleQuick(q.key)}
              >
                {q.label}
                <span className="pros-quick-count">{quickCounts[q.key] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pros-shell">
        {error && <div className="pros-err">{error}</div>}

        {companies !== null && companies.length > 0 && (
          <div className="pros-stats">
            <StatTile n={stats.total} label="In the list" onClick={() => setFilters(EMPTY_FILTERS)} />
            <StatTile
              n={stats.due}
              label="Follow-ups due"
              pressed={filters.quick.includes("due")}
              onClick={() => toggleQuick("due")}
            />
            <StatTile
              n={stats.inPlay}
              label="In play"
              pressed={filters.quick.includes("working")}
              onClick={() => toggleQuick("working")}
            />
            <StatTile
              n={stats.total - stats.contacted}
              label="Never called"
              pressed={filters.quick.includes("untouched")}
              onClick={() => toggleQuick("untouched")}
            />
          </div>
        )}

        <div className="pros-bar">
          <div className="pros-count">
            {companies === null
              ? " "
              : `${visible.length} of ${stats.total}${
                  visible.length !== stats.total ? " shown" : ""
                }`}
          </div>
          <div className="pros-sort">
            <label className="pros-tiny" htmlFor="pros-sort-sel">
              Sort
            </label>
            <select
              id="pros-sort-sel"
              className="pros-select"
              style={{ width: "auto", minHeight: 40, fontSize: 13, padding: "8px 10px" }}
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {companies === null && <div className="pros-card pros-empty">Loading the list…</div>}

        {companies !== null && companies.length === 0 && !error && (
          <div className="pros-card pros-empty">
            <div className="pros-h2">Nothing here yet</div>
            <p>
              The Houston catalog is seeded on the backend. If this is empty, the backend hasn&apos;t
              been deployed yet — or you can add companies by hand or import a list.
            </p>
            <div className="pros-row" style={{ justifyContent: "center" }}>
              <button className="pros-btn" onClick={() => setShowAdd(true)}>
                Add a company
              </button>
              <button className="pros-btn pros-btn-ghost" onClick={() => setShowImport(true)}>
                Import a list
              </button>
            </div>
          </div>
        )}

        {companies !== null && companies.length > 0 && visible.length === 0 && (
          <div className="pros-card pros-empty">
            <div className="pros-h2">No matches</div>
            <p>Nothing in the list fits those filters.</p>
            <button className="pros-btn pros-btn-ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear all filters
            </button>
          </div>
        )}

        {visible.map((c) => (
          <CompanyCard
            key={c.id}
            c={c}
            onOpen={() => navigate(`/prospects/${c.slug}`)}
            onQuickContacted={async () => {
              try {
                const { company } = await api.patch(`/companies/${c.id}`, { contacted: !c.contacted });
                patchLocal({ ...company, contacts: c.contacts });
              } catch (e) {
                setError(e.message);
              }
            }}
          />
        ))}

        {visible.length > 0 && (
          <div className="pros-tiny" style={{ textAlign: "center", marginTop: 18, lineHeight: 1.6 }}>
            Revenue figures are bands — “reported” comes from a public filing, “estimated” is a
            rough outside guess for a private company. Confirm before you quote one.
          </div>
        )}
      </div>

      {showFilters && (
        <Sheet title="Filters" onClose={() => setShowFilters(false)}>
          <div className="pros-card">
            <div className="pros-h2">Sector</div>
            <MultiToggle
              options={sectors}
              selected={filters.sectors}
              onChange={(v) => setFilters((f) => ({ ...f, sectors: v }))}
            />
          </div>
          <div className="pros-card">
            <div className="pros-h2">Part of town</div>
            <MultiToggle
              options={areas}
              selected={filters.areas}
              onChange={(v) => setFilters((f) => ({ ...f, areas: v }))}
            />
          </div>
          <div className="pros-card">
            <div className="pros-h2">Revenue</div>
            <MultiToggle
              options={REVENUE_BANDS.map((b) => ({ value: b.key, label: b.label }))}
              selected={filters.bands}
              onChange={(v) => setFilters((f) => ({ ...f, bands: v }))}
            />
            <div className="pros-tiny" style={{ marginTop: 8, lineHeight: 1.5 }}>
              A company shows up in every band its estimate overlaps — an estimate of $200M–600M is
              in both of the first two, because that is genuinely how precise the number is.
            </div>
          </div>
          <div className="pros-card">
            <div className="pros-h2">Status</div>
            <MultiToggle
              options={(meta?.statuses || []).map((s) => ({ value: s, label: statusLabel(s) }))}
              selected={filters.statuses}
              onChange={(v) => setFilters((f) => ({ ...f, statuses: v }))}
            />
          </div>
          <div className="pros-card">
            <div className="pros-h2">Archived</div>
            <MultiToggle
              options={[{ value: "yes", label: "Show archived companies" }]}
              selected={filters.showArchived ? ["yes"] : []}
              onChange={(v) => setFilters((f) => ({ ...f, showArchived: v.length > 0 }))}
            />
            <div className="pros-tiny" style={{ marginTop: 8, lineHeight: 1.5 }}>
              Archiving hides a company without losing anything. Turn this on to find one and put
              it back.
            </div>
          </div>
          <div className="pros-row">
            <button className="pros-btn" onClick={() => setShowFilters(false)}>
              Show {visible.length}
            </button>
            <button
              className="pros-btn pros-btn-ghost"
              onClick={() => setFilters((f) => ({ ...EMPTY_FILTERS, q: f.q, sort: f.sort }))}
            >
              Clear
            </button>
          </div>
        </Sheet>
      )}

      {showAdd && (
        <Sheet title="Add a company" onClose={() => setShowAdd(false)}>
          <CompanyForm
            meta={meta}
            onCancel={() => setShowAdd(false)}
            onSaved={(company) => {
              setShowAdd(false);
              load();
              navigate(`/prospects/${company.slug}`);
            }}
          />
        </Sheet>
      )}

      {showImport && (
        <Sheet title="Import a list" onClose={() => setShowImport(false)}>
          <Importer
            onClose={() => setShowImport(false)}
            onImported={() => {
              setShowImport(false);
              load();
            }}
          />
        </Sheet>
      )}

      {showMore && (
        <Sheet title="More" onClose={() => setShowMore(false)}>
          <div className="pros-card">
            <div className="pros-h2">Add companies</div>
            <div className="pros-row">
              <button
                className="pros-btn pros-btn-ghost"
                onClick={() => {
                  setShowMore(false);
                  setShowImport(true);
                }}
              >
                Import CSV / paste
              </button>
            </div>
          </div>
          <DeletedList onRestored={load} />
          <div className="pros-card">
            <div className="pros-h2">Download</div>
            <p className="pros-muted" style={{ marginTop: 0 }}>
              Everything, as a spreadsheet.
            </p>
            <div className="pros-row">
              {["companies", "contacts", "notes"].map((t) => (
                <button
                  key={t}
                  className="pros-btn pros-btn-ghost pros-btn-sm"
                  onClick={() => api.downloadCsv(t).catch((e) => setError(e.message))}
                >
                  {t}.csv
                </button>
              ))}
            </div>
          </div>
          <div className="pros-card">
            <div className="pros-h2">About this list</div>
            <p className="pros-muted" style={{ marginTop: 0, lineHeight: 1.6 }}>
              {meta?.seed?.loaded
                ? `${meta.seed.loaded} Houston-area C&I companies were seeded from a committed
                   catalog — operating companies over roughly $50M of revenue, banks and real
                   estate deliberately left out.`
                : "The catalog is seeded on the backend."}{" "}
              Revenue is a band, not audited data. No direct emails or cell numbers were
              pre-filled: a plausible wrong number is worse than a blank one, so each company
              carries research links instead — and anything you confirm, you add yourself.
            </p>
            <div className="pros-warn">
              <strong>On the $50–100M target:</strong> that band is mostly private companies that
              never publish a revenue figure, so a catalog built from public sources can&apos;t
              cover it — only about 22 of these {meta?.seed?.loaded || 184} records even overlap
              it, and the rest of the list runs larger. For real coverage of $50–100M, import a
              list (a purchased file, or the Business Journal&apos;s Book of Lists) and the whole
              screen works the same on it.
            </div>
            {meta && !meta.codeRequired && (
              <div className="pros-warn" style={{ marginBottom: 0 }}>
                This page has no login. Anyone with the URL can read and edit these notes.
              </div>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* Catalog companies she has deleted, with a way back.
 *
 * Deleting a seeded company writes a tombstone so the seeder stops re-inserting
 * it — which is what makes the delete stick across deploys, and also what would
 * make it permanent and unrecoverable without this. Only the catalog record comes
 * back; the notes and contacts that hung off the deleted row are gone. Loads
 * lazily, because the common case is an empty list nobody needs to see. */
function DeletedList({ onRestored }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api
      .get("/deleted")
      .then((d) => setRows(d.deleted || []))
      .catch(() => setRows([]));
  }, []);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="pros-card">
      <div className="pros-h2">Deleted from the catalog</div>
      {error && <div className="pros-err">{error}</div>}
      <p className="pros-muted" style={{ marginTop: 0, lineHeight: 1.55 }}>
        These stay out of the list, including after a redeploy. Putting one back restores the
        catalog record only — its old notes and contacts are gone.
      </p>
      {rows.map((r) => (
        <div className="pros-person" key={r.slug}>
          <div className="pros-between">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 650 }}>{r.name || r.slug}</div>
              <div className="pros-tiny">deleted {fmtDate(r.deleted_at)}</div>
            </div>
            <button
              className="pros-btn pros-btn-ghost pros-btn-sm"
              disabled={busy === r.slug}
              onClick={async () => {
                setBusy(r.slug);
                try {
                  await api.post(`/deleted/${encodeURIComponent(r.slug)}/restore`);
                  setRows((prev) => prev.filter((x) => x.slug !== r.slug));
                  onRestored?.();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy("");
                }
              }}
            >
              {busy === r.slug ? "…" : "Put back"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatTile({ n, label, onClick, pressed }) {
  return (
    <button className="pros-stat" onClick={onClick} aria-pressed={pressed ? "true" : undefined}>
      <div className="pros-stat-n">{n}</div>
      <div className="pros-stat-l">{label}</div>
    </button>
  );
}

function CompanyCard({ c, onOpen, onQuickContacted }) {
  const status = statusColor(c.status);
  const prio = priorityColor(c.priority);
  const due = dueLabel(c.open_follow_up);
  const rev = revenueLabel(c);
  const primary = (c.contacts || []).find((p) => p.is_primary) || (c.contacts || [])[0];
  const phone = c.phone || primary?.phone_office || primary?.phone_mobile || "";
  const email = c.email || primary?.email || "";

  /* The card body opens the company; the action row does not. Without
     stopPropagation, tapping "Call" also pushed the detail route, so she came off
     the phone call to a screen she never asked for. */
  const stop = (e) => e.stopPropagation();

  return (
    <div className="pros-card pros-card-tap" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="pros-between">
        {/* nowrap: with wrapping on, a long name pushed itself onto the line
            BELOW the priority badge, so cards in the same list didn't line up. */}
        <div
          className="pros-row"
          style={{ gap: 9, alignItems: "flex-start", minWidth: 0, flexWrap: "nowrap" }}
        >
          <span
            className="pros-prio"
            style={{ background: prio.bg, color: prio.fg, borderColor: prio.border }}
            title={`Priority ${c.priority}`}
          >
            {c.priority}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="pros-name">{c.name}</div>
            <div className="pros-muted" style={{ marginTop: 2 }}>
              {[c.industry, c.city].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <span className="pros-chip" style={{ background: status.bg, color: status.fg }}>
          {statusLabel(c.status)}
        </span>
      </div>

      <div className="pros-row" style={{ marginTop: 9, gap: 7 }}>
        {rev && (
          <span className="pros-tiny">
            {rev} {BASIS_LABEL[c.revenue_basis] || ""}
          </span>
        )}
        {c.employees ? <span className="pros-tiny">· {c.employees.toLocaleString()} staff</span> : null}
        {c.contact_count > 0 && (
          <span className="pros-tiny">
            · {c.contact_count} contact{c.contact_count === 1 ? "" : "s"}
          </span>
        )}
        {c.last_touch_at && <span className="pros-tiny">· last touch {daysAgoLabel(c.last_touch_at)}</span>}
        {due.text && <span className={`pros-due pros-due-${due.tone}`}>{due.text}</span>}
        {c.do_not_contact && (
          <span className="pros-chip" style={{ background: "#FBECEA", color: "#8F2F25" }}>
            Do not contact
          </span>
        )}
      </div>

      <div className="pros-acts" onClick={stop}>
        {phone && (
          <a className="pros-act" href={telHref(phone)}>
            📞 Call
          </a>
        )}
        {email && (
          <a className="pros-act" href={mailHref(email)}>
            ✉️ Email
          </a>
        )}
        {c.website && (
          <a className="pros-act" href={withProtocol(c.website)} target="_blank" rel="noreferrer">
            🌐 {prettyHost(c.website)}
          </a>
        )}
        <a className="pros-act pros-act-flat" href={mapsHref(c)} target="_blank" rel="noreferrer">
          📍 Map
        </a>
        <button
          className="pros-act pros-act-flat"
          onClick={onQuickContacted}
          title={c.contacted ? "Mark as not contacted" : "Mark as contacted"}
        >
          {c.contacted ? "✓ Contacted" : "○ Mark contacted"}
        </button>
      </div>
    </div>
  );
}
