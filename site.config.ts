import site from "./site.config.json" with { type: "json" };

export const SITE_ORIGIN = site.origin.replace(/\/$/, "");
export const SITE_NAME = site.name;
export const SITE_TITLE = site.title;
export const SITE_H1 = site.h1;
export const SITE_DESCRIPTION = site.description;
export const SITE_PRIVACY = site.privacy;

const TOKENS: Record<string, string> = {
  "%SITE_ORIGIN%": SITE_ORIGIN,
  "%SITE_NAME%": SITE_NAME,
  "%SITE_TITLE%": SITE_TITLE,
  "%SITE_H1%": SITE_H1,
  "%SITE_DESCRIPTION%": SITE_DESCRIPTION,
  "%SITE_PRIVACY%": SITE_PRIVACY,
};

export function applySiteTokens(html: string): string {
  return Object.entries(TOKENS).reduce((text, [token, value]) => text.replaceAll(token, value), html);
}

export function renderRobotsTxt(origin = SITE_ORIGIN): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export function renderSitemapXml(origin = SITE_ORIGIN): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${origin}/</loc>\n  </url>\n</urlset>\n`;
}
