import { revalidatePath } from "next/cache";

import { authenticateAdmin, unauthorized } from "@/lib/admin-session";
import { getPageForAdmin, parsePagePayload } from "@/lib/pages";
import { badRequest } from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { revalidateStorefront } from "@/lib/revalidate";
import { locales } from "@/lib/i18n";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/content/pages/[...key]">,
) {
  if (!(await authenticateAdmin(request))) return unauthorized();

  const key = (await ctx.params).key.join("/");
  const page = await getPageForAdmin(key);

  if (!page) {
    return Response.json(
      { errors: [`Page "${key}" not found.`] },
      { status: 404 },
    );
  }

  return Response.json({ page }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/content/pages/[...key]">,
) {
  if (!(await authenticateAdmin(request))) return unauthorized();

  const key = (await ctx.params).key.join("/");

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest(["Body must be valid JSON."]);
  }

  const { data, errors } = parsePagePayload(body);

  if (!data) return badRequest(errors);

  await prisma.$transaction(async (tx) => {
    const page = await tx.page.upsert({
      where: { key },
      update: { label: data.label },
      create: { key, label: data.label },
      select: { id: true },
    });

    /* Sections are replaced wholesale: the editor sends the full ordered set,
       so diffing would only add complexity. Cascades clear their translations. */
    await tx.pageSection.deleteMany({ where: { pageId: page.id } });

    for (const [position, section] of data.sections.entries()) {
      await tx.pageSection.create({
        data: {
          pageId: page.id,
          key: section.key,
          type: section.type,
          position,
          image: section.image,
          href: section.href,
          translations: {
            create: section.translations.map((translation) => ({
              locale: translation.locale,
              eyebrow: translation.eyebrow,
              title: translation.title,
              body: translation.body,
              ctaLabel: translation.ctaLabel,
              items: translation.items,
            })),
          },
        },
      });
    }
  });

  const page = await getPageForAdmin(key);

  for (const locale of locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/legal`);
  }

  await revalidateStorefront();

  return Response.json({ page });
}
