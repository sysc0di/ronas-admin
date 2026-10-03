import Link from "next/link";
import { ArrowRight, Package, ScrollText } from "lucide-react";

import { PageHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Panel } from "@/components/admin/ui";
import { formatPrice } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { orderInclude, serializeOrder } from "@/lib/orders";

export const metadata = { title: "Overview · Admin" };

export default async function AdminOverviewPage() {
  const [totalProducts, visibleProducts, orders] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { visible: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: orderInclude,
    }),
  ]);

  const statusCounts = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = new Map(
    statusCounts.map((row) => [row.status, row._count._all]),
  );

  const totalOrders = statusCounts.reduce(
    (total, row) => total + row._count._all,
    0,
  );

  const openOrders = totalOrders - (counts.get("COMPLETED") ?? 0) - (counts.get("CANCELLED") ?? 0);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Storefront catalog and submitted lists at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total products", value: totalProducts, icon: Package },
          { label: "Visible products", value: visibleProducts, icon: Package },
          { label: "Submitted lists", value: totalOrders, icon: ScrollText },
          { label: "Open lists", value: openOrders, icon: ScrollText },
        ].map(({ label, value, icon: Icon }) => (
          <Panel key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">{label}</p>

              <Icon className="size-4 text-subtle" aria-hidden="true" />
            </div>

            <p className="stat-value">{value}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="panel-header">
            <h2 className="panel-title">Recent lists</h2>

            <Link href="/admin/lists" className="btn btn-ghost btn-sm">
              View all
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          {orders.length === 0 ? (
            <p className="cell-muted px-5 py-10 text-center">
              No lists submitted yet.
            </p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {orders.map((order) => {
                const list = serializeOrder(order);

                return (
                  <li
                    key={list.id}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="cell-strong truncate">
                        {[list.firstName, list.lastName]
                          .filter(Boolean)
                          .join(" ") || list.email || "Anonymous"}
                      </p>

                      <p className="cell-muted truncate">
                        {list.itemCount} {list.itemCount === 1 ? "item" : "items"} ·{" "}
                        {new Date(list.createdAt).toLocaleString("en-GB")}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {list.items.some((item) => item.unitPrice !== null) && (
                        <span className="cell-strong cell-numeric whitespace-nowrap">
                          {formatPrice(list.total, list.currency)}
                        </span>
                      )}

                      <StatusBadge status={list.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <div className="panel-header">
            <h2 className="panel-title">Lists by status</h2>
          </div>

          <dl className="divide-y divide-line-soft">
            {["SUBMITTED", "PROCESSING", "COMPLETED", "CANCELLED", "DRAFT"].map(
              (status) => (
                <div
                  key={status}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <dt>
                    <StatusBadge status={status} />
                  </dt>

                  <dd className="cell-strong cell-numeric">
                    {counts.get(status as never) ?? 0}
                  </dd>
                </div>
              ),
            )}
          </dl>
        </Panel>
      </div>
    </>
  );
}
