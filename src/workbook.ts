import * as XLSX from "xlsx";
import { UserFacingError } from "./errors";
import { SHEET_NAMES, statusLabel, type Locale } from "./i18n";
import { minorToNumber } from "./normalize";
import type { ClassifiedRow, Comparison } from "./types";

function excelText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function sheetFromRows(rows: Array<Array<string | number>>): XLSX.WorkSheet {
  const sheet: XLSX.WorkSheet = {};
  let maxColumn = 0;
  rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      maxColumn = Math.max(maxColumn, columnIndex);
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      if (typeof value === "number" && Number.isFinite(value)) sheet[address] = { t: "n", v: value };
      else sheet[address] = { t: "s", v: excelText(String(value)) };
    });
  });
  const lastRow = Math.max(rows.length - 1, 0);
  sheet["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: maxColumn } });
  if (rows.length > 1) sheet["!autofilter"] = { ref: sheet["!ref"] };
  const width = rows[0]?.map((header, columnIndex) => {
    const longest = rows.reduce((max, row) => Math.max(max, String(row[columnIndex] ?? "").length), String(header).length);
    return { wch: Math.min(42, Math.max(12, longest + 2)) };
  });
  if (width) sheet["!cols"] = width;
  return sheet;
}

function text(value: string | number | null): string | number {
  if (typeof value === "number") return value;
  return value ?? "";
}

function extraHeaders(rows: ClassifiedRow[], reserved: Set<string>): string[] {
  const headers: string[] = [];
  const seen = new Set<string>(reserved);
  for (const row of rows) {
    for (const key of Object.keys(row.extras)) {
      const header = seen.has(key) ? `Source: ${key}` : key;
      if (seen.has(header)) continue;
      seen.add(header);
      headers.push(header);
    }
  }
  return headers;
}

function extraValues(row: ClassifiedRow, headers: string[], reserved: Set<string>): string[] {
  const rename = new Map<string, string>();
  const seen = new Set<string>(reserved);
  for (const key of Object.keys(row.extras)) {
    const header = seen.has(key) ? `Source: ${key}` : key;
    seen.add(header);
    rename.set(key, header);
  }
  return headers.map((header) => {
    const source = [...rename.entries()].find(([, value]) => value === header)?.[0];
    return source ? row.extras[source] ?? "" : "";
  });
}

function summaryRows(comparison: Comparison): Array<Array<string | number>> {
  const dateMismatches = comparison.exceptions.filter((row) => row.status === "DATE_MISMATCH").length;
  const amountMismatches = comparison.exceptions.filter((row) => row.status === "AMOUNT_MISMATCH").length;
  const rule = comparison.dateMatching
    ? "Normalized reference matches, amount matches exactly, and date matches."
    : "Normalized reference matches and amount matches exactly. Dates are shown and are not required.";
  const entries: Array<[string, string | number]> = [
    ["Rule", rule],
    ["File A", comparison.fileAName],
    ["File B", comparison.fileBName],
    ["Sheet A", comparison.sheetAName],
    ["Sheet B", comparison.sheetBName],
    ["File A rows", comparison.rowsA],
    ["File B rows", comparison.rowsB],
    ["Reference column (A)", comparison.referenceA],
    ["Reference column (B)", comparison.referenceB],
    ["Amount column (A)", comparison.amountA],
    ["Amount column (B)", comparison.amountB],
    ["Date column (A)", comparison.dateA ?? "(none)"],
    ["Date column (B)", comparison.dateB ?? "(none)"],
    ["Date matching", comparison.dateMatching ? "On" : "Off"],
    ["Matched pairs", comparison.matched.length],
    ["Amount mismatches", amountMismatches],
    ["Only in file A", comparison.onlyA.length],
    ["Only in file B", comparison.onlyB.length],
    ["Duplicate rows", comparison.duplicates.length],
    ["Date mismatches", dateMismatches],
    ["File A amount", minorToNumber(comparison.totals.amountA)],
    ["File B amount", minorToNumber(comparison.totals.amountB)],
    ["Matched amount", minorToNumber(comparison.totals.matched)],
    ["Mismatch difference (A-B)", minorToNumber(comparison.totals.mismatchDifference)],
    ["Only in file A amount", minorToNumber(comparison.totals.onlyA)],
    ["Only in file B amount", minorToNumber(comparison.totals.onlyB)],
    ["Net difference (A-B)", minorToNumber(comparison.totals.amountA - comparison.totals.amountB)],
  ];
  return [["Item", "Value"], ...entries];
}

function matchedRows(rows: ClassifiedRow[]): Array<Array<string | number>> {
  const header = ["Reference (A)", "Reference (B)", "Amount (A)", "Amount (B)", "Date (A)", "Date (B)", "Row (A)", "Row (B)"];
  return [
    header,
    ...rows.map((row) => [
      row.referenceA,
      row.referenceB,
      row.amountADisplay,
      row.amountBDisplay,
      row.dateA,
      row.dateB,
      text(row.rowA),
      text(row.rowB),
    ]),
  ];
}

function exceptionRows(rows: ClassifiedRow[], locale: Locale): Array<Array<string | number>> {
  const header = ["Status", "Reference (A)", "Reference (B)", "Amount (A)", "Amount (B)", "Difference", "Date (A)", "Date (B)", "Row (A)", "Row (B)"];
  return [
    header,
    ...rows.map((row) => [
      statusLabel(locale, row.status),
      row.referenceA,
      row.referenceB,
      row.amountADisplay,
      row.amountBDisplay,
      row.differenceMinor === null ? "" : minorToNumber(row.differenceMinor),
      row.dateA,
      row.dateB,
      text(row.rowA),
      text(row.rowB),
    ]),
  ];
}

function onlyRows(rows: ClassifiedRow[], side: "A" | "B"): Array<Array<string | number>> {
  const reserved = new Set(["Reference", "Amount", "Date", "Row"]);
  const extras = extraHeaders(rows, reserved);
  const header = ["Reference", "Amount", "Date", "Row", ...extras];
  return [
    header,
    ...rows.map((row) => {
      const reference = side === "A" ? row.referenceA : row.referenceB;
      const amount = side === "A" ? row.amountADisplay : row.amountBDisplay;
      const date = side === "A" ? row.dateA : row.dateB;
      const line = side === "A" ? row.rowA : row.rowB;
      return [reference, amount, date, text(line), ...extraValues(row, extras, reserved)];
    }),
  ];
}

function duplicateRows(rows: ClassifiedRow[]): Array<Array<string | number>> {
  const reserved = new Set(["File", "Reference", "Amount", "Date", "Row", "Copies in this file", "Copies in other file"]);
  const extras = extraHeaders(rows, reserved);
  const header = ["File", "Reference", "Amount", "Date", "Row", "Copies in this file", "Copies in other file", ...extras];
  return [
    header,
    ...rows.map((row) => {
      const onA = row.file === "A";
      return [
        row.file ?? "",
        onA ? row.referenceA : row.referenceB,
        onA ? row.amountADisplay : row.amountBDisplay,
        onA ? row.dateA : row.dateB,
        text(onA ? row.rowA : row.rowB),
        text(row.copiesInThisFile),
        text(row.copiesInOtherFile),
        ...extraValues(row, extras, reserved),
      ];
    }),
  ];
}

export function buildWorkbook(comparison: Comparison, locale: Locale = "en"): XLSX.WorkBook {
  const names = SHEET_NAMES[locale];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(summaryRows(comparison)), names.summary);
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(matchedRows(comparison.matched)), names.matched);
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(exceptionRows(comparison.exceptions, locale)), names.exceptions);
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(onlyRows(comparison.onlyA, "A")), names.onlyA);
  XLSX.utils.book_append_sheet(workbook, sheetFromRows(onlyRows(comparison.onlyB, "B")), names.onlyB);
  if (comparison.duplicates.length > 0) {
    XLSX.utils.book_append_sheet(workbook, sheetFromRows(duplicateRows(comparison.duplicates)), names.duplicates);
  }
  workbook.Props = { Title: "Exception Workbook", Subject: "Spreadsheet comparison" };
  return workbook;
}

export function toUint8Array(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data) && data.every((item) => typeof item === "number")) return new Uint8Array(data);
  throw new UserFacingError("The workbook could not be created.");
}

export function buildWorkbookBytes(comparison: Comparison, locale: Locale = "en"): Uint8Array {
  const written = XLSX.write(buildWorkbook(comparison, locale), { bookType: "xlsx", type: "array", compression: true });
  return toUint8Array(written);
}

export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const blob = new Blob([copy], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
