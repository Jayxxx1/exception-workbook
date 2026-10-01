import { describe, expect, it } from "vitest";
import { detectColumns } from "../src/headers";

describe("header detection", () => {
  it("detects Thai order and amount headers", () => {
    expect(detectColumns(["เลขที่ใบสั่ง", "ลูกค้า", "ยอดเงิน", "วันที่", "ช่องทาง"])).toEqual({
      reference: "เลขที่ใบสั่ง",
      amount: "ยอดเงิน",
      date: "วันที่",
    });
    expect(detectColumns(["เลขที่อ้างอิง", "ผู้ชำระ", "จำนวนเงิน", "วันที่รับเงิน"])).toEqual({
      reference: "เลขที่อ้างอิง",
      amount: "จำนวนเงิน",
      date: "วันที่รับเงิน",
    });
  });

  it("detects English invoice, total, and order date columns", () => {
    expect(detectColumns(["Customer", "Invoice Number", "Total", "Order Date"])).toEqual({
      reference: "Invoice Number",
      amount: "Total",
      date: "Order Date",
    });
  });

  it("detects English order id, amount, and payment reference headers", () => {
    expect(detectColumns(["Order ID", "Customer", "Amount", "Date"])).toEqual({
      reference: "Order ID",
      amount: "Amount",
      date: "Date",
    });
    expect(detectColumns(["Payment Reference", "Payer", "Amount", "Date"])).toEqual({
      reference: "Payment Reference",
      amount: "Amount",
      date: "Date",
    });
    expect(detectColumns(["Transaction ID", "Paid", "Created At"])).toEqual({
      reference: "Transaction ID",
      amount: "Paid",
      date: "Created At",
    });
  });

  it("does not treat inventory as a reference", () => {
    expect(detectColumns(["Inventory", "Total"])).toEqual({
      reference: null,
      amount: "Total",
      date: null,
    });
  });
});
