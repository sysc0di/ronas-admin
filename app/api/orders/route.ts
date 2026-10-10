import { authenticateAdmin } from "@/lib/admin-session";
import { OrderStatus } from "@/lib/generated/prisma/enums";
import {
  adminOnly,
  buildItemSnapshots,
  createToken,
  createUniqueTrackingCode,
  findUnavailableProducts,
  listJson,
  loadProductPricing,
  orderInclude,
  parseOrderQuery,
  parseSubmission,
  serializeOrder,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Admin only: the list itself lives in the visitor's browser. */
export async function GET(request: Request) {
  const denied = adminOnly(Boolean(await authenticateAdmin(request)));

  if (denied) return denied;

  const url = new URL(request.url);
  const { where, limit, offset } = parseOrderQuery(url);

  const [orders, total, groups] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(
    Object.values(OrderStatus).map((status) => [status, 0]),
  ) as Record<string, number>;

  for (const group of groups) {
    statusCounts[group.status] = group._count._all;
  }

  return listJson({
    orders: orders.map(serializeOrder),
    total,
    limit,
    offset,
    statusCounts,
  });
}

/**
 * Public: a submitted list. The visitor sends the whole list that was kept in
 * localStorage together with the contact details, so there is nothing to read
 * back afterwards.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return listJson({ errors: ["Body must be valid JSON."] }, { status: 400 });
  }

  const { data, errors } = parseSubmission(body);

  if (!data) {
    return listJson({ errors }, { status: 422 });
  }

  const unavailable = await findUnavailableProducts(
    data.items.map((item) => item.productId),
  );

  if (unavailable.length > 0) {
    return listJson(
      {
        errors: unavailable.map(
          (productId) =>
            `"${productId}" is no longer available. Please remove it from your list.`,
        ),
      },
      { status: 422 },
    );
  }

  const { items, ...contact } = data;

  const products = await loadProductPricing(
    items.map((item) => item.productId),
  );
  const snapshots = buildItemSnapshots(items, products);
  const trackingCode = await createUniqueTrackingCode();

  try {
    const order = await prisma.order.create({
      data: {
        ...contact,
        token: createToken(),
        trackingCode,
        status: OrderStatus.SUBMITTED,
        submittedAt: new Date(),
        items: {
          create: snapshots,
        },
      },
      include: orderInclude,
    });

    return listJson({ order: serializeOrder(order) }, { status: 201 });
  } catch {
    return listJson(
      { errors: ["Your list could not be sent. Please try again."] },
      { status: 503 },
    );
  }
}