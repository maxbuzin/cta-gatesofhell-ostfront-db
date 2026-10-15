"use client";

import dynamic from "next/dynamic";
import type { ResearchSeed } from "@/components/edit/add-new";
import type {
  PendingCatalog,
  ResearchNodeData,
  ResearchSectionData,
  SectionAddMode,
} from "@/components/research/research-tree-canvas";

const ResearchTreeCanvas = dynamic(
  () =>
    import("@/components/research/research-tree-canvas").then(
      (m) => m.ResearchTreeCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading tree...</p>
    ),
  },
);

export function ResearchTreeClient({
  nodes,
  edges,
  sections = [],
  highlightSlug = null,
  factionSlug = null,
  editable = false,
  onAdd = null,
  addRef = null,
  onPending = null,
  onReady = null,
}: {
  nodes: ResearchNodeData[];
  edges: { fromNodeId: number; toNodeId: number }[];
  sections?: ResearchSectionData[];
  highlightSlug?: string | null;
  factionSlug?: string | null;
  editable?: boolean;
  onAdd?: ((sectionId: number, mode: SectionAddMode) => void) | null;
  addRef?: { current: ((seed: ResearchSeed) => void) | null } | null;
  onPending?: ((pending: PendingCatalog) => void) | null;
  onReady?: (() => void) | null;
}) {
  return (
    <ResearchTreeCanvas
      nodes={nodes}
      edges={edges}
      sections={sections}
      highlightSlug={highlightSlug}
      factionSlug={factionSlug}
      editable={editable}
      onAdd={onAdd}
      addRef={addRef}
      onPending={onPending}
      onReady={onReady}
    />
  );
}
