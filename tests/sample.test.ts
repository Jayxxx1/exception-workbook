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

describe("sample files", () => {
  it("uses fake files in range and classifies every expected case", () => {
    const orders = load("sample-orders.xlsx");
    const payments = load("sample-payments.xlsx");
    expect(orders.rows.length).toBe(47);
    expect(payments.rows.length).toBe(43);
    expect(orders.rows.length).toBeGreaterThanOrEqual(40);
    expect(payments.rows.length).toBeLessThanOrEqual(80);

    const orderBook = XLSX.read(readFileSync(new URL("../public/sample-orders.xlsx", import.meta.url)), { type: "buffer" });
    const paymentBook = XLSX.read(readFileSync(new URL("../public/sample-payments.xlsx", import.meta.url)), { type: "buffer" });
    const orderValues = cellValues(orderBook.Sheets.Orders);
    const paymentCells = cellObjects(paymentBook.Sheets.Payments);
    expect(orderValues).toContain("ORD-24001 ");
    expect(orderValues).toContain("ord 24401");
    expect(paymentCells.some((cell) => cell.t === "s" && String(cell.v).includes("฿"))).toBe(true);

    expect(detectColumns(orders.headers)).toEqual({ reference: "เลขที่ใบสั่ง", amount: "ยอดเงิน", date: "วันที่" });
    expect(detectColumns(payments.headers)).toEqual({ reference: "เลขที่อ้างอิง", amount: "จำนวนเงิน", date: "วันที่รับเงิน" });

    const result = compareSheets({
      fileA: orders,
      fileB: payments,
      referenceA: "เลขที่ใบสั่ง",
      amountA: "ยอดเงิน",
      dateA: "วันที่",
      referenceB: "เลขที่อ้างอิง",
      amountB: "จำนวนเงิน",
      dateB: "วันที่รับเงิน",
      dateMatching: false,
    });

    expect(result.matched).toHaveLength(30);
    expect(result.exceptions).toHaveLength(6);
    expect(result.onlyA).toHaveLength(8);
    expect(result.onlyB).toHaveLength(5);
    expect(result.duplicates).toHaveLength(5);

    const spaced = result.matched.find((row) => normalizeReference(row.referenceA) === "ord24001");
    expect(spaced?.referenceA).toBe("ORD-24001 ");
    expect(spaced?.dateA).not.toBe(spaced?.dateB);
    expect(result.matched.find((row) => normalizeReference(row.referenceA) === "ord24004")?.amountBDisplay).toContain("฿");

    const mismatch = result.exceptions.find((row) => normalizeReference(row.referenceA) === "ord24101");
    expect(mismatch?.differenceMinor).toBe(1000n * 10000n);
    expect(result.totals.mismatchDifference).toBe(17191500n);
    expect(result.onlyA.some((row) => row.referenceA === "ORD-24201")).toBe(true);
    expect(result.onlyB.some((row) => row.referenceB === "RCV-24301")).toBe(true);
    expect(result.matched.some((row) => normalizeReference(row.referenceA) === "ord24402")).toBe(false);
    expect(result.duplicates.filter((row) => normalizeReference(row.referenceA || row.referenceB) === "ord24402")).toHaveLength(3);

    const workbook = XLSX.read(buildWorkbookBytes(result), { type: "array" });
    expect(workbook.SheetNames).toEqual(["Summary", "Matched", "Exceptions", "Only in A", "Only in B", "Duplicates"]);
    const onlyA = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Only in A"]);
    expect(onlyA.some((row) => row["บันทึก"] === "ค้างในไฟล์ใบสั่ง")).toBe(true);
    const summary = XLSX.utils.sheet_to_json<{ Item: string; Value: string | number }>(workbook.Sheets.Summary);
    const byItem = Object.fromEntries(summary.map((row) => [row.Item, row.Value]));
    expect(byItem["Matched pairs"]).toBe(30);
    expect(byItem["Amount mismatches"]).toBe(6);
    expect(byItem["Date matching"]).toBe("Off");
  });
});
