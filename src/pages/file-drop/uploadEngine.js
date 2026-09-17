/* File Drop — the upload engine. Plain JS, no React, so its logic runs under
 * node with a fake transport/api/storage.
 *
 * WHAT IT DOES
 *   - Files ≤ 64 MiB: one presigned PUT each. URLs are signed in batches of
 *     ≤100 AS THE QUEUE DRAINS (a URL lives 1h; 40k URLs up front would rot).
 *   - Files > 64 MiB: S3 multipart. { uploadId, partSize, … } is saved to
 *     storage (localStorage in the browser) under a path|size|lastModified
 *     fingerprint, so a closed tab or a reboot resumes: ListParts, skip parts
 *     that are already there at the right size, upload the rest, complete with
 *     every part sorted by number, forget the record.
 *   - ONE pool of 6 slots shared by small files and parts; ≤4 parts of any one
 *     file at a time. A slot is held for one PUT (plus the signing call it may
 *     need, and its retry backoff).
 *   - Every PUT retries up to 6 times, backoff 1s→30s with jitter. A 403 means
 *     the URL expired or was refused → re-sign before the next try. A file that
 *     runs out of retries goes to `failed` and the queue keeps going.
 *   - pause() stops NEW work; in-flight PUTs finish (or fail and requeue).
 *   - subscribe(listener) gets throttled snapshots (~300ms), never one per
 *     progress event — 40k files must not re-render React 40k×N times.
 */

import { putWithProgress } from "./api.js";
import {
  MiB,
  backoffMs,
  createSpeedMeter,
  fingerprint,
  humanError,
} from "./helpers.js";

export const MULTIPART_THRESHOLD = 64 * MiB;
export const MAX_SLOTS = 6;
export const PARTS_PER_FILE = 4;
export const MAX_RETRIES = 6;
export const PRESIGN_BATCH = 100;
export const PART_SIGN_BATCH = 20;
/* Presigned URLs live 3600s. Treat them as stale well before that, so a URL
 * isn't handed to a PUT that will then spend minutes sending a big part. */
const URL_FRESH_MS = 45 * 60 * 1000;
/* How many multipart files are "open" at once. Two × four parts already
 * exceeds the six slots; more would only spread progress thinner. */
const MAX_ACTIVE_LARGE = 2;
/* While small files are waiting, parts may take at most this many slots, so
 * one 20 GB .pst doesn't starve thousands of photos for hours. */
const PART_SLOTS_WHEN_SMALL_WAITING = 4;
const ACTIVE_LIST_CAP = 12;
const FAILED_LIST_CAP = 200;

function defaultStorage() {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      return {
        get: (k) => {
          try {
            return ls.getItem(k);
          } catch {
            return null;
          }
        },
        set: (k, v) => {
          try {
            ls.setItem(k, v);
          } catch {
            /* quota or blocked — resume just won't survive a reload */
          }
        },
        remove: (k) => {
          try {
            ls.removeItem(k);
          } catch {
            /* ignore */
          }
        },
      };
    }
  } catch {
    /* accessor threw */
  }
  const m = new Map();
  return {
    get: (k) => (m.has(k) ? m.get(k) : null),
    set: (k, v) => m.set(k, v),
    remove: (k) => m.delete(k),
  };
}

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Paused extends Error {}

export class UploadEngine {
  constructor({
    api,
    transport = putWithProgress,
    storage = defaultStorage(),
    now = () => Date.now(),
    sleep = realSleep,
    random = Math.random,
    maxSlots = MAX_SLOTS,
    partsPerFile = PARTS_PER_FILE,
    maxRetries = MAX_RETRIES,
    multipartThreshold = MULTIPART_THRESHOLD,
    throttleMs = 300,
    backoffBase = 1000,
    backoffCap = 30000,
  } = {}) {
    if (!api) throw new Error("UploadEngine needs an api");
    Object.assign(this, {
      api,
      transport,
      storage,
      now,
      sleep,
      random,
      maxSlots,
      partsPerFile,
      maxRetries,
      multipartThreshold,
      throttleMs,
      backoffBase,
      backoffCap,
    });
    this.listeners = new Set();
    this.controller = new AbortController();
    this.meter = createSpeedMeter(10000);
    this.emitTimer = null;
    this._reset();
  }

  _reset() {
    this.status = "idle"; // idle | running | paused | done | stopped
    this.small = []; // queue of small items
    this.smallHead = 0;
    this.smallRetry = []; // requeued after a pause, taken first
    this.large = []; // queue of large items not yet opened
    this.largeHead = 0;
    this.activeLarge = []; // opened multipart files
    this.running = new Set(); // items currently holding a slot
    this.slots = 0;
    this.partSlots = 0;
    this.controlOps = 0; // multipart create/parts/complete in flight
    this.presigning = null;
    this.failed = [];
    this.totalFiles = 0;
    this.doneFiles = 0;
    this.bytesTotal = 0;
    this.bytesConfirmed = 0; // finished files + finished parts
    this.transferred = 0; // monotonic, for speed only
    this.peakSlots = 0;
    this.fatal = null;
  }

  /* ---------- public API ---------- */

  /** items: [{ path, size, lastModified, file (Blob), contentType }] */
  setFiles(items) {
    this._reset();
    for (const raw of items) {
      const it = {
        path: raw.path,
        size: raw.size,
        lastModified: raw.lastModified ?? 0,
        file: raw.file,
        contentType: raw.contentType || "application/octet-stream",
        loaded: 0,
        attempts: 0,
        url: null,
        signedAt: 0,
      };
      this.totalFiles++;
      this.bytesTotal += it.size;
      if (it.size > this.multipartThreshold) this.large.push(it);
      else this.small.push(it);
    }
    this._emit(true);
  }

  start() {
    if (this.status === "stopped") return;
    this.status = "running";
    this.meter.reset();
    this.meter.add(this.now(), this.transferred);
    this._pump();
    this._checkDone();
    this._emit(true);
  }

  pause() {
    if (this.status !== "running") return;
    this.status = "paused";
    this._emit(true);
  }

  resume() {
    if (this.status !== "paused") return;
    this.status = "running";
    this.fatal = null;
    this._pump();
    this._checkDone();
    this._emit(true);
  }

  /** Put every failed file back in the queue with fresh retry budgets. */
  retryFailed() {
    if (!this.failed.length || this.status === "stopped") return;
    const again = this.failed;
    this.failed = [];
    for (const it of again) {
      it.attempts = 0;
      it.error = null;
      it.url = null;
      it.loaded = 0;
      if (it.size > this.multipartThreshold) {
        this.large.push(it);
      } else {
        this.smallRetry.push(it);
      }
    }
    this.status = "running";
    this._pump();
    this._emit(true);
  }

  /** Abort everything in flight and stop for good (page unmount). */
  stop() {
    this.status = "stopped";
    this.controller.abort();
    if (this.emitTimer) clearTimeout(this.emitTimer);
    this.emitTimer = null;
    this.listeners.clear();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    const now = this.now();
    this.meter.add(now, this.transferred);
    let inflight = 0;
    const active = [];
    for (const r of this.running) {
      inflight += r.loaded;
      if (active.length < ACTIVE_LIST_CAP) {
        active.push({
          path: r.item.path,
          size: r.item.size,
          loaded: r.loaded,
          label: r.label,
          sending: r.bytes,
        });
      }
    }
    const bytesDone = Math.min(this.bytesTotal, this.bytesConfirmed + inflight);
    const remaining = Math.max(0, this.bytesTotal - bytesDone);
    const bytesPerSec = this.status === "running" ? this.meter.rate() : 0;
    return {
      status: this.status,
      totalFiles: this.totalFiles,
      doneFiles: this.doneFiles,
      failedCount: this.failed.length,
      failed: this.failed.slice(0, FAILED_LIST_CAP).map((f) => ({
        path: f.path,
        size: f.size,
        error: f.error,
      })),
      bytesTotal: this.bytesTotal,
      bytesDone,
      bytesPerSec,
      etaSec: bytesPerSec > 0 ? remaining / bytesPerSec : null,
      activeCount: this.running.size,
      active,
      peakSlots: this.peakSlots,
      fatal: this.fatal,
    };
  }

  /* ---------- scheduling ---------- */

  _emit(immediate = false) {
    if (!this.listeners.size) return;
    if (immediate) {
      if (this.emitTimer) {
        clearTimeout(this.emitTimer);
        this.emitTimer = null;
      }
      const snap = this.getSnapshot();
      for (const l of this.listeners) l(snap);
      return;
    }
    if (this.emitTimer) return;
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      if (this.status === "stopped") return;
      const snap = this.getSnapshot();
      for (const l of this.listeners) l(snap);
    }, this.throttleMs);
  }

  _smallWaiting() {
    return this.smallRetry.length > 0 || this.smallHead < this.small.length;
  }

  _takeSmall() {
    if (this.smallRetry.length) return this.smallRetry.shift();
    if (this.smallHead < this.small.length) {
      const it = this.small[this.smallHead];
      this.small[this.smallHead] = undefined; // let the GC have it
      this.smallHead++;
      return it;
    }
    return null;
  }

  _pump() {
    if (this.status !== "running") return;
    // Open multipart files (no slot — control calls only).
    while (this.activeLarge.length < MAX_ACTIVE_LARGE && this.largeHead < this.large.length) {
      const it = this.large[this.largeHead];
      this.large[this.largeHead] = undefined;
      this.largeHead++;
      this._openLarge(it);
    }
    for (const lf of [...this.activeLarge]) this._maybeComplete(lf);
    while (this.slots < this.maxSlots && this.status === "running") {
      const partCap = this._smallWaiting() ? PART_SLOTS_WHEN_SMALL_WAITING : this.maxSlots;
      let started = false;
      if (this.partSlots < partCap) {
        for (const lf of this.activeLarge) {
          if (lf.ready && lf.inflight < this.partsPerFile && lf.pending.length) {
            const n = lf.pending.shift();
            this._runPart(lf, n);
            started = true;
            break;
          }
        }
      }
      if (started) continue;
      const it = this._takeSmall();
      if (it) {
        this._runSmall(it);
        continue;
      }
      break;
    }
  }

  _acquire() {
    this.slots++;
    if (this.slots > this.peakSlots) this.peakSlots = this.slots;
  }

  _release() {
    this.slots--;
  }

  _checkDone() {
    if (this.status !== "running") return;
    if (
      this.slots === 0 &&
      this.controlOps === 0 &&
      !this._smallWaiting() &&
      this.largeHead >= this.large.length &&
      this.activeLarge.length === 0
    ) {
      this.status = "done";
      this._emit(true);
    }
  }

  _after() {
    if (this.status === "stopped") return;
    this._pump();
    this._checkDone();
    this._emit();
  }

  _backoff(attempt) {
    return backoffMs(attempt, {
      base: this.backoffBase,
      cap: this.backoffCap,
      random: this.random,
    });
  }

  /* The BACKEND refused the code (401/403 on a signing call). Every other file
   * would hit the same wall — and each attempt counts against the brute-force
   * limiter — so stop the whole queue and say why, instead of failing 40k
   * files one by one. */
  _fatal(err) {
    if (this.status === "stopped") return;
    this.fatal =
      err.status === 401
        ? "The code was refused — reload the page and enter it again."
        : humanError(err);
    if (this.status === "running") this.status = "paused";
    this._emit(true);
  }

  _isAuthError(err) {
    return err && (err.status === 401 || err.status === 403);
  }

  _fail(item, err) {
    item.error = humanError(err);
    item.loaded = 0;
    this.failed.push(item);
  }

  /* ---------- small files ---------- */

  async _ensureSmallUrl(item) {
    for (let guard = 0; guard < 5; guard++) {
      if (item.url && this.now() - item.signedAt < URL_FRESH_MS) return;
      if (this.status !== "running") throw new Paused();
      if (item.signError) throw Object.assign(new Error(item.signError), { permanent: true });
      if (this.presigning) {
        await this.presigning.catch(() => {});
        continue;
      }
      // Sign this item plus the next ones waiting, up to PRESIGN_BATCH.
      const batch = [item];
      const fresh = (x) => x.url && this.now() - x.signedAt < URL_FRESH_MS;
      // Files other slots already took but haven't signed yet, then the queue.
      for (const r of this.running) {
        const x = r.item;
        if (!r.label && x !== item && !fresh(x) && !x.signError && batch.length < PRESIGN_BATCH) batch.push(x);
      }
      for (const x of this.smallRetry) {
        if (batch.length >= PRESIGN_BATCH) break;
        if (x !== item && !fresh(x)) batch.push(x);
      }
      for (let i = this.smallHead; i < this.small.length && batch.length < PRESIGN_BATCH; i++) {
        const x = this.small[i];
        if (x && x !== item && !fresh(x)) batch.push(x);
      }
      const p = (async () => {
        const res = await this.api.presignPut(
          batch.map((x) => ({ path: x.path, size: x.size, contentType: x.contentType })),
        );
        const byPath = new Map();
        for (const r of res.files || []) byPath.set(r.path, r);
        const at = this.now();
        for (const x of batch) {
          const r = byPath.get(x.path);
          if (!r) continue;
          if (r.url) {
            x.url = r.url;
            x.signedAt = at;
            if (r.contentType) x.contentType = r.contentType;
          } else if (r.error) {
            x.signError = r.error;
          }
        }
      })();
      this.presigning = p;
      try {
        await p;
      } catch (err) {
        if (this._isAuthError(err)) {
          this._fatal(err);
          throw new Paused();
        }
        if (err.status === 400 || err.status === 413) err.permanent = true;
        throw err;
      } finally {
        if (this.presigning === p) this.presigning = null;
      }
      if (!item.url && !item.signError) {
        throw new Error("The server didn't return an upload link for this file");
      }
    }
    if (!item.url) throw new Error("Couldn't get an upload link");
  }

  async _runSmall(item) {
    this._acquire();
    const run = { item, loaded: 0, label: null, bytes: item.size };
    this.running.add(run);
    try {
      for (;;) {
        if (this.status === "stopped") return;
        if (this.status !== "running") throw new Paused();
        try {
          await this._ensureSmallUrl(item);
          if (this.status !== "running") throw new Paused();
          let last = 0;
          await this.transport(item.url, item.file, {
            contentType: item.contentType,
            signal: this.controller.signal,
            onProgress: (loaded) => {
              const d = loaded - last;
              if (d > 0) {
                this.transferred += d;
                last = loaded;
              }
              run.loaded = Math.min(loaded, item.size);
              this._emit();
            },
          });
          if (last < item.size) this.transferred += item.size - last;
          run.loaded = 0;
          this.bytesConfirmed += item.size;
          this.doneFiles++;
          item.file = null; // done — drop the Blob reference
          return;
        } catch (err) {
          run.loaded = 0;
          if (err instanceof Paused) throw err;
          if (this.status === "stopped" || err.aborted) return;
          if (err.permanent || err.name === "NotReadableError" || err.name === "NotFoundError") {
            this._fail(item, err);
            return;
          }
          if (err.status === 403) item.url = null; // S3 refused the URL (expired?) → re-sign
          item.attempts++;
          if (item.attempts > this.maxRetries) {
            this._fail(item, err);
            return;
          }
          await this.sleep(this._backoff(item.attempts - 1));
        }
      }
    } catch (err) {
      if (err instanceof Paused) this.smallRetry.unshift(item);
    } finally {
      this.running.delete(run);
      this._release();
      this._after();
    }
  }

  /* ---------- multipart ---------- */

  _expectedPartSize(lf, n) {
    return n < lf.partCount ? lf.partSize : lf.item.size - lf.partSize * (lf.partCount - 1);
  }

  async _control(fn, item) {
    // A backend call with its own retry budget (network / 5xx / 429 only).
    for (let attempt = 0; ; attempt++) {
      if (this.fatal) throw new Paused();
      try {
        return await fn();
      } catch (err) {
        if (this._isAuthError(err)) {
          this._fatal(err);
          throw new Paused();
        }
        const retryable = !err.status || err.status >= 500 || err.status === 429;
        if (!retryable || attempt >= this.maxRetries || this.status === "stopped") throw err;
        await this.sleep(this._backoff(attempt));
        if (item && this.status === "stopped") throw err;
      }
    }
  }

  async _openLarge(item) {
    const lf = {
      item,
      ready: false,
      pending: [],
      inflight: 0,
      etags: new Map(),
      urls: new Map(),
      signing: null,
      failed: false,
      restarted: false,
    };
    this.activeLarge.push(lf);
    this.controlOps++;
    try {
      await this._prepareLarge(lf);
      lf.ready = true; // _after → _pump starts its parts, or completes it if none are left
    } catch (err) {
      if (err instanceof Paused) {
        this._dropLarge(lf);
        if (lf.partSize) this.bytesConfirmed -= this._confirmedFor(lf);
        lf.failed = true; // retire this handle; the item reopens on resume
        this.large.push(item);
      } else if (this.status !== "stopped") {
        this._closeLarge(lf, err);
      }
    } finally {
      this.controlOps--;
      this._after();
    }
  }

  async _prepareLarge(lf) {
    const { item } = lf;
    const key = fingerprint(item.path, item.size, item.lastModified);
    lf.key = key;
    let saved = null;
    try {
      saved = JSON.parse(this.storage.get(key) || "null");
    } catch {
      saved = null;
    }
    let existing = [];
    if (saved && saved.uploadId && saved.partSize > 0) {
      try {
        const res = await this._control(
          () => this.api.multipartParts({ path: item.path, uploadId: saved.uploadId }),
          item,
        );
        existing = res.parts || [];
      } catch (err) {
        if (err.status === 404) {
          this.storage.remove(key);
          saved = null;
        } else {
          throw err;
        }
      }
    } else {
      saved = null;
    }
    if (!saved) {
      const res = await this._control(
        () =>
          this.api.multipartCreate({
            path: item.path,
            size: item.size,
            contentType: item.contentType,
          }),
        item,
      );
      saved = {
        uploadId: res.uploadId,
        partSize: res.partSize,
        partCount: res.partCount,
        path: item.path,
        size: item.size,
        lastModified: item.lastModified,
      };
      this.storage.set(key, JSON.stringify(saved));
      existing = [];
    }
    lf.uploadId = saved.uploadId;
    lf.partSize = saved.partSize;
    lf.partCount = Math.max(1, Math.ceil(item.size / saved.partSize));
    const have = new Map();
    for (const p of existing) have.set(p.partNumber, p);
    for (let n = 1; n <= lf.partCount; n++) {
      const p = have.get(n);
      if (p && p.etag && p.size === this._expectedPartSize(lf, n)) {
        lf.etags.set(n, p.etag);
        this.bytesConfirmed += p.size;
      } else {
        lf.pending.push(n);
      }
    }
  }

  async _partUrl(lf, n) {
    for (let guard = 0; guard < 5; guard++) {
      const u = lf.urls.get(n);
      if (u && this.now() - u.at < URL_FRESH_MS) return u.url;
      if (this.status !== "running") throw new Paused();
      if (lf.signing) {
        await lf.signing.catch(() => {});
        continue;
      }
      const nums = [n];
      for (const m of lf.pending) {
        if (nums.length >= PART_SIGN_BATCH) break;
        const um = lf.urls.get(m);
        if (m !== n && !(um && this.now() - um.at < URL_FRESH_MS)) nums.push(m);
      }
      const p = (async () => {
        const res = await this._control(
          () =>
            this.api.multipartSign({
              path: lf.item.path,
              uploadId: lf.uploadId,
              partNumbers: nums,
            }),
          lf.item,
        );
        const at = this.now();
        for (const [k, url] of Object.entries(res.urls || {})) {
          lf.urls.set(Number(k), { url, at });
        }
      })();
      lf.signing = p;
      try {
        await p;
      } finally {
        if (lf.signing === p) lf.signing = null;
      }
    }
    const u = lf.urls.get(n);
    if (!u) throw new Error(`No upload link for part ${n}`);
    return u.url;
  }

  async _runPart(lf, n) {
    this._acquire();
    this.partSlots++;
    lf.inflight++;
    const { item } = lf;
    const size = this._expectedPartSize(lf, n);
    const run = { item, loaded: 0, label: `part ${n} of ${lf.partCount}`, bytes: size };
    this.running.add(run);
    let attempts = 0;
    try {
      for (;;) {
        if (this.status === "stopped" || lf.failed) return;
        if (this.status !== "running") {
          lf.pending.unshift(n);
          return;
        }
        try {
          const url = await this._partUrl(lf, n);
          if (this.status !== "running" || lf.failed) {
            if (!lf.failed && this.status !== "stopped") lf.pending.unshift(n);
            return;
          }
          const start = (n - 1) * lf.partSize;
          const blob = item.file.slice(start, start + size);
          let last = 0;
          const res = await this.transport(url, blob, {
            signal: this.controller.signal,
            onProgress: (loaded) => {
              const d = loaded - last;
              if (d > 0) {
                this.transferred += d;
                last = loaded;
              }
              run.loaded = Math.min(loaded, size);
              this._emit();
            },
          });
          if (last < size) this.transferred += size - last;
          if (!res || !res.etag) {
            throw Object.assign(
              new Error("Amazon S3 didn't return an ETag for a part (CORS ExposeHeaders?)"),
              { permanent: true },
            );
          }
          run.loaded = 0;
          if (lf.failed) return;
          lf.etags.set(n, res.etag);
          this.bytesConfirmed += size;
          return;
        } catch (err) {
          run.loaded = 0;
          if (this.status === "stopped" || err.aborted || lf.failed) return;
          if (err instanceof Paused) {
            lf.pending.unshift(n);
            return;
          }
          if (err.permanent || err.name === "NotReadableError" || err.name === "NotFoundError") {
            this._closeLarge(lf, err);
            return;
          }
          if (err.status === 403) lf.urls.delete(n);
          attempts++;
          if (attempts > this.maxRetries) {
            this._closeLarge(lf, err);
            return;
          }
          await this.sleep(this._backoff(attempts - 1));
        }
      }
    } finally {
      this.running.delete(run);
      lf.inflight--;
      this.partSlots--;
      this._release();
      this._after();
    }
  }

  /** Every part is in → CompleteMultipartUpload (a control call, no slot). */
  _maybeComplete(lf) {
    if (
      lf.failed ||
      lf.completing ||
      !lf.ready ||
      lf.inflight > 0 ||
      lf.pending.length > 0 ||
      this.status !== "running"
    ) {
      return;
    }
    this.controlOps++;
    this._completeLarge(lf)
      .catch((err) => {
        if (this.status === "stopped") return;
        if (err instanceof Paused) {
          lf.completing = false; // resume() → _pump → _maybeComplete tries again
          return;
        }
        this._closeLarge(lf, err);
      })
      .finally(() => {
        this.controlOps--;
        this._after();
      });
  }

  async _completeLarge(lf) {
    if (lf.completing) return;
    lf.completing = true;
    const { item } = lf;
    const parts = [...lf.etags.entries()]
      .map(([partNumber, etag]) => ({ partNumber, etag }))
      .sort((a, b) => a.partNumber - b.partNumber);
    if (parts.length !== lf.partCount) {
      throw new Error(`Only ${parts.length} of ${lf.partCount} parts were uploaded`);
    }
    try {
      await this._control(
        () =>
          this.api.multipartComplete({
            path: item.path,
            uploadId: lf.uploadId,
            size: item.size,
            parts,
          }),
        item,
      );
    } catch (err) {
      if (err.status === 404 && !item.restarted) {
        // The upload vanished (cleaned up?) — start this file over once.
        this.storage.remove(lf.key);
        this.bytesConfirmed -= this._confirmedFor(lf);
        this._dropLarge(lf);
        lf.failed = true;
        item.restarted = true;
        this.large.push(item);
        return;
      }
      if (err.status === 409) this.storage.remove(lf.key); // size mismatch: don't resume a bad upload
      throw err;
    }
    this.storage.remove(lf.key);
    this._dropLarge(lf);
    this.doneFiles++;
    item.file = null;
  }

  _confirmedFor(lf) {
    let s = 0;
    for (const n of lf.etags.keys()) s += this._expectedPartSize(lf, n);
    return s;
  }

  _dropLarge(lf) {
    const i = this.activeLarge.indexOf(lf);
    if (i !== -1) this.activeLarge.splice(i, 1);
  }

  /** Give up on a multipart file (for now). The saved uploadId stays in
   *  storage, so "Retry failed" — or a later visit — resumes its parts. */
  _closeLarge(lf, err) {
    if (lf.failed) return;
    lf.failed = true;
    if (lf.partSize) this.bytesConfirmed -= this._confirmedFor(lf);
    this._dropLarge(lf);
    this._fail(lf.item, err);
  }
}
