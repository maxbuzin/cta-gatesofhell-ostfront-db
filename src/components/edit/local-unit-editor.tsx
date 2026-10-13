"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function LocalUnitEditor({ slug, initial }: { slug: string; initial: string }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    let unit: unknown;
    try {
      unit = JSON.parse(text);
    } catch {
      setError("Invalid JSON");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/local-edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "unit", slug, unit }),
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
    <section className="space-y-2 rounded-md border border-border p-4">
      <h2 className="font-medium">Edit snapshot</h2>
      <p className="text-sm text-muted-foreground">
        Writes this unit back into game-units.json. id, roster, side, and period stay fixed.
      </p>
      <textarea
        aria-label="Unit snapshot JSON"
        autoCapitalize="off"
        autoCorrect="off"
        className="max-h-[32rem] min-h-80 w-full rounded-md border border-input bg-input/30 px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        spellCheck={false}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "Saving..." : "Save"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </section>
  );
}
