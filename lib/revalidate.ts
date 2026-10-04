/**
 * Tells the storefront (a separate Next.js app) to drop its cached pages after
 * a save, so an edit shows up on the site without waiting for a revalidation
 * window. Configure with:
 *
 *   STOREFRONT_REVALIDATE_URL=https://storefront.example.com/api/revalidate
 *   STOREFRONT_REVALIDATE_SECRET=<same as the storefront's REVALIDATE_SECRET>
 *
 * The storefront decides which of its own routes to purge, so callers pass no
 * paths: it owns its route tree and needs `revalidatePath` route patterns,
 * which the admin cannot know reliably.
 *
 * Unset, saves still succeed but the storefront keeps serving its cached copy
 * until that copy expires on its own — which for a prerendered page means it
 * never catches up. Both variables must be set in the deployed environment.
 */
const PING_TIMEOUT_MS = 2000;

export type RevalidateResult = {
  /** False when the storefront was not pinged, or refused the ping. */
  ok: boolean;
  /** Why the purge did not happen, for logs and the admin's save feedback. */
  reason?: string;
};

export async function revalidateStorefront(): Promise<RevalidateResult> {
  const url = process.env.STOREFRONT_REVALIDATE_URL;

  if (!url) {
    const reason = "STOREFRONT_REVALIDATE_URL is not set.";

    console.warn(`[revalidate] ${reason} The site will keep serving stale pages.`);

    return { ok: false, reason };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const secret = process.env.STOREFRONT_REVALIDATE_SECRET;

  if (!secret) {
    const reason = "STOREFRONT_REVALIDATE_SECRET is not set.";

    console.warn(`[revalidate] ${reason} The storefront will reject the ping.`);

    return { ok: false, reason };
  }

  headers["x-revalidate-secret"] = secret;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });

    if (!response.ok) {
      const reason = `Storefront answered ${response.status}.`;

      console.warn(`[revalidate] ${reason} Check REVALIDATE_SECRET matches.`);

      return { ok: false, reason };
    }

    return { ok: true };
  } catch (error) {
    const reason = "Storefront did not answer.";

    console.warn(`[revalidate] ${reason}`, error);

    return { ok: false, reason };
  }
}
