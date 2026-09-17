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
 *
 * OUTAGES ARE NOT FILE FAILURES
 *   Retry budgets are per file, and an outage would spend them all: with the
 *   backend down (a dyno restart, the shared brute-force limiter's 429, a
 *   router 503) or the connection gone while navigator.onLine stays true,
 *   every file that took a slot would burn its retries in ~60s and land in
 *   Failed — hundreds an hour. So the whole queue goes to status "waiting"
 *   instead, and a timer probes (sign + PUT the 1-byte `.connection-test`,
 *   30s → 5 min apart; plus one manifest page when a backend call tripped it,
 *   since signing never touches S3 but multipart control calls do) until the
 *   path works again, then carries on by itself:
 *     - a backend call (signing or multipart control) that fails with 429, or
 *       with 5xx/network twice more after quick retries → wait;
 *     - S3 PUTs failing with 5xx/network on 3 DIFFERENT files with no success
 *       in between → wait;
 *     - a file that runs out of retries on a 5xx/network error probes first:
 *       probe fails → wait (the file is requeued with a fresh budget); probe
 *       works → the problem is that file, so it goes to Failed.
 *   A successful probe disarms the two shortcuts until a real PUT succeeds, so
 *   a file a proxy always refuses can't ping-pong the queue between waiting and
 *   running forever — it takes the probe-first path to Failed instead.
 *   A backend 401/403 is different again: the code itself was refused, so the
 *   queue pauses for good with `fatal` set (resuming can't fix it).
 *
 * NOTHING IS REPLACED
 *   The upload code's URLs are signed with If-None-Match: * (the presign item
 *   says `ifNoneMatch`), and its multipart create/complete answer 409
 *   `code: "exists"` when the key is taken. The pre-flight already renames
 *   clashes, so a taken key mostly means THIS file landed on an earlier try
 *   whose answer was lost. Same rule as the pre-flight: there at the same
 *   size → done; a different size → Failed with a "pick it again" message
 *   (never retried); gone again → an ordinary retry. A single PUT's 412 has no
 *   size, so it reads a manifest listing started after the 412 — shared, so a
 *   burst of them costs one listing.
 */

import { putWithProgress } from "./api.js";
import {
  MiB,
  backoffMs,
  createSpeedMeter,
  existsError,
  fingerprint,
  humanError,
  probeReadable,
  unreadableError,
} from "./helpers.js";

export const MULTIPART_THRESHOLD = 64 * MiB;
export const MAX_SLOTS = 6;
export const PARTS_PER_FILE = 4;
export const MAX_RETRIES = 6;
export const PRESIGN_BATCH = 100;
export const PART_SIGN_BATCH = 20;
/** The reserved key the connectivity self-test and outage probes write. */
export const PROBE_PATH = ".connection-test";
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

/* Thrown when work must go back in the queue untouched: a pause, a wait for
 * an outage, or a fatal code refusal. Never a file failure. */
class Paused extends Error {}

/* Thrown when a multipart file turns out to be in S3 already at its size. */
class AlreadyUploaded extends Error {}

/* The backend's "the upload code may not replace this key" answer. */
const isExists = (err) => Boolean(err) && err.status === 409 && err.code === "exists";

/* An S3 PUT that failed in a way an outage would also cause. */
const isTransferFailure = (err) =>
  Boolean(err) && !err.aborted && (err.status === 0 || err.status >= 500);

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
    controlRetries = 2,
    netFailTrip = 3,
    waitBaseMs = 30000,
    waitCapMs = 5 * 60 * 1000,
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
      controlRetries,
      netFailTrip,
      waitBaseMs,
      waitCapMs,
    });
    this.listeners = new Set();
    this.controller = new AbortController();
    this.meter = createSpeedMeter(10000);
    this.emitTimer = null;
    this.waitGen = 0;
    this._reset();
  }

  _reset() {
    this.status = "idle"; // idle | running | paused | waiting | done | stopped
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
    this._endWait();
    this.outages = 0; // consecutive outage waits, for the wait backoff
    this.netFails = new Set(); // files whose PUT failed on the network since the last success
    this.breakerArmed = true;
    this.probing = new Map(); // kind → in-flight probe
    this.probes = 0;
    this.listing = null; // { startedAt, promise: Map(path → size) } — see _sizeInS3
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

  /** Stop starting new work. Also cancels an outage wait. */
  pause() {
    if (this.status !== "running" && this.status !== "waiting") return;
    this._endWait();
    this.status = "paused";
    this._emit(true);
  }

  /** From a pause, or "try now" from an outage wait. */
  resume() {
    if (this.status !== "paused" && this.status !== "waiting") return;
    this._endWait();
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
    this._endWait();
    this.status = "running";
    this._pump();
    this._checkDone();
    this._emit(true);
  }

  /** Abort everything in flight and stop for good (page unmount). */
  stop() {
    this.status = "stopped";
    this._endWait();
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
      waiting: this.waiting ? { ...this.waiting } : null,
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

  /* The BACKEND refused the code (401/403). Every other file would hit the
   * same wall — and each attempt counts against the brute-force limiter — so
   * stop the whole queue and say why, instead of failing 40k files one by one.
   * Resuming with the same code can't help; the page hides Resume while
   * `fatal` is set. */
  _fatal(err) {
    if (this.status === "stopped") return;
    this.fatal =
      err.status === 403
        ? "That code isn't allowed to upload — reload the page and enter the upload code again."
        : "The code was refused — reload the page and enter it again.";
    if (this.status === "running" || this.status === "waiting") {
      this._endWait();
      this.status = "paused";
    }
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

  /* ---------- outages ---------- */

  _endWait() {
    this.waitGen++;
    this.waiting = null;
  }

  _outageMessage(err) {
    if (err && err.status === 429) {
      return "Patrick's server asked this page to slow down for a few minutes. Nothing is lost — the upload carries on by itself.";
    }
    if (err && err.status >= 500 && !err.transfer) {
      return "Patrick's server isn't answering right now. Nothing is lost — the upload carries on by itself when it's back.";
    }
    return "Uploads can't get through right now — the connection may have dropped. Nothing is lost — the upload carries on by itself when it's back.";
  }

  _waitDelay() {
    return Math.min(this.waitCapMs, this.waitBaseMs * 2 ** Math.max(0, this.outages - 1));
  }

  /** Switch the whole queue to "waiting" and probe on a timer. No-op unless
   *  running (a second trip, a pause or a stop already took over).
   *  kind: "transfer" (S3 PUTs failing) or "control" (a backend call). */
  _outage(err, kind = "transfer") {
    if (this.status !== "running") return;
    this.outages++;
    this.netFails.clear();
    this._endWait();
    const gen = this.waitGen;
    const delay = this._waitDelay();
    this.status = "waiting";
    this.waiting = {
      message: this._outageMessage(err),
      detail: (err && err.message) || "",
      retryAt: this.now() + delay,
    };
    this._emit(true);
    this._waitLoop(gen, delay, kind);
  }

  async _waitLoop(gen, firstDelay, kind) {
    let delay = firstDelay;
    for (;;) {
      await this.sleep(delay);
      if (gen !== this.waitGen || this.status !== "waiting") return;
      let err = null;
      try {
        await this._probe(kind);
      } catch (e) {
        err = e;
      }
      if (gen !== this.waitGen || this.status !== "waiting") return;
      if (!err) {
        /* The path works. Until a real PUT succeeds, don't let the shortcuts
         * trip again — see the header comment. */
        this.breakerArmed = false;
        this._endWait();
        this.status = "running";
        this._pump();
        this._checkDone();
        this._emit(true);
        return;
      }
      if (this._isAuthError(err)) {
        this._fatal(err);
        return;
      }
      this.outages++;
      delay = this._waitDelay();
      this.waiting = {
        message: this._outageMessage(err),
        detail: err.message || "",
        retryAt: this.now() + delay,
      };
      this._emit(true);
    }
  }

  /** Sign and PUT the 1-byte reserved test object — the same round trip every
   *  file needs (backend + S3). A "control" probe also reads one manifest page,
   *  the lightest upload-role call that makes the BACKEND talk to S3 (signing
   *  is local to the backend, so it can pass while create/complete can't).
   *  Shared per kind while one is in flight. */
  _probe(kind = "transfer") {
    const inFlight = this.probing.get(kind);
    if (inFlight) return inFlight;
    const p = (async () => {
      this.probes++;
      const res = await this.api.presignPut([
        { path: PROBE_PATH, size: 1, contentType: "text/plain" },
      ]);
      const it = res && res.files && res.files[0];
      if (!it || !it.url) {
        throw Object.assign(new Error((it && it.error) || "No test link from the server"), {
          status: 0,
        });
      }
      const body =
        typeof globalThis.Blob === "function" ? new globalThis.Blob(["1"], { type: "text/plain" }) : "1";
      try {
        await this.transport(it.url, body, {
          contentType: it.contentType || "text/plain",
          ifNoneMatch: it.ifNoneMatch || undefined,
          signal: this.controller.signal,
        });
      } catch (e) {
        /* 412: the test file is already there, and S3 only says so after
         * checking the signature — the whole round trip works. */
        if (!(e && e.status === 412)) {
          e.transfer = true;
          throw e;
        }
      }
      if (kind === "control" && typeof this.api.manifestPage === "function") {
        await this.api.manifestPage(null);
      }
    })();
    this.probing.set(kind, p);
    p.finally(() => {
      if (this.probing.get(kind) === p) this.probing.delete(kind);
    }).catch(() => {});
    return p;
  }

  /** A file ran out of retries on a 5xx/network error. Is it the file, or is
   *  everything down? Resolves true when the caller should requeue the work
   *  (outage, pause, stop), false when the file should go to Failed. */
  async _requeueInsteadOfFail(kind = "transfer") {
    if (this.status !== "running") return true;
    try {
      await this._probe(kind);
    } catch (e) {
      if (this.status !== "running") return true;
      if (this._isAuthError(e)) this._fatal(e);
      else this._outage(e, kind);
      return true;
    }
    return this.status !== "running";
  }

  /** Count a network-ish PUT failure. Resolves true when the queue is no
   *  longer running (it may just have tripped into "waiting"). */
  _noteTransferFailure(item, err) {
    if (this.breakerArmed && this.status === "running") {
      this.netFails.add(item);
      if (this.netFails.size >= this.netFailTrip) this._outage(err);
    }
    return this.status !== "running";
  }

  _noteSuccess() {
    this.netFails.clear();
    this.breakerArmed = true;
    this.outages = 0;
  }

  /** A backend call (signing or multipart control). 401/403 → fatal pause.
   *  429 → wait at once. 5xx/network → a couple of quick retries, then wait
   *  (or, when the shortcut is disarmed, the full budget and a probe first).
   *  Anything else is the caller's to handle. Throws Paused whenever the work
   *  should simply be requeued. */
  async _control(fn) {
    for (let attempt = 0; ; attempt++) {
      if (this.status !== "running") throw new Paused();
      try {
        return await fn();
      } catch (err) {
        if (err instanceof Paused) throw err;
        if (this.status !== "running") throw new Paused();
        if (this._isAuthError(err)) {
          this._fatal(err);
          throw new Paused();
        }
        const retryable = !err.status || err.status >= 500 || err.status === 429;
        if (!retryable) throw err;
        if (err.status === 429 || (this.breakerArmed && attempt >= this.controlRetries)) {
          this._outage(err, "control");
          throw new Paused();
        }
        if (attempt >= this.maxRetries) {
          if (await this._requeueInsteadOfFail("control")) throw new Paused();
          throw err;
        }
        await this.sleep(this._backoff(attempt));
      }
    }
  }

  /* ---------- small files ---------- */

  _smallDone(item) {
    this.bytesConfirmed += item.size;
    this.doneFiles++;
    this._noteSuccess();
    item.file = null; // done — drop the Blob reference
  }

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
        const res = await this._control(() =>
          this.api.presignPut(
            batch.map((x) => ({ path: x.path, size: x.size, contentType: x.contentType })),
          ),
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
            x.ifNoneMatch = r.ifNoneMatch || null; // signed into the URL: must be sent
          } else if (r.error) {
            x.signError = r.error;
          }
        }
      })();
      this.presigning = p;
      try {
        await p;
      } catch (err) {
        if (!(err instanceof Paused)) err.permanent = true; // _control already retried it
        throw err;
      } finally {
        if (this.presigning === p) this.presigning = null;
      }
      if (!item.url && !item.signError) {
        throw Object.assign(new Error("The server didn't return an upload link for this file"), {
          permanent: true,
        });
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
          try {
            await this.transport(item.url, item.file, {
              contentType: item.contentType,
              ifNoneMatch: item.ifNoneMatch || undefined,
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
          } catch (e) {
            if (e && typeof e === "object") e.transfer = true;
            throw e;
          }
          if (last < item.size) this.transferred += item.size - last;
          run.loaded = 0;
          this._smallDone(item);
          return;
        } catch (err) {
          run.loaded = 0;
          if (err instanceof Paused) throw err;
          if (this.status === "stopped" || err.aborted) return;
          if (err.permanent || err.name === "NotReadableError" || err.name === "NotFoundError") {
            this._fail(item, err);
            return;
          }
          if (err.transfer && err.status === 412) {
            /* S3: something is already at this key (see NOTHING IS REPLACED). */
            let there;
            try {
              there = await this._sizeInS3(item.path, this.now());
            } catch (e) {
              if (e instanceof Paused) throw e;
              if (this.status === "stopped") return;
              this._fail(item, e);
              return;
            }
            if (this.status === "stopped") return;
            if (there === item.size) {
              this._smallDone(item);
              return;
            }
            if (there !== null) {
              this._fail(item, existsError());
              return;
            }
            // Gone again (deleted in between): an ordinary retry below.
          }
          /* XHR reports an unreadable File (changed, locked, OneDrive
           * placeholder) as a plain network error. Read a byte to tell. */
          if (err.transfer && err.status === 0 && !err.stalled) {
            const readErr = await probeReadable(item.file);
            if (this.status === "stopped") return;
            if (readErr) {
              this._fail(item, unreadableError(readErr));
              return;
            }
          }
          if (err.status === 403) item.url = null; // S3 refused the URL (expired?) → re-sign
          const transferFailure = err.transfer && isTransferFailure(err);
          if (transferFailure && this._noteTransferFailure(item, err)) throw new Paused();
          item.attempts++;
          if (item.attempts > this.maxRetries) {
            if (transferFailure && (await this._requeueInsteadOfFail())) throw new Paused();
            this._fail(item, err);
            return;
          }
          await this.sleep(this._backoff(item.attempts - 1));
        }
      }
    } catch (err) {
      if (err instanceof Paused && this.status !== "stopped") {
        item.attempts = 0; // a pause or an outage isn't this file's fault
        this.smallRetry.unshift(item);
      }
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
    };
    this.activeLarge.push(lf);
    this.controlOps++;
    try {
      await this._prepareLarge(lf);
      lf.ready = true; // _after → _pump starts its parts, or completes it if none are left
    } catch (err) {
      if (err instanceof AlreadyUploaded) {
        // Nothing was confirmed for it yet (create is the first step that can say so).
        this.bytesConfirmed += item.size;
        this._finishLarge(lf);
      } else if (err instanceof Paused) {
        this._dropLarge(lf);
        if (lf.partSize) this.bytesConfirmed -= this._confirmedFor(lf);
        lf.failed = true; // retire this handle; the item reopens on resume
        if (this.status !== "stopped") this.large.push(item);
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
    /* Fail fast on a file that can't be read (an open .pst, a OneDrive
     * placeholder) instead of discovering it part by part. */
    const readErr = await probeReadable(item.file);
    if (readErr) throw unreadableError(readErr);
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
        const res = await this._control(() =>
          this.api.multipartParts({ path: item.path, uploadId: saved.uploadId }),
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
      let res;
      try {
        res = await this._control(() =>
          this.api.multipartCreate({
            path: item.path,
            size: item.size,
            contentType: item.contentType,
          }),
        );
      } catch (err) {
        if (!isExists(err)) throw err;
        if (err.data && err.data.size === item.size) throw new AlreadyUploaded();
        throw existsError();
      }
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
        const res = await this._control(() =>
          this.api.multipartSign({
            path: lf.item.path,
            uploadId: lf.uploadId,
            partNumbers: nums,
          }),
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
        let blob = null;
        try {
          const url = await this._partUrl(lf, n);
          if (this.status !== "running" || lf.failed) {
            if (!lf.failed && this.status !== "stopped") lf.pending.unshift(n);
            return;
          }
          const start = (n - 1) * lf.partSize;
          blob = item.file.slice(start, start + size);
          let last = 0;
          let res;
          try {
            res = await this.transport(url, blob, {
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
          } catch (e) {
            if (e && typeof e === "object") e.transfer = true;
            throw e;
          }
          if (last < size) this.transferred += size - last;
          if (!res || !res.etag) {
            throw Object.assign(
              new Error("Amazon S3 didn't return an ETag for a part (CORS ExposeHeaders?)"),
              { permanent: true },
            );
          }
          run.loaded = 0;
          this._noteSuccess();
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
          if (!err.transfer) {
            // A backend call that _control already retried (or refused as 4xx).
            this._closeLarge(lf, err);
            return;
          }
          if (err.status === 0 && !err.stalled) {
            const readErr = await probeReadable(blob);
            if (this.status === "stopped" || lf.failed) return;
            if (readErr) {
              this._closeLarge(lf, unreadableError(readErr));
              return;
            }
          }
          if (err.status === 404) {
            /* S3 NoSuchUpload: the multipart upload is gone (cleaned up from
             * the download page?). Its parts went with it — start over once. */
            this.storage.remove(lf.key);
            if (!item.restarted) this._restartLarge(lf);
            else this._closeLarge(lf, err);
            return;
          }
          if (err.status === 403) lf.urls.delete(n);
          const transferFailure = isTransferFailure(err);
          if (transferFailure && this._noteTransferFailure(item, err)) {
            if (!lf.failed) lf.pending.unshift(n);
            return;
          }
          attempts++;
          if (attempts > this.maxRetries) {
            if (transferFailure && (await this._requeueInsteadOfFail())) {
              if (!lf.failed && this.status !== "stopped") lf.pending.unshift(n);
              return;
            }
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
      await this._control(() =>
        this.api.multipartComplete({
          path: item.path,
          uploadId: lf.uploadId,
          size: item.size,
          parts,
        }),
      );
    } catch (err) {
      if (err instanceof Paused) throw err;
      if (isExists(err)) {
        /* Another file reached this key first (or this one did, on a try whose
         * answer was lost). The backend already threw these parts away. */
        this.storage.remove(lf.key);
        if (err.data && err.data.size === item.size) {
          this._finishLarge(lf); // every part is already counted in bytesConfirmed
          return;
        }
        throw existsError();
      }
      if (err.status === 404) {
        /* S3 no longer knows this uploadId. Either it was aborted (cleanup),
         * or an EARLIER complete succeeded and its answer was lost (a 30s
         * timeout, a router 503, a dyno restart) — then the retry lands here.
         * Look before re-sending gigabytes. */
        this.storage.remove(lf.key);
        if (await this._alreadyInS3(item)) {
          this._finishLarge(lf);
          return;
        }
        if (!item.restarted) {
          this._restartLarge(lf);
          return;
        }
      }
      if (err.status === 409) this.storage.remove(lf.key); // size mismatch: don't resume a bad upload
      throw err;
    }
    this.storage.remove(lf.key);
    this._finishLarge(lf);
  }

  /** Is `item.path` in the manifest at exactly `item.size`? (Same rule as the
   *  page's pre-flight "already uploaded".) Throws Paused through _control. */
  async _alreadyInS3(item) {
    return (await this._sizeInS3(item.path, this.now())) === item.size;
  }

  /** The size of `path` according to a manifest listing that STARTED at or
   *  after `since` — so it reflects whatever S3 reported before then — or null
   *  when the path isn't there. A listing still running (or done) that
   *  started late enough is reused, so a burst of 412s costs one. Goes through
   *  _control, so it can throw Paused. */
  async _sizeInS3(path, since) {
    if (typeof this.api.manifestAll !== "function") return null;
    let snap = this.listing;
    if (!snap || snap.startedAt < since) {
      const startedAt = this.now();
      const promise = this._control(() => this.api.manifestAll()).then(
        (files) => new Map((files || []).map((f) => [f.path, f.size])),
      );
      snap = { startedAt, promise };
      this.listing = snap;
      promise.catch(() => {
        if (this.listing === snap) this.listing = null;
      });
    }
    const sizes = await snap.promise;
    return sizes.has(path) ? sizes.get(path) : null;
  }

  _finishLarge(lf) {
    this._dropLarge(lf);
    this.doneFiles++;
    lf.item.file = null;
  }

  /** The upload is gone: forget its parts and queue the file from scratch, once. */
  _restartLarge(lf) {
    if (lf.failed) return;
    lf.failed = true;
    if (lf.partSize) this.bytesConfirmed -= this._confirmedFor(lf);
    this._dropLarge(lf);
    lf.item.restarted = true;
    this.large.push(lf.item);
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
