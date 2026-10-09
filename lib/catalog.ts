import { defaultLocale, type Locale } from "@/lib/i18n";
import { decimalToNumber } from "@/lib/price";
import { pickTranslation } from "@/lib/product-text";
import { prisma } from "@/lib/prisma";

import type { CatalogProduct } from "@/lib/order-types";

const catalogSelect = {
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
  translations: {
    select: { locale: true, name: true, description: true },
  },
} as const;

/**
 * Public catalog: hidden products never reach the storefront, so a product
 * can be pulled from the site without deleting it. Product text is resolved
 * for the requested language (with fallback) so the storefront never talks
 * to the UI dictionaries for product content.
 */
export async function getCatalog(
  locale: Locale = defaultLocale,
): Promise<CatalogProduct[]> {
  const products = await prisma.product.findMany({
    where: { visible: true },
    select: catalogSelect,
    orderBy: [{ createdAt: "asc" }],
  });

  return products.map((product) => {
    const translation = pickTranslation(product.translations, locale);

    return {
      id: product.id,
      name: translation?.name ?? "",
      family: product.family,
      category: product.category,
      description: translation?.description ?? "",
      image: product.image,
      priceUsd: decimalToNumber(product.priceUsd),
      discountedPriceUsd: decimalToNumber(product.discountedPriceUsd),
      discountPercentUsd: product.discountPercentUsd,
      priceTry: decimalToNumber(product.priceTry),
      discountedPriceTry: decimalToNumber(product.discountedPriceTry),
      discountPercentTry: product.discountPercentTry,
    };
  });
}
