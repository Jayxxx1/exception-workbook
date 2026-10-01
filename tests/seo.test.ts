import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applySiteTokens,
  assertProductionOrigin,
  getSiteOrigin,
  PLACEHOLDER_ORIGINS,
  renderRobotsTxt,
  renderSitemapXml,
  SITE_DESCRIPTION,
  SITE_H1,
  SITE_PRIVACY,
  SITE_TITLE,
} from "../site.config";

describe("seo files", () => {
  it("publishes an English indexable page with the chosen title and privacy line", () => {
    const origin = getSiteOrigin();
    const html = applySiteTokens(readFileSync(new URL("../index.html", import.meta.url), "utf8"), "en");
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain('lang="en"');
    expect(html).toContain(`<title>${SITE_TITLE}</title>`);
    expect(html).toContain(`<h1>${SITE_H1}</h1>`);
    expect(html).toContain(SITE_DESCRIPTION);
    expect(html).toContain(SITE_PRIVACY);
    expect(html).toContain(`<link rel="canonical" href="${origin}/" />`);
    expect(html).toContain(`hreflang="en" href="${origin}/"`);
    expect(html).toContain(`hreflang="th" href="${origin}/th/"`);
    expect(html).toContain(`hreflang="x-default" href="${origin}/"`);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('"@type": "WebApplication"');
    expect(html).toContain("What can you compare?");
    expect(html.toLowerCase()).not.toContain("aggregaterating");
    expect(html.toLowerCase()).not.toContain("review");
    expect(html).not.toContain("example.com");
    expect(html).not.toMatch(/https?:\/\/[^"'/\s]+\.test\b/);
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(SITE_PRIVACY).toBe("Your files are processed in your browser and never uploaded.");
  });

  it("publishes a Thai locale page with its own canonical", () => {
    const origin = getSiteOrigin();
    const html = applySiteTokens(readFileSync(new URL("../th/index.html", import.meta.url), "utf8"), "th");
    expect(html).toContain('lang="th"');
    expect(html).toContain(`<link rel="canonical" href="${origin}/th/" />`);
    expect(html).toContain("เปรียบเทียบอะไรได้บ้าง");
    expect(html).not.toContain("example.com");
  });

  it("renders robots and a sitemap for English and Thai from the configured origin", () => {
    const origin = getSiteOrigin();
    const robots = renderRobotsTxt(origin);
    const sitemap = renderSitemapXml(origin);
    expect(robots).toContain("Allow: /");
    expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
    expect(sitemap.match(/<loc>/g)).toHaveLength(2);
    expect(sitemap).toContain(`${origin}/`);
    expect(sitemap).toContain(`${origin}/th/`);
    expect(robots).not.toContain("example.com");
    expect(sitemap).not.toContain(".test");
  });

  it("rejects empty, example.com, and .test origins for production configuration", () => {
    expect(getSiteOrigin().toLowerCase()).not.toContain("example.com");
    expect(getSiteOrigin().toLowerCase()).not.toMatch(/\.test$/);
    for (const origin of PLACEHOLDER_ORIGINS) {
      expect(() => assertProductionOrigin(origin)).toThrow(/example\.com|placeholder|https|empty|origin/i);
    }
    expect(() => assertProductionOrigin("")).toThrow(/empty|origin/i);
    expect(() => assertProductionOrigin("https://exception-workbook.test")).toThrow(/\.test/);
    expect(() => assertProductionOrigin("http://files.example")).toThrow(/https|origin/i);
    expect(assertProductionOrigin("http://127.0.0.1:4173")).toBe("http://127.0.0.1:4173");
    expect(assertProductionOrigin("https://host.example")).toBe("https://host.example");
  });
});

