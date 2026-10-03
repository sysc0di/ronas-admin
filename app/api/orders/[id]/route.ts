import { authenticateAdmin } from "@/lib/admin-session";
import { OrderStatus } from "@/lib/generated/prisma/enums";
import {
  adminOnly,
  adminStatuses,
  badRequest,
  isPlainObject,
  listJson,
  orderInclude,
  parseContactPayload,
  serializeOrder,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";

import type { Prisma } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";

/** Admin only: the visitor's list is local to their browser. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/orders/[id]">,
) {
  const denied = adminOnly(Boolean(await authenticateAdmin(request)));

  if (denied) return denied;

  const { id } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });

  if (!order) {
    return listJson({ errors: [`Order "${id}" not found.`] }, { status: 404 });
  }

  return listJson({ order: serializeOrder(order) });
}

/** Admin only: mark an order as processing, completed, cancelled, ... */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/orders/[id]">,
) {
  const denied = adminOnly(Boolean(await authenticateAdmin(request)));

  if (denied) return denied;

  const { id } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, submittedAt: true },
  });

  if (!order) {
    return listJson({ errors: [`Order "${id}" not found.`] }, { status: 404 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest(["Body must be valid JSON."]);
  }

  if (!isPlainObject(body)) {
    return badRequest(["Body must be a JSON object."]);
  }

  const update: Prisma.OrderUpdateInput = {};

  if (body.status !== undefined && body.status !== null) {
    if (body.status === OrderStatus.DRAFT) {
      return badRequest(['"status" cannot be changed back to DRAFT.']);
    }

    if (!adminStatuses.includes(body.status as never)) {
      return badRequest([
        `"status" must be one of: ${adminStatuses.join(", ")}.`,
      ]);
    }

    update.status = body.status as never;

    if (body.status === OrderStatus.SUBMITTED && !order.submittedAt) {
      update.submittedAt = new Date();
    }
  }

  if (body.email !== undefined || body.notes !== undefined) {
    const contact = parseContactPayload(body);

    if (!contact.data) return badRequest(contact.errors);

    Object.assign(update, contact.data);
  }

  if (Object.keys(update).length === 0) {
    return badRequest(["Provide a status or contact field to update."]);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: update,
    include: orderInclude,
  });

  return listJson({ order: serializeOrder(updated) });
}

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/orders/[id]">,
) {
  const denied = adminOnly(Boolean(await authenticateAdmin(request)));

  if (denied) return denied;

  const { id } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!order) {
    return listJson({ errors: [`Order "${id}" not found.`] }, { status: 404 });
  }

  await prisma.order.delete({ where: { id } });

  return new Response(null, { status: 204 });
}