"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { StatField } from "@/lib/local-edit-guard";
import { cn } from "@/lib/utils";

type StatSave = { kind: "stat"; slug: string; field: StatField };
type NodeSave = {
  kind: "node";
  factionSlug: string;
  nodeSlug: string;
  field: "name" | "cost";
};

export function InlineEdit({
  label,
  value,
  kind,
  save,
  display,
  className,
}: {
  label: string;
  value: string | number | null;
  kind: "text" | "number";
  save: StatSave | NodeSave;
  display?: string;
  className?: string;
}) {
  const router = useRouter();
  const initial = value == null ? "" : String(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const cancelRef = useRef(false);
  const shown = display ?? (value == null || value === "" ? "--" : String(value));

  async function commit(next: string) {
    if (next === initial) {
      setEditing(false);
      setError(null);
      return;
    }
    let parsed: string | number | null = next;
    if (kind === "number") {
      const trimmed = next.trim();
      if (!trimmed) parsed = null;
      else {
        const n = Number(trimmed);
        if (!Number.isFinite(n)) {
          setError("Invalid number");
          return;
        }
        parsed = n;
      }
    } else if (!next.trim()) {
      setError("Invalid name");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const body =
        save.kind === "stat"
          ? { kind: "stat", slug: save.slug, field: save.field, value: parsed }
          : {
              kind: "node",
              factionSlug: save.factionSlug,
              nodeSlug: save.nodeSlug,
              field: save.field,
              value: parsed,
            };
      const res = await fetch("/api/local-edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(payload?.error || "Save failed");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Save failed");
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={cn(
          "nodrag nopan cursor-text rounded-sm text-left hover:bg-muted/50",
          className,
        )}
        aria-label={`Edit ${label}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          cancelRef.current = false;
          setDraft(initial);
          setError(null);
          setEditing(true);
        }}
      >
        {shown}
      </button>
    );
  }

  return (
    <span className="nodrag nopan inline-flex flex-col" onPointerDown={(event) => event.stopPropagation()}>
      <input
        autoFocus
        aria-label={label}
        disabled={pending}
        inputMode={kind === "number" ? "decimal" : "text"}
        className={cn(
          "w-full rounded-sm border border-input bg-background px-1 py-0.5 text-left text-inherit outline-none",
          className,
        )}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelRef.current = true;
            setDraft(initial);
            setError(null);
            setEditing(false);
          }
          if (event.key === "Enter") {
            event.preventDefault();
            void commit(draft);
          }
        }}
        onBlur={() => {
          if (cancelRef.current) {
            cancelRef.current = false;
            return;
          }
          void commit(draft);
        }}
      />
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
