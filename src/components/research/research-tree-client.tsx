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
}: {
  nodes: ResearchNodeData[];
  edges: { fromNodeId: number; toNodeId: number }[];
}) {
  return <ResearchTreeCanvas nodes={nodes} edges={edges} />;
}
