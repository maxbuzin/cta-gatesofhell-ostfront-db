"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";

import { AddNew, type AddRequest, type ResearchSeed } from "@/components/edit/add-new";
import { ResearchTreeClient } from "@/components/research/research-tree-client";
import type { ResearchNodeData, ResearchSectionData } from "@/components/research/research-tree-canvas";
import { FACTIONS } from "@/lib/factions";
import { cn } from "@/lib/utils";

type FactionOpt = { slug: string; nameEn: string };
type ResearchOpt = {
  factionSlug: string;
  slug: string;
  name: string;
  sectionId: number | null;
  sortOrder: number;
};
type SectionOpt = { id: number; factionSlug: string; name: string | null; sortOrder: number };

export function ResearchBoard({
  editable,
  factions,
  research,
  sections,
  nodes,
  edges,
  treeSections,
  highlightSlug,
  factionSlug,
}: {
  editable: boolean;
  factions: FactionOpt[];
  research: ResearchOpt[];
  sections: SectionOpt[];
  nodes: ResearchNodeData[];
  edges: { fromNodeId: number; toNodeId: number }[];
  treeSections: ResearchSectionData[];
  highlightSlug: string | null;
  factionSlug: string;
}) {
  const [request, setRequest] = useState<AddRequest | null>(null);
  const [pendingResearch, setPendingResearch] = useState<ResearchOpt[]>([]);
  const [pendingSections, setPendingSections] = useState<SectionOpt[]>([]);
  const addRef = useRef<((seed: ResearchSeed) => void) | null>(null);
  const queue = useRef<ResearchSeed[]>([]);
  const stageResearch = useCallback((seed: ResearchSeed) => {
    if (addRef.current) addRef.current(seed);
    else queue.current.push(seed);
  }, []);
  const onReady = useCallback(() => {
    const pending = queue.current.splice(0);
    for (const seed of pending) addRef.current?.(seed);
  }, []);
  const onPending = useCallback(
    (pending: { research: ResearchOpt[]; sections: SectionOpt[] }) => {
      setPendingResearch(pending.research);
      setPendingSections(pending.sections);
    },
    [],
  );
  const chips =
    factions.length > 0
      ? factions.map((f) => ({
          slug: f.slug,
          nameEn: FACTIONS.find((d) => d.slug === f.slug)?.nameEn || f.nameEn,
        }))
      : FACTIONS;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-semibold tracking-tight">Research Tree</h1>
        <nav className="flex flex-wrap gap-1.5" aria-label="Factions">
          {chips.map((f) => (
            <Link
              key={f.slug}
              href={`/research/${f.slug}`}
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs transition-colors",
                f.slug === factionSlug
                  ? "border-brass bg-brass/10"
                  : "border-border hover:border-primary/50",
              )}
            >
              {f.nameEn}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Locked = default</span>
          <span className="text-xs text-brass">Selected path</span>
          {editable ? (
            <AddNew
              factions={factions}
              research={[...research, ...pendingResearch]}
              sections={[...sections, ...pendingSections]}
              kinds={["research", "faction"]}
              request={request}
              onRequest={setRequest}
              stageFaction={factionSlug}
              onResearch={stageResearch}
              iconSize="icon-sm"
            />
          ) : null}
        </div>
      </div>
      <ResearchTreeClient
        nodes={nodes}
        edges={edges}
        sections={treeSections}
        highlightSlug={highlightSlug}
        factionSlug={factionSlug}
        editable={editable}
        onAdd={(sectionId, mode) => setRequest({ mode, sectionId })}
        addRef={addRef}
        onPending={onPending}
        onReady={onReady}
      />
    </div>
  );
}
