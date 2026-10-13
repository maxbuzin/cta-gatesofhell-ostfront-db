"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type EdgeProps,
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
import { InlineEdit } from "@/components/edit/inline-edit";
import { ResearchParentEditor } from "@/components/edit/local-research-editor";
import { EmptyState } from "@/components/units/empty-state";
import { Input } from "@/components/ui/input";

export type ResearchNodeData = {
  id: number;
  slug: string;
  name: string;
  branch: string | null;
  researchCost: number | null;
  units: { unitSlug: string; unitName: string; period: string | null }[];
};

type ResearchEdge = { fromNodeId: number; toNodeId: number };

type CardEdit = {
  factionSlug: string;
  nodeSlug: string;
};

const BOX_W = 208;
const BOX_H = 64;
const COL = 300;
const ROW = 112;

function busPath(sourceX: number, sourceY: number, targetX: number, targetY: number) {
  const span = targetX - sourceX;
  if (span <= COL) {
    const rail = (sourceX + targetX) / 2;
    return `M ${sourceX} ${sourceY} H ${rail} V ${targetY} H ${targetX}`;
  }
  const gap = COL - BOX_W;
  const rail = targetX - gap / 2;
  const channelY = sourceY + BOX_H / 2 + (ROW - BOX_H) / 2;
  const leave = sourceX + 16;
  return `M ${sourceX} ${sourceY} H ${leave} V ${channelY} H ${rail} V ${targetY} H ${targetX}`;
}

function BusEdge({ sourceX, sourceY, targetX, targetY, style, markerEnd }: EdgeProps) {
  return (
    <BaseEdge
      path={busPath(sourceX, sourceY, targetX, targetY)}
      markerEnd={markerEnd}
      style={{ ...style, fill: "none", strokeLinejoin: "miter" }}
    />
  );
}

const edgeTypes = { bus: BusEdge };

function ResearchCard({
  data,
}: {
  data: { label: string; cost: number | null; edit: CardEdit | null };
}) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border-0 !bg-transparent !opacity-0"
      />
      {data.edit ? (
        <InlineEdit
          className="block w-full truncate text-left font-medium leading-snug"
          label="Name"
          kind="text"
          value={data.label}
          save={{
            kind: "node",
            factionSlug: data.edit.factionSlug,
            nodeSlug: data.edit.nodeSlug,
            field: "name",
          }}
        />
      ) : (
        <div className="truncate font-medium leading-snug" title={data.label}>
          {data.label}
        </div>
      )}
      <div className="mt-1 text-muted-foreground">
        Cost:{" "}
        {data.edit ? (
          <InlineEdit
            label="Cost"
            kind="number"
            value={data.cost}
            save={{
              kind: "node",
              factionSlug: data.edit.factionSlug,
              nodeSlug: data.edit.nodeSlug,
              field: "cost",
            }}
          />
        ) : (
          (data.cost ?? "--")
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border-0 !bg-transparent !opacity-0"
      />
    </>
  );
}

const nodeTypes = { research: ResearchCard };

function parentMap(edges: ResearchEdge[]) {
  const parents = new Map<number, number[]>();
  for (const edge of edges) {
    const list = parents.get(edge.toNodeId) ?? [];
    list.push(edge.fromNodeId);
    parents.set(edge.toNodeId, list);
  }
  return parents;
}

function ancestorIds(targetId: number, edges: ResearchEdge[]) {
  const parents = parentMap(edges);
  const seen = new Set<number>();
  const stack = [targetId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const parent of parents.get(id) ?? []) stack.push(parent);
  }
  return seen;
}

function placeNodes(rawNodes: ResearchNodeData[], rawEdges: ResearchEdge[]) {
  const parents = parentMap(rawEdges);
  const depthOf = new Map<number, number>();
  const visiting = new Set<number>();
  const depth = (id: number): number => {
    const known = depthOf.get(id);
    if (known != null) return known;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const above = parents.get(id) ?? [];
    const value = above.length ? 1 + Math.max(...above.map(depth)) : 0;
    visiting.delete(id);
    depthOf.set(id, value);
    return value;
  };
  const columns = new Map<number, ResearchNodeData[]>();
  for (const node of rawNodes) {
    const column = depth(node.id);
    const list = columns.get(column) ?? [];
    list.push(node);
    columns.set(column, list);
  }
  const rowOf = new Map<number, number>();
  const parentRow = (id: number) => {
    const above = parents.get(id) ?? [];
    if (!above.length) return 0;
    let sum = 0;
    let count = 0;
    for (const parent of above) {
      const row = rowOf.get(parent);
      if (row == null) continue;
      sum += row;
      count += 1;
    }
    return count ? sum / count : 0;
  };
  for (const column of [...columns.keys()].sort((a, b) => a - b)) {
    const list = columns.get(column) ?? [];
    list.sort((a, b) => {
      const ar = parentRow(a.id);
      const br = parentRow(b.id);
      if (ar !== br) return ar - br;
      return a.name.localeCompare(b.name);
    });
    list.forEach((node, row) => rowOf.set(node.id, row));
  }
  return { depthOf, rowOf };
}

function nodeForUnit(nodes: ResearchNodeData[], slug: string | null) {
  if (!slug) return null;
  return (
    nodes.find(
      (node) =>
        node.slug === slug || node.units.some((unit) => unit.unitSlug === slug),
    ) ?? null
  );
}

function unitLinkLabel(
  unit: ResearchNodeData["units"][number],
  units: ResearchNodeData["units"],
) {
  const shared = units.filter((row) => row.unitName === unit.unitName).length > 1;
  return shared && unit.period ? `${unit.unitName} (${unit.period})` : unit.unitName;
}

export function ResearchTreeCanvas({
  nodes: rawNodes,
  edges: rawEdges,
  highlightSlug = null,
  factionSlug = null,
  editable = false,
}: {
  nodes: ResearchNodeData[];
  edges: ResearchEdge[];
  highlightSlug?: string | null;
  factionSlug?: string | null;
  editable?: boolean;
}) {
  const [selected, setSelected] = useState<ResearchNodeData | null>(null);
  const [pathQuery, setPathQuery] = useState("");
  const [highlight, setHighlight] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!highlightSlug) return;
    const target = nodeForUnit(rawNodes, highlightSlug);
    if (!target) {
      setHighlight(new Set());
      return;
    }
    setHighlight(ancestorIds(target.id, rawEdges));
    setSelected(target);
  }, [highlightSlug, rawNodes, rawEdges]);

  const nodes: Node[] = useMemo(() => {
    const { depthOf, rowOf } = placeNodes(rawNodes, rawEdges);
    return rawNodes.map((node) => {
      const onPath = highlight.has(node.id);
      return {
        id: String(node.id),
        type: "research",
        position: {
          x: (depthOf.get(node.id) ?? 0) * COL,
          y: (rowOf.get(node.id) ?? 0) * ROW,
        },
        data: {
          label: node.name,
          cost: node.researchCost,
          raw: node,
          edit:
            editable && factionSlug
              ? { factionSlug, nodeSlug: node.slug }
              : null,
        },
        style: {
          border: onPath ? "1px solid var(--brass)" : "1px solid var(--border)",
          background: onPath
            ? "color-mix(in srgb, var(--brass) 20%, var(--card))"
            : "var(--card)",
          color: "var(--foreground)",
          borderRadius: 2,
          padding: "8px 10px",
          fontSize: 12,
          width: BOX_W,
          height: BOX_H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
          boxShadow: "none",
        },
      };
    });
  }, [rawNodes, rawEdges, highlight, editable, factionSlug]);

  const edges: Edge[] = useMemo(
    () =>
      rawEdges.map((edge) => {
        const onPath = highlight.has(edge.fromNodeId) && highlight.has(edge.toNodeId);
        const stroke = onPath ? "var(--brass)" : "var(--muted-foreground)";
        return {
          id: `${edge.fromNodeId}-${edge.toNodeId}`,
          source: String(edge.fromNodeId),
          target: String(edge.toNodeId),
          type: "bus",
          zIndex: onPath ? 1 : 0,
          style: { stroke, strokeWidth: 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: stroke,
          },
        };
      }),
    [rawEdges, highlight],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const raw = (node.data as { raw?: ResearchNodeData }).raw;
    if (raw) setSelected(raw);
  }, []);

  const findPath = () => {
    const query = pathQuery.trim().toLowerCase();
    if (!query) {
      setHighlight(new Set());
      return;
    }
    const target = rawNodes.find(
      (node) =>
        node.name.toLowerCase().includes(query) ||
        node.units.some(
          (unit) =>
            unit.unitName.toLowerCase().includes(query) ||
            unit.unitSlug.toLowerCase().includes(query),
        ),
    );
    if (!target) {
      setHighlight(new Set());
      return;
    }
    setHighlight(ancestorIds(target.id, rawEdges));
    setSelected(target);
  };

  if (rawNodes.length === 0) {
    return (
      <EmptyState
        title="No research nodes"
        description="This faction has no research entries in the game files."
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
            onChange={(event) => setPathQuery(event.target.value)}
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
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          colorMode="dark"
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ "--xy-background-color": "var(--background)" } as CSSProperties}
        >
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      <ul className="sr-only">
        {rawNodes.map((node) => (
          <li key={node.id}>
            {node.name}
            {node.units.map((unit) => (
              <span key={unit.unitSlug}>
                {" "}
                unlocks {unitLinkLabel(unit, node.units)}
              </span>
            ))}
          </li>
        ))}
      </ul>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
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
              {(selected?.units ?? []).map((unit) => (
                <Button
                  key={unit.unitSlug}
                  variant="outline"
                  asChild
                  className="w-full justify-start"
                >
                  <Link href={`/units/${unit.unitSlug}`}>
                    Open {unitLinkLabel(unit, selected?.units ?? [])}
                  </Link>
                </Button>
              ))}
              {(selected?.units?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground">No units linked</p>
              ) : null}
            </div>
            {editable && factionSlug && selected ? (
              <ResearchParentEditor
                key={selected.slug}
                factionSlug={factionSlug}
                nodeSlug={selected.slug}
                parentSlug={
                  rawNodes.find(
                    (node) =>
                      node.id ===
                      rawEdges.find((edge) => edge.toNodeId === selected.id)?.fromNodeId,
                  )?.slug ?? null
                }
                choices={rawNodes.map((node) => ({ slug: node.slug, name: node.name }))}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
