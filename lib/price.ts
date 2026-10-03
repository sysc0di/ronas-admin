import type { Locale } from "@/lib/i18n";

export type Currency = "USD" | "TRY";

export const CURRENCIES: Currency[] = ["USD", "TRY"];

/** Number formatting used to render each currency. */
const FORMAT_TAGS: Record<Currency, string> = {
  USD: "en-US",
  TRY: "tr-TR",
};

/**
 * Currency shown by default for each language. The visitor can override this
 * with the currency dropdown, so this is only the starting point. Flip any
 * entry to change that language's default currency.
 */
export const DEFAULT_CURRENCY_BY_LOCALE: Record<Locale, Currency> = {
  en: "TRY",
  tr: "TRY",
  ku: "USD",
  ar: "USD",
};

export const FALLBACK_CURRENCY: Currency = "TRY";

export function isCurrency(value: unknown): value is Currency {
  return value === "USD" || value === "TRY";
}

/** One currency's price triple. */
export type Money = {
  price: number | null;
  discountedPrice: number | null;
  discountPercent: number | null;
};

/** Both currency triples, as stored on a product. */
export type ProductPricing = {
  priceUsd: number | null;
  discountedPriceUsd: number | null;
  discountPercentUsd: number | null;
  priceTry: number | null;
  discountedPriceTry: number | null;
  discountPercentTry: number | null;
};

/** Picks the price triple for the requested currency. */
export function selectMoney(
  pricing: ProductPricing,
  currency: Currency,
): Money {
  if (currency === "TRY") {
    return {
      price: pricing.priceTry,
      discountedPrice: pricing.discountedPriceTry,
      discountPercent: pricing.discountPercentTry,
    };
  }

  return {
    price: pricing.priceUsd,
    discountedPrice: pricing.discountedPriceUsd,
    discountPercent: pricing.discountPercentUsd,
  };
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A discount only exists when the sale price is strictly below the price. */
export function isDiscounted(money: Money): boolean {
  return (
    money.price !== null &&
    money.discountedPrice !== null &&
    money.discountedPrice < money.price
  );
}

/** The price the visitor actually pays, or null when there is no price. */
export function effectivePrice(money: Money): number | null {
  return isDiscounted(money) ? money.discountedPrice : money.price;
}

/** Stored percentage when set, otherwise derived from the two prices. */
export function discountPercentOf(money: Money): number | null {
  if (!isDiscounted(money)) return null;

  if (money.discountPercent !== null && money.discountPercent > 0) {
    return money.discountPercent;
  }

  if (money.price !== null && money.price > 0) {
    return Math.round(
      (1 - (money.discountedPrice as number) / money.price) * 100,
    );
  }

  return null;
}

/** How much the visitor saves compared to the regular price. */
export function discountAmount(money: Money): number | null {
  if (!isDiscounted(money)) return null;

  return roundMoney(
    (money.price as number) - (money.discountedPrice as number),
  );
}

export function formatPrice(
  value: number | null,
  currency: Currency = FALLBACK_CURRENCY,
): string {
  if (value === null) return "";

  return new Intl.NumberFormat(FORMAT_TAGS[currency] ?? FORMAT_TAGS.USD, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Prisma returns DECIMAL columns as Decimal objects; React cannot serialize
 *  those to client components, so every query converts them to numbers. */
export function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);

  if (typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber(): number }).toNumber();
  }

  return null;
}
