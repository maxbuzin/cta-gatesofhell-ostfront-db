"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/units/empty-state";
import { Input } from "@/components/ui/input";

export type ResearchNodeData = {
  id: number;
  slug: string;
  name: string;
  branch: string | null;
  researchCost: number | null;
  units: { unitSlug: string; unitName: string }[];
};

export function ResearchTreeCanvas({
  nodes: rawNodes,
  edges: rawEdges,
}: {
  nodes: ResearchNodeData[];
  edges: { fromNodeId: number; toNodeId: number }[];
}) {
  const [selected, setSelected] = useState<ResearchNodeData | null>(null);
  const [pathQuery, setPathQuery] = useState("");
  const [highlight, setHighlight] = useState<Set<number>>(new Set());

  const nodes: Node[] = useMemo(() => {
    const byBranch = new Map<string, ResearchNodeData[]>();
    for (const n of rawNodes) {
      const b = n.branch || "General";
      const list = byBranch.get(b) ?? [];
      list.push(n);
      byBranch.set(b, list);
    }
    const result: Node[] = [];
    let lane = 0;
    for (const [branch, list] of byBranch) {
      list.forEach((n, i) => {
        const onPath = highlight.has(n.id);
        result.push({
          id: String(n.id),
          position: { x: lane * 260, y: i * 110 },
          data: { label: n.name, cost: n.researchCost, branch, raw: n },
          style: {
            border: onPath ? "2px solid var(--brass)" : "1px solid var(--border)",
            background: onPath ? "color-mix(in srgb, var(--brass) 20%, var(--card))" : "var(--card)",
            color: "var(--foreground)",
            borderRadius: 6,
            padding: 10,
            fontSize: 12,
            width: 200,
          },
        });
      });
      lane += 1;
    }
    return result;
  }, [rawNodes, highlight]);

  const edges: Edge[] = useMemo(
    () =>
      rawEdges.map((e) => ({
        id: `${e.fromNodeId}-${e.toNodeId}`,
        source: String(e.fromNodeId),
        target: String(e.toNodeId),
        style: {
          stroke: highlight.has(e.fromNodeId) && highlight.has(e.toNodeId)
            ? "var(--brass)"
            : "var(--muted-foreground)",
        },
      })),
    [rawEdges, highlight],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    const raw = (node.data as { raw?: ResearchNodeData }).raw;
    if (raw) setSelected(raw);
  }, []);

  const findPath = () => {
    const q = pathQuery.trim().toLowerCase();
    if (!q) {
      setHighlight(new Set());
      return;
    }
    const target = rawNodes.find(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.units.some(
          (u) =>
            u.unitName.toLowerCase().includes(q) ||
            u.unitSlug.toLowerCase().includes(q),
        ),
    );
    if (!target) {
      setHighlight(new Set());
      return;
    }
    const parents = new Map<number, number[]>();
    for (const e of rawEdges) {
      const list = parents.get(e.toNodeId) ?? [];
      list.push(e.fromNodeId);
      parents.set(e.toNodeId, list);
    }
    const seen = new Set<number>();
    const stack = [target.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const p of parents.get(id) ?? []) stack.push(p);
    }
    setHighlight(seen);
    setSelected(target);
  };

  if (rawNodes.length === 0) {
    return (
      <EmptyState
        title="No research nodes yet"
        description="The Conquest research tree will appear here after data import."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1 space-y-1">
          <label htmlFor="find-path" className="text-sm text-muted-foreground">
            Find path
          </label>
          <Input
            id="find-path"
            value={pathQuery}
            onChange={(e) => setPathQuery(e.target.value)}
            placeholder="Target unit or research node..."
          />
        </div>
        <Button onClick={findPath}>Highlight path</Button>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>Locked = default</span>
          <span className="text-brass">Selected path</span>
        </div>
      </div>

      <div className="h-[min(70vh,640px)] overflow-hidden rounded-md border border-border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      <ul className="sr-only">
        {rawNodes.map((n) => (
          <li key={n.id}>
            {n.name}
            {n.units.map((u) => (
              <span key={u.unitSlug}> unlocks {u.unitName}</span>
            ))}
          </li>
        ))}
      </ul>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selected?.name ?? "Research"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 text-sm">
            <p className="font-stat text-muted-foreground">
              Cost: {selected?.researchCost ?? "--"}
            </p>
            <p className="text-muted-foreground">Branch: {selected?.branch || "--"}</p>
            <div className="space-y-2">
              {(selected?.units ?? []).map((u) => (
                <Button key={u.unitSlug} variant="outline" asChild className="w-full justify-start">
                  <Link href={`/units/${u.unitSlug}`}>Open {u.unitName}</Link>
                </Button>
              ))}
              {(selected?.units?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground">No units linked</p>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
