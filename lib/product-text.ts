import { defaultLocale, type Locale } from "@/lib/i18n";

/**
 * Product text is stored per language. The active locale wins; otherwise we
 * fall back to the default locale and finally to whatever exists, so a
 * product that only has a Turkish name still renders instead of disappearing.
 */
export function pickTranslation<T extends { locale: string }>(
  translations: readonly T[],
  locale: Locale,
): T | undefined {
  return (
    translations.find((translation) => translation.locale === locale) ??
    translations.find((translation) => translation.locale === defaultLocale) ??
    translations[0]
  );
}
