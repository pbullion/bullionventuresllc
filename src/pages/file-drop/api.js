/* File Drop — the one API module every File Drop page uses.
 *
 * Everything here talks to the shared backend's /file-drop route, which only
 * SIGNS S3 URLs and makes small control-plane calls. File bytes never go
 * through Heroku: `putWithProgress` below sends them straight from the
 * browser to S3 on a presigned URL, and `fetchBytes` reads them straight back.
 * Keep it that way — the shared dyno serves ~36 projects and has a 30s router
 * timeout.
 *
 * The code travels ONLY in the `x-file-drop-code` header, never the query
 * string (Heroku's router logs full paths) and never the body.
 *
 * No browser globals are touched at import time, so the engines that import
 * this can be exercised under plain node with fakes. */

export const API_BASE = "https://sheline-art-website-api.herokuapp.com/file-drop";

export const TIMEOUT_MS = 30000;

/* sessionStorage keys. The code is kept for the tab only, never localStorage —
 * the upload page may run on a computer that isn't Patrick's. */
export const UPLOAD_CODE_KEY = "fileDrop.uploadCode";
export const ADMIN_CODE_KEY = "fileDrop.adminCode";

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** request(path, { method, body, code }) → parsed JSON.
 *  Non-2xx → Error(body.error || "HTTP n") with `.status`, plus `.code` when
 *  the body has one (409 `code: "exists"` — the upload code may not replace a
 *  file) and `.data` = the parsed body.
 *  Network failure / timeout → Error with `.status === 0`. */
export async function request(
  path,
  { method = "GET", body, code, timeoutMs = TIMEOUT_MS, fetchImpl } = {},
) {
  const doFetch = fetchImpl || globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    const headers = { "x-file-drop-code": code || "" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    res = await doFetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (e) {
    clearTimeout(timer);
    if (e && e.name === "AbortError") {
      throw httpError(`The server didn't answer in ${Math.round(timeoutMs / 1000)}s`, 0);
    }
    throw httpError("Couldn't reach the server — check the internet connection", 0);
  }
  let text;
  try {
    text = await res.text();
  } catch {
    text = "";
  } finally {
    clearTimeout(timer);
  }
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      (data && typeof data.error === "string" && data.error) ||
      (res.status === 503 ? "The server is unavailable right now" : `HTTP ${res.status}`);
    const err = httpError(msg, res.status);
    if (data && typeof data === "object") {
      err.data = data;
      if (typeof data.code === "string") err.code = data.code;
    }
    throw err;
  }
  if (data === null) throw httpError("The server sent something that wasn't JSON", res.status);
  return data;
}

/** The API surface both engines are written against. Fakes in a node
 *  harness implement the same method names. */
export function createApi(code, opts = {}) {
  const call = (path, method, body) => request(path, { method, body, code, ...opts });
  const api = {
    auth: () => call("/auth", "POST", {}),
    manifestPage: (cursor) =>
      call(`/manifest${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, "GET"),
    /* Loops every cursor. onPage(countSoFar) lets a page show progress. */
    async manifestAll(onPage) {
      const files = [];
      let cursor = null;
      for (let i = 0; i < 10000; i++) {
        const page = await api.manifestPage(cursor);
        for (const f of page.files || []) files.push(f);
        if (onPage) onPage(files.length);
        cursor = page.nextCursor || null;
        if (!cursor) break;
      }
      return files;
    },
    resolve: (paths) => call("/resolve", "POST", { paths }),
    presignPut: (files) => call("/presign-put", "POST", { files }),
    multipartCreate: (b) => call("/multipart/create", "POST", b),
    multipartSign: (b) => call("/multipart/sign", "POST", b),
    multipartParts: (b) => call("/multipart/parts", "POST", b),
    multipartComplete: (b) => call("/multipart/complete", "POST", b),
    multipartAbort: (b) => call("/multipart/abort", "POST", b),
    /* opts.disposition: "inline" asks for URLs a browser tab can show (the
     * backend only grants it to an allow-list of safe types — check each
     * row's `disposition`, it falls back to "attachment"); "attachment" or
     * nothing downloads. Without opts the body is exactly what it always was. */
    presignGet: (paths, expiresIn, opts) => {
      const body = expiresIn ? { paths, expiresIn } : { paths };
      if (opts && opts.disposition) body.disposition = opts.disposition;
      return call("/presign-get", "POST", body);
    },
    deleteMany: (paths) => call("/delete", "POST", { paths }),
    /* { dryRun: true } aborts nothing and returns `uploads: [{ path,
     * initiated }]` — what a real call would throw away. */
    cleanup: (olderThanHours, { dryRun = false } = {}) =>
      call("/multipart/cleanup", "POST", {
        ...(olderThanHours ? { olderThanHours } : {}),
        ...(dryRun ? { dryRun: true } : {}),
      }),
  };
  return api;
}

function abortError() {
  const err = httpError("Stopped", 0);
  err.name = "AbortError";
  err.aborted = true;
  return err;
}

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return new Uint8Array(value);
}

/** GET a presigned S3 URL into memory → ArrayBuffer (the viewer's previews).
 *  Reads `res.body` as a stream when there is one so `onProgress(loaded,
 *  total)` can report as bytes arrive; `total` is the Content-Length, 0 when
 *  there isn't one. A wrong Content-Length never truncates the result.
 *
 *  Non-2xx → Error with `.status` (and `.s3Code` when S3's XML says why — an
 *  expired link is 403 AccessDenied). Network failure → `.status === 0`. The
 *  signal firing → `.status === 0`, `.aborted`, name "AbortError".
 *
 *  Deliberately NO timeout: a big file can take minutes on a phone, so the
 *  caller's signal is the only way to stop one. */
export async function fetchBytes(url, { signal, onProgress, fetchImpl } = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  if (signal && signal.aborted) throw abortError();
  let res;
  try {
    res = await doFetch(url, { signal });
  } catch (e) {
    if ((signal && signal.aborted) || (e && e.name === "AbortError")) throw abortError();
    throw httpError("Couldn't download the file — check the internet connection", 0);
  }
  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {
      /* the status alone will do */
    }
    const code = /<Code>([^<]+)<\/Code>/.exec(text || "");
    const err = httpError(
      `Amazon S3 said HTTP ${res.status}${code ? ` (${code[1]})` : ""}`,
      res.status,
    );
    if (code) err.s3Code = code[1];
    throw err;
  }

  const header =
    res.headers && typeof res.headers.get === "function" ? res.headers.get("content-length") : null;
  const len = Number(header);
  const total = header !== null && Number.isFinite(len) && len > 0 ? len : 0;
  const report = (loaded) => {
    if (onProgress) onProgress(loaded, total);
  };

  const reader = res.body && typeof res.body.getReader === "function" ? res.body.getReader() : null;
  if (!reader) {
    let buf;
    try {
      buf = await res.arrayBuffer();
    } catch {
      if (signal && signal.aborted) throw abortError();
      throw httpError("The download from Amazon S3 was cut off", 0);
    }
    report(buf.byteLength);
    return buf;
  }

  /* Cancelling ends a pending read() even when the stream doesn't know about
   * the signal; the aborted check after each read turns that into an error
   * instead of a short "success". */
  const onAbort = () => {
    reader.cancel().catch(() => {});
  };
  /* With a Content-Length, write into one buffer of that size rather than
   * holding every chunk AND a joined copy — half the peak memory on a big
   * file. If more arrives than promised, fall back to collecting chunks. */
  let buf;
  let chunks;
  let loaded = 0;
  if (signal) signal.addEventListener("abort", onAbort);
  try {
    if (signal && signal.aborted) {
      onAbort();
      throw abortError();
    }
    /* Reported BEFORE the buffer is reserved: a caller that caps the size
     * (the viewer refuses to hold more than 200 MB) aborts inside this call,
     * and `new Uint8Array(2e9)` would have thrown RangeError first. */
    report(0);
    if (signal && signal.aborted) throw abortError();
    buf = total ? new Uint8Array(total) : null;
    chunks = buf ? null : [];
    for (;;) {
      let step;
      try {
        step = await reader.read();
      } catch {
        if (signal && signal.aborted) throw abortError();
        throw httpError("The download from Amazon S3 was cut off", 0);
      }
      if (signal && signal.aborted) throw abortError();
      if (step.done) break;
      if (!step.value || !step.value.byteLength) continue;
      const bytes = asBytes(step.value);
      if (buf && loaded + bytes.byteLength > buf.byteLength) {
        chunks = [buf.subarray(0, loaded)];
        buf = null;
      }
      if (buf) buf.set(bytes, loaded);
      else chunks.push(bytes);
      loaded += bytes.byteLength;
      report(loaded);
    }
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
  }

  if (buf) return loaded === buf.byteLength ? buf.buffer : buf.slice(0, loaded).buffer;
  const out = new Uint8Array(loaded);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out.buffer;
}

/* A PUT that stops moving is abandoned and retried. XHR has no idle timeout of
 * its own (xhr.timeout caps the WHOLE request, which a slow 64 MiB PUT can
 * legitimately exceed), and a TLS-inspecting proxy or a half-open connection
 * after sleep/VPN can leave a request pending forever — holding a slot. */
export const PUT_STALL_MS = 2 * 60 * 1000; // no upload progress for this long
export const PUT_RESPONSE_STALL_MS = 5 * 60 * 1000; // body sent, no answer

/** PUT a Blob straight to S3 with XMLHttpRequest (fetch has no upload
 *  progress). Resolves { status, etag }; rejects with Error `.status`
 *  (0 = network/CORS/aborted/stalled — `.aborted` is set when the signal
 *  fired, `.stalled` when the watchdog gave up; `.s3Code` carries S3's XML
 *  <Code> when there was one).
 *
 *  `contentType` must be EXACTLY what the backend returned for a single PUT;
 *  pass nothing for multipart parts.
 *  `ifNoneMatch`: pass the presign item's `ifNoneMatch` ("*") whenever it has
 *  one. It is SIGNED into the URL — leave it off and S3 refuses the signature;
 *  send it and S3 answers 412 when a file is already at that key. */
export function putWithProgress(
  url,
  body,
  {
    contentType,
    ifNoneMatch,
    onProgress,
    signal,
    stallMs = PUT_STALL_MS,
    responseStallMs = PUT_RESPONSE_STALL_MS,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const XHR = globalThis.XMLHttpRequest;
    if (!XHR) {
      reject(httpError("XMLHttpRequest is not available here", 0));
      return;
    }
    const xhr = new XHR();
    let settled = false;
    let timer = null;
    const done = (fn, v) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
      fn(v);
    };
    /* Settle FIRST, then abort: xhr.abort() fires onabort synchronously, and
     * that handler must find the promise already settled with the right flag. */
    const kill = () => {
      try {
        xhr.abort();
      } catch {
        /* already finished */
      }
    };
    const onAbort = () => {
      const e = httpError("Upload stopped", 0);
      e.aborted = true;
      done(reject, e);
      kill();
    };
    const onStall = (bodySent) => {
      const e = httpError(
        bodySent
          ? "Amazon S3 didn't answer after the upload was sent"
          : "The upload to Amazon S3 stopped moving",
        0,
      );
      e.stalled = true;
      done(reject, e);
      kill();
    };
    /* (Re)arm on every sign of life. Once the body is fully sent the only
     * thing left is S3's answer, which gets the longer allowance. */
    const arm = (bodySent) => {
      if (settled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onStall(bodySent), bodySent ? responseStallMs : stallMs);
    };
    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort);
    }
    xhr.open("PUT", url, true);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    if (ifNoneMatch) xhr.setRequestHeader("If-None-Match", ifNoneMatch);
    if (xhr.upload) {
      xhr.upload.onprogress = (ev) => {
        const sent = ev.lengthComputable && ev.total > 0 && ev.loaded >= ev.total;
        arm(sent);
        if (onProgress) onProgress(ev.loaded);
      };
      xhr.upload.onload = () => arm(true);
    }
    xhr.onreadystatechange = () => {
      if (xhr.readyState >= 2 && xhr.readyState < 4) arm(true);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        done(resolve, { status: xhr.status, etag: xhr.getResponseHeader("ETag") });
      } else {
        const code = /<Code>([^<]+)<\/Code>/.exec(xhr.responseText || "");
        const e = httpError(
          `Amazon S3 said HTTP ${xhr.status}${code ? ` (${code[1]})` : ""}`,
          xhr.status,
        );
        if (code) e.s3Code = code[1];
        done(reject, e);
      }
    };
    xhr.onerror = () =>
      done(reject, httpError("The upload connection to Amazon S3 failed", 0));
    // Aborted by the browser itself (navigation, network change), not by us.
    xhr.onabort = () => done(reject, httpError("The upload connection to Amazon S3 was cut off", 0));
    arm(false);
    xhr.send(body);
  });
}
