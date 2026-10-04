import { locales } from "@/lib/i18n";

/**
 * The save is on the critical path and the storefront is a different origin, so
 * the ping gets a deadline: an unreachable storefront must not leave the admin
 * spinner hanging. A healthy ping answers in tens of milliseconds, so this only
 * bites when the storefront is down or wedged.
 */
const PING_TIMEOUT_MS = 2000;

/**
 * Tells the storefront (a separate Next.js app) to drop its cached pages after
 * a save, so an edit shows up on the site without waiting for a revalidation
 * window. Configure with:
 *
 *   STOREFRONT_REVALIDATE_URL=https://storefront.example.com/api/revalidate
 *   STOREFRONT_REVALIDATE_SECRET=<same as the storefront's REVALIDATE_SECRET>
 *
 * Unset, saves still succeed but the storefront keeps serving its cached copy
 * until that copy expires on its own.
 */
export async function revalidateStorefront(paths: string[] = ["/"]): Promise<void> {
  const url = process.env.STOREFRONT_REVALIDATE_URL;

  if (!url) return;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const secret = process.env.STOREFRONT_REVALIDATE_SECRET;

  if (secret) headers["x-revalidate-secret"] = secret;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ paths }),
      cache: "no-store",
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(
        `[revalidate] storefront answered ${response.status} for ${paths.join(", ")}`,
      );
    }
  } catch (error) {
    /* A failed ping must never fail the save the admin just made. */
    console.warn("[revalidate] storefront ping failed:", error);
  }
}

/**
 * Storefront paths a product write can change: the product page in every
 * language, plus each language root, which the storefront revalidates as a
 * layout so the store index and home page underneath it are rebuilt too. New
 * and old ids are both needed because a product can be renamed on save.
 */
export function productPaths(...productIds: (string | null | undefined)[]): string[] {
  const paths = new Set<string>();

  for (const locale of locales) {
    paths.add(`/${locale}`);
  }

  for (const id of productIds) {
    if (!id) continue;

    for (const locale of locales) {
      paths.add(`/${locale}/store/${encodeURIComponent(id)}`);
    }
  }

  return [...paths];
}
