/**
 * Tells the storefront (a separate Next.js app) to drop its cached pages after
 * a CMS save. Configure with:
 *
 *   STOREFRONT_REVALIDATE_URL=https://storefront.example.com/api/revalidate
 *   STOREFRONT_REVALIDATE_SECRET=<same as the storefront's REVALIDATE_SECRET>
 *
 * Unset in local dev, where the storefront always renders fresh.
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
    await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ paths }),
      cache: "no-store",
    });
  } catch {
    /* A failed ping must never fail the save the admin just made. */
  }
}
