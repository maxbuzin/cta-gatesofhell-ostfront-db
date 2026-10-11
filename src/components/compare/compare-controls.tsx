"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function CompareControls({ slugs }: { slugs: string[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  return (
    <div className="flex flex-wrap gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={slugs.length >= 4}>
            Add unit
          </Button>
        </PopoverTrigger>
        <PopoverContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Enter a unit slug (max 4).
          </p>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. pz-iv-h"
            maxLength={64}
          />
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              const s = slug.trim().toLowerCase().slice(0, 64);
              if (!s) return;
              const next = [...new Set([...slugs, s])].slice(0, 4);
              router.push(`/compare?units=${next.join(",")}`);
              setSlug("");
            }}
          >
            Add
          </Button>
        </PopoverContent>
      </Popover>
      <Button
        variant="secondary"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success("Comparison link copied");
          } catch {
            toast.error("Could not copy link");
          }
        }}
      >
        Share comparison
      </Button>
    </div>
  );
}
