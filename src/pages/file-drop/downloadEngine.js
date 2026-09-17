/* File Drop — the download engine: S3 → a folder on Patrick's Mac, through the
 * File System Access API (`showDirectoryPicker`, Chrome/Edge only).
 *
 *   - Recreates subfolders with getDirectoryHandle(name, { create: true }).
 *   - A file that already exists at the same size is SKIPPED, so running it
 *     again after an interruption resumes instead of starting over.
 *   - URLs are presigned in batches of ≤500 as the queue drains.
 *   - fetch(url) → response.body.pipeTo(fileHandle.createWritable()). The
 *     writable writes to a swap file and only replaces the real one on close,
 *     so a download that dies halfway never leaves a same-size impostor.
 *   - 3 at a time; each file retries with backoff (re-signing on 403) and a
 *     file that still fails is listed with its error while the rest carry on.
 *
 * Plain JS with an injectable api/fetch — no browser globals at import. */

import { backoffMs, createSpeedMeter } from "./helpers.js";

export const DOWNLOAD_CONCURRENCY = 3;
export const SIGN_BATCH = 500;
const URL_FRESH_MS = 45 * 60 * 1000;
const FAILED_LIST_CAP = 200;
const ACTIVE_LIST_CAP = 6;

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

function statusError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

export class DownloadEngine {
  constructor({
    api,
    fetchImpl,
    now = () => Date.now(),
    sleep = realSleep,
    random = Math.random,
    concurrency = DOWNLOAD_CONCURRENCY,
    maxRetries = 5,
    throttleMs = 300,
    backoffBase = 1000,
    backoffCap = 30000,
  } = {}) {
    if (!api) throw new Error("DownloadEngine needs an api");
    Object.assign(this, {
      api,
      fetchImpl: fetchImpl || ((...a) => globalThis.fetch(...a)),
      now,
      sleep,
      random,
      concurrency,
      maxRetries,
      throttleMs,
      backoffBase,
      backoffCap,
    });
    this.listeners = new Set();
    this.meter = createSpeedMeter(10000);
    this.emitTimer = null;
    this.controller = new AbortController();
    this.status = "idle"; // idle | running | done | cancelled
    this.items = [];
    this.failed = [];
    this.running = new Set();
    this.totalFiles = 0;
    this.doneFiles = 0;
    this.skippedFiles = 0;
    this.bytesTotal = 0;
    this.bytesDone = 0;
    this.transferred = 0;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  cancel() {
    if (this.status !== "running") return;
    this.status = "cancelled";
    this.controller.abort();
    this._emit(true);
  }

  /** Detach listeners and abort (page unmount). */
  dispose() {
    this.controller.abort();
    if (this.status === "running") this.status = "cancelled";
    if (this.emitTimer) clearTimeout(this.emitTimer);
    this.emitTimer = null;
    this.listeners.clear();
  }

  getSnapshot() {
    this.meter.add(this.now(), this.transferred);
    let inflight = 0;
    const active = [];
    for (const r of this.running) {
      inflight += r.loaded;
      if (active.length < ACTIVE_LIST_CAP) {
        active.push({ path: r.item.path, size: r.item.size, loaded: r.loaded });
      }
    }
    const bytesDone = Math.min(this.bytesTotal, this.bytesDone + inflight);
    const rate = this.status === "running" ? this.meter.rate() : 0;
    return {
      status: this.status,
      totalFiles: this.totalFiles,
      doneFiles: this.doneFiles,
      skippedFiles: this.skippedFiles,
      failedCount: this.failed.length,
      failed: this.failed.slice(0, FAILED_LIST_CAP),
      bytesTotal: this.bytesTotal,
      bytesDone,
      bytesPerSec: rate,
      etaSec: rate > 0 ? Math.max(0, this.bytesTotal - bytesDone) / rate : null,
      active,
    };
  }

  _emit(immediate = false) {
    if (!this.listeners.size) return;
    const fire = () => {
      const snap = this.getSnapshot();
      for (const l of this.listeners) l(snap);
    };
    if (immediate) {
      if (this.emitTimer) clearTimeout(this.emitTimer);
      this.emitTimer = null;
      fire();
      return;
    }
    if (this.emitTimer) return;
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      fire();
    }, this.throttleMs);
  }

  /** root: a FileSystemDirectoryHandle. files: [{ path, size }] (manifest rows).
   *  Resolves with the final snapshot. */
  async run(root, files) {
    if (this.status === "running") throw new Error("Already running");
    this.status = "running";
    this.items = files.map((f) => ({ path: f.path, size: f.size || 0, url: null, signedAt: 0 }));
    this.queueHead = 0;
    this.totalFiles = this.items.length;
    this.bytesTotal = this.items.reduce((s, f) => s + f.size, 0);
    this.dirCache = new Map([["", Promise.resolve(root)]]);
    this.signing = null;
    this.meter.reset();
    this.meter.add(this.now(), 0);
    this._emit(true);

    const worker = async () => {
      while (this.status === "running" && this.queueHead < this.items.length) {
        const item = this.items[this.queueHead++];
        await this._one(root, item);
        this._emit();
      }
    };
    await Promise.all(Array.from({ length: this.concurrency }, worker));
    if (this.status === "running") this.status = "done";
    this._emit(true);
    return this.getSnapshot();
  }

  _dir(dirPath) {
    let p = this.dirCache.get(dirPath);
    if (p) return p;
    const i = dirPath.lastIndexOf("/");
    const parent = i === -1 ? "" : dirPath.slice(0, i);
    const name = i === -1 ? dirPath : dirPath.slice(i + 1);
    p = this._dir(parent).then((h) => h.getDirectoryHandle(name, { create: true }));
    /* Don't cache a failure — a transient error must not poison every file in
     * that folder for the rest of the run. */
    p.catch(() => {
      if (this.dirCache.get(dirPath) === p) this.dirCache.delete(dirPath);
    });
    this.dirCache.set(dirPath, p);
    return p;
  }

  async _url(item) {
    for (let guard = 0; guard < 5; guard++) {
      if (item.url && this.now() - item.signedAt < URL_FRESH_MS) return item.url;
      if (item.signError) throw Object.assign(new Error(item.signError), { permanent: true });
      if (this.signing) {
        await this.signing.catch(() => {});
        continue;
      }
      const batch = [item];
      const stale = (x) => !(x.url && this.now() - x.signedAt < URL_FRESH_MS);
      // Files other workers already picked up but haven't signed yet, then the queue.
      for (const r of this.running) {
        if (r.item !== item && stale(r.item) && !r.item.signError) batch.push(r.item);
      }
      for (let i = this.queueHead; i < this.items.length && batch.length < SIGN_BATCH; i++) {
        const x = this.items[i];
        if (x !== item && stale(x)) batch.push(x);
      }
      const p = (async () => {
        const res = await this.api.presignGet(batch.map((x) => x.path));
        const at = this.now();
        const byPath = new Map((res.files || []).map((r) => [r.path, r]));
        for (const x of batch) {
          const r = byPath.get(x.path);
          if (r && r.url) {
            x.url = r.url;
            x.signedAt = at;
          } else if (r && r.error) {
            x.signError = r.error;
          }
        }
      })();
      this.signing = p;
      try {
        await p;
      } catch (err) {
        if (err.status === 401 || err.status === 403) err.permanent = true;
        throw err;
      } finally {
        if (this.signing === p) this.signing = null;
      }
    }
    if (!item.url) throw new Error("The server didn't return a download link");
    return item.url;
  }

  async _one(root, item) {
    const slash = item.path.lastIndexOf("/");
    const dirPath = slash === -1 ? "" : item.path.slice(0, slash);
    const name = slash === -1 ? item.path : item.path.slice(slash + 1);
    const run = { item, loaded: 0 };
    this.running.add(run);
    try {
      for (let attempt = 0; ; attempt++) {
        if (this.status !== "running") return;
        try {
          const dir = await this._dir(dirPath);

          // Already there at the same size → skip (this is what makes re-running resume).
          let existing = null;
          try {
            existing = await dir.getFileHandle(name);
          } catch (e) {
            if (e && e.name !== "NotFoundError" && e.name !== "TypeMismatchError") throw e;
          }
          if (existing) {
            const f = await existing.getFile();
            if (f.size === item.size) {
              this.skippedFiles++;
              this.doneFiles++;
              this.bytesDone += item.size;
              return;
            }
          }

          const url = await this._url(item);
          const res = await this.fetchImpl(url, { signal: this.controller.signal });
          if (!res.ok) {
            if (res.status === 403) item.url = null; // expired → re-sign
            throw statusError(`Amazon S3 said HTTP ${res.status}`, res.status);
          }
          if (!res.body) throw new Error("The download had no body");
          const fh = await dir.getFileHandle(name, { create: true });
          const writable = await fh.createWritable();
          let last = 0;
          const counter = new TransformStream({
            transform: (chunk, ctrl) => {
              const n = chunk.byteLength || 0;
              last += n;
              this.transferred += n;
              run.loaded = Math.min(last, item.size);
              this._emit();
              ctrl.enqueue(chunk);
            },
          });
          await res.body.pipeThrough(counter).pipeTo(writable);
          const written = await fh.getFile();
          run.loaded = 0;
          if (written.size !== item.size) {
            throw new Error(`Wrote ${written.size} bytes but expected ${item.size}`);
          }
          this.doneFiles++;
          this.bytesDone += item.size;
          return;
        } catch (err) {
          run.loaded = 0;
          if (this.status !== "running") return;
          const permanent =
            err.permanent ||
            err.status === 404 ||
            err.name === "NotAllowedError" ||
            err.name === "SecurityError" ||
            /* Chrome refuses some names outright (e.g. trailing dot) — retrying won't help. */
            (err.name === "TypeError" && /name/i.test(err.message || ""));
          if (permanent || attempt >= this.maxRetries) {
            this.failed.push({ path: item.path, size: item.size, error: err.message || String(err) });
            return;
          }
          await this.sleep(
            backoffMs(attempt, { base: this.backoffBase, cap: this.backoffCap, random: this.random }),
          );
        }
      }
    } finally {
      this.running.delete(run);
    }
  }
}
