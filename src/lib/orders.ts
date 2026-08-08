export type OrderStatus = "pending" | "partially_paid" | "paid" | "overdue";

export type LineItem = {
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export type Payment = {
  id?: string;
  amountCents: number;
  paidAt: string;
  note?: string;
};

export type SettlementOrder = {
  dueDate: string;
  lineItems: LineItem[];
  payments: Payment[];
};

export type OrderTotals = {
  totalCents: number;
  paidCents: number;
  dueCents: number;
  status: OrderStatus;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function deriveOrderTotals(order: SettlementOrder, now = new Date()): OrderTotals {
  const totalCents = sum(order.lineItems.map((item) => item.quantity * item.unitPriceCents));
  const paidCents = sum(order.payments.map((payment) => payment.amountCents));
  const dueCents = totalCents - paidCents;
  const today = now.toISOString().slice(0, 10);

  if (dueCents === 0) return { totalCents, paidCents, dueCents, status: "paid" };
  if (order.dueDate < today) return { totalCents, paidCents, dueCents, status: "overdue" };
  if (paidCents > 0) return { totalCents, paidCents, dueCents, status: "partially_paid" };
  return { totalCents, paidCents, dueCents, status: "pending" };
}

export function validateLineItems(lineItems: LineItem[]) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) throw new Error("An order needs at least one line item.");
  for (const item of lineItems) {
    if (!item.description.trim()) throw new Error("Each line item needs a description.");
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error("Quantity must be a positive whole number.");
    if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0) throw new Error("Unit price must be a non-negative cent amount.");
  }
}

export function addPayment<T extends SettlementOrder>(order: T, payment: Payment): T {
  if (!Number.isInteger(payment.amountCents) || payment.amountCents <= 0) {
    throw new Error("Payment amount must be a positive whole number of cents.");
  }
  const { dueCents } = deriveOrderTotals(order);
  if (payment.amountCents > dueCents) {
    throw new Error(`Payment would exceed the remaining balance of ${dueCents} cents.`);
  }
  return { ...order, payments: [...order.payments, payment] };
}

export const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
