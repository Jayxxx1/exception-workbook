import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applySiteTokens, renderRobotsTxt, renderSitemapXml, SITE_DESCRIPTION, SITE_H1, SITE_ORIGIN, SITE_PRIVACY, SITE_TITLE } from "../site.config";

describe("seo files", () => {
  it("publishes one indexable page with the chosen title and privacy line", () => {
    const html = applySiteTokens(readFileSync(new URL("../index.html", import.meta.url), "utf8"));
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain(`<title>${SITE_TITLE}</title>`);
    expect(html).toContain(`<h1>${SITE_H1}</h1>`);
    expect(html).toContain(SITE_DESCRIPTION);
    expect(html).toContain(SITE_PRIVACY);
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/" />`);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('"@type": "WebApplication"');
    expect(html.toLowerCase()).not.toContain("aggregaterating");
    expect(html.toLowerCase()).not.toContain("review");
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(SITE_PRIVACY).toBe("Your files are processed in your browser and are not uploaded.");
  });

  it("ships robots and a one-url sitemap for the configured origin", () => {
    const robots = readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");
    const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
    expect(robots).toBe(renderRobotsTxt());
    expect(sitemap).toBe(renderSitemapXml());
    expect(sitemap.match(/<loc>/g)).toHaveLength(1);
    expect(sitemap).toContain(`${SITE_ORIGIN}/`);
    expect(robots).toContain("Allow: /");
  });
});
