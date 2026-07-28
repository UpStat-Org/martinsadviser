// Spreadsheet parsing for the import dialogs.
//
// Replaces SheetJS/xlsx, which is pinned at 0.18.5 on the npm registry with an
// unpatched prototype-pollution advisory (GHSA-4r6h-8v6p-xvw6) and a ReDoS
// (GHSA-5pgg-2g8v-p4x9) — and these parsers run on a file the user uploads.
//
// Trade-off of the swap: exceljs does NOT read legacy .xls (BIFF). Callers
// surface UnsupportedLegacyXlsError so the user can be told to re-save as
// .xlsx, instead of getting a generic "couldn't read the file".

/** One spreadsheet row, keyed by header name. Missing cells become "". */
export type SheetRow = Record<string, string>;

export class UnsupportedLegacyXlsError extends Error {
  constructor() {
    super("Legacy .xls files are not supported — re-save as .xlsx or .csv");
    this.name = "UnsupportedLegacyXlsError";
  }
}

/**
 * Coerces an exceljs cell value to the flat string the import mappers expect.
 * exceljs hands back rich objects for formulas, hyperlinks and rich text, and
 * real Date objects for date-formatted cells (SheetJS used to yield opaque
 * serial numbers here, so dates actually import correctly now).
 */
function cellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    // ISO date — what a Postgres `date` column expects.
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("text" in v) return String(v.text ?? "");                       // hyperlink
    if ("result" in v) return String(v.result ?? "");                   // formula
    if ("richText" in v && Array.isArray(v.richText)) {
      return v.richText.map((r) => String((r as { text?: unknown }).text ?? "")).join("");
    }
    if ("error" in v) return "";                                        // #REF!, #N/A…
  }
  return String(value);
}

/**
 * Minimal RFC-4180 CSV parser: handles quoted fields, embedded commas and
 * newlines, and "" escaping. Kept in-house because exceljs's CSV path is built
 * on Node streams and doesn't run in the browser.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM — Excel writes one and it would poison the first header.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function rowsToObjects(matrix: string[][]): SheetRow[] {
  if (!matrix.length) return [];
  const headers = matrix[0].map((h) => h.trim());
  return matrix
    .slice(1)
    // Drop rows that are entirely empty — trailing blank lines are common.
    .filter((cells) => cells.some((c) => c.trim() !== ""))
    .map((cells) => {
      const obj: SheetRow = {};
      headers.forEach((h, i) => { if (h) obj[h] = cells[i] ?? ""; });
      return obj;
    });
}

/**
 * Reads the first worksheet of an .xlsx or .csv file into header-keyed rows.
 * Returns [] when the sheet has no data rows.
 *
 * @throws UnsupportedLegacyXlsError for .xls input.
 */
export async function parseSpreadsheet(file: File): Promise<SheetRow[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xls")) throw new UnsupportedLegacyXlsError();

  if (name.endsWith(".csv") || file.type === "text/csv") {
    return rowsToObjects(parseCsv(await file.text()));
  }

  // Vite resolves exceljs to its prebuilt UMD browser bundle (package "browser"
  // field), so the namespace object can carry Workbook either directly or under
  // .default. Vitest resolves the Node ESM build, which is the other shape —
  // hence the interop dance instead of `new ExcelJS.Workbook()`.
  const mod = (await import("exceljs")) as unknown as Record<string, unknown>;
  const Workbook = (mod.Workbook ?? (mod.default as Record<string, unknown> | undefined)?.Workbook) as
    | (new () => import("exceljs").Workbook)
    | undefined;
  if (!Workbook) throw new Error("exceljs failed to load");

  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const matrix: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    // `values` is 1-indexed in exceljs; slice(1) realigns it to column order.
    const values = (row.values as unknown[]).slice(1);
    // rowCount-based length so trailing empty cells still produce "" entries
    // and stay aligned with the header row.
    for (let c = 0; c < Math.max(values.length, sheet.columnCount); c++) {
      cells.push(cellToString(values[c]));
    }
    matrix.push(cells);
  });

  return rowsToObjects(matrix);
}
