import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { applySiteTokens, assertProductionOrigin, type HtmlLocale } from "./site.config";

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
        assertProductionOrigin();
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
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
});
