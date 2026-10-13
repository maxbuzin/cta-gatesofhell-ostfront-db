"use client";

import dynamic from "next/dynamic";
import type { ResearchNodeData } from "@/components/research/research-tree-canvas";

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
  highlightSlug = null,
  factionSlug = null,
  editable = false,
}: {
  nodes: ResearchNodeData[];
  edges: { fromNodeId: number; toNodeId: number }[];
  highlightSlug?: string | null;
  factionSlug?: string | null;
  editable?: boolean;
}) {
  return (
    <ResearchTreeCanvas
      nodes={nodes}
      edges={edges}
      highlightSlug={highlightSlug}
      factionSlug={factionSlug}
      editable={editable}
    />
  );
}
