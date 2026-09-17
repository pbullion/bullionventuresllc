import { useEffect, useMemo, useRef, useState } from "react";

import { UPLOAD_CODE_KEY, createApi, putWithProgress } from "./api.js";
import {
  countUnfinishedUploads,
  entriesFromDrop,
  forgetThisComputer,
  useNoindex,
  walkEntries,
} from "./browser.js";
import { chunk, folderBreakdown, formatBytes, isJunkFile, joinFolder, planUploads } from "./helpers.js";
import { CSS } from "./styles.js";
import { CappedList, CodeGate, ProgressBar, Stat, TransferStats } from "./ui.jsx";
import { UploadEngine } from "./uploadEngine.js";

/* /file-drop — "Send files to Patrick".
 *
 * Private two-code file transfer to S3: pick folders, the browser PUTs every
 * byte straight to a private S3 prefix, and Patrick pulls them down from
 * /file-drop/download on his Mac. Background lives in the backend repo.
 *
 * Assume Windows + Edge/Chrome, possibly a TLS-inspecting proxy, tens of
 * thousands of files and multi-GB single files. The shared backend only SIGNS URLs — see
 * api.js and uploadEngine.js for why bytes must never go through it.
 *
 * Unlisted and cardless (privatePages.js), noindex. The upload code can't
 * download or delete anything; that needs the separate admin code. */

export default function FileDropUpload() {
  useNoindex("Send files to Patrick");
  const [auth, setAuth] = useState(null); // { code, info }
  const [selfTest, setSelfTest] = useState({ state: "idle" }); // idle | running | ok | fail

  const runSelfTest = async (code) => {
    setSelfTest({ state: "running" });
    let stage = "server";
    const api = createApi(code);
    try {
      const res = await api.presignPut([
        { path: ".connection-test", size: 1, contentType: "text/plain" },
      ]);
      const item = res.files && res.files[0];
      if (!item || !item.url) throw new Error(item?.error || "The server didn't return a test link");
      stage = "s3";
      try {
        await putWithProgress(item.url, new Blob(["1"], { type: "text/plain" }), {
          contentType: item.contentType || "text/plain",
          // Sent exactly as every real upload sends it, so a network that
          // strips the header fails here rather than on file one.
          ifNoneMatch: item.ifNoneMatch || undefined,
          stallMs: 30000,
          responseStallMs: 30000,
        });
      } catch (err) {
        /* 412 = the test file is already there from an earlier test. S3 only
         * says that after checking the signature, so the path works. */
        if (err.status !== 412) throw err;
      }
      setSelfTest({ state: "ok" });
    } catch (err) {
      /* Where it broke decides what to say. The signing call → Patrick's
       * server. An answer from S3 itself (an XML <Code> such as AccessDenied or
       * InvalidAccessKeyId) means the network let the upload through and S3
       * refused the server's signature — a problem on Patrick's side, not this
       * network's. No answer from S3 at all → the network is blocking it.
       * SignatureDoesNotMatch is either: the server's AWS key is wrong, or a
       * proxy changed the request (e.g. dropped the signed If-None-Match). The
       * server's own S3 calls use that same key, so one manifest page tells
       * them apart. */
      let kind = stage === "server" ? "server" : err.s3Code ? "storage" : "network";
      if (err.s3Code === "SignatureDoesNotMatch") {
        try {
          await api.manifestPage(null);
          kind = "altered";
        } catch {
          kind = "storage";
        }
      }
      setSelfTest({ state: "fail", error: err.message, kind });
    }
  };

  const onAuthed = ({ code, info }) => {
    setAuth({ code, info });
    runSelfTest(code);
  };

  return (
    <main className="fd-page">
      <style>{CSS}</style>
      <div className="fd-shell">
        <header style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 30, letterSpacing: "-0.02em" }}>
            Send files to Patrick
          </h1>
          <p className="fd-note" style={{ fontSize: 15.5 }}>
            Files go straight into a private folder that only Patrick can open. Nothing is
            shared publicly, and nothing on this computer is changed or deleted.
          </p>
        </header>

        {!auth ? (
          <CodeGate
            storageKey={UPLOAD_CODE_KEY}
            refuseAdmin
            onAuthed={onAuthed}
            label="Enter the code Patrick gave you"
            hint="The code is only kept while this tab is open."
          />
        ) : (
          <>
            <SelfTest test={selfTest} onRetry={() => runSelfTest(auth.code)} />
            <Sender code={auth.code} />
          </>
        )}
      </div>
    </main>
  );
}

function SelfTest({ test, onRetry }) {
  if (test.state === "idle") return null;
  if (test.state === "running") {
    return <div className="fd-warn" style={{ marginBottom: 16 }}>Checking that this network allows uploads…</div>;
  }
  if (test.state === "ok") {
    return <div className="fd-ok" style={{ marginBottom: 16 }}>✅ Direct upload works on this network.</div>;
  }
  if (test.kind === "storage") {
    return (
      <div className="fd-bad" style={{ marginBottom: 16 }}>
        <strong>❌ Amazon S3 turned the test upload down.</strong>
        <p style={{ margin: "6px 0 10px", lineHeight: 1.5 }}>
          The upload got through this network, but Amazon S3 (where the files are stored) refused
          it. That&apos;s a setting on Patrick&apos;s side, not a problem with this computer or
          network. Let Patrick know before picking any files.
        </p>
        <div className="fd-muted" style={{ color: "inherit", opacity: 0.8, marginBottom: 10 }}>
          Details: {test.error}
        </div>
        <button className="fd-btn danger-ghost small" type="button" onClick={onRetry}>
          Test again
        </button>
      </div>
    );
  }
  if (test.kind === "altered") {
    return (
      <div className="fd-bad" style={{ marginBottom: 16 }}>
        <strong>❌ This network changed the test upload on its way.</strong>
        <p style={{ margin: "6px 0 10px", lineHeight: 1.5 }}>
          The test upload reached Amazon S3 (where the files are stored), but something on this
          network altered it along the way, so S3 couldn&apos;t accept it. Uploads from this network
          won&apos;t work as they are. Let Patrick know before picking any files.
        </p>
        <div className="fd-muted" style={{ color: "inherit", opacity: 0.8, marginBottom: 10 }}>
          Details: {test.error}
        </div>
        <button className="fd-btn danger-ghost small" type="button" onClick={onRetry}>
          Test again
        </button>
      </div>
    );
  }
  if (test.kind === "server") {
    return (
      <div className="fd-bad" style={{ marginBottom: 16 }}>
        <strong>❌ The upload test couldn&apos;t start.</strong>
        <p style={{ margin: "6px 0 10px", lineHeight: 1.5 }}>
          Patrick&apos;s server didn&apos;t hand out a test link: {test.error}
        </p>
        <button className="fd-btn danger-ghost small" type="button" onClick={onRetry}>
          Test again
        </button>
      </div>
    );
  }
  return (
    <div className="fd-bad" style={{ marginBottom: 16 }}>
      <strong>❌ This network is blocking uploads.</strong>
      <p style={{ margin: "6px 0 10px", lineHeight: 1.5 }}>
        The page reached Patrick&apos;s server, but the test upload to Amazon S3 (where the files
        are stored) didn&apos;t go through. That usually means this network or its security
        software blocks uploads to Amazon S3. Let Patrick know before picking any files.
      </p>
      <div className="fd-muted" style={{ color: "inherit", opacity: 0.8, marginBottom: 10 }}>
        Details: {test.error}
      </div>
      <button className="fd-btn danger-ghost small" type="button" onClick={onRetry}>
        Test again
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function Sender({ code }) {
  const [picked, setPicked] = useState([]); // [{ file, rel }]
  const [junk, setJunk] = useState(0);
  const [readErrors, setReadErrors] = useState([]);
  const [scanning, setScanning] = useState(null); // null | number
  const [folder, setFolder] = useState("");
  const [over, setOver] = useState(false);
  const [phase, setPhase] = useState("pick"); // pick | checking | review | uploading
  const [checkMsg, setCheckMsg] = useState("");
  const [checkError, setCheckError] = useState("");
  const [review, setReview] = useState(null);
  const [engine, setEngine] = useState(null);
  const [snap, setSnap] = useState(null);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  const [notice, setNotice] = useState("");
  // Big-file uploads this browser started and never finished (localStorage).
  const [unfinished] = useState(() => countUnfinishedUploads());
  const autoPaused = useRef(false);

  const addFiles = (list, { hadErrors = false } = {}) => {
    const keep = [];
    let skipped = 0;
    for (const x of list) {
      if (isJunkFile(x.rel)) skipped++;
      else keep.push(x);
    }
    if (keep.length) setPicked((prev) => prev.concat(keep));
    if (skipped) setJunk((n) => n + skipped);
    // A click that adds nothing must not look like a click that did nothing.
    setNotice(
      !keep.length && !skipped && !hadErrors
        ? "Nothing was added — there are no files in what you picked."
        : !keep.length && skipped
          ? "Nothing was added — everything you picked was system or temporary files."
          : "",
    );
  };

  const onInput = (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files.map((f) => ({ file: f, rel: f.webkitRelativePath || f.name })));
    e.target.value = "";
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setOver(false);
    const entries = entriesFromDrop(e.dataTransfer); // must be read synchronously
    const loose = entries ? null : Array.from(e.dataTransfer.files || []);
    if (loose) {
      addFiles(loose.map((f) => ({ file: f, rel: f.name })));
      return;
    }
    setScanning(0);
    const { files, errors } = await walkEntries(entries, (n) => setScanning(n));
    setScanning(null);
    addFiles(files, { hadErrors: errors.length > 0 });
    if (errors.length) setReadErrors((prev) => prev.concat(errors));
  };

  const clearPicked = () => {
    setPicked([]);
    setJunk(0);
    setReadErrors([]);
    setReview(null);
    setCheckError("");
    setNotice("");
  };

  const pickedSize = useMemo(() => picked.reduce((s, p) => s + p.file.size, 0), [picked]);
  const pickedGroups = useMemo(
    () => folderBreakdown(picked.map((p) => ({ path: p.rel, size: p.file.size }))),
    [picked],
  );

  /* Pre-flight: what's already up there, what the server will call each path,
   * and what's left to send. */
  const check = async () => {
    setPhase("checking");
    setCheckError("");
    try {
      const api = createApi(code);
      setCheckMsg("Looking at what's already uploaded…");
      const existing = await api.manifestAll((n) =>
        setCheckMsg(`Looking at what's already uploaded… ${n.toLocaleString()} files so far`),
      );
      const there = new Map(existing.map((f) => [f.path, f.size]));
      const inputs = picked.map((p) => joinFolder(folder, p.rel));
      const results = [];
      for (const batch of chunk(inputs, 1000)) {
        setCheckMsg(`Checking file names… ${results.length.toLocaleString()} of ${inputs.length.toLocaleString()}`);
        const res = await api.resolve(batch);
        const rows = res.results || [];
        for (let i = 0; i < batch.length; i++) results.push(rows[i] || { input: batch[i], error: "No answer" });
      }
      const invalid = [];
      const entries = [];
      picked.forEach((p, i) => {
        const r = results[i];
        if (!r || r.error || !r.path) invalid.push({ path: inputs[i], error: r?.error || "Invalid name" });
        else entries.push({ ...p, path: r.path, size: p.file.size, lastModified: p.file.lastModified });
      });
      /* Same file picked twice → once. Two DIFFERENT files on one path (two
       * "Resume.docx" from different folders), or a path already in S3 at a
       * different size → the later one gets "name (2).ext". Nothing is ever
       * dropped or overwritten. See helpers.planUploads. */
      const plan = planUploads(entries, there);
      setReview({
        total: picked.length,
        totalSize: pickedSize,
        duplicates: plan.duplicates,
        renamed: plan.renamed,
        toUpload: plan.toUpload,
        toUploadSize: plan.toUpload.reduce((s, x) => s + x.file.size, 0),
        alreadyCount: plan.already.length,
        alreadySize: plan.already.reduce((s, x) => s + x.file.size, 0),
        invalid,
      });
      setPhase("review");
    } catch (err) {
      setCheckError(err.message);
      setPhase("pick");
    }
  };

  const start = () => {
    const eng = new UploadEngine({ api: createApi(code) });
    eng.subscribe(setSnap);
    eng.setFiles(
      review.toUpload.map((x) => ({
        path: x.path,
        size: x.file.size,
        lastModified: x.file.lastModified,
        file: x.file,
        contentType: x.file.type,
      })),
    );
    setEngine(eng);
    setPhase("uploading");
    eng.start();
  };

  const sendMore = () => {
    clearPicked();
    setEngine(null);
    setSnap(null);
    setPhase("pick");
  };

  const status = snap?.status;
  const working = status === "running" || status === "paused" || status === "waiting";
  /* Stay awake through an outage wait or an offline auto-pause too — if the
   * laptop sleeps, the page can't notice the connection coming back. A manual
   * pause lets it sleep. */
  const holdAwake =
    status === "running" || status === "waiting" || (status === "paused" && offline);

  // Stop the engine (abort in-flight PUTs) when it is replaced or the page unmounts.
  useEffect(() => {
    if (!engine) return undefined;
    return () => engine.stop();
  }, [engine]);

  // Auto-pause when the connection drops; resume only what WE paused.
  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      if (engine && (engine.status === "running" || engine.status === "waiting")) {
        autoPaused.current = true;
        engine.pause();
      }
    };
    const goOnline = () => {
      setOffline(false);
      if (engine && autoPaused.current) {
        autoPaused.current = false;
        engine.resume();
      }
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [engine]);

  // Warn before closing the tab mid-upload.
  useEffect(() => {
    if (!working) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [working]);

  // Keep the screen (and so the laptop) awake while uploading.
  useEffect(() => {
    if (!holdAwake || typeof navigator === "undefined" || !navigator.wakeLock) return undefined;
    let lock = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const l = await navigator.wakeLock.request("screen");
        if (cancelled) l.release().catch(() => {});
        else lock = l;
      } catch {
        /* unsupported or refused — uploading still works */
      }
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      if (lock) lock.release().catch(() => {});
    };
  }, [holdAwake]);

  /* ---------------- render ---------------- */

  if (phase === "uploading" && snap) {
    return (
      <UploadProgress
        snap={snap}
        offline={offline}
        alreadyCount={review?.alreadyCount || 0}
        alreadySize={review?.alreadySize || 0}
        onPause={() => {
          autoPaused.current = false;
          engine.pause();
        }}
        onResume={() => {
          autoPaused.current = false;
          engine.resume();
        }}
        onRetry={() => engine.retryFailed()}
        onMore={sendMore}
      />
    );
  }

  return (
    <>
      <section className="fd-card">
        <h2>1. Choose what to send</h2>
        <p className="fd-note" style={{ marginTop: 0, marginBottom: 14 }}>
          Pick whole folders — everything inside comes along, subfolders included. You can pick
          more than once; it all adds up into one list.
        </p>
        {unfinished > 0 ? (
          <div className="fd-warn" style={{ marginBottom: 14 }} role="status">
            An earlier upload from this browser didn&apos;t finish — that&apos;s fine. Pick the same
            folders again (and type the same folder name in step 2, if you used one). Anything already
            uploaded is skipped, and big files carry on where they stopped.
          </div>
        ) : (
          <p className="fd-note" style={{ marginTop: 0, marginBottom: 14 }}>
            Picking up after an interruption (a closed tab, a restart)? Just pick the same folders
            again, with the same folder name in step 2 if you used one. Anything already uploaded is
            skipped, and big files carry on where they stopped.
          </p>
        )}
        <div className="fd-row">
          <label className="fd-btn big" style={{ display: "inline-block" }}>
            📁 Choose folder
            <input
              type="file"
              multiple
              ref={(el) => {
                if (el) el.setAttribute("webkitdirectory", "");
              }}
              onChange={onInput}
              disabled={phase !== "pick"}
              style={{ display: "none" }}
            />
          </label>
          <label className="fd-btn ghost big" style={{ display: "inline-block" }}>
            📄 Choose files
            <input
              type="file"
              multiple
              onChange={onInput}
              disabled={phase !== "pick"}
              style={{ display: "none" }}
            />
          </label>
        </div>
        <div
          className={`fd-drop${over ? " over" : ""}`}
          style={{ marginTop: 14 }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!over) setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={phase === "pick" ? onDrop : (e) => e.preventDefault()}
        >
          {scanning != null
            ? `Reading folders… ${scanning.toLocaleString()} files found`
            : "…or drag folders and files here"}
        </div>
        {notice && (
          <p className="fd-note" role="status">
            {notice}
          </p>
        )}

        {(picked.length > 0 || junk > 0) && (
          <div style={{ marginTop: 16 }}>
            <div className="fd-stats">
              <Stat value={picked.length.toLocaleString()} label="files picked" />
              <Stat value={formatBytes(pickedSize)} label="total size" />
              <Stat value={junk.toLocaleString()} label="junk skipped" />
            </div>
            {junk > 0 && (
              <p className="fd-note">
                Skipped automatically: system files like Thumbs.db, desktop.ini and .DS_Store,
                Office lock files (~$…) and .tmp files.
              </p>
            )}
            {pickedGroups.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <CappedList
                  rows={pickedGroups}
                  cap={12}
                  render={(g) => (
                    <li key={g.name || "(top)"}>
                      <span className="fd-path">{g.name ? `📁 ${g.name}` : "Loose files"}</span>
                      <span className="fd-muted" style={{ whiteSpace: "nowrap" }}>
                        {g.count.toLocaleString()} · {formatBytes(g.size)}
                      </span>
                    </li>
                  )}
                />
              </div>
            )}
            {readErrors.length > 0 && (
              <div className="fd-warn" style={{ marginTop: 10 }}>
                {readErrors.length} item(s) couldn&apos;t be read and were left out:
                <CappedList
                  rows={readErrors}
                  cap={20}
                  render={(r, i) => (
                    <li key={i}>
                      <span className="fd-path">{r.path}</span>
                      <span>{r.error}</span>
                    </li>
                  )}
                />
              </div>
            )}
            <div className="fd-row" style={{ marginTop: 12 }}>
              <button className="fd-btn quiet small" type="button" onClick={clearPicked} disabled={phase === "checking"}>
                Clear the list
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="fd-card">
        <h2>2. (Optional) Put it all inside a folder</h2>
        <input
          className="fd-input"
          value={folder}
          onChange={(e) => {
            setFolder(e.target.value);
            setReview(null);
            if (phase === "review") setPhase("pick");
          }}
          placeholder="e.g. Laptop files"
          disabled={phase === "checking"}
        />
        <p className="fd-note">Leave it empty to keep your folders exactly as they are.</p>
      </section>

      <section className="fd-card">
        <h2>3. Send</h2>
        {phase !== "review" && (
          <>
            <button
              className="fd-btn big"
              type="button"
              disabled={picked.length === 0 || phase === "checking" || scanning != null}
              onClick={check}
            >
              {phase === "checking" ? "Checking…" : "Check the list"}
            </button>
            {phase === "checking" && <p className="fd-note">{checkMsg}</p>}
            {checkError && (
              <div className="fd-bad" style={{ marginTop: 12 }} role="alert">
                Couldn&apos;t check the list: {checkError}
              </div>
            )}
          </>
        )}
        {phase === "review" && review && (
          <ReviewPanel review={review} onStart={start} onBack={() => setPhase("pick")} />
        )}
      </section>
    </>
  );
}

function ReviewPanel({ review, onStart, onBack }) {
  const nothingToDo = review.toUpload.length === 0;
  return (
    <div>
      <div className="fd-stats">
        <Stat value={review.total.toLocaleString()} label={`files · ${formatBytes(review.totalSize)}`} />
        <Stat value={review.toUpload.length.toLocaleString()} label={`to upload · ${formatBytes(review.toUploadSize)}`} />
        <Stat value={review.alreadyCount.toLocaleString()} label="already uploaded — skipped" />
        <Stat value={review.invalid.length.toLocaleString()} label="names that can't be used" />
      </div>
      {review.duplicates > 0 && (
        <p className="fd-note">
          {review.duplicates.toLocaleString()} file(s) were picked twice — each goes up once.
        </p>
      )}
      {review.renamed.length > 0 && (
        <div className="fd-warn" style={{ marginTop: 12 }}>
          {review.renamed.length.toLocaleString()} file(s) have the same name as a different file
          (in this list, or already uploaded). Nothing gets replaced — these go up with a number
          added:
          <CappedList
            rows={review.renamed}
            cap={50}
            render={(r, i) => (
              <li key={i} style={{ flexWrap: "wrap" }}>
                <span className="fd-path">{r.from}</span>
                <span className="fd-path">→ {r.to}</span>
              </li>
            )}
          />
        </div>
      )}
      {review.invalid.length > 0 && (
        <div className="fd-warn" style={{ marginTop: 12 }}>
          These will be left out:
          <CappedList
            rows={review.invalid}
            render={(r, i) => (
              <li key={i}>
                <span className="fd-path">{r.path}</span>
                <span>{r.error}</span>
              </li>
            )}
          />
        </div>
      )}
      {nothingToDo ? (
        <div className="fd-ok" style={{ marginTop: 14 }}>
          Everything in this list is already uploaded. Nothing to send.
        </div>
      ) : (
        <p className="fd-note" style={{ marginTop: 14 }}>
          Keep this tab open until it finishes. If it gets interrupted, pick the same folders
          again — anything already uploaded is skipped, and big files pick up where they left off.
        </p>
      )}
      <div className="fd-row" style={{ marginTop: 14 }}>
        {!nothingToDo && (
          <button className="fd-btn big" type="button" onClick={onStart}>
            Start upload
          </button>
        )}
        <button className="fd-btn quiet" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

function UploadProgress({ snap, offline, alreadyCount, alreadySize, onPause, onResume, onRetry, onMore }) {
  const done = snap.status === "done";
  const waiting = snap.status === "waiting";
  const allGood = done && snap.failedCount === 0;
  const allFiles = snap.totalFiles + alreadyCount;
  return (
    <>
      <section className="fd-card">
        {allGood ? (
          <div className="fd-ok" style={{ fontSize: 17 }}>
            ✅ All {allFiles.toLocaleString()} files are uploaded (
            {formatBytes(snap.bytesTotal + alreadySize)}). You can close this page.
          </div>
        ) : done ? (
          <div className="fd-warn">
            Finished, but {snap.failedCount.toLocaleString()} file(s) didn&apos;t make it — see below.
          </div>
        ) : (
          <h2 style={{ marginBottom: 12 }}>
            {waiting ? "Waiting to carry on…" : snap.status === "paused" ? "Paused" : "Uploading…"}
          </h2>
        )}
        {offline && !done && (
          <div className="fd-warn" style={{ marginTop: 10 }}>
            The internet connection dropped. The upload paused itself and will carry on when it
            comes back.
          </div>
        )}
        {waiting && snap.waiting && (
          <div className="fd-warn" style={{ marginTop: 10 }} role="status">
            {snap.waiting.message} It checks again every few minutes; &ldquo;Try now&rdquo; checks
            straight away.
            {snap.waiting.detail && (
              <div className="fd-muted" style={{ color: "inherit", opacity: 0.8, marginTop: 6 }}>
                Details: {snap.waiting.detail}
              </div>
            )}
          </div>
        )}
        {snap.fatal && (
          <div className="fd-bad" style={{ marginTop: 10 }} role="alert">
            {snap.fatal}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <ProgressBar done={snap.bytesDone} total={snap.bytesTotal} />
        </div>
        <TransferStats snap={snap} />
        <div className="fd-row" style={{ marginTop: 14 }}>
          {snap.status === "running" && (
            <button className="fd-btn ghost" type="button" onClick={onPause}>
              Pause
            </button>
          )}
          {/* Resuming with a refused code can't work — the message says to reload. */}
          {snap.status === "paused" && !snap.fatal && (
            <button className="fd-btn" type="button" onClick={onResume}>
              Resume
            </button>
          )}
          {waiting && (
            <>
              <button className="fd-btn" type="button" onClick={onResume}>
                Try now
              </button>
              <button className="fd-btn ghost" type="button" onClick={onPause}>
                Pause
              </button>
            </>
          )}
          {snap.failedCount > 0 && snap.status !== "paused" && !waiting && (
            <button className="fd-btn ghost" type="button" onClick={onRetry}>
              Retry failed ({snap.failedCount.toLocaleString()})
            </button>
          )}
          {done && (
            <button className="fd-btn quiet" type="button" onClick={onMore}>
              Send more files
            </button>
          )}
        </div>
        {!done && (
          <p className="fd-note">Keep this tab open. Pausing lets the files already sending finish.</p>
        )}
        {allGood && <ForgetThisComputer />}
      </section>

      {snap.active.length > 0 && (
        <section className="fd-card">
          <h2>Sending now</h2>
          <CappedList
            rows={snap.active}
            total={snap.activeCount}
            render={(a, i) => (
              <li key={`${a.path}-${a.label || ""}-${i}`}>
                <span className="fd-path">
                  {a.path}
                  {a.label ? <span className="fd-muted"> — {a.label}</span> : null}
                </span>
                <span className="fd-muted" style={{ whiteSpace: "nowrap" }}>
                  {a.sending > 0 ? `${Math.round((a.loaded / a.sending) * 100)}%` : ""}
                </span>
              </li>
            )}
          />
        </section>
      )}

      {snap.failedCount > 0 && (
        <section className="fd-card">
          <h2>Didn&apos;t upload ({snap.failedCount.toLocaleString()})</h2>
          <CappedList
            rows={snap.failed}
            total={snap.failedCount}
            render={(f, i) => (
              <li key={`${f.path}-${i}`} style={{ flexWrap: "wrap" }}>
                <span className="fd-path">{f.path}</span>
                <span style={{ fontSize: 12.5, color: "#a8321f" }}>{f.error}</span>
              </li>
            )}
          />
        </section>
      )}
    </>
  );
}

/* Uploads remember file paths (to resume big files) and the code (for this
 * tab) in the browser. Once everything is up, let her wipe that. */
function ForgetThisComputer() {
  const [forgotten, setForgotten] = useState(false);
  if (forgotten) {
    return (
      <p className="fd-note" role="status">
        Done — this browser no longer remembers the code or any file names from this page.
      </p>
    );
  }
  return (
    <div className="fd-row" style={{ marginTop: 12, alignItems: "center" }}>
      <button
        className="fd-btn quiet small"
        type="button"
        onClick={() => {
          forgetThisComputer([UPLOAD_CODE_KEY]);
          setForgotten(true);
        }}
      >
        Finished on this computer? Clear what this page saved
      </button>
    </div>
  );
}
