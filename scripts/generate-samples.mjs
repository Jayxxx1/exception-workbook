import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public");
const text = (value) => ({ t: "s", v: String(value) });
const num = (value) => ({ t: "n", v: value });

const customers = [
  "หจก. นภาวัสดุ",
  "บริษัท บ้านสวนบรรจุภัณฑ์ จำกัด",
  "ร้าน พีระอะไหล่",
  "บริษัท ลานนาเกษตร จำกัด",
  "หจก. ท่าเรือบรรทุก",
  "ร้าน สมชายการช่าง",
  "บริษัท ตะวันออกพลาสติก จำกัด",
  "หจก. เชียงรายอาหารแห้ง",
  "ร้าน วงศ์สว่างไฟฟ้า",
  "บริษัท แม่กลองประมง จำกัด",
  "หจก. ปากน้ำขนส่ง",
  "ร้าน อรุณเครื่องเขียน",
];
const banks = ["กสิกรไทย", "กรุงเทพ", "กรุงไทย", "ไทยพาณิชย์"];

function amountFor(index) {
  return 1000 + index * 75 + (index % 3) * 0.5;
}

function baht(amount) {
  const [whole, fraction] = amount.toFixed(2).split(".");
  return `฿${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}

function sheet(name, headers, records) {
  const worksheet = {};
  headers.forEach((header, column) => {
    worksheet[XLSX.utils.encode_cell({ r: 0, c: column })] = text(header);
  });
  records.forEach((record, row) => {
    record.forEach((cell, column) => {
      worksheet[XLSX.utils.encode_cell({ r: row + 1, c: column })] = cell;
    });
  });
  worksheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: records.length, c: headers.length - 1 },
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}

const orders = [];
const payments = [];

for (let index = 0; index < 30; index += 1) {
  const ref = `ORD-${24001 + index}`;
  const amount = amountFor(index);
  let orderRef = ref;
  let paymentRef = ref;
  let orderAmount = num(amount);
  let paymentAmount = num(amount);
  if (index % 6 === 0) orderRef = `${ref} `;
  if (index % 6 === 1) paymentRef = ref.toLowerCase();
  if (index % 6 === 2) orderRef = ref.replace("-", " ");
  if (index % 6 === 3) paymentAmount = text(baht(amount));
  if (index % 6 === 4) paymentAmount = text(amount.toFixed(2));
  if (index % 6 === 5) paymentRef = `\u00A0${ref}`;
  const customer = customers[index % customers.length];
  orders.push([
    text(orderRef),
    text(customer),
    orderAmount,
    text(index === 0 ? "2026-02-01" : "2026-03-15"),
    text(index % 2 === 0 ? "โอนธนาคาร" : "เงินสด"),
    text(index === 0 ? "ช่องว่างท้ายเลขที่" : ""),
  ]);
  payments.push([
    text(paymentRef),
    text(customer),
    paymentAmount,
    text(index === 0 ? "2026-02-03" : "2026-03-15"),
    text(banks[index % banks.length]),
    text(""),
  ]);
}

const matchedPayments = payments.splice(0, payments.length).reverse();

const mismatches = [
  ["ORD-24101", num(10000), num(9000)],
  ["ORD-24102", num(2500.5), text("฿2,000.50")],
  ["ORD-24103", text(" 1,500.00 "), num(1500.75)],
  ["ORD-24104", num(800), num(880)],
  ["ORD-24105", num(4200), text("4,200.10")],
  ["ORD-24106", text("฿3,300.00"), num(3000)],
];

mismatches.forEach(([ref, orderAmount, paymentAmount], index) => {
  const customer = customers[index % customers.length];
  orders.push([text(ref), text(customer), orderAmount, text("2026-03-20"), text("โอนธนาคาร"), text("")]);
  matchedPayments.push([text(ref), text(customer), paymentAmount, text("2026-03-20"), text(banks[index % banks.length]), text("")]);
});

for (let index = 0; index < 8; index += 1) {
  orders.push([
    text(`ORD-${24201 + index}`),
    text(customers[index % customers.length]),
    num(2100 + index * 10),
    text("2026-04-02"),
    text("เงินสด"),
    text(index === 0 ? "ค้างในไฟล์ใบสั่ง" : ""),
  ]);
}

for (let index = 0; index < 5; index += 1) {
  matchedPayments.push([
    text(`RCV-${24301 + index}`),
    text(customers[index % customers.length]),
    num(3100 + index * 10),
    text("2026-04-04"),
    text(banks[index % banks.length]),
    text(""),
  ]);
}

orders.push([text("ORD-24401"), text(customers[0]), num(500), text("2026-04-08"), text("โอนธนาคาร"), text("")]);
orders.push([text("ord 24401"), text(customers[1]), num(640), text("2026-04-08"), text("เงินสด"), text("")]);
orders.push([text("ORD-24402"), text(customers[2]), num(900), text("2026-04-09"), text("โอนธนาคาร"), text("")]);
matchedPayments.push([text("ORD-24402"), text(customers[2]), num(900), text("2026-04-09"), text("กสิกรไทย"), text("")]);
matchedPayments.push([text("ORD-24402 "), text(customers[2]), num(950), text("2026-04-09"), text("กรุงเทพ"), text("")]);

if (orders.length < 40 || orders.length > 80 || matchedPayments.length < 40 || matchedPayments.length > 80) {
  throw new Error(`Sample size out of range: ${orders.length} orders, ${matchedPayments.length} payments`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "sample-orders.xlsx"),
  sheet("Orders", ["เลขที่ใบสั่ง", "ลูกค้า", "ยอดเงิน", "วันที่", "ช่องทาง", "บันทึก"], orders),
);
writeFileSync(
  join(outDir, "sample-payments.xlsx"),
  sheet("Payments", ["เลขที่อ้างอิง", "ผู้ชำระ", "จำนวนเงิน", "วันที่รับเงิน", "ธนาคาร", "บันทึก"], matchedPayments),
);
console.log(`Wrote ${orders.length} orders and ${matchedPayments.length} payments`);
