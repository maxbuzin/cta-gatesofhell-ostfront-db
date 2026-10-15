"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AMMO_KINDS,
  CATEGORY_LABEL,
  TYPE_CATEGORIES,
  type AmmoDraft,
  type AmmoKind,
  type TypeChoice,
  type TypeOption,
} from "@/lib/unit-loadout";

export function TypeLabel({ name }: { name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-sm text-muted-foreground">{name}</span>
      </TooltipTrigger>
      <TooltipContent>Unit type</TooltipContent>
    </Tooltip>
  );
}

export function TypeSelect({
  types,
  value,
  disabled,
  onChange,
}: {
  types: TypeOption[];
  value: TypeChoice;
  disabled?: boolean;
  onChange: (next: TypeChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const typed = query.trim().replace(/\s+/g, " ");
  const canAdd =
    typed.length > 0 &&
    !types.some((type) => type.name.toLowerCase() === typed.toLowerCase());

  function close() {
    setOpen(false);
    setAdding(false);
    setQuery("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setAdding(false);
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled} aria-label="Unit type">
          {value.name || "Unit type"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Unit type" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No type</CommandEmpty>
            <CommandGroup>
              {types.map((type) => (
                <CommandItem
                  key={type.code}
                  value={`${type.name} ${type.code}`}
                  onSelect={() => {
                    onChange({
                      code: type.code,
                      name: type.name,
                      category: type.category,
                      fresh: false,
                    });
                    close();
                  }}
                >
                  {type.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {canAdd ? (
              <CommandGroup>
                <CommandItem value={`${typed} add type`} onSelect={() => setAdding(true)}>
                  Add {typed}
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
        {adding ? (
          <div className="grid grid-cols-2 gap-1 border-t p-2">
            {TYPE_CATEGORIES.map((category) => (
              <Button
                key={category}
                type="button"
                size="sm"
                variant={category === value.category ? "secondary" : "ghost"}
                onClick={() => {
                  onChange({
                    code: null,
                    name: typed.slice(0, 80),
                    category,
                    fresh: true,
                  });
                  close();
                }}
              >
                {CATEGORY_LABEL[category]}
              </Button>
            ))}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function AmmoFields({
  value,
  disabled,
  onChange,
}: {
  value: AmmoDraft[];
  disabled?: boolean;
  onChange: (next: AmmoDraft[]) => void;
}) {
  const used = new Set(value.map((row) => row.kind));

  function addKind() {
    const kind = AMMO_KINDS.find((item) => !used.has(item));
    if (!kind) return;
    onChange([...value, { kind, points: [{ rangeM: "", mm: "" }] }]);
  }

  function setKind(index: number, kind: AmmoKind) {
    if (value.some((row, rowIndex) => rowIndex !== index && row.kind === kind)) return;
    onChange(value.map((row, rowIndex) => (rowIndex === index ? { ...row, kind } : row)));
  }

  function setPoint(index: number, pointIndex: number, key: "rangeM" | "mm", next: string) {
    onChange(
      value.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              points: row.points.map((point, i) => (i === pointIndex ? { ...point, [key]: next } : point)),
            }
          : row,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">Ammo</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || used.size >= AMMO_KINDS.length}
          onClick={addKind}
        >
          Add ammo
        </Button>
      </div>
      {value.map((row, index) => (
        <div key={`${row.kind}-${index}`} className="space-y-2 rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Ammo"
              className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm"
              disabled={disabled}
              value={row.kind}
              onChange={(event) => setKind(index, event.target.value as AmmoKind)}
            >
              {AMMO_KINDS.map((kind) => (
                <option key={kind} value={kind} disabled={kind !== row.kind && used.has(kind)}>
                  {kind}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => onChange(value.filter((_, rowIndex) => rowIndex !== index))}
            >
              Remove
            </Button>
          </div>
          {row.points.map((point, pointIndex) => (
            <div key={pointIndex} className="flex flex-wrap items-center gap-2">
              <Input
                aria-label="Meters"
                inputMode="numeric"
                className="w-28"
                placeholder="m"
                disabled={disabled}
                value={point.rangeM}
                onChange={(event) => setPoint(index, pointIndex, "rangeM", event.target.value)}
              />
              <Input
                aria-label="Millimeters"
                inputMode="decimal"
                className="w-28"
                placeholder="mm"
                disabled={disabled}
                value={point.mm}
                onChange={(event) => setPoint(index, pointIndex, "mm", event.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() =>
                  onChange(
                    value.map((item, rowIndex) =>
                      rowIndex === index
                        ? { ...item, points: item.points.filter((_, i) => i !== pointIndex) }
                        : item,
                    ),
                  )
                }
              >
                Remove distance
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || row.points.length >= 24}
            onClick={() =>
              onChange(
                value.map((item, rowIndex) =>
                  rowIndex === index ? { ...item, points: [...item.points, { rangeM: "", mm: "" }] } : item,
                ),
              )
            }
          >
            Add distance
          </Button>
        </div>
      ))}
    </div>
  );
}
