import { cookies } from "next/headers";
import { getUserIdForSession } from "./store";

export async function requireUserId() {
  const token = (await cookies()).get("crossval_session")?.value;
  const userId = getUserIdForSession(token);
  if (!userId) throw new Error("UNAUTHORIZED");
  return userId;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
