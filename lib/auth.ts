import argon2 from "argon2";

import { prisma } from "@/lib/prisma";

import { Role } from "@/lib/generated/prisma/enums";

export { Role };

export type SafeUser = {
  id: string;
  username: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

export const safeUserSelect = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function hashPassword(password: string) {
  return argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function authenticateAdminBasic(
  request: Request,
): Promise<SafeUser | null> {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Basic ")) return null;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
  const separator = decoded.indexOf(":");

  if (separator === -1) return null;

  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);

  const user = await prisma.user.findUnique({
    where: { username },
    select: { ...safeUserSelect, passwordHash: true },
  });

  if (!user || user.role !== Role.ADMIN) return null;
  if (!(await verifyPassword(user.passwordHash, password))) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function basicChallenge() {
  return Response.json(
    { error: "Unauthorized. Admin credentials are required." },
    {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"' },
    },
  );
}
