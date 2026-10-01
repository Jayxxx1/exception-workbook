export type CellValue = {
  display: string;
  raw: number | string | null;
  isoDate: string | null;
};

export type DataRow = {
  rowNumber: number;
  cells: Record<string, CellValue>;
};

export type ParsedSheet = {
  fileName: string;
  sheetName: string;
  sheetCount: number;
  headers: string[];
  rows: DataRow[];
};

export type RowStatus =
  | "MATCHED"
  | "AMOUNT_MISMATCH"
  | "ONLY_IN_A"
  | "ONLY_IN_B"
  | "DUPLICATE"
  | "DATE_MISMATCH";

export type ClassifiedRow = {
  status: RowStatus;
  file: "A" | "B" | null;
  referenceA: string;
  referenceB: string;
  amountADisplay: string;
  amountBDisplay: string;
  amountAMinor: bigint | null;
  amountBMinor: bigint | null;
  differenceMinor: bigint | null;
  dateA: string;
  dateB: string;
  rowA: number | null;
  rowB: number | null;
  copiesInThisFile: number | null;
  copiesInOtherFile: number | null;
  extras: Record<string, string>;
};

export type ComparisonTotals = {
  amountA: bigint;
  amountB: bigint;
  matched: bigint;
  mismatchDifference: bigint;
  onlyA: bigint;
  onlyB: bigint;
};

export type Comparison = {
  fileAName: string;
  fileBName: string;
  sheetAName: string;
  sheetBName: string;
  rowsA: number;
  rowsB: number;
  referenceA: string;
  referenceB: string;
  amountA: string;
  amountB: string;
  dateA: string | null;
  dateB: string | null;
  dateMatching: boolean;
  matched: ClassifiedRow[];
  exceptions: ClassifiedRow[];
  onlyA: ClassifiedRow[];
  onlyB: ClassifiedRow[];
  duplicates: ClassifiedRow[];
  totals: ComparisonTotals;
};

export type DetectedColumns = {
  reference: string | null;
  amount: string | null;
  date: string | null;
};
