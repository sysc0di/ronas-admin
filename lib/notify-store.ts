/**
 * Tells the storefront (a separate Next.js app) that an order was marked as
 * shipped, so it can email the customer. Email templates and SMTP live on the
 * storefront; the admin panel only pings it. Configure with:
 *
 *   STOREFRONT_NOTIFY_URL=https://storefront.example.com/api/orders/notify
 *   STOREFRONT_NOTIFY_SECRET=<same as the storefront's STORE_NOTIFY_SECRET>
 *
 * The call is fire-and-forget: a failed ping is logged here, the admin's own
 * save still succeeds, and the storefront's endpoint is idempotent per order,
 * so a later manual retry would be harmless.
 */
const PING_TIMEOUT_MS = 3000;

export async function notifyOrderShipped(
  orderId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const url = process.env.STOREFRONT_NOTIFY_URL;

  if (!url) {
    const reason = "STOREFRONT_NOTIFY_URL is not set.";

    console.warn(
      `[notify] ${reason} The customer will not receive a shipped email.`,
    );

    return { ok: false, reason };
  }

  const secret = process.env.STOREFRONT_NOTIFY_SECRET;

  if (!secret) {
    const reason = "STOREFRONT_NOTIFY_SECRET is not set.";

    console.warn(
      `[notify] ${reason} The storefront will reject the ping.`,
    );

    return { ok: false, reason };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-store-notify-secret": secret,
      },
      body: JSON.stringify({ orderId }),
      cache: "no-store",
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });

    if (!response.ok) {
      const reason = `Storefront answered ${response.status}.`;

      console.warn(`[notify] ${reason} Check STORE_NOTIFY_SECRET matches.`);

      return { ok: false, reason };
    }

    return { ok: true };
  } catch (error) {
    const reason = "Storefront did not answer.";

    console.warn(`[notify] ${reason}`, error);

    return { ok: false, reason };
  }
}