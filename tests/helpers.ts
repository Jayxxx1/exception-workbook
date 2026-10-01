import * as XLSX from "xlsx";
import { parseSpreadsheet } from "../src/parseSheet";
import type { ParsedSheet } from "../src/types";

export function table(headers: string[], records: Array<Array<string | number>>, fileName = "fixture.csv"): ParsedSheet {
  return {
    fileName,
    sheetName: "Sheet1",
    sheetCount: 1,
    headers,
    rows: records.map((record, index) => ({
      rowNumber: index + 2,
      cells: Object.fromEntries(
        headers.map((header, column) => {
          const value = record[column] ?? "";
          if (typeof value === "number") return [header, { display: String(value), raw: value, isoDate: null }];
          return [header, { display: value, raw: value, isoDate: null }];
        }),
      ),
    })),
  };
}

export function parseAoa(rows: unknown[][], fileName: string, bookType: "xlsx" | "xls" | "csv" = "xlsx"): ParsedSheet {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  const written = XLSX.write(workbook, { bookType, type: "array" });
  const bytes = written instanceof Uint8Array ? written : new Uint8Array(written as ArrayBuffer);
  return parseSpreadsheet(fileName, bytes, "File A");
}
