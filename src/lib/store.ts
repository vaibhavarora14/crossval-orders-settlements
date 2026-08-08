import { createHash, randomUUID } from "node:crypto";
import type { LineItem, Payment, SettlementOrder } from "./orders";

export type OrderRecord = SettlementOrder & {
  id: string;
  userId: string;
  customer: string;
  createdAt: string;
  updatedAt: string;
};

type User = { id: string; email: string; passwordHash: string };
type Data = { users: User[]; sessions: Map<string, string>; orders: OrderRecord[] };

const globalStore = globalThis as unknown as { crossvalStore?: Data };
const data: Data = globalStore.crossvalStore ?? { users: [], sessions: new Map<string, string>(), orders: [] };
globalStore.crossvalStore = data;

const hashPassword = (password: string) => createHash("sha256").update(password).digest("hex");

export function createUser(email: string, password: string) {
  if (!email.includes("@")) throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Password must have at least 8 characters.");
  const normalizedEmail = email.trim().toLowerCase();
  if (data.users.some((user) => user.email === normalizedEmail)) throw new Error("That email already has an account.");
  const user = { id: randomUUID(), email: normalizedEmail, passwordHash: hashPassword(password) };
  data.users.push(user);
  return user;
}

export function authenticate(email: string, password: string) {
  const user = data.users.find((candidate) => candidate.email === email.trim().toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) throw new Error("Invalid email or password.");
  return user;
}

export function createSession(userId: string) {
  const token = randomUUID();
  data.sessions.set(token, userId);
  return token;
}

export function getUserIdForSession(token?: string) {
  return token ? data.sessions.get(token) : undefined;
}

export function listOrders(userId: string) {
  return data.orders.filter((order) => order.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrder(userId: string, id: string) {
  return data.orders.find((order) => order.id === id && order.userId === userId);
}

export function createOrder(userId: string, payload: Pick<OrderRecord, "customer" | "dueDate" | "lineItems">) {
  const now = new Date().toISOString();
  const order: OrderRecord = {
    id: randomUUID(),
    userId,
    customer: payload.customer.trim(),
    dueDate: payload.dueDate,
    lineItems: payload.lineItems as LineItem[],
    payments: [],
    createdAt: now,
    updatedAt: now
  };
  data.orders.push(order);
  return order;
}

export function updateOrder(order: OrderRecord, payload: Pick<OrderRecord, "customer" | "dueDate" | "lineItems">) {
  if (order.payments.length > 0) throw new Error("Orders become read-only after the first payment to preserve settlement integrity.");
  order.customer = payload.customer.trim();
  order.dueDate = payload.dueDate;
  order.lineItems = payload.lineItems as LineItem[];
  order.updatedAt = new Date().toISOString();
  return order;
}

export function deleteOrder(order: OrderRecord) {
  if (order.payments.length > 0) throw new Error("Orders with payments cannot be deleted.");
  const index = data.orders.indexOf(order);
  if (index >= 0) data.orders.splice(index, 1);
}

export function persistPayment(order: OrderRecord, payment: Payment) {
  const saved = { ...payment, id: randomUUID() };
  order.payments.push(saved);
  order.updatedAt = new Date().toISOString();
  return saved;
}
