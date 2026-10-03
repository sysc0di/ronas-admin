import {
  authenticateAdmin,
  clearSessionCookie,
  createSessionToken,
  sessionCookie,
  unauthorized,
} from "@/lib/admin-session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const admin = await authenticateAdmin(request);

  if (!admin) return unauthorized();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { errors: ["Body must be valid JSON."] },
      { status: 400 },
    );
  }

  const currentPassword =
    typeof body === "object" && body !== null && "currentPassword" in body
      ? String((body as { currentPassword: unknown }).currentPassword ?? "")
      : "";

  const newPassword =
    typeof body === "object" && body !== null && "newPassword" in body
      ? String((body as { newPassword: unknown }).newPassword ?? "")
      : "";

  const confirmPassword =
    typeof body === "object" && body !== null && "confirmPassword" in body
      ? String((body as { confirmPassword: unknown }).confirmPassword ?? "")
      : "";

  const errors: string[] = [];

  if (!currentPassword) {
    errors.push("Current password is required.");
  }

  if (newPassword.length < 8) {
    errors.push("New password must be at least 8 characters.");
  }

  if (newPassword !== confirmPassword) {
    errors.push("New passwords do not match.");
  }

  if (currentPassword && newPassword === currentPassword) {
    errors.push("New password must be different from the current one.");
  }

  const user = await prisma.user.findUnique({
    where: { id: admin.id },
    select: { passwordHash: true },
  });

  if (!user) return unauthorized();

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    return Response.json(
      { errors: ["Current password is incorrect."] },
      { status: 400 },
    );
  }

  if (errors.length > 0) {
    return Response.json({ errors }, { status: 422 });
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash },
  });

  /* Existing sessions are signed with a fingerprint of the old hash, so the
     panel issues a fresh cookie for this device and logs the others out. */
  const updated = await prisma.user.findUnique({
    where: { id: admin.id },
    select: { id: true, username: true, role: true, passwordHash: true },
  });

  if (!updated) {
    return new Response(null, {
      status: 204,
      headers: { "Set-Cookie": clearSessionCookie() },
    });
  }

  const token = await createSessionToken(updated);

  return Response.json(
    { user: { id: updated.id, username: updated.username } },
    {
      headers: {
        "Set-Cookie": sessionCookie(token),
        "Cache-Control": "no-store",
      },
    },
  );
}
