"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SaveButton } from "@/components/edit/edit-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResearchParentFields } from "@/components/edit/research-parents";
import { sectionLabel } from "@/lib/research-section";

export function ResearchParentEditor({
  factionSlug,
  nodeSlug,
  parentSlugs,
  choices,
}: {
  factionSlug: string;
  nodeSlug: string;
  parentSlugs: string[];
  choices: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [parents, setParents] = useState(() => (parentSlugs.length ? [...parentSlugs] : [""]));
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
          parentSlugs: parents.filter(Boolean),
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
      <ResearchParentFields
        slots={parents}
        onChange={setParents}
        choices={choices}
        idPrefix={`research-parent-${nodeSlug}`}
        excludeSlug={nodeSlug}
        labelClassName="block space-y-1"
        spanClassName="text-muted-foreground"
      />
      <div className="flex items-center gap-3">
        <SaveButton pending={pending} onClick={() => void save()} />
        {error ? <p className="text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

export function ResearchSectionEditor({
  factionSlug,
  nodeSlug,
  sectionId,
  sections,
}: {
  factionSlug: string;
  nodeSlug: string;
  sectionId: number | null;
  sections: { id: number; name: string | null; sortOrder: number; firstName?: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  if (ordered.length === 0) return null;

  async function onChange(value: string) {
    const id = Number(value);
    if (!Number.isInteger(id) || id === sectionId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/local-edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "research-section",
          factionSlug,
          nodeSlug,
          sectionId: id,
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
    <label className="block space-y-1">
      <span className="text-muted-foreground">Section</span>
      <Select
        value={sectionId == null ? undefined : String(sectionId)}
        onValueChange={(value) => void onChange(value)}
        disabled={pending}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Section" />
        </SelectTrigger>
        <SelectContent position="popper">
          {ordered.map((section, index) => (
            <SelectItem key={section.id} value={String(section.id)}>
              {sectionLabel(section.name, index, section.firstName)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-destructive">{error}</p> : null}
    </label>
  );
}
