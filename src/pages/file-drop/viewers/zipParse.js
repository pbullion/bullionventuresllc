/* File Drop viewer — zip listing behind ZipView.jsx. No DOM, so the same code
 * runs under node against real files (counts only). Imported ONLY by the lazy
 * viewer chunk.
 *
 * Listing reads the zip's directory and decompresses nothing; an entry is
 * only inflated when someone presses Open or Download on it. */

import JSZip from "jszip";

import { isClutter, previewOf, splitPath } from "../library.js";

/* Unpacking happens in memory, so a single entry bigger than this is refused
 * rather than taking the tab down (a zip can claim any size it likes). */
export const MAX_ENTRY_BYTES = 200 * 1024 * 1024;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Zip bytes → { entries: [{ path, folder, name, size (number|null), preview,
 *  file }], clutter: n, folders: n }, sorted folder-then-name. Directories are
 *  skipped; clutter (__MACOSX, Thumbs.db, …) is counted, not listed. Throws on
 *  an encrypted or corrupt zip. */
export async function readZip(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const entries = [];
  const folders = new Set();
  let clutter = 0;
  zip.forEach((relPath, file) => {
    if (file.dir) return;
    const path = relPath.replace(/\\/g, "/");
    if (isClutter(path)) {
      clutter++;
      return;
    }
    const { folder, name } = splitPath(path);
    if (!name) return;
    if (folder) folders.add(folder);
    entries.push({ path, folder, name, size: uncompressedSize(file), preview: previewOf(name), file });
  });
  entries.sort(
    (a, b) =>
      collator.compare(a.folder, b.folder) || collator.compare(a.name, b.name) || (a.path < b.path ? -1 : 1),
  );
  return { entries, clutter, folders: folders.size };
}

/* JSZip keeps the central directory's size on a private field; it is only a
 * label here, so a missing one just isn't shown. */
function uncompressedSize(file) {
  const d = file && file._data;
  return d && typeof d.uncompressedSize === "number" ? d.uncompressedSize : null;
}

/** One entry → Uint8Array, refusing anything over MAX_ENTRY_BYTES. */
export async function entryBytes(entry) {
  if (entry.size !== null && entry.size > MAX_ENTRY_BYTES) {
    throw new Error("That file is too big to unpack in the browser — download the whole zip instead");
  }
  return entry.file.async("uint8array");
}
