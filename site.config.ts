import site from "./site.config.json" with { type: "json" };

export const PLACEHOLDER_ORIGINS = ["https://example.com", "http://example.com", "example.com"];

function envOrigin(): string {
  if (typeof process === "undefined") return "";
  return String(process.env.SITE_ORIGIN || "").trim();
}

export function resolveOrigin(raw?: string): string {
  const value = raw !== undefined ? raw : envOrigin() || site.origin;
  return String(value || "").trim().replace(/\/$/, "");
}

function hostnameOf(origin: string): string {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function assertProductionOrigin(origin = resolveOrigin()): string {
  const value = resolveOrigin(origin);
  if (!value) {
    throw new Error(
      "Public origin is empty. Set site.config.json origin or SITE_ORIGIN to your real https origin before site-files/build/deploy.",
    );
  }
  const lower = value.toLowerCase();
  if (PLACEHOLDER_ORIGINS.some((item) => lower === item || lower.startsWith(`${item}/`)) || lower.includes("example.com")) {
    throw new Error("Origin still uses the example.com placeholder. Set the real public https origin.");
  }
  const host = hostnameOf(value);
  if (!host) throw new Error("Origin is not a valid URL. Use https://your-domain.tld with no trailing slash.");
  if (host === "example.com" || host.endsWith(".example.com")) {
    throw new Error("Origin must not use example.com.");
  }
  if (host === "test" || host.endsWith(".test")) {
    throw new Error("Origin uses a .test placeholder and is not deployable. Set the real public https origin.");
  }
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (isLocal) {
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value)) {
      throw new Error("Local preview origin must be http(s)://localhost[:port] or http(s)://127.0.0.1[:port].");
    }
    return value;
  }
  if (!/^https:\/\//i.test(value)) {
    throw new Error("Production origin must be an https URL with no trailing slash.");
  }
  return value;
}

let cachedOrigin: string | null = null;

export function getSiteOrigin(): string {
  if (!cachedOrigin) cachedOrigin = assertProductionOrigin();
  return cachedOrigin;
}

export function resetSiteOriginCache(): void {
  cachedOrigin = null;
}

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

function tokensFor(locale: HtmlLocale, origin: string): Record<string, string> {
  const path = locale === "th" ? "/th/" : "/";
  return {
    "%SITE_ORIGIN%": origin,
    "%SITE_NAME%": SITE_NAME,
    "%SITE_TITLE%": locale === "th" ? SITE_TITLE_TH : SITE_TITLE,
    "%SITE_H1%": locale === "th" ? SITE_H1_TH : SITE_H1,
    "%SITE_DESCRIPTION%": locale === "th" ? SITE_DESCRIPTION_TH : SITE_DESCRIPTION,
    "%SITE_PRIVACY%": locale === "th" ? SITE_PRIVACY_TH : SITE_PRIVACY,
    "%HTML_LANG%": locale,
    "%CANONICAL_PATH%": path,
    "%OG_LOCALE%": locale === "th" ? "th_TH" : "en_US",
    "%HREFLANG_BLOCK%": hreflangBlock(origin),
  };
}

function hreflangBlock(origin: string): string {
  return [
    `<link rel="alternate" hreflang="en" href="${origin}/" />`,
    `<link rel="alternate" hreflang="th" href="${origin}/th/" />`,
    `<link rel="alternate" hreflang="x-default" href="${origin}/" />`,
  ].join("\n    ");
}

export function applySiteTokens(html: string, locale: HtmlLocale = "en"): string {
  const origin = getSiteOrigin();
  return Object.entries(tokensFor(locale, origin)).reduce((text, [token, value]) => text.replaceAll(token, value), html);
}

export function renderRobotsTxt(origin = getSiteOrigin()): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export function renderSitemapXml(origin = getSiteOrigin()): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${origin}/</loc>\n  </url>\n  <url>\n    <loc>${origin}/th/</loc>\n  </url>\n</urlset>\n`;
}
