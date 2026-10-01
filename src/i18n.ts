import type { RowStatus } from "./types";
import {
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_TH,
  SITE_H1,
  SITE_H1_TH,
  SITE_PRIVACY,
  SITE_PRIVACY_TH,
} from "../site.config";

export type Locale = "en" | "th";

export type MessageKey =
  | "wordmark"
  | "formats"
  | "h1"
  | "lede"
  | "privacy"
  | "step1"
  | "step2"
  | "step3"
  | "step4"
  | "fileA"
  | "fileB"
  | "noFileYet"
  | "dropHint"
  | "dataRows"
  | "firstSheetNote"
  | "reference"
  | "amount"
  | "date"
  | "chooseColumn"
  | "noDate"
  | "requireDates"
  | "rule"
  | "dateFormat"
  | "dateFormatAuto"
  | "dateFormatDmy"
  | "dateFormatMdy"
  | "compare"
  | "working"
  | "download"
  | "trySample"
  | "tryThaiSample"
  | "summary"
  | "category"
  | "rows"
  | "amountCol"
  | "matchedPairs"
  | "amountMismatches"
  | "onlyInA"
  | "onlyInB"
  | "duplicateRows"
  | "dateMismatches"
  | "required"
  | "notRequired"
  | "fileATotal"
  | "fileBTotal"
  | "net"
  | "preview"
  | "status"
  | "difference"
  | "rowA"
  | "rowB"
  | "footer"
  | "whatTitle"
  | "whatBody"
  | "howTitle"
  | "how1"
  | "how2"
  | "how3"
  | "how4"
  | "faqTitle"
  | "faqOnlineQ"
  | "faqOnlineA"
  | "faqCsvQ"
  | "faqCsvA"
  | "faqUploadQ"
  | "faqUploadA"
  | "faqUnmatchedQ"
  | "faqUnmatchedA"
  | "faqAmountQ"
  | "faqAmountA"
  | "loadBothFirst"
  | "sampleFail"
  | "allMatched"
  | "noneMatched"
  | "langEnglish"
  | "langThai";

const EN: Record<MessageKey, string> = {
  wordmark: "Exception Workbook",
  formats: ".xlsx · .xls · .csv",
  h1: SITE_H1,
  lede: `${SITE_DESCRIPTION} Load file A and file B, confirm the columns, and download the report.`,
  privacy: SITE_PRIVACY,
  step1: "Load file A and file B.",
  step2: "Confirm the reference, amount, and optional date.",
  step3: "Compare. Matching is exact after light cleanup.",
  step4: "Download the Excel exception report.",
  fileA: "File A",
  fileB: "File B",
  noFileYet: "No file yet",
  dropHint: "Drop an .xlsx, .xls, or .csv file, or click to browse",
  dataRows: "data rows",
  firstSheetNote: "Using the first sheet, “{sheet}”. Other sheets are ignored.",
  reference: "Reference",
  amount: "Amount",
  date: "Date",
  chooseColumn: "Choose a column",
  noDate: "Do not use a date",
  requireDates: "Require dates to match",
  rule: "Rows match when the reference and the amount match. Dates are shown either way. Duplicate references are listed and never merged.",
  dateFormat: "Date format",
  dateFormatAuto: "Auto (unambiguous dates only)",
  dateFormatDmy: "Day / month / year",
  dateFormatMdy: "Month / day / year",
  compare: "Compare files",
  working: "Working…",
  download: "Download workbook",
  trySample: "Try with sample files",
  tryThaiSample: "Try Thai sample",
  summary: "Summary",
  category: "Category",
  rows: "Rows",
  amountCol: "Amount",
  matchedPairs: "Matched pairs",
  amountMismatches: "Amount mismatches",
  onlyInA: "Only in file A",
  onlyInB: "Only in file B",
  duplicateRows: "Duplicate rows",
  dateMismatches: "Date mismatches",
  required: "Required",
  notRequired: "Not required",
  fileATotal: "File A total",
  fileBTotal: "File B total",
  net: "Net A−B",
  preview: "Preview",
  status: "Status",
  difference: "Difference",
  rowA: "Row A",
  rowB: "Row B",
  footer: "Up to {rows} rows and {mb} MB per file. The first sheet in each workbook is used. No account.",
  whatTitle: "What can you compare?",
  whatBody: "Orders vs payments, invoices vs transactions, two CSV exports, customer lists, inventory lists, and accounting spreadsheets. Match on a reference and an amount, then download the exceptions.",
  howTitle: "How it works",
  how1: "Upload two Excel or CSV files.",
  how2: "Choose the reference and amount columns.",
  how3: "Compare the files.",
  how4: "Download the Excel exception report.",
  faqTitle: "FAQ",
  faqOnlineQ: "Can I compare two Excel files online?",
  faqOnlineA: "Yes. Open the page, load two .xlsx, .xls, or .csv files, choose the columns, and compare. No account is required.",
  faqCsvQ: "Can I compare CSV files?",
  faqCsvA: "Yes. CSV is supported, and you can compare a CSV file against an Excel file.",
  faqUploadQ: "Does this upload my files?",
  faqUploadA: "No. Files are read in your browser and never uploaded. Closing the tab clears the session.",
  faqUnmatchedQ: "Can it find unmatched rows?",
  faqUnmatchedA: "Yes. Rows only in file A, only in file B, amount mismatches, and duplicate references are listed separately.",
  faqAmountQ: "Can it compare amounts?",
  faqAmountA: "Yes. Amounts are normalized for currency symbols and common number formatting, then compared exactly. There is no fuzzy amount match.",
  loadBothFirst: "Load file A and file B first.",
  sampleFail: "The sample files could not be loaded. Refresh the page and try again.",
  allMatched: "All rows matched. Every reference agreed, every amount agreed, and no duplicates were left over.",
  noneMatched: "No rows matched. A match needs the same reference and the same amount. The workbook lists the rest.",
  langEnglish: "English",
  langThai: "ไทย",
};

const TH: Record<MessageKey, string> = {
  wordmark: "Exception Workbook",
  formats: ".xlsx · .xls · .csv",
  h1: SITE_H1_TH,
  lede: `${SITE_DESCRIPTION_TH} โหลดไฟล์ A และไฟล์ B ตรวจคอลัมน์ แล้วดาวน์โหลดรายงาน`,
  privacy: SITE_PRIVACY_TH,
  step1: "โหลดไฟล์ A และไฟล์ B",
  step2: "ยืนยันคอลัมน์อ้างอิง ยอดเงิน และวันที่ (ถ้ามี)",
  step3: "เปรียบเทียบ การจับคู่เป็นแบบตรงหลังทำความสะอาดเล็กน้อย",
  step4: "ดาวน์โหลดรายงาน Exception เป็น Excel",
  fileA: "ไฟล์ A",
  fileB: "ไฟล์ B",
  noFileYet: "ยังไม่มีไฟล์",
  dropHint: "วางไฟล์ .xlsx .xls หรือ .csv หรือคลิกเพื่อเลือก",
  dataRows: "แถวข้อมูล",
  firstSheetNote: "ใช้ชีตแรก “{sheet}” ชีตอื่นจะถูกข้าม",
  reference: "อ้างอิง",
  amount: "ยอดเงิน",
  date: "วันที่",
  chooseColumn: "เลือกคอลัมน์",
  noDate: "ไม่ใช้วันที่",
  requireDates: "บังคับให้วันที่ตรงกัน",
  rule: "แถวจะตรงกันเมื่อรหัสอ้างอิงและยอดเงินตรงกัน วันที่แสดงเสมอ รหัสซ้ำจะถูกแยกและไม่ถูกรวม",
  dateFormat: "รูปแบบวันที่",
  dateFormatAuto: "อัตโนมัติ (เฉพาะวันที่ที่ไม่กำกวม)",
  dateFormatDmy: "วัน / เดือน / ปี",
  dateFormatMdy: "เดือน / วัน / ปี",
  compare: "เปรียบเทียบไฟล์",
  working: "กำลังทำงาน…",
  download: "ดาวน์โหลดสมุดงาน",
  trySample: "ลองด้วยไฟล์ตัวอย่าง",
  tryThaiSample: "ลองตัวอย่างภาษาไทย",
  summary: "สรุป",
  category: "หมวด",
  rows: "แถว",
  amountCol: "ยอดเงิน",
  matchedPairs: "คู่ที่ตรงกัน",
  amountMismatches: "ยอดเงินไม่ตรง",
  onlyInA: "มีเฉพาะในไฟล์ A",
  onlyInB: "มีเฉพาะในไฟล์ B",
  duplicateRows: "แถวซ้ำ",
  dateMismatches: "วันที่ไม่ตรง",
  required: "บังคับ",
  notRequired: "ไม่บังคับ",
  fileATotal: "ยอดรวมไฟล์ A",
  fileBTotal: "ยอดรวมไฟล์ B",
  net: "สุทธิ A−B",
  preview: "ตัวอย่าง",
  status: "สถานะ",
  difference: "ส่วนต่าง",
  rowA: "แถว A",
  rowB: "แถว B",
  footer: "สูงสุด {rows} แถว และ {mb} MB ต่อไฟล์ ใช้ชีตแรกของแต่ละไฟล์ ไม่มีบัญชีผู้ใช้",
  whatTitle: "เปรียบเทียบอะไรได้บ้าง",
  whatBody: "ใบสั่งกับยอดชำระ ใบแจ้งหนี้กับรายการโอน สองไฟล์ CSV รายชื่อลูกค้า สต็อก และสเปรดชีตบัญชี จับคู่ด้วยรหัสอ้างอิงและยอดเงิน แล้วดาวน์โหลดรายการที่ไม่ตรง",
  howTitle: "วิธีใช้",
  how1: "อัปโหลดไฟล์ Excel หรือ CSV สองไฟล์",
  how2: "เลือกคอลัมน์อ้างอิงและยอดเงิน",
  how3: "เปรียบเทียบไฟล์",
  how4: "ดาวน์โหลดรายงาน Exception เป็น Excel",
  faqTitle: "คำถามที่พบบ่อย",
  faqOnlineQ: "เปรียบเทียบไฟล์ Excel ออนไลน์ได้หรือไม่",
  faqOnlineA: "ได้ เปิดหน้านี้ โหลดไฟล์ .xlsx .xls หรือ .csv สองไฟล์ เลือกคอลัมน์ แล้วเปรียบเทียบ ไม่ต้องสมัครบัญชี",
  faqCsvQ: "เปรียบเทียบไฟล์ CSV ได้หรือไม่",
  faqCsvA: "ได้ รองรับ CSV และเปรียบเทียบ CSV กับ Excel ได้",
  faqUploadQ: "ระบบอัปโหลดไฟล์ของฉันหรือไม่",
  faqUploadA: "ไม่ ไฟล์ถูกอ่านในเบราว์เซอร์และไม่ถูกอัปโหลด ปิดแท็บแล้วข้อมูลในเซสชันจะหาย",
  faqUnmatchedQ: "หาแถวที่ไม่ตรงกันได้หรือไม่",
  faqUnmatchedA: "ได้ แถวที่มีเฉพาะในไฟล์ A หรือ B ยอดเงินไม่ตรง และรหัสซ้ำ จะถูกแยกไว้",
  faqAmountQ: "เปรียบเทียบยอดเงินได้หรือไม่",
  faqAmountA: "ได้ ยอดเงินถูกทำความสะอาดสัญลักษณ์สกุลเงินและรูปแบบตัวเลขทั่วไป แล้วเทียบแบบตรง ไม่มีการจับคู่แบบคลุมเครือ",
  loadBothFirst: "โหลดไฟล์ A และไฟล์ B ก่อน",
  sampleFail: "โหลดไฟล์ตัวอย่างไม่ได้ รีเฟรชหน้าแล้วลองใหม่",
  allMatched: "แถวทั้งหมดตรงกัน ทั้งรหัสอ้างอิงและยอดเงิน และไม่มีรหัสซ้ำเหลืออยู่",
  noneMatched: "ไม่มีแถวที่ตรงกัน การจับคู่ต้องใช้รหัสอ้างอิงและยอดเงินเดียวกัน สมุดงานแสดงส่วนที่เหลือ",
  langEnglish: "English",
  langThai: "ไทย",
};

export const STATUS_LABELS: Record<Locale, Record<RowStatus, string>> = {
  en: {
    MATCHED: "MATCHED",
    AMOUNT_MISMATCH: "AMOUNT MISMATCH",
    ONLY_IN_A: "ONLY IN FILE A",
    ONLY_IN_B: "ONLY IN FILE B",
    DUPLICATE: "DUPLICATE",
    DATE_MISMATCH: "DATE MISMATCH",
  },
  th: {
    MATCHED: "ตรงกัน",
    AMOUNT_MISMATCH: "ยอดเงินไม่ตรง",
    ONLY_IN_A: "มีเฉพาะในไฟล์ A",
    ONLY_IN_B: "มีเฉพาะในไฟล์ B",
    DUPLICATE: "ซ้ำ",
    DATE_MISMATCH: "วันที่ไม่ตรง",
  },
};

export const SHEET_NAMES: Record<Locale, Record<"summary" | "matched" | "exceptions" | "onlyA" | "onlyB" | "duplicates", string>> = {
  en: {
    summary: "Summary",
    matched: "Matched",
    exceptions: "Exceptions",
    onlyA: "Only in A",
    onlyB: "Only in B",
    duplicates: "Duplicates",
  },
  th: {
    summary: "สรุป",
    matched: "ตรงกัน",
    exceptions: "ข้อยกเว้น",
    onlyA: "เฉพาะใน A",
    onlyB: "เฉพาะใน B",
    duplicates: "ซ้ำ",
  },
};

export function t(locale: Locale, key: MessageKey, vars: Record<string, string | number> = {}): string {
  const template = (locale === "th" ? TH : EN)[key];
  return Object.entries(vars).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
}

export function statusLabel(locale: Locale, status: RowStatus): string {
  return STATUS_LABELS[locale][status];
}

export function detectLocale(pathname = typeof window === "undefined" ? "/" : window.location.pathname): Locale {
  return pathname === "/th" || pathname.startsWith("/th/") ? "th" : "en";
}

export function localePath(locale: Locale): string {
  return locale === "th" ? "/th/" : "/";
}
