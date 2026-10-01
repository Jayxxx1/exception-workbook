import { UserFacingError, rowPhrase } from "./errors";
import { MAX_DATA_ROWS, tooManyRowsMessage } from "./limits";
import { normalizeReference, parseAmount, parseDateKey } from "./normalize";
import type { CellValue, ClassifiedRow, Comparison, DataRow, ParsedSheet } from "./types";

export type CompareInput = {
  fileA: ParsedSheet;
  fileB: ParsedSheet;
  referenceA: string;
  amountA: string;
  dateA: string | null;
  referenceB: string;
  amountB: string;
  dateB: string | null;
  dateMatching: boolean;
};

type SideRow = {
  rowNumber: number;
  referenceDisplay: string;
  referenceKey: string;
  amountDisplay: string;
  amountMinor: bigint;
  dateDisplay: string;
  dateKey: string | null;
  extras: Record<string, string>;
};

function requireDistinct(reference: string, amount: string, date: string | null, label: string): void {
  if (!reference || !amount) {
    throw new UserFacingError(`Choose a reference column and an amount column for ${label}.`);
  }
  if (!reference.trim() || !amount.trim()) {
    throw new UserFacingError(`Choose a reference column and an amount column for ${label}.`);
  }
  if (reference === amount || (date && (date === reference || date === amount))) {
    throw new UserFacingError(`${label} uses the same column twice. Choose a different reference, amount, and date.`);
  }
}

function requireHeader(sheet: ParsedSheet, header: string, label: string): void {
  if (!sheet.headers.includes(header)) {
    throw new UserFacingError(`${label} has no column named “${header}”.`);
  }
}

function extrasOf(row: DataRow, headers: string[], skip: Set<string>): Record<string, string> {
  const extras: Record<string, string> = {};
  for (const header of headers) {
    if (skip.has(header)) continue;
    extras[header] = row.cells[header]?.display ?? "";
  }
  return extras;
}

function dateKeyOf(cell: CellValue | undefined): string | null {
  if (!cell) return null;
  return parseDateKey(cell.display) ?? (cell.isoDate ? parseDateKey(cell.isoDate) : null);
}

function readSide(
  sheet: ParsedSheet,
  referenceHeader: string,
  amountHeader: string,
  dateHeader: string | null,
  dateMatching: boolean,
  label: string,
): { rows: SideRow[]; total: bigint } {
  const blankRows: number[] = [];
  const badAmountRows: number[] = [];
  const badDateRows: number[] = [];
  const rows: SideRow[] = [];
  let total = 0n;
  const skip = new Set([referenceHeader, amountHeader, dateHeader].filter((header): header is string => Boolean(header)));

  for (const row of sheet.rows) {
    const referenceCell = row.cells[referenceHeader];
    const amountCell = row.cells[amountHeader];
    const dateCell = dateHeader ? row.cells[dateHeader] : undefined;
    const referenceSource = typeof referenceCell?.raw === "number" ? referenceCell.raw : (referenceCell?.display ?? "");
    const referenceKey = normalizeReference(referenceSource);
    const referenceDisplay = referenceCell?.display ?? (typeof referenceCell?.raw === "number" ? String(referenceCell.raw) : "");
    if (!referenceKey) blankRows.push(row.rowNumber);

    const amountSource = typeof amountCell?.raw === "number" ? amountCell.raw : (amountCell?.display ?? "");
    const amountMinor = parseAmount(amountSource);
    if (amountMinor === null) badAmountRows.push(row.rowNumber);

    let dateKey: string | null = null;
    const dateDisplay = dateCell?.display ?? "";
    if (dateHeader) {
      dateKey = dateKeyOf(dateCell);
      if (dateMatching && !dateKey) badDateRows.push(row.rowNumber);
    }

    if (referenceKey && amountMinor !== null) {
      total += amountMinor;
      rows.push({
        rowNumber: row.rowNumber,
        referenceDisplay,
        referenceKey,
        amountDisplay: amountCell?.display ?? String(amountSource),
        amountMinor,
        dateDisplay,
        dateKey,
        extras: extrasOf(row, sheet.headers, skip),
      });
    }
  }

  if (blankRows.length > 0) {
    throw new UserFacingError(`${label} has an empty reference in column “${referenceHeader}” (${rowPhrase(blankRows)}).`);
  }
  if (badAmountRows.length > 0) {
    throw new UserFacingError(`${label} column “${amountHeader}” has values that are not amounts (${rowPhrase(badAmountRows)}).`);
  }
  if (badDateRows.length > 0) {
    throw new UserFacingError(
      `${label} column “${dateHeader}” has values that are not dates (${rowPhrase(badDateRows)}). Use year-month-day or day/month/year.`,
    );
  }
  return { rows, total };
}

function pair(status: ClassifiedRow["status"], a: SideRow | null, b: SideRow | null, difference: bigint | null): ClassifiedRow {
  return {
    status,
    file: null,
    referenceA: a?.referenceDisplay ?? "",
    referenceB: b?.referenceDisplay ?? "",
    amountADisplay: a?.amountDisplay ?? "",
    amountBDisplay: b?.amountDisplay ?? "",
    amountAMinor: a?.amountMinor ?? null,
    amountBMinor: b?.amountMinor ?? null,
    differenceMinor: difference,
    dateA: a?.dateDisplay ?? "",
    dateB: b?.dateDisplay ?? "",
    rowA: a?.rowNumber ?? null,
    rowB: b?.rowNumber ?? null,
    copiesInThisFile: null,
    copiesInOtherFile: null,
    extras: {},
  };
}

function single(status: "ONLY_IN_A" | "ONLY_IN_B", row: SideRow): ClassifiedRow {
  const onA = status === "ONLY_IN_A";
  return {
    status,
    file: onA ? "A" : "B",
    referenceA: onA ? row.referenceDisplay : "",
    referenceB: onA ? "" : row.referenceDisplay,
    amountADisplay: onA ? row.amountDisplay : "",
    amountBDisplay: onA ? "" : row.amountDisplay,
    amountAMinor: onA ? row.amountMinor : null,
    amountBMinor: onA ? null : row.amountMinor,
    differenceMinor: null,
    dateA: onA ? row.dateDisplay : "",
    dateB: onA ? "" : row.dateDisplay,
    rowA: onA ? row.rowNumber : null,
    rowB: onA ? null : row.rowNumber,
    copiesInThisFile: null,
    copiesInOtherFile: null,
    extras: row.extras,
  };
}

function duplicate(row: SideRow, file: "A" | "B", copiesHere: number, copiesOther: number): ClassifiedRow {
  const onA = file === "A";
  return {
    status: "DUPLICATE",
    file,
    referenceA: onA ? row.referenceDisplay : "",
    referenceB: onA ? "" : row.referenceDisplay,
    amountADisplay: onA ? row.amountDisplay : "",
    amountBDisplay: onA ? "" : row.amountDisplay,
    amountAMinor: onA ? row.amountMinor : null,
    amountBMinor: onA ? null : row.amountMinor,
    differenceMinor: null,
    dateA: onA ? row.dateDisplay : "",
    dateB: onA ? "" : row.dateDisplay,
    rowA: onA ? row.rowNumber : null,
    rowB: onA ? null : row.rowNumber,
    copiesInThisFile: copiesHere,
    copiesInOtherFile: copiesOther,
    extras: row.extras,
  };
}

function group(rows: SideRow[]): Map<string, SideRow[]> {
  const grouped = new Map<string, SideRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.referenceKey);
    if (list) list.push(row);
    else grouped.set(row.referenceKey, [row]);
  }
  return grouped;
}

export function compareSheets(input: CompareInput): Comparison {
  if (input.fileA.rows.length > MAX_DATA_ROWS) throw new UserFacingError(tooManyRowsMessage("File A"));
  if (input.fileB.rows.length > MAX_DATA_ROWS) throw new UserFacingError(tooManyRowsMessage("File B"));

  requireDistinct(input.referenceA, input.amountA, input.dateA, "File A");
  requireDistinct(input.referenceB, input.amountB, input.dateB, "File B");
  requireHeader(input.fileA, input.referenceA, "File A");
  requireHeader(input.fileA, input.amountA, "File A");
  requireHeader(input.fileB, input.referenceB, "File B");
  requireHeader(input.fileB, input.amountB, "File B");
  if (input.dateA) requireHeader(input.fileA, input.dateA, "File A");
  if (input.dateB) requireHeader(input.fileB, input.dateB, "File B");

  const sideA = readSide(input.fileA, input.referenceA, input.amountA, input.dateA, input.dateMatching, "File A");
  const sideB = readSide(input.fileB, input.referenceB, input.amountB, input.dateB, input.dateMatching, "File B");
  const groupsA = group(sideA.rows);
  const groupsB = group(sideB.rows);
  const keys = [...new Set([...groupsA.keys(), ...groupsB.keys()])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const matched: ClassifiedRow[] = [];
  const exceptions: ClassifiedRow[] = [];
  const onlyA: ClassifiedRow[] = [];
  const onlyB: ClassifiedRow[] = [];
  const duplicates: ClassifiedRow[] = [];

  for (const key of keys) {
    const aRows = groupsA.get(key) ?? [];
    const bRows = groupsB.get(key) ?? [];
    if (aRows.length > 1 || bRows.length > 1) {
      for (const row of aRows) duplicates.push(duplicate(row, "A", aRows.length, bRows.length));
      for (const row of bRows) duplicates.push(duplicate(row, "B", bRows.length, aRows.length));
      continue;
    }
    if (aRows.length === 1 && bRows.length === 1) {
      const [a] = aRows;
      const [b] = bRows;
      if (a.amountMinor !== b.amountMinor) {
        exceptions.push(pair("AMOUNT_MISMATCH", a, b, a.amountMinor - b.amountMinor));
      } else if (input.dateMatching && a.dateKey !== b.dateKey) {
        exceptions.push(pair("DATE_MISMATCH", a, b, 0n));
      } else {
        matched.push(pair("MATCHED", a, b, 0n));
      }
      continue;
    }
    if (aRows.length === 1) onlyA.push(single("ONLY_IN_A", aRows[0]));
    else if (bRows.length === 1) onlyB.push(single("ONLY_IN_B", bRows[0]));
  }

  const mismatchDifference = exceptions
    .filter((row) => row.status === "AMOUNT_MISMATCH")
    .reduce((sum, row) => sum + (row.differenceMinor ?? 0n), 0n);

  return {
    fileAName: input.fileA.fileName,
    fileBName: input.fileB.fileName,
    sheetAName: input.fileA.sheetName,
    sheetBName: input.fileB.sheetName,
    rowsA: input.fileA.rows.length,
    rowsB: input.fileB.rows.length,
    referenceA: input.referenceA,
    referenceB: input.referenceB,
    amountA: input.amountA,
    amountB: input.amountB,
    dateA: input.dateA,
    dateB: input.dateB,
    dateMatching: input.dateMatching,
    matched,
    exceptions,
    onlyA,
    onlyB,
    duplicates,
    totals: {
      amountA: sideA.total,
      amountB: sideB.total,
      matched: matched.reduce((sum, row) => sum + (row.amountAMinor ?? 0n), 0n),
      mismatchDifference,
      onlyA: onlyA.reduce((sum, row) => sum + (row.amountAMinor ?? 0n), 0n),
      onlyB: onlyB.reduce((sum, row) => sum + (row.amountBMinor ?? 0n), 0n),
    },
  };
}

export function summaryNote(result: Comparison): string | null {
  const leftovers = result.exceptions.length + result.onlyA.length + result.onlyB.length + result.duplicates.length;
  if (result.matched.length > 0 && leftovers === 0) {
    return "All rows matched. Every reference agreed, every amount agreed, and no duplicates were left over.";
  }
  if (result.matched.length === 0) {
    return "No rows matched. A match needs the same reference and the same amount. The workbook lists the rest.";
  }
  return null;
}

export const STATUS_LABEL: Record<ClassifiedRow["status"], string> = {
  MATCHED: "MATCHED",
  AMOUNT_MISMATCH: "AMOUNT MISMATCH",
  ONLY_IN_A: "ONLY IN FILE A",
  ONLY_IN_B: "ONLY IN FILE B",
  DUPLICATE: "DUPLICATE",
  DATE_MISMATCH: "DATE MISMATCH",
};
