import { describe, expect, it } from "vitest";
import { detectLocale, localePath, statusLabel, t } from "../src/i18n";
import { SITE_H1, SITE_H1_TH } from "../site.config";

describe("localization", () => {
  it("defaults to English on the root path", () => {
    expect(detectLocale("/")).toBe("en");
    expect(detectLocale("/index.html")).toBe("en");
    expect(localePath("en")).toBe("/");
    expect(t("en", "h1")).toBe(SITE_H1);
    expect(t("en", "compare")).toBe("Compare files");
    expect(t("en", "fileA")).toBe("File A");
    expect(statusLabel("en", "AMOUNT_MISMATCH")).toBe("AMOUNT MISMATCH");
  });

  it("uses Thai only on the /th path", () => {
    expect(detectLocale("/th")).toBe("th");
    expect(detectLocale("/th/")).toBe("th");
    expect(localePath("th")).toBe("/th/");
    expect(t("th", "h1")).toBe(SITE_H1_TH);
    expect(t("th", "compare")).toBe("เปรียบเทียบไฟล์");
    expect(statusLabel("th", "AMOUNT_MISMATCH")).toBe("ยอดเงินไม่ตรง");
  });

  it("keeps English as the default locale after a root reload path", () => {
    expect(detectLocale("/")).toBe("en");
    expect(detectLocale("/th/")).not.toBe(detectLocale("/"));
  });
});
