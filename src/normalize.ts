const LIGHT_PUNCTUATION = /[\s\u00A0\-_\.\/\\#,;:'"`~!?()[\]{}+|]+/gu;

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
  let text = input.normalize("NFKC").replace(/[\u00A0\u200B-\u200D\uFEFF]/g, "").trim();
  if (!text) return null;
  text = text.replace(/\s+/g, "");
  text = text.replace(/บาท$/i, "");
  text = text.replace(/^(?:THB|USD|EUR|GBP|JPY)/i, "");
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

export function parseDateKey(value: string): string | null {
  const text = value.normalize("NFKC").trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const dayFirst = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(text);
  const year = iso ? Number(iso[1]) : dayFirst ? Number(dayFirst[3]) : NaN;
  const month = iso ? Number(iso[2]) : dayFirst ? Number(dayFirst[2]) : NaN;
  const day = iso ? Number(iso[3]) : dayFirst ? Number(dayFirst[1]) : NaN;
  if (!iso && !dayFirst) return null;
  if (year < 1900 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}
