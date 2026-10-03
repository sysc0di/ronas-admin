import { defaultLocale, locales, type Locale } from "@/lib/i18n";
import { pickTranslation } from "@/lib/product-text";
import { prisma } from "@/lib/prisma";

export const APPROACH_SECTION_KEY = "home-approach";

export type SiteSectionContent = {
  key: string;
  image: string;
  title: string;
  description: string;
};

export type SiteSectionTranslation = {
  locale: Locale;
  title: string;
  description: string;
};

export type SiteSectionAdmin = {
  key: string;
  image: string;
  translations: SiteSectionTranslation[];
};

const sectionAdminSelect = {
  key: true,
  image: true,
  translations: {
    orderBy: { locale: "asc" },
    select: { locale: true, title: true, description: true },
  },
} as const;

/** Resolved content for the active locale (falls back like product text). */
export async function getSiteSection(
  key: string,
  locale: Locale = defaultLocale,
): Promise<SiteSectionContent | null> {
  const section = await prisma.siteSection.findUnique({
    where: { key },
    select: {
      key: true,
      image: true,
      translations: {
        select: { locale: true, title: true, description: true },
      },
    },
  });

  if (!section) return null;

  const translation = pickTranslation(section.translations, locale);

  return {
    key: section.key,
    image: section.image,
    title: translation?.title ?? "",
    description: translation?.description ?? "",
  };
}

/** Every language, for the admin form. */
export async function getSiteSectionForAdmin(
  key: string,
): Promise<SiteSectionAdmin | null> {
  const section = await prisma.siteSection.findUnique({
    where: { key },
    select: sectionAdminSelect,
  });

  if (!section) return null;

  return {
    key: section.key,
    image: section.image,
    translations: section.translations.map((translation) => ({
      ...translation,
      locale: translation.locale as Locale,
    })),
  };
}

export type ApproachPayload = {
  image: string;
  translations: SiteSectionTranslation[];
};

export function parseApproachPayload(
  body: unknown,
):
  | { data: ApproachPayload; errors?: undefined }
  | { data?: undefined; errors: string[] } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { errors: ["Body must be a JSON object."] };
  }

  const record = body as Record<string, unknown>;
  const errors: string[] = [];

  const image = typeof record.image === "string" ? record.image.trim() : "";

  if (!image) {
    errors.push('"image" is required.');
  }

  const translations: SiteSectionTranslation[] = [];
  const raw = record.translations;

  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push('"translations" must be a non-empty array.');
  } else {
    const seen = new Set<string>();

    for (const entry of raw) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        errors.push("Each translation must be a JSON object.");
        continue;
      }

      const value = entry as Record<string, unknown>;
      const locale = typeof value.locale === "string" ? value.locale : "";

      if (!locales.includes(locale as Locale)) {
        errors.push(
          `Translation "locale" must be one of: ${locales.join(", ")}.`,
        );
        continue;
      }

      if (seen.has(locale)) {
        errors.push(`Duplicate translation for locale "${locale}".`);
        continue;
      }

      seen.add(locale);

      const title = typeof value.title === "string" ? value.title.trim() : "";
      const description =
        typeof value.description === "string" ? value.description.trim() : "";

      if (!title) errors.push(`${locale}: "title" is required.`);
      if (!description) errors.push(`${locale}: "description" is required.`);

      if (title && description) {
        translations.push({ locale: locale as Locale, title, description });
      }
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return { data: { image, translations } };
}
