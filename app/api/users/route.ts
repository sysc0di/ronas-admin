import { hashPassword, safeUserSelect } from "@/lib/auth";
import { authenticateAdmin, unauthorized } from "@/lib/admin-session";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await authenticateAdmin(request))) return unauthorized();

  const users = await prisma.user.findMany({
    select: safeUserSelect,
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ users });
}

export async function POST(request: Request) {
  if (!(await authenticateAdmin(request))) return unauthorized();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be valid JSON." }, { status: 400 });
  }

  const { username, password, role } = (body ?? {}) as {
    username?: unknown;
    password?: unknown;
    role?: unknown;
  };

  if (typeof username !== "string" || username.trim().length === 0) {
    return Response.json({ error: "username is required." }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8) {
    return Response.json(
      { error: "password is required and must be at least 8 characters." },
      { status: 400 },
    );
  }

  const userRole = role === undefined ? Role.USER : role;

  if (userRole !== Role.ADMIN && userRole !== Role.USER) {
    return Response.json(
      { error: `role must be one of: ${Object.values(Role).join(", ")}.` },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { username: username.trim() },
    select: { id: true },
  });

  if (existing) {
    return Response.json(
      { error: `Username "${username.trim()}" is already taken.` },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { username: username.trim(), passwordHash, role: userRole },
    select: safeUserSelect,
  });

  return Response.json({ user }, { status: 201 });
}
