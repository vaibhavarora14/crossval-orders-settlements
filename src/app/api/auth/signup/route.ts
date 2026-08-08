import { createSession, createUser } from "@/lib/store";
import { jsonError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const user = createUser(String(email ?? ""), String(password ?? ""));
    const response = Response.json({ email: user.email }, { status: 201 });
    response.headers.append("Set-Cookie", `crossval_session=${createSession(user.id)}; Path=/; HttpOnly; SameSite=Lax`);
    return response;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create account.");
  }
}
