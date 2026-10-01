import react from "@vitejs/plugin-react";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import {
  applySiteTokens,
  assertProductionOrigin,
  getSiteOrigin,
  renderRobotsTxt,
  renderSitemapXml,
  resetSiteOriginCache,
  type HtmlLocale,
} from "./site.config";

function localeFromHtmlPath(path: string): HtmlLocale {
  return path.replace(/\\/g, "/").includes("/th/") ? "th" : "en";
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "site-tokens",
      transformIndexHtml: {
        order: "pre",
        handler(html, context) {
          return applySiteTokens(html, localeFromHtmlPath(context.path || context.filename || ""));
        },
      },
      buildStart() {
        if (process.env.VITEST) {
          process.env.SITE_ORIGIN ||= "http://127.0.0.1:4173";
          resetSiteOriginCache();
          return;
        }
        assertProductionOrigin();
      },
      closeBundle() {
        if (process.env.VITEST) return;
        const origin = getSiteOrigin();
        const outDir = resolve(__dirname, "dist");
        writeFileSync(resolve(outDir, "robots.txt"), renderRobotsTxt(origin));
        writeFileSync(resolve(outDir, "sitemap.xml"), renderSitemapXml(origin));
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        th: resolve(__dirname, "th/index.html"),
      },
    },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup-origin.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
});
