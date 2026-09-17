/* File Drop — the "Your Files" library: pure logic behind /file-drop/files and
 * /file-drop/view. No DOM, no React, no network: everything here runs under
 * plain node, which is how it was checked — invented edge cases plus a real
 * manifest, reporting counts only.
 *
 * One manifest (`api.manifestAll()` → [{ path, size, lastModified }]) becomes a
 * folder tree and a flat, searchable file list. Rules worth knowing before
 * changing anything:
 *
 *  - A file's YEAR comes from its path ("Taxes/2021/W-2.pdf"), never from
 *    `lastModified`. That is the S3 upload date — the same day for everything
 *    sent in one sitting — so it says nothing about the file.
 *  - "Clutter" (Recycle Bin contents, Thumbs.db, AppleDouble `._` files) is
 *    kept, flagged and counted, never dropped. Folder `count`/`size` exclude
 *    it, `folder.files` still includes it (check `entry.clutter`), and a
 *    folder holding nothing but clutter exists with `count === 0` — the page
 *    decides whether any of it is shown.
 *  - The viewer takes its path in the URL FRAGMENT (`viewHref`). Browsers never
 *    send a fragment to a server, so file names stay out of Amplify's and
 *    Heroku's request logs. Never move it into a query string.
 *  - Nothing here may use regex lookbehind: Safari before 16.4 refuses to
 *    parse a module containing one, which would blank both pages on an older
 *    iPhone. */

import { formatBytes, isJunkFile } from "./helpers.js";

export const ROOT_NAME = "All files";

export const KINDS = [
  { id: "pdf", label: "PDF", plural: "PDFs", emoji: "📕" },
  { id: "image", label: "Photo", plural: "Photos", emoji: "🖼️" },
  { id: "video", label: "Video", plural: "Videos", emoji: "🎬" },
  { id: "audio", label: "Audio", plural: "Audio", emoji: "🎵" },
  { id: "word", label: "Word document", plural: "Word docs", emoji: "📘" },
  { id: "sheet", label: "Spreadsheet", plural: "Spreadsheets", emoji: "📗" },
  { id: "slides", label: "Presentation", plural: "Presentations", emoji: "📙" },
  { id: "email", label: "Email", plural: "Emails", emoji: "✉️" },
  { id: "zip", label: "Zip archive", plural: "Zip archives", emoji: "🗜️" },
  { id: "text", label: "Text file", plural: "Text files", emoji: "📄" },
  { id: "other", label: "Other file", plural: "Other", emoji: "📎" },
];

const KIND_RANK = new Map(KINDS.map((k, i) => [k.id, i]));

/** Kind id → its KINDS row; anything unknown → the "other" row. */
export function kindInfo(id) {
  return KINDS[KIND_RANK.has(id) ? KIND_RANK.get(id) : KINDS.length - 1];
}

/* { value: "ext ext ext" } → Map(ext → value) */
function byExt(spec) {
  const m = new Map();
  for (const [value, exts] of Object.entries(spec)) {
    for (const ext of exts.split(" ")) m.set(ext, value);
  }
  return m;
}

const KIND_BY_EXT = byExt({
  pdf: "pdf",
  image: "jpg jpeg png gif webp bmp heic heif avif tif tiff",
  video: "mp4 m4v mov webm avi wmv",
  audio: "mp3 m4a wav aac flac",
  word: "docx doc docm dotx rtf odt pages",
  sheet: "xlsx xls xlsm xlsb csv ods numbers",
  slides: "pptx ppt key odp",
  email: "msg eml",
  zip: "zip",
  text: "txt md log json xml",
});

/* How /file-drop/view shows a file. Deliberately narrower than KIND_BY_EXT:
 * only what a browser (or one of the lazy viewers) can actually render.
 * .doc/.ppt/.pptx/.heic/.tiff/.rtf fall through to "none". */
const PREVIEW_BY_EXT = byExt({
  pdf: "pdf",
  image: "jpg jpeg png gif webp bmp avif",
  video: "mp4 m4v mov webm",
  audio: "mp3 m4a wav aac",
  text: "txt md log json",
  docx: "docx docm dotx",
  sheet: "xlsx xls xlsm xlsb csv ods",
  msg: "msg",
  eml: "eml",
  zip: "zip",
});

/* The backend's inline allow-list for presign-get (routes/fileDrop.js), used
 * here as the Blob type when the viewer has to fetch the bytes itself. Text
 * types are forced to text/plain so nothing is ever sniffed into HTML. `aac`
 * is not on the backend's list (so it always comes back as an attachment); it
 * is here so its Blob still gets a real audio type. */
const MIME_BY_EXT = new Map([
  ["pdf", "application/pdf"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["gif", "image/gif"],
  ["webp", "image/webp"],
  ["bmp", "image/bmp"],
  ["avif", "image/avif"],
  ["mp4", "video/mp4"],
  ["m4v", "video/mp4"],
  ["mov", "video/quicktime"],
  ["webm", "video/webm"],
  ["mp3", "audio/mpeg"],
  ["m4a", "audio/mp4"],
  ["wav", "audio/wav"],
  ["aac", "audio/aac"],
  ["txt", "text/plain; charset=utf-8"],
  ["csv", "text/plain; charset=utf-8"],
  ["log", "text/plain; charset=utf-8"],
  ["md", "text/plain; charset=utf-8"],
  ["json", "text/plain; charset=utf-8"],
]);

/** "Taxes/2021/W-2.pdf" → { folder: "Taxes/2021", name: "W-2.pdf" }. Empty
 *  segments (a stray "//") are dropped, the same way buildLibrary files it. */
export function splitPath(path) {
  const segs = String(path ?? "")
    .split("/")
    .filter(Boolean);
  const name = segs.pop() || "";
  return { folder: segs.join("/"), name };
}

function baseName(path) {
  const s = String(path ?? "");
  return s.slice(s.lastIndexOf("/") + 1);
}

/** "a/Report.PDF" → "pdf". No dot, a trailing dot or a dotfile (".profile")
 *  → "". */
export function extOf(path) {
  const base = baseName(path);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** Path → a KINDS id. */
export function kindOf(path) {
  return KIND_BY_EXT.get(extOf(path)) || "other";
}

/** Path → "pdf" | "image" | "video" | "audio" | "text" | "docx" | "sheet" |
 *  "msg" | "eml" | "zip" | "none". */
export function previewOf(path) {
  return PREVIEW_BY_EXT.get(extOf(path)) || "none";
}

/** The Blob type for a natively previewed file, or "" when there isn't one. */
export function nativeMime(path) {
  return MIME_BY_EXT.get(extOf(path)) || "";
}

const CLUTTER_SEGMENTS = new Set([
  "$recycle.bin",
  "recycler",
  "system volume information",
  "__macosx",
  ".trashes",
  ".trash",
  ".spotlight-v100",
  ".fseventsd",
]);

/** System droppings nobody went looking for: helpers.isJunkFile names,
 *  AppleDouble `._x` files, and anything inside a Recycle Bin / Trash /
 *  Spotlight / __MACOSX folder (any path segment, any case). */
export function isClutter(path) {
  if (typeof path !== "string" || !path) return false;
  if (isJunkFile(path)) return true;
  const segs = path.split(/[\\/]/);
  if ((segs[segs.length - 1] || "").startsWith("._")) return true;
  return segs.some((s) => CLUTTER_SEGMENTS.has(s.toLowerCase()));
}

/* A 4-digit year 1990–2039 not touching another digit. The leading group eats
 * the separator instead of looking behind (see the header). */
const YEAR_RE = /(^|\D)(199\d|20[0-3]\d)(?=\D|$)/g;
/* YYYYMM or YYYYMMDD with a real month (and day), touching no letter or digit:
 * "201912_Scan", "Scan 20191205.pdf". Underscore counts as a boundary. */
const COMPACT_RE =
  /(^|[^0-9A-Za-z])(199\d|20[0-3]\d)(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])?(?=[^0-9A-Za-z]|$)/g;

/* A camera's frame counter ("IMG_2019.jpg", "DSC_2031.JPG", "GOPR2020.MP4")
 * is a 4-digit number that is often in year range and never a year. Checked
 * against the text just before a standalone match. */
const CAMERA_COUNTER_RE = /(?:^|[^A-Za-z])(?:IMG|DSC|DSCN|DSCF|MVI|VID|SAM|GOPR|DJI)[_-]?$/i;

function lastYear(re, s, skipCameraCounters) {
  re.lastIndex = 0;
  let year = null;
  let m;
  while ((m = re.exec(s))) {
    if (skipCameraCounters && CAMERA_COUNTER_RE.test(s.slice(0, m.index + m[1].length))) continue;
    year = Number(m[2]);
  }
  return year;
}

/** The year a path talks about, or null. The LAST standalone year wins
 *  ("2019/Report 2021.pdf" → 2021, "Invoice 11.20.2018.pdf" → 2018); a year
 *  inside a longer number doesn't count ("3405 Oak St.pdf", a 17-digit scanner
 *  name), nor does a camera frame counter ("IMG_2019.jpg"). With no standalone
 *  year, a compact date run gives one ("201912_Statement.pdf" → 2019).
 *  Never the upload date. */
export function yearOf(path) {
  const s = String(path ?? "");
  const year = lastYear(YEAR_RE, s, true);
  return year !== null ? year : lastYear(COMPACT_RE, s, false);
}

const MARKS = /\p{M}+/gu;
const NON_ALNUM = /[^\p{L}\p{N}]+/gu;

/* NFKD first, then lower-case (NFKD can hand back capitals, e.g. from
 * letter-like symbols). Final sigma is folded to σ: toLowerCase picks ς by
 * context, which a per-character pass (highlightParts) can't reproduce. */
function fold(s) {
  return s.normalize("NFKD").toLowerCase().replace(MARKS, "").replace(/ς/g, "σ");
}

/** "Résumé — FINAL (v2).docx" → "resume final v2 docx": lower-case, accents
 *  removed, every run of non-letters/digits one space, trimmed. */
export function normalize(s) {
  return fold(String(s ?? ""))
    .replace(NON_ALNUM, " ")
    .trim();
}

function queryTokens(query) {
  return normalize(query).split(" ").filter(Boolean);
}

/* ---- ordering ---- */

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/* Natural order ("File 2" before "File 10"), then plain code-unit order so
 * names that differ only by case or accent still sort the same way every
 * time. */
function natural(a, b) {
  return collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

/* Folder paths compared segment by segment, so a folder's subfolders follow it
 * directly ("A", "A/B", "A B") instead of wherever "/" happens to collate. */
function cmpFolderPath(a, b) {
  if (a === b) return 0;
  const sa = a ? a.split("/") : [];
  const sb = b ? b.split("/") : [];
  const n = Math.min(sa.length, sb.length);
  for (let i = 0; i < n; i++) {
    const c = natural(sa[i], sb[i]);
    if (c) return c;
  }
  return sa.length - sb.length;
}

/* Per-entry search data and precomputed sort ranks, kept off the FileEntry
 * objects so their shape stays what the pages were promised. Ranks turn the
 * common sorts into integer compares — a manifest can be tens of thousands of
 * files, and Intl compares add up. */
const META = new WeakMap();

function metaOf(e) {
  let m = META.get(e);
  if (!m) {
    const nameNorm = normalize(e.name);
    const wordStarts = new Set();
    let at = 0;
    for (const w of nameNorm ? nameNorm.split(" ") : []) {
      wordStarts.add(at);
      at += w.length;
    }
    const dot = e.name.lastIndexOf(".");
    const stemNorm = normalize(dot > 0 ? e.name.slice(0, dot) : e.name);
    m = {
      nameNorm,
      nameSquash: nameNorm.replace(/ /g, ""),
      wordStarts,
      stemNorm,
      stemSquash: stemNorm.replace(/ /g, ""),
      fRank: undefined, // position in folder-then-name order
      nRank: undefined, // position in name-then-folder order
    };
    META.set(e, m);
  }
  return m;
}

function ranks(a, b, key) {
  const ma = META.get(a);
  const mb = META.get(b);
  return ma && mb && ma[key] !== undefined && mb[key] !== undefined ? ma[key] - mb[key] : null;
}

function cmpFolderThenName(a, b) {
  const r = ranks(a, b, "fRank");
  if (r !== null) return r;
  return cmpFolderPath(a.folder, b.folder) || natural(a.name, b.name) || natural(a.path, b.path);
}

function cmpNameThenFolder(a, b) {
  const r = ranks(a, b, "nRank");
  if (r !== null) return r;
  return natural(a.name, b.name) || cmpFolderPath(a.folder, b.folder) || natural(a.path, b.path);
}

/* ---- the library ---- */

/** files = [{ path, size, lastModified }] (the manifest) →
 *  { files: FileEntry[], folders: Map<path, FolderEntry>, clutterCount }
 *
 *  FileEntry  { path, name, folder, ext, kind, preview, size, year, clutter,
 *               copies, hay, squash }
 *    folder "" = the root; hay = normalize(folder + " " + name); squash = hay
 *    without spaces (so "w2" finds "W-2"); copies = files anywhere with the
 *    same name (any case) AND size, this one included.
 *  FolderEntry { path, name, parent, folders: child paths, files: direct
 *               FileEntry[] (clutter included), count, size, clutterCount }
 *    count/size/clutterCount are RECURSIVE; count/size exclude clutter. The
 *    root is path "" named "All files" with parent null. Every ancestor of
 *    every file exists.
 *  `files` comes back in folder-then-name order. Blank paths, folder markers
 *  ("a/b/") and repeated paths are skipped. */
export function buildLibrary(files) {
  const folders = new Map();
  const ensure = (path) => {
    let f = folders.get(path);
    if (f) return f;
    const slash = path.lastIndexOf("/");
    const parent = path === "" ? null : slash === -1 ? "" : path.slice(0, slash);
    f = {
      path,
      name: path === "" ? ROOT_NAME : path.slice(slash + 1),
      parent,
      folders: [],
      files: [],
      count: 0,
      size: 0,
      clutterCount: 0,
    };
    folders.set(path, f);
    if (parent !== null) ensure(parent).folders.push(path);
    return f;
  };
  ensure("");

  const entries = [];
  const seen = new Set();
  const copyCounts = new Map();
  for (const raw of files || []) {
    const path = raw && typeof raw.path === "string" ? raw.path : "";
    if (!path || path.endsWith("/") || seen.has(path)) continue;
    const { folder, name } = splitPath(path);
    if (!name) continue;
    seen.add(path);
    const n = Number(raw.size);
    const size = Number.isFinite(n) && n > 0 ? n : 0;
    const hay = normalize(`${folder} ${name}`);
    const e = {
      path,
      name,
      folder,
      ext: extOf(path),
      kind: kindOf(path),
      preview: previewOf(path),
      size,
      year: yearOf(path),
      clutter: isClutter(path),
      copies: 1,
      hay,
      squash: hay.replace(/ /g, ""),
    };
    entries.push(e);
    metaOf(e);
    const key = `${name.toLowerCase()} ${size}`;
    copyCounts.set(key, (copyCounts.get(key) || 0) + 1);

    const home = ensure(folder);
    home.files.push(e);
    for (let f = home; f; f = f.parent === null ? null : folders.get(f.parent)) {
      if (e.clutter) f.clutterCount++;
      else {
        f.count++;
        f.size += size;
      }
    }
  }

  for (const e of entries) e.copies = copyCounts.get(`${e.name.toLowerCase()} ${e.size}`);

  for (const f of folders.values()) {
    f.folders.sort((a, b) => natural(folders.get(a).name, folders.get(b).name));
    f.files.sort((a, b) => natural(a.name, b.name) || natural(a.path, b.path));
  }

  /* Folder-then-name order is a walk of the sorted tree: a folder's own files,
   * then each subfolder in turn. */
  const ordered = [];
  const walk = (path) => {
    const f = folders.get(path);
    for (const e of f.files) ordered.push(e);
    for (const child of f.folders) walk(child);
  };
  walk("");
  ordered.forEach((e, i) => {
    metaOf(e).fRank = i;
  });
  entries
    .slice()
    .sort((a, b) => natural(a.name, b.name) || cmpFolderPath(a.folder, b.folder) || natural(a.path, b.path))
    .forEach((e, i) => {
      metaOf(e).nRank = i;
    });

  return { files: ordered, folders, clutterCount: folders.get("").clutterCount };
}

/** The folder to open first. Uploads usually arrive wrapped in one folder
 *  (or a chain of them), so descend from the root while a folder holds
 *  exactly one subfolder — one with real files in it — and no non-clutter
 *  files of its own. */
export function startFolder(lib) {
  const folders = lib && lib.folders;
  let cur = "";
  for (let guard = 0; folders && guard < 1000; guard++) {
    const f = folders.get(cur);
    if (!f || f.folders.length !== 1 || f.files.some((e) => !e.clutter)) break;
    const child = folders.get(f.folders[0]);
    if (!child || child.count === 0) break;
    cur = child.path;
  }
  return cur;
}

function cleanFolder(folder) {
  return String(folder ?? "")
    .split("/")
    .filter(Boolean)
    .join("/");
}

function inScope(folder, scope) {
  return !scope || folder === scope || folder.startsWith(`${scope}/`);
}

function atWordStart(m, token) {
  for (let i = m.nameSquash.indexOf(token); i !== -1; i = m.nameSquash.indexOf(token, i + 1)) {
    if (m.wordStarts.has(i)) return true;
  }
  return false;
}

/** Search + filter → FileEntry[], best first.
 *  - scope: a folder path; its whole subtree is searched ("" = everything).
 *  - kinds: a Set of KINDS ids (null or empty = any). year: a number (or its
 *    string) — null/"" = any. Clutter is left out unless includeClutter.
 *  - Every query word must appear in the file's folder path + name, either as
 *    typed or with the spaces squeezed out ("w2" finds "W-2" and "w 2").
 *  - Score per word: 8 at the start of a word in the NAME, 5 anywhere in the
 *    name, 2 when only the folder has it; +6 when the whole query is the name
 *    (with or without its extension). Ties: natural name, then folder.
 *  - No query words: folder-then-name order. */
export function searchFiles(
  lib,
  { query = "", scope = "", kinds = null, year = null, includeClutter = false } = {},
) {
  const tokens = queryTokens(query);
  const qNorm = tokens.join(" ");
  const qSquash = tokens.join("");
  const kindSet = kinds == null ? null : kinds instanceof Set ? kinds : new Set(kinds);
  const wantKinds = kindSet && kindSet.size ? kindSet : null;
  const y = year === null || year === undefined || year === "" ? NaN : Number(year);
  const wantYear = Number.isFinite(y) ? y : null;
  const sc = cleanFolder(scope);

  const out = [];
  const scores = new Map();
  for (const e of (lib && lib.files) || []) {
    if (e.clutter && !includeClutter) continue;
    if (!inScope(e.folder, sc)) continue;
    if (wantKinds && !wantKinds.has(e.kind)) continue;
    if (wantYear !== null && e.year !== wantYear) continue;
    if (tokens.length) {
      if (!tokens.every((t) => e.hay.includes(t) || e.squash.includes(t))) continue;
      const m = metaOf(e);
      let score = 0;
      for (const t of tokens) {
        if (atWordStart(m, t)) score += 8;
        else if (m.nameSquash.includes(t)) score += 5;
        else score += 2;
      }
      if (
        qNorm === m.stemNorm ||
        qSquash === m.stemSquash ||
        qNorm === m.nameNorm ||
        qSquash === m.nameSquash
      ) {
        score += 6;
      }
      scores.set(e, score);
    }
    out.push(e);
  }
  if (tokens.length) out.sort((a, b) => scores.get(b) - scores.get(a) || cmpNameThenFolder(a, b));
  else out.sort(cmpFolderThenName);
  return out;
}

/** Counts for the filter chips, over whatever `entries` the page is showing.
 *  → { kinds: Map<kindId, n> in KINDS order,
 *      years: Map<year, n> newest first (files with no year aren't counted),
 *      folders: Map<childFolderPath, n> — each entry under its first folder
 *        level BELOW scope, biggest first; entries directly in scope (or
 *        outside it) aren't counted here }. */
export function facetCounts(entries, scope = "") {
  const sc = cleanFolder(scope);
  const kinds = new Map();
  const years = new Map();
  const folders = new Map();
  for (const e of entries || []) {
    kinds.set(e.kind, (kinds.get(e.kind) || 0) + 1);
    if (e.year !== null && e.year !== undefined) years.set(e.year, (years.get(e.year) || 0) + 1);
    let rest;
    if (!sc) rest = e.folder;
    else if (e.folder.startsWith(`${sc}/`)) rest = e.folder.slice(sc.length + 1);
    else continue;
    if (!rest) continue;
    const slash = rest.indexOf("/");
    const child = (sc ? `${sc}/` : "") + (slash === -1 ? rest : rest.slice(0, slash));
    folders.set(child, (folders.get(child) || 0) + 1);
  }
  return {
    kinds: new Map([...kinds].sort((a, b) => kindRank(a[0]) - kindRank(b[0]))),
    years: new Map([...years].sort((a, b) => b[0] - a[0])),
    folders: new Map([...folders].sort((a, b) => b[1] - a[1] || cmpFolderPath(a[0], b[0]))),
  };
}

function kindRank(id) {
  return KIND_RANK.has(id) ? KIND_RANK.get(id) : KINDS.length;
}

/** A sorted copy. key: "relevance" (as given), "name", "size" (largest
 *  first), "folder" (folder then name), "kind" (KINDS order then name). */
export function sortEntries(entries, key) {
  const list = Array.from(entries || []);
  switch (key) {
    case "name":
      return list.sort(cmpNameThenFolder);
    case "size":
      return list.sort((a, b) => (b.size || 0) - (a.size || 0) || cmpNameThenFolder(a, b));
    case "folder":
      return list.sort(cmpFolderThenName);
    case "kind":
      return list.sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || cmpNameThenFolder(a, b));
    default:
      return list;
  }
}

/** "A/B" → [{ path: "", name: "All files" }, { path: "A", name: "A" },
 *  { path: "A/B", name: "B" }]. */
export function crumbs(folderPath) {
  const out = [{ path: "", name: ROOT_NAME }];
  let acc = "";
  for (const seg of cleanFolder(folderPath).split("/").filter(Boolean)) {
    acc = acc ? `${acc}/${seg}` : seg;
    out.push({ path: acc, name: seg });
  }
  return out;
}

/** The viewer URL for a file. The path rides in the fragment — see the
 *  header for why it must never be a query string. */
export function viewHref(path) {
  return `/file-drop/view#${encodeURIComponent(String(path ?? ""))}`;
}

/** location.hash → the file path, or "" when it is missing or garbled. The
 *  "#" is optional, and a whole viewHref/URL works too: everything after the
 *  first "#" is the path (an encoded path never contains a raw "#"). */
export function pathFromHash(hash) {
  const s = String(hash ?? "");
  const at = s.indexOf("#");
  const raw = at === -1 ? s : s.slice(at + 1);
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return "";
  }
}

/** For the viewer's prev/next: → { files: the non-clutter files in `path`'s
 *  folder, natural order; index: where `path` is in them, -1 if it isn't
 *  (unknown path, or a clutter file) }. */
export function siblings(lib, path) {
  const f = lib && lib.folders ? lib.folders.get(splitPath(path).folder) : null;
  const files = f ? f.files.filter((e) => !e.clutter) : [];
  return { files, index: files.findIndex((e) => e.path === path) };
}

/** Split `text` into [{ text, hit }] around every query word, matched the way
 *  search matches (case- and accent-insensitive, and across punctuation when
 *  a word only matches squeezed: "w2" lights up "W-2"). Joining every part's
 *  text gives back `text` exactly.
 *
 *  Each character is normalized on its own and every normalized unit
 *  remembers which character it came from, so a match maps back onto the
 *  original string. A character that normalizes to nothing (a combining
 *  accent, a variation selector) takes its neighbour's state, so an accent is
 *  never split from its letter; one that expands ("ﬁ", "½") is marked whole. */
export function highlightParts(text, query) {
  const s = String(text ?? "");
  if (!s) return [];
  const tokens = queryTokens(query);
  if (!tokens.length) return [{ text: s, hit: false }];

  const starts = []; // UTF-16 offset of each code point, plus the end
  const inherit = []; // code point normalizes to nothing
  let norm = "";
  const owner = []; // norm UTF-16 unit → code point index
  let offset = 0;
  for (const ch of s) {
    const i = starts.length;
    starts.push(offset);
    offset += ch.length;
    const piece = fold(ch).replace(NON_ALNUM, " ");
    inherit.push(piece === "");
    for (let k = 0; k < piece.length; k++) {
      if (piece[k] === " " && (norm === "" || norm[norm.length - 1] === " ")) continue;
      norm += piece[k];
      owner.push(i);
    }
  }
  starts.push(offset);

  let squash = "";
  const squashOwner = [];
  for (let j = 0; j < norm.length; j++) {
    if (norm[j] === " ") continue;
    squash += norm[j];
    squashOwner.push(owner[j]);
  }

  const count = starts.length - 1;
  const hit = new Array(count).fill(false);
  const mark = (own, at, len) => {
    for (let c = own[at]; c <= own[at + len - 1]; c++) hit[c] = true;
  };
  for (const t of tokens) {
    let found = false;
    for (let j = norm.indexOf(t); j !== -1; j = norm.indexOf(t, j + 1)) {
      mark(owner, j, t.length);
      found = true;
    }
    if (found) continue;
    for (let j = squash.indexOf(t); j !== -1; j = squash.indexOf(t, j + 1)) {
      mark(squashOwner, j, t.length);
    }
  }
  for (let i = 1; i < count; i++) if (inherit[i]) hit[i] = hit[i - 1];

  const parts = [];
  for (let i = 0; i < count; i++) {
    const piece = s.slice(starts[i], starts[i + 1]);
    const last = parts[parts.length - 1];
    if (last && last.hit === hit[i]) last.text += piece;
    else parts.push({ text: piece, hit: hit[i] });
  }
  return parts;
}

/** 1, 2048 → "1 file · 2.00 KB"; the summary line under a folder. */
export function filesLine(count, size) {
  const n = Number(count) || 0;
  return `${n.toLocaleString("en-US")} file${n === 1 ? "" : "s"} · ${formatBytes(Number(size) || 0)}`;
}
