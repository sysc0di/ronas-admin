import { PageHeader } from "@/components/admin/AdminShell";
import { ListsTable } from "@/components/admin/ListsTable";
import { orderInclude, parseOrderQuery, serializeOrder } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Lists · Admin" };

export default async function AdminListsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { where, limit, offset } = parseOrderQuery(
    new URL(`http://localhost${params.search ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ""}`),
  );

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: orderInclude,
    }),
    prisma.order.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Lists"
        description="Every list a customer submits from the storefront, newest first."
      />

      <ListsTable
        initialOrders={orders.map(serializeOrder).map((order) => ({
          ...order,
          submittedAt: order.submittedAt?.toISOString() ?? null,
          createdAt: order.createdAt.toISOString(),
          items: order.items.map((item) => ({
            ...item,
            product: item.product,
          })),
        }))}
        initialTotal={total}
      />
    </>
  );
}
