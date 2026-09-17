import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";

import { ADMIN_CODE_KEY, createApi, fetchBytes } from "./api.js";
import { clickDownload, downloadBlob, readSession, useNoindex, writeSession } from "./browser.js";
import { formatBytes } from "./helpers.js";
import {
  buildLibrary,
  extOf,
  kindInfo,
  kindOf,
  nativeMime,
  pathFromHash,
  previewOf,
  siblings,
  splitPath,
  viewHref,
} from "./library.js";
import { CSS } from "./styles.js";
import { CodeGate, ProgressBar } from "./ui.jsx";
import { VIEW_CSS } from "./viewStyles.js";

/* /file-drop/view — one file, opened from the browser at /file-drop/files.
 *
 * The path arrives in the URL FRAGMENT, never a query string: browsers don't
 * send a fragment, so Amplify's and Heroku's logs never see a file name. The
 * opener uses target="_blank" rel="opener" so sessionStorage — the code — is
 * copied into this tab; without it every file would ask for the code again.
 *
 * Two ways to show a file, and BOTH are first-class:
 *   1. An inline presigned link. The backend signs one for an allow-list of
 *      safe types with a forced Content-Type, so the browser streams the bytes
 *      straight from S3 (a 2 GB video costs no memory here).
 *   2. Fetch the bytes and build a Blob URL. This is what runs when the inline
 *      option isn't deployed yet, or the type isn't on that allow-list, and
 *      it is the only path for the lazy renderers (Word, spreadsheets, email,
 *      zip), which need the bytes anyway.
 *
 * Every path change re-signs, aborts whatever was in flight, and tags its
 * state with the file it belongs to, so a slow answer for the file you just
 * left can never paint over the one you are looking at. */

const NATIVE = { pdf: true, image: true, video: true, audio: true };
/* Bigger than this isn't fetched into memory at all — on a phone that is the
 * difference between "can't preview" and a killed tab. */
const MAX_PREVIEW_BYTES = 200 * 1024 * 1024;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const LINK_SECONDS = 3600;

/* The heavy viewers, each its own chunk: docx-preview, SheetJS, msgreader and
 * JSZip are megabytes between them and must never be in the main bundle. */
const DocxView = lazy(() => import("./viewers/DocxView.jsx"));
const SheetView = lazy(() => import("./viewers/SheetView.jsx"));
const EmailView = lazy(() => import("./viewers/EmailView.jsx"));
const ZipView = lazy(() => import("./viewers/ZipView.jsx"));

/* A Map, not an object: the key is an extension out of a file name, and
 * ADVICE["constructor"] on an object literal is a function, not advice. */
const ADVICE = new Map([
  ["doc", "Download it and open it in Word."],
  ["rtf", "Download it and open it in Word."],
  ["ppt", "Download it and open it in PowerPoint."],
  ["pptx", "Download it and open it in PowerPoint."],
  ["heic", "Download it — this is the iPhone photo format, which opens in Photos or Preview."],
  ["tif", "Download it and open it in Preview."],
  ["tiff", "Download it and open it in Preview."],
]);

function isAuthError(err) {
  return Boolean(err) && (err.status === 401 || err.status === 403);
}

function codeMessage(err) {
  if (err && err.status === 403) return "That code can't open files — use the same code you use to send them.";
  return "The code didn't work any more. Type it again to carry on.";
}

function friendlyError(err) {
  if (!err) return "Something went wrong.";
  if (err.s3Code === "NoSuchKey" || err.status === 404) return "This file isn't in File Drop any more.";
  if (err.status === 403) return "That link has expired. Try again.";
  return err.message || "Something went wrong.";
}

/* ".PDF files", for the card that says a type can't be shown. The kind label
 * ("Word document") reads oddly in that sentence; the extension is what she
 * sees in the name anyway. */
function kindPhrase(path) {
  const ext = extOf(path);
  return ext ? `.${ext.toUpperCase()} files` : "Files without a type";
}

function touchOnly() {
  try {
    return typeof window.matchMedia === "function" && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/* A text preview reads the first 2 MB and one byte more: S3 honours a Range
 * header on a presigned GET (Range isn't part of the signature), so a 40 MB
 * log costs 2 MB. That extra byte is how "there's more" is known without
 * having the file's size. */
function rangeFetch(limit) {
  return (url, init) => fetch(url, { ...init, headers: { Range: `bytes=0-${limit}` } });
}

function utf8(bytes) {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

/* Bytes → text for the <pre>. UTF-8 unless the BOM or a strict decode says
 * otherwise (an old Windows .txt is windows-1252); the last few bytes are left
 * out of that test when the file was cut, since a chopped character isn't
 * evidence of anything. */
function decodeText(buffer) {
  const all = new Uint8Array(buffer);
  const truncated = all.byteLength > MAX_TEXT_BYTES;
  const bytes = truncated ? all.subarray(0, MAX_TEXT_BYTES) : all;
  let label = "utf-8";
  if (bytes[0] === 0xff && bytes[1] === 0xfe) label = "utf-16le";
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) label = "utf-16be";
  else if (!utf8(truncated ? bytes.subarray(0, Math.max(0, bytes.length - 4)) : bytes)) label = "windows-1252";
  return { text: new TextDecoder(label).decode(bytes), truncated };
}

export default function FileDropView() {
  const [hash, setHash] = useState(() => window.location.hash);
  const path = pathFromHash(hash);
  const { folder, name } = splitPath(path);
  useNoindex(name || "Your files");

  const [code, setCode] = useState(() => readSession(ADMIN_CODE_KEY));
  const [gateNote, setGateNote] = useState("");
  const [manifest, setManifest] = useState(null); // { code, files } | { code, error }
  const [attempt, setAttempt] = useState(0); // "Try again" re-signs
  const [load, setLoad] = useState(null); // { key, status, … }
  const [dl, setDl] = useState(null); // { path, busy, error }
  const [touch] = useState(touchOnly);

  const api = useMemo(() => (code ? createApi(code) : null), [code]);
  const preview = previewOf(path);
  const loadKey = `${code}|${attempt}|${path}`;

  /* The code is normally inherited from the tab that opened this one. When it
   * has been rotated (or was never there) fall back to the gate instead of
   * hammering the backend's brute-force limiter with 401s. */
  const dropCode = useCallback((message) => {
    writeSession(ADMIN_CODE_KEY, "");
    setCode("");
    setGateNote(message);
  }, [setCode, setGateNote]);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /* The manifest is ONLY for Prev/Next and the size in the meta line. It
   * loads in the background and a failure costs those two things, nothing
   * else. */
  useEffect(() => {
    if (!api) return undefined;
    let live = true;
    api.manifestAll().then(
      (files) => {
        if (live) setManifest({ code, files });
      },
      (err) => {
        if (!live) return;
        if (isAuthError(err)) dropCode(codeMessage(err));
        else setManifest({ code, error: err.message });
      },
    );
    return () => {
      live = false;
    };
  }, [api, code, dropCode]);

  const lib = useMemo(
    () => (manifest && manifest.code === code && manifest.files ? buildLibrary(manifest.files) : null),
    [manifest, code],
  );
  const sib = useMemo(() => (lib && path ? siblings(lib, path) : null), [lib, path]);
  const entry = useMemo(() => {
    const home = lib && path ? lib.folders.get(folder) : null;
    return home ? home.files.find((f) => f.path === path) || null : null;
  }, [lib, folder, path]);

  useEffect(() => {
    if (!api || !path) return undefined;
    const kind = previewOf(path);
    if (kind === "none") return undefined;
    const controller = new AbortController();
    const text = kind === "text";
    let live = true;
    let objectUrl = "";
    let tooBig = 0;
    const set = (state) => {
      if (live) setLoad({ key: loadKey, ...state });
    };

    (async () => {
      let row;
      try {
        /* "inline" is ignored by a backend that doesn't have the option yet,
         * and answers `disposition: "attachment"` for a type that isn't on its
         * allow-list — both land in the fetch-it-ourselves path below. */
        const res = await api.presignGet(
          [path],
          LINK_SECONDS,
          NATIVE[kind] || text ? { disposition: "inline" } : undefined,
        );
        row = res && res.files && res.files[0];
      } catch (err) {
        if (isAuthError(err)) {
          if (live) dropCode(codeMessage(err));
          return;
        }
        throw err;
      }
      if (!live) return;
      if (!row || !row.url) {
        throw new Error((row && row.error) || "The server didn't send a link for this file.");
      }
      if (NATIVE[kind] && row.disposition === "inline") {
        set({ status: "ready", url: row.url, inline: true });
        return;
      }

      let buffer;
      let last = 0;
      try {
        buffer = await fetchBytes(row.url, {
          signal: controller.signal,
          fetchImpl: text ? rangeFetch(MAX_TEXT_BYTES) : undefined,
          onProgress: (loaded, total) => {
            if (!live) return;
            if (!text && Math.max(loaded, total) > MAX_PREVIEW_BYTES) {
              tooBig = Math.max(loaded, total);
              controller.abort();
              return;
            }
            const now = Date.now();
            if (loaded > 0 && loaded !== total && now - last < 120) return;
            last = now;
            set({ status: "loading", loaded, total });
          },
        });
      } catch (err) {
        if (tooBig) {
          set({ status: "too-big", size: tooBig });
          return;
        }
        /* An empty file and a Range request: S3 says "that range doesn't
         * exist" rather than sending nothing. */
        if (text && err.status === 416) {
          set({ status: "ready", text: "", truncated: false });
          return;
        }
        throw err;
      }
      if (!live) return;
      if (text) {
        set({ status: "ready", ...decodeText(buffer) });
        return;
      }
      if (NATIVE[kind]) {
        const blob = new Blob([buffer], { type: nativeMime(path) || "application/octet-stream" });
        objectUrl = URL.createObjectURL(blob);
        set({ status: "ready", url: objectUrl, inline: false, blob });
        return;
      }
      set({ status: "ready", bytes: buffer });
    })().catch((err) => {
      if (!live || (err && err.aborted)) return;
      set({ status: "error", error: friendlyError(err) });
    });

    return () => {
      live = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [api, path, loadKey, dropCode]);

  const state = load && load.key === loadKey ? load : { status: "signing" };
  const files = sib ? sib.files : [];
  const index = sib ? sib.index : -1;
  const prevPath = index > 0 ? files[index - 1].path : "";
  const nextPath = index >= 0 && index < files.length - 1 ? files[index + 1].path : "";

  const go = useCallback((dest) => {
    if (!dest) return;
    /* replaceState, not pushState: stepping through forty photos must not put
     * forty entries between this tab and wherever it came from. */
    window.history.replaceState(window.history.state, "", viewHref(dest));
    setHash(`#${encodeURIComponent(dest)}`);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!prevPath && !nextPath) return undefined;
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      /* One file per press. A held key fires dozens of repeats, which is a
       * presign POST each and enough history.replaceState calls to trip
       * Safari's rate limit and kill Prev/Next for half a minute. */
      if (e.repeat) return;
      /* Anything that wants the arrows for itself keeps them: a form field, a
       * media player's controls, and the boxes that scroll on their own (the
       * spreadsheet, a Word page at full size). */
      const el = e.target;
      if (
        el &&
        typeof el.closest === "function" &&
        el.closest('input, textarea, select, video, audio, .fd-scroll, [contenteditable=""], [contenteditable="true"]')
      ) {
        return;
      }
      const dest = e.key === "ArrowLeft" ? prevPath : nextPath;
      if (!dest) return;
      e.preventDefault();
      go(dest);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevPath, nextPath, go]);

  const dlNow = dl && dl.path === path ? dl : null;
  const download = async () => {
    if (!api || !path) return;
    const target = path;
    setDl({ path: target, busy: true, error: "" });
    try {
      /* The whole file is already here for anything a renderer showed, and for
       * a Blob-URL preview — don't pull it down Amazon's wire twice. */
      if (state.status === "ready" && state.bytes) {
        downloadBlob(new Blob([state.bytes], { type: "application/octet-stream" }), name);
      } else if (state.status === "ready" && state.blob) {
        downloadBlob(state.blob, name);
      } else {
        const res = await api.presignGet([target]);
        const row = res && res.files && res.files[0];
        if (!row || !row.url) throw new Error((row && row.error) || "The server didn't send a link.");
        clickDownload(row.url);
      }
      setDl({ path: target, busy: false, error: "" });
    } catch (err) {
      if (isAuthError(err)) {
        dropCode(codeMessage(err));
        return;
      }
      setDl({ path: target, busy: false, error: err.message });
    }
  };

  const downloadButton = (primary) => (
    <button
      className={primary ? "fd-btn" : "fd-btn quiet small"}
      type="button"
      onClick={download}
      disabled={!api || !path || Boolean(dlNow && dlNow.busy)}
    >
      {dlNow && dlNow.busy ? "Getting the file…" : "Download"}
    </button>
  );

  const card = (title, children) => (
    <div className="fd-vcenter">
      <section className="fd-card">
        {title && <h2 className="fd-vcard-title">{title}</h2>}
        {children}
      </section>
    </div>
  );

  const renderFailed = (error) =>
    card("Couldn't show this file", [
      <div className="fd-bad" role="alert" key="msg">
        {(error && error.message) || String(error)}
      </div>,
      <div className="fd-row" style={{ marginTop: 12 }} key="acts">
        <button className="fd-btn ghost" type="button" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
        {downloadButton(false)}
      </div>,
    ]);

  const rendered = (child) => (
    <div className="fd-vwrap">
      <PreviewBoundary key={loadKey} fallback={renderFailed}>
        <Suspense
          fallback={
            <p className="fd-note" role="status">
              Opening the viewer…
            </p>
          }
        >
          {child}
        </Suspense>
      </PreviewBoundary>
    </div>
  );

  let body;
  if (!path) {
    body = card("There's no file in that link", [
      <p className="fd-note" key="why">
        The address should end in <code>#</code> and the file&apos;s name, and this one doesn&apos;t — it may have
        been cut in half on its way here.
      </p>,
      <p className="fd-row" style={{ marginTop: 12 }} key="go">
        <a className="fd-btn" href="/file-drop/files">
          Go to your files
        </a>
      </p>,
    ]);
  } else if (!api) {
    body = (
      <div className="fd-vwrap" style={{ maxWidth: 520 }}>
        <CodeGate
          storageKey={ADMIN_CODE_KEY}
          requireAdmin
          onAuthed={(authed) => {
            setCode(authed.code);
            setGateNote("");
          }}
          label="Code"
          hint="The same code you use to send files."
        />
        {gateNote && <p className="fd-note">{gateNote}</p>}
      </div>
    );
  } else if (lib && !entry && (state.status !== "ready" || state.inline)) {
    /* The manifest came back and this path isn't in it. Said only when the
     * preview hasn't actually shown anything: a file uploaded since the list
     * was read would otherwise be called missing while it sits there on the
     * screen. `state.inline` is NOT such proof — presign-get signs a URL for
     * any well-formed path, existing or not, so "ready" there means a link
     * was minted, and the iframe would show S3's XML error instead. */
    body = card("This file isn't in File Drop any more", [
      <p className="fd-note" key="why">
        It isn&apos;t in the list of what&apos;s been sent. It may have been deleted, or the link may have been
        typed by hand.
      </p>,
      <p className="fd-row" style={{ marginTop: 12 }} key="go">
        <a className="fd-btn" href="/file-drop/files">
          Go to your files
        </a>
      </p>,
    ]);
  } else if (preview === "none") {
    body = card(`${kindPhrase(path)} can't be shown in the browser`, [
      <p className="fd-note" key="why">
        {ADVICE.get(extOf(path)) || "Download it and open it with whatever program made it."}
      </p>,
      <div className="fd-row" style={{ marginTop: 12 }} key="acts">
        {downloadButton(true)}
      </div>,
    ]);
  } else if (state.status === "signing") {
    body = card("", [
      <p className="fd-note" role="status" key="msg" style={{ marginTop: 0 }}>
        Getting a link for this file…
      </p>,
    ]);
  } else if (state.status === "loading") {
    body = card("", [
      <p className="fd-note" role="status" key="msg" style={{ margin: "0 0 10px" }}>
        {`Loading… ${formatBytes(state.loaded)}${state.total ? ` of ${formatBytes(state.total)}` : ""}`}
      </p>,
      <ProgressBar done={state.loaded} total={state.total || 0} key="bar" />,
    ]);
  } else if (state.status === "too-big") {
    body = card("This file is too big to preview here", [
      <p className="fd-note" key="why">
        It&apos;s {formatBytes(state.size)}, and showing it would mean holding all of it in this tab. Download it
        and open it on the computer instead.
      </p>,
      <div className="fd-row" style={{ marginTop: 12 }} key="acts">
        {downloadButton(true)}
      </div>,
    ]);
  } else if (state.status === "error") {
    body = card("Couldn't open this file", [
      <div className="fd-bad" role="alert" key="msg">
        {state.error}
      </div>,
      <div className="fd-row" style={{ marginTop: 12 }} key="acts">
        <button className="fd-btn ghost" type="button" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
        {downloadButton(false)}
      </div>,
    ]);
  } else if (preview === "pdf") {
    body = (
      <>
        {/* A phone will not page through a PDF in a frame — iOS shows page one
            and Android Chrome shows nothing — so on a touch screen there is
            always a way out of the frame. With an inline link that is a tab
            (the phone's own viewer); without one the bytes are already here,
            so it hands them to the phone instead. Never gate this on the
            backend having the inline option deployed: it is the only control
            that makes a PDF readable on her phone. */}
        {touch && (
          <div className="fd-row" style={{ marginBottom: 8 }}>
            {state.inline ? (
              <a className="fd-btn" href={state.url} target="_blank" rel="noopener noreferrer">
                Open PDF
              </a>
            ) : (
              <button className="fd-btn" type="button" onClick={download}>
                Open PDF
              </button>
            )}
            <span className="fd-vhint" style={{ margin: 0 }}>
              Your phone shows every page in its own viewer.
            </span>
          </div>
        )}
        <iframe className="fd-vframe" title={name} src={state.url} />
      </>
    );
  } else if (preview === "image") {
    body = <ImagePreview url={state.url} name={name} />;
  } else if (preview === "video" || preview === "audio") {
    body = (
      <MediaPreview
        kind={preview}
        url={state.url}
        name={name}
        onDownload={download}
        busy={Boolean(dlNow && dlNow.busy)}
      />
    );
  } else if (preview === "text") {
    body = (
      <div className="fd-vwrap">
        {state.truncated && (
          <p className="fd-vhint">This file is bigger than 2 MB — showing the first 2 MB of it.</p>
        )}
        {!state.text && !state.truncated ? (
          <p className="fd-note" style={{ marginTop: 0 }}>
            This file is empty.
          </p>
        ) : (
          <pre className="fd-vtext">{state.text}</pre>
        )}
      </div>
    );
  } else if (preview === "docx") {
    body = rendered(<DocxView bytes={state.bytes} name={name} path={path} />);
  } else if (preview === "sheet") {
    body = rendered(<SheetView bytes={state.bytes} name={name} path={path} />);
  } else if (preview === "zip") {
    body = rendered(<ZipView bytes={state.bytes} name={name} path={path} />);
  } else {
    body = rendered(<EmailView bytes={state.bytes} name={name} path={path} />);
  }

  const fits = Boolean(NATIVE[preview] && state.status === "ready" && state.url);
  const navNote =
    manifest && manifest.error
      ? "The list of the other files didn't load, so stepping through the folder isn't available."
      : "";
  const meta = !path
    ? ""
    : [kindInfo(kindOf(path)).label, entry ? formatBytes(entry.size) : "", folder || "All files"]
        .filter(Boolean)
        .join(" · ");

  return (
    <main className={`fd-page fd-view${fits ? " fixed" : ""}`}>
      <style>{CSS + VIEW_CSS}</style>
      <header className="fd-vbar fd-vgutter">
        <div className="fd-vbar-in">
          <div className="fd-vhead">
            <a className="fd-vback" href="/file-drop/files">
              ← All files
            </a>
            <h1 className="fd-vtitle">{name || "No file"}</h1>
            {meta && <p className="fd-vmeta">{meta}</p>}
          </div>
          {navNote && (
            <p className="fd-vhint fd-vnote" role="status">
              {navNote}
            </p>
          )}
          <div className="fd-vactions">
            <button
              className="fd-btn quiet small"
              type="button"
              onClick={() => go(prevPath)}
              disabled={!prevPath}
              title={navNote || "The file before this one in the same folder"}
            >
              ← Prev
            </button>
            {index >= 0 && (
              <span className="fd-vpos">
                {index + 1} of {files.length}
              </span>
            )}
            <button
              className="fd-btn quiet small"
              type="button"
              onClick={() => go(nextPath)}
              disabled={!nextPath}
              title={navNote || "The next file in the same folder"}
            >
              Next →
            </button>
            {fits && state.inline && (
              <a className="fd-btn ghost small" href={state.url} target="_blank" rel="noopener noreferrer">
                Open full screen
              </a>
            )}
            {path && downloadButton(false)}
          </div>
        </div>
        {dlNow && dlNow.error && (
          <div className="fd-bad" role="alert" style={{ marginTop: 8 }}>
            {dlNow.error}
          </div>
        )}
      </header>
      <div className="fd-vbody fd-vgutter">{body}</div>
    </main>
  );
}

/* Video and audio: the one thing a bare <video> does badly is fail. A codec
 * the browser can't decode (an old .avi, .wmv) shows a dead player with no
 * message, so the element's own error event gets a card with Download. */
function MediaPreview({ kind, url, name, onDownload, busy }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="fd-vcenter">
        <section className="fd-card">
          <h2 className="fd-vcard-title">
            This browser can&apos;t play {kind === "video" ? "this video" : "this audio"}
          </h2>
          <p className="fd-note" style={{ marginTop: 0 }}>
            It doesn&apos;t understand the format. Download it and open it on the computer instead.
          </p>
          <div className="fd-row" style={{ marginTop: 12 }}>
            <button className="fd-btn" type="button" onClick={onDownload} disabled={busy}>
              {busy ? "Getting the file…" : "Download"}
            </button>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="fd-vmedia">
      {kind === "video" ? (
        <video src={url} title={name} controls preload="metadata" playsInline onError={() => setFailed(true)} />
      ) : (
        <audio src={url} title={name} controls preload="metadata" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

function ImagePreview({ url, name }) {
  const [actual, setActual] = useState(false);
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="fd-vcenter">
        <section className="fd-card">
          <h2 className="fd-vcard-title">This photo couldn&apos;t be shown</h2>
          <p className="fd-note" style={{ marginTop: 0 }}>
            The browser wouldn&apos;t open it — use Download to save it instead.
          </p>
        </section>
      </div>
    );
  }
  return (
    <div className={`fd-vimg${actual ? " actual fd-scroll" : ""}`}>
      <button
        className="fd-vimg-btn"
        type="button"
        aria-pressed={actual}
        title={actual ? "Fit to the screen" : "Show it at full size"}
        onClick={() => setActual((a) => !a)}
      >
        <img src={url} alt={name} onError={() => setBroken(true)} decoding="async" />
      </button>
    </div>
  );
}

/* A renderer that throws — a corrupt zip, an encrypted workbook, an email
 * nothing can make sense of — costs its own card, not the page. React's
 * default is to unmount everything, which would take the top bar (and Prev,
 * Next and Download) with it. */
class PreviewBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}
