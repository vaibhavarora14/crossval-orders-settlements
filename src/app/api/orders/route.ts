import { jsonError, requireUserId } from "@/lib/api";
import { createOrder, listOrders } from "@/lib/store";
import { deriveOrderTotals, validateLineItems } from "@/lib/orders";

export async function GET() {
  try {
    const orders = listOrders(await requireUserId()).map((order) => ({ ...order, totals: deriveOrderTotals(order) }));
    return Response.json({ orders });
  } catch (error) {
    return jsonError("Sign in is required.", 401);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    if (!String(body.customer ?? "").trim()) return jsonError("Customer is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate ?? ""))) return jsonError("A valid due date is required.");
    validateLineItems(body.lineItems);
    const order = createOrder(userId, body);
    return Response.json({ order: { ...order, totals: deriveOrderTotals(order) } }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error && error.message === "UNAUTHORIZED" ? "Sign in is required." : error instanceof Error ? error.message : "Could not create order.", 401);
  }
}
