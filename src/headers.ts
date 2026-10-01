import type { DetectedColumns } from "./types";

const MATCH_HINTS = [
  "order number",
  "order no",
  "order id",
  "invoice number",
  "invoice no",
  "invoice",
  "reference number",
  "reference no",
  "reference",
  "ref no",
  "document number",
  "document no",
  "เลขที่ใบสั่งซื้อ",
  "เลขที่ใบสั่ง",
  "เลขที่อ้างอิง",
  "เลขที่ใบแจ้งหนี้",
  "เลขที่เอกสาร",
  "เลขอ้างอิง",
  "ใบแจ้งหนี้",
  "อ้างอิง",
  "เลขที่",
  "order",
  "inv no",
];

const AMOUNT_HINTS = [
  "amount due",
  "total amount",
  "net amount",
  "grand total",
  "amount",
  "subtotal",
  "total",
  "ยอดเงินสุทธิ",
  "ยอดรวมทั้งสิ้น",
  "ยอดรวม",
  "จำนวนเงิน",
  "ยอดเงิน",
  "ยอดชำระ",
];

const DATE_HINTS = [
  "invoice date",
  "order date",
  "payment date",
  "posting date",
  "date",
  "วันที่รับเงิน",
  "วันที่ชำระ",
  "วันที่เอกสาร",
  "วันที่",
];

const MATCH_BLOCK = ["date", "วันที่", "amount", "total", "ยอดเงิน", "จำนวนเงิน", "subtotal"];
const AMOUNT_BLOCK = ["date", "วันที่", "qty", "quantity", "จำนวนชิ้น"];
const DATE_BLOCK = ["amount", "total", "ยอดเงิน", "จำนวนเงิน"];

function normHeader(header: string): string {
  return header
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hintScore(header: string, hint: string): number {
  if (header === hint) return 1000 + hint.length;
  const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(header)) return 800 + hint.length;
  if (hint.length >= 4 && header.includes(hint)) return 500 + hint.length;
  return 0;
}

function includesPhrase(header: string, phrases: string[]): boolean {
  return phrases.some((phrase) => header.includes(normHeader(phrase)));
}

function scoreList(header: string, hints: string[]): number {
  return hints.reduce((best, hint) => Math.max(best, hintScore(header, normHeader(hint))), 0);
}

function scoreRole(header: string, role: "match" | "amount" | "date"): number {
  const normalized = normHeader(header);
  if (!normalized) return 0;
  if (role === "match" && includesPhrase(normalized, MATCH_BLOCK)) return 0;
  if (role === "amount" && includesPhrase(normalized, AMOUNT_BLOCK)) return 0;
  if (role === "date" && includesPhrase(normalized, DATE_BLOCK)) return 0;
  const hints = role === "match" ? MATCH_HINTS : role === "amount" ? AMOUNT_HINTS : DATE_HINTS;
  return scoreList(normalized, hints);
}

export function detectColumns(headers: string[]): DetectedColumns {
  const roles = ["match", "amount", "date"] as const;
  const candidates = roles.flatMap((role) =>
    headers
      .map((header, index) => ({ role, header, index, score: scoreRole(header, role) }))
      .filter((item) => item.score > 0),
  );
  candidates.sort((a, b) => b.score - a.score || a.index - b.index);

  const usedHeaders = new Set<string>();
  const usedRoles = new Set<string>();
  const detected: DetectedColumns = { reference: null, amount: null, date: null };
  for (const candidate of candidates) {
    if (usedHeaders.has(candidate.header) || usedRoles.has(candidate.role)) continue;
    usedHeaders.add(candidate.header);
    usedRoles.add(candidate.role);
    if (candidate.role === "match") detected.reference = candidate.header;
    if (candidate.role === "amount") detected.amount = candidate.header;
    if (candidate.role === "date") detected.date = candidate.header;
  }
  return detected;
}
