import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { parseSpreadsheet, UnsupportedLegacyXlsError } from "../spreadsheet";

/** Builds a File the way the browser hands one to the import dialogs. */
function csvFile(text: string, name = "clients.csv"): File {
  return new File([text], name, { type: "text/csv" });
}

async function xlsxFile(
  build: (sheet: ExcelJS.Worksheet) => void,
  name = "clients.xlsx",
): Promise<File> {
  const wb = new ExcelJS.Workbook();
  build(wb.addWorksheet("Sheet1"));
  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("parseSpreadsheet — CSV", () => {
  it("maps rows onto the header row", async () => {
    const rows = await parseSpreadsheet(csvFile("name,dot\nAcme,123\nBeta,456\n"));
    expect(rows).toEqual([
      { name: "Acme", dot: "123" },
      { name: "Beta", dot: "456" },
    ]);
  });

  it("honours quoted fields containing commas, quotes and newlines", async () => {
    const rows = await parseSpreadsheet(
      csvFile('name,address\n"Acme, Inc.","1 Main St\nSuite 2"\n"He said ""hi""",x\n'),
    );
    expect(rows[0]).toEqual({ name: "Acme, Inc.", address: "1 Main St\nSuite 2" });
    expect(rows[1].name).toBe('He said "hi"');
  });

  it("fills missing trailing cells with empty strings", async () => {
    const rows = await parseSpreadsheet(csvFile("name,dot,mc\nAcme,123\n"));
    expect(rows[0]).toEqual({ name: "Acme", dot: "123", mc: "" });
  });

  it("drops fully blank rows and strips the BOM", async () => {
    const rows = await parseSpreadsheet(csvFile("﻿name,dot\nAcme,1\n\n,\n"));
    expect(rows).toEqual([{ name: "Acme", dot: "1" }]);
  });

  it("returns [] for an empty file", async () => {
    expect(await parseSpreadsheet(csvFile(""))).toEqual([]);
  });

  it("returns [] when there are headers but no data rows", async () => {
    expect(await parseSpreadsheet(csvFile("name,dot\n"))).toEqual([]);
  });
});

describe("parseSpreadsheet — XLSX", () => {
  it("reads the first worksheet into header-keyed rows", async () => {
    const rows = await parseSpreadsheet(
      await xlsxFile((s) => {
        s.addRow(["company_name", "dot"]);
        s.addRow(["Acme", 123]);
        s.addRow(["Beta", 456]);
      }),
    );
    expect(rows).toEqual([
      { company_name: "Acme", dot: "123" },
      { company_name: "Beta", dot: "456" },
    ]);
  });

  it("formats date cells as ISO, which is what the date columns expect", async () => {
    const rows = await parseSpreadsheet(
      await xlsxFile((s) => {
        s.addRow(["permit_type", "expiration_date"]);
        s.addRow(["IFTA", new Date(2027, 2, 15)]);
      }),
    );
    // Not an Excel serial number — that's what the old SheetJS path produced.
    expect(rows[0].expiration_date).toBe("2027-03-15");
  });

  it("flattens formula and hyperlink cells to their visible text", async () => {
    const rows = await parseSpreadsheet(
      await xlsxFile((s) => {
        s.addRow(["a", "b"]);
        const row = s.addRow([null, null]);
        row.getCell(1).value = { formula: "1+1", result: 2 } as ExcelJS.CellFormulaValue;
        row.getCell(2).value = { text: "site", hyperlink: "https://example.com" };
      }),
    );
    expect(rows[0]).toEqual({ a: "2", b: "site" });
  });

  it("trims header whitespace so column auto-detection matches", async () => {
    const rows = await parseSpreadsheet(
      await xlsxFile((s) => {
        s.addRow(["  company_name  ", " dot "]);
        s.addRow(["Acme", "1"]);
      }),
    );
    expect(Object.keys(rows[0])).toEqual(["company_name", "dot"]);
  });
});

describe("parseSpreadsheet — legacy .xls", () => {
  it("throws a typed error so the dialog can tell the user to re-save", async () => {
    const file = new File(["whatever"], "old.xls", { type: "application/vnd.ms-excel" });
    await expect(parseSpreadsheet(file)).rejects.toBeInstanceOf(UnsupportedLegacyXlsError);
  });
});
