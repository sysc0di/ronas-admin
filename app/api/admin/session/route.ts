import {
  authenticateAdmin,
  clearSessionCookie,
  createSessionToken,
  sessionCookie,
  unauthorized,
  verifyAdminCredentials,
} from "@/lib/admin-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await authenticateAdmin(request);

  if (!user) return unauthorized();

  return Response.json(
    {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { errors: ["Body must be valid JSON."] },
      { status: 400 },
    );
  }

  const username =
    typeof body === "object" && body !== null && "username" in body
      ? String((body as { username: unknown }).username ?? "").trim()
      : "";

  const password =
    typeof body === "object" && body !== null && "password" in body
      ? String((body as { password: unknown }).password ?? "")
      : "";

  if (!username || !password) {
    return Response.json(
      { errors: ["Username and password are required."] },
      { status: 400 },
    );
  }

  const user = await verifyAdminCredentials(username, password);

  if (!user) {
    return Response.json(
      { errors: ["Incorrect username or password."] },
      { status: 401 },
    );
  }

  const token = await createSessionToken(user);

  return Response.json(
    {
      user: { id: user.id, username: user.username, role: user.role },
    },
    {
      headers: {
        "Set-Cookie": sessionCookie(token),
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearSessionCookie() },
  });
}
