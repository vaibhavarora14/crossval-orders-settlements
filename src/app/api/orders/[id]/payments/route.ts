import { jsonError, requireUserId } from "@/lib/api";
import { getOrder, persistPayment } from "@/lib/store";
import { addPayment, deriveOrderTotals } from "@/lib/orders";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const order = getOrder(await requireUserId(), (await context.params).id);
    if (!order) return jsonError("Order not found.", 404);
    const body = await request.json();
    const candidate = { amountCents: Number(body.amountCents), paidAt: String(body.paidAt ?? ""), note: String(body.note ?? "") };
    addPayment(order, candidate);
    persistPayment(order, candidate);
    return Response.json({ order: { ...order, totals: deriveOrderTotals(order) } }, { status: 201 });
  } catch (error) { return jsonError(error instanceof Error ? error.message : "Could not record payment.", 400); }
}
