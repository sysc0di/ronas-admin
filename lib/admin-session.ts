import { createHmac, timingSafeEqual } from "node:crypto";

import {
  Role,
  type SafeUser,
  safeUserSelect,
  authenticateAdminBasic,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin sessions. The panel signs a short lived cookie with
 * ADMIN_SESSION_SECRET instead of asking the browser for Basic credentials on
 * every request, while the Basic challenge keeps working for scripts.
 */

export const SESSION_COOKIE = "ronas_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 12;

type SessionPayload = {
  sub: string;
  username: string;
  fingerprint: string;
  exp: number;
};

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;

  if (!value) {
    throw new Error("ADMIN_SESSION_SECRET is not set.");
  }

  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
}

/** Changing the password invalidates every existing session. */
function fingerprint(passwordHash: string) {
  return createHmac("sha256", "ronas-fingerprint")
    .update(passwordHash)
    .digest("base64url")
    .slice(0, 16);
}

export async function createSessionToken(user: {
  id: string;
  username: string;
  passwordHash: string;
}) {
  const payload: SessionPayload = {
    sub: user.id,
    username: user.username,
    fingerprint: fingerprint(user.passwordHash),
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | null | undefined) {
  if (!token) return null;

  const [encoded, signature] = token.split(".");

  if (!encoded || !signature) return null;

  const expected = Buffer.from(sign(encoded));
  const given = Buffer.from(signature);

  if (
    expected.length !== given.length ||
    !timingSafeEqual(expected, given)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getAdminFromToken(
  token: string | null | undefined,
): Promise<SafeUser | null> {
  const payload = verifySessionToken(token);

  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { ...safeUserSelect, passwordHash: true },
  });

  if (!user || user.role !== Role.ADMIN) return null;

  if (fingerprint(user.passwordHash) !== payload.fingerprint) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function readSessionToken(request: Request) {
  return (
    request.headers.get("x-admin-session") ??
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1) ??
    null
  );
}

/** Session cookie first, Basic credentials as the fallback for scripts. */
export async function authenticateAdmin(
  request: Request,
): Promise<SafeUser | null> {
  const fromSession = await getAdminFromToken(
    readSessionToken(request),
  );

  if (fromSession) return fromSession;

  return authenticateAdminBasic(request);
}

export function unauthorized() {
  /* No Basic challenge: the panel answers with a JSON 401 instead of a
     browser password dialog. */
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export function sessionCookie(token: string) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE}`,
  ];

  if (process.env.NODE_ENV === "production") parts.push("Secure");

  return parts.join("; ");
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Used by the login endpoint to check a username/password pair. */
export async function verifyAdminCredentials(
  username: string,
  password: string,
) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { ...safeUserSelect, passwordHash: true },
  });

  if (!user || user.role !== Role.ADMIN) return null;

  if (!(await verifyPassword(user.passwordHash, password))) return null;

  return user;
}