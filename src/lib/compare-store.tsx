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
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function readStore(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompareItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function writeStore(items: CompareItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, readStore, () => []);

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
