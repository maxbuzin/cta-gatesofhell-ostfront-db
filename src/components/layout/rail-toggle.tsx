"use client";

import { PanelLeft } from "lucide-react";
import { useLayoutEffect, useSyncExternalStore } from "react";

const KEY = "rail-collapsed";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function collapsedNow() {
  return localStorage.getItem(KEY) === "1";
}

function apply(collapsed: boolean) {
  const root = document.documentElement.style;
  if (collapsed) {
    root.setProperty("--rail-left", "3.5rem");
    document.documentElement.classList.add("rail-collapsed");
  } else {
    root.removeProperty("--rail-left");
    document.documentElement.classList.remove("rail-collapsed");
  }
}

function toggleRail() {
  const next = !collapsedNow();
  localStorage.setItem(KEY, next ? "1" : "0");
  apply(next);
  for (const listener of listeners) listener();
}

export function useRailCollapsed() {
  return useSyncExternalStore(subscribe, collapsedNow, () => false);
}

export function RailToggle() {
  const collapsed = useRailCollapsed();

  useLayoutEffect(() => {
    apply(localStorage.getItem(KEY) === "1");
  }, [collapsed]);

  return (
    <button
      type="button"
      className="hidden size-8 items-center justify-center rounded-md border border-border bg-sidebar text-muted-foreground hover:text-foreground md:inline-flex"
      aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
      aria-pressed={collapsed}
      onClick={toggleRail}
    >
      <PanelLeft className="size-4" aria-hidden />
    </button>
  );
}
