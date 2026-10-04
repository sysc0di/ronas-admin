"use client";

import {
  ArrowDown,
  ArrowUp,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ImageInput } from "@/components/admin/ImageInput";
import {
  Alert,
  Button,
  IconButton,
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
import {
  SECTION_TYPES,
  getSectionType,
  sectionTypeLabel,
  type SectionFieldFlags,
  type SectionItem,
  type SectionTypeDef,
} from "@/lib/section-types";
import type { AdminPage } from "@/lib/pages";

type SectionTranslationState = {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  items: SectionItem[];
};

type SectionState = {
  key: string;
  type: string;
  image: string;
  href: string;
  translations: Record<Locale, SectionTranslationState>;
};

type PageTranslationState = {
  title: string;
  subtitle: string;
  seoTitle: string;
  seoDescription: string;
};

const TYPE_GROUPS = SECTION_TYPES.reduce<Record<string, SectionTypeDef[]>>(
  (groups, definition) => {
    (groups[definition.group] ??= []).push(definition);
    return groups;
  },
  {},
);

function emptySectionTranslation(): SectionTranslationState {
  return { eyebrow: "", title: "", body: "", ctaLabel: "", items: [] };
}

function emptySectionTranslations(): Record<Locale, SectionTranslationState> {
  return Object.fromEntries(
    locales.map((locale) => [locale, emptySectionTranslation()]),
  ) as Record<Locale, SectionTranslationState>;
}

function emptyPageTranslations(): Record<Locale, PageTranslationState> {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      { title: "", subtitle: "", seoTitle: "", seoDescription: "" },
    ]),
  ) as Record<Locale, PageTranslationState>;
}

function hasContent(value: SectionTranslationState): boolean {
  return Boolean(
    value.eyebrow ||
      value.title ||
      value.body ||
      value.ctaLabel ||
      value.items.length > 0,
  );
}

export function PageEditor({ page }: { page: AdminPage }) {
  const router = useRouter();

  const [label, setLabel] = useState(page.label);
  const [language, setLanguage] = useState<Locale>(
    locales.find((locale) =>
      page.translations.some(
        (entry) => entry.locale === locale && (entry.title || entry.subtitle),
      ),
    ) ?? defaultLocale,
  );

  const [pageTranslations, setPageTranslations] = useState<
    Record<Locale, PageTranslationState>
  >(() => {
    const base = emptyPageTranslations();

    for (const entry of page.translations) {
      base[entry.locale] = {
        title: entry.title,
        subtitle: entry.subtitle,
        seoTitle: entry.seoTitle,
        seoDescription: entry.seoDescription,
      };
    }

    return base;
  });

  const [sections, setSections] = useState<SectionState[]>(() =>
    page.sections.map((section) => {
      const translations = emptySectionTranslations();

      for (const entry of section.translations) {
        translations[entry.locale] = {
          eyebrow: entry.eyebrow,
          title: entry.title,
          body: entry.body,
          ctaLabel: entry.ctaLabel,
          items: entry.items,
        };
      }

      return {
        key: section.key,
        type: section.type,
        image: section.image,
        href: section.href,
        translations,
      };
    }),
  );

  const [newType, setNewType] = useState(SECTION_TYPES[0]?.type ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  function updatePageTranslation(
    locale: Locale,
    patch: Partial<PageTranslationState>,
  ) {
    setPageTranslations((current) => ({
      ...current,
      [locale]: { ...current[locale], ...patch },
    }));
  }

  function updateSection(index: number, patch: Partial<SectionState>) {
    setSections((current) =>
      current.map((section, position) =>
        position === index ? { ...section, ...patch } : section,
      ),
    );
  }

  function updateSectionTranslation(
    index: number,
    locale: Locale,
    patch: Partial<SectionTranslationState>,
  ) {
    setSections((current) =>
      current.map((section, position) =>
        position === index
          ? {
              ...section,
              translations: {
                ...section.translations,
                [locale]: { ...section.translations[locale], ...patch },
              },
            }
          : section,
      ),
    );
  }

  function uniqueKey(base: string): string {
    const slug =
      base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "section";

    const taken = new Set(sections.map((section) => section.key));

    if (!taken.has(slug)) return slug;

    let suffix = 2;

    while (taken.has(`${slug}-${suffix}`)) suffix += 1;

    return `${slug}-${suffix}`;
  }

  function addSection() {
    setSections((current) => [
      ...current,
      {
        key: uniqueKey(newType),
        type: newType,
        image: "",
        href: "",
        translations: emptySectionTranslations(),
      },
    ]);
  }

  function removeSection(index: number) {
    setSections((current) =>
      current.filter((_, position) => position !== index),
    );
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((current) => {
      const next = [...current];
      const target = index + direction;

      if (target < 0 || target >= next.length) return current;

      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const seen = new Set<string>();
    const problems: string[] = [];

    for (const [index, section] of sections.entries()) {
      const key = section.key.trim();

      if (!key) {
        problems.push(`Section ${index + 1}: key is required.`);
      } else if (seen.has(key)) {
        problems.push(`Section ${index + 1}: duplicate key "${key}".`);
      }

      seen.add(key);
    }

    if (!label.trim()) problems.push("Page label is required.");

    setErrors(problems);
    setNotice("");

    if (problems.length > 0) return;

    setPending(true);

    try {
      const response = await fetch(
        `/api/content/pages/${page.key.split("/").map(encodeURIComponent).join("/")}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: label.trim(),
            translations: locales.map((locale) => ({
              locale,
              ...pageTranslations[locale],
            })),
            sections: sections.map((section) => ({
              key: section.key.trim(),
              type: section.type,
              image: section.image.trim(),
              href: section.href.trim(),
              translations: locales.map((locale) => ({
                locale,
                ...section.translations[locale],
              })),
            })),
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors(
          Array.isArray(payload.errors) && payload.errors.length > 0
            ? payload.errors
            : ["Could not save the page."],
        );
        return;
      }

      const refreshed = payload.revalidated as
        | { ok?: boolean; reason?: string }
        | undefined;

      /* The write succeeded either way; a failed purge only means the site is
         still serving its cached copy, so say so instead of claiming it is live. */
      if (refreshed && refreshed.ok === false) {
        setNotice("");
        setErrors([
          `Page saved, but the site was not refreshed (${refreshed.reason ?? "unknown error"}) — visitors may still see the old version.`,
        ]);
      } else {
        setNotice("Page saved.");
      }

      router.refresh();
    } catch {
      setErrors(["Something went wrong. Please try again."]);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {errors.length > 0 && <Alert>{errors.join(" ")}</Alert>}

      {notice && <Alert tone="success">{notice}</Alert>}

      <Panel>
        <PanelHeader
          title="Page details"
          description={`Key: ${page.key}. The label is shown in the admin and the SEO fields feed the storefront metadata.`}
          actions={
            <Button type="submit" variant="primary" loading={pending}>
              <Save className="size-3.5" aria-hidden="true" />
              Save page
            </Button>
          }
        />

        <div className="space-y-4 p-5">
          <Input
            label="Label"
            required
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />

          <Select
            label="Language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Locale)}
          >
            {locales.map((locale) => (
              <option key={locale} value={locale}>
                {localeNames[locale]} ({localeLabels[locale]})
              </option>
            ))}
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={`Page title (${localeLabels[language]})`}
              value={pageTranslations[language].title}
              onChange={(event) =>
                updatePageTranslation(language, { title: event.target.value })
              }
            />

            <Input
              label={`Subtitle (${localeLabels[language]})`}
              value={pageTranslations[language].subtitle}
              onChange={(event) =>
                updatePageTranslation(language, {
                  subtitle: event.target.value,
                })
              }
            />

            <Input
              label={`SEO title (${localeLabels[language]})`}
              value={pageTranslations[language].seoTitle}
              onChange={(event) =>
                updatePageTranslation(language, {
                  seoTitle: event.target.value,
                })
              }
            />

            <Input
              label={`SEO description (${localeLabels[language]})`}
              value={pageTranslations[language].seoDescription}
              onChange={(event) =>
                updatePageTranslation(language, {
                  seoDescription: event.target.value,
                })
              }
            />
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Sections"
          description="Ordered content blocks. Text is per language; image and link are shared."
        />

        <div className="space-y-4 p-5">
          {sections.length === 0 && (
            <p className="cell-muted">No sections yet. Add one below.</p>
          )}

          {sections.map((section, index) => {
            const definition = getSectionType(section.type);
            /* An unknown type has no flags at all, which used to render as an
               empty box with no explanation — hence the warning below. */
            const flags: SectionFieldFlags = definition ?? {};
            const text = section.translations[language];

            return (
              <div
                key={section.key}
                className="space-y-4 rounded-lg border border-line bg-panel p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="cell-strong truncate">
                      {sectionTypeLabel(section.type)}
                    </p>
                    <p className="cell-muted mono text-xs">{section.key}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <IconButton
                      label="Move up"
                      onClick={() => moveSection(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label="Move down"
                      onClick={() => moveSection(index, 1)}
                      disabled={index === sections.length - 1}
                    >
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label="Remove section"
                      onClick={() => removeSection(index)}
                    >
                      <Trash2 className="size-4 text-danger" aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Type"
                    value={section.type}
                    onChange={(event) =>
                      updateSection(index, { type: event.target.value })
                    }
                  >
                    {Object.entries(TYPE_GROUPS).map(([group, definitions]) => (
                      <optgroup key={group} label={group}>
                        {definitions.map((option) => (
                          <option key={option.type} value={option.type}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>

                  <Input
                    label="Key"
                    required
                    value={section.key}
                    onChange={(event) =>
                      updateSection(index, { key: event.target.value })
                    }
                    hint="Stable within the page."
                  />
                </div>

                {!definition && (
                  <Alert>
                    No renderer is registered for type &quot;
                    {section.type}&quot;, so there are no fields to edit. Pick
                    another type above to give this section its fields back.
                  </Alert>
                )}

                {flags.image && (
                  <ImageInput
                    value={section.image}
                    onChange={(value) => updateSection(index, { image: value })}
                    folder="content"
                    hint="Shared across every language."
                  />
                )}

                {flags.href && (
                  <Input
                    label="Link"
                    value={section.href}
                    onChange={(event) =>
                      updateSection(index, { href: event.target.value })
                    }
                    placeholder="/en/contact"
                    hint="Shared across every language."
                  />
                )}

                <div className="rounded-lg border border-line bg-sunken p-4">
                  <p className="field-label mb-3">
                    {localeNames[language]} content
                    {hasContent(text) ? "" : " (empty)"}
                  </p>

                  <div className="space-y-3">
                    {flags.eyebrow && (
                      <Input
                        label={`Eyebrow (${localeLabels[language]})`}
                        value={text.eyebrow}
                        onChange={(event) =>
                          updateSectionTranslation(index, language, {
                            eyebrow: event.target.value,
                          })
                        }
                      />
                    )}

                    {flags.title && (
                      <Textarea
                        label={`Title (${localeLabels[language]})`}
                        rows={2}
                        value={text.title}
                        hint={definition?.titleHint}
                        onChange={(event) =>
                          updateSectionTranslation(index, language, {
                            title: event.target.value,
                          })
                        }
                      />
                    )}

                    {flags.body && (
                      <Textarea
                        label={`Body (${localeLabels[language]})`}
                        rows={6}
                        value={text.body}
                        hint={definition?.bodyHint}
                        onChange={(event) =>
                          updateSectionTranslation(index, language, {
                            body: event.target.value,
                          })
                        }
                      />
                    )}

                    {flags.ctaLabel && (
                      <Input
                        label={`Button label (${localeLabels[language]})`}
                        value={text.ctaLabel}
                        onChange={(event) =>
                          updateSectionTranslation(index, language, {
                            ctaLabel: event.target.value,
                          })
                        }
                      />
                    )}

                    {flags.items && (
                      <ItemEditor
                        items={text.items}
                        itemBody={flags.itemBody}
                        itemHref={flags.itemHref}
                        onChange={(items) =>
                          updateSectionTranslation(index, language, { items })
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-line p-4">
            <Select
              label="Add section"
              className="min-w-56"
              value={newType}
              onChange={(event) => setNewType(event.target.value)}
            >
              {Object.entries(TYPE_GROUPS).map(([group, definitions]) => (
                <optgroup key={group} label={group}>
                  {definitions.map((option) => (
                    <option key={option.type} value={option.type}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>

            <Button type="button" onClick={addSection}>
              <Plus className="size-3.5" aria-hidden="true" />
              Add section
            </Button>
          </div>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={pending}>
          <Save className="size-3.5" aria-hidden="true" />
          Save page
        </Button>
      </div>
    </form>
  );
}

function ItemEditor({
  items,
  itemBody,
  itemHref,
  onChange,
}: {
  items: SectionItem[];
  itemBody?: boolean;
  itemHref?: boolean;
  onChange: (items: SectionItem[]) => void;
}) {
  function update(index: number, patch: Partial<SectionItem>) {
    onChange(
      items.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <p className="field-label">Items</p>

      {items.map((item, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-md border border-line bg-panel p-3 sm:grid-cols-2"
        >
          <Input
            label="Title"
            value={item.title}
            onChange={(event) => update(index, { title: event.target.value })}
          />

          {itemBody && (
            <Input
              label="Body"
              value={item.body}
              onChange={(event) => update(index, { body: event.target.value })}
            />
          )}

          {itemHref && (
            <Input
              label="Link"
              value={item.href}
              onChange={(event) => update(index, { href: event.target.value })}
            />
          )}

          <div className="flex items-end">
            <IconButton
              label="Remove item"
              onClick={() =>
                onChange(items.filter((_, position) => position !== index))
              }
            >
              <Trash2 className="size-4 text-danger" aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      ))}

      <Button
        type="button"
        size="sm"
        onClick={() => onChange([...items, { title: "", body: "", href: "" }])}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add item
      </Button>
    </div>
  );
}
