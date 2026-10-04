import { authenticateAdmin, unauthorized } from "@/lib/admin-session";
import {
  badRequest,
  parseProductPayload,
  productSelect,
} from "@/lib/products";
import { prisma } from "@/lib/prisma";

import { Prisma } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/products/[id]">,
) {
  const { id } = await ctx.params;
  const isAdmin = Boolean(await authenticateAdmin(request));

  const product = await prisma.product.findUnique({
    where: { id },
    select: productSelect,
  });

  if (!product) {
    return Response.json({ errors: [`Product "${id}" not found.`] }, { status: 404 });
  }

  if (!product.visible && !isAdmin) {
    return Response.json({ errors: [`Product "${id}" not found.`] }, { status: 404 });
  }

  return Response.json({ product });
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/products/[id]">,
) {
  if (!(await authenticateAdmin(request))) return unauthorized();

  const { id } = await ctx.params;

  const current = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!current) {
    return Response.json({ errors: [`Product "${id}" not found.`] }, { status: 404 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest(["Body must be valid JSON."]);
  }

  const { data, errors } = parseProductPayload(body, { partial: true });

  if (!data) return badRequest(errors);

  const { id: nextId, translations, ...fields } = data;

  if (nextId && nextId !== id) {
    const taken = await prisma.product.findUnique({
      where: { id: nextId },
      select: { id: true },
    });

    if (taken) {
      return Response.json(
        { errors: [`Product "${nextId}" already exists.`] },
        { status: 409 },
      );
    }
  }

  const update: Prisma.ProductUpdateInput = {
    ...(fields as Omit<Prisma.ProductUpdateInput, "translations">),
  };

  if (nextId && nextId !== id) {
    update.id = nextId;
  }

  if (translations) {
    /* Merge: locales the admin filled are upserted, the rest are kept. */
    update.translations = {
      upsert: translations.map((translation) => {
        const text = {
          name: translation.name,
          description: translation.description,
        };

        /* An omitted list keeps the stored rows; an empty one clears them. */
        const details =
          translation.technicalDetails === undefined
            ? {}
            : {
                technicalDetails: translation.technicalDetails.length
                  ? (translation.technicalDetails as unknown as Prisma.InputJsonValue)
                  : Prisma.DbNull,
              };

        return {
          where: {
            productId_locale: { productId: id, locale: translation.locale },
          },
          update: { ...text, ...details },
          create: {
            locale: translation.locale,
            ...text,
            ...details,
          },
        };
      }),
    };
  }

  const product = await prisma.product.update({
    where: { id },
    data: update,
    select: productSelect,
  });

  return Response.json({ product });
}

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/products/[id]">,
) {
  if (!(await authenticateAdmin(request))) return unauthorized();

  const { id } = await ctx.params;

  const current = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!current) {
    return Response.json({ errors: [`Product "${id}" not found.`] }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
