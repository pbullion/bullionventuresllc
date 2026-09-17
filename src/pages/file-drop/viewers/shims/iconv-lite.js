/* File Drop viewer — a stand-in for `iconv-lite`, swapped in by the alias in
 * vite.config.js.
 *
 * @kenjiuno/msgreader (the .msg viewer) imports iconv-lite for one job:
 * decoding 8-bit ("ANSI") text properties in an older Outlook file. The real
 * package drags in `safer-buffer`, which reads `require("buffer").Buffer.
 * prototype` at load time — undefined in a browser build, so the email chunk
 * would throw before showing anything — plus several hundred KB of code-page
 * tables. Every browser already ships those tables in TextDecoder.
 *
 * msgreader only ever calls `decode` (and only when the viewer passes an
 * `ansiEncoding`); `encode` is used by its writer, which the viewer never
 * reaches with an encoding, so it refuses rather than guessing. */

function decoder(encoding) {
  try {
    return new TextDecoder(String(encoding || "utf-8"));
  } catch {
    return new TextDecoder("windows-1252"); // an unknown label: the Western default
  }
}

export function decode(bytes, encoding) {
  return decoder(encoding).decode(bytes);
}

export function encode() {
  throw new Error("Encoding text isn't supported in the browser viewer");
}

export function encodingExists(encoding) {
  try {
    new TextDecoder(String(encoding));
    return true;
  } catch {
    return false;
  }
}

export default { decode, encode, encodingExists };
