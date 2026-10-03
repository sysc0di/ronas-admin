"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  DEFAULT_CURRENCY_BY_LOCALE,
  isCurrency,
  type Currency,
} from "@/lib/price";
import type { Locale } from "@/lib/i18n";

const STORAGE_KEY = "ronas_currency";
const CHANGE_EVENT = "ronas:currency";

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Currency shown in the storefront/list. The visitor's saved choice wins,
 * otherwise it falls back to the current language's default. The server and
 * first client render use the language default, then React refreshes to the
 * stored value after hydration.
 */
export function useCurrency(
  locale: Locale,
): [Currency, (next: Currency) => void] {
  const stored = useSyncExternalStore(
    subscribe,
    readStored,
    () => null,
  );

  const currency: Currency = isCurrency(stored)
    ? stored
    : DEFAULT_CURRENCY_BY_LOCALE[locale];

  const update = useCallback((next: Currency) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Persisting is best-effort; the change event still updates this tab. */
    }

    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [currency, update];
}
