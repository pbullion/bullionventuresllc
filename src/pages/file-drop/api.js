/* File Drop — the one API module both pages use.
 *
 * Everything here talks to the shared backend's /file-drop route, which only
 * SIGNS S3 URLs and makes small control-plane calls. File bytes never go
 * through Heroku: `putWithProgress` below sends them straight from the
 * browser to S3 on a presigned URL. Keep it that way — the shared dyno serves
 * ~36 projects and has a 30s router timeout.
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
 *  Non-2xx → Error(body.error || "HTTP n") with `.status`.
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
    throw httpError(msg, res.status);
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
    presignGet: (paths, expiresIn) =>
      call("/presign-get", "POST", expiresIn ? { paths, expiresIn } : { paths }),
    deleteMany: (paths) => call("/delete", "POST", { paths }),
    cleanup: (olderThanHours) =>
      call("/multipart/cleanup", "POST", olderThanHours ? { olderThanHours } : {}),
  };
  return api;
}

/** PUT a Blob straight to S3 with XMLHttpRequest (fetch has no upload
 *  progress). Resolves { status, etag }; rejects with Error `.status`
 *  (0 = network/CORS/aborted — `.aborted` is set when the signal fired).
 *
 *  `contentType` must be EXACTLY what the backend signed for a single PUT;
 *  pass nothing for multipart parts (their URLs don't sign it). */
export function putWithProgress(url, body, { contentType, onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const XHR = globalThis.XMLHttpRequest;
    if (!XHR) {
      reject(httpError("XMLHttpRequest is not available here", 0));
      return;
    }
    const xhr = new XHR();
    let settled = false;
    const done = (fn, v) => {
      if (settled) return;
      settled = true;
      if (signal) signal.removeEventListener("abort", onAbort);
      fn(v);
    };
    const onAbort = () => {
      try {
        xhr.abort();
      } catch {
        /* already finished */
      }
      const e = httpError("Upload stopped", 0);
      e.aborted = true;
      done(reject, e);
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
    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (ev) => onProgress(ev.loaded);
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        done(resolve, { status: xhr.status, etag: xhr.getResponseHeader("ETag") });
      } else {
        const code = /<Code>([^<]+)<\/Code>/.exec(xhr.responseText || "");
        done(
          reject,
          httpError(
            `Amazon S3 said HTTP ${xhr.status}${code ? ` (${code[1]})` : ""}`,
            xhr.status,
          ),
        );
      }
    };
    xhr.onerror = () =>
      done(reject, httpError("The upload connection to Amazon S3 failed", 0));
    xhr.ontimeout = () => done(reject, httpError("The upload to Amazon S3 timed out", 0));
    xhr.send(body);
  });
}
