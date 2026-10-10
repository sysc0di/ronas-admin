import { randomInt, randomUUID } from "node:crypto";

import { OrderStatus } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { defaultLocale } from "@/lib/i18n";
import {
  decimalToNumber,
  effectivePrice,
  FALLBACK_CURRENCY,
  isCurrency,
  roundMoney,
  type Currency,
  type Money,
} from "@/lib/price";
import { pickTranslation } from "@/lib/product-text";
import { prisma } from "@/lib/prisma";

export const contactFields = [
  "email",
  "phone",
  "firstName",
  "lastName",
] as const;

export const adminStatuses = [
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.SUBMITTED,
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactField = (typeof contactFields)[number];

export type OrderPayload = Partial<Record<ContactField, string>> & {
  notes?: string;
};

export const orderInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        select: {
          id: true,
          image: true,
          family: true,
          category: true,
          visible: true,
          translations: {
            select: { locale: true, name: true },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const LIST_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";

/**
 * Liste uçları ziyaretçiye özeldir (jeton çerezde taşınır), bu yüzden
 * hiçbir önbellek tarafından saklanmamalı. Aksi hâlde tarayıcı, ilk
 * ziyaretteki boş listeyi sonraki ziyaretlerde yeniden kullanır ve
 * eklenen ürünler görünmez.
 */
export function listJson(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);

  headers.set("Cache-Control", LIST_CACHE_CONTROL);
  headers.set("Pragma", "no-cache");
  headers.append("Vary", "Cookie");

  return Response.json(data, { ...init, headers });
}

export function createToken() {
  return randomUUID();
}

/** No 0/O/1/I, so a code typed from the email is never ambiguous. */
const TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createTrackingCode(): string {
  let code = "";

  for (let index = 0; index < 8; index += 1) {
    code += TRACKING_ALPHABET[randomInt(TRACKING_ALPHABET.length)];
  }

  return `RC-${code}`;
}

/** The public order number must be unique; 10 tries cover any collision. */
export async function createUniqueTrackingCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = createTrackingCode();
    const existing = await prisma.order.findUnique({
      where: { trackingCode: code },
      select: { id: true },
    });

    if (!existing) return code;
  }

  return createTrackingCode();
}

export function serializeOrder(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
  const currency: Currency = isCurrency(order.currency)
    ? order.currency
    : FALLBACK_CURRENCY;

  const items = order.items.map((item) => {
    const unitUsd = decimalToNumber(item.unitPriceUsd);
    const unitTry = decimalToNumber(item.unitPriceTry);
    const regularUsd = decimalToNumber(item.regularPriceUsd);
    const regularTry = decimalToNumber(item.regularPriceTry);

    const unitPrice = currency === "USD" ? unitUsd : unitTry;
    const regularPrice = currency === "USD" ? regularUsd : regularTry;

    const lineTotal =
      unitPrice === null
        ? null
        : roundMoney(unitPrice * item.quantity);
    const lineRegular =
      regularPrice === null
        ? null
        : roundMoney(regularPrice * item.quantity);

    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      createdAt: item.createdAt,
      currency,
      unitPrice,
      regularPrice,
      lineTotal,
      lineRegular,
      product: item.product
        ? {
            id: item.product.id,
            name: pickTranslation(item.product.translations, defaultLocale)?.name ?? "",
            image: item.product.image,
            family: item.product.family,
            category: item.product.category,
            visible: item.product.visible,
          }
        : null,
    };
  });

  const subtotal = roundMoney(
    items.reduce(
      (sum, item) => sum + (item.lineRegular ?? item.lineTotal ?? 0),
      0,
    ),
  );

  const total = roundMoney(
    items.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0),
  );

  const discount = roundMoney(Math.max(subtotal - total, 0));

  return {
    id: order.id,
    trackingCode: order.trackingCode,
    email: order.email,
    phone: order.phone,
    firstName: order.firstName,
    lastName: order.lastName,
    notes: order.notes,
    status: order.status,
    currency,
    subtotal,
    discount,
    total,
    submittedAt: order.submittedAt,
    shippedAt: order.shippedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    items,
  };
}

export function parseContactPayload(
  body: unknown,
): { data: OrderPayload; errors?: undefined } | { data?: undefined; errors: string[] } {
  if (!isPlainObject(body)) {
    return { errors: ["Body must be a JSON object."] };
  }

  const errors: string[] = [];
  const data: OrderPayload = {};

  for (const field of contactFields) {
    const value = body[field];

    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`"${field}" must be a non-empty string.`);
      continue;
    }

    data[field] = value.trim();
  }

  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== "string") {
      errors.push('"notes" must be a string.');
    } else {
      data.notes = body.notes.trim();
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return { data };
}

export function validateContact(order: {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const missing: ContactField[] = [];

  for (const field of contactFields) {
    if (!order[field] || order[field].trim().length === 0) {
      missing.push(field);
    }
  }

  const errors: string[] = missing.map(
    (field) => `"${field}" is required before submitting the list.`,
  );

  if (order.email && !EMAIL_PATTERN.test(order.email)) {
    errors.push('"email" must be a valid email address.');
  }

  if (order.phone && order.phone.replace(/\D/g, "").length < 7) {
    errors.push('"phone" must contain at least 7 digits.');
  }

  return errors;
}

export type SubmissionItem = { productId: string; quantity: number };

export type OrderSubmission = OrderPayload & {
  items: SubmissionItem[];
  currency: Currency;
};

export const MAX_QUANTITY = 999;

/**
 * The storefront keeps the list in localStorage, so a submission arrives as
 * the whole list plus the contact details. Duplicated product ids are merged
 * instead of rejected, and the count of products is capped.
 */
export function parseSubmission(
  body: unknown,
): { data: OrderSubmission; errors?: undefined } | { data?: undefined; errors: string[] } {
  if (!isPlainObject(body)) {
    return { errors: ["Body must be a JSON object."] };
  }

  const errors: string[] = [];

  const contact = parseContactPayload(body);

  if (!contact.data) {
    errors.push(...contact.errors);
  }

  const rawCurrency =
    typeof body.currency === "string"
      ? body.currency.trim().toUpperCase()
      : "";
  const currency: Currency = isCurrency(rawCurrency)
    ? rawCurrency
    : FALLBACK_CURRENCY;

  const merged = new Map<string, number>();
  const rawItems = body.items;

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    errors.push('"items" must contain at least one product.');
  } else {
    if (rawItems.length > 100) {
      errors.push('"items" must contain at most 100 products.');
    }

    for (const entry of rawItems) {
      if (!isPlainObject(entry)) {
        errors.push("Every item must be a JSON object.");
        continue;
      }

      const productId =
        typeof entry.productId === "string" ? entry.productId.trim() : "";

      if (!productId) {
        errors.push('"productId" is required for every item.');
        continue;
      }

      const parsed = parseQuantity(entry.quantity);

      if (parsed.errors) {
        errors.push(...parsed.errors);
        continue;
      }

      const total = (merged.get(productId) ?? 0) + parsed.quantity;

      merged.set(productId, Math.min(total, MAX_QUANTITY));
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const contactErrors = validateContact(contact.data ?? {});

  if (contactErrors.length > 0) {
    return { errors: contactErrors };
  }

  return {
    data: {
      ...contact.data,
      currency,
      items: [...merged].map(([productId, quantity]) => ({
        productId,
        quantity,
      })),
    },
  };
}

/** Products that are gone or hidden must not reach the database. */
export async function findUnavailableProducts(productIds: string[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, visible: true },
    select: { id: true },
  });

  const available = new Set(products.map((product) => product.id));

  return productIds.filter((productId) => !available.has(productId));
}

export async function loadProductPricing(productIds: string[]) {
  return prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      priceUsd: true,
      discountedPriceUsd: true,
      priceTry: true,
      discountedPriceTry: true,
    },
  });
}

/**
 * Freezes each item's price at submission time. The values are copied onto the
 * order row so later catalog changes never rewrite an existing order's total.
 */
export function buildItemSnapshots(
  items: SubmissionItem[],
  products: Array<{
    id: string;
    priceUsd: unknown;
    discountedPriceUsd: unknown;
    priceTry: unknown;
    discountedPriceTry: unknown;
  }>,
) {
  const byId = new Map(products.map((product) => [product.id, product]));

  return items.map((item) => {
    const product = byId.get(item.productId);

    const usd: Money = {
      price: decimalToNumber(product?.priceUsd),
      discountedPrice: decimalToNumber(product?.discountedPriceUsd),
      discountPercent: null,
    };

    const tryMoney: Money = {
      price: decimalToNumber(product?.priceTry),
      discountedPrice: decimalToNumber(product?.discountedPriceTry),
      discountPercent: null,
    };

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPriceUsd: effectivePrice(usd),
      regularPriceUsd: usd.price,
      unitPriceTry: effectivePrice(tryMoney),
      regularPriceTry: tryMoney.price,
    };
  });
}

export function parseQuantity(
  value: unknown,
  { required = true, allowZero = false }: { required?: boolean; allowZero?: boolean } = {},
) {
  if (value === undefined || value === null) {
    return required ? { errors: ['"quantity" is required.'] } : { quantity: 1 };
  }

  const quantity = typeof value === "number" ? value : Number(value);
  const min = allowZero ? 0 : 1;

  if (!Number.isInteger(quantity) || quantity < min || quantity > 999) {
    return {
      errors: [
        `"quantity" must be an integer between ${min} and 999.`,
      ],
    };
  }

  return { quantity };
}

export function badRequest(errors: string[]) {
  return Response.json({ errors }, { status: 400 });
}

export function adminOnly(isAdmin: boolean) {
  return isAdmin
    ? null
    : Response.json({ error: "Unauthorized." }, { status: 401 });
}

export function parseOrderQuery(url: URL) {
  const status = url.searchParams.get("status")?.trim();
  const search = url.searchParams.get("search")?.trim();

  const where: Prisma.OrderWhereInput = {};

  const parsedStatus = Object.values(OrderStatus).find((value) => value === status);

  if (parsedStatus) {
    where.status = parsedStatus;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ];
  }

  const limitParam = Number(url.searchParams.get("limit") ?? Number.NaN);
  const offsetParam = Number(url.searchParams.get("offset") ?? Number.NaN);

  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
    : 50;
  const offset = Number.isFinite(offsetParam)
    ? Math.max(Math.trunc(offsetParam), 0)
    : 0;

  return { where, limit, offset };
}
