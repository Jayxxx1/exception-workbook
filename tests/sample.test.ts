import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { compareSheets } from "../src/compare";
import { detectColumns } from "../src/headers";
import { normalizeReference } from "../src/normalize";
import { parseSpreadsheet } from "../src/parseSheet";
import { buildWorkbookBytes } from "../src/workbook";

function load(name: string) {
  const bytes = readFileSync(new URL(`../public/${name}`, import.meta.url));
  return parseSpreadsheet(name, bytes, name);
}

function cellObjects(sheet: XLSX.WorkSheet): XLSX.CellObject[] {
  return Object.entries(sheet)
    .filter(([key]) => !key.startsWith("!"))
    .map(([, cell]) => cell);
}

function cellValues(sheet: XLSX.WorkSheet): unknown[] {
  return cellObjects(sheet).map((cell) => cell.v);
}

function expectClassification(
  ordersName: string,
  paymentsName: string,
  referenceA: string,
  amountA: string,
  dateA: string,
  referenceB: string,
  amountB: string,
  dateB: string,
  spacedRef: string,
  mismatchRef: string,
  onlyA: string,
  onlyB: string,
  duplicateRef: string,
  noteHeader: string,
  noteValue: string,
) {
  const orders = load(ordersName);
  const payments = load(paymentsName);
  expect(orders.rows.length).toBe(47);
  expect(payments.rows.length).toBe(43);

  const result = compareSheets({
    fileA: orders,
    fileB: payments,
    referenceA,
    amountA,
    dateA,
    referenceB,
    amountB,
    dateB,
    dateMatching: false,
  });

  expect(result.matched).toHaveLength(30);
  expect(result.exceptions).toHaveLength(6);
  expect(result.onlyA).toHaveLength(8);
  expect(result.onlyB).toHaveLength(5);
  expect(result.duplicates).toHaveLength(5);

  const spaced = result.matched.find((row) => normalizeReference(row.referenceA) === normalizeReference(spacedRef));
  expect(spaced?.referenceA.trimEnd()).toBe(spacedRef.trim());
  expect(spaced?.dateA).not.toBe(spaced?.dateB);

  const mismatch = result.exceptions.find((row) => normalizeReference(row.referenceA) === normalizeReference(mismatchRef));
  expect(mismatch?.differenceMinor).toBe(1000n * 10000n);
  expect(result.totals.mismatchDifference).toBe(17191500n);
  expect(result.onlyA.some((row) => row.referenceA === onlyA)).toBe(true);
  expect(result.onlyB.some((row) => row.referenceB === onlyB)).toBe(true);
  expect(result.duplicates.filter((row) => normalizeReference(row.referenceA || row.referenceB) === normalizeReference(duplicateRef))).toHaveLength(3);

  const workbook = XLSX.read(buildWorkbookBytes(result), { type: "array" });
  expect(workbook.SheetNames).toEqual(["Summary", "Matched", "Exceptions", "Only in A", "Only in B", "Duplicates"]);
  const onlyASheet = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Only in A"]);
  expect(onlyASheet.some((row) => row[noteHeader] === noteValue)).toBe(true);
}

describe("sample files", () => {
  it("uses English international samples as the default demo", () => {
    const orders = load("sample-orders.xlsx");
    const payments = load("sample-payments.xlsx");
    expect(detectColumns(orders.headers)).toEqual({ reference: "Order ID", amount: "Amount", date: "Date" });
    expect(detectColumns(payments.headers)).toEqual({ reference: "Payment Reference", amount: "Amount", date: "Date" });
    const orderBook = XLSX.read(readFileSync(new URL("../public/sample-orders.xlsx", import.meta.url)), { type: "buffer" });
    const paymentBook = XLSX.read(readFileSync(new URL("../public/sample-payments.xlsx", import.meta.url)), { type: "buffer" });
    expect(cellValues(orderBook.Sheets.Orders)).toContain("ORD-1001 ");
    expect(cellValues(orderBook.Sheets.Orders)).toContain("Alex Smith");
    expect(cellObjects(paymentBook.Sheets.Payments).some((cell) => cell.t === "s" && String(cell.v).includes("$"))).toBe(true);

    expectClassification(
      "sample-orders.xlsx",
      "sample-payments.xlsx",
      "Order ID",
      "Amount",
      "Date",
      "Payment Reference",
      "Amount",
      "Date",
      "ORD-1001 ",
      "ORD-1101",
      "ORD-1201",
      "PAY-1301",
      "ORD-1402",
      "Note",
      "only in file A",
    );
  });

  it("keeps the Thai sample regression counts", () => {
    expectClassification(
      "sample-orders-th.xlsx",
      "sample-payments-th.xlsx",
      "เลขที่ใบสั่ง",
      "ยอดเงิน",
      "วันที่",
      "เลขที่อ้างอิง",
      "จำนวนเงิน",
      "วันที่รับเงิน",
      "ORD-24001 ",
      "ORD-24101",
      "ORD-24201",
      "RCV-24301",
      "ORD-24402",
      "บันทึก",
      "ค้างในไฟล์ใบสั่ง",
    );
  });
});
