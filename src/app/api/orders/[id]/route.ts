import { jsonError, requireUserId } from "@/lib/api";
import { deleteOrder, getOrder, updateOrder } from "@/lib/store";
import { deriveOrderTotals, validateLineItems } from "@/lib/orders";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const order = getOrder(await requireUserId(), (await context.params).id);
    return order ? Response.json({ order: { ...order, totals: deriveOrderTotals(order) } }) : jsonError("Order not found.", 404);
  } catch { return jsonError("Sign in is required.", 401); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const order = getOrder(await requireUserId(), (await context.params).id);
    if (!order) return jsonError("Order not found.", 404);
    const body = await request.json();
    if (!String(body.customer ?? "").trim()) return jsonError("Customer is required.");
    validateLineItems(body.lineItems);
    const updated = updateOrder(order, body);
    return Response.json({ order: { ...updated, totals: deriveOrderTotals(updated) } });
  } catch (error) { return jsonError(error instanceof Error ? error.message : "Could not update order.", 409); }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const order = getOrder(await requireUserId(), (await context.params).id);
    if (!order) return jsonError("Order not found.", 404);
    deleteOrder(order);
    return new Response(null, { status: 204 });
  } catch (error) { return jsonError(error instanceof Error ? error.message : "Could not delete order.", 409); }
}
