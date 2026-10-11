"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useCompare } from "@/lib/compare-store";
import { Button } from "@/components/ui/button";

export function CompareTray() {
  const { items, remove, clear } = useCompare();
  if (items.length === 0) return null;

  const href = `/compare?units=${items.map((i) => i.slug).join(",")}`;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-3 py-3 shadow-lg backdrop-blur transition-transform duration-200"
      role="region"
      aria-label="Compare tray"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Compare ({items.length}/4)
        </span>
        <div className="flex flex-1 flex-wrap gap-2">
          {items.map((item) => (
            <div
              key={item.slug}
              className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              <span className="max-w-36 truncate">{item.name}</span>
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${item.name}`}
                onClick={() => remove(item.slug)}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
          <Button size="sm" asChild>
            <Link href={href}>Compare</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
