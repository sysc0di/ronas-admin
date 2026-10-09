/**
 * Shapes shared by the server pages and the client components. Kept free of
 * server-only imports so client bundles can use them.
 */

export type CatalogProduct = {
  id: string;
  name: string;
  family: string;
  category: string;
  description: string;
  image: string;
  priceUsd: number | null;
  discountedPriceUsd: number | null;
  discountPercentUsd: number | null;
  priceTry: number | null;
  discountedPriceTry: number | null;
  discountPercentTry: number | null;
};
