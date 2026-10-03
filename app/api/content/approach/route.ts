import { revalidatePath } from "next/cache";

import { authenticateAdmin, unauthorized } from "@/lib/admin-session";
import {
  APPROACH_SECTION_KEY,
  getSiteSectionForAdmin,
  parseApproachPayload,
} from "@/lib/content";
import { locales } from "@/lib/i18n";
import { badRequest } from "@/lib/products";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await authenticateAdmin(request))) return unauthorized();

  const section = await getSiteSectionForAdmin(APPROACH_SECTION_KEY);

  return Response.json(
    { section },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  if (!(await authenticateAdmin(request))) return unauthorized();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest(["Body must be valid JSON."]);
  }

  const { data, errors } = parseApproachPayload(body);

  if (!data) return badRequest(errors);

  await prisma.$transaction(async (tx) => {
    const section = await tx.siteSection.upsert({
      where: { key: APPROACH_SECTION_KEY },
      update: { image: data.image },
      create: { key: APPROACH_SECTION_KEY, image: data.image },
      select: { id: true },
    });

    for (const translation of data.translations) {
      await tx.siteSectionTranslation.upsert({
        where: {
          sectionId_locale: {
            sectionId: section.id,
            locale: translation.locale,
          },
        },
        update: {
          title: translation.title,
          description: translation.description,
        },
        create: {
          sectionId: section.id,
          locale: translation.locale,
          title: translation.title,
          description: translation.description,
        },
      });
    }
  });

  const section = await getSiteSectionForAdmin(APPROACH_SECTION_KEY);

  for (const locale of locales) {
    revalidatePath(`/${locale}`);
  }

  return Response.json({ section });
}
