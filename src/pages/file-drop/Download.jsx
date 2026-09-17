import { useEffect, useMemo, useState } from "react";

import { ADMIN_CODE_KEY, createApi } from "./api.js";
import { clickDownload, copyText, downloadBlob, useNoindex } from "./browser.js";
import { DownloadEngine, SUBFOLDER } from "./downloadEngine.js";
import { buildCurlScript, chunk, folderBreakdown, formatBytes } from "./helpers.js";
import { CSS } from "./styles.js";
import { CappedList, CodeGate, ProgressBar, Stat, TransferStats } from "./ui.jsx";

/* /file-drop/download — Patrick's side of File Drop, on his Mac in Chrome.
 *
 * Needs the ADMIN code (the upload code gets a 403 from every endpoint used
 * here). Lists what landed under s3://<bucket>/file-drop/, and gets it onto the
 * Mac three ways, most convenient first:
 *   1. showDirectoryPicker → write straight into a folder (Chrome/Edge only),
 *      skipping files already there at the same size, so it resumes.
 *   2. `aws s3 sync` — the AWS CLI on Patrick's Mac can read the bucket.
 *   3. A generated curl script with 12-hour links.
 * Downloading never deletes. Deleting is a separate, two-step action. */

const FILE_PAGE = 200;
const DEFAULT_PREFIX = "file-drop/";
/* "Clean up" aborts multipart uploads by when they STARTED (S3's Initiated),
 * not when a part last arrived — so it can't tell an abandoned upload from a
 * multi-GB file that's been resuming for days. A week, behind a confirm, and
 * worded so it's clear what it throws away. */
const CLEANUP_HOURS = 24 * 7;

export default function FileDropDownload() {
  useNoindex("File Drop — download");
  const [auth, setAuth] = useState(null); // { code, info }
  const [files, setFiles] = useState(null);
  const [loadMsg, setLoadMsg] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = async (code) => {
    setLoadError("");
    setLoadMsg("Loading the file list…");
    try {
      const all = await createApi(code).manifestAll((n) =>
        setLoadMsg(`Loading the file list… ${n.toLocaleString()} files`),
      );
      all.sort((a, b) => a.path.localeCompare(b.path));
      setFiles(all);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoadMsg("");
    }
  };

  const onAuthed = (a) => {
    setAuth(a);
    load(a.code);
  };

  return (
    <main className="fd-page">
      <style>{CSS}</style>
      <div className="fd-shell wide">
        <header style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.02em" }}>File Drop — download</h1>
          <p className="fd-note" style={{ fontSize: 15 }}>
            Everything sent from /file-drop. Downloading never deletes anything from S3.
          </p>
        </header>
        {!auth ? (
          <CodeGate
            storageKey={ADMIN_CODE_KEY}
            requireAdmin
            onAuthed={onAuthed}
            label="Download code"
            hint="Not the upload code — this one can read and delete."
          />
        ) : (
          <Browser
            auth={auth}
            files={files}
            loadMsg={loadMsg}
            loadError={loadError}
            onReload={() => load(auth.code)}
          />
        )}
      </div>
    </main>
  );
}

function Browser({ auth, files, loadMsg, loadError, onReload }) {
  const api = useMemo(() => createApi(auth.code), [auth.code]);
  const bucket = auth.info.bucket || "sheline-art-weddings";
  const prefix = auth.info.prefix || DEFAULT_PREFIX;
  const groups = useMemo(() => (files ? folderBreakdown(files) : []), [files]);
  const totalSize = useMemo(() => (files ? files.reduce((s, f) => s + f.size, 0) : 0), [files]);

  const [open, setOpen] = useState({}); // folder name → rows visible
  const [engine, setEngine] = useState(null);
  const [snap, setSnap] = useState(null);
  const [dlError, setDlError] = useState("");
  const [noPicker, setNoPicker] = useState(false);
  const [fileMsg, setFileMsg] = useState({}); // path → error text
  const [armed, setArmed] = useState(null); // { key, label, paths, size }
  const [deleting, setDeleting] = useState(null); // { done, total }
  const [deleteResult, setDeleteResult] = useState(null);
  const [cleanup, setCleanup] = useState(null); // { busy, text }
  const [cleanupArmed, setCleanupArmed] = useState(false);
  const [script, setScript] = useState(null); // { busy, text }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!engine) return undefined;
    return () => engine.dispose();
  }, [engine]);

  const downloading = snap?.status === "running";

  useEffect(() => {
    if (!downloading) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [downloading]);

  const startDownload = async (subset) => {
    setDlError("");
    if (typeof window.showDirectoryPicker !== "function") {
      setNoPicker(true);
      return;
    }
    let root;
    try {
      // Must be the first await in the click handler (needs the user gesture).
      root = await window.showDirectoryPicker({ mode: "readwrite", id: "file-drop" });
    } catch (err) {
      if (err.name !== "AbortError") setDlError(err.message);
      return;
    }
    const eng = new DownloadEngine({ api });
    eng.subscribe(setSnap);
    setEngine(eng);
    try {
      await eng.run(root, subset);
    } catch (err) {
      setDlError(err.message);
    }
  };

  const downloadOne = async (path) => {
    setFileMsg((m) => ({ ...m, [path]: "…" }));
    try {
      const res = await api.presignGet([path]);
      const row = res.files && res.files[0];
      if (!row || !row.url) throw new Error(row?.error || "No link returned");
      clickDownload(row.url);
      setFileMsg((m) => ({ ...m, [path]: "" }));
    } catch (err) {
      setFileMsg((m) => ({ ...m, [path]: err.message }));
    }
  };

  const syncCmd = `aws s3 sync "s3://${bucket}/${prefix}" ~/Downloads/file-drop`;

  const makeScript = async () => {
    if (!files || !files.length) return;
    setScript({ busy: true, text: "Signing links…" });
    try {
      const items = [];
      let errors = 0;
      for (const batch of chunk(files.map((f) => f.path), 500)) {
        const res = await api.presignGet(batch, 43200);
        for (const r of res.files || []) {
          if (r.url) items.push({ path: r.path, url: r.url });
          else errors++;
        }
        setScript({ busy: true, text: `Signing links… ${items.length.toLocaleString()} of ${files.length.toLocaleString()}` });
      }
      const body = buildCurlScript(items);
      downloadBlob(new Blob([body], { type: "text/x-shellscript" }), "file-drop-download.sh");
      setScript({
        busy: false,
        text: `Saved file-drop-download.sh with ${items.length.toLocaleString()} files${
          errors ? ` (${errors} couldn't be signed and are missing)` : ""
        }. Links expire in 12 hours.`,
      });
    } catch (err) {
      setScript({ busy: false, text: `Couldn't build the script: ${err.message}` });
    }
  };

  const doDelete = async () => {
    if (!armed) return;
    const target = armed;
    setArmed(null);
    setDeleteResult(null);
    setDeleting({ done: 0, total: target.paths.length });
    let deleted = 0;
    const errors = [];
    try {
      for (const batch of chunk(target.paths, 1000)) {
        const res = await api.deleteMany(batch);
        deleted += res.deleted || 0;
        for (const e of res.errors || []) errors.push(e);
        setDeleting({ done: deleted + errors.length, total: target.paths.length });
      }
      setDeleteResult({ ok: errors.length === 0, text: `Deleted ${deleted.toLocaleString()} files from ${target.label}.`, errors });
    } catch (err) {
      setDeleteResult({ ok: false, text: `Stopped after ${deleted.toLocaleString()} files: ${err.message}`, errors });
    } finally {
      setDeleting(null);
      onReload();
    }
  };

  const doCleanup = async () => {
    setCleanupArmed(false);
    setCleanup({ busy: true, text: "Looking for unfinished uploads…" });
    let aborted = 0;
    try {
      for (let i = 0; i < 20; i++) {
        const res = await api.cleanup(CLEANUP_HOURS);
        aborted += res.aborted || 0;
        if (!res.remaining) break;
      }
      setCleanup({
        busy: false,
        text: aborted
          ? `Threw away ${aborted} unfinished big-file upload(s) started more than 7 days ago.`
          : "No unfinished big-file uploads started more than 7 days ago.",
      });
    } catch (err) {
      setCleanup({ busy: false, text: `Cleanup failed after ${aborted} upload(s): ${err.message}` });
    }
  };

  const arm = (key, label, list) =>
    setArmed({ key, label, paths: list.map((f) => f.path), size: list.reduce((s, f) => s + f.size, 0) });

  const busy = downloading || Boolean(deleting);

  return (
    <>
      <section className="fd-card">
        <div className="fd-row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>What&apos;s there</h2>
          <button className="fd-btn quiet small" type="button" onClick={onReload} disabled={Boolean(loadMsg) || busy}>
            {loadMsg ? "Loading…" : "Refresh"}
          </button>
        </div>
        {loadMsg && <p className="fd-note">{loadMsg}</p>}
        {loadError && (
          <div className="fd-bad" style={{ marginTop: 10 }} role="alert">
            {loadError}
          </div>
        )}
        {files && (
          <div className="fd-stats" style={{ marginTop: 12 }}>
            <Stat value={files.length.toLocaleString()} label="files" />
            <Stat value={formatBytes(totalSize)} label="total" />
            <Stat value={groups.filter((g) => g.name).length.toLocaleString()} label="top-level folders" />
          </div>
        )}
        {files && files.length > 0 && (
          <>
            <div className="fd-row" style={{ marginTop: 14 }}>
              <button className="fd-btn big" type="button" onClick={() => startDownload(files)} disabled={busy}>
                Download everything to a folder on this Mac…
              </button>
            </div>
            <p className="fd-note">
              Files go into a &ldquo;{SUBFOLDER}&rdquo; folder inside the folder you pick (or straight
              into it, if the one you pick is already called {SUBFOLDER}). Nothing already on this Mac
              is overwritten.
            </p>
          </>
        )}
        {noPicker && (
          <div className="fd-warn" style={{ marginTop: 12 }}>
            This browser can&apos;t write into a folder (that needs Chrome or Edge on a desktop). Use
            one of the terminal options below instead.
          </div>
        )}
        {dlError && (
          <div className="fd-bad" style={{ marginTop: 12 }} role="alert">
            {dlError}
          </div>
        )}
        {deleteResult && (
          <div className={deleteResult.ok ? "fd-ok" : "fd-warn"} style={{ marginTop: 12 }}>
            {deleteResult.text}
            {deleteResult.errors.length > 0 && (
              <CappedList
                rows={deleteResult.errors}
                cap={50}
                render={(e, i) => (
                  <li key={i}>
                    <span className="fd-path">{e.path}</span>
                    <span>{e.error}</span>
                  </li>
                )}
              />
            )}
          </div>
        )}
      </section>

      {snap && <DownloadProgress snap={snap} onCancel={() => engine && engine.cancel()} />}

      {files && files.length > 0 && (
        <section className="fd-card">
          <h2>Folders</h2>
          {groups.map((g) => {
            const key = g.name ? `d:${g.name}` : "top"; // "*" is the delete-everything panel
            const visible = open[key] || 0;
            return (
              <div className="fd-folder" key={key}>
                <div className="fd-folder-head">
                  <button
                    type="button"
                    className="fd-folder-name"
                    aria-expanded={visible > 0}
                    onClick={() => setOpen((o) => ({ ...o, [key]: visible ? 0 : FILE_PAGE }))}
                  >
                    {visible ? "▾" : "▸"} {g.name ? `📁 ${g.name}` : "Loose files (top level)"}
                  </button>
                  <span className="fd-muted" style={{ whiteSpace: "nowrap" }}>
                    {g.count.toLocaleString()} files · {formatBytes(g.size)}
                  </span>
                  <span className="fd-row" style={{ gap: 6 }}>
                    <button className="fd-btn ghost small" type="button" disabled={busy} onClick={() => startDownload(g.files)}>
                      Download folder…
                    </button>
                    <button
                      className="fd-btn danger-ghost small"
                      type="button"
                      disabled={busy}
                      onClick={() => arm(key, g.name ? `“${g.name}”` : "the loose files", g.files)}
                    >
                      Delete…
                    </button>
                  </span>
                </div>
                {armed && armed.key === key && (
                  <DeleteConfirm armed={armed} onConfirm={doDelete} onCancel={() => setArmed(null)} />
                )}
                {visible > 0 && (
                  <ul className="fd-list" style={{ marginTop: 8 }}>
                    {g.files.slice(0, visible).map((f) => (
                      <li key={f.path} style={{ flexWrap: "wrap" }}>
                        <span className="fd-path" style={{ flex: "1 1 260px" }}>
                          {g.name ? f.path.slice(g.name.length + 1) : f.path}
                        </span>
                        <span className="fd-muted" style={{ whiteSpace: "nowrap" }}>
                          {formatBytes(f.size)}
                        </span>
                        <button className="fd-btn quiet small" type="button" onClick={() => downloadOne(f.path)}>
                          Download
                        </button>
                        {fileMsg[f.path] && fileMsg[f.path] !== "…" && (
                          <span style={{ flexBasis: "100%", color: "#a8321f", fontSize: 12.5 }}>{fileMsg[f.path]}</span>
                        )}
                      </li>
                    ))}
                    {g.files.length > visible && (
                      <li>
                        <button
                          className="fd-btn quiet small"
                          type="button"
                          onClick={() => setOpen((o) => ({ ...o, [key]: visible + FILE_PAGE }))}
                        >
                          Show {Math.min(FILE_PAGE, g.files.length - visible)} more of{" "}
                          {(g.files.length - visible).toLocaleString()} remaining
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section className="fd-card">
        <h2>From the terminal instead</h2>
        <p className="fd-note" style={{ marginTop: 0 }}>
          1. With the AWS CLI (the default profile on this Mac can read the bucket). Re-running only
          fetches what&apos;s new or changed:
        </p>
        <div className="fd-code" style={{ marginTop: 8 }}>{syncCmd}</div>
        <div className="fd-row" style={{ marginTop: 8 }}>
          <button
            className="fd-btn ghost small"
            type="button"
            onClick={async () => {
              const ok = await copyText(syncCmd);
              setCopied(ok);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied" : "Copy command"}
          </button>
        </div>
        <p className="fd-note" style={{ marginTop: 16 }}>
          2. Without AWS credentials: a bash script of curl commands. Its links expire in 12 hours.
          Run it with <code>bash file-drop-download.sh</code> (optionally followed by a destination
          folder — the default is ~/Downloads/file-drop). Safe to re-run.
        </p>
        <div className="fd-row" style={{ marginTop: 8 }}>
          <button
            className="fd-btn ghost small"
            type="button"
            onClick={makeScript}
            disabled={!files || !files.length || (script && script.busy)}
          >
            {script && script.busy ? "Building…" : "Download a curl script"}
          </button>
        </div>
        {script && <p className="fd-note">{script.text}</p>}
      </section>

      <section className="fd-card">
        <h2>Clean up</h2>
        <p className="fd-note" style={{ marginTop: 0 }}>
          Deleting removes files from S3 for good (the bucket has no versioning). Download first.
        </p>
        <div className="fd-row" style={{ marginTop: 10 }}>
          <button
            className="fd-btn danger-ghost"
            type="button"
            disabled={!files || !files.length || busy}
            onClick={() => arm("*", "everything in File Drop", files)}
          >
            Delete everything from S3…
          </button>
          <button
            className="fd-btn quiet"
            type="button"
            disabled={(cleanup && cleanup.busy) || cleanupArmed}
            onClick={() => setCleanupArmed(true)}
          >
            {cleanup && cleanup.busy ? "Cleaning…" : "Clean up unfinished uploads older than 7 days…"}
          </button>
        </div>
        {cleanupArmed && (
          <div className="fd-bad" style={{ marginTop: 10 }} role="alertdialog" aria-label="Confirm cleanup">
            This throws away the pieces already sent for every big-file upload that{" "}
            <strong>started more than 7 days ago</strong> and hasn&apos;t finished — including one
            that is still going or paused, which would then have to start that file over. Only do it
            when nothing is being uploaded any more. Finished files aren&apos;t touched.
            <div className="fd-row" style={{ marginTop: 10 }}>
              <button className="fd-btn danger small" type="button" onClick={doCleanup}>
                Yes, clean up
              </button>
              <button className="fd-btn quiet small" type="button" onClick={() => setCleanupArmed(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {armed && armed.key === "*" && (
          <DeleteConfirm armed={armed} onConfirm={doDelete} onCancel={() => setArmed(null)} />
        )}
        {deleting && (
          <div style={{ marginTop: 12 }}>
            <p className="fd-note">
              Deleting… {deleting.done.toLocaleString()} of {deleting.total.toLocaleString()}
            </p>
            <ProgressBar done={deleting.done} total={deleting.total} />
          </div>
        )}
        {cleanup && !cleanup.busy && <p className="fd-note">{cleanup.text}</p>}
      </section>
    </>
  );
}

/* Two steps, no window.confirm: "Delete…" arms this panel; the red button here
 * is the only thing that deletes. */
function DeleteConfirm({ armed, onConfirm, onCancel }) {
  return (
    <div className="fd-bad" style={{ marginTop: 10 }} role="alertdialog" aria-label="Confirm delete">
      Permanently delete <strong>{armed.paths.length.toLocaleString()} files</strong> (
      {formatBytes(armed.size)}) — {armed.label} — from S3? This can&apos;t be undone.
      <div className="fd-row" style={{ marginTop: 10 }}>
        <button className="fd-btn danger small" type="button" onClick={onConfirm}>
          Yes, delete {armed.paths.length.toLocaleString()} files
        </button>
        <button className="fd-btn quiet small" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function DownloadProgress({ snap, onCancel }) {
  const running = snap.status === "running";
  return (
    <section className="fd-card">
      <div className="fd-row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>
          {running
            ? snap.waiting
              ? "Waiting for the server…"
              : "Downloading…"
            : snap.status === "cancelled"
              ? "Download stopped"
              : snap.failedCount || snap.conflictCount
                ? "Download finished with problems"
                : "Download finished"}
        </h2>
        {running && (
          <button className="fd-btn quiet small" type="button" onClick={onCancel}>
            Stop
          </button>
        )}
      </div>
      {snap.savedInto && <p className="fd-note">Saving into {snap.savedInto}</p>}
      {snap.fatal && (
        <div className="fd-bad" style={{ marginTop: 10 }} role="alert">
          {snap.fatal}
        </div>
      )}
      {running && snap.waiting && (
        <div className="fd-warn" style={{ marginTop: 10 }} role="status">
          {snap.waiting.message} No file is marked failed while it waits; Stop ends it.
          {snap.waiting.detail && (
            <div className="fd-muted" style={{ color: "inherit", opacity: 0.8, marginTop: 6 }}>
              Details: {snap.waiting.detail}
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <ProgressBar done={snap.bytesDone} total={snap.bytesTotal} />
      </div>
      <TransferStats snap={snap} verb="saved" />
      {snap.skippedFiles > 0 && (
        <p className="fd-note">
          {snap.skippedFiles.toLocaleString()} file(s) were already in that folder at the same size and
          were skipped.
        </p>
      )}
      {!running && snap.status !== "idle" && (
        <p className="fd-note">Run it again into the same folder to resume or retry — finished files are skipped.</p>
      )}
      {snap.active.length > 0 && (
        <CappedList
          rows={snap.active}
          render={(a) => (
            <li key={a.path}>
              <span className="fd-path">{a.path}</span>
              <span className="fd-muted" style={{ whiteSpace: "nowrap" }}>
                {a.size ? `${Math.round((a.loaded / a.size) * 100)}%` : ""}
              </span>
            </li>
          )}
        />
      )}
      {snap.conflictCount > 0 && (
        <div className="fd-warn" style={{ marginTop: 12 }}>
          {snap.conflictCount.toLocaleString()} file(s) weren&apos;t saved because something different
          already has that name in the folder — nothing was overwritten. Move or rename those and run it
          again, or use the Download button next to each file:
          <CappedList
            rows={snap.conflicts}
            total={snap.conflictCount}
            render={(f, i) => (
              <li key={`${f.path}-${i}`} style={{ flexWrap: "wrap" }}>
                <span className="fd-path">{f.path}</span>
                <span>{f.error}</span>
              </li>
            )}
          />
        </div>
      )}
      {snap.failedCount > 0 && (
        <div className="fd-warn" style={{ marginTop: 12 }}>
          {snap.failedCount.toLocaleString()} file(s) failed:
          <CappedList
            rows={snap.failed}
            total={snap.failedCount}
            render={(f, i) => (
              <li key={`${f.path}-${i}`} style={{ flexWrap: "wrap" }}>
                <span className="fd-path">{f.path}</span>
                <span>{f.error}</span>
              </li>
            )}
          />
        </div>
      )}
    </section>
  );
}
