import { describe, expect, it } from "vitest";
import { compareSheets, summaryNote } from "../src/compare";
import { messageOf } from "../src/errors";
import { MAX_DATA_ROWS } from "../src/limits";
import type { ParsedSheet } from "../src/types";
import { table } from "./helpers";

function run(
  left: ParsedSheet,
  right: ParsedSheet,
  options: { dateMatching?: boolean; reference?: string; amount?: string; date?: string | null } = {},
) {
  const reference = options.reference ?? "reference";
  const amount = options.amount ?? "amount";
  const date = options.date === undefined ? (left.headers.includes("date") ? "date" : null) : options.date;
  return compareSheets({
    fileA: left,
    fileB: right,
    referenceA: reference,
    amountA: amount,
    dateA: date,
    referenceB: reference,
    amountB: amount,
    dateB: date,
    dateMatching: options.dateMatching ?? false,
  });
}

describe("compare", () => {
  it("matches an exact reference and amount", () => {
    const result = run(table(["reference", "amount"], [["INV-1", 100]]), table(["reference", "amount"], [["INV-1", 100]]));
    expect(result.matched).toHaveLength(1);
    expect(result.exceptions).toHaveLength(0);
    expect(summaryNote(result)).toMatch(/All rows matched/);
  });

  it("matches references that differ by whitespace, case, and punctuation", () => {
    const result = run(table(["reference", "amount"], [[" INV-9 ", 10]]), table(["reference", "amount"], [["inv-9", 10]]));
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].referenceA).toBe(" INV-9 ");
  });

  it("does not fuzzy match a nearby reference", () => {
    const result = run(table(["reference", "amount"], [["ORD1001", 10]]), table(["reference", "amount"], [["ORD1002", 10]]));
    expect(result.matched).toHaveLength(0);
    expect(result.onlyA).toHaveLength(1);
    expect(result.onlyB).toHaveLength(1);
  });

  it("matches amounts written as currency text and numbers", () => {
    const result = run(
      table(["reference", "amount"], [["A-1", "฿1,500.50"]]),
      table(["reference", "amount"], [["A-1", 1500.5]]),
    );
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].amountADisplay).toBe("฿1,500.50");
  });

  it("classifies an amount mismatch and keeps the difference", () => {
    const result = run(table(["reference", "amount"], [["A-1", 1000]]), table(["reference", "amount"], [["A-1", 900]]));
    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0].status).toBe("AMOUNT_MISMATCH");
    expect(result.exceptions[0].differenceMinor).toBe(100n * 10000n);
    expect(result.matched).toHaveLength(0);
  });

  it("lists a row missing from file A", () => {
    const result = run(table(["reference", "amount"], [["A-1", 10]]), table(["reference", "amount"], [["A-1", 10], ["B-9", 5]]));
    expect(result.onlyB.map((row) => row.referenceB)).toEqual(["B-9"]);
    expect(result.onlyA).toHaveLength(0);
  });

  it("lists a row missing from file B", () => {
    const result = run(table(["reference", "amount"], [["A-1", 10], ["A-2", 4]]), table(["reference", "amount"], [["A-1", 10]]));
    expect(result.onlyA.map((row) => row.referenceA)).toEqual(["A-2"]);
  });

  it("does not merge duplicate references", () => {
    const result = run(
      table(["reference", "amount"], [["DUP", 10], ["dup", 12]]),
      table(["reference", "amount"], [["DUP", 10]]),
    );
    expect(result.matched).toHaveLength(0);
    expect(result.exceptions).toHaveLength(0);
    expect(result.duplicates).toHaveLength(3);
    expect(result.duplicates.map((row) => row.file)).toEqual(["A", "A", "B"]);
  });

  it("rejects a malformed amount without echoing the bad text", () => {
    expect(() => run(table(["reference", "amount"], [["A-1", "n/a"]]), table(["reference", "amount"], [["A-1", 1]]))).toThrow(
      /not amounts/,
    );
    try {
      run(table(["reference", "amount"], [["A-1", "n/a"]]), table(["reference", "amount"], [["A-1", 1]]));
    } catch (error) {
      const message = messageOf(error);
      expect(message).not.toContain("n/a");
      expect(message).not.toMatch(/\.tsx?:\d+/);
    }
  });

  it("matches mixed number and string types", () => {
    const result = run(table(["reference", "amount"], [[10045, 1500]]), table(["reference", "amount"], [["10045", "1,500.00"]]));
    expect(result.matched).toHaveLength(1);
  });

  it("matches different dates unless date matching is on", () => {
    const left = table(["reference", "amount", "date"], [["A-1", 10, "2026-02-01"]]);
    const right = table(["reference", "amount", "date"], [["A-1", 10, "03/02/2026"]]);
    expect(run(left, right).matched).toHaveLength(1);
    const dated = run(left, right, { dateMatching: true });
    expect(dated.matched).toHaveLength(0);
    expect(dated.exceptions[0].status).toBe("DATE_MISMATCH");
  });

  it("reports an unreadable date when date matching is on", () => {
    const left = table(["reference", "amount", "date"], [["A-1", 10, "next week"]]);
    const right = table(["reference", "amount", "date"], [["A-1", 10, "2026-02-01"]]);
    expect(() => run(left, right, { dateMatching: true })).toThrow(/not dates/);
  });

  it("says when nothing matched", () => {
    const result = run(table(["reference", "amount"], [["A-1", 10]]), table(["reference", "amount"], [["B-1", 10]]));
    expect(summaryNote(result)).toMatch(/No rows matched/);
  });

  it("uses manually chosen columns", () => {
    const result = run(table(["Foo", "Bar"], [["A-1", 5]]), table(["Foo", "Bar"], [["A-1", 5]]), {
      reference: "Foo",
      amount: "Bar",
      date: null,
    });
    expect(result.matched).toHaveLength(1);
  });

  it("rejects the same column used twice", () => {
    expect(() =>
      run(table(["Foo"], [["A-1"]]), table(["Foo"], [["A-1"]]), { reference: "Foo", amount: "Foo", date: null }),
    ).toThrow(/same column twice/);
  });

  it("refuses more rows than the limit", () => {
    const rows = Array.from({ length: MAX_DATA_ROWS + 1 }, (_, index) => ({
      rowNumber: index + 2,
      cells: {},
    }));
    const sheet: ParsedSheet = { fileName: "big.csv", sheetName: "Sheet1", sheetCount: 1, headers: ["reference"], rows };
    expect(() =>
      compareSheets({
        fileA: sheet,
        fileB: table(["reference", "amount"], [["A", 1]]),
        referenceA: "reference",
        amountA: "reference",
        dateA: null,
        referenceB: "reference",
        amountB: "amount",
        dateB: null,
        dateMatching: false,
      }),
    ).toThrow(/8,000/);
  });
});
