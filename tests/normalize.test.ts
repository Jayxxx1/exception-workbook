import { describe, expect, it } from "vitest";
import { formatMoney, normalizeReference, parseAmount, parseDateKey } from "../src/normalize";

describe("reference normalization", () => {
  it("trims, ignores case, whitespace, and light punctuation", () => {
    expect(normalizeReference(" INV-9 ")).toBe("inv9");
    expect(normalizeReference("inv-9")).toBe(normalizeReference("INV 9"));
    expect(normalizeReference("INV/9")).toBe("inv9");
    expect(normalizeReference("\u00A0INV-9")).toBe("inv9");
  });

  it("normalizes unicode without fuzzy matching", () => {
    expect(normalizeReference("ＩＮＶ－９")).toBe("inv9");
    expect(normalizeReference("ORD1001")).not.toBe(normalizeReference("ORD1002"));
  });

  it("keeps digits from numeric cells", () => {
    expect(normalizeReference(10045)).toBe("10045");
    expect(normalizeReference("10045")).toBe("10045");
  });
});

describe("amount normalization", () => {
  it("accepts commas, currency symbols, and numeric strings", () => {
    expect(parseAmount("฿1,250.00")).toBe(parseAmount(1250));
    expect(parseAmount(" 1,250.50 ")).toBe(parseAmount("1250.50"));
    expect(parseAmount("฿ 1,250.00")).toBe(1250n * 10000n);
    expect(parseAmount("(1,250.00)")).toBe(-1250n * 10000n);
    expect(parseAmount("1.250,50")).toBe(parseAmount("1250.50"));
    expect(parseAmount("１２５０")).toBe(1250n * 10000n);
    expect(parseAmount(10)).toBe(parseAmount("10.00"));
  });

  it("rejects values that are not amounts", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("n/a")).toBeNull();
    expect(parseAmount("10.00001")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });

  it("formats exact minor units", () => {
    expect(formatMoney(12505000n)).toBe("1,250.50");
    expect(formatMoney(-7500n)).toBe("-0.75");
    expect(formatMoney(-1000n)).toBe("-0.10");
  });
});

describe("dates", () => {
  it("reads ISO and day/month/year", () => {
    expect(parseDateKey("2026-02-01")).toBe("2026-02-01");
    expect(parseDateKey("01/02/2026")).toBe("2026-02-01");
    expect(parseDateKey("31/02/2026")).toBeNull();
    expect(parseDateKey("February")).toBeNull();
  });
});
