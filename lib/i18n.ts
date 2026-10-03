export const locales = ["en", "tr", "ku", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Right-to-left languages get `dir="rtl"` on the document. */
export const rtlLocales: readonly Locale[] = ["ar"];

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  tr: "TR",
  ku: "KU",
  ar: "AR",
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
  ku: "Kurmancî",
  ar: "العربية",
};

/** BCP-47 tags used for `hreflang` and `Intl` formatting. */
export const localeTags: Record<Locale, string> = {
  en: "en",
  tr: "tr",
  ku: "ku",
  ar: "ar",
};

export const ogLocales: Record<Locale, string> = {
  en: "en_US",
  tr: "tr_TR",
  ku: "ku_TR",
  ar: "ar_AR",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Cookie wins, then the browser's Accept-Language, then the default. */
export function negotiateLocale(
  acceptLanguage: string | null,
  cookieLocale?: string,
): Locale {
  if (cookieLocale && hasLocale(cookieLocale)) {
    return cookieLocale;
  }

  if (acceptLanguage) {
    const ranked = acceptLanguage
      .split(",")
      .map((part) => {
        const [tag, ...params] = part.trim().split(";");

        const q = params
          .map((param) => param.trim())
          .find((param) => param.startsWith("q="));

        return {
          tag: (tag ?? "").trim().toLowerCase(),
          quality: q ? Number.parseFloat(q.slice(2)) : 1,
        };
      })
      .filter((entry) => entry.tag.length > 0)
      .sort((a, b) => b.quality - a.quality);

    for (const { tag } of ranked) {
      const base = tag.split("-")[0];

      if (hasLocale(base)) {
        return base;
      }
    }
  }

  return defaultLocale;
}
