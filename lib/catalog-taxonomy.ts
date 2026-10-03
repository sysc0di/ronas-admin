/**
 * Catalog taxonomy — the single source of truth for the family (category) and
 * subcategory structure.
 *
 * Slugs are what the database stores (`Product.family`, `Product.category`) and
 * what the storefront dictionaries are keyed by. Each slug is written out
 * explicitly rather than derived from its label: a display label can be
 * reworded later without renaming stored data, and existing products keep
 * matching their dictionary entry.
 */

export const CATEGORIES = [
  {
    name: "AIRFLOW DYNAMICS",
    slug: "airflow-dynamics",
    subcategories: [
      { label: "INTAKE MANIFOLDS", slug: "intake-manifolds" },
      { label: "COLD AIR INTAKES", slug: "cold-air-intakes" },
      { label: "CARBON AIRBOXES", slug: "carbon-airboxes" },
      { label: "AIR INTAKE PIPING", slug: "air-intake-piping" },
      { label: "EXHAUST MANIFOLDS", slug: "exhaust-manifolds" },
      { label: "BRAKE COOLING DUCTS", slug: "brake-cooling-ducts" },
    ],
  },
  {
    name: "DRIVER INTERFACE",
    slug: "driver-interface",
    subcategories: [
      {
        label: "CARBON FIBER STEERING WHEELS",
        slug: "carbon-fiber-steering-wheels",
      },
      { label: "RACING / PERFORMANCE SEATS", slug: "racing-seats" },
      { label: "SHIFT KNOBS", slug: "shift-knobs" },
      {
        label: "CARBON FIBER INTERIOR TRIMS",
        slug: "carbon-fiber-interior-trims",
      },
    ],
  },
  {
    name: "STRUCTURAL AERO",
    slug: "structural-aero",
    subcategories: [
      {
        label: "CARBON FIBER HOODS / BONNETS",
        slug: "carbon-fiber-hoods",
      },
      { label: "TRUNKS & TAILGATES", slug: "trunks-tailgates" },
      { label: "LIGHTWEIGHT DOORS", slug: "lightweight-doors" },
      { label: "SPOILERS & WINGS", slug: "spoilers-wings" },
    ],
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export type Subcategory = { readonly label: string; readonly slug: string };

export const CATEGORY_SLUGS = CATEGORIES.map((category) => category.slug);

/** Subcategories grouped by family, for cascading selects. */
export const SUBCATEGORIES: Record<CategorySlug, readonly Subcategory[]> = {
  "airflow-dynamics": CATEGORIES[0].subcategories,
  "driver-interface": CATEGORIES[1].subcategories,
  "structural-aero": CATEGORIES[2].subcategories,
};

export const SUBCATEGORY_SLUGS: readonly string[] = CATEGORIES.flatMap(
  (category) => category.subcategories.map((entry) => entry.slug),
);

export function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function isSubcategorySlug(value: string): boolean {
  return SUBCATEGORY_SLUGS.includes(value);
}

/** The family a subcategory belongs to, or undefined if the slug is unknown. */
export function familyOf(subcategorySlug: string): CategorySlug | undefined {
  return CATEGORY_SLUGS.find((family) =>
    SUBCATEGORIES[family].some((entry) => entry.slug === subcategorySlug),
  );
}

export function subcategoryLabel(subcategorySlug: string): string {
  for (const family of CATEGORY_SLUGS) {
    const match = SUBCATEGORIES[family].find(
      (entry) => entry.slug === subcategorySlug,
    );

    if (match) return match.label;
  }

  return subcategorySlug;
}

export function categoryLabel(categorySlug: string): string {
  return (
    CATEGORIES.find((category) => category.slug === categorySlug)?.name ??
    categorySlug
  );
}