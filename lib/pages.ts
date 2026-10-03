import { defaultLocale, hasLocale, locales, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/product-text";

import type { SectionItem } from "@/lib/section-types";

export {
  SECTION_TYPES,
  getSectionType,
  sectionTypeLabel,
} from "@/lib/section-types";
export type {
  SectionFieldFlags,
  SectionItem,
  SectionTypeDef,
} from "@/lib/section-types";

/**
 * Generic CMS content layer.
 *
 * A `Page` is a named collection of ordered `PageSection`s. Section text is
 * stored per locale; `image`/`href` are shared. The frontend renders sections
 * through a type→component registry, and the admin panel renders the matching
 * field set — so a new page or block is data, not bespoke code.
 */

/** A section resolved for one locale, ready to render. */
export type ResolvedSection = {
  id: string;
  key: string;
  type: string;
  position: number;
  image: string;
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  items: SectionItem[];
};

export type ResolvedPage = {
  key: string;
  label: string;
  title: string;
  subtitle: string;
  seoTitle: string;
  seoDescription: string;
  sections: ResolvedSection[];
};

export type SectionTranslation = {
  locale: Locale;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  items: SectionItem[];
};

export type AdminSection = {
  id: string;
  key: string;
  type: string;
  position: number;
  image: string;
  href: string;
  translations: SectionTranslation[];
};

export type PageTranslationEntry = {
  locale: Locale;
  title: string;
  subtitle: string;
  seoTitle: string;
  seoDescription: string;
};

export type AdminPage = {
  key: string;
  label: string;
  translations: PageTranslationEntry[];
  sections: AdminSection[];
};

/* ------------------------------------------------------------------ */
/* Normalisation helpers                                              */
/* ------------------------------------------------------------------ */

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toItems(value: unknown): SectionItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) return null;

      const record = entry as Record<string, unknown>;
      const title = toStringValue(record.title);
      const body = toStringValue(record.body);
      const href = toStringValue(record.href);

      if (!title && !body && !href) return null;

      return { title, body, href };
    })
    .filter((item): item is SectionItem => item !== null);
}

/* ------------------------------------------------------------------ */
/* Loaders                                                            */
/* ------------------------------------------------------------------ */

const pageInclude = {
  translations: true,
  sections: {
    orderBy: { position: "asc" },
    include: { translations: true },
  },
} as const;

/** Resolved content for one locale, with dictionary-style fallbacks. */
export async function getPage(
  key: string,
  locale: Locale = defaultLocale,
): Promise<ResolvedPage | null> {
  const page = await prisma.page.findUnique({
    where: { key },
    include: pageInclude,
  });

  if (!page) return null;

  const translation = pickTranslation(page.translations, locale);

  return {
    key: page.key,
    label: page.label,
    title: translation?.title ?? "",
    subtitle: translation?.subtitle ?? "",
    seoTitle: translation?.seoTitle ?? "",
    seoDescription: translation?.seoDescription ?? "",
    sections: page.sections.map((section) => {
      const text = pickTranslation(section.translations, locale);

      return {
        id: section.id,
        key: section.key,
        type: section.type,
        position: section.position,
        image: section.image,
        href: section.href,
        eyebrow: text?.eyebrow ?? "",
        title: text?.title ?? "",
        body: text?.body ?? "",
        ctaLabel: text?.ctaLabel ?? "",
        items: toItems(text?.items),
      };
    }),
  };
}

/** Every language of a page, for the admin editor. */
export async function getPageForAdmin(
  key: string,
): Promise<AdminPage | null> {
  const page = await prisma.page.findUnique({
    where: { key },
    include: pageInclude,
  });

  if (!page) return null;

  return {
    key: page.key,
    label: page.label,
    translations: page.translations
      .filter((entry) => hasLocale(entry.locale))
      .map((entry) => ({
        locale: entry.locale as Locale,
        title: entry.title,
        subtitle: entry.subtitle,
        seoTitle: entry.seoTitle,
        seoDescription: entry.seoDescription,
      })),
    sections: page.sections.map((section) => ({
      id: section.id,
      key: section.key,
      type: section.type,
      position: section.position,
      image: section.image,
      href: section.href,
      translations: section.translations
        .filter((entry) => hasLocale(entry.locale))
        .map((entry) => ({
          locale: entry.locale as Locale,
          eyebrow: entry.eyebrow,
          title: entry.title,
          body: entry.body,
          ctaLabel: entry.ctaLabel,
          items: toItems(entry.items),
        })),
    })),
  };
}

export type PageSummary = {
  key: string;
  label: string;
  updatedAt: Date;
};

export async function listPagesForAdmin(): Promise<PageSummary[]> {
  return prisma.page.findMany({
    orderBy: { label: "asc" },
    select: { key: true, label: true, updatedAt: true },
  });
}

/* ------------------------------------------------------------------ */
/* Payload parsing (admin writes)                                     */
/* ------------------------------------------------------------------ */

export type PageSectionPayload = {
  key: string;
  type: string;
  image: string;
  href: string;
  translations: SectionTranslation[];
};

export type PagePayload = {
  label: string;
  translations: PageTranslationEntry[];
  sections: PageSectionPayload[];
};

function parseItems(value: unknown, errors: string[], where: string) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    errors.push(`${where}: "items" must be an array.`);
    return [];
  }

  const items: SectionItem[] = [];

  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      errors.push(`${where}: each item must be an object.`);
      continue;
    }

    const record = entry as Record<string, unknown>;

    items.push({
      title: toStringValue(record.title).trim(),
      body: toStringValue(record.body).trim(),
      href: toStringValue(record.href).trim(),
    });
  }

  return items;
}

export function parsePagePayload(
  body: unknown,
): { data: PagePayload; errors?: undefined } | { data?: undefined; errors: string[] } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { errors: ["Body must be a JSON object."] };
  }

  const record = body as Record<string, unknown>;
  const errors: string[] = [];

  const label =
    typeof record.label === "string" && record.label.trim()
      ? record.label.trim()
      : "Untitled page";

  const translations: PageTranslationEntry[] = [];
  const rawTranslations = record.translations;

  if (!Array.isArray(rawTranslations)) {
    errors.push('"translations" must be an array.');
  } else {
    const seen = new Set<string>();

    for (const entry of rawTranslations) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        errors.push("Each translation must be a JSON object.");
        continue;
      }

      const value = entry as Record<string, unknown>;
      const locale = toStringValue(value.locale);

      if (!hasLocale(locale)) {
        errors.push(`Translation "locale" must be one of: ${locales.join(", ")}.`);
        continue;
      }

      if (seen.has(locale)) {
        errors.push(`Duplicate translation for locale "${locale}".`);
        continue;
      }

      seen.add(locale);

      translations.push({
        locale: locale as Locale,
        title: toStringValue(value.title).trim(),
        subtitle: toStringValue(value.subtitle).trim(),
        seoTitle: toStringValue(value.seoTitle).trim(),
        seoDescription: toStringValue(value.seoDescription).trim(),
      });
    }
  }

  const sections: PageSectionPayload[] = [];
  const rawSections = record.sections;

  if (!Array.isArray(rawSections)) {
    errors.push('"sections" must be an array.');
  } else {
    const seenKeys = new Set<string>();

    rawSections.forEach((entry, index) => {
      const where = `Section ${index + 1}`;

      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        errors.push(`${where}: must be a JSON object.`);
        return;
      }

      const value = entry as Record<string, unknown>;
      const key = toStringValue(value.key).trim();
      const type = toStringValue(value.type).trim();

      if (!key) {
        errors.push(`${where}: "key" is required.`);
      } else if (seenKeys.has(key)) {
        errors.push(`${where}: duplicate section key "${key}".`);
      }

      if (!type) {
        errors.push(`${where}: "type" is required.`);
      }

      if (key) seenKeys.add(key);

      const sectionTranslations: SectionTranslation[] = [];
      const rawSectionTranslations = value.translations;

      if (!Array.isArray(rawSectionTranslations)) {
        errors.push(`${where}: "translations" must be an array.`);
      } else {
        const seenLocales = new Set<string>();

        for (const itemEntry of rawSectionTranslations) {
          if (
            typeof itemEntry !== "object" ||
            itemEntry === null ||
            Array.isArray(itemEntry)
          ) {
            errors.push(`${where}: each translation must be an object.`);
            continue;
          }

          const item = itemEntry as Record<string, unknown>;
          const locale = toStringValue(item.locale);

          if (!hasLocale(locale)) {
            errors.push(
              `${where}: translation "locale" must be one of: ${locales.join(", ")}.`,
            );
            continue;
          }

          if (seenLocales.has(locale)) {
            errors.push(`${where}: duplicate translation for locale "${locale}".`);
            continue;
          }

          seenLocales.add(locale);

          sectionTranslations.push({
            locale: locale as Locale,
            eyebrow: toStringValue(item.eyebrow).trim(),
            title: toStringValue(item.title).trim(),
            body: toStringValue(item.body).trim(),
            ctaLabel: toStringValue(item.ctaLabel).trim(),
            items: parseItems(item.items, errors, `${where} (${locale})`),
          });
        }
      }

      sections.push({
        key,
        type,
        image: toStringValue(value.image).trim(),
        href: toStringValue(value.href).trim(),
        translations: sectionTranslations,
      });
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  return { data: { label, translations, sections } };
}
