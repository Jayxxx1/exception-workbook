export type DateFormat = "auto" | "dmy" | "mdy";

const LIGHT_PUNCTUATION = /[\s\u00A0\-_\.\/\\#,;:'"`~!?()[\]{}+|]+/gu;
const CURRENCY_CODES = /^(?:THB|USD|EUR|GBP|JPY|AUD|CAD|SGD|NZD|INR|MYR|PHP|HKD|CNY|CHF|SEK|NOK|DKK|ZAR|MXN|BRL|KRW|IDR|VND)/i;

export function normalizeReference(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return normalizeReference(numberToReferenceText(value));
  }
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").toLowerCase().replace(LIGHT_PUNCTUATION, "");
}

function numberToReferenceText(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) return String(value);
  const text = String(value);
  if (!/[eE]/.test(text)) return text;
  return value.toFixed(8).replace(/\.?0+$/, "");
}

export function parseAmount(value: unknown): bigint | null {
  if (typeof value === "number") return numberToMinor(value);
  if (typeof value !== "string") return null;
  return stringToMinor(value);
}

function numberToMinor(value: number): bigint | null {
  if (!Number.isFinite(value)) return null;
  if (Math.abs(value) > 999_999_999_999) return null;
  return stringToMinor(value.toFixed(4));
}

function stringToMinor(input: string): bigint | null {
  let text = input.normalize("NFKC").replace(/[\u00A0\u202F\u200B-\u200D\uFEFF]/g, "").trim();
  if (!text) return null;
  text = text.replace(/\s+/g, "");
  text = text.replace(/บาท$/i, "");
  text = text.replace(CURRENCY_CODES, "");
  text = text.replace(/[฿$€£¥₩₽₹]/g, "");
  if (!text) return null;

  let negative = false;
  if (text.startsWith("(") && text.endsWith(")")) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith("+")) text = text.slice(1);
  else if (text.startsWith("-") || text.startsWith("−")) {
    negative = !negative;
    text = text.slice(1);
  }
  if (text.startsWith(".")) text = `0${text}`;
  if (!text) return null;

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");
  if (hasComma && hasDot) {
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) text = text.replace(/\./g, "").replace(",", ".");
    else text = text.replace(/,/g, "");
  } else if (hasComma) {
    const parts = text.split(",");
    if (parts.some((part) => part.length === 0)) return null;
    if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) text = `${parts[0]}.${parts[1]}`;
    else if (parts.slice(1).every((part) => part.length === 3)) text = parts.join("");
    else return null;
  }

  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  if (whole.length > 15 || fraction.length > 4) return null;
  const minor = BigInt(whole) * 10000n + BigInt((fraction + "0000").slice(0, 4));
  return negative ? -minor : minor;
}

export function formatMoney(minor: bigint): string {
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const whole = (absolute / 10000n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (absolute % 10000n).toString().padStart(4, "0");
  const extra = fraction.slice(2).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}.${fraction.slice(0, 2)}${extra}`;
}

export function minorToNumber(minor: bigint): number {
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const whole = Number(absolute / 10000n);
  const fraction = Number(absolute % 10000n) / 10000;
  return negative ? -(whole + fraction) : whole + fraction;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function ymd(year: number, month: number, day: number): string | null {
  if (year < 1900 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function fromParts(first: number, second: number, year: number, format: DateFormat): string | null {
  if (format === "dmy") return ymd(year, second, first);
  if (format === "mdy") return ymd(year, first, second);
  if (first > 12 && second <= 12) return ymd(year, second, first);
  if (second > 12 && first <= 12) return ymd(year, first, second);
  if (first === second) return ymd(year, first, second);
  return null;
}

/** Excel serial day count for the UTC calendar day of a Date. */
export function excelSerialFromDate(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000) + 25569;
}

export function parseExcelSerial(value: number): string | null {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
  if (value < 1 || value > 2958465) return null;
  const utc = new Date(Math.round((value - 25569) * 86400000));
  return ymd(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

export function parseDateKey(value: string, format: DateFormat = "auto"): string | null {
  const text = value.normalize("NFKC").trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return ymd(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const slash = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(text);
  if (!slash) return null;
  return fromParts(Number(slash[1]), Number(slash[2]), Number(slash[3]), format);
}

export function parseDateValue(value: unknown, format: DateFormat = "auto"): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return ymd(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === "number") return parseExcelSerial(value);
  if (typeof value !== "string") return null;
  const fromText = parseDateKey(value, format);
  if (fromText) return fromText;
  if (/^\d+$/.test(value.trim())) return parseExcelSerial(Number(value.trim()));
  return null;
}
