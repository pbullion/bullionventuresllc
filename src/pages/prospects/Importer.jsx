import { useMemo, useState } from "react";
import { api } from "./api.js";
import { IMPORT_TARGETS, guessTarget, parseCsv } from "./ui.js";
import { Field } from "./Sheet.jsx";

/* Bring in a list she already has — a purchased prospect file, a chamber
 * directory, a spreadsheet of her own.
 *
 * Three steps, because a blind import of somebody else's column order is how a
 * list gets full of phone numbers in the ZIP field: paste or pick a file, check
 * the guessed column mapping against a real preview of her own rows, then
 * import.
 *
 * Matching on the server is by company NAME, punctuation- and suffix-insensitive
 * ("Bray International, Inc." finds "Bray International"), and an existing
 * company is UPDATED with only the columns her file actually carries. Her
 * pipeline — status, notes, follow-ups — is never importable, so no file can walk
 * her own work backwards. */
export default function Importer({ onClose, onImported }) {
  const [text, setText] = useState("");
  const [mapping, setMapping] = useState(null); // array, one target per column
  const [hasHeader, setHasHeader] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const rows = useMemo(() => (text.trim() ? parseCsv(text) : []), [text]);
  const headerRow = rows[0] || [];
  const bodyRows = hasHeader ? rows.slice(1) : rows;

  // Guess once, when the file first parses — re-guessing on every keystroke would
  // stomp a correction she just made.
  const startMapping = () => {
    const guessed = headerRow.map((h) => (hasHeader ? guessTarget(h) : ""));
    setMapping(guessed);
    setError("");
  };

  const nameColumn = mapping ? mapping.indexOf("name") : -1;

  const payload = () =>
    bodyRows
      .map((r) => {
        const obj = {};
        mapping.forEach((target, i) => {
          if (!target) return;
          const v = (r[i] ?? "").trim();
          if (v) obj[target] = v;
        });
        return obj;
      })
      .filter((o) => o.name);

  async function run() {
    if (busy) return;
    if (nameColumn === -1) {
      setError("One column has to be mapped to “Company name” — that's how rows are matched.");
      return;
    }
    const toSend = payload();
    if (!toSend.length) {
      setError("No rows have a company name in them.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/import", { rows: toSend });
      setReport(res.report);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (report) {
    return (
      <div className="pros-card">
        <div className="pros-ok">
          {report.created} added, {report.updated} updated, {report.contacts} contacts attached.
          {report.skipped ? ` ${report.skipped} row${report.skipped === 1 ? "" : "s"} skipped.` : ""}
        </div>
        {report.errors?.length > 0 && (
          <>
            <div className="pros-h2">What got skipped</div>
            <ul className="pros-tiny" style={{ lineHeight: 1.6, paddingLeft: 18 }}>
              {report.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </>
        )}
        <button className="pros-btn pros-btn-block" onClick={onImported}>
          Back to the list
        </button>
      </div>
    );
  }

  return (
    <>
      {error && <div className="pros-err">{error}</div>}

      {!mapping && (
        <div className="pros-card">
          <div className="pros-h2">1. Paste it in</div>
          <p className="pros-muted" style={{ marginTop: 0, lineHeight: 1.55 }}>
            Copy the rows straight out of Excel or Google Sheets, or pick a .csv. Tabs and commas
            both work.
          </p>
          <Field label="Rows">
            <textarea
              className="pros-textarea"
              style={{ minHeight: 150, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Company,City,Website,Revenue\nAcme Fabrication,Katy,acmefab.com,80000000"}
            />
          </Field>
          <div className="pros-row">
            <label className="pros-btn pros-btn-ghost pros-btn-sm" style={{ cursor: "pointer" }}>
              Choose a file
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setText(String(reader.result || ""));
                  reader.onerror = () => setError("Couldn't read that file.");
                  reader.readAsText(file);
                }}
              />
            </label>
            <label className="pros-row" style={{ gap: 8, fontSize: 14, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
              />
              First row is column names
            </label>
          </div>
          {rows.length > 0 && (
            <div className="pros-tiny" style={{ marginTop: 10 }}>
              Read {rows.length} row{rows.length === 1 ? "" : "s"}, {headerRow.length} column
              {headerRow.length === 1 ? "" : "s"}.
            </div>
          )}
          <div className="pros-row" style={{ marginTop: 13 }}>
            <button className="pros-btn" disabled={rows.length === 0} onClick={startMapping}>
              Next — check the columns
            </button>
            <button className="pros-btn pros-btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mapping && (
        <>
          <div className="pros-card">
            <div className="pros-h2">2. Check the columns</div>
            <p className="pros-muted" style={{ marginTop: 0, lineHeight: 1.55 }}>
              Guessed from your headers — fix anything wrong, and set the rest to skip.{" "}
              {nameColumn === -1 ? (
                <strong>One column must be the company name.</strong>
              ) : (
                <>
                  Matching on <strong>{headerRow[nameColumn] || `column ${nameColumn + 1}`}</strong>.
                </>
              )}
            </p>
            {headerRow.map((h, i) => (
              <Field
                key={i}
                label={hasHeader ? h || `Column ${i + 1}` : `Column ${i + 1}`}
                hint={
                  bodyRows[0]?.[i]
                    ? `e.g. ${String(bodyRows[0][i]).slice(0, 60)}`
                    : "no data in the first row"
                }
              >
                <select
                  className="pros-select"
                  value={mapping[i] || ""}
                  onChange={(e) =>
                    setMapping((m) => m.map((v, n) => (n === i ? e.target.value : v)))
                  }
                >
                  {IMPORT_TARGETS.map((t) => (
                    <option key={`${t.group || "x"}-${t.value}`} value={t.value}>
                      {t.group ? `${t.group}: ${t.label}` : t.label}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>

          <div className="pros-card">
            <div className="pros-h2">3. Preview</div>
            <p className="pros-muted" style={{ marginTop: 0 }}>
              First few rows, as they will be read.
            </p>
            <div className="pros-table-wrap">
              <table className="pros-table">
                <thead>
                  <tr>
                    {mapping.map((t, i) =>
                      t ? <th key={i}>{IMPORT_TARGETS.find((x) => x.value === t)?.label || t}</th> : null
                    )}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.slice(0, 6).map((r, ri) => (
                    <tr key={ri}>
                      {mapping.map((t, i) =>
                        t ? <td key={i}>{String(r[i] ?? "").slice(0, 40)}</td> : null
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pros-tiny" style={{ marginTop: 10, lineHeight: 1.5 }}>
              {payload().length} row{payload().length === 1 ? "" : "s"} will be imported. Names that
              already exist get their blank fields filled in — your statuses, notes and follow-ups
              are never touched.
            </div>
            <div className="pros-row" style={{ marginTop: 13 }}>
              <button className="pros-btn" disabled={busy} onClick={run}>
                {busy ? "Importing…" : `Import ${payload().length}`}
              </button>
              <button className="pros-btn pros-btn-ghost" onClick={() => setMapping(null)}>
                Back
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
