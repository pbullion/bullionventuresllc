/* File Drop — pure helpers. No DOM, no React, no network: everything here runs
 * under plain node, which is how the curl-script quoting and the junk filter
 * were checked. */

export const KiB = 1024;
export const MiB = 1024 * KiB;
export const GiB = 1024 * MiB;

/** 1536 → "1.5 KB". Binary units with the everyday labels. */
export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < KiB) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / KiB;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)} ${units[i]}`;
}

/** 3725 → "1h 2m". */
export function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const JUNK_NAMES = new Set([".ds_store", "thumbs.db", "desktop.ini"]);

/** Files nobody wants moved: Finder/Explorer droppings, Office lock files
 *  (`~$Report.docx`) and temp files. Takes a name OR a relative path. */
export function isJunkFile(nameOrPath) {
  if (typeof nameOrPath !== "string") return false;
  const base = nameOrPath.split(/[\\/]/).pop() || "";
  const lower = base.toLowerCase();
  if (JUNK_NAMES.has(lower)) return true;
  if (base.startsWith("~$")) return true;
  if (lower.endsWith(".tmp")) return true;
  return false;
}

/** localStorage key for a resumable multipart upload. A file is "the same
 *  file" if its path, size and modified time all match. */
export function fingerprint(path, size, lastModified) {
  return `fileDrop.mp.${path}|${size}|${lastModified}`;
}

/** "My Stuff" + "Docs/a.txt" → "My Stuff/Docs/a.txt". Empty folder → the
 *  relative path unchanged. The server re-sanitizes everything; this only
 *  keeps obvious slashes tidy. */
export function joinFolder(folder, rel) {
  const r = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const f = String(folder || "")
    .replace(/\\/g, "/")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  return f ? `${f}/${r}` : r;
}

export function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/** Wrap a string for bash so it is taken literally, whatever it contains:
 *  single quotes stop ALL expansion, and an embedded ' becomes '\''. */
export function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

/** Build the terminal fallback: a bash script that curls every presigned URL
 *  into $DEST, recreating folders. `items` = [{ path, url }]. Paths go in
 *  single quotes AFTER the "$DEST" expansion — `-o "$DEST"/'a b'` — so a file
 *  named `$(rm -rf ~)` is just a file name. */
export function buildCurlScript(items, { generatedAt = new Date(), expiresHours = 12 } = {}) {
  const n = items.length;
  const lines = [
    "#!/usr/bin/env bash",
    "# File Drop download script — generated " + new Date(generatedAt).toISOString(),
    `# ${n} file${n === 1 ? "" : "s"}. The links inside expire ${expiresHours} hours after that.`,
    "# Usage: bash file-drop-download.sh [destination folder]",
    "# Safe to re-run: curl -C - resumes partial files.",
    "set -u",
    'DEST="${1:-$HOME/Downloads/file-drop}"',
    'mkdir -p "$DEST"',
    "FAILED=0",
    "",
  ];
  items.forEach((it, i) => {
    const q = shellQuote(it.path);
    lines.push(`echo "[${i + 1}/${n}] "${q}`);
    lines.push(
      `curl --fail --retry 5 --retry-delay 3 -C - --create-dirs -o "$DEST"/${q} ${shellQuote(it.url)} || { FAILED=$((FAILED+1)); echo "  FAILED: "${q} >&2; }`,
    );
  });
  lines.push("");
  lines.push('if [ "$FAILED" -gt 0 ]; then');
  lines.push('  echo "$FAILED file(s) failed — run the script again to retry them." >&2');
  lines.push("  exit 1");
  lines.push("fi");
  lines.push(`echo "Done: ${n} file(s) in $DEST"`);
  return lines.join("\n") + "\n";
}

export const TOP_LEVEL = "";

/** Group a manifest by its first path segment. Loose files at the root land in
 *  a group whose `name` is "" (render it as "(top level)").
 *  → [{ name, count, size, files }] sorted by name, top level last. */
export function folderBreakdown(files) {
  const map = new Map();
  for (const f of files) {
    const i = f.path.indexOf("/");
    const name = i === -1 ? TOP_LEVEL : f.path.slice(0, i);
    let g = map.get(name);
    if (!g) {
      g = { name, count: 0, size: 0, files: [] };
      map.set(name, g);
    }
    g.count++;
    g.size += f.size || 0;
    g.files.push(f);
  }
  return [...map.values()].sort((a, b) => {
    if (a.name === TOP_LEVEL) return 1;
    if (b.name === TOP_LEVEL) return -1;
    return a.name.localeCompare(b.name);
  });
}

/** Speed/ETA smoother. Feed it a MONOTONIC byte counter with a timestamp; it
 *  reports the average rate over the last `windowMs` (10s by default), which
 *  is steady enough to read and still reacts to a stall. */
export function createSpeedMeter(windowMs = 10000) {
  let samples = [];
  return {
    add(now, bytes) {
      samples.push({ t: now, b: bytes });
      const cutoff = now - windowMs;
      /* keep one sample at/before the cutoff so the window stays full */
      while (samples.length > 2 && samples[1].t <= cutoff) samples.shift();
    },
    rate() {
      if (samples.length < 2) return 0;
      const a = samples[0];
      const z = samples[samples.length - 1];
      const dt = (z.t - a.t) / 1000;
      if (dt <= 0.2) return 0;
      return Math.max(0, (z.b - a.b) / dt);
    },
    eta(remainingBytes) {
      const r = this.rate();
      if (!(r > 0) || !(remainingBytes >= 0)) return null;
      return remainingBytes / r;
    },
    reset() {
      samples = [];
    },
  };
}

/** Exponential backoff with jitter: 1s, 2s, 4s … capped at 30s, each scaled
 *  into [50%, 100%] so a burst of failures doesn't retry in lockstep. */
export function backoffMs(attempt, { base = 1000, cap = 30000, random = Math.random } = {}) {
  const raw = Math.min(cap, base * 2 ** Math.max(0, attempt));
  return Math.round(raw * (0.5 + random() * 0.5));
}

export const UNREADABLE_MESSAGE =
  "This computer couldn't read the file. It may have changed after it was picked, be open in " +
  "another program (close Outlook before sending .pst files), or be a OneDrive online-only " +
  "file (right-click it and choose \"Always keep on this device\"). Fix that, then pick the " +
  "file again and send it — Retry alone won't help this one.";

/** Turn a low-level file/network error into something she can act on. */
export function humanError(err) {
  if (!err) return "Something went wrong";
  if (err.unreadable || err.name === "NotReadableError" || err.name === "NotFoundError") {
    return UNREADABLE_MESSAGE;
  }
  if (err.name === "SecurityError") return "The browser wouldn't let the page read this file";
  return err.message || String(err);
}

/** Can the first byte of this Blob be read? Resolves null when it can, or the
 *  read error when it can't.
 *
 *  Why: Chrome refuses to read a File that changed after it was picked, is
 *  locked by another program (an open Outlook .pst) or is a OneDrive
 *  placeholder — but an XHR upload of that same File only reports a generic
 *  network error (status 0). Reading one byte tells the two apart. Something
 *  without slice/arrayBuffer (a test fake) counts as readable. */
export async function probeReadable(blob) {
  if (!blob || typeof blob.slice !== "function") return null;
  let piece;
  try {
    piece = blob.slice(0, 1);
  } catch (e) {
    return e || new Error("unreadable");
  }
  if (!piece || typeof piece.arrayBuffer !== "function") return null;
  try {
    await piece.arrayBuffer();
    return null;
  } catch (e) {
    return e || new Error("unreadable");
  }
}

/** An Error the engines treat as "this file can't be read — don't retry". */
export function unreadableError(cause) {
  const e = new Error(UNREADABLE_MESSAGE);
  e.unreadable = true;
  e.permanent = true;
  e.cause = cause;
  return e;
}

export const EXISTS_MESSAGE =
  "A different file with this name is already uploaded, so this one wasn't sent — nothing is " +
  "ever replaced. Pick this file again and it goes up with a number added to its name.";

/** The upload code can't replace a file (the backend signs If-None-Match: *).
 *  When the key turns out to be taken by a file of a DIFFERENT size — the
 *  pre-flight renames those, so this only happens when something else
 *  uploaded there in the meantime — the file fails with this. Retrying can't
 *  help; picking it again renames it. */
export function existsError() {
  const e = new Error(EXISTS_MESSAGE);
  e.exists = true;
  e.permanent = true;
  return e;
}

/** "a/b/Resume.docx", 2 → "a/b/Resume (2).docx". A leading-dot name has no
 *  extension to keep: ".profile", 2 → ".profile (2)". */
export function numberedPath(path, n) {
  const slash = path.lastIndexOf("/");
  const dir = slash === -1 ? "" : path.slice(0, slash + 1);
  const base = path.slice(slash + 1);
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  return `${dir}${stem} (${n})${ext}`;
}

/** The upload pre-flight, as a pure function.
 *
 *  entries:  [{ path, size, lastModified, ...anything }] in pick order, `path`
 *            already resolved by the server (names it rejected are left out).
 *  existing: Map(path → size) of what is already in S3 (the manifest).
 *
 *  Nothing ever overwrites a DIFFERENT file:
 *   - the same file picked twice (same path, size AND lastModified) goes up
 *     once — that's a duplicate;
 *   - a path already in S3 at the same size is "already uploaded" (this is
 *     what makes re-picking the same folders resume);
 *   - any other clash — two different files that resolve to one path, or a
 *     path that is in S3 at a different size — gives the later file
 *     "name (2).ext", the first number free in both S3 and this list. If that
 *     numbered path is already in S3 at this file's size, it is already
 *     uploaded (it went up as "(2)" last time).
 *  Deterministic for the same picks in the same order, so an interrupted
 *  multipart upload of a renamed file resumes under the same name.
 *
 *  → { toUpload: [entry with final path], already: [entry], duplicates,
 *      renamed: [{ from, to }] } */
export function planUploads(entries, existing) {
  const claimed = new Map(); // path → { size, lastModified } taken by this plan
  const toUpload = [];
  const already = [];
  const renamed = [];
  let duplicates = 0;
  const same = (c, e) => c.size === e.size && c.lastModified === e.lastModified;
  for (const e of entries) {
    const want = e.path;
    let placed = false;
    for (let n = 1; n < 100000 && !placed; n++) {
      const path = n === 1 ? want : numberedPath(want, n);
      const c = claimed.get(path);
      if (c) {
        if (same(c, e)) {
          duplicates++;
          placed = true;
        }
        continue; // taken by a different file in this list
      }
      if (existing.has(path)) {
        if (existing.get(path) === e.size) {
          claimed.set(path, { size: e.size, lastModified: e.lastModified });
          already.push({ ...e, path });
          placed = true;
        }
        continue; // a different file is already there under this name
      }
      claimed.set(path, { size: e.size, lastModified: e.lastModified });
      toUpload.push({ ...e, path });
      if (path !== want) renamed.push({ from: want, to: path });
      placed = true;
    }
  }
  return { toUpload, already, duplicates, renamed };
}
