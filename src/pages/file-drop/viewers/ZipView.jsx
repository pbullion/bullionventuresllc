import { useDeferredValue, useEffect, useState } from "react";

import { formatBytes } from "../helpers.js";
import { normalize } from "../library.js";
import { openLater, safeName, saveBytes } from "./blobs.js";
import { entryBytes, readZip } from "./zipParse.js";

/* What's inside a .zip (its own chunk — JSZip).
 *
 * Listing reads the zip's directory only; an entry is inflated when Open or
 * Download is pressed, and nothing is ever written anywhere. Open is limited
 * to types a browser shows safely (PDF, pictures, plain text) with the type
 * forced, so a zipped .html can't run on this origin — it downloads instead.
 *
 * Rendering is capped at 500 rows. A zip with 20,000 entries is a list nobody
 * reads, and the filter is the way through it. */

const RENDER_CAP = 500;
const FILTER_FROM = 30;
const OPENABLE = { pdf: true, image: true, text: true };

export default function ZipView({ bytes }) {
  const [state, setState] = useState({ status: "reading" });
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);

  useEffect(() => {
    let live = true;
    readZip(bytes).then(
      (zip) => {
        if (live) setState({ status: "ready", ...zip });
      },
      (err) => {
        if (live) setState({ status: "failed", error: err });
      },
    );
    return () => {
      live = false;
    };
  }, [bytes]);

  /* A zip JSZip refuses (encrypted, or not really a zip) goes to the viewer's
   * error boundary, which offers Download — the same card as every other
   * renderer's failure. */
  if (state.status === "failed") throw state.error;
  if (state.status === "reading") {
    return (
      <p className="fd-note" role="status" style={{ marginTop: 0 }}>
        Reading what&apos;s in the zip…
      </p>
    );
  }

  const tokens = normalize(deferred).split(" ").filter(Boolean);
  const matches = tokens.length
    ? state.entries.filter((e) => {
        const hay = normalize(e.path);
        const squash = hay.replace(/ /g, "");
        return tokens.every((t) => hay.includes(t) || squash.includes(t));
      })
    : state.entries;
  const shown = matches.slice(0, RENDER_CAP);
  const total = state.entries.reduce((sum, e) => sum + (e.size || 0), 0);

  let folder = null;
  const rows = [];
  for (const entry of shown) {
    if (entry.folder !== folder) {
      folder = entry.folder;
      rows.push(
        <li className="fd-zip-folder" key={`f:${rows.length}:${folder}`}>
          📁 {folder || "(top level)"}
        </li>,
      );
    }
    rows.push(<Row entry={entry} key={entry.path} />);
  }

  return (
    <div className="fd-card">
      <h2>
        {state.entries.length.toLocaleString()} file{state.entries.length === 1 ? "" : "s"} inside
      </h2>
      <p className="fd-vhint">
        {formatBytes(total)} unpacked
        {state.folders ? ` · ${state.folders.toLocaleString()} folder${state.folders === 1 ? "" : "s"}` : ""}
        {state.clutter ? ` · ${state.clutter.toLocaleString()} system file${state.clutter === 1 ? "" : "s"} hidden` : ""}
      </p>
      {state.entries.length >= FILTER_FROM && (
        <div className="fd-row" style={{ marginBottom: 10 }}>
          <label htmlFor="fd-zip-filter" className="fd-muted">
            Filter
          </label>
          <input
            id="fd-zip-filter"
            className="fd-input"
            type="search"
            placeholder="Part of a name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: "1 1 180px", minWidth: 0 }}
          />
        </div>
      )}
      {matches.length === 0 ? (
        <p className="fd-note">Nothing in the zip matches that.</p>
      ) : (
        <ul className="fd-vlist">{rows}</ul>
      )}
      {matches.length > shown.length && (
        <p className="fd-note">
          + {(matches.length - shown.length).toLocaleString()} more — use the filter to narrow it down, or download
          the zip.
        </p>
      )}
    </div>
  );
}

function Row({ entry }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const act = (what, run) => {
    setBusy(what);
    setError("");
    run().then(
      () => setBusy(""),
      (err) => {
        setBusy("");
        setError(err.message || "Couldn't unpack that file.");
      },
    );
  };
  return (
    <li className="fd-vrow">
      <span className="fd-vrow-name">{entry.name}</span>
      {entry.size !== null && <span className="fd-vrow-size">{formatBytes(entry.size)}</span>}
      <span className="fd-vrow-acts">
        {OPENABLE[entry.preview] && (
          <button
            className="fd-btn ghost small"
            type="button"
            disabled={Boolean(busy)}
            onClick={() => act("open", () => openLater(() => entryBytes(entry), entry.name))}
          >
            {busy === "open" ? "Opening…" : "Open"}
          </button>
        )}
        <button
          className="fd-btn quiet small"
          type="button"
          disabled={Boolean(busy)}
          onClick={() =>
            act("save", () => entryBytes(entry).then((data) => saveBytes(data, safeName(entry.name))))
          }
        >
          {busy === "save" ? "Saving…" : "Download"}
        </button>
      </span>
      {error && <span className="fd-vrow-err">{error}</span>}
    </li>
  );
}
