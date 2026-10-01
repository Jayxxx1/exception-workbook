import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applySiteTokens,
  assertProductionOrigin,
  PLACEHOLDER_ORIGINS,
  renderRobotsTxt,
  renderSitemapXml,
  SITE_DESCRIPTION,
  SITE_H1,
  SITE_ORIGIN,
  SITE_PRIVACY,
  SITE_TITLE,
} from "../site.config";

describe("seo files", () => {
  it("publishes an English indexable page with the chosen title and privacy line", () => {
    const html = applySiteTokens(readFileSync(new URL("../index.html", import.meta.url), "utf8"), "en");
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain('lang="en"');
    expect(html).toContain(`<title>${SITE_TITLE}</title>`);
    expect(html).toContain(`<h1>${SITE_H1}</h1>`);
    expect(html).toContain(SITE_DESCRIPTION);
    expect(html).toContain(SITE_PRIVACY);
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/" />`);
    expect(html).toContain(`hreflang="en" href="${SITE_ORIGIN}/"`);
    expect(html).toContain(`hreflang="th" href="${SITE_ORIGIN}/th/"`);
    expect(html).toContain(`hreflang="x-default" href="${SITE_ORIGIN}/"`);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('"@type": "WebApplication"');
    expect(html).toContain("What can you compare?");
    expect(html.toLowerCase()).not.toContain("aggregaterating");
    expect(html.toLowerCase()).not.toContain("review");
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(SITE_PRIVACY).toBe("Your files are processed in your browser and never uploaded.");
  });

  it("publishes a Thai locale page with its own canonical", () => {
    const html = applySiteTokens(readFileSync(new URL("../th/index.html", import.meta.url), "utf8"), "th");
    expect(html).toContain('lang="th"');
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/th/" />`);
    expect(html).toContain("เปรียบเทียบอะไรได้บ้าง");
  });

  it("ships robots and a sitemap for English and Thai", () => {
    const robots = readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");
    const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
    expect(robots).toBe(renderRobotsTxt());
    expect(sitemap).toBe(renderSitemapXml());
    expect(sitemap.match(/<loc>/g)).toHaveLength(2);
    expect(sitemap).toContain(`${SITE_ORIGIN}/`);
    expect(sitemap).toContain(`${SITE_ORIGIN}/th/`);
    expect(robots).toContain("Allow: /");
  });

  it("rejects the example.com placeholder for production configuration", () => {
    expect(SITE_ORIGIN.toLowerCase()).not.toContain("example.com");
    for (const origin of PLACEHOLDER_ORIGINS) {
      expect(() => assertProductionOrigin(origin)).toThrow(/example\.com|placeholder|https/i);
    }
    expect(() => assertProductionOrigin("")).toThrow(/empty|origin/i);
    expect(assertProductionOrigin(SITE_ORIGIN)).toBe(SITE_ORIGIN);
  });
});
