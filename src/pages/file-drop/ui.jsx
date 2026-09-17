/* File Drop — components shared by the upload and download pages. */

import { useEffect, useState } from "react";

import { createApi } from "./api.js";
import { readSession, writeSession } from "./browser.js";
import { formatBytes, formatDuration } from "./helpers.js";

/** Code entry. Checks the code with POST /auth, keeps it in sessionStorage
 *  (never localStorage), and hands `{ code, info }` up. A code already in
 *  this tab's sessionStorage is re-checked automatically.
 *  `requireAdmin`: only the download code gets in. `refuseAdmin`: the download
 *  code is turned away (the upload page — it shouldn't live in that tab). */
export function CodeGate({ storageKey, requireAdmin = false, refuseAdmin = false, onAuthed, label, hint }) {
  const [stored] = useState(() => readSession(storageKey));
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(() => Boolean(stored));
  const [error, setError] = useState("");

  const check = (code) =>
    createApi(code)
      .auth()
      .then((info) => {
        if (requireAdmin && info.role !== "admin") {
          writeSession(storageKey, "");
          setBusy(false);
          setError("That's the upload code. This page needs the download code.");
          return;
        }
        if (refuseAdmin && info.role === "admin") {
          writeSession(storageKey, "");
          setBusy(false);
          setValue("");
          setError(
            "That's Patrick's download code — it isn't meant for this page. Ask Patrick for the upload code (and let him know, so he can change this one).",
          );
          return;
        }
        writeSession(storageKey, code);
        onAuthed({ code, info });
      })
      .catch((err) => {
        writeSession(storageKey, "");
        setBusy(false);
        setError(
          err.status === 401
            ? "That code isn't right — check it and try again."
            : err.status === 429
              ? "Too many wrong tries. Wait a few minutes, then try again."
              : err.message,
        );
      });

  useEffect(() => {
    if (stored) check(stored);
    // Once, on mount — `check` is recreated every render and must not re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const code = value.trim();
    if (!code) return;
    setBusy(true);
    setError("");
    check(code);
  };

  return (
    <form className="fd-card" onSubmit={submit}>
      <label htmlFor="fd-code" style={{ display: "block", fontWeight: 650, marginBottom: 8 }}>
        {label}
      </label>
      <div className="fd-row" style={{ flexWrap: "nowrap" }}>
        <input
          id="fd-code"
          className="fd-input"
          type="password"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
          placeholder="Code"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button className="fd-btn" type="submit" disabled={busy || !value.trim()}>
          {busy ? "Checking…" : "Continue"}
        </button>
      </div>
      {hint && <p className="fd-note">{hint}</p>}
      {error && (
        <div className="fd-bad" role="alert" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </form>
  );
}

export function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  return (
    <div
      className="fd-bar"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ value, label }) {
  return (
    <div className="fd-stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

/** The four numbers both progress panels show. */
export function TransferStats({ snap, verb = "uploaded" }) {
  return (
    <div className="fd-stats" style={{ marginTop: 12 }}>
      <Stat
        value={`${formatBytes(snap.bytesDone)}`}
        label={`of ${formatBytes(snap.bytesTotal)} ${verb}`}
      />
      <Stat
        value={`${snap.doneFiles.toLocaleString()}`}
        label={`of ${snap.totalFiles.toLocaleString()} files`}
      />
      <Stat
        value={snap.bytesPerSec > 0 ? `${(snap.bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s` : "—"}
        label="speed (last 10s)"
      />
      <Stat
        value={snap.etaSec != null ? formatDuration(snap.etaSec) : "—"}
        label="time left"
      />
    </div>
  );
}

/** Render at most `cap` rows and say how many more there are — never 40k DOM
 *  rows. `total` defaults to rows.length (pass it when rows is pre-capped). */
export function CappedList({ rows, total, cap = 200, render }) {
  const shown = rows.slice(0, cap);
  const n = total ?? rows.length;
  return (
    <ul className="fd-list">
      {shown.map(render)}
      {n > shown.length && (
        <li>
          <span className="fd-muted">+ {(n - shown.length).toLocaleString()} more</span>
        </li>
      )}
    </ul>
  );
}
