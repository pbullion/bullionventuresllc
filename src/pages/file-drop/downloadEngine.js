/* File Drop — the download engine: S3 → a folder on Patrick's Mac, through the
 * File System Access API (`showDirectoryPicker`, Chrome/Edge only).
 *
 *   - Writes into a `file-drop` subfolder of the folder he picks (or straight
 *     into it when the picked folder is itself called `file-drop`), so picking
 *     ~/Downloads can't mix these files in with his own.
 *   - Recreates subfolders with getDirectoryHandle(name, { create: true }).
 *   - A file that already exists at the same size is SKIPPED, so running it
 *     again after an interruption resumes instead of starting over.
 *   - A file that already exists at a DIFFERENT size is never overwritten —
 *     it's listed as a conflict. (An empty file is the exception: that's what
 *     getFileHandle({create:true}) leaves behind when a download dies before
 *     its first byte, and there's nothing in it to lose.)
 *   - URLs are presigned in batches of ≤500 as the queue drains.
 *   - fetch(url) → response.body.pipeTo(fileHandle.createWritable()). The
 *     writable writes to a swap file and only replaces the real one on close,
 *     so a download that dies halfway never leaves a same-size impostor.
 *   - 3 at a time; each file retries with backoff (re-signing on 403) and a
 *     file that still fails is listed with its error while the rest carry on.
 *   - A download that receives nothing for `stallMs` is aborted and retried —
 *     fetch has no read timeout, and a hung body would hold a worker forever.
 *
 * Problems that doom EVERY file stop the run with one message instead of
 * failing thousands of rows: the code refused (401/403), the disk full, the
 * folder gone or no longer writable. Backend trouble while signing (429,
 * 5xx, network) waits and retries on a timer without using up any file's
 * retries — Patrick can Stop at any point.
 *
 * Plain JS with an injectable api/fetch — no browser globals at import. */

import { backoffMs, createSpeedMeter } from "./helpers.js";

export const DOWNLOAD_CONCURRENCY = 3;
export const SIGN_BATCH = 500;
export const SUBFOLDER = "file-drop";
const URL_FRESH_MS = 45 * 60 * 1000;
const FAILED_LIST_CAP = 200;
const ACTIVE_LIST_CAP = 6;

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

function statusError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/* Errors after which no other file can succeed either. */
const RUN_FATAL = {
  QuotaExceededError:
    "The disk is full. Free up space, then run it again into the same folder — finished files are skipped.",
  NotAllowedError:
    "Chrome no longer has permission to write to that folder. Run it again and allow access — finished files are skipped.",
  SecurityError:
    "Chrome won't let this page write to that folder. Pick a different folder and run it again.",
};
const runFatal = (err) =>
  err && Object.prototype.hasOwnProperty.call(RUN_FATAL, err.name) ? RUN_FATAL[err.name] : null;
const FOLDER_GONE =
  "The folder you picked is gone (deleted, renamed, or its drive was ejected). Run it again and pick a folder — finished files are skipped.";

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
    stallMs = 2 * 60 * 1000,
    signRetries = 2,
    waitBaseMs = 30000,
    waitCapMs = 5 * 60 * 1000,
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
      stallMs,
      signRetries,
      waitBaseMs,
      waitCapMs,
    });
    this.listeners = new Set();
    this.meter = createSpeedMeter(10000);
    this.emitTimer = null;
    this.controller = new AbortController();
    this.status = "idle"; // idle | running | done | cancelled
    this.items = [];
    this.failed = [];
    this.conflicts = [];
    this.running = new Set();
    this.totalFiles = 0;
    this.doneFiles = 0;
    this.skippedFiles = 0;
    this.bytesTotal = 0;
    this.bytesDone = 0;
    this.transferred = 0;
    this.fatal = null;
    this.waiting = null;
    this.outages = 0;
    this.savedInto = null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  cancel() {
    if (this.status !== "running") return;
    this.status = "cancelled";
    this.waiting = null;
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
      conflictCount: this.conflicts.length,
      conflicts: this.conflicts.slice(0, FAILED_LIST_CAP),
      bytesTotal: this.bytesTotal,
      bytesDone,
      bytesPerSec: rate,
      etaSec: rate > 0 ? Math.max(0, this.bytesTotal - bytesDone) / rate : null,
      active,
      fatal: this.fatal,
      waiting: this.waiting ? { ...this.waiting } : null,
      savedInto: this.savedInto,
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

  /** Stop the whole run with one message. */
  _fatal(message) {
    if (this.status !== "running") return;
    this.fatal = message;
    this.waiting = null;
    this.status = "cancelled";
    this.controller.abort();
    this._emit(true);
  }

  /** sleep(), but over as soon as the run is stopped. */
  _nap(ms) {
    const signal = this.controller.signal;
    if (signal.aborted) return Promise.resolve();
    return new Promise((resolve) => {
      const onAbort = () => resolve();
      signal.addEventListener("abort", onAbort, { once: true });
      Promise.resolve(this.sleep(ms)).then(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      });
    });
  }

  /** root: a FileSystemDirectoryHandle. files: [{ path, size }] (manifest rows).
   *  Resolves with the final snapshot. */
  async run(root, files, { subfolder = SUBFOLDER } = {}) {
    if (this.status === "running") throw new Error("Already running");
    this.status = "running";
    this.items = files.map((f) => ({ path: f.path, size: f.size || 0, url: null, signedAt: 0 }));
    this.queueHead = 0;
    this.totalFiles = this.items.length;
    this.bytesTotal = this.items.reduce((s, f) => s + f.size, 0);
    this.signing = null;
    this.meter.reset();
    this.meter.add(this.now(), 0);

    let base = root;
    if (subfolder && root.name !== subfolder) {
      try {
        base = await root.getDirectoryHandle(subfolder, { create: true });
      } catch (err) {
        this._fatal(runFatal(err) || `Couldn't create a “${subfolder}” folder there: ${err.message || err}`);
        return this.getSnapshot();
      }
      this.savedInto = `${root.name}/${subfolder}`;
    } else {
      this.savedInto = root.name || null;
    }
    this.base = base;
    this.dirCache = new Map([["", Promise.resolve(base)]]);
    this._emit(true);

    const worker = async () => {
      while (this.status === "running" && this.queueHead < this.items.length) {
        const item = this.items[this.queueHead++];
        await this._one(item);
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

  /** Does the folder we're writing into still exist? */
  async _baseExists() {
    const h = this.base;
    if (!h || typeof h.keys !== "function") return true;
    try {
      for await (const k of h.keys()) {
        void k;
        break;
      }
      return true;
    } catch (e) {
      return !(e && e.name === "NotFoundError");
    }
  }

  /** presignGet that waits out backend trouble instead of failing files:
   *  401/403 → stop the run; other 4xx → the caller's error; 429 → wait at
   *  once; 5xx/network → a couple of quick retries, then wait (30s → 5 min),
   *  for as long as it takes or until Stop. */
  async _presign(paths) {
    for (let attempt = 0; ; attempt++) {
      if (this.status !== "running") throw statusError("Download stopped", 0);
      try {
        const res = await this.api.presignGet(paths);
        this.outages = 0;
        if (this.waiting) {
          this.waiting = null;
          this._emit(true);
        }
        return res;
      } catch (err) {
        if (this.status !== "running") throw err;
        if (err.status === 401 || err.status === 403) {
          this._fatal(
            err.status === 401
              ? "The download code was refused — reload the page and enter it again."
              : "That code can't download — reload the page and enter the download code.",
          );
          throw err;
        }
        const retryable = !err.status || err.status >= 500 || err.status === 429;
        if (!retryable) {
          err.permanent = true;
          throw err;
        }
        if (err.status !== 429 && attempt < this.signRetries) {
          await this._nap(backoffMs(attempt, { base: this.backoffBase, cap: this.backoffCap, random: this.random }));
          continue;
        }
        this.outages++;
        const delay = Math.min(this.waitCapMs, this.waitBaseMs * 2 ** (this.outages - 1));
        this.waiting = {
          message:
            err.status === 429
              ? "The server is refusing requests for a few minutes (too many wrong codes were tried). Waiting, then carrying on by itself."
              : "The server isn't answering right now. Waiting, then carrying on by itself.",
          detail: err.message || "",
          retryAt: this.now() + delay,
        };
        this._emit(true);
        await this._nap(delay);
      }
    }
  }

  async _url(item) {
    for (let guard = 0; guard < 5; guard++) {
      if (item.url && this.now() - item.signedAt < URL_FRESH_MS) return item.url;
      if (item.signError) throw Object.assign(new Error(item.signError), { permanent: true });
      if (this.status !== "running") throw statusError("Download stopped", 0);
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
        const res = await this._presign(batch.map((x) => x.path));
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
      } finally {
        if (this.signing === p) this.signing = null;
      }
    }
    if (!item.url) throw new Error("The server didn't return a download link");
    return item.url;
  }

  async _one(item) {
    const slash = item.path.lastIndexOf("/");
    const dirPath = slash === -1 ? "" : item.path.slice(0, slash);
    const name = slash === -1 ? item.path : item.path.slice(slash + 1);
    const run = { item, loaded: 0 };
    this.running.add(run);
    try {
      for (let attempt = 0; ; attempt++) {
        if (this.status !== "running") return;
        /* One controller per try, tied to the run's, so the stall watchdog can
         * abort this download without stopping the others. */
        const tryCtl = new AbortController();
        const onRunAbort = () => tryCtl.abort();
        this.controller.signal.addEventListener("abort", onRunAbort);
        let stalled = false;
        let timer = null;
        const arm = () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            stalled = true;
            tryCtl.abort();
          }, this.stallMs);
        };
        try {
          const dir = await this._dir(dirPath);

          // Already there? Same size → skip (this is what makes re-running resume).
          let existing = null;
          let existingIsFolder = false;
          try {
            existing = await dir.getFileHandle(name);
          } catch (e) {
            if (e && e.name === "TypeMismatchError") existingIsFolder = true;
            else if (!e || e.name !== "NotFoundError") throw e;
          }
          if (existingIsFolder) {
            this.conflicts.push({ path: item.path, size: item.size, error: "A folder with this name is already there — left it alone." });
            return;
          }
          if (existing) {
            const f = await existing.getFile();
            if (f.size === item.size) {
              this.skippedFiles++;
              this.doneFiles++;
              this.bytesDone += item.size;
              return;
            }
            if (f.size > 0) {
              /* A different file is already at this name — maybe his own. Never
               * overwrite it. */
              this.conflicts.push({
                path: item.path,
                size: item.size,
                error: `A different file (${f.size.toLocaleString()} bytes) is already there — left it alone.`,
              });
              return;
            }
          }

          const url = await this._url(item);
          arm();
          const res = await this.fetchImpl(url, { signal: tryCtl.signal });
          if (!res.ok) {
            if (res.status === 403) item.url = null; // expired → re-sign
            throw statusError(`Amazon S3 said HTTP ${res.status}`, res.status);
          }
          if (!res.body) throw new Error("The download had no body");
          arm();
          const fh = await dir.getFileHandle(name, { create: true });
          const writable = await fh.createWritable();
          let last = 0;
          const counter = new TransformStream({
            transform: (chunk, ctrl) => {
              const n = chunk.byteLength || 0;
              last += n;
              this.transferred += n;
              run.loaded = Math.min(last, item.size);
              arm();
              this._emit();
              ctrl.enqueue(chunk);
            },
          });
          await res.body.pipeThrough(counter).pipeTo(writable, { signal: tryCtl.signal });
          if (timer) clearTimeout(timer);
          const written = await fh.getFile();
          run.loaded = 0;
          if (written.size !== item.size) {
            throw new Error(`Wrote ${written.size} bytes but expected ${item.size}`);
          }
          this.doneFiles++;
          this.bytesDone += item.size;
          return;
        } catch (caught) {
          if (timer) clearTimeout(timer);
          run.loaded = 0;
          if (this.status !== "running") return;
          let err = caught || new Error("Download failed");
          if (stalled) {
            err = statusError(`No data arrived for ${Math.round(this.stallMs / 1000)}s — retrying`, 0);
          }
          if (runFatal(err)) {
            this._fatal(runFatal(err));
            return;
          }
          if (err.name === "NotFoundError") {
            if (!(await this._baseExists())) {
              this._fatal(FOLDER_GONE);
              return;
            }
            // A subfolder vanished mid-run: forget cached handles and recreate.
            this.dirCache = new Map([["", Promise.resolve(this.base)]]);
          }
          const nameRefused = err.name === "TypeError" && /name/i.test(err.message || "");
          const permanent =
            err.permanent ||
            err.status === 404 ||
            err.name === "NoModificationAllowedError" ||
            nameRefused;
          if (permanent || attempt >= this.maxRetries) {
            this.failed.push({
              path: item.path,
              size: item.size,
              error: nameRefused
                ? "Chrome won't save a file with this name (Windows shortcut names like .lnk and .url are refused). Get it with the aws s3 sync command below."
                : err.message || String(err),
            });
            return;
          }
          await this._nap(
            backoffMs(attempt, { base: this.backoffBase, cap: this.backoffCap, random: this.random }),
          );
        } finally {
          if (timer) clearTimeout(timer);
          this.controller.signal.removeEventListener("abort", onRunAbort);
        }
      }
    } finally {
      this.running.delete(run);
    }
  }
}
