import { describe, expect, it } from "vitest";
import { addPayment, deriveOrderTotals } from "./orders";

const baseOrder = {
  dueDate: "2026-08-12",
  lineItems: [
    { description: "Implementation", quantity: 1, unitPriceCents: 50000 },
    { description: "Configuration", quantity: 1, unitPriceCents: 50000 }
  ],
  payments: []
};

describe("order settlement rules", () => {
  it("derives the 1,000 USD order total and pending status", () => {
    expect(deriveOrderTotals(baseOrder, new Date("2026-08-08T00:00:00Z"))).toMatchObject({
      totalCents: 100000,
      paidCents: 0,
      dueCents: 100000,
      status: "pending"
    });
  });

  it("moves from partially paid to paid after complete settlement", () => {
    const partial = addPayment(baseOrder, { amountCents: 40000, paidAt: "2026-08-08", note: "Deposit" });
    expect(deriveOrderTotals(partial, new Date("2026-08-08T00:00:00Z"))).toMatchObject({
      paidCents: 40000,
      dueCents: 60000,
      status: "partially_paid"
    });
    const paid = addPayment(partial, { amountCents: 60000, paidAt: "2026-08-09" });
    expect(deriveOrderTotals(paid, new Date("2026-08-09T00:00:00Z"))).toMatchObject({
      dueCents: 0,
      status: "paid"
    });
  });

  it("rejects a payment that would exceed the order total", () => {
    const paid = addPayment(baseOrder, { amountCents: 100000, paidAt: "2026-08-08" });
    expect(() => addPayment(paid, { amountCents: 1, paidAt: "2026-08-08" })).toThrow(/exceed/i);
  });

  it("marks unpaid past-due orders overdue", () => {
    expect(deriveOrderTotals(baseOrder, new Date("2026-08-13T00:00:00Z"))).toMatchObject({ status: "overdue" });
  });
});
