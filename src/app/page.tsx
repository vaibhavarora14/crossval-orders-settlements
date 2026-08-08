"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = "pending" | "partially_paid" | "paid" | "overdue";
type Item = { description: string; quantity: number; unitPriceCents: number };
type Payment = { id: string; amountCents: number; paidAt: string; note?: string };
type Order = { id: string; customer: string; dueDate: string; lineItems: Item[]; payments: Payment[]; totals: { totalCents: number; paidCents: number; dueCents: number; status: Status } };

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const today = () => new Date().toISOString().slice(0, 10);
const newItem = (): Item => ({ description: "", quantity: 1, unitPriceCents: 0 });

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadOrders = async () => {
    const response = await fetch("/api/orders");
    if (!response.ok) { setAuthenticated(false); return; }
    const data = await response.json();
    setOrders(data.orders);
    setAuthenticated(true);
  };
  useEffect(() => { void loadOrders(); }, []);

  const summaries = useMemo(() => ({
    total: orders.reduce((sum, order) => sum + order.totals.totalCents, 0),
    outstanding: orders.reduce((sum, order) => sum + order.totals.dueCents, 0),
    overdue: orders.filter((order) => order.totals.status === "overdue").length
  }), [orders]);
  const visible = filter === "all" ? orders : orders.filter((order) => order.totals.status === filter);

  async function signIn(event: FormEvent, endpoint: "login" | "signup") {
    event.preventDefault(); setNotice("");
    const response = await fetch(`/api/auth/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.error); return; }
    setPassword(""); setNotice(endpoint === "signup" ? "Account created. Your settlement workspace is ready." : "Welcome back.");
    await loadOrders();
  }

  async function createOrder(payload: { customer: string; dueDate: string; lineItems: Item[] }) {
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setShowCreate(false); setNotice("Order created."); await loadOrders();
  }

  async function recordPayment(order: Order, payment: { amountCents: number; paidAt: string; note: string }) {
    const response = await fetch(`/api/orders/${order.id}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payment) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setSelected(data.order); setNotice("Payment recorded. Status recalculated."); await loadOrders();
  }

  if (!authenticated) return <main className="auth-shell"><section className="auth-card"><Brand /><p className="eyebrow">CrossVal take-home</p><h1>Make every settlement visible.</h1><p className="muted">A focused order and payment workspace for finance teams.</p><form onSubmit={(event) => signIn(event, "login")}><label>Work email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="you@company.com" /></label><label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={8} placeholder="8+ characters" /></label><button className="primary" type="submit">Sign in</button><button className="text-button" type="button" onClick={(event) => signIn(event as unknown as FormEvent, "signup")}>New here? Create an account</button></form>{notice && <p className="notice">{notice}</p>}<p className="small">Demo note: data is held in the live server’s memory for this take-home deployment.</p></section></main>;

  return <main><header><Brand /><div className="header-actions"><span className="workspace">Settlement workspace</span><button className="primary" onClick={() => setShowCreate(true)}>+ New order</button></div></header><section className="hero"><div><p className="eyebrow">August overview</p><h1>Orders, without the settlement fog.</h1><p className="muted">Track what is due, what is paid, and what needs attention.</p></div><div className="summary-grid"><Metric label="Order value" value={money(summaries.total)} /><Metric label="Outstanding" value={money(summaries.outstanding)} /><Metric label="Past due" value={`${summaries.overdue} order${summaries.overdue === 1 ? "" : "s"}`} danger={summaries.overdue > 0} /></div></section>{notice && <p className="notice page-notice">{notice}</p>}<section className="table-section"><div className="toolbar"><div><p className="eyebrow">Orders</p><h2>Your settlement queue</h2></div><div className="filters" role="group" aria-label="Filter orders">{(["all", "pending", "partially_paid", "paid", "overdue"] as const).map((status) => <button key={status} className={filter === status ? "filter active" : "filter"} onClick={() => setFilter(status)}>{status.replace("_", " ")}</button>)}</div></div>{visible.length === 0 ? <div className="empty"><strong>No orders here yet.</strong><span>Create an order to start tracking its settlement.</span><button className="primary" onClick={() => setShowCreate(true)}>Create first order</button></div> : <div className="orders" role="list">{visible.map((order) => <button className="order-row" key={order.id} onClick={() => setSelected(order)} role="listitem"><span className="customer"><strong>{order.customer}</strong><small>Due {formatDate(order.dueDate)}</small></span><StatusBadge status={order.totals.status} /><span><small>Order total</small><strong>{money(order.totals.totalCents)}</strong></span><span><small>Amount paid</small><strong>{money(order.totals.paidCents)}</strong></span><span><small>Due</small><strong className={order.totals.dueCents ? "due" : ""}>{money(order.totals.dueCents)}</strong></span><span className="arrow">→</span></button>)}</div>}</section>{showCreate && <OrderForm onClose={() => setShowCreate(false)} onSubmit={createOrder} />}{selected && <OrderDetail order={selected} onClose={() => setSelected(null)} onPayment={recordPayment} />}</main>;
}

function Brand() { return <a className="brand" href="/"><span>l</span> Ledgerly</a>; }
function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) { return <div className={danger ? "metric danger" : "metric"}><small>{label}</small><strong>{value}</strong></div>; }
function StatusBadge({ status }: { status: Status }) { return <span className={`badge ${status}`}>{status.replace("_", " ")}</span>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }

function OrderForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (value: { customer: string; dueDate: string; lineItems: Item[] }) => Promise<void> }) {
  const [customer, setCustomer] = useState(""); const [dueDate, setDueDate] = useState(today()); const [items, setItems] = useState<Item[]>([newItem()]); const [error, setError] = useState(""); const total = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  const change = (index: number, update: Partial<Item>) => setItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
  async function submit(event: FormEvent) { event.preventDefault(); try { await onSubmit({ customer, dueDate, lineItems: items }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create order."); } }
  return <Modal title="Create order" onClose={onClose}><form onSubmit={submit}><div className="form-grid"><label>Customer<input required value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Acme Inc." /></label><label>Due date<input required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div><div className="line-head"><strong>Line items</strong><button type="button" className="text-button" onClick={() => setItems([...items, newItem()])}>+ Add line</button></div>{items.map((item, index) => <div className="line-item" key={index}><input aria-label={`Description ${index + 1}`} required value={item.description} onChange={(event) => change(index, { description: event.target.value })} placeholder="Description" /><input aria-label={`Quantity ${index + 1}`} required min="1" type="number" value={item.quantity} onChange={(event) => change(index, { quantity: Number(event.target.value) })} /><input aria-label={`Unit price ${index + 1}`} required min="0" step="0.01" type="number" value={item.unitPriceCents / 100} onChange={(event) => change(index, { unitPriceCents: Math.round(Number(event.target.value) * 100) })} /><button type="button" aria-label="Remove line item" disabled={items.length === 1} onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}<div className="form-total"><span>Order total</span><strong>{money(total)}</strong></div>{error && <p className="error">{error}</p>}<div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">Create order</button></div></form></Modal>;
}

function OrderDetail({ order, onClose, onPayment }: { order: Order; onClose: () => void; onPayment: (order: Order, payment: { amountCents: number; paidAt: string; note: string }) => Promise<void> }) {
  const [amount, setAmount] = useState(""); const [paidAt, setPaidAt] = useState(today()); const [note, setNote] = useState(""); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); try { await onPayment(order, { amountCents: Math.round(Number(amount) * 100), paidAt, note }); setAmount(""); setNote(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not record payment."); } }
  return <Modal title={order.customer} onClose={onClose}><div className="detail-top"><StatusBadge status={order.totals.status} /><div><small>Outstanding</small><strong>{money(order.totals.dueCents)}</strong></div></div><div className="detail-section"><h3>Order details</h3>{order.lineItems.map((item, index) => <div className="detail-line" key={index}><span>{item.description} <small>× {item.quantity}</small></span><strong>{money(item.quantity * item.unitPriceCents)}</strong></div>)}<div className="detail-line total"><span>Total</span><strong>{money(order.totals.totalCents)}</strong></div></div><div className="detail-section"><h3>Payment history</h3>{order.payments.length === 0 ? <p className="muted">No payments recorded.</p> : order.payments.map((payment) => <div className="detail-line" key={payment.id}><span>{formatDate(payment.paidAt)}<small>{payment.note || "Payment"}</small></span><strong>{money(payment.amountCents)}</strong></div>)}</div>{order.totals.dueCents > 0 && <form className="payment-form" onSubmit={submit}><h3>Record payment</h3><div className="form-grid"><label>Amount (USD)<input required min="0.01" max={order.totals.dueCents / 100} step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Date<input required type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} /></label></div><label>Note <span className="optional">optional</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. ACH transfer" /></label>{error && <p className="error">{error}</p>}<button className="primary" type="submit">Record payment</button></form>}<p className="small">Orders lock after their first payment to protect financial-document integrity.</p></Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="overlay" role="dialog" aria-modal="true" aria-label={title}><section className="modal"><div className="modal-header"><h2>{title}</h2><button aria-label="Close" onClick={onClose}>×</button></div>{children}</section></div>; }
