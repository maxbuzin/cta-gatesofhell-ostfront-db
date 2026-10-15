"use client";

import { Input } from "@/components/ui/input";
import type { UnitFieldDraft } from "@/lib/unit-profile";

const NUMBERS: { key: keyof UnitFieldDraft; label: string; step: string }[] = [
  { key: "hp", label: "HP", step: "1" },
  { key: "armor", label: "Armor (mm)", step: "1" },
  { key: "speed", label: "Speed (km/h)", step: "0.1" },
  { key: "reload", label: "Reload (s)", step: "0.01" },
  { key: "penetration", label: "Penetration (mm)", step: "0.1" },
  { key: "cp", label: "Command points", step: "1" },
  { key: "cost", label: "Resources", step: "1" },
];

const TEXTS: { key: keyof UnitFieldDraft; label: string }[] = [
  { key: "bestAt", label: "Best at" },
  { key: "weakAgainst", label: "Weak against" },
  { key: "description", label: "Description" },
];

export function UnitFields({
  value,
  onChange,
  disabled,
}: {
  value: UnitFieldDraft;
  onChange: (next: UnitFieldDraft) => void;
  disabled?: boolean;
}) {
  function set(key: keyof UnitFieldDraft, next: string) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {NUMBERS.map((field) => (
          <label key={field.key} className="block space-y-1 text-sm">
            <span>{field.label}</span>
            <Input
              inputMode="decimal"
              min={0}
              step={field.step}
              disabled={disabled}
              value={value[field.key]}
              onChange={(event) => set(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>
      {TEXTS.map((field) => (
        <label key={field.key} className="block space-y-1 text-sm">
          <span>{field.label}</span>
          <textarea
            disabled={disabled}
            maxLength={4000}
            className="min-h-20 w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            value={value[field.key]}
            onChange={(event) => set(field.key, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}
