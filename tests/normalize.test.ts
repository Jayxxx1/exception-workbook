import { describe, expect, it } from "vitest";
import {
  excelSerialFromDate,
  formatMoney,
  normalizeReference,
  parseAmount,
  parseDateKey,
  parseDateValue,
  parseExcelSerial,
} from "../src/normalize";

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
  it("accepts global currency symbols and numeric strings", () => {
    expect(parseAmount("$1,590.00")).toBe(parseAmount(1590));
    expect(parseAmount("€1,590.00")).toBe(parseAmount(1590));
    expect(parseAmount("£1,590.00")).toBe(parseAmount(1590));
    expect(parseAmount("¥1590")).toBe(parseAmount(1590));
    expect(parseAmount("฿1,590")).toBe(parseAmount(1590));
    expect(parseAmount("USD1,590.00")).toBe(parseAmount(1590));
    expect(parseAmount("AUD 1,590.00")).toBe(parseAmount(1590));
    expect(parseAmount("1 590,00")).toBe(parseAmount(1590));
    expect(parseAmount(" 1,250.50 ")).toBe(parseAmount("1250.50"));
    expect(parseAmount("(1,250.00)")).toBe(-1250n * 10000n);
    expect(parseAmount("1.250,50")).toBe(parseAmount("1250.50"));
    expect(parseAmount("１２５０")).toBe(1250n * 10000n);
    expect(parseAmount(10)).toBe(parseAmount("10.00"));
  });

  it("treats a single comma group of three digits as thousands, not a decimal", () => {
    expect(parseAmount("1,234")).toBe(1234n * 10000n);
    expect(parseAmount("1,234.00")).toBe(1234n * 10000n);
    expect(parseAmount("1,23")).toBe(parseAmount("1.23"));
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
  it("reads ISO dates", () => {
    expect(parseDateKey("2026-02-01")).toBe("2026-02-01");
  });

  it("reads day-first and month-first when the format is explicit", () => {
    expect(parseDateKey("01/02/2026", "dmy")).toBe("2026-02-01");
    expect(parseDateKey("01/02/2026", "mdy")).toBe("2026-01-02");
    expect(parseDateKey("13/02/2026", "auto")).toBe("2026-02-13");
    expect(parseDateKey("02/13/2026", "auto")).toBe("2026-02-13");
  });

  it("rejects ambiguous slash dates in auto mode", () => {
    expect(parseDateKey("01/02/2026", "auto")).toBeNull();
    expect(parseDateKey("31/02/2026", "dmy")).toBeNull();
    expect(parseDateKey("February")).toBeNull();
  });

  it("reads Excel serial dates", () => {
    const serial = excelSerialFromDate(new Date(Date.UTC(2026, 1, 1)));
    expect(parseExcelSerial(serial)).toBe("2026-02-01");
    expect(parseDateValue(serial, "auto")).toBe("2026-02-01");
    expect(parseDateValue(new Date(Date.UTC(2026, 1, 1)), "auto")).toBe("2026-02-01");
  });
});
