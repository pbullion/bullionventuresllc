/* File Drop viewer — email parsing behind EmailView.jsx. No DOM and no React,
 * so the same code runs under node against real files (counts only).
 * Imported ONLY by the lazy viewer chunk: msgreader, the RTF parser and the
 * Buffer polyfill must never reach the main bundle.
 *
 * Both formats come out as one shape:
 *   { subject, from, to, cc, date (Date|null), dateText,
 *     html (string|null), text (string|null), bodySource,
 *     attachments: [{ key, name, size (number|null), mime, cid, embedded,
 *                     bytes() → Uint8Array }] }
 *
 * The HTML is UNTRUSTED. It is only ever shown through `emailDocument()`
 * inside `<iframe sandbox="">` — never in the page itself. */

import MsgReaderModule from "@kenjiuno/msgreader";
import { decompressRTF } from "@kenjiuno/decompressrtf";
import { deEncapsulateSync } from "rtf-stream-parser";
import { Buffer as BufferPolyfill } from "buffer";

import { extOf, nativeMime } from "../library.js";

/* msgreader is CommonJS with `exports.default`: a bundler hands back the class,
 * plain node hands back the whole exports object. Accept both. */
const MsgReader =
  typeof MsgReaderModule === "function" ? MsgReaderModule : MsgReaderModule.default;

/* Inline images over this stay broken rather than become a giant data: URL. */
const MAX_INLINE_IMAGE_BYTES = 10 * 1024 * 1024;

/* ---- text decoding ---- */

/* Windows code page → a TextDecoder label. The RTF parser asks for "cp1252"
 * style names; .msg files carry the bare number. */
const CODEPAGE_LABELS = {
  65001: "utf-8",
  20127: "utf-8",
  1200: "utf-16le",
  1201: "utf-16be",
  28591: "iso-8859-1",
  932: "shift_jis",
  936: "gbk",
  949: "euc-kr",
  950: "big5",
  874: "windows-874",
  20866: "koi8-r",
  21866: "koi8-u",
  50220: "iso-2022-jp",
  51932: "euc-jp",
  10000: "macintosh",
};

export function codepageLabel(codepage) {
  const n = Number(String(codepage ?? "").replace(/^cp/i, ""));
  if (!Number.isFinite(n) || n <= 0) return "windows-1252";
  if (CODEPAGE_LABELS[n]) return CODEPAGE_LABELS[n];
  if (n >= 1250 && n <= 1258) return `windows-${n}`;
  if (n >= 28592 && n <= 28606) return `iso-8859-${n - 28590}`;
  return "windows-1252";
}

/** Bytes → string in `label`, falling back to UTF-8 for a label this browser
 *  doesn't know. Never throws. */
export function decodeBytes(bytes, label = "utf-8") {
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/* A "binary string" holds one byte per UTF-16 unit — how MIME is parsed here,
 * so a body's bytes survive until its own charset is known. TextDecoder's
 * "latin1" is really windows-1252 and would change 0x80–0x9F, hence by hand. */
function bytesToBinary(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return out;
}

function binaryToBytes(bin) {
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}

function base64OfBytes(bytes) {
  return btoa(bytesToBinary(bytes));
}

/** Raw header bytes → text: UTF-8 when it is valid UTF-8, else windows-1252. */
function headerText(bin) {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7f]/.test(bin)) return bin;
  const bytes = binaryToBytes(bin);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return decodeBytes(bytes, "windows-1252");
  }
}

/* ---- dates and addresses ---- */

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function address(name, email) {
  const n = String(name || "").trim();
  const e = String(email || "").trim();
  if (!e || n.toLowerCase() === e.toLowerCase()) return n || e;
  return n ? `${n} <${e}>` : e;
}

/* ---- .msg ---- */

/* Exchange stores an internal X.500 path ("/O=…/CN=…") where an address
 * should be. Only an SMTP-looking value is worth showing. */
function smtpOnly(value) {
  const s = String(value || "").trim();
  return s.includes("@") && !s.startsWith("/") ? s : "";
}

function msgDisplayName(att) {
  const raw = att.fileName || att.fileNameShort || att.name || "";
  const clean = String(raw).replace(/[\\/]/g, "_").trim();
  if (att.innerMsgContent) return /\.msg$/i.test(clean) ? clean : `${clean || "Attached email"}.msg`;
  return clean || `attachment${att.extension || ""}`;
}

/* The HTML body, in order of faithfulness: the HTML property as text, the
 * HTML property as bytes, then HTML encapsulated inside the compressed RTF
 * body (how most Outlook-saved mail stores it). null → use the plain body. */
function msgHtml(data) {
  if (typeof data.bodyHtml === "string" && data.bodyHtml.trim()) {
    return { html: data.bodyHtml, source: "html" };
  }
  if (data.html && data.html.length) {
    const html = decodeBytes(data.html, codepageLabel(data.internetCodepage || 65001));
    if (html.trim()) return { html, source: "html-bytes" };
  }
  if (data.compressedRtf && data.compressedRtf.length) {
    const html = rtfToHtml(data.compressedRtf);
    if (html) return { html, source: "rtf" };
  }
  return null;
}

/** Compressed RTF → the HTML encapsulated in it, or null (plain RTF, or
 *  anything the parser refuses). */
export function rtfToHtml(compressedRtf) {
  let rtf;
  try {
    rtf = decompressRTF(compressedRtf);
  } catch {
    return null;
  }
  try {
    const result = withBuffer(() =>
      deEncapsulateSync(globalThis.Buffer.from(rtf), {
        mode: "html",
        decode: (buf, enc) => decodeBytes(buf, codepageLabel(enc)),
        warn: () => {},
      }),
    );
    return result && result.mode === "html" && typeof result.text === "string" && result.text.trim()
      ? result.text
      : null;
  } catch {
    return null;
  }
}

/* rtf-stream-parser uses a global `Buffer` (Node's). A browser has none, so
 * lend it the `buffer` package's for the length of one synchronous call and
 * take it back — no lasting global that other libraries might sniff. */
function withBuffer(fn) {
  const g = globalThis;
  if (typeof g.Buffer === "function") return fn();
  g.Buffer = BufferPolyfill;
  try {
    return fn();
  } finally {
    delete g.Buffer;
  }
}

/** A .msg file's bytes → the shared email shape. Throws on a file msgreader
 *  can't read. */
export function parseMsg(bytes) {
  const reader = new MsgReader(bytes);
  /* 8-bit text properties: Western Windows is the likeliest code page and gets
   * curly quotes right, where msgreader's default reads bytes as Latin-1. */
  reader.parserConfig = { ansiEncoding: "windows-1252" };
  const data = reader.getFileData();
  if (!data || data.error) throw new Error(data?.error || "This isn't an Outlook message file");

  const recipients = Array.isArray(data.recipients) ? data.recipients : [];
  const list = (type) =>
    recipients
      .filter((r) => (r.recipType || "to") === type)
      .map((r) => address(r.name, smtpOnly(r.smtpAddress) || smtpOnly(r.email)))
      .filter(Boolean)
      .join(", ");
  const headers = data.headers ? parseHeaderBlock(data.headers) : new Map();
  const date =
    parseDate(data.clientSubmitTime) ||
    parseDate(data.messageDeliveryTime) ||
    parseDate(headers.get("date")) ||
    parseDate(data.creationTime);

  const body = msgHtml(data);
  const attachments = (Array.isArray(data.attachments) ? data.attachments : []).map((att, i) => {
    const name = msgDisplayName(att);
    return {
      key: `a${i}`,
      name,
      size: att.innerMsgContent ? null : Number.isFinite(att.contentLength) ? att.contentLength : null,
      mime: String(att.attachMimeTag || nativeMime(name) || "application/octet-stream").toLowerCase(),
      cid: cleanCid(att.pidContentId),
      embedded: att.innerMsgContent === true,
      bytes: () => reader.getAttachment(att).content,
    };
  });

  return finish({
    subject: data.subject || data.normalizedSubject || "",
    from:
      address(
        data.senderName,
        smtpOnly(data.senderSmtpAddress) ||
          smtpOnly(data.sentRepresentingSmtpAddress) ||
          smtpOnly(data.senderEmail),
      ) || decodeWords(headers.get("from") || ""),
    to: list("to") || decodeWords(headers.get("to") || ""),
    cc: list("cc") || decodeWords(headers.get("cc") || ""),
    date,
    dateText: date ? "" : data.clientSubmitTime || "",
    html: body ? body.html : null,
    text: body ? null : data.body || "",
    bodySource: body ? body.source : data.body ? "text" : "none",
    attachments,
  });
}

/* ---- .eml (RFC 822 / MIME) ---- */

/* Header block (binary string) → Map(lower-case name → first raw value). */
function parseHeaderBlock(block) {
  const out = new Map();
  for (const line of String(block).replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    if (!out.has(key)) out.set(key, line.slice(colon + 1).trim());
  }
  return out;
}

/* RFC 2047 encoded words ("=?utf-8?B?…?=") → text; whitespace between two
 * adjacent encoded words is dropped, as the RFC says. Takes TEXT: an .eml's
 * raw header bytes go through headerText first (parseEml's `header`); a .msg's
 * transport headers are already text. */
export function decodeWords(value) {
  return String(value || "")
    .replace(/(\?=)\s+(=\?)/g, "$1$2")
    .replace(/=\?([^?\s]+)\?([bBqQ])\?([^?]*)\?=/g, (whole, charset, enc, text) => {
      try {
        const bin =
          enc.toUpperCase() === "B"
            ? atob(text.replace(/[^A-Za-z0-9+/]/g, ""))
            : text.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
        return decodeBytes(binaryToBytes(bin), charset.replace(/\*.*$/, ""));
      } catch {
        return whole;
      }
    });
}

/* `type/sub; a=b; c="d"` → { value, params } with lower-case param names.
 * RFC 2231 `name*=utf-8''%E2%82%AC` is understood; continuations are not. */
function parseParams(header) {
  const parts = [];
  let cur = "";
  let quoted = false;
  for (const ch of String(header || "")) {
    if (ch === '"') quoted = !quoted;
    if (ch === ";" && !quoted) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  const params = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq <= 0) continue;
    let key = p.slice(0, eq).trim().toLowerCase();
    let val = p.slice(eq + 1).trim().replace(/^"(.*)"$/s, "$1");
    if (key.endsWith("*")) {
      key = key.slice(0, -1);
      const m = /^([^']*)'[^']*'(.*)$/.exec(val);
      if (m) {
        try {
          const bin = m[2].replace(/%([0-9A-Fa-f]{2})/g, (x, h) => String.fromCharCode(parseInt(h, 16)));
          val = decodeBytes(binaryToBytes(bin), m[1] || "utf-8");
        } catch {
          /* keep it encoded */
        }
      }
    } else val = decodeWords(headerText(val));
    if (!(key in params) || p.slice(0, eq).trim().endsWith("*")) params[key] = val;
  }
  return { value: parts[0].trim().toLowerCase(), params };
}

function splitHead(bin) {
  const m = /\r?\n\r?\n/.exec(bin);
  if (!m) return { head: bin, body: "" };
  return { head: bin.slice(0, m.index), body: bin.slice(m.index + m[0].length) };
}

function splitMultipart(body, boundary) {
  const s = `\n${body}`;
  const delim = `\n--${boundary}`;
  const parts = [];
  let at = s.indexOf(delim);
  while (at !== -1) {
    const after = at + delim.length;
    if (s.startsWith("--", after)) break; // the closing delimiter
    const eol = s.indexOf("\n", after);
    if (eol === -1) break;
    const next = s.indexOf(delim, eol);
    parts.push(s.slice(eol + 1, next === -1 ? s.length : next).replace(/\r$/, ""));
    at = next;
  }
  return parts;
}

/* Every leaf part, depth first: { headers, type, params, disposition, body }. */
function leaves(bin, out = [], depth = 0) {
  const { head, body } = splitHead(bin);
  const headers = parseHeaderBlock(head);
  const ct = parseParams(headers.get("content-type") || "text/plain");
  if (ct.value.startsWith("multipart/") && ct.params.boundary && depth < 20) {
    for (const part of splitMultipart(body, ct.params.boundary)) leaves(part, out, depth + 1);
    return out;
  }
  out.push({ headers, type: ct.value, params: ct.params, disposition: parseParams(headers.get("content-disposition") || ""), body });
  return out;
}

function transferDecode(part) {
  const cte = (part.headers.get("content-transfer-encoding") || "").trim().toLowerCase();
  if (cte === "base64") {
    try {
      return binaryToBytes(atob(part.body.replace(/[^A-Za-z0-9+/]/g, "")));
    } catch {
      return binaryToBytes(part.body);
    }
  }
  if (cte === "quoted-printable") {
    return binaryToBytes(
      part.body
        .replace(/=\r?\n/g, "")
        .replace(/=([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16))),
    );
  }
  return binaryToBytes(part.body);
}

/** An .eml file's bytes → the shared email shape. Deliberately small: the
 *  first text/html (else text/plain) part that isn't an attachment is the
 *  body; every other named or non-text part is an attachment. */
export function parseEml(bytes) {
  const bin = bytesToBinary(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const headers = parseHeaderBlock(splitHead(bin).head);
  if (!headers.size) throw new Error("This doesn't look like an email file");
  const header = (name) => decodeWords(headerText(headers.get(name) || ""));
  const parts = leaves(bin);

  const isAttachment = (p) =>
    p.disposition.value === "attachment" || Boolean(p.disposition.params.filename);
  const html = parts.find((p) => p.type === "text/html" && !isAttachment(p));
  const plain = parts.find((p) => p.type === "text/plain" && !isAttachment(p));
  const bodyPart = html || plain || null;
  const text = (p) => decodeBytes(transferDecode(p), p.params.charset || "utf-8");

  const attachments = [];
  parts.forEach((p, i) => {
    if (p === bodyPart) return;
    const named = p.disposition.params.filename || p.params.name;
    if (!named && !isAttachment(p) && p.type.startsWith("text/")) return; // an alternative body
    const name = String(named || `attachment-${attachments.length + 1}${p.type === "message/rfc822" ? ".eml" : ""}`).replace(/[\\/]/g, "_");
    let decoded = null;
    const getBytes = () => {
      if (!decoded) decoded = transferDecode(p);
      return decoded;
    };
    attachments.push({
      key: `p${i}`,
      name,
      size: null,
      mime: p.type || nativeMime(name) || "application/octet-stream",
      cid: cleanCid(p.headers.get("content-id")),
      embedded: false,
      bytes: getBytes,
    });
  });

  const date = parseDate(headers.get("date"));
  return finish({
    subject: header("subject"),
    from: header("from"),
    to: header("to"),
    cc: header("cc"),
    date,
    dateText: date ? "" : header("date"),
    html: html ? text(html) : null,
    text: html ? null : plain ? text(plain) : "",
    bodySource: html ? "html" : plain ? "text" : "none",
    attachments,
  });
}

/* ---- inline images ---- */

function cleanCid(value) {
  return String(value || "")
    .trim()
    .replace(/^<|>$/g, "")
    .toLowerCase();
}

function isInlineImageType(mime, name) {
  const type = /^image\//.test(mime) ? mime : nativeMime(name);
  return /^image\/(png|jpe?g|gif|webp|bmp|avif)$/.test(type) ? type.replace("image/jpg", "image/jpeg") : "";
}

/* Swap `cid:` references for data: URLs from the matching attachments (the
 * iframe's CSP allows data: images and nothing remote). An attachment used
 * this way is an inline picture, so it leaves the attachment list. */
function finish(mail) {
  if (!mail.html || !mail.attachments.length) return mail;
  const byCid = new Map();
  for (const a of mail.attachments) if (a.cid && !byCid.has(a.cid)) byCid.set(a.cid, a);
  if (!byCid.size) return mail;
  const used = new Set();
  const html = mail.html.replace(/cid:([^"'\s)>]+)/gi, (whole, id) => {
    let key = id;
    try {
      key = decodeURIComponent(id);
    } catch {
      /* use it as written */
    }
    const att = byCid.get(cleanCid(key));
    const type = att && isInlineImageType(att.mime, att.name);
    if (!type) return whole;
    try {
      const bytes = att.bytes();
      if (!bytes || bytes.length > MAX_INLINE_IMAGE_BYTES) return whole;
      used.add(att);
      return `data:${type};base64,${base64OfBytes(bytes)}`;
    } catch {
      return whole;
    }
  });
  return { ...mail, html, attachments: mail.attachments.filter((a) => !used.has(a)) };
}

/* ---- the iframe document ---- */

/* default-src 'none' blocks every remote image, font, stylesheet and tracking
 * pixel; the sandbox="" on the iframe already stops scripts, forms and popups.
 * no-referrer: a link someone clicks inside the frame doesn't say where from. */
const FRAME_HEAD =
  '<meta charset="utf-8">' +
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:">` +
  '<meta name="referrer" content="no-referrer">' +
  "<style>html{background:#fff;color:#1f2328}body{margin:12px;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style>";

/** Untrusted email HTML → a srcDoc string. The CSP goes FIRST, before any of
 *  the email's own markup can be parsed. */
export function emailDocument(html) {
  return `<!doctype html>${FRAME_HEAD}${String(html || "")}`;
}

/** "report.PDF" → true when the viewer can open it in a new tab. */
export function canOpenAttachment(name) {
  const ext = extOf(name);
  return ext === "pdf" || /^image\//.test(nativeMime(name));
}
