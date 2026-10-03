"use client";

/**
 * The only list call the storefront makes: one POST when the visitor submits
 * their locally stored list together with their contact details.
 */

export type OrderSubmission = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  notes?: string;
  currency?: string;
  items: { productId: string; quantity: number }[];
};

export type SubmitResult = {
  ok: boolean;
  orderId: string | null;
  errors: string[];
};

async function send(
  url: string,
  init?: RequestInit,
): Promise<SubmitResult> {
  const options: RequestInit = {
    credentials: "same-origin",
    cache: "no-store",
    headers: init?.body
      ? { "Content-Type": "application/json" }
      : undefined,
    ...init,
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, options);

      if (response.status >= 500 && attempt === 0) continue;

      let body: unknown = null;

      try {
        body = await response.json();
      } catch {
        return {
          ok: false,
          orderId: null,
          errors: ["Your list could not be sent. Please try again."],
        };
      }

      const payload = (body ?? {}) as Record<string, unknown>;

      const rawErrors =
        "errors" in payload && Array.isArray(payload.errors)
          ? (payload.errors as string[])
          : "error" in payload && typeof payload.error === "string"
            ? [payload.error]
            : [];

      const order =
        "order" in payload && payload.order
          ? (payload.order as { id?: string })
          : null;

      if (!response.ok || rawErrors.length > 0) {
        return {
          ok: false,
          orderId: null,
          errors:
            rawErrors.length > 0
              ? rawErrors
              : ["Your list could not be sent. Please try again."],
        };
      }

      return { ok: true, orderId: order?.id ?? null, errors: [] };
    } catch {
      if (attempt === 1) {
        return {
          ok: false,
          orderId: null,
          errors: ["Network error. Please check your connection."],
        };
      }
    }
  }

  return {
    ok: false,
    orderId: null,
    errors: ["Network error. Please check your connection."],
  };
}

export function submitOrder(submission: OrderSubmission) {
  return send("/api/orders", {
    method: "POST",
    body: JSON.stringify(submission),
  });
}