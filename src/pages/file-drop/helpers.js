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

/** Turn a low-level file/network error into something she can act on. */
export function humanError(err) {
  if (!err) return "Something went wrong";
  if (err.name === "NotReadableError" || err.name === "NotFoundError") {
    return "This computer couldn't read the file. If it's in OneDrive, right-click it and choose \"Always keep on this device\", then retry.";
  }
  if (err.name === "SecurityError") return "The browser wouldn't let the page read this file";
  return err.message || String(err);
}
