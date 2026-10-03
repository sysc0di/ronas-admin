"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * The list never leaves the visitor's browser: products are added, counted and
 * edited here, and only a submission sends it to the API. localStorage is the
 * external store, so every component stays in sync through the storage event.
 */

const STORAGE_KEY = "ronas_list";
const MAX_QUANTITY = 999;

export type StoredListItem = {
  productId: string;
  quantity: number;
};

export type StoredList = {
  items: StoredListItem[];
};

const EMPTY_LIST: StoredList = { items: [] };

const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedList: StoredList = EMPTY_LIST;

function parseList(raw: string | null): StoredList {
  if (!raw) return EMPTY_LIST;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredList>;

    if (!Array.isArray(parsed.items)) return EMPTY_LIST;

    const items: StoredListItem[] = [];

    for (const entry of parsed.items) {
      if (
        typeof entry?.productId !== "string" ||
        !Number.isInteger(entry?.quantity) ||
        entry.quantity < 1
      ) {
        continue;
      }

      if (items.some((item) => item.productId === entry.productId)) continue;

      items.push({
        productId: entry.productId,
        quantity: Math.min(entry.quantity, MAX_QUANTITY),
      });
    }

    return { items };
  } catch {
    return EMPTY_LIST;
  }
}

function getSnapshot(): StoredList {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parseList(raw);
  }

  return cachedList;
}

function getServerSnapshot(): StoredList {
  return EMPTY_LIST;
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  };

  listeners.add(onStoreChange);
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(list: StoredList) {
  try {
    if (list.items.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(list),
      );
    }
  } catch {
    /* Private mode or a full quota: the list stays in memory only. */
  }

  emit();
}

export function countList(list: StoredList) {
  return list.items.reduce((total, item) => total + item.quantity, 0);
}

export function useLocalList() {
  const list = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const add = useCallback((productId: string) => {
    const current = getSnapshot();
    const existing = current.items.find(
      (item) => item.productId === productId,
    );

    commit(
      existing
        ? {
            items: current.items.map((item) =>
              item.productId === productId
                ? {
                    ...item,
                    quantity: Math.min(
                      item.quantity + 1,
                      MAX_QUANTITY,
                    ),
                  }
                : item,
            ),
          }
        : {
            items: [...current.items, { productId, quantity: 1 }],
          },
    );
  }, []);

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      const current = getSnapshot();

      if (quantity < 1) {
        commit({
          items: current.items.filter(
            (item) => item.productId !== productId,
          ),
        });

        return;
      }

      commit({
        items: current.items.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: Math.min(quantity, MAX_QUANTITY),
              }
            : item,
        ),
      });
    },
    [],
  );

  const remove = useCallback((productId: string) => {
    const current = getSnapshot();

    commit({
      items: current.items.filter(
        (item) => item.productId !== productId,
      ),
    });
  }, []);

  const clear = useCallback(() => {
    commit(EMPTY_LIST);
  }, []);

  const has = useCallback(
    (productId: string) =>
      list.items.some((item) => item.productId === productId),
    [list.items],
  );

  return useMemo(
    () => ({
      list,
      count: countList(list),
      has,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [list, has, add, setQuantity, remove, clear],
  );
}