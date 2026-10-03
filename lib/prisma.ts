import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * One pool per process, on purpose.
 *
 * `new PrismaPg()` builds its own `pg` Pool, so constructing the client on every
 * module evaluation leaks pools — under dev HMR (or any re-import) the stacks
 * add up until the provider refuses new connections and queries start failing
 * with ETIMEDOUT. Both the adapter and the client are therefore cached on
 * globalThis, the only object that survives module re-evaluation.
 */

type PrismaGlobals = {
  prisma?: PrismaClient;
  adapter?: PrismaPg;
};

const globals = globalThis as typeof globalThis & PrismaGlobals;

function connectionString() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    throw new Error("DATABASE_URL is not set. Add it to your .env file.");
  }

  return value;
}

/**
 * Connection-level failures against a managed Postgres. The pooler recycles
 * sockets underneath us, so these surface at random and are safe to retry once
 * the client has reconnected.
 *
 * With the driver adapter a dropped socket arrives as a Prisma request error,
 * so this has to list both the raw Node/`pg` codes and the P-codes Prisma maps
 * them to (see the switch in the adapter's `convertDriverError`). `ETIMEDOUT`
 * in particular becomes `P1008`, which is exactly what an idle Neon pooler
 * socket or a cold start produces — and it used to slip through unretried.
 */
const TRANSIENT_CONNECTION_CODES = new Set([
  // Node / `pg` socket errors
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
  // Prisma's mapping of the above
  "P1001", // DatabaseNotReachable (ENOTFOUND / ECONNREFUSED)
  "P1002", // timed out reaching the database
  "P1008", // SocketTimeout (ETIMEDOUT)
  "P1011", // TlsConnectionError
  "P1017", // ConnectionClosed (ECONNRESET)
  "P1018", // TransactionAlreadyClosed
  "P2024", // connection pool timeout
  "P2034", // write conflict / deadlock
  "P2037", // TooManyConnections
]);

/**
 * The adapter reports a few connection failures as an opaque database error
 * with no recognizable code, so fall back to the message it wraps.
 */
const TRANSIENT_CONNECTION_MESSAGES = [
  "timeout exceeded when trying to connect",
  "connection terminated",
  "connection closed",
  "server closed the connection",
  "client network socket disconnected",
];

function isTransientConnectionError(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;

  if (typeof code === "string" && TRANSIENT_CONNECTION_CODES.has(code)) {
    return true;
  }

  const message = (error as { message?: unknown } | null)?.message;

  if (typeof message !== "string") return false;

  const normalized = message.toLowerCase();

  return TRANSIENT_CONNECTION_MESSAGES.some((fragment) =>
    normalized.includes(fragment),
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A cold Neon start can drop more than one socket before it stabilizes. */
const MAX_CONNECTION_ATTEMPTS = 3;

function createPrismaClient() {
  const adapter =
    globals.adapter ??
    new PrismaPg({
      connectionString: connectionString(),
      /* Serverless Postgres counts each socket against the project limit, so
         keep the pool small instead of piling up connections. */
      max: 5,
      /* Recycle idle sockets ourselves rather than handing a dead one to a
         request, which is what the pooler does behind our back. */
      idleTimeoutMillis: 30_000,
      /* A cold process pays for DNS plus TLS on its first query. */
      connectionTimeoutMillis: 30_000,
    });

  globals.adapter = adapter;

  return new PrismaClient({ adapter });
}

const base = globals.prisma ?? createPrismaClient();

/**
 * Retry transient connection failures. Without this a recycled or timed-out
 * socket turns into a user-visible 500 on an otherwise healthy request.
 *
 * Only connection-level codes qualify: a query that reached the server and
 * failed for another reason is re-thrown untouched, so a genuine query error
 * is never masked.
 */
export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, args, query }) {
        for (let attempt = 1; ; attempt += 1) {
          try {
            return await query(args);
          } catch (error) {
            if (
              !isTransientConnectionError(error) ||
              attempt >= MAX_CONNECTION_ATTEMPTS
            ) {
              throw error;
            }

            console.warn(
              `[prisma] retrying ${operation} after a dropped connection ` +
                `(attempt ${attempt}/${MAX_CONNECTION_ATTEMPTS}, ` +
                `${(error as { code?: string }).code ?? "no code"})`,
            );

            await delay(attempt * 250);
          }
        }
      },
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  globals.prisma = base;
}