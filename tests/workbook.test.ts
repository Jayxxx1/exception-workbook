import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { compareSheets } from "../src/compare";
import { buildWorkbookBytes } from "../src/workbook";
import { table } from "./helpers";

function sheetsOf(bytes: Uint8Array) {
  return XLSX.read(bytes, { type: "array" });
}

describe("workbook generation", () => {
  it("writes the standard sheets and preserves source text", () => {
    const result = compareSheets({
      fileA: table(["reference", "amount", "note"], [["INV-1", "฿1,000.00", ""], ["INV-2", 50, "keep me"]]),
      fileB: table(["reference", "amount"], [["inv-1", 1000], ["INV-3", 5]]),
      referenceA: "reference",
      amountA: "amount",
      dateA: null,
      referenceB: "reference",
      amountB: "amount",
      dateB: null,
      dateMatching: false,
    });
    const workbook = sheetsOf(buildWorkbookBytes(result));
    expect(workbook.SheetNames).toEqual(["Summary", "Matched", "Exceptions", "Only in A", "Only in B"]);
    const summary = XLSX.utils.sheet_to_json<{ Item: string; Value: string | number }>(workbook.Sheets.Summary);
    const byItem = Object.fromEntries(summary.map((row) => [row.Item, row.Value]));
    expect(byItem["Matched pairs"]).toBe(1);
    expect(byItem["Only in file A"]).toBe(1);
    expect(byItem["Only in file B"]).toBe(1);
    expect(byItem["Duplicate rows"]).toBe(0);
    const matched = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets.Matched);
    expect(matched[0]["Amount (A)"]).toBe("฿1,000.00");
    expect(matched[0]["Reference (A)"]).toBe("INV-1");
    const onlyA = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Only in A"]);
    expect(onlyA[0].Reference).toBe("INV-2");
    expect(onlyA[0].note).toBe("keep me");
  });

  it("adds a Duplicates sheet only when a reference repeats", () => {
    const result = compareSheets({
      fileA: table(["reference", "amount"], [["DUP", 10], ["DUP ", 12]]),
      fileB: table(["reference", "amount"], [["DUP", 10]]),
      referenceA: "reference",
      amountA: "amount",
      dateA: null,
      referenceB: "reference",
      amountB: "amount",
      dateB: null,
      dateMatching: false,
    });
    const workbook = sheetsOf(buildWorkbookBytes(result));
    expect(workbook.SheetNames).toContain("Duplicates");
    const duplicates = XLSX.utils.sheet_to_json<Record<string, string | number>>(workbook.Sheets.Duplicates);
    expect(duplicates).toHaveLength(3);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Matched)).toHaveLength(0);
    expect(duplicates.some((row) => row.Reference === "DUP ")).toBe(true);
  });
});
