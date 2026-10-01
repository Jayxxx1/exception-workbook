import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS, track } from "../src/analytics";

describe("analytics", () => {
  afterEach(() => {
    delete globalThis.__EXCEPTION_WORKBOOK_ANALYTICS__;
  });

  it("is a no-op when no sink is installed", () => {
    expect(() => track("page_view")).not.toThrow();
  });

  it("sends only the event name", () => {
    const seen: unknown[][] = [];
    globalThis.__EXCEPTION_WORKBOOK_ANALYTICS__ = (...args) => {
      seen.push(args);
    };
    track("comparison_completed");
    expect(seen).toEqual([["comparison_completed"]]);
  });

  it("calls only the allowed event names", () => {
    const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    const analytics = readFileSync(new URL("../src/analytics.ts", import.meta.url), "utf8");
    const calls = [...`${app}\n${analytics}`.matchAll(/track\(\s*"([^"]+)"\s*\)/g)].map((match) => match[1]);
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(ANALYTICS_EVENTS).toContain(call);
    for (const event of ANALYTICS_EVENTS) expect(`${app}\n${analytics}`).toContain(`"${event}"`);
    expect(app).not.toMatch(/track\(\s*(?!["'])/);
  });
});
