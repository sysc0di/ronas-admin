/**
 * Shape and limits of the `ProductTranslation.technicalDetails` JSON column.
 *
 * The rows are edited in the product form and rendered on the storefront, so
 * the shared limits live here: the form uses them to cap the editor, and the
 * API rejects anything larger.
 */

export const MAX_TECHNICAL_DETAILS = 24;
export const MAX_TECHNICAL_DETAIL_LENGTH = 120;

/** One "label: value" row of a product's technical details. */
export type ProductSpec = {
  label: string;
  value: string;
};

/**
 * Reads the stored JSON column defensively, so a row written by hand (or by an
 * older panel) cannot break the product form: anything that is not a
 * `{ label, value }` string pair is dropped.
 */
export function parseTechnicalDetails(
  value: unknown,
): ProductSpec[] {
  if (!Array.isArray(value)) return [];

  const specs: ProductSpec[] = [];

  for (const entry of value) {
    if (specs.length >= MAX_TECHNICAL_DETAILS) break;

    if (
      typeof entry !== "object" ||
      entry === null ||
      Array.isArray(entry)
    ) {
      continue;
    }

    const { label, value: specValue } =
      entry as Record<string, unknown>;

    if (
      typeof label !== "string" ||
      typeof specValue !== "string"
    ) {
      continue;
    }

    const trimmedLabel = label.trim();
    const trimmedValue = specValue.trim();

    /* A row without both halves is noise from an unfinished draft. */
    if (!trimmedLabel || !trimmedValue) continue;

    specs.push({
      label: trimmedLabel.slice(
        0,
        MAX_TECHNICAL_DETAIL_LENGTH,
      ),
      value: trimmedValue.slice(
        0,
        MAX_TECHNICAL_DETAIL_LENGTH,
      ),
    });
  }

  return specs;
}
