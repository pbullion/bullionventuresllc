import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ADMIN_CODE_KEY, createApi } from "./api.js";
import { clickDownload, useNoindex, writeSession } from "./browser.js";
import {
  PAGE_SIZE,
  THUMB_BATCH,
  THUMB_EXPIRES_SEC,
  browseRows,
  failThumb,
  nextThumbDue,
  filterPools,
  folderFromHash,
  folderHash,
  folderLabel,
  isFolderRow,
  isWithin,
  kindChips,
  kindLabel,
  mergeThumbs,
  moreLabel,
  pickSort,
  resultsLine,
  sortChoices,
  thumbsToSign,
  yearChoices,
} from "./filesPage.js";
import { FILES_CSS } from "./filesStyles.js";
import { chunk, formatBytes } from "./helpers.js";
import {
  buildLibrary,
  crumbs,
  facetCounts,
  filesLine,
  highlightParts,
  kindInfo,
  normalize,
  searchFiles,
  sortEntries,
  startFolder,
  viewHref,
} from "./library.js";
import { CSS } from "./styles.js";
import { CodeGate, Stat } from "./ui.jsx";

/* /file-drop/files — "Your files": Ashley browsing, searching and opening
 * everything she has sent with File Drop, on her phone or a laptop.
 *
 * Same code as the other File Drop pages (the ADMIN code: presign-get, which
 * opening and downloading need, is admin-only). The whole manifest is loaded
 * once and everything else — the folder tree, search, the filter chips — runs
 * in the browser over library.js. Nothing is ever deleted from here.
 *
 * Privacy rules this page keeps:
 *  - Only the FOLDER goes in the URL, in the fragment (`#folder=…`), which
 *    browsers never send to a server; Back walks folders because each folder
 *    is its own history entry. The search box never touches the URL.
 *  - A file opens in /file-drop/view in a new tab with its path in THAT page's
 *    fragment (`viewHref`), never a query string.
 *  - The code stays in sessionStorage (CodeGate).
 *
 * Photo tiles in the grid are the photos themselves on presigned links, signed
 * only for the tiles on screen. */

const VIEW_KEY = "fileDrop.filesView"; // "list" | "grid" — a display preference, nothing private

export default function FileDropFiles() {
  useNoindex("Your Files");
  const [auth, setAuth] = useState(null); // { code, info }
  const [files, setFiles] = useState(null);
  const [loading, setLoading] = useState(null); // null | { count }
  const [loadError, setLoadError] = useState("");
  const [expired, setExpired] = useState(false);
  const loadSeq = useRef(0);

  /* Refresh can be pressed again while a load is running (or after a failed
   * one); only the newest load may touch state. */
  const load = async (code) => {
    loadSeq.current += 1;
    const seq = loadSeq.current;
    const latest = () => seq === loadSeq.current;
    setLoadError("");
    setLoading({ count: 0 });
    try {
      const all = await createApi(code).manifestAll((n) => {
        if (latest()) setLoading({ count: n });
      });
      if (latest()) setFiles(all);
    } catch (err) {
      if (!latest()) return;
      if (err.status === 401) {
        // The code was changed after this tab checked it — ask again.
        writeSession(ADMIN_CODE_KEY, "");
        setFiles(null);
        setAuth(null);
        setExpired(true);
      } else {
        setLoadError(err.message || "Something went wrong");
      }
    } finally {
      if (latest()) setLoading(null);
    }
  };

  const onAuthed = (a) => {
    setExpired(false);
    setAuth(a);
    load(a.code);
  };

  const counting = loading && loading.count ? ` ${loading.count.toLocaleString()}` : "";

  return (
    <main className="fd-page fd-files">
      <style>{CSS + FILES_CSS}</style>
      <div className="fd-shell wide fd-files-shell">
        <header style={{ marginBottom: 16 }}>
          <Link className="fd-back" to="/ash">
            ← Ashley&apos;s pages
          </Link>
          <div className="fd-head-row">
            <h1>Your files</h1>
            {auth && files && (
              <button
                className="fd-btn quiet small"
                type="button"
                onClick={() => load(auth.code)}
                disabled={Boolean(loading)}
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            )}
          </div>
          <p className="fd-note" style={{ fontSize: 15 }}>
            Everything you&apos;ve sent with File Drop. Click a file&apos;s name to open it in a new tab.
          </p>
        </header>

        {!auth ? (
          <>
            {expired && (
              <div className="fd-warn" role="alert" style={{ marginBottom: 12 }}>
                That code has stopped working. Enter the current one to carry on.
              </div>
            )}
            <CodeGate
              storageKey={ADMIN_CODE_KEY}
              requireAdmin
              onAuthed={onAuthed}
              label="Code"
              hint="The same code you use to send files."
            />
          </>
        ) : !files ? (
          loadError ? (
            <LoadFailed message={loadError} onRetry={() => load(auth.code)} />
          ) : (
            <section className="fd-card" role="status">
              <p style={{ margin: 0 }}>Loading your files…{counting}</p>
            </section>
          )
        ) : (
          <>
            {loading && (
              <p className="fd-note" role="status" style={{ margin: "0 0 12px" }}>
                Loading your files…{counting}
              </p>
            )}
            {loadError && <LoadFailed stale message={loadError} onRetry={() => load(auth.code)} />}
            {files.length === 0 ? <NothingYet /> : <Library code={auth.code} files={files} />}
          </>
        )}
      </div>
    </main>
  );
}

function LoadFailed({ message, onRetry, stale = false }) {
  return (
    <div className="fd-bad" role="alert" style={{ marginBottom: 16 }}>
      <p style={{ margin: "0 0 10px" }}>
        {stale ? "Couldn't refresh the list, so this is the one loaded before." : "Couldn't load your files."}{" "}
        {message}
      </p>
      <button className="fd-btn small" type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function NothingYet() {
  return (
    <section className="fd-card">
      <h2>Nothing here yet</h2>
      <p className="fd-note" style={{ marginTop: 0 }}>
        Files you send with File Drop show up here, in the same folders you sent them in.
      </p>
      <div className="fd-row" style={{ marginTop: 14 }}>
        <Link className="fd-btn" to="/file-drop">
          Send files
        </Link>
      </div>
    </section>
  );
}

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

function writeView(view) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* private mode — the choice just lasts for this visit */
  }
}

/* Signs photo-tile links one batch at a time. A failed call hands back null
 * for its batch (the tiles keep their emoji) rather than throwing. */
async function signInBatches(api, paths, onBatch) {
  for (const batch of chunk(paths, THUMB_BATCH)) {
    let rows;
    try {
      const res = await api.presignGet(batch, THUMB_EXPIRES_SEC);
      rows = res && Array.isArray(res.files) ? res.files : null;
    } catch {
      rows = null;
    }
    onBatch(batch, rows);
  }
}

function Library({ code, files }) {
  const api = useMemo(() => createApi(code), [code]);
  const lib = useMemo(() => buildLibrary(files), [files]);
  const home = useMemo(() => startFolder(lib), [lib]);
  const homeEntry = lib.folders.get(home);

  /* The folder is the URL's: a click pushes `#folder=…` and Back/Forward
   * bring the old one back. A hash naming a folder that doesn't exist (a
   * stale bookmark, a folder gone after Refresh) opens the start folder. */
  const location = useLocation();
  const navigate = useNavigate();
  const asked = folderFromHash(location.hash);
  const folder = asked !== null && lib.folders.has(asked) ? asked : home;
  const here = lib.folders.get(folder);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [kinds, setKinds] = useState(() => new Set());
  const [year, setYear] = useState(""); // "" = any year
  const [everywhere, setEverywhere] = useState(false);
  const [sorts, setSorts] = useState({ search: "", browse: "" }); // "" = the default
  const [view, setView] = useState(readView);
  const [showClutter, setShowClutter] = useState(false);
  const [paging, setPaging] = useState({ key: "", limit: PAGE_SIZE });
  const [allFoldersFor, setAllFoldersFor] = useState(null);
  const [rowState, setRowState] = useState({}); // path → { busy, error }
  const [thumbs, setThumbs] = useState(() => new Map()); // path → { url, at }
  const [thumbTick, setThumbTick] = useState(0); // re-checks the link cache when one falls due

  const searchRef = useRef(null);
  const toolbarRef = useRef(null);
  const crumbsRef = useRef(null);
  const hereRef = useRef(null);
  const listRef = useRef(null);
  const navPending = useRef(null); // the folder a click is opening, until it shows
  const focusRow = useRef(-1);
  const inflight = useRef(null);

  const normQuery = normalize(deferredQuery);
  const hasQuery = normQuery !== "";
  const active = hasQuery || kinds.size > 0 || year !== "";
  /* "Everywhere" starts at the start folder, not the root, so the one folder
   * everything was sent inside doesn't head every result. At (or above) the
   * start folder "this folder" already is everywhere, so there's no choice. */
  const canWiden = active && !isWithin(home, folder);
  const widened = canWiden && everywhere;
  const scope = widened ? home : folder;

  /* Everything in scope, unfiltered: which chips exist. Then the search box,
   * then the chips and year — each chip counted over the files the OTHER
   * filters leave, so its number is what tapping it would show. */
  const base = useMemo(() => searchFiles(lib, { scope, includeClutter: showClutter }), [lib, scope, showClutter]);
  const present = useMemo(() => facetCounts(base, scope), [base, scope]);
  const matched = useMemo(
    () => (normQuery ? searchFiles(lib, { query: normQuery, scope, includeClutter: showClutter }) : base),
    [normQuery, lib, scope, showClutter, base],
  );
  const pools = useMemo(() => filterPools(matched, kinds, year), [matched, kinds, year]);
  const kindFacets = useMemo(
    () => (pools.kindPool === base ? present : facetCounts(pools.kindPool, scope)),
    [pools, base, present, scope],
  );
  const yearFacets = useMemo(
    () => (pools.yearPool === pools.kindPool ? kindFacets : facetCounts(pools.yearPool, scope)),
    [pools, kindFacets, scope],
  );
  const resultFacets = useMemo(() => {
    if (pools.results === pools.kindPool) return kindFacets;
    if (pools.results === pools.yearPool) return yearFacets;
    return facetCounts(pools.results, scope);
  }, [pools, kindFacets, yearFacets, scope]);

  /* The sort picked while searching and the one picked while browsing are
   * remembered apart, so typing a search goes to "Best match" and clearing it
   * goes back to how the folder was sorted. */
  const sortSlot = hasQuery ? "search" : "browse";
  const sortKey = pickSort(sorts[sortSlot], { hasQuery, active });
  const sortOptions = sortChoices({ hasQuery, active });

  const rows = useMemo(() => {
    if (!active) return browseRows(lib, folder, { showClutter, sortKey });
    return sortKey === "relevance" ? pools.results : sortEntries(pools.results, sortKey);
  }, [active, lib, folder, showClutter, sortKey, pools]);

  /* Paging restarts whenever what's listed changes. Kept as { key, limit }
   * instead of an effect that resets it. */
  const filterKey = [folder, scope, normQuery, [...kinds].sort().join(","), year, showClutter ? 1 : 0].join("\u0001");
  const pageKey = `${filterKey}\u0001${sortKey}`;
  const limit = paging.key === pageKey ? paging.limit : PAGE_SIZE;
  const shown = useMemo(() => (rows.length > limit ? rows.slice(0, limit) : rows), [rows, limit]);
  const left = rows.length - shown.length;

  const chips = kindChips(present.kinds, kindFacets.kinds, kinds);
  const years = yearChoices(present.years, yearFacets.years, year);
  const folderCounts = active ? [...resultFacets.folders] : [];
  const narrow = allFoldersFor === filterKey ? folderCounts : folderCounts.slice(0, 12);

  const trailAll = crumbs(folder);
  const trail = isWithin(folder, home) ? trailAll.slice(home ? home.split("/").length : 0) : trailAll;

  /* Photo tiles: sign links for the tiles on screen only, re-signing any that
   * are getting old. The cache is state (render reads it); the in-flight set
   * is a ref only the effect touches. */
  const thumbPaths = useMemo(
    () => (view === "grid" ? shown.filter((r) => !isFolderRow(r) && r.preview === "image").map((r) => r.path) : []),
    [view, shown],
  );
  const thumbKey = useMemo(() => (thumbPaths.length ? JSON.stringify(thumbPaths) : ""), [thumbPaths]);
  useEffect(() => {
    if (!thumbKey) return undefined;
    if (!inflight.current) inflight.current = new Set();
    const pending = inflight.current;
    const paths = JSON.parse(thumbKey);
    const need = thumbsToSign(paths, thumbs, pending, Date.now());
    if (need.length) {
      for (const p of need) pending.add(p);
      signInBatches(api, need, (batch, signed) => {
        for (const p of batch) pending.delete(p);
        const at = Date.now();
        setThumbs((prev) => mergeThumbs(prev, batch, signed, at));
      });
      return undefined;
    }
    /* Nothing is due yet, so wake up when the soonest link is — a batch that
     * failed to sign, or one about to expire, is otherwise never asked for
     * again: this effect only re-runs when the cache or the tiles change, and
     * neither does on its own. */
    const due = nextThumbDue(paths, thumbs, pending, Date.now());
    if (due === null) return undefined;
    const timer = setTimeout(() => setThumbTick((n) => n + 1), Math.min(due + 50, 60000));
    return () => clearTimeout(timer);
  }, [thumbKey, thumbs, api, thumbTick]);

  // "/" jumps to the search box from anywhere that isn't already a text field.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const t = e.target;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      const input = searchRef.current;
      if (!input) return;
      e.preventDefault();
      input.focus();
      input.select();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* After she opens a folder (not after Back — the browser restores its own
   * scroll): bring the top of the list back under the toolbar and put focus
   * on the folder's name, since the button she pressed is gone. Waits for the
   * folder itself: a result's folder link clears the search and navigates in
   * one click, and those can land in separate renders. */
  useEffect(() => {
    if (navPending.current === null || navPending.current !== folder) return;
    navPending.current = null;
    const target = crumbsRef.current;
    if (target) {
      const bar = toolbarRef.current;
      const barBottom = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
      const top = target.getBoundingClientRect().top;
      if (top < barBottom) window.scrollTo(0, window.scrollY + top - barBottom - 8);
    }
    if (hereRef.current) hereRef.current.focus({ preventScroll: true });
  }, [folder, active]);

  // "Show more" moves focus to the first row it added.
  useEffect(() => {
    const i = focusRow.current;
    if (i < 0) return;
    focusRow.current = -1;
    const el = listRef.current && listRef.current.querySelector(`[data-row="${i}"] a, [data-row="${i}"] button`);
    if (el) el.focus();
  }, [limit]);

  /* Widening only applies to one search. Once the box and the filters are all
   * empty it drops back to "This folder", so tapping a chip while browsing
   * never switches which folder the chips count. */
  const settle = (q, k, y) => {
    if (!normalize(q) && !k.size && y === "") setEverywhere(false);
  };
  const onQuery = (value) => {
    setQuery(value);
    settle(value, kinds, year);
  };
  const toggleKind = (id) => {
    const next = new Set(kinds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setKinds(next);
    settle(query, next, year);
  };
  const onYear = (value) => {
    setYear(value);
    settle(query, kinds, value);
  };
  const clearAll = () => {
    setQuery("");
    setKinds(new Set());
    setYear("");
    setEverywhere(false);
  };
  const goFolder = (path) => {
    if (path === folder) return;
    setRowState({}); // a download error belongs to the row she was looking at
    navPending.current = path;
    navigate({ hash: folderHash(path) });
  };
  const narrowTo = (path) => {
    setEverywhere(false);
    goFolder(path);
  };
  // A result's folder link: go there and show that folder, search cleared.
  const openFolderOf = (path) => {
    clearAll();
    navPending.current = path;
    if (path !== folder) navigate({ hash: folderHash(path) });
  };

  const onSearchKey = (e) => {
    if (e.key === "Escape" && query) {
      e.preventDefault();
      onQuery("");
    } else if (e.key === "Enter" && window.matchMedia && window.matchMedia("(hover: none)").matches) {
      e.currentTarget.blur(); // a phone: put the keyboard away so the results show
    }
  };

  const chooseView = (v) => {
    setView(v);
    writeView(v);
  };

  const download = async (path) => {
    setRowState((m) => ({ ...m, [path]: { busy: true, error: "" } }));
    try {
      const res = await api.presignGet([path]);
      const row = res.files && res.files[0];
      if (!row || !row.url) throw new Error((row && row.error) || "No download link came back");
      clickDownload(row.url);
      setRowState((m) => {
        const next = { ...m };
        delete next[path];
        return next;
      });
    } catch (err) {
      setRowState((m) => ({ ...m, [path]: { busy: false, error: `Couldn't download it: ${err.message}` } }));
    }
  };

  /* A tile whose <img> wouldn't load: the link is no use whatever the server
   * said, so it is cached as a FAILURE. That way a handful of tiles lost to a
   * few seconds of bad signal come back on the retry timer instead of sitting
   * on the emoji until the 50-minute re-sign. */
  const onBroken = (path) => setThumbs((prev) => failThumb(prev, path, Date.now()));

  const showMore = () => {
    focusRow.current = shown.length;
    setPaging({ key: pageKey, limit: limit + PAGE_SIZE });
  };

  const scopeName = lib.folders.get(scope).name;
  const clutter = lib.clutterCount;

  return (
    <>
      <div className="fd-stats" style={{ marginBottom: 14 }}>
        <Stat value={homeEntry.count.toLocaleString()} label={homeEntry.count === 1 ? "file" : "files"} />
        <Stat value={formatBytes(homeEntry.size)} label="in total" />
      </div>

      <div className="fd-toolbar" ref={toolbarRef}>
        <div className="fd-toolbar-row">
          <label className="fd-sr-only" htmlFor="fd-files-search">
            Search your files
          </label>
          <input
            id="fd-files-search"
            ref={searchRef}
            className="fd-input fd-grow"
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Search names — try “tax 2021” or “resume”"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-keyshortcuts="/"
          />
        </div>
        <div className="fd-toolbar-row">
          {canWiden && (
            <div className="fd-seg fd-scope" role="group" aria-label="Where to look">
              <button type="button" aria-pressed={!everywhere} onClick={() => setEverywhere(false)}>
                This folder
              </button>
              <button type="button" aria-pressed={everywhere} onClick={() => setEverywhere(true)}>
                Everywhere
              </button>
            </div>
          )}
          <label className="fd-sr-only" htmlFor="fd-files-sort">
            Sort by
          </label>
          <select
            id="fd-files-sort"
            className="fd-select"
            value={sortKey}
            onChange={(e) => {
              const value = e.target.value;
              setSorts((s) => ({ ...s, [sortSlot]: value }));
            }}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="fd-seg" role="group" aria-label="Show files as">
            <button type="button" aria-pressed={view === "list"} onClick={() => chooseView("list")}>
              List
            </button>
            <button type="button" aria-pressed={view === "grid"} onClick={() => chooseView("grid")}>
              Grid
            </button>
          </div>
        </div>
      </div>

      {(chips.length > 0 || years.length > 0 || active || query) && (
        <div className="fd-filters" role="group" aria-label="Filters">
          {chips.map((k) => (
            <button
              key={k.id}
              type="button"
              className={`fd-chip${k.count === 0 ? " zero" : ""}`}
              aria-pressed={kinds.has(k.id)}
              onClick={() => toggleKind(k.id)}
            >
              <span aria-hidden="true">{k.emoji}</span>
              <span>{k.plural}</span>
              <span className="fd-chip-n">{k.count.toLocaleString()}</span>
            </button>
          ))}
          {years.length > 0 && (
            <>
              <label className="fd-sr-only" htmlFor="fd-files-year">
                Year
              </label>
              <select id="fd-files-year" className="fd-select" value={year} onChange={(e) => onYear(e.target.value)}>
                <option value="">Any year</option>
                {years.map((y) => (
                  <option key={y.year} value={String(y.year)}>
                    {y.year} ({y.count.toLocaleString()})
                  </option>
                ))}
              </select>
            </>
          )}
          {(active || query) && (
            <button type="button" className="fd-btn quiet small" onClick={clearAll}>
              Clear
            </button>
          )}
        </div>
      )}

      <nav className="fd-crumbs" aria-label="Folder" ref={crumbsRef}>
        <ol>
          {trail.map((c, i) =>
            i === trail.length - 1 ? (
              <li key={c.path}>
                <span className="fd-crumb-here" aria-current="location" tabIndex={-1} ref={hereRef}>
                  {c.name}
                </span>
              </li>
            ) : (
              <li key={c.path}>
                <button type="button" className="fd-crumb" onClick={() => goFolder(c.path)}>
                  {c.name}
                </button>
              </li>
            ),
          )}
        </ol>
      </nav>
      <p className="fd-summary" aria-live="polite">
        {active
          ? resultsLine(rows.length, widened ? "everywhere" : `in ${scopeName}`)
          : showClutter && here.clutterCount > 0
            ? `${filesLine(here.count, here.size)} · ${here.clutterCount.toLocaleString()} system file${
                here.clutterCount === 1 ? "" : "s"
              }`
            : filesLine(here.count, here.size)}
      </p>

      {narrow.length > 0 && (
        <div className="fd-narrow" role="group" aria-label="Narrow to a folder">
          <span aria-hidden="true">Narrow to a folder:</span>
          {narrow.map(([path, n]) => (
            <button key={path} type="button" className="fd-chip" onClick={() => narrowTo(path)}>
              <span aria-hidden="true">📁</span>
              <span>{lib.folders.get(path).name}</span>
              <span className="fd-chip-n">{n.toLocaleString()}</span>
            </button>
          ))}
          {folderCounts.length > narrow.length && (
            <button type="button" className="fd-chip" onClick={() => setAllFoldersFor(filterKey)}>
              +{(folderCounts.length - narrow.length).toLocaleString()} more
            </button>
          )}
        </div>
      )}

      <section
        className="fd-card fd-listcard"
        ref={listRef}
        aria-label={active ? "Results" : "Folders and files"}
      >
        {rows.length === 0 ? (
          active ? (
            <div className="fd-empty-msg">
              <p className="fd-empty-lead">Nothing matches</p>
              <div className="fd-row">
                <button type="button" className="fd-btn small" onClick={clearAll}>
                  Clear
                </button>
                {canWiden && !everywhere && (
                  <button type="button" className="fd-btn ghost small" onClick={() => setEverywhere(true)}>
                    Look everywhere
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="fd-empty-msg">This folder is empty.</p>
          )
        ) : view === "grid" ? (
          <>
            {thumbPaths.length > 0 && (
              <p className="fd-note fd-gridnote">
                These are the photos themselves at full size, so a folder of big ones takes a moment to fill in.
              </p>
            )}
            <ul className="fd-tiles">
              {shown.map((row, i) =>
                isFolderRow(row) ? (
                  <FolderTile key={`d:${row.path}`} folder={row} index={i} onOpen={() => goFolder(row.path)} />
                ) : (
                  <FileTile
                    key={row.path}
                    entry={row}
                    index={i}
                    query={normQuery}
                    src={thumbSrc(thumbs, row)}
                    onBroken={onBroken}
                  />
                ),
              )}
            </ul>
          </>
        ) : (
          <ul className="fd-rows">
            {shown.map((row, i) =>
              isFolderRow(row) ? (
                <FolderRow key={`d:${row.path}`} folder={row} index={i} onOpen={() => goFolder(row.path)} />
              ) : (
                <FileRow
                  key={row.path}
                  entry={row}
                  index={i}
                  query={normQuery}
                  folderText={active ? folderLabel(row.folder, home) : ""}
                  onFolder={active ? () => openFolderOf(row.folder) : null}
                  state={rowState[row.path]}
                  onDownload={() => download(row.path)}
                />
              ),
            )}
          </ul>
        )}
        {left > 0 && (
          <button type="button" className="fd-btn ghost fd-more" onClick={showMore}>
            {moreLabel(left)}
          </button>
        )}
      </section>

      {clutter > 0 && (
        <p className="fd-note fd-clutter">
          <span>
            {clutter.toLocaleString()} system file{clutter === 1 ? "" : "s"}{" "}
            {showClutter ? "shown" : "hidden"} (Recycle Bin, thumbnails and the like)
          </span>
          <button type="button" className="fd-linkbtn" onClick={() => setShowClutter((v) => !v)}>
            {showClutter ? "Hide" : "Show"}
          </button>
        </p>
      )}
    </>
  );
}

function thumbSrc(thumbs, entry) {
  if (entry.preview !== "image") return "";
  const t = thumbs.get(entry.path);
  return t && t.url ? t.url : "";
}

function Marked({ text, query }) {
  if (!query) return text;
  return highlightParts(text, query).map((p, i) =>
    p.hit ? <mark key={i}>{p.text}</mark> : <Fragment key={i}>{p.text}</Fragment>,
  );
}

function folderMeta(folder) {
  if (folder.count > 0) return filesLine(folder.count, folder.size);
  const n = folder.clutterCount;
  return `${n.toLocaleString()} system file${n === 1 ? "" : "s"}`;
}

function FolderRow({ folder, index, onOpen }) {
  return (
    <li data-row={index}>
      <button type="button" className="fd-folder-row" onClick={onOpen}>
        <span className="fd-ico" aria-hidden="true">
          📁
        </span>
        <span className="fd-row-main">
          <span className="fd-row-name">{folder.name}</span>
          <span className="fd-row-meta">{folderMeta(folder)}</span>
        </span>
        <span className="fd-chev" aria-hidden="true">
          ›
        </span>
      </button>
    </li>
  );
}

function FileRow({ entry, index, query, folderText, onFolder, state, onDownload }) {
  const info = kindInfo(entry.kind);
  const busy = Boolean(state && state.busy);
  return (
    <li data-row={index} className="fd-file">
      <span className="fd-ico" aria-hidden="true">
        {info.emoji}
      </span>
      <div className="fd-row-main">
        {/* rel="opener" is DELIBERATE, not a slip: a tab opened with noopener
            (the default for target="_blank") starts with EMPTY sessionStorage,
            so the viewer would ask for the code again. With an opener the new
            tab gets a copy of this tab's sessionStorage, code included. The
            viewer is our own page on our own origin. */}
        <a className="fd-file-link" href={viewHref(entry.path)} target="_blank" rel="opener">
          <span>
            <Marked text={entry.name} query={query} />
          </span>
        </a>
        <div className="fd-row-meta">
          {kindLabel(entry)} · {formatBytes(entry.size)}
          {entry.year ? ` · ${entry.year}` : ""}
          {entry.copies > 1 && (
            <>
              {" · "}
              <span title={`Same name and size in ${entry.copies} places`}>{entry.copies} copies</span>
            </>
          )}
        </div>
        {onFolder && (
          <button type="button" className="fd-folder-link" onClick={onFolder}>
            <span aria-hidden="true">📁</span>
            <span>
              <span className="fd-sr-only">Go to folder </span>
              <Marked text={folderText} query={query} />
            </span>
          </button>
        )}
        {state && state.error && (
          <div className="fd-row-err" role="alert">
            {state.error}
          </div>
        )}
      </div>
      <button
        type="button"
        className="fd-btn quiet small fd-dl"
        onClick={onDownload}
        disabled={busy}
        aria-busy={busy}
        aria-label={`Download ${entry.name}`}
      >
        Download
      </button>
    </li>
  );
}

function FolderTile({ folder, index, onOpen }) {
  return (
    <li data-row={index}>
      <button type="button" className="fd-tile" onClick={onOpen} title={folder.name}>
        <span className="fd-tile-thumb" aria-hidden="true">
          📁
        </span>
        <span className="fd-tile-cap">
          <span className="fd-tile-name">{folder.name}</span>
          <span className="fd-tile-meta">{folderMeta(folder)}</span>
        </span>
      </button>
    </li>
  );
}

function FileTile({ entry, index, query, src, onBroken }) {
  const info = kindInfo(entry.kind);
  return (
    <li data-row={index}>
      {/* rel="opener" on purpose — see FileRow. */}
      <a className="fd-tile" href={viewHref(entry.path)} target="_blank" rel="opener" title={entry.name}>
        <span className="fd-tile-thumb" aria-hidden="true">
          {src ? (
            <img src={src} alt="" loading="lazy" decoding="async" onError={() => onBroken(entry.path)} />
          ) : (
            info.emoji
          )}
        </span>
        <span className="fd-tile-cap">
          <span className="fd-tile-name">
            <Marked text={entry.name} query={query} />
          </span>
          <span className="fd-tile-meta">{formatBytes(entry.size)}</span>
        </span>
      </a>
    </li>
  );
}
