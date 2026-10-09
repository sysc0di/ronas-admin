import { PageHeader } from "@/components/admin/AdminShell";
import { ProductsTable } from "@/components/admin/ProductsTable";
import type { Locale } from "@/lib/i18n";
import { decimalToNumber } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { parseTechnicalDetails } from "@/lib/product-specs";
import { productSelect } from "@/lib/products";

export const metadata = { title: "Products · Admin" };

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    select: productSelect,
  });

  return (
    <>
      <PageHeader
        title="Products"
        description="Add, edit, hide or remove items shown in the storefront catalog."
      />

      <ProductsTable
        initialProducts={products.map((product) => ({
          ...product,
          family: product.family ?? "",
          image: product.image ?? null,
          priceUsd: decimalToNumber(product.priceUsd),
          discountedPriceUsd: decimalToNumber(product.discountedPriceUsd),
          priceTry: decimalToNumber(product.priceTry),
          discountedPriceTry: decimalToNumber(product.discountedPriceTry),
          translations: product.translations.map((translation) => ({
            ...translation,
            locale: translation.locale as Locale,
            technicalDetails: parseTechnicalDetails(
              translation.technicalDetails,
            ),
          })),
        }))}
      />
    </>
  );
}
