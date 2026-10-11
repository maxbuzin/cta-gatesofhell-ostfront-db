"use client";

import { GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompare } from "@/lib/compare-store";

export function AddCompareButton({
  slug,
  name,
  factionSlug,
  mode = "button",
}: {
  slug: string;
  name: string;
  factionSlug?: string;
  mode?: "button" | "checkbox";
}) {
  const { add, remove, has } = useCompare();
  const checked = has(slug);

  if (mode === "checkbox") {
    return (
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => {
          if (v) add({ slug, name, factionSlug });
          else remove(slug);
        }}
        aria-label={`Compare ${name}`}
      />
    );
  }

  return (
    <Button
      variant={checked ? "secondary" : "outline"}
      size="sm"
      onClick={() => {
        if (checked) remove(slug);
        else add({ slug, name, factionSlug });
      }}
    >
      <GitCompare className="size-3.5" />
      {checked ? "In compare" : "+ Compare"}
    </Button>
  );
}
