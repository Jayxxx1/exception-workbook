export const ANALYTICS_EVENTS = [
  "page_view",
  "demo_started",
  "file_a_loaded",
  "file_b_loaded",
  "comparison_started",
  "comparison_completed",
  "export_downloaded",
  "comparison_failed",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

type AnalyticsSink = (event: AnalyticsEvent) => void;

declare global {
  var __EXCEPTION_WORKBOOK_ANALYTICS__: AnalyticsSink | undefined;
}

let pageViewSent = false;

/** No-op unless a sink is installed. The sink receives only the event name. */
export function track(event: AnalyticsEvent): void {
  const sink = globalThis.__EXCEPTION_WORKBOOK_ANALYTICS__;
  if (typeof sink !== "function") return;
  sink(event);
}

export function trackPageView(): void {
  if (pageViewSent) return;
  pageViewSent = true;
  track("page_view");
}
