"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function ResearchParentEditor({
  factionSlug,
  nodeSlug,
  parentSlug,
  choices,
}: {
  factionSlug: string;
  nodeSlug: string;
  parentSlug: string | null;
  choices: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [parent, setParent] = useState(parentSlug ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/local-edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "research-parent",
          factionSlug,
          nodeSlug,
          parentSlug: parent || null,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(body?.error || "Save failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <label className="block space-y-1" htmlFor={`research-parent-${nodeSlug}`}>
        <span className="text-muted-foreground">Comes after</span>
        <select
          id={`research-parent-${nodeSlug}`}
          className="h-9 w-full rounded-md border border-input bg-input/30 px-2 text-sm"
          value={parent}
          onChange={(event) => setParent(event.target.value)}
        >
          <option value="">None</option>
          {choices
            .filter((choice) => choice.slug !== nodeSlug)
            .map((choice) => (
              <option key={choice.slug} value={choice.slug}>
                {choice.name}
              </option>
            ))}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "Saving..." : "Save link"}
        </Button>
        {error ? <p className="text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
