/* File Drop — small browser-only helpers shared by the two pages. Kept out of
 * the .jsx files so those export only components (react-refresh). */

import { useEffect } from "react";

/** Title + `<meta name="robots" content="noindex, nofollow">` for the life of
 *  the page. Injected, not in index.html: one SPA, one document head — a
 *  static tag would de-index the whole site. Same technique as /jump. */
export function useNoindex(title) {
  useEffect(() => {
    document.title = title;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = "Bullion Ventures LLC";
      meta.remove();
    };
  }, [title]);
}

export function readSession(key) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

export function writeSession(key, value) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    /* private mode etc. — the code just won't survive a reload */
  }
}

/* Resumable multipart uploads are remembered in localStorage under keys
 * starting with this (see helpers.fingerprint). */
const RESUME_PREFIX = "fileDrop.mp.";

/** How many big-file uploads this browser started and never finished. */
export function countUnfinishedUploads() {
  try {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(RESUME_PREFIX)) n++;
    }
    return n;
  } catch {
    return 0;
  }
}

/** Forget everything File Drop saved in this browser: resume records (they
 *  hold file paths) and the code in sessionStorage. */
export function forgetThisComputer(sessionKeys = []) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(RESUME_PREFIX)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* blocked storage — nothing was saved there either */
  }
  for (const k of sessionKeys) writeSession(k, "");
}

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the execCommand path
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

/** Navigate a hidden anchor — for a presigned URL (whose
 *  Content-Disposition makes it a download) or a Blob with a filename. */
export function clickDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href;
  if (filename) a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  clickDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---- drag and drop: walk dropped folders ---- */

function readAllEntries(dirEntry) {
  const reader = dirEntry.createReader();
  return new Promise((resolve, reject) => {
    const all = [];
    /* readEntries hands back a batch (Chrome: ≤100) per call. It is done only
     * when a call returns an EMPTY array — stopping after the first batch
     * silently drops everything past file 100 in a folder. */
    const next = () =>
      reader.readEntries((batch) => {
        if (!batch.length) resolve(all);
        else {
          for (const e of batch) all.push(e);
          next();
        }
      }, reject);
    next();
  });
}

function entryFile(entry) {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

/** DataTransfer → [{ file, rel }], recursing into folders.
 *  `entries` must be collected synchronously inside the drop handler (the
 *  DataTransfer is emptied once the event returns) — see entriesFromDrop.
 *  onCount(n) reports progress; unreadable files are returned in `errors`. */
export async function walkEntries(entries, onCount) {
  const out = [];
  const errors = [];
  const stack = [...entries];
  while (stack.length) {
    const entry = stack.pop();
    if (!entry) continue;
    if (entry.isDirectory) {
      try {
        const kids = await readAllEntries(entry);
        for (const k of kids) stack.push(k);
      } catch (e) {
        errors.push({ path: entry.fullPath.replace(/^\/+/, ""), error: e?.message || "Couldn't read folder" });
      }
    } else if (entry.isFile) {
      try {
        const file = await entryFile(entry);
        out.push({ file, rel: entry.fullPath.replace(/^\/+/, "") || file.name });
        if (onCount && out.length % 250 === 0) onCount(out.length);
      } catch (e) {
        errors.push({ path: entry.fullPath.replace(/^\/+/, ""), error: e?.message || "Couldn't read file" });
      }
    }
  }
  if (onCount) onCount(out.length);
  return { files: out, errors };
}

/** Call synchronously in onDrop. Returns entries, or null when the browser
 *  has no webkitGetAsEntry (then fall back to dataTransfer.files). */
export function entriesFromDrop(dataTransfer) {
  const items = dataTransfer?.items;
  if (!items || !items.length || typeof items[0].webkitGetAsEntry !== "function") return null;
  const entries = [];
  for (const it of items) {
    if (it.kind !== "file") continue;
    const e = it.webkitGetAsEntry();
    if (e) entries.push(e);
  }
  return entries;
}
