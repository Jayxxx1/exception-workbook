import site from "./site.config.json" with { type: "json" };

export const PLACEHOLDER_ORIGINS = ["https://example.com", "http://example.com", "example.com"];

export function resolveOrigin(raw = site.origin): string {
  return String(raw || "").trim().replace(/\/$/, "");
}

export function assertProductionOrigin(origin = resolveOrigin()): string {
  const value = resolveOrigin(origin);
  if (!value) throw new Error("site.config.json origin is empty. Set a public https origin before deploy.");
  const lower = value.toLowerCase();
  if (PLACEHOLDER_ORIGINS.some((item) => lower === item || lower.startsWith(`${item}/`))) {
    throw new Error("site.config.json still uses the example.com placeholder. Set the real public https origin.");
  }
  if (lower.includes("example.com")) {
    throw new Error("site.config.json origin must not use example.com.");
  }
  if (!/^https:\/\//i.test(value) && !/^http:\/\/localhost(?::\d+)?$/i.test(value) && !/^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(value)) {
    throw new Error("site.config.json origin must be an https URL (localhost http is allowed for local preview only).");
  }
  return value;
}

export const SITE_ORIGIN = assertProductionOrigin();
export const SITE_NAME = site.name;
export const SITE_TITLE = site.title;
export const SITE_H1 = site.h1;
export const SITE_DESCRIPTION = site.description;
export const SITE_PRIVACY = site.privacy;
export const SITE_TITLE_TH = site.titleTh;
export const SITE_H1_TH = site.h1Th;
export const SITE_DESCRIPTION_TH = site.descriptionTh;
export const SITE_PRIVACY_TH = site.privacyTh;

export type HtmlLocale = "en" | "th";

const TOKENS_EN: Record<string, string> = {
  "%SITE_ORIGIN%": SITE_ORIGIN,
  "%SITE_NAME%": SITE_NAME,
  "%SITE_TITLE%": SITE_TITLE,
  "%SITE_H1%": SITE_H1,
  "%SITE_DESCRIPTION%": SITE_DESCRIPTION,
  "%SITE_PRIVACY%": SITE_PRIVACY,
  "%HTML_LANG%": "en",
  "%CANONICAL_PATH%": "/",
  "%OG_LOCALE%": "en_US",
  "%HREFLANG_BLOCK%": hreflangBlock(),
};

const TOKENS_TH: Record<string, string> = {
  "%SITE_ORIGIN%": SITE_ORIGIN,
  "%SITE_NAME%": SITE_NAME,
  "%SITE_TITLE%": SITE_TITLE_TH,
  "%SITE_H1%": SITE_H1_TH,
  "%SITE_DESCRIPTION%": SITE_DESCRIPTION_TH,
  "%SITE_PRIVACY%": SITE_PRIVACY_TH,
  "%HTML_LANG%": "th",
  "%CANONICAL_PATH%": "/th/",
  "%OG_LOCALE%": "th_TH",
  "%HREFLANG_BLOCK%": hreflangBlock(),
};

function hreflangBlock(origin = SITE_ORIGIN): string {
  return [
    `<link rel="alternate" hreflang="en" href="${origin}/" />`,
    `<link rel="alternate" hreflang="th" href="${origin}/th/" />`,
    `<link rel="alternate" hreflang="x-default" href="${origin}/" />`,
  ].join("\n    ");
}

export function applySiteTokens(html: string, locale: HtmlLocale = "en"): string {
  const tokens = locale === "th" ? TOKENS_TH : TOKENS_EN;
  return Object.entries(tokens).reduce((text, [token, value]) => text.replaceAll(token, value), html);
}

export function renderRobotsTxt(origin = SITE_ORIGIN): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export function renderSitemapXml(origin = SITE_ORIGIN): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${origin}/</loc>\n  </url>\n  <url>\n    <loc>${origin}/th/</loc>\n  </url>\n</urlset>\n`;
}
