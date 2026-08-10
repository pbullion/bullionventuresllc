import { useState } from "react";
import { api } from "./api.js";
import Field from "./Field.jsx";
import { guessTarget, IMPORT_TARGETS, parseCsv } from "./ui.js";

/* Paste-a-spreadsheet import.
 *
 * Parsing happens in the browser (see parseCsv) so the mapping and the preview
 * are visible before anything is written, and a malformed file is fixed here
 * instead of by reading a server error. The commit runs twice: once with
 * dryRun so the summary is a promise the real run then keeps.
 *
 * Several rows with the same company name become ONE client with several
 * contacts, which is what a spreadsheet with a row per person means. */
export default function Importer({ onImported }) {
  const [step, setStep] = useState("paste"); // paste → map → done
  const [text, setText] = useState("");
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function parse() {
    setError("");
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      setError("Nothing to import — paste your rows above first.");
      return;
    }
    const width = Math.max(...parsed.map((r) => r.length));
    const first = parsed[0];
    // A header row is the norm, but guess: if no cell in row 1 looks like a
    // known column name, it's probably data.
    const looksLikeHeader = first.some((c) => guessTarget(c));
    setHasHeaderRow(looksLikeHeader);
    const heads = Array.from({ length: width }, (_, i) => (looksLikeHeader ? first[i] || `Column ${i + 1}` : `Column ${i + 1}`));
    setHeaders(heads);
    setMapping(heads.map((h) => (looksLikeHeader ? guessTarget(h) : "")));
    setRows(parsed);
    setPreview(null);
    setStep("map");
  }

  const dataRows = hasHeaderRow ? rows.slice(1) : rows;
  const mappedCompany = mapping.includes("company_name");

  // Turns the grid + mapping into the row objects the backend import expects.
  const buildPayload = () =>
    dataRows
      .map((r) => {
        const obj = {};
        mapping.forEach((target, i) => {
          if (target && r[i] !== undefined && r[i] !== "") obj[target] = r[i];
        });
        return obj;
      })
      .filter((o) => Object.keys(o).length > 0);

  async function run(dryRun) {
    setBusy(true);
    setError("");
    try {
      const payload = buildPayload();
      if (!payload.length) {
        setError("No rows to import once the mapping is applied.");
        return;
      }
      const summary = await api.post("/import", { rows: payload, dryRun });
      if (dryRun) {
        setPreview(summary);
      } else {
        setResult(summary);
        setStep("done");
        onImported();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep("paste");
    setText("");
    setRows([]);
    setHeaders([]);
    setMapping([]);
    setPreview(null);
    setResult(null);
    setError("");
  }

  if (step === "done") {
    return (
      <div className="ash-card">
        <div className="ash-h2">Import finished</div>
        <div className="ash-ok">
          Added {result.clientsCreated} new client{result.clientsCreated === 1 ? "" : "s"} and{" "}
          {result.contactsCreated} contact{result.contactsCreated === 1 ? "" : "s"}
          {result.clientsMatched > 0 && `, and added people to ${result.clientsMatched} existing client${result.clientsMatched === 1 ? "" : "s"}`}
          .
        </div>
        {result.skipped?.length > 0 && (
          <div className="ash-muted">
            Skipped {result.skipped.length} row{result.skipped.length === 1 ? "" : "s"} with no
            company name.
          </div>
        )}
        <button className="ash-btn ash-btn-ghost ash-btn-sm" style={{ marginTop: 10 }} onClick={reset}>
          Import another list
        </button>
      </div>
    );
  }

  return (
    <div className="ash-card">
      <div className="ash-h2">Import your client list</div>

      {error && <div className="ash-err">{error}</div>}

      {step === "paste" && (
        <>
          <div className="ash-muted" style={{ marginTop: -4, marginBottom: 10 }}>
            Copy the rows straight out of Excel or Google Sheets and paste them
            here — including the header row. One row per person is fine; rows
            sharing a company name are combined into one client.
          </div>
          <textarea
            className="ash-textarea"
            style={{ minHeight: 150, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }}
            placeholder={"Company,First name,Last name,Title,Email,Mobile,Loan balance\nAcme Metals,Dave,Ruiz,CFO,dave@acme.com,713-555-0111,2400000"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="ash-btn ash-btn-block" style={{ marginTop: 10 }} disabled={!text.trim()} onClick={parse}>
            Continue
          </button>
        </>
      )}

      {step === "map" && (
        <>
          <div className="ash-muted" style={{ marginTop: -4, marginBottom: 10 }}>
            {dataRows.length} row{dataRows.length === 1 ? "" : "s"} found. Check the
            columns below — most are matched for you.
          </div>

          <label className="ash-row" style={{ gap: 9, fontSize: 14, marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={hasHeaderRow}
              onChange={(e) => setHasHeaderRow(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            First row is a header
          </label>

          {headers.map((h, i) => (
            <Field
              key={i}
              label={
                <>
                  {h}
                  {dataRows[0]?.[i] ? (
                    <span style={{ fontWeight: 400, color: "#8794a1" }}> — e.g. &ldquo;{dataRows[0][i]}&rdquo;</span>
                  ) : null}
                </>
              }
            >
              <select
                className="ash-select"
                value={mapping[i] || ""}
                onChange={(e) => {
                  const next = [...mapping];
                  next[i] = e.target.value;
                  setMapping(next);
                  setPreview(null);
                }}
              >
                {IMPORT_TARGETS.map((t) => (
                  <option key={t.value || "skip"} value={t.value}>
                    {t.group ? `${t.group}: ${t.label}` : t.label}
                  </option>
                ))}
              </select>
            </Field>
          ))}

          {!mappedCompany && (
            <div className="ash-err">
              One column has to be mapped to <strong>Company name</strong> — it&rsquo;s
              what groups people into clients.
            </div>
          )}

          {preview && (
            <div className="ash-ok">
              This will add <strong>{preview.clientsCreated}</strong> new client
              {preview.clientsCreated === 1 ? "" : "s"} and{" "}
              <strong>{preview.contactsCreated}</strong> contact
              {preview.contactsCreated === 1 ? "" : "s"}
              {preview.clientsMatched > 0 && (
                <>, adding people to {preview.clientsMatched} client{preview.clientsMatched === 1 ? "" : "s"} you already have</>
              )}
              {preview.skipped?.length > 0 && (
                <>, and skip {preview.skipped.length} row{preview.skipped.length === 1 ? "" : "s"} with no company name</>
              )}
              . Nothing has been saved yet.
            </div>
          )}

          <div className="ash-row" style={{ gap: 8, marginTop: 4 }}>
            {!preview ? (
              <button className="ash-btn" disabled={busy || !mappedCompany} onClick={() => run(true)}>
                {busy ? "Checking…" : "Preview"}
              </button>
            ) : (
              <button className="ash-btn" disabled={busy} onClick={() => run(false)}>
                {busy ? "Importing…" : "Import for real"}
              </button>
            )}
            <button className="ash-btn ash-btn-ghost" onClick={reset}>Start over</button>
          </div>

          <div className="ash-divide" />
          <div className="ash-label">First few rows</div>
          <div className="ash-scroll-x">
            <table className="ash-table">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i}>{mapping[i] ? mapping[i].replace(/_/g, " ") : "(skipped)"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.slice(0, 5).map((r, ri) => (
                  <tr key={ri}>
                    {headers.map((_, ci) => (
                      <td key={ci} style={mapping[ci] ? undefined : { color: "#b3bcc5" }}>
                        {r[ci] || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
