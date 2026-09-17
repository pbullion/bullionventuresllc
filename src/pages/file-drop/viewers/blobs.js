/* File Drop viewer — handing a file that lives INSIDE a file (an email
 * attachment, a zip entry) to the browser. Imported only by the lazy viewer
 * chunks. */

import { downloadBlob } from "../browser.js";
import { nativeMime } from "../library.js";

/** A name safe to hand a download: no path, no leading dots, not endless. */
export function safeName(name) {
  const clean = String(name || "")
    .replace(/[\\/]+/g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 180);
  return clean || "file";
}

function blobOf(bytes, name) {
  /* The type comes from the extension and is deliberately narrow (the same
   * allow-list the backend signs inline links for): a name the browser might
   * sniff as HTML gets application/octet-stream, so opening it in a tab can't
   * run anything. */
  return new Blob([bytes], { type: nativeMime(name) || "application/octet-stream" });
}

export function saveBytes(bytes, name) {
  downloadBlob(blobOf(bytes, name), safeName(name));
}

/** Open bytes we already have in a new tab, and let go of the URL after a
 *  minute — long enough for the tab to have loaded it. */
export function openBytes(bytes, name) {
  const url = URL.createObjectURL(blobOf(bytes, name));
  const win = window.open(url, "_blank", "noopener");
  /* Popups blocked (iOS with the setting off, a desktop blocker): opening
   * quietly did nothing at all before. Save it instead — the press has to
   * produce something. */
  if (!win) {
    URL.revokeObjectURL(url);
    saveBytes(bytes, name);
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Open bytes that still have to be unpacked. The tab is opened NOW, while the
 *  press still counts as a user gesture — a popup opened after an `await` is
 *  blocked on iOS — and pointed at the blob once it is ready. Its `opener` is
 *  cut immediately, which is what `noopener` would have done. If popups are
 *  blocked anyway the file is saved instead of silently doing nothing. */
export async function openLater(load, name) {
  const win = window.open("", "_blank");
  if (win) {
    try {
      win.opener = null;
    } catch {
      /* a browser that won't let us: the tab is still ours and blank */
    }
  }
  let bytes;
  try {
    bytes = await load();
  } catch (err) {
    if (win) win.close();
    throw err;
  }
  if (!win) {
    saveBytes(bytes, name);
    return;
  }
  const url = URL.createObjectURL(blobOf(bytes, name));
  win.location.replace(url);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
