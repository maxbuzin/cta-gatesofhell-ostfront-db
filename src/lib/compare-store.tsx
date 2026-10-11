"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "sonner";

export type CompareItem = {
  slug: string;
  name: string;
  factionSlug?: string;
};

type CompareContextValue = {
  items: CompareItem[];
  add: (item: CompareItem) => void;
  remove: (slug: string) => void;
  clear: () => void;
  has: (slug: string) => boolean;
};

const CompareContext = createContext<CompareContextValue | null>(null);
const STORAGE_KEY = "ostfront-compare";
const MAX = 4;
const EMPTY: CompareItem[] = [];
const listeners = new Set<() => void>();
let cache: CompareItem[] = EMPTY;
let cacheRaw: string | null = null;

function emit() {
  for (const l of listeners) l();
}

function readStore(): CompareItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cacheRaw) return cache;
    cacheRaw = raw;
    if (!raw) {
      cache = EMPTY;
      return cache;
    }
    const parsed = JSON.parse(raw) as CompareItem[];
    cache = Array.isArray(parsed) ? parsed.slice(0, MAX) : EMPTY;
    return cache;
  } catch {
    cache = EMPTY;
    cacheRaw = null;
    return EMPTY;
  }
}

function getServerSnapshot() {
  return EMPTY;
}

function writeStore(items: CompareItem[]) {
  const next = items.slice(0, MAX);
  try {
    const raw = JSON.stringify(next);
    localStorage.setItem(STORAGE_KEY, raw);
    cacheRaw = raw;
    cache = next.length === 0 ? EMPTY : next;
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, readStore, getServerSnapshot);

  const add = useCallback((item: CompareItem) => {
    const prev = readStore();
    if (prev.some((p) => p.slug === item.slug)) return;
    if (prev.length >= MAX) {
      toast.message(`Compare limit is ${MAX} units`);
      return;
    }
    toast.success(`Added ${item.name} to compare`);
    writeStore([...prev, item]);
  }, []);

  const remove = useCallback((slug: string) => {
    writeStore(readStore().filter((p) => p.slug !== slug));
  }, []);

  const clear = useCallback(() => writeStore([]), []);

  const has = useCallback(
    (slug: string) => items.some((i) => i.slug === slug),
    [items],
  );

  const value = useMemo(
    () => ({ items, add, remove, clear, has }),
    [items, add, remove, clear, has],
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
