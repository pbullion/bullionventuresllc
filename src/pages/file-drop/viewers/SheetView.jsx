import { useMemo, useState } from "react";

import { MAX_COLS, MAX_ROWS, readWorkbook, sheetList, sheetTable } from "./sheetParse.js";

/* Spreadsheets and CSVs (its own chunk — SheetJS is ~1 MB).
 *
 * Every cell is rendered by REACT, from sheet_to_json, never SheetJS's
 * sheet_to_html: a workbook is somebody else's file, and React escapes text
 * where a pasted HTML string would not. Cells are the formatted strings Excel
 * shows (raw: false), so a date is a date and a total keeps its currency.
 *
 * The table lives in its own scroll box with a sticky header row and sticky
 * row numbers, and is capped at 2,000 rows × 60 columns — a 60,000-row export
 * would otherwise put a million cells in the DOM and take the tab down. The
 * note says what is being held back. */

export default function SheetView({ bytes }) {
  const wb = useMemo(() => readWorkbook(bytes), [bytes]);
  const sheets = useMemo(() => sheetList(wb), [wb]);
  const [active, setActive] = useState(0);
  const sheet = sheets[Math.min(active, sheets.length - 1)];
  const table = useMemo(() => (sheet ? sheetTable(wb.Sheets[sheet.name]) : null), [wb, sheet]);

  if (!sheet || !table) {
    return (
      <p className="fd-note" style={{ marginTop: 0 }}>
        There are no sheets in this file.
      </p>
    );
  }
  const emptySheet = table.columns.length === 0;

  const capped = [];
  if (table.moreRows) {
    capped.push(
      table.totalRows
        ? `the first ${MAX_ROWS.toLocaleString()} of ${table.totalRows.toLocaleString()} rows`
        : `the first ${MAX_ROWS.toLocaleString()} rows`,
    );
  }
  if (table.moreCols) capped.push(`the first ${MAX_COLS} of ${table.totalCols.toLocaleString()} columns`);

  return (
    <div>
      {sheets.length > 1 && (
        <div className="fd-sheet-tabs fd-scroll" role="group" aria-label="Sheets">
          {sheets.map((s, i) => (
            <button
              className="fd-vtoggle"
              type="button"
              key={s.name}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
            >
              {s.name}
              {s.hidden ? " (hidden)" : ""}
            </button>
          ))}
        </div>
      )}
      <p className="fd-vhint">
        {emptySheet
          ? "There's nothing in this sheet."
          : capped.length
            ? `Showing ${capped.join(" and ")}. Download the file to see all of it.`
            : `${table.rows.length.toLocaleString()} row${table.rows.length === 1 ? "" : "s"} · ${
                table.columns.length
              } column${table.columns.length === 1 ? "" : "s"}`}
      </p>
      {!emptySheet && (
      <div className="fd-sheet-box fd-scroll" tabIndex={0} role="group" aria-label={`${sheet.name} contents`}>
        <table className="fd-sheet">
          <thead>
            <tr>
              <th scope="col" aria-label="Row" />
              {table.columns.map((col) => (
                <th scope="col" key={col}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.n}>
                <th scope="row">{row.n}</th>
                {row.cells.map((cell, c) => (
                  <td key={table.columns[c] || c} title={cell.length > 40 ? cell : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      {!emptySheet && !table.rows.length && <p className="fd-note">Every row in this sheet is blank.</p>}
    </div>
  );
}
