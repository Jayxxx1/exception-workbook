import * as XLSX from "xlsx";
import { UserFacingError } from "./errors";
import { fileTooLargeMessage, MAX_DATA_ROWS, MAX_FILE_BYTES, tooManyRowsMessage } from "./limits";
import type { CellValue, DataRow, ParsedSheet } from "./types";

const emptyCell = (): CellValue => ({ display: "", raw: null, isoDate: null });

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function cellValue(cell: XLSX.CellObject | undefined): CellValue {
  if (!cell || cell.v === undefined || cell.v === null || cell.v === "") return emptyCell();

  if (cell.v instanceof Date) {
    const iso = Number.isNaN(cell.v.getTime())
      ? null
      : `${cell.v.getUTCFullYear()}-${pad(cell.v.getUTCMonth() + 1)}-${pad(cell.v.getUTCDate())}`;
    const display = typeof cell.w === "string" && cell.w.length > 0 ? cell.w : (iso ?? "");
    return { display, raw: display, isoDate: iso };
  }

  if (typeof cell.v === "number") {
    const display = typeof cell.w === "string" && cell.w.length > 0 ? cell.w : String(cell.v);
    return { display, raw: cell.v, isoDate: null };
  }

  if (typeof cell.v === "boolean") {
    const display = cell.v ? "TRUE" : "FALSE";
    return { display, raw: display, isoDate: null };
  }

  const text = typeof cell.v === "string" ? cell.v : typeof cell.w === "string" ? cell.w : String(cell.v);
  return { display: text, raw: text, isoDate: null };
}

function columnLabel(index: number): string {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function hasSpreadsheetMagic(extension: string, bytes: Uint8Array): boolean {
  if (extension === "csv") return true;
  if (bytes.length < 4) return false;
  if (extension === "xlsx") return bytes[0] === 0x50 && bytes[1] === 0x4b;
  return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

function unbalancedQuotes(bytes: Uint8Array): boolean {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (text.includes("\u0000")) return true;
  let quotes = 0;
  for (const char of text) if (char === '"') quotes += 1;
  return quotes % 2 === 1;
}

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function parseSpreadsheet(fileName: string, data: ArrayBuffer | Uint8Array, label = "This file"): ParsedSheet {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength > MAX_FILE_BYTES) throw new UserFacingError(fileTooLargeMessage(label));

  const extension = extensionOf(fileName);
  if (extension !== "xlsx" && extension !== "xls" && extension !== "csv") {
    throw new UserFacingError(`${label} needs to be an .xlsx, .xls, or .csv file.`);
  }
  if (!hasSpreadsheetMagic(extension, bytes)) {
    throw new UserFacingError(`${label} could not be read. It may be damaged or not a real spreadsheet.`);
  }

  if (extension === "csv" && unbalancedQuotes(bytes)) {
    throw new UserFacingError(`${label} could not be read as CSV. Check quotes and commas, then export it again.`);
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      cellDates: true,
      codepage: extension === "csv" ? 65001 : undefined,
    });
  } catch {
    if (extension === "csv") {
      throw new UserFacingError(`${label} could not be read as CSV. Check quotes and commas, then export it again.`);
    }
    throw new UserFacingError(`${label} could not be read. It may be damaged or not a real spreadsheet.`);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new UserFacingError(`${label} has no worksheet.`);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !sheet["!ref"]) throw new UserFacingError(`${label} has no data rows. Add a header row and at least one data row.`);

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const columns: Array<{ index: number; header: string }> = [];
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const header = cellValue(sheet[XLSX.utils.encode_cell({ r: range.s.r, c })]).display.replace(/\s+/g, " ").trim();
    columns.push({ index: c, header });
  }
  while (columns.length > 0 && columns[columns.length - 1].header === "") columns.pop();
  if (columns.length === 0) {
    throw new UserFacingError(`${label} has no data rows. Add a header row and at least one data row.`);
  }

  for (const column of columns) {
    if (!column.header) {
      throw new UserFacingError(`${label} is missing a header in column ${columnLabel(column.index)}.`);
    }
  }
  const seen = new Set<string>();
  for (const column of columns) {
    if (seen.has(column.header)) {
      throw new UserFacingError(`${label} has two columns named “${column.header}”. Rename one and try again.`);
    }
    seen.add(column.header);
  }

  const rows: DataRow[] = [];
  for (let r = range.s.r + 1; r <= range.e.r; r += 1) {
    const cells: Record<string, CellValue> = {};
    let any = false;
    for (const column of columns) {
      const value = cellValue(sheet[XLSX.utils.encode_cell({ r, c: column.index })]);
      cells[column.header] = value;
      if (value.display !== "" || typeof value.raw === "number") any = true;
    }
    if (!any) continue;
    rows.push({ rowNumber: r + 1, cells });
    if (rows.length > MAX_DATA_ROWS) throw new UserFacingError(tooManyRowsMessage(label));
  }

  if (rows.length === 0) {
    throw new UserFacingError(`${label} has no data rows. Add a header row and at least one data row.`);
  }

  return {
    fileName,
    sheetName,
    sheetCount: workbook.SheetNames.length,
    headers: columns.map((column) => column.header),
    rows,
  };
}
