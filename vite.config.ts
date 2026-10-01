import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { applySiteTokens } from "./site.config";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "site-tokens",
      transformIndexHtml(html) {
        return applySiteTokens(html);
      },
    },
  ],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
});
