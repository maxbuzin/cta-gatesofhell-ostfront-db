"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const NONE = "__none__";

export function emptyParents() {
  return [""];
}

function ParentPicker({
  id,
  labelId,
  value,
  choices,
  onPick,
}: {
  id: string;
  labelId: string;
  value: string;
  choices: { slug: string; name: string }[];
  onPick: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = choices.find((choice) => choice.slug === value);
  const q = query.trim().toLowerCase();
  const shown = choices.filter((choice) => !q || choice.name.toLowerCase().includes(q));
  const valueId = `${id}-value`;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function close(slug: string) {
    onPick(slug);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        id={id}
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${valueId}`}
        className="w-full justify-between font-normal"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span id={valueId} className="truncate">
          {selected?.name ?? "None"}
        </span>
        <ChevronDownIcon className="opacity-50" />
      </Button>
      {open ? (
        <div className="absolute top-full z-[60] mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <Command shouldFilter={false} className="h-auto">
            <CommandInput
              autoFocus
              placeholder="Search"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandItem value={NONE} onSelect={() => close("")}>
                None
              </CommandItem>
              {shown.map((choice) => (
                <CommandItem
                  key={choice.slug}
                  value={choice.slug}
                  onSelect={() => close(choice.slug)}
                >
                  {choice.name}
                </CommandItem>
              ))}
              {shown.length === 0 ? <CommandEmpty>No match</CommandEmpty> : null}
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  );
}

export function ResearchParentFields({
  slots,
  onChange,
  choices,
  idPrefix,
  excludeSlug = "",
  labelClassName = "block space-y-1 text-sm",
  spanClassName,
}: {
  slots: string[];
  onChange: (slots: string[]) => void;
  choices: { slug: string; name: string }[];
  idPrefix: string;
  excludeSlug?: string;
  labelClassName?: string;
  spanClassName?: string;
}) {
  const taken = new Set(slots.filter(Boolean));
  return (
    <div className="space-y-3">
      {slots.map((current, index) => {
        const options = choices.filter(
          (choice) =>
            choice.slug !== excludeSlug &&
            choice.slug !== NONE &&
            (choice.slug === current || !taken.has(choice.slug)),
        );
        return (
          <div key={`${idPrefix}-${index}`} className={labelClassName}>
            <span className={cn("flex items-center justify-between gap-2", spanClassName)}>
              <span id={`${idPrefix}-${index}-label`}>Requires</span>
              {index > 0 ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => onChange(slots.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              ) : null}
            </span>
            <ParentPicker
              id={`${idPrefix}-${index}`}
              labelId={`${idPrefix}-${index}-label`}
              value={current}
              choices={options}
              onPick={(slug) => onChange(slots.map((item, i) => (i === index ? slug : item)))}
            />
          </div>
        );
      })}
      <Button type="button" variant="outline" onClick={() => onChange([...slots, ""])}>
        Add requires
      </Button>
    </div>
  );
}
