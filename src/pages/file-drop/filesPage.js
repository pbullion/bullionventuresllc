/* File Drop — the pure pieces of the "Your files" page (/file-drop/files) that
 * aren't about the library itself: the #folder= fragment, which folder a
 * search covers, the pools behind the filter-chip counts, the sort menu, the
 * rows a folder shows, and the thumbnail-link cache. No DOM, no React, no
 * network — checked under plain node like library.js.
 *
 * Only the FOLDER goes in the URL, and only in the fragment (`#folder=…`),
 * which browsers never send to a server. The search box never goes in the URL
 * at all. */

import { KINDS, ROOT_NAME, kindInfo, sortEntries } from "./library.js";

export const PAGE_SIZE = 150;

/* Photo tiles show a presigned GET of the photo itself. Links are signed for an
 * hour and re-signed after 50 minutes, so a tile never renders a link that is
 * about to die; a batch that failed to sign is tried again after 2 minutes. */
export const THUMB_BATCH = 200;
export const THUMB_EXPIRES_SEC = 3600;
export const THUMB_RESIGN_MS = 50 * 60 * 1000;
export const THUMB_RETRY_MS = 2 * 60 * 1000;

const FOLDER_PREFIX = "folder=";

/** "Taxes/2021" → "#folder=Taxes%2F2021". */
export function folderHash(path) {
  return `#${FOLDER_PREFIX}${encodeURIComponent(String(path ?? ""))}`;
}

/** location.hash → the folder it names, or null when it names none (no hash,
 *  some other hash, a garbled escape). "#folder=" is the root, "". Whether
 *  that folder exists is the page's question, not this one's.
 *
 *  Everything after the FIRST "#" is read, so a whole URL works as well as a
 *  bare fragment; an encoded folder never contains a raw "#". */
export function folderFromHash(hash) {
  const s = String(hash ?? "");
  const at = s.indexOf("#");
  const raw = at === -1 ? s : s.slice(at + 1);
  if (!raw.startsWith(FOLDER_PREFIX)) return null;
  try {
    return decodeURIComponent(raw.slice(FOLDER_PREFIX.length));
  } catch {
    return null;
  }
}

/** Is `path` the folder `ancestor` or somewhere inside it? */
export function isWithin(path, ancestor) {
  return ancestor === "" || path === ancestor || path.startsWith(`${ancestor}/`);
}

/** A folder path as people read it, relative to `home` (the start folder)
 *  when it's inside it: "Home/Taxes/2021" → "Taxes › 2021"; home itself → its
 *  own name; the root → "All files". */
export function folderLabel(path, home = "") {
  const p = String(path ?? "");
  if (!p) return ROOT_NAME;
  if (p === home) return p.slice(p.lastIndexOf("/") + 1);
  const rel = home && p.startsWith(`${home}/`) ? p.slice(home.length + 1) : p;
  return rel.split("/").join(" › ");
}

/** The three lists behind one screen of results, from `matched` (the files
 *  that pass the search box and scope):
 *   - results: also passing the kind chips (any of them) and the year;
 *   - kindPool: passing the year but NOT the kind chips — what each kind
 *     chip's count is taken over, so a chip says what tapping it would give;
 *   - yearPool: passing the kind chips but not the year — the same for the
 *     year menu.
 *  An unfiltered pool is `matched` itself (same array), so the page can skip
 *  counting it twice. */
export function filterPools(matched, kinds, year) {
  const list = matched || [];
  const n = year === "" || year === null || year === undefined ? NaN : Number(year);
  const y = Number.isFinite(n) ? n : null;
  const hasKinds = Boolean(kinds && kinds.size);
  const kindPool = y === null ? list : list.filter((e) => e.year === y);
  const yearPool = hasKinds ? list.filter((e) => kinds.has(e.kind)) : list;
  let results = kindPool;
  if (hasKinds) results = y === null ? yearPool : kindPool.filter((e) => kinds.has(e.kind));
  return { results, kindPool, yearPool };
}

/** The kind chips: one per kind PRESENT in the folder being looked at
 *  (`present`, a Map from facetCounts over the unfiltered scope) plus any chip
 *  that is switched on, in KINDS order, each with its count in combination
 *  (`counts`, 0 when none). The set of chips depends on the scope only, so
 *  typing or tapping never moves a chip out from under a finger. */
export function kindChips(present, counts, selected) {
  return KINDS.filter((k) => present.has(k.id) || (selected && selected.has(k.id))).map((k) => ({
    ...k,
    count: counts.get(k.id) || 0,
  }));
}

/** The year menu's entries, newest first: every year present in the scope,
 *  plus the selected one, each with its count in combination. */
export function yearChoices(present, counts, selected) {
  const years = new Set(present.keys());
  const n = selected === "" || selected === null || selected === undefined ? NaN : Number(selected);
  if (Number.isFinite(n)) years.add(n);
  return [...years].sort((a, b) => b - a).map((year) => ({ year, count: counts.get(year) || 0 }));
}

/** The sort menu. "Best match" only means something while there's a search,
 *  and "Folder" only when results come from more than one folder. */
export function sortChoices({ hasQuery, active }) {
  return [
    hasQuery && { value: "relevance", label: "Best match" },
    { value: "name", label: "Name" },
    { value: "size", label: "Largest first" },
    active && { value: "folder", label: "Folder" },
    { value: "kind", label: "Type" },
  ].filter(Boolean);
}

/** The sort in effect: the one picked, if the menu still offers it; otherwise
 *  best match while searching, folder order for filter-only results, and
 *  name while browsing. */
export function pickSort(choice, { hasQuery, active }) {
  if (sortChoices({ hasQuery, active }).some((o) => o.value === choice)) return choice;
  return hasQuery ? "relevance" : active ? "folder" : "name";
}

/** What a folder shows while browsing: its subfolders (hidden when they hold
 *  only system files, unless those are shown), then its own files. "size"
 *  puts the biggest subfolders first too; every other sort keeps subfolders
 *  in name order. A FolderEntry is told apart by `isFolderRow`. */
export function browseRows(lib, folderPath, { showClutter = false, sortKey = "name" } = {}) {
  const here = lib && lib.folders ? lib.folders.get(folderPath) : null;
  if (!here) return [];
  const kids = here.folders
    .map((p) => lib.folders.get(p))
    .filter((f) => f && (showClutter ? f.count > 0 || f.clutterCount > 0 : f.count > 0));
  if (sortKey === "size") kids.sort((a, b) => b.size - a.size);
  const own = showClutter ? here.files : here.files.filter((e) => !e.clutter);
  return [...kids, ...sortEntries(own, sortKey)];
}

export function isFolderRow(row) {
  return Boolean(row) && Array.isArray(row.folders);
}

/** "PDF", "Spreadsheet" … and for anything unrecognised the extension itself
 *  ("PST file"), which says more than "Other file". */
export function kindLabel(entry) {
  if (entry.kind === "other" && entry.ext) return `${entry.ext.toUpperCase()} file`;
  return kindInfo(entry.kind).label;
}

/** 1, "in Taxes" → "1 result in Taxes". */
export function resultsLine(count, where) {
  const n = Number(count) || 0;
  return `${n.toLocaleString("en-US")} result${n === 1 ? "" : "s"} ${where}`;
}

/** The "show more" button's words for `left` rows still hidden. */
export function moreLabel(left, pageSize = PAGE_SIZE) {
  if (left > pageSize) return `Show ${pageSize} more (${left.toLocaleString("en-US")} left)`;
  return `Show ${left.toLocaleString("en-US")} more`;
}

/** Which of `paths` need a (new) thumbnail link: never signed, signed long
 *  enough ago to be re-signed, or failed long enough ago to try again — and
 *  not already being signed. `cache` is Map(path → { url, at }), url "" for a
 *  failure; `inflight` a Set. Each path once. */
export function thumbsToSign(paths, cache, inflight, now) {
  const out = [];
  const seen = new Set();
  for (const p of paths || []) {
    if (!p || seen.has(p) || (inflight && inflight.has(p))) continue;
    seen.add(p);
    const c = cache ? cache.get(p) : null;
    if (!c || now - c.at >= (c.url ? THUMB_RESIGN_MS : THUMB_RETRY_MS)) out.push(p);
  }
  return out;
}

/** Mark one path's cached link as failed — its <img> wouldn't load, so the
 *  link is no use whatever the server said. Stamped `at` now, so
 *  `thumbsToSign` asks again after THUMB_RETRY_MS rather than waiting out the
 *  50-minute re-sign of a "good" link. */
export function failThumb(prev, path, at) {
  const next = new Map(prev);
  next.set(path, { url: "", at });
  return next;
}

/** When the next cached link falls due — the soonest `at + (url ? resign :
 *  retry)` among the paths on screen, as a delay in ms, or null when there is
 *  nothing to wait for. The page uses it to set one timer; without it a
 *  failed batch is never retried, because nothing re-renders to notice. */
export function nextThumbDue(paths, cache, inflight, now) {
  let soonest = null;
  for (const p of paths || []) {
    if (!p || (inflight && inflight.has(p))) continue;
    const c = cache ? cache.get(p) : null;
    if (!c) continue; // never signed: thumbsToSign takes it now, no timer needed
    const due = c.at + (c.url ? THUMB_RESIGN_MS : THUMB_RETRY_MS) - now;
    if (soonest === null || due < soonest) soonest = due;
  }
  return soonest === null ? null : Math.max(0, soonest);
}

/** A new cache with one signed batch in it. `rows` is presign-get's `files`
 *  (one row per path, in order), or null when the whole call failed; a path
 *  with no link is cached as a failure (url "") so it isn't asked for again
 *  straight away. */
export function mergeThumbs(prev, batch, rows, at) {
  const next = new Map(prev);
  const list = Array.isArray(rows) ? rows : [];
  const byPath = new Map(list.map((r) => [r && r.path, r]));
  batch.forEach((p, i) => {
    const r = list.length === batch.length && list[i] && list[i].path === p ? list[i] : byPath.get(p);
    next.set(p, { url: r && typeof r.url === "string" ? r.url : "", at });
  });
  return next;
}
