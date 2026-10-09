import type { Prisma } from "@/lib/generated/prisma/client";
import { locales, type Locale } from "@/lib/i18n";
import type { Money } from "@/lib/price";
import {
  MAX_TECHNICAL_DETAILS,
  MAX_TECHNICAL_DETAIL_LENGTH,
  type ProductSpec,
} from "@/lib/product-specs";

/* A stock code is the product identifier and URL key: letters (any case),
   digits, dots, underscores and dashes, starting with a letter or digit. */
const STOCK_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export const productFields = [
  "family",
  "category",
  "image",
] as const;

export const productFilters = [
  "family",
  "category",
] as const;

export const productOrderByFields = [
  "family",
  "category",
  "createdAt",
  "updatedAt",
] as const;

export type ProductTranslationPayload = {
  locale: Locale;
  name: string;
  description: string;
  /** Absent means "leave the stored rows alone"; `[]` clears them. */
  technicalDetails?: ProductSpec[];
};

export type ProductPayload = {
  id?: string;
  visible?: boolean;
  translations?: ProductTranslationPayload[];
  priceUsd?: number | null;
  discountedPriceUsd?: number | null;
  discountPercentUsd?: number | null;
  priceTry?: number | null;
  discountedPriceTry?: number | null;
  discountPercentTry?: number | null;
} & Partial<Record<(typeof productFields)[number], string>>;

export const translationSelect = {
  locale: true,
  name: true,
  description: true,
  technicalDetails: true,
} as const;

export const productSelect = {
  id: true,
  family: true,
  category: true,
  image: true,
  priceUsd: true,
  discountedPriceUsd: true,
  discountPercentUsd: true,
  priceTry: true,
  discountedPriceTry: true,
  discountPercentTry: true,
  visible: true,
  createdAt: true,
  updatedAt: true,
  translations: {
    orderBy: { locale: "asc" },
    select: translationSelect,
  },
} as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type TextResult =
  | { ok: true; value: string | undefined }
  | { ok: false; error: string };

function readText(
  body: Record<string, unknown>,
  field: string,
  required: boolean,
): TextResult {
  const value = body[field];

  if (value === undefined || value === null) {
    return required
      ? { ok: false, error: `"${field}" is required.` }
      : { ok: true, value: undefined };
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, error: `"${field}" must be a non-empty string.` };
  }

  return { ok: true, value: value.trim() };
}

type TranslationsResult =
  | { ok: true; value: ProductTranslationPayload[] | undefined }
  | { ok: false; error: string };

type SpecsResult =
  | { ok: true; value: ProductSpec[] | undefined }
  | { ok: false; error: string };

/**
 * Technical details are a stored JSON array, so the payload is checked here
 * rather than by Prisma: every row must be a `{ label, value }` pair of
 * non-empty strings inside the documented limits.
 */
function readTechnicalDetails(entry: Record<string, unknown>): SpecsResult {
  const value = entry.technicalDetails;

  /* Omitted means the caller is not touching the stored rows. */
  if (value === undefined || value === null) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(value)) {
    return {
      ok: false,
      error: '"technicalDetails" must be an array of { label, value } rows.',
    };
  }

  if (value.length > MAX_TECHNICAL_DETAILS) {
    return {
      ok: false,
      error: `"technicalDetails" must contain at most ${MAX_TECHNICAL_DETAILS} rows.`,
    };
  }

  const specs: ProductSpec[] = [];

  for (const row of value) {
    if (!isPlainObject(row)) {
      return {
        ok: false,
        error:
          'Each technical detail row must be a JSON object with "label" and "value".',
      };
    }

    const label = readText(row, "label", true);
    const specValue = readText(row, "value", true);

    if (!label.ok) {
      return { ok: false, error: `technicalDetails: ${label.error}` };
    }

    if (!specValue.ok) {
      return { ok: false, error: `technicalDetails: ${specValue.error}` };
    }

    const labelText = label.value as string;
    const valueText = specValue.value as string;

    if (
      labelText.length > MAX_TECHNICAL_DETAIL_LENGTH ||
      valueText.length > MAX_TECHNICAL_DETAIL_LENGTH
    ) {
      return {
        ok: false,
        error: `"technicalDetails" labels and values must be at most ${MAX_TECHNICAL_DETAIL_LENGTH} characters.`,
      };
    }

    specs.push({ label: labelText, value: valueText });
  }

  return { ok: true, value: specs };
}

function readTranslations(value: unknown, required: boolean): TranslationsResult {
  if (value === undefined || value === null) {
    return required
      ? { ok: false, error: '"translations" is required.' }
      : { ok: true, value: undefined };
  }

  if (!Array.isArray(value) || value.length === 0) {
    return {
      ok: false,
      error: '"translations" must be a non-empty array.',
    };
  }

  if (value.length > locales.length) {
    return {
      ok: false,
      error: `"translations" must contain at most ${locales.length} entries.`,
    };
  }

  const translations: ProductTranslationPayload[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!isPlainObject(entry)) {
      return { ok: false, error: "Each translation must be a JSON object." };
    }

    const { locale } = entry;

    if (typeof locale !== "string" || !locales.includes(locale as Locale)) {
      return {
        ok: false,
        error: `Translation "locale" must be one of: ${locales.join(", ")}.`,
      };
    }

    if (seen.has(locale)) {
      return {
        ok: false,
        error: `Duplicate translation for locale "${locale}".`,
      };
    }

    seen.add(locale);

    const localeName = readText(entry, "name", true);
    const localeDescription = readText(entry, "description", true);

    if (!localeName.ok) {
      return {
        ok: false,
        error: `${locale}: ${localeName.error}`,
      };
    }

    if (!localeDescription.ok) {
      return {
        ok: false,
        error: `${locale}: ${localeDescription.error}`,
      };
    }

    const specs = readTechnicalDetails(entry);

    if (!specs.ok) {
      return {
        ok: false,
        error: `${locale}: ${specs.error}`,
      };
    }

    translations.push({
      locale: locale as Locale,
      name: localeName.value as string,
      description: localeDescription.value as string,
      technicalDetails: specs.value,
    });
  }

  return { ok: true, value: translations };
}

type NumberResult =
  | { ok: true; value: number | null | undefined }
  | { ok: false; error: string };

function readMoney(
  body: Record<string, unknown>,
  field: string,
): NumberResult {
  const raw = body[field];

  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null || raw === "") return { ok: true, value: null };

  const value = typeof raw === "number" ? raw : Number(raw);

  if (!Number.isFinite(value) || value < 0) {
    return {
      ok: false,
      error: `"${field}" must be a non-negative number.`,
    };
  }

  return { ok: true, value: Math.round(value * 100) / 100 };
}

function readPercent(
  body: Record<string, unknown>,
  field: string,
): NumberResult {
  const raw = body[field];

  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null || raw === "") return { ok: true, value: null };

  const value = typeof raw === "number" ? raw : Number(raw);

  if (!Number.isInteger(value) || value < 0 || value > 100) {
    return {
      ok: false,
      error: `"${field}" must be a whole number between 0 and 100.`,
    };
  }

  return { ok: true, value };
}

/**
 * Keeps a currency's price fields consistent: a discount only exists when the
 * sale price is strictly below the regular price, and a missing middle value
 * is derived from the other two.
 */
function normalizeMoney(money: Money): Money {
  const price = money.price ?? null;
  const discounted = money.discountedPrice ?? null;
  const percent = money.discountPercent ?? null;

  if (price === null || price <= 0) {
    return { price, discountedPrice: null, discountPercent: null };
  }

  if (discounted !== null && discounted > 0 && discounted < price) {
    return {
      price,
      discountedPrice: discounted,
      discountPercent:
        percent !== null && percent > 0
          ? percent
          : Math.round((1 - discounted / price) * 100),
    };
  }

  if (discounted === null && percent !== null && percent > 0) {
    const computed = Math.round(price * (1 - percent / 100) * 100) / 100;

    if (computed > 0 && computed < price) {
      return { price, discountedPrice: computed, discountPercent: percent };
    }
  }

  return { price, discountedPrice: null, discountPercent: null };
}

export function parseProductPayload(
  body: unknown,
  { partial = false }: { partial?: boolean } = {},
):
  | { data: ProductPayload; errors?: undefined }
  | { data?: undefined; errors: string[] } {
  if (!isPlainObject(body)) {
    return { errors: ["Body must be a JSON object."] };
  }

  const errors: string[] = [];
  const data: ProductPayload = {};

  if (body.id !== undefined) {
    const id = readText(body, "id", true);

    if (!id.ok) {
      errors.push(id.error);
    } else if (id.value !== undefined && !STOCK_CODE_PATTERN.test(id.value)) {
      errors.push(
        `"id" must be a stock code (letters, digits, dots, underscores and dashes).`,
      );
    } else if (id.value !== undefined) {
      data.id = id.value;
    }
  } else if (!partial) {
    errors.push('"id" is required.');
  }

  for (const field of productFields) {
    const result = readText(body, field, !partial);

    if (!result.ok) {
      errors.push(result.error);
      continue;
    }

    if (result.value !== undefined) {
      data[field] = result.value;
    }
  }

  const translations = readTranslations(body.translations, !partial);

  if (!translations.ok) {
    errors.push(translations.error);
  } else if (translations.value !== undefined) {
    data.translations = translations.value;
  }

  const priceUsd = readMoney(body, "priceUsd");

  if (!priceUsd.ok) {
    errors.push(priceUsd.error);
  } else if (priceUsd.value !== undefined) {
    data.priceUsd = priceUsd.value;
  }

  const discountedPriceUsd = readMoney(body, "discountedPriceUsd");

  if (!discountedPriceUsd.ok) {
    errors.push(discountedPriceUsd.error);
  } else if (discountedPriceUsd.value !== undefined) {
    data.discountedPriceUsd = discountedPriceUsd.value;
  }

  const discountPercentUsd = readPercent(body, "discountPercentUsd");

  if (!discountPercentUsd.ok) {
    errors.push(discountPercentUsd.error);
  } else if (discountPercentUsd.value !== undefined) {
    data.discountPercentUsd = discountPercentUsd.value;
  }

  const priceTry = readMoney(body, "priceTry");

  if (!priceTry.ok) {
    errors.push(priceTry.error);
  } else if (priceTry.value !== undefined) {
    data.priceTry = priceTry.value;
  }

  const discountedPriceTry = readMoney(body, "discountedPriceTry");

  if (!discountedPriceTry.ok) {
    errors.push(discountedPriceTry.error);
  } else if (discountedPriceTry.value !== undefined) {
    data.discountedPriceTry = discountedPriceTry.value;
  }

  const discountPercentTry = readPercent(body, "discountPercentTry");

  if (!discountPercentTry.ok) {
    errors.push(discountPercentTry.error);
  } else if (discountPercentTry.value !== undefined) {
    data.discountPercentTry = discountPercentTry.value;
  }

  if (body.visible !== undefined && body.visible !== null) {
    if (typeof body.visible !== "boolean") {
      errors.push('"visible" must be a boolean.');
    } else {
      data.visible = body.visible;
    }
  } else if (!partial) {
    data.visible = true;
  }

  if (errors.length === 0) {
    if (data.priceUsd !== undefined) {
      const money = normalizeMoney({
        price: data.priceUsd,
        discountedPrice: data.discountedPriceUsd ?? null,
        discountPercent: data.discountPercentUsd ?? null,
      });

      data.priceUsd = money.price;
      data.discountedPriceUsd = money.discountedPrice;
      data.discountPercentUsd = money.discountPercent;
    }

    if (data.priceTry !== undefined) {
      const money = normalizeMoney({
        price: data.priceTry,
        discountedPrice: data.discountedPriceTry ?? null,
        discountPercent: data.discountPercentTry ?? null,
      });

      data.priceTry = money.price;
      data.discountedPriceTry = money.discountedPrice;
      data.discountPercentTry = money.discountPercent;
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return { data };
}

export function parseProductQuery(url: URL) {
  const search = url.searchParams.get("search")?.trim();
  const where: Prisma.ProductWhereInput = {};

  for (const field of productFilters) {
    const value = url.searchParams.get(field)?.trim();

    if (value) {
      where[field] = value;
    }
  }

  if (search) {
    where.OR = [
      { family: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      {
        translations: {
          some: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  const orderByParam = url.searchParams.get("orderBy")?.trim();
  const orderByField = productOrderByFields.find(
    (field) => field === orderByParam,
  );

  const orderBy: Prisma.ProductOrderByWithRelationInput = orderByField
    ? { [orderByField]: url.searchParams.get("order") === "desc" ? "desc" : "asc" }
    : { createdAt: "asc" };

  const limitParam = Number(url.searchParams.get("limit") ?? Number.NaN);
  const offsetParam = Number(url.searchParams.get("offset") ?? Number.NaN);

  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
    : 100;
  const offset = Number.isFinite(offsetParam)
    ? Math.max(Math.trunc(offsetParam), 0)
    : 0;

  return { where, orderBy, limit, offset };
}

export function badRequest(errors: string[]) {
  return Response.json({ errors }, { status: 400 });
}
