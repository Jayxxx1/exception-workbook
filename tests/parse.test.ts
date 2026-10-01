import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { compareSheets } from "../src/compare";
import { messageOf } from "../src/errors";
import { MAX_DATA_ROWS, MAX_FILE_BYTES } from "../src/limits";
import { parseSpreadsheet } from "../src/parseSheet";
import { parseAoa } from "./helpers";

describe("parse", () => {
  it("compares a CSV file", () => {
    const left = parseSpreadsheet(
      "a.csv",
      new TextEncoder().encode('reference,amount,date\nINV-1,"฿1,000.00",2026-01-02\nINV-2,500,2026-01-02\n"INV 3",250,2026-01-02\n'),
      "File A",
    );
    const right = parseSpreadsheet(
      "b.csv",
      new TextEncoder().encode("reference,amount\ninv-1,1000\nINV-2,450\nINV-4,10\n"),
      "File B",
    );
    const result = compareSheets({
      fileA: left,
      fileB: right,
      referenceA: "reference",
      amountA: "amount",
      dateA: "date",
      referenceB: "reference",
      amountB: "amount",
      dateB: null,
      dateMatching: false,
    });
    expect(result.matched.map((row) => row.referenceA)).toEqual(["INV-1"]);
    expect(result.exceptions[0].status).toBe("AMOUNT_MISMATCH");
    expect(result.exceptions[0].differenceMinor).toBe(50n * 10000n);
    expect(result.onlyA.map((row) => row.referenceA)).toEqual(["INV 3"]);
    expect(result.onlyB.map((row) => row.referenceB)).toEqual(["INV-4"]);
  });

  it("reads an xlsx workbook", () => {
    const left = parseAoa([["reference", "amount"], [1001, 10]], "a.xlsx");
    const rightSheet = XLSX.utils.aoa_to_sheet([["reference", "amount"], ["1001", "10.00"]]);
    rightSheet.A2 = { t: "s", v: "1001" };
    rightSheet.B2 = { t: "s", v: "10.00" };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, rightSheet, "Sheet1");
    const written = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const right = parseSpreadsheet("b.xlsx", written instanceof Uint8Array ? written : new Uint8Array(written as ArrayBuffer), "File B");
    const result = compareSheets({
      fileA: left,
      fileB: right,
      referenceA: "reference",
      amountA: "amount",
      dateA: null,
      referenceB: "reference",
      amountB: "amount",
      dateB: null,
      dateMatching: false,
    });
    expect(result.matched).toHaveLength(1);
    expect(right.rows[0].cells.amount.raw).toBe("10.00");
  });

  it("reads an xls workbook", () => {
    const parsed = parseAoa([["reference", "amount"], ["INV-7", 42]], "legacy.xls", "xls");
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].cells.reference.display).toBe("INV-7");
    expect(parsed.rows[0].cells.amount.raw).toBe(42);
  });

  it("rejects an empty file", () => {
    expect(() => parseAoa([["reference", "amount"]], "empty.xlsx")).toThrow(/no data rows/);
  });

  it("rejects duplicate headers", () => {
    expect(() => parseAoa([["Amount", "Amount"], [1, 2]], "dup.xlsx")).toThrow(/two columns named/);
  });

  it("rejects a missing header when the column has data", () => {
    expect(() => parseAoa([["reference", "", "amount"], ["A", "x", 1]], "gap.xlsx")).toThrow(/missing a header in column B/);
  });

  it("skips blank rows and keeps the spreadsheet row number", () => {
    const parsed = parseAoa([["reference", "amount"], ["A-1", 5], ["", ""], ["B-1", 7]], "gaps.xlsx");
    expect(parsed.rows.map((row) => [row.cells.reference.display, row.rowNumber])).toEqual([
      ["A-1", 2],
      ["B-1", 4],
    ]);
  });

  it("rejects a bad CSV", () => {
    expect(() => parseSpreadsheet("bad.csv", new TextEncoder().encode('name,amount\n"unterminated,1\n'), "File A")).toThrow(
      /could not be read as CSV/,
    );
  });

  it("rejects a corrupt spreadsheet without a stack trace", () => {
    try {
      parseSpreadsheet("bad.xlsx", new Uint8Array([1, 2, 3, 4, 5]), "File A");
      throw new Error("expected failure");
    } catch (error) {
      const message = messageOf(error);
      expect(message).toMatch(/could not be read/);
      expect(message).not.toMatch(/as CSV/);
      expect(message).not.toMatch(/\.tsx?:\d+/);
    }
  });

  it("rejects the wrong file type", () => {
    expect(() => parseSpreadsheet("notes.txt", new TextEncoder().encode("hello"), "File A")).toThrow(/\.xlsx, \.xls, or \.csv/);
  });

  it("refuses a file over the size limit before parsing it", () => {
    expect(() => parseSpreadsheet("big.csv", new Uint8Array(MAX_FILE_BYTES + 1), "File A")).toThrow(/4 MB/);
    const allowed = new Uint8Array(MAX_FILE_BYTES);
    allowed.set(new TextEncoder().encode("reference,amount\nA,1\n"));
    try {
      parseSpreadsheet("ok.csv", allowed, "File A");
    } catch (error) {
      expect(messageOf(error)).not.toMatch(/4 MB/);
    }
  });

  it("refuses more than 8,000 data rows and allows 8,000", () => {
    const header = "reference,amount\n";
    const within = header + Array.from({ length: MAX_DATA_ROWS }, (_, index) => `R${index},1`).join("\n");
    expect(parseSpreadsheet("ok.csv", new TextEncoder().encode(within), "File A").rows).toHaveLength(MAX_DATA_ROWS);
    const over = `${within}\nR-extra,1\n`;
    expect(() => parseSpreadsheet("over.csv", new TextEncoder().encode(over), "File A")).toThrow(/8,000/);
  });
});
