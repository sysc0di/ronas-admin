"use client";

import { useState } from "react";

import { ImageInput } from "@/components/admin/ImageInput";
import {
  Alert,
  Button,
  Input,
  Panel,
  PanelHeader,
  Select,
  Textarea,
} from "@/components/admin/ui";
import {
  defaultLocale,
  localeLabels,
  localeNames,
  locales,
  type Locale,
} from "@/lib/i18n";

type TranslationEntry = { title: string; description: string };

function emptyTranslations(): Record<Locale, TranslationEntry> {
  return Object.fromEntries(
    locales.map((locale) => [locale, { title: "", description: "" }]),
  ) as Record<Locale, TranslationEntry>;
}

export function ApproachForm({
  initialImage,
  initialTranslations,
}: {
  initialImage: string;
  initialTranslations: { locale: Locale; title: string; description: string }[];
}) {
  const [image, setImage] = useState(initialImage);
  const [language, setLanguage] = useState<Locale>(
    locales.find((locale) =>
      initialTranslations.some(
        (translation) => translation.locale === locale && translation.title,
      ),
    ) ?? defaultLocale,
  );
  const [translations, setTranslations] = useState<
    Record<Locale, TranslationEntry>
  >(() => {
    const base = emptyTranslations();

    for (const translation of initialTranslations) {
      base[translation.locale] = {
        title: translation.title,
        description: translation.description,
      };
    }

    return base;
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  function updateTranslation(
    locale: Locale,
    patch: Partial<TranslationEntry>,
  ) {
    setTranslations((current) => ({
      ...current,
      [locale]: { ...current[locale], ...patch },
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const missing: string[] = [];

    if (!image.trim()) missing.push("Image URL");

    const filled = locales
      .map((locale) => ({ locale, ...translations[locale] }))
      .filter((entry) => entry.title.trim() || entry.description.trim());

    if (filled.length === 0) {
      missing.push("Title and description in at least one language");
    } else if (
      filled.some((entry) => !entry.title.trim() || !entry.description.trim())
    ) {
      missing.push("Title and description for every language you filled in");
    }

    setErrors(missing);
    setNotice("");

    if (missing.length > 0) return;

    setPending(true);

    try {
      const response = await fetch("/api/content/approach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: image.trim(),
          translations: filled.map((entry) => ({
            locale: entry.locale,
            title: entry.title.trim(),
            description: entry.description.trim(),
          })),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors(
          Array.isArray(payload.errors) && payload.errors.length > 0
            ? payload.errors
            : ["Could not save the section."],
        );
        return;
      }

      setNotice("Home approach section updated.");
    } catch {
      setErrors(["Something went wrong. Please try again."]);
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel className="max-w-2xl">
      <PanelHeader
        title="Approach section"
        description="The image is shared across languages; the title and description are per language."
      />

      <form onSubmit={submit} className="space-y-4 p-5">
        {errors.length > 0 && <Alert>{errors.join(" ")}</Alert>}

        {notice && <Alert tone="success">{notice}</Alert>}

        <ImageInput
          required
          value={image}
          onChange={setImage}
          folder="content"
          hint="Uploaded to Cloudinary, or paste any external link. Used on every language."
        />

        <div className="space-y-4 rounded-lg border border-line bg-sunken p-4">
          <Select
            label="Language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Locale)}
          >
            {locales.map((locale) => (
              <option key={locale} value={locale}>
                {localeNames[locale]} ({localeLabels[locale]})
                {translations[locale].title ? " ✓" : ""}
              </option>
            ))}
          </Select>

          <Input
            label={`Title (${localeLabels[language]})`}
            required
            value={translations[language].title}
            onChange={(event) =>
              updateTranslation(language, { title: event.target.value })
            }
            hint="Each new line becomes its own line in the heading."
          />

          <Textarea
            label={`Description (${localeLabels[language]})`}
            required
            rows={4}
            value={translations[language].description}
            onChange={(event) =>
              updateTranslation(language, { description: event.target.value })
            }
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={pending}
          className="w-full sm:w-auto"
        >
          Save section
        </Button>
      </form>
    </Panel>
  );
}
