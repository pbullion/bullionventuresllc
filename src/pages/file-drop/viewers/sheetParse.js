/* File Drop viewer — spreadsheet reading behind SheetView.jsx. No DOM, so the
 * same code runs under node against real files (counts only). Imported ONLY
 * by the lazy viewer chunk: SheetJS is ~1 MB and must stay out of the main
 * bundle.
 *
 * SheetJS comes from its own CDN tarball (package.json), not the npm registry,
 * whose `xlsx` stopped at a vulnerable 0.18.x. */

import * as XLSX from "xlsx";

export const MAX_ROWS = 2000;
export const MAX_COLS = 60;

/** Workbook bytes (xlsx/xls/xlsm/xlsb/ods/csv) → a SheetJS workbook. Only the
 *  first MAX_ROWS rows of each sheet are parsed; `!fullref` keeps the real
 *  extent so the page can say how much it isn't showing. Throws on a file
 *  SheetJS can't read (an encrypted workbook says so in its message). */
export function readWorkbook(bytes) {
  /* MAX_ROWS + 1: one row past what is shown, so a file with more is known to
   * have more. `!fullref` (SheetJS's record of the real extent when it stops
   * early) is only written for the spreadsheet formats — a CSV read with
   * `sheetRows` reports its TRUNCATED extent as the whole sheet, and the page
   * would have said "2,000 rows" about a 5,000-row export without a word.
   * That extra parsed row is the evidence instead, for every format. */
  return XLSX.read(bytes, {
    type: "array",
    cellDates: true,
    dense: true,
    sheetRows: MAX_ROWS + 1,
  });
}

/** → [{ name, hidden }] in workbook order. */
export function sheetList(wb) {
  const meta = (wb.Workbook && wb.Workbook.Sheets) || [];
  return wb.SheetNames.map((name, i) => ({ name, hidden: Boolean(meta[i] && meta[i].Hidden) }));
}

/** One worksheet → what the table renders:
 *  { columns: ["A", "B", …], rows: [{ n: 1-based sheet row, cells: string[] }],
 *    totalRows, totalCols, moreRows, moreCols }
 *  Cells are formatted text (raw: false), so dates and currency read the way
 *  Excel shows them. Blank rows are dropped and `n` is each row's real number
 *  in the sheet. React renders every cell as text — never sheet_to_html. */
export function sheetTable(ws) {
  const empty = { columns: [], rows: [], totalRows: 0, totalCols: 0, moreRows: false, moreCols: false };
  const ref = ws && ws["!ref"];
  if (!ref) return empty;
  const range = XLSX.utils.decode_range(ref);
  const full = ws["!fullref"] ? XLSX.utils.decode_range(ws["!fullref"]) : range;
  const lastCol = Math.min(range.e.c, range.s.c + MAX_COLS - 1);
  const lastRow = Math.min(range.e.r, range.s.r + MAX_ROWS - 1);
  /* blankrows: TRUE, then blank rows are dropped here, because that is the
   * only way to keep each row's real number. SheetJS's `__rowNum__` is not
   * set for `header: 1` (checked against 0.20.3), so with blankrows: false
   * the row numbers would silently become positions and drift away from the
   * sheet's own numbering wherever a spacer row was skipped. */
  const raw = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: true,
    range: { s: range.s, e: { r: lastRow, c: lastCol } },
  });
  const width = lastCol - range.s.c + 1;
  const columns = [];
  for (let c = 0; c < width; c++) columns.push(XLSX.utils.encode_col(range.s.c + c));
  const rows = [];
  for (let i = 0; i < raw.length; i++) {
    const cells = [];
    let filled = false;
    for (let c = 0; c < width; c++) {
      const v = raw[i] ? raw[i][c] : "";
      const text = v == null ? "" : String(v);
      if (text !== "") filled = true;
      cells.push(text);
    }
    if (filled) rows.push({ n: range.s.r + i + 1, cells });
  }
  /* Two ways to know there is more: `!fullref` (the spreadsheet formats say so
   * outright) or the one row past the cap that readWorkbook parses on purpose
   * — which is all a truncated CSV gives. When only the extra row says so, the
   * real total isn't knowable, so `totalRows` is null and the page says "the
   * first 2,000 rows" without claiming a total it doesn't have. */
  const knownRows = full.e.r > range.e.r ? full.e.r + 1 : null;
  const moreRows = full.e.r > lastRow || range.e.r > lastRow;
  return {
    columns,
    rows,
    totalRows: knownRows || (moreRows ? null : full.e.r + 1),
    totalCols: full.e.c + 1,
    moreRows,
    moreCols: full.e.c > lastCol,
  };
}
