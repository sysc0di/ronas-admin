/**
 * Section type registry.
 *
 * A section `type` selects both the storefront renderer and the admin field
 * set. This module holds no server-only imports, so the admin editor can read
 * it directly while `lib/pages.ts` re-exports it for the loaders.
 */

export type SectionItem = {
  title: string;
  body: string;
  href: string;
};

export type SectionFieldFlags = {
  eyebrow?: boolean;
  title?: boolean;
  body?: boolean;
  ctaLabel?: boolean;
  href?: boolean;
  image?: boolean;
  items?: boolean;
  itemHref?: boolean;
  itemBody?: boolean;
};

export type SectionTypeDef = SectionFieldFlags & {
  type: string;
  label: string;
  group: string;
  titleHint?: string;
  bodyHint?: string;
};

const MULTILINE_HINT = "Each new line becomes its own line in the heading.";
const PARAGRAPHS_HINT = "Separate paragraphs with a blank line.";

export const SECTION_TYPES: SectionTypeDef[] = [
  {
    type: "home-hero",
    label: "Home · Hero",
    group: "Home",
    body: true,
    image: true,
    bodyHint: "Subtitle shown over the banner.",
  },
  {
    type: "home-approach",
    label: "Home · Approach",
    group: "Home",
    title: true,
    body: true,
    image: true,
    href: true,
    titleHint: MULTILINE_HINT,
  },
  {
    type: "about-hero",
    label: "About · Hero",
    group: "About",
    eyebrow: true,
    title: true,
    body: true,
    titleHint: MULTILINE_HINT,
  },
  {
    type: "about-story",
    label: "About · Story",
    group: "About",
    title: true,
    body: true,
    titleHint: MULTILINE_HINT,
    bodyHint: PARAGRAPHS_HINT,
  },
  {
    type: "about-values",
    label: "About · Values",
    group: "About",
    items: true,
    itemBody: true,
  },
  {
    type: "about-image",
    label: "About · Image",
    group: "About",
    title: true,
    body: true,
    image: true,
  },
  {
    type: "about-closing",
    label: "About · Closing",
    group: "About",
    eyebrow: true,
    title: true,
    body: true,
    ctaLabel: true,
    titleHint: MULTILINE_HINT,
  },
  {
    type: "contact-hero",
    label: "Contact · Hero",
    group: "Contact",
    eyebrow: true,
    title: true,
    body: true,
    titleHint: MULTILINE_HINT,
  },
  {
    type: "contact-info",
    label: "Contact · Details",
    group: "Contact",
    items: true,
    itemBody: true,
    itemHref: true,
  },
  {
    type: "contact-form",
    label: "Contact · Form",
    group: "Contact",
  },
  {
    type: "contact-closing",
    label: "Contact · Closing",
    group: "Contact",
    eyebrow: true,
    title: true,
    ctaLabel: true,
    titleHint: MULTILINE_HINT,
  },
  {
    type: "impact-hero",
    label: "Impact · Hero",
    group: "Impact",
    eyebrow: true,
    title: true,
    body: true,
    titleHint: MULTILINE_HINT,
  },
  {
    type: "impact-band",
    label: "Impact · Image band",
    group: "Impact",
    title: true,
    body: true,
    image: true,
    bodyHint: "Right-hand caption over the image.",
  },
  {
    type: "impact-why",
    label: "Impact · Why",
    group: "Impact",
    eyebrow: true,
    title: true,
    body: true,
    items: true,
    itemBody: true,
    titleHint: MULTILINE_HINT,
    bodyHint: PARAGRAPHS_HINT,
  },
  {
    type: "impact-process",
    label: "Impact · Process",
    group: "Impact",
    eyebrow: true,
    title: true,
    body: true,
    items: true,
    itemBody: true,
    titleHint: MULTILINE_HINT,
  },
  {
    type: "impact-examples",
    label: "Impact · Examples",
    group: "Impact",
    eyebrow: true,
    title: true,
    body: true,
    items: true,
    itemBody: true,
    titleHint: MULTILINE_HINT,
  },
  {
    type: "impact-cta",
    label: "Impact · Call to action",
    group: "Impact",
    eyebrow: true,
    title: true,
    body: true,
    ctaLabel: true,
    href: true,
    items: true,
    titleHint: MULTILINE_HINT,
  },
  {
    type: "legal-document",
    label: "Legal · Document",
    group: "Legal",
    eyebrow: true,
    title: true,
    body: true,
    bodyHint:
      "Use blank lines between paragraphs. Start a line with '## ' for a heading or '- ' for a bullet.",
  },
  {
    type: "rich-text",
    label: "Generic · Rich text",
    group: "Generic",
    eyebrow: true,
    title: true,
    body: true,
    bodyHint:
      "Use blank lines between paragraphs. Start a line with '## ' for a heading or '- ' for a bullet.",
  },
  {
    type: "text",
    label: "Generic · Text",
    group: "Generic",
    eyebrow: true,
    title: true,
    body: true,
  },
  {
    type: "cta",
    label: "Generic · Call to action",
    group: "Generic",
    title: true,
    body: true,
    ctaLabel: true,
    href: true,
  },
  {
    type: "image",
    label: "Generic · Image",
    group: "Generic",
    title: true,
    body: true,
    image: true,
  },
];

export function getSectionType(type: string): SectionTypeDef | undefined {
  return SECTION_TYPES.find((entry) => entry.type === type);
}

export function sectionTypeLabel(type: string): string {
  return getSectionType(type)?.label ?? type;
}
