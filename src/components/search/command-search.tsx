"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { Crosshair, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SearchIndexItem = {
  id: number;
  slug: string;
  name: string;
  shortName: string | null;
  factionSlug: string;
  typeCode: string;
  typeName: string;
};

export function CommandSearch({ index }: { index: SearchIndexItem[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const fuse = useMemo(
    () =>
      new Fuse(index, {
        keys: ["name", "shortName", "slug", "typeName", "factionSlug"],
        threshold: 0.35,
      }),
    [index],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    if (!query.trim()) return index.slice(0, 20);
    return fuse.search(query).slice(0, 30).map((r) => r.item);
  }, [fuse, index, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchIndexItem[]>();
    for (const item of results) {
      const list = map.get(item.typeName) ?? [];
      list.push(item);
      map.set(item.typeName, list);
    }
    return map;
  }, [results]);

  return (
    <>
      <div className="relative hidden min-w-0 flex-1 md:block">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          readOnly
          placeholder="Search units... (Ctrl+K)"
          className="cursor-pointer pl-9"
          onClick={() => setOpen(true)}
          aria-label="Open search"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto md:hidden"
        aria-label="Open search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search any unit: Panther, ZiS-3, Pz IV H..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {index.length === 0 ? "No units yet" : "No results found."}
          </CommandEmpty>
          {[...grouped.entries()].map(([type, items]) => (
            <CommandGroup key={type} heading={type}>
              {items.map((item) => (
                <CommandItem
                  key={item.slug}
                  value={`${item.name} ${item.shortName ?? ""} ${item.slug}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/units/${item.slug}`);
                  }}
                >
                  <Crosshair className="size-4 text-muted-foreground" />
                  <span>{item.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.factionSlug}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
