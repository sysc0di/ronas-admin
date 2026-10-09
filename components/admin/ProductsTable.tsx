"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { ImageInput } from "@/components/admin/ImageInput";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Panel,
  PanelHeader,
  Select,
  Switch,
  TableSkeleton,
  TableShell,
  Textarea,
} from "@/components/admin/ui";
import {
  CATEGORIES,
  SUBCATEGORIES,
  categoryLabel,
  familyOf,
  isCategorySlug,
  subcategoryLabel,
  type CategorySlug,
} from "@/lib/catalog-taxonomy";
import {
  defaultLocale,
  localeLabels,
  localeNames,
  locales,
  type Locale,
} from "@/lib/i18n";
import {
  CURRENCIES,
  discountPercentOf,
  effectivePrice,
  formatPrice,
  isDiscounted,
  roundMoney,
  selectMoney,
  type Currency,
  type Money,
} from "@/lib/price";
import {
  MAX_TECHNICAL_DETAILS,
  MAX_TECHNICAL_DETAIL_LENGTH,
  type ProductSpec,
} from "@/lib/product-specs";

type ProductTranslation = {
  locale: Locale;
  name: string;
  description: string;
  technicalDetails: ProductSpec[] | null;
};

type Product = {
  id: string;
  family: string;
  category: string;
  image: string | null;
  priceUsd: number | null;
  discountedPriceUsd: number | null;
  discountPercentUsd: number | null;
  priceTry: number | null;
  discountedPriceTry: number | null;
  discountPercentTry: number | null;
  visible: boolean;
  translations: ProductTranslation[];
};

type DraftTranslation = {
  name: string;
  description: string;
  technicalDetails: ProductSpec[];
};

type DraftMoney = {
  price: string;
  discountedPrice: string;
  discountPercent: string;
};

type Draft = {
  id: string;
  family: string;
  category: string;
  image: string;
  pricing: Record<Currency, DraftMoney>;
  visible: boolean;
  language: Locale;
  translations: Record<Locale, DraftTranslation>;
};

const DEFAULT_FAMILY = CATEGORIES[0].slug;

function emptyTranslations(): Record<Locale, DraftTranslation> {
  const entries = {} as Record<Locale, DraftTranslation>;

  for (const locale of locales) {
    entries[locale] = {
      name: "",
      description: "",
      technicalDetails: [],
    };
  }

  return entries;
}

function moneyToDraft(
  price: number | null,
  discountedPrice: number | null,
  discountPercent: number | null,
): DraftMoney {
  return {
    price: price === null ? "" : String(price),
    discountedPrice:
      discountedPrice === null ? "" : String(discountedPrice),
    discountPercent:
      discountPercent === null ? "" : String(discountPercent),
  };
}

function parseDraftMoney(
  money: DraftMoney,
  label: string,
): {
  price: number | null;
  discountedPrice: number | null;
  discountPercent: number | null;
  errors: string[];
} {
  const errors: string[] = [];
  const price = money.price.trim() === "" ? null : Number(money.price);
  const discounted =
    money.discountedPrice.trim() === ""
      ? null
      : Number(money.discountedPrice);
  const percent =
    money.discountPercent.trim() === ""
      ? null
      : Number(money.discountPercent);

  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    errors.push(`${label} price must be a non-negative number`);
  }

  if (
    discounted !== null &&
    (!Number.isFinite(discounted) || discounted < 0)
  ) {
    errors.push(
      `${label} discounted price must be a non-negative number`,
    );
  }

  if (
    percent !== null &&
    (!Number.isInteger(percent) || percent < 0 || percent > 100)
  ) {
    errors.push(
      `${label} discount % must be a whole number between 0 and 100`,
    );
  }

  if (
    price !== null &&
    price > 0 &&
    discounted !== null &&
    discounted >= price
  ) {
    errors.push(
      `${label} discounted price must be lower than the price`,
    );
  }

  return {
    price,
    discountedPrice: discounted,
    discountPercent: percent,
    errors,
  };
}

function emptyDraft(): Draft {
  return {
    id: "",
    family: DEFAULT_FAMILY,
    category: SUBCATEGORIES[DEFAULT_FAMILY][0].slug,
    image: "",
    pricing: {
      USD: { price: "", discountedPrice: "", discountPercent: "" },
      TRY: { price: "", discountedPrice: "", discountPercent: "" },
    },
    visible: true,
    language: defaultLocale,
    translations: emptyTranslations(),
  };
}

function draftFromProduct(product: Product): Draft {
  const translations = emptyTranslations();

  for (const translation of product.translations) {
    translations[translation.locale] = {
      name: translation.name,
      description: translation.description,
      technicalDetails: translation.technicalDetails ?? [],
    };
  }

  const language =
    locales.find(
      (locale) =>
        translations[locale].name || translations[locale].description,
    ) ?? defaultLocale;

  return {
    id: product.id,
    family:
      familyOf(product.category) ?? product.family ?? DEFAULT_FAMILY,
    category: product.category,
    image: product.image ?? "",
    pricing: {
      USD: moneyToDraft(
        product.priceUsd,
        product.discountedPriceUsd,
        product.discountPercentUsd,
      ),
      TRY: moneyToDraft(
        product.priceTry,
        product.discountedPriceTry,
        product.discountPercentTry,
      ),
    },
    visible: product.visible,
    language,
    translations,
  };
}

/** Display name for the (English-only) admin: default locale, then any. */
function productName(product: Product): string {
  const translation =
    product.translations.find(
      (entry) => entry.locale === defaultLocale && entry.name,
    ) ?? product.translations.find((entry) => entry.name);

  return translation?.name || product.id;
}

function filledLocales(product: Product): Locale[] {
  return locales.filter((locale) =>
    product.translations.some(
      (entry) => entry.locale === locale && entry.name,
    ),
  );
}

function ProductPriceCell({ product }: { product: Product }) {
  const rows = CURRENCIES.map((currency) => ({
    currency,
    money: selectMoney(product, currency),
  })).filter((row) => row.money.price !== null);

  if (rows.length === 0) {
    return <span className="cell-muted">—</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ currency, money }) => (
        <div
          key={currency}
          className="flex flex-col items-start gap-0.5"
        >
          {isDiscounted(money) ? (
            <>
              <span className="cell-strong flex items-center gap-1">
                {formatPrice(effectivePrice(money), currency)}

                <Badge tone="ok">
                  -{discountPercentOf(money) ?? 0}%
                </Badge>
              </span>

              <span className="cell-muted text-xs line-through">
                {formatPrice(money.price, currency)}
              </span>
            </>
          ) : (
            <span className="cell-strong">
              {formatPrice(money.price, currency)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function ProductsTable({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">(
    "all",
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [draftErrors, setDraftErrors] = useState<string[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);

  const [removing, setRemoving] = useState<Product | null>(null);

  /* Stable identity: the modal's effect depends on it, so an inline arrow would
     re-run that effect on every keystroke and yank focus back to the trigger. */
  const closeModal = useCallback(() => setModal(null), []);

  /* The draft's family, falling back when a product predates the taxonomy. */
  const draftFamily: CategorySlug = isCategorySlug(draft.family)
    ? draft.family
    : DEFAULT_FAMILY;

  /* A stored subcategory outside the current list stays selectable so editing
     an older product never silently rewrites its category. */
  const draftSubcategories = [
    ...(SUBCATEGORIES[draftFamily].some(
      (entry) => entry.slug === draft.category,
    )
      ? []
      : [{ slug: draft.category, label: subcategoryLabel(draft.category) }]),
    ...SUBCATEGORIES[draftFamily],
  ];

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return products.filter((product) => {
      if (filter === "visible" && !product.visible) return false;
      if (filter === "hidden" && product.visible) return false;
      if (!needle) return true;

      return [product.id, productName(product), product.family, product.category]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [products, query, filter]);

  function flash(message: string) {
    setNotice(message);
    setError("");
    setTimeout(() => setNotice(""), 4000);
  }

  function fail(message: string) {
    setError(message);
    setNotice("");
  }

  /** The write succeeds either way; a failed purge only means the site is still
      serving its cached copy, so never report the change as live in that case. */
  function reportSaved(
    message: string,
    revalidated?: { ok?: boolean; reason?: string },
  ) {
    if (revalidated && revalidated.ok === false) {
      setNotice("");
      setError(
        `${message} However the site was not refreshed (${
          revalidated.reason ?? "unknown error"
        }) — visitors may still see the old version.`,
      );

      return;
    }

    flash(message);
  }

  function updateTranslation(
    locale: Locale,
    patch: Partial<DraftTranslation>,
  ) {
    setDraft((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [locale]: { ...current.translations[locale], ...patch },
      },
    }));
  }

  /* Keep each currency's regular price, sale price and percentage in step:
     editing any one of the three recomputes the others so values agree. */
  function setPrice(currency: Currency, value: string) {
    setDraft((current) => {
      const money = { ...current.pricing[currency], price: value };
      const price = Number(value);
      const percent = Number(money.discountPercent);

      if (
        value.trim() !== "" &&
        Number.isFinite(price) &&
        price > 0 &&
        money.discountPercent.trim() !== "" &&
        Number.isFinite(percent) &&
        percent > 0 &&
        percent < 100
      ) {
        money.discountedPrice = roundMoney(
          price * (1 - percent / 100),
        ).toString();
      }

      return {
        ...current,
        pricing: { ...current.pricing, [currency]: money },
      };
    });
  }

  function setDiscountPercent(currency: Currency, value: string) {
    setDraft((current) => {
      const money = { ...current.pricing[currency], discountPercent: value };
      const price = Number(money.price);
      const percent = Number(value);

      if (
        money.price.trim() !== "" &&
        Number.isFinite(price) &&
        price > 0 &&
        value.trim() !== "" &&
        Number.isFinite(percent) &&
        percent > 0 &&
        percent < 100
      ) {
        money.discountedPrice = roundMoney(
          price * (1 - percent / 100),
        ).toString();
      }

      return {
        ...current,
        pricing: { ...current.pricing, [currency]: money },
      };
    });
  }

  function setDiscountedPrice(currency: Currency, value: string) {
    setDraft((current) => {
      const money = { ...current.pricing[currency], discountedPrice: value };
      const price = Number(money.price);
      const discounted = Number(value);

      if (
        money.price.trim() !== "" &&
        Number.isFinite(price) &&
        price > 0 &&
        value.trim() !== "" &&
        Number.isFinite(discounted) &&
        discounted > 0 &&
        discounted < price
      ) {
        money.discountPercent = String(
          Math.round((1 - discounted / price) * 100),
        );
      }

      return {
        ...current,
        pricing: { ...current.pricing, [currency]: money },
      };
    });
  }

  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        Array.isArray(payload.errors) && payload.errors.length > 0
          ? payload.errors.join(" ")
          : "Request failed.";

      throw new Error(message);
    }

    return payload;
  }

  const REQUIRED = [
    ["family", "Category"],
    ["category", "Subcategory"],
    ["image", "Image URL"],
  ] as const;

  async function save() {
    /* The products API requires every field, so catch gaps in the form
       instead of round-tripping to the server. */
    const missing: string[] = REQUIRED.filter(
      ([field]) => !draft[field].trim(),
    ).map(([, label]) => label);

    if (modal === "create" && !draft.id.trim()) {
      missing.push("Stock code");
    }

    /* Product text lives per language; anything typed must be complete. */
    const filled = locales
      .map((locale) => ({ locale, ...draft.translations[locale] }))
      .filter(
        (entry) => entry.name.trim() || entry.description.trim(),
      );

    if (filled.length === 0) {
      missing.push("Name and description in at least one language");
    } else if (
      filled.some(
        (entry) => !entry.name.trim() || !entry.description.trim(),
      )
    ) {
      missing.push("Name and description for every language you filled in");
    }

    /* Technical details ride along with the language they belong to, so rows
       typed for a language that is not being saved would be dropped. */
    const specsByLocale = new Map(
      filled.map((entry) => [
        entry.locale,
        entry.technicalDetails
          .map((row) => ({
            label: row.label.trim(),
            value: row.value.trim(),
          }))
          /* A row the admin opened but never typed into is not a spec. */
          .filter((row) => row.label || row.value),
      ]),
    );

    const savedLocales = new Set(filled.map((entry) => entry.locale));

    const orphaned = locales.filter(
      (locale) =>
        !savedLocales.has(locale) &&
        draft.translations[locale].technicalDetails.some(
          (row) => row.label.trim() || row.value.trim(),
        ),
    );

    if (orphaned.length > 0) {
      missing.push(
        `Technical details for ${orphaned
          .map((locale) => localeNames[locale])
          .join(", ")} need a name and description in that language`,
      );
    }

    for (const [locale, rows] of specsByLocale) {
      if (rows.length > MAX_TECHNICAL_DETAILS) {
        missing.push(
          `${localeLabels[locale]}: at most ${MAX_TECHNICAL_DETAILS} technical details`,
        );
      }

      if (rows.some((row) => !row.label || !row.value)) {
        missing.push(
          `${localeLabels[locale]}: every technical detail needs a label and a value`,
        );
      }

      if (
        rows.some(
          (row) =>
            row.label.length > MAX_TECHNICAL_DETAIL_LENGTH ||
            row.value.length > MAX_TECHNICAL_DETAIL_LENGTH,
        )
      ) {
        missing.push(
          `${localeLabels[locale]}: technical detail labels and values must be at most ${MAX_TECHNICAL_DETAIL_LENGTH} characters`,
        );
      }
    }

    /* Prices are optional, but anything typed must be a valid amount and a
       discount has to be lower than the regular price. */
    const usd = parseDraftMoney(draft.pricing.USD, "USD");
    const tryPrice = parseDraftMoney(draft.pricing.TRY, "TRY");

    missing.push(...usd.errors, ...tryPrice.errors);

    setDraftErrors(missing);

    if (missing.length > 0) return;

    const editing = modal === "edit";

    const body = {
      id: draft.id,
      family: draft.family,
      category: draft.category,
      image: draft.image,
      priceUsd: usd.price,
      discountedPriceUsd: usd.discountedPrice,
      discountPercentUsd: usd.discountPercent,
      priceTry: tryPrice.price,
      discountedPriceTry: tryPrice.discountedPrice,
      discountPercentTry: tryPrice.discountPercent,
      visible: draft.visible,
      translations: filled.map((entry) => ({
        locale: entry.locale,
        name: entry.name.trim(),
        description: entry.description.trim(),
        technicalDetails: specsByLocale.get(entry.locale) ?? [],
      })),
    };

    try {
      const payload = await request(
        editing ? `/api/products/${encodeURIComponent(draft.id)}` : "/api/products",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const product = (payload.product ?? payload) as Product;

      setProducts((current) =>
        editing
          ? current.map((item) => (item.id === product.id ? product : item))
          : [product, ...current],
      );

      setModal(null);
      reportSaved(
        editing ? "Product updated." : "Product created.",
        payload.revalidated,
      );
    } catch (err) {
      setDraftErrors([
        err instanceof Error ? err.message : "Request failed.",
      ]);
    }
  }

  async function toggleVisibility(product: Product) {
    setPendingId(product.id);
    setError("");
    setNotice("");

    try {
      const payload = await request(
        `/api/products/${encodeURIComponent(product.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visible: !product.visible }),
        },
      );

      const updated = (payload.product ?? payload) as Product;

      setProducts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      fail(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setPendingId(null);
    }
  }

  async function remove() {
    if (!removing) return;

    const id = removing.id;
    setPendingId(id);
    setError("");
    setNotice("");

    try {
      const result = await request(`/api/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      setProducts((current) => current.filter((item) => item.id !== id));
      setRemoving(null);
      reportSaved("Product deleted.", result.revalidated);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setPendingId(null);
    }
  }

  const hiddenCount = products.filter((product) => !product.visible).length;

  /* Live preview of what the visitor will see for the draft, per currency. */
  function previewMoney(currency: Currency): Money {
    const money = draft.pricing[currency];

    return {
      price:
        money.price.trim() === "" || !Number.isFinite(Number(money.price))
          ? null
          : Number(money.price),
      discountedPrice:
        money.discountedPrice.trim() === "" ||
        !Number.isFinite(Number(money.discountedPrice))
          ? null
          : Number(money.discountedPrice),
      discountPercent:
        money.discountPercent.trim() === "" ||
        !Number.isFinite(Number(money.discountPercent))
          ? null
          : Number(money.discountPercent),
    };
  }

  const draftMoney: Record<Currency, Money> = {
    USD: previewMoney("USD"),
    TRY: previewMoney("TRY"),
  };

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Products"
          description={`${products.length} total · ${products.length - hiddenCount} visible · ${hiddenCount} hidden`}
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setDraft(emptyDraft());
                setDraftErrors([]);
                setModal("create");
              }}
            >
              <Plus className="size-4" />
              New product
            </Button>
          }
        />

        <div className="panel-toolbar">
          <div className="relative min-w-56 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
              aria-hidden="true"
            />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, stock code, family…"
              aria-label="Search products"
              className="control pl-9"
            />
          </div>

          <div className="segmented" role="group" aria-label="Visibility filter">
            {(["all", "visible", "hidden"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
              >
                {option === "all"
                  ? "All"
                  : option === "visible"
                    ? "Visible"
                    : "Hidden"}
              </button>
            ))}
          </div>
        </div>

        {(error || notice) && (
          <div className="px-5 pt-4">
            {error ? (
              <Alert>{error}</Alert>
            ) : (
              <Alert tone="success">{notice}</Alert>
            )}
          </div>
        )}

        {products.length === 0 ? (
          <TableSkeleton />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No products match"
            description="Adjust the search or visibility filter."
          />
        ) : (
          <TableShell
            head={["Product", "Languages", "Category", "Price", "Visible", ""]}
          >
            {visible.map((product) => {
              const name = productName(product);
              const languages = filledLocales(product);

              return (
                <tr key={product.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="size-9 shrink-0 overflow-hidden rounded-md border border-line bg-sunken">
                        {product.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image}
                            alt=""
                            className="size-full object-cover"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="cell-strong truncate">{name}</p>

                        <p className="cell-muted truncate">
                          {categoryLabel(product.family)}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="flex flex-wrap items-center gap-1">
                      {languages.length > 0 ? (
                        languages.map((locale) => (
                          <Badge key={locale}>{localeLabels[locale]}</Badge>
                        ))
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </div>

                    <p className="cell-muted mono mt-1 truncate">
                      {product.id}
                    </p>
                  </td>

                  <td>
                    <Badge>{subcategoryLabel(product.category)}</Badge>
                  </td>

                  <td>
                    <ProductPriceCell product={product} />
                  </td>

                  <td>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={product.visible}
                        label={`Toggle visibility of ${name}`}
                        onChange={() => toggleVisibility(product)}
                      />

                      <span className="cell-muted">
                        {product.visible ? "Visible" : "Hidden"}
                      </span>

                      {pendingId === product.id && (
                        <span
                          className="spinner text-muted"
                          aria-label="Saving"
                        />
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="flex justify-end gap-1">
                      <IconButton
                        label={`${product.visible ? "Hide" : "Show"} ${name}`}
                        onClick={() => toggleVisibility(product)}
                        disabled={pendingId === product.id}
                      >
                        {product.visible ? (
                          <EyeOff className="size-4" aria-hidden="true" />
                        ) : (
                          <Eye className="size-4" aria-hidden="true" />
                        )}
                      </IconButton>

                      <IconButton
                        label={`Edit ${name}`}
                        onClick={() => {
                          setDraft(draftFromProduct(product));
                          setDraftErrors([]);
                          setModal("edit");
                        }}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </IconButton>

                      <IconButton
                        label={`Delete ${name}`}
                        onClick={() => setRemoving(product)}
                      >
                        <Trash2 className="size-4 text-danger" aria-hidden="true" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </TableShell>
        )}
      </Panel>

      <Modal
        open={modal !== null}
        onClose={closeModal}
        title={modal === "edit" ? "Edit product" : "New product"}
        description={
          modal === "edit"
            ? draft.id
            : "Creates a visible product on the storefront."
        }
        footer={
          <>
            <Button onClick={closeModal}>Cancel</Button>
            <Button variant="primary" onClick={save}>
              {modal === "edit" ? "Save changes" : "Create product"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {draftErrors.length > 0 && <Alert>{draftErrors.join(" ")}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Stock code"
              value={draft.id}
              disabled={modal === "edit"}
              onChange={(event) =>
                setDraft({ ...draft, id: event.target.value })
              }
              placeholder="AIR-007"
              hint={
                modal === "edit"
                  ? "Stock code cannot change."
                  : undefined
              }
            />

            <Select
              label="Category"
              value={draft.family}
              onChange={(event) => {
                const family = event.target.value as CategorySlug;

                /* The two fields move together: choosing a category always
                   lands on a valid subcategory of that category. */
                setDraft({
                  ...draft,
                  family,
                  category: SUBCATEGORIES[family][0].slug,
                });
              }}
            >
              {CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <Select
            label="Subcategory"
            required
            value={draft.category}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value })
            }
          >
            {draftSubcategories.map((subcategory) => (
              <option key={subcategory.slug} value={subcategory.slug}>
                {subcategory.label}
              </option>
            ))}
          </Select>

          <div className="space-y-4 rounded-lg border border-line bg-sunken p-4">
            <div>
              <Select
                label="Language"
                value={draft.language}
                onChange={(event) =>
                  setDraft({ ...draft, language: event.target.value as Locale })
                }
              >
                {locales.map((locale) => (
                  <option key={locale} value={locale}>
                    {localeNames[locale]} ({localeLabels[locale]})
                    {draft.translations[locale].name ? " ✓" : ""}
                  </option>
                ))}
              </Select>

              <p className="field-hint mt-1">
                Product text is stored per language; fill as many as you need.
              </p>
            </div>

            <Input
              label={`Name (${localeLabels[draft.language]})`}
              required
              value={draft.translations[draft.language].name}
              onChange={(event) =>
                updateTranslation(draft.language, {
                  name: event.target.value,
                })
              }
              placeholder="Washed corduroy armchair"
            />

            <Textarea
              label={`Description (${localeLabels[draft.language]})`}
              required
              rows={3}
              value={draft.translations[draft.language].description}
              onChange={(event) =>
                updateTranslation(draft.language, {
                  description: event.target.value,
                })
              }
            />

            <TechnicalDetailsEditor
              specs={
                draft.translations[draft.language]
                  .technicalDetails
              }
              onChange={(technicalDetails) =>
                updateTranslation(draft.language, {
                  technicalDetails,
                })
              }
            />
          </div>

          <ImageInput
            required
            value={draft.image}
            onChange={(url) => setDraft({ ...draft, image: url })}
            folder="products"
          />

          <div className="space-y-4 rounded-lg border border-line bg-sunken p-4">
            {CURRENCIES.map((currency) => {
              const money = draft.pricing[currency];
              const preview = draftMoney[currency];

              return (
                <div key={currency} className="space-y-3">
                  <p className="cell-strong text-sm">
                    {currency === "USD"
                      ? "US Dollar (USD)"
                      : "Turkish Lira (TRY)"}
                  </p>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                      label={`${currency} price`}
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={money.price}
                      onChange={(event) =>
                        setPrice(currency, event.target.value)
                      }
                      placeholder="0.00"
                    />

                    <Input
                      label="Discount %"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      inputMode="numeric"
                      value={money.discountPercent}
                      onChange={(event) =>
                        setDiscountPercent(currency, event.target.value)
                      }
                      placeholder="0"
                    />

                    <Input
                      label="Discounted price"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={money.discountedPrice}
                      onChange={(event) =>
                        setDiscountedPrice(currency, event.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="cell-muted">Storefront:</span>

                    {isDiscounted(preview) ? (
                      <>
                        <span className="cell-strong">
                          {formatPrice(effectivePrice(preview), currency)}
                        </span>

                        <span className="cell-muted line-through">
                          {formatPrice(preview.price, currency)}
                        </span>

                        <Badge tone="ok">
                          -{discountPercentOf(preview) ?? 0}%
                        </Badge>
                      </>
                    ) : preview.price !== null ? (
                      <span className="cell-strong">
                        {formatPrice(preview.price, currency)}
                      </span>
                    ) : (
                      <span className="cell-muted">No price</span>
                    )}
                  </div>
                </div>
              );
            })}

            <p className="field-hint">
              Leave a currency blank to hide that price. Editing the
              percentage fills the discounted price, and vice versa.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-line bg-sunken px-3 py-2.5">
            <span className="cell-muted">
              Visible on storefront
            </span>

            <Switch
              checked={draft.visible}
              label="Visible on storefront"
              onChange={(next) => setDraft({ ...draft, visible: next })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Delete product"
        description={
          removing
            ? `${productName(removing)} (${removing.id})`
            : undefined
        }
        footer={
          <>
            <Button onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={remove}
              disabled={pendingId === removing?.id}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="cell-muted">
          The product disappears from the storefront immediately. Past list
          items keep their quantity but lose the link to this product and
          will be shown as &quot;Product removed&quot;.
        </p>
      </Modal>
    </div>
  );
}

/**
 * Repeatable "label: value" rows for one language. The order is the order the
 * storefront prints, so the rows can be moved up and down.
 */
function TechnicalDetailsEditor({
  specs,
  onChange,
}: {
  specs: ProductSpec[];
  onChange: (specs: ProductSpec[]) => void;
}) {
  function update(index: number, patch: Partial<ProductSpec>) {
    onChange(
      specs.map((row, position) =>
        position === index ? { ...row, ...patch } : row,
      ),
    );
  }

  function move(index: number, offset: number) {
    const rows = [...specs];
    const target = index + offset;

    if (target < 0 || target >= rows.length) return;

    const [row] = rows.splice(index, 1);

    rows.splice(target, 0, row);

    onChange(rows);
  }

  return (
    <div className="space-y-3">
      <p className="field-label">Technical details</p>

      {specs.length === 0 && (
        <p className="field-hint">
          Shown as a spec list under the product on its detail page. Labels are
          per language, so fill them in for every language you translate.
        </p>
      )}

      {specs.map((spec, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-md border border-line bg-panel p-3 sm:grid-cols-2"
        >
          <Input
            label="Label"
            value={spec.label}
            maxLength={MAX_TECHNICAL_DETAIL_LENGTH}
            placeholder="Flow rate"
            onChange={(event) =>
              update(index, { label: event.target.value })
            }
          />

          <Input
            label="Value"
            value={spec.value}
            maxLength={MAX_TECHNICAL_DETAIL_LENGTH}
            placeholder="520 cfm @ 3.0 inHg"
            onChange={(event) =>
              update(index, { value: event.target.value })
            }
          />

          <div className="flex items-center gap-1 sm:col-span-2">
            <IconButton
              label="Move technical detail up"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </IconButton>

            <IconButton
              label="Move technical detail down"
              disabled={index === specs.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown className="size-4" aria-hidden="true" />
            </IconButton>

            <IconButton
              label="Remove technical detail"
              onClick={() =>
                onChange(
                  specs.filter((_, position) => position !== index),
                )
              }
            >
              <Trash2
                className="size-4 text-danger"
                aria-hidden="true"
              />
            </IconButton>

            <span className="cell-muted ml-auto text-xs">
              {index + 1} / {specs.length}
            </span>
          </div>
        </div>
      ))}

      <Button
        type="button"
        size="sm"
        disabled={specs.length >= MAX_TECHNICAL_DETAILS}
        onClick={() =>
          onChange([...specs, { label: "", value: "" }])
        }
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add technical detail
      </Button>

      {specs.length >= MAX_TECHNICAL_DETAILS && (
        <p className="field-hint">
          A product can hold at most {MAX_TECHNICAL_DETAILS} technical
          details.
        </p>
      )}
    </div>
  );
}
