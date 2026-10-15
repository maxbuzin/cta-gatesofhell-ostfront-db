"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
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
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ResearchDetailDialog } from "@/components/research/research-detail-dialog";
import { Button } from "@/components/ui/button";
import { EditToggle, SaveButton } from "@/components/edit/edit-actions";
import { InlineEdit } from "@/components/edit/inline-edit";
import { ResearchParentEditor, ResearchSectionEditor } from "@/components/edit/local-research-editor";
import {
  applyGridDrag,
  cellsFor,
  GRID_MAX,
  layoutResearch,
  type LayoutSection,
} from "@/components/research/research-layout";
import type { ResearchSeed } from "@/components/edit/add-new";
import {
  routeKey,
  routesFrom,
  sameRoute,
  sameRoutes,
  type ResearchRoute,
  type XLane,
  type YLane,
} from "@/lib/research-route";
import { sectionLabel } from "@/lib/research-section";
import { EmptyState } from "@/components/units/empty-state";
import { Input } from "@/components/ui/input";

export type ResearchNodeData = {
  id: number;
  slug: string;
  name: string;
  branch: string | null;
  researchCost: number | null;
  imageUrl: string | null;
  sectionId: number | null;
  sortOrder: number;
  column: number | null;
  row: number | null;
  units: { unitSlug: string; unitName: string; period: string | null }[];
};

export type ResearchSectionData = LayoutSection;

type ResearchEdge = { fromNodeId: number; toNodeId: number; route?: unknown };

type CardEdit = {
  factionSlug: string;
  nodeSlug: string;
};

type GridDrag = { id: number; column: number; row: number };

const SIDES = ["top", "right", "bottom", "left"] as const;

function sidePosition(side: (typeof SIDES)[number]) {
  if (side === "top") return Position.Top;
  if (side === "right") return Position.Right;
  if (side === "bottom") return Position.Bottom;
  return Position.Left;
}

const BOX_W = 148;
const IMG_H = 186;
const CAPTION_H = 48;
const BOX_H = IMG_H + CAPTION_H;
const GAP = 72;
const COL = BOX_W + GAP;
const HEADER = 40;
const PAD = 12;
const CARD_Y = HEADER + PAD;
const BODY = BOX_H + GAP;

export type SectionAddMode = "unit" | "research";

export type PendingCatalog = {
  research: {
    factionSlug: string;
    slug: string;
    name: string;
    sectionId: number | null;
    sortOrder: number;
  }[];
  sections: { id: number; factionSlug: string; name: string | null; sortOrder: number }[];
};

type PendingAdd = {
  id: number;
  slug: string;
  parentSlugs: string[];
  image: File | null;
  previewUrl: string | null;
};

function frameWidth(cols: number) {
  const span = cols <= 1 ? BOX_W : (cols - 1) * COL + BOX_W;
  return span + PAD * 2;
}

function frameHeight(stacks: number) {
  return CARD_Y + Math.max(1, stacks) * BODY;
}

function firstNodeName(nodes: ResearchNodeData[], sectionId: number) {
  const list = nodes.filter((node) => node.sectionId === sectionId);
  list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name) || a.id - b.id);
  return list[0]?.name ?? null;
}

type Side = (typeof SIDES)[number];
const SLOTS = [0, 1, 2] as const;
const SLOT_T = [0.25, 0.5, 0.75];

function nearestSide(card: { x: number; y: number }, other: { x: number; y: number }): Side {
  const ox = other.x + BOX_W / 2;
  const oy = other.y + BOX_H / 2;
  const cx = card.x + BOX_W / 2;
  const cy = card.y + BOX_H / 2;
  const sides: [Side, number][] = [
    ["left", Math.hypot(ox - card.x, oy - cy)],
    ["right", Math.hypot(ox - (card.x + BOX_W), oy - cy)],
    ["top", Math.hypot(ox - cx, oy - card.y)],
    ["bottom", Math.hypot(ox - cx, oy - (card.y + BOX_H))],
  ];
  sides.sort((a, b) => a[1] - b[1]);
  return sides[0][0];
}

function along(card: { x: number; y: number }, other: { x: number; y: number }, side: Side) {
  if (side === "top" || side === "bottom") return (other.x + BOX_W / 2 - card.x) / BOX_W;
  return (other.y + BOX_H / 2 - card.y) / BOX_H;
}

function takeSlot(t: number, used: Set<number>) {
  let best = 1;
  let bestDist = Infinity;
  let free = false;
  for (let slot = 0; slot < 3; slot++) {
    if (used.has(slot)) continue;
    const dist = Math.abs(SLOT_T[slot] - t);
    if (dist < bestDist) {
      bestDist = dist;
      best = slot;
      free = true;
    }
  }
  if (free) {
    used.add(best);
    return best;
  }
  for (let slot = 0; slot < 3; slot++) {
    const dist = Math.abs(SLOT_T[slot] - t);
    if (dist < bestDist) {
      bestDist = dist;
      best = slot;
    }
  }
  return best;
}

function slotsFor(group: { t: number }[]) {
  if (group.length === 1) return [1];
  const order = group.map((item, index) => ({ index, t: item.t }));
  order.sort((a, b) => Math.abs(b.t - 0.5) - Math.abs(a.t - 0.5));
  const used = new Set<number>();
  const slots = new Array<number>(group.length);
  for (const item of order) slots[item.index] = takeSlot(item.t, used);
  return slots;
}

function linkPorts(
  edges: { fromNodeId: number; toNodeId: number }[],
  pos: Map<number, { x: number; y: number }>,
) {
  const uses: {
    edgeIndex: number;
    role: "source" | "target";
    nodeId: number;
    side: Side;
    t: number;
  }[] = [];
  edges.forEach((edge, edgeIndex) => {
    const from = pos.get(edge.fromNodeId);
    const to = pos.get(edge.toNodeId);
    if (!from || !to) return;
    const source = nearestSide(from, to);
    const target = nearestSide(to, from);
    uses.push({
      edgeIndex,
      role: "source",
      nodeId: edge.fromNodeId,
      side: source,
      t: along(from, to, source),
    });
    uses.push({
      edgeIndex,
      role: "target",
      nodeId: edge.toNodeId,
      side: target,
      t: along(to, from, target),
    });
  });
  const groups = new Map<string, typeof uses>();
  for (const use of uses) {
    const key = `${use.nodeId}:${use.side}`;
    const list = groups.get(key) ?? [];
    list.push(use);
    groups.set(key, list);
  }
  const slot = new Map<string, number>();
  const dots = new Map<number, string[]>();
  for (const list of groups.values()) {
    const chosen = slotsFor(list);
    list.forEach((use, index) => {
      slot.set(`${use.edgeIndex}:${use.role}`, chosen[index]);
      const marks = dots.get(use.nodeId) ?? [];
      const mark = `${use.side}-${chosen[index]}`;
      if (!marks.includes(mark)) marks.push(mark);
      dots.set(use.nodeId, marks);
    });
  }
  return { slot, dots };
}

function slotStyle(side: Side, slot: number): CSSProperties {
  const at = ["25%", "50%", "75%"][slot];
  if (side === "top" || side === "bottom") return { left: at };
  return { top: at };
}

type Box = { x: number; y: number; w: number; h: number };

function crosses(x1: number, y1: number, x2: number, y2: number, boxes: Box[]) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  return boxes.some((box) => {
    const left = box.x + 6;
    const right = box.x + box.w - 6;
    const top = box.y + 6;
    const bottom = box.y + box.h - 6;
    return maxX > left && minX < right && maxY > top && minY < bottom;
  });
}

function others(boxes: Box[], sx: number, sy: number, tx: number, ty: number) {
  const on = (box: Box, x: number, y: number) =>
    x >= box.x - 8 && x <= box.x + box.w + 8 && y >= box.y - 8 && y <= box.y + box.h + 8;
  return boxes.filter((box) => !on(box, sx, sy) && !on(box, tx, ty));
}

function open(pts: number[][], boxes: Box[]) {
  for (let i = 1; i < pts.length; i++) {
    if (crosses(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], boxes)) return false;
  }
  return true;
}

function draw(pts: number[][]) {
  const kept = [pts[0]];
  for (const pt of pts.slice(1)) {
    const prev = kept[kept.length - 1];
    if (Math.abs(pt[0] - prev[0]) < 0.5 && Math.abs(pt[1] - prev[1]) < 0.5) continue;
    kept.push(pt);
  }
  let d = `M ${kept[0][0]} ${kept[0][1]}`;
  for (let i = 1; i < kept.length; i++) {
    const [x, y] = kept[i];
    const [px, py] = kept[i - 1];
    if (Math.abs(x - px) < 0.5) d += ` V ${y}`;
    else if (Math.abs(y - py) < 0.5) d += ` H ${x}`;
    else d += ` L ${x} ${y}`;
  }
  return d;
}

function outPoint(x: number, y: number, side: Position): [number, number] {
  const out = GAP / 2;
  if (side === Position.Right) return [x + out, y];
  if (side === Position.Left) return [x - out, y];
  if (side === Position.Bottom) return [x, y + out];
  return [x, y - out];
}

function gutterXs(x: number) {
  const origin = Math.floor(x / COL) * COL;
  const right = origin + BOX_W + GAP / 2;
  const left = origin - GAP / 2;
  if (x > origin + BOX_W && x < origin + COL) return [right];
  return Math.abs(x - left) <= Math.abs(x - right) ? [left, right] : [right, left];
}

function gutterYs(x: number, y: number, boxes: Box[]) {
  const box = boxes.find(
    (item) => x >= item.x - 8 && x <= item.x + item.w + 8 && y >= item.y - 8 && y <= item.y + item.h + 8,
  );
  if (!box) return [y];
  return [box.y + box.h + GAP / 2, box.y - GAP / 2];
}

type Snap = {
  kind: "cell" | "gap";
  at: number;
  col?: number;
  sectionId?: number;
  row?: number;
};

function xSnaps(maxCol: number): Snap[] {
  const last = Math.max(0, maxCol);
  const list: Snap[] = [];
  for (let col = 0; col <= last + 1; col++) {
    list.push({ kind: "gap", col, at: col * COL - GAP / 2 });
    if (col <= last) list.push({ kind: "cell", col, at: col * COL + BOX_W / 2 });
  }
  return list;
}

function ySnaps(rows: { section: { id: number }; y: number; stacks: number }[]): Snap[] {
  const list: Snap[] = [];
  for (const row of rows) {
    const stacks = Math.max(1, row.stacks);
    for (let index = 0; index <= stacks; index++) {
      const top = row.y + CARD_Y + index * BODY;
      list.push({ kind: "gap", sectionId: row.section.id, row: index, at: top - GAP / 2 });
      if (index < stacks) {
        list.push({ kind: "cell", sectionId: row.section.id, row: index, at: top + BOX_H / 2 });
      }
    }
  }
  return list;
}

function routePts(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  sourceSide: Position,
  targetSide: Position,
  laneX?: number,
  laneY?: number,
) {
  const a = outPoint(sx, sy, sourceSide);
  const b = outPoint(tx, ty, targetSide);
  if (laneX != null && laneY != null) {
    return [
      [sx, sy],
      a,
      [laneX, a[1]],
      [laneX, laneY],
      [b[0], laneY],
      b,
      [tx, ty],
    ];
  }
  if (laneY != null) return [[sx, sy], a, [a[0], laneY], [b[0], laneY], b, [tx, ty]];
  if (laneX != null) return [[sx, sy], a, [laneX, a[1]], [laneX, b[1]], b, [tx, ty]];
  return [[sx, sy], a, [b[0], a[1]], b, [tx, ty]];
}

function busPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  sourceSide: Position,
  targetSide: Position,
  boxes: Box[],
  laneX?: number,
  laneY?: number,
) {
  const blocks = others(boxes, sx, sy, tx, ty);
  const straight =
    (Math.abs(sx - tx) < 8 || Math.abs(sy - ty) < 8) && !crosses(sx, sy, tx, ty, blocks);
  if (laneX == null && laneY == null && straight) return `M ${sx} ${sy} L ${tx} ${ty}`;
  if (laneX != null || laneY != null) {
    const forced = routePts(sx, sy, tx, ty, sourceSide, targetSide, laneX, laneY);
    if (open(forced, blocks)) return draw(forced);
  }
  if (straight) return `M ${sx} ${sy} L ${tx} ${ty}`;
  const direct = routePts(sx, sy, tx, ty, sourceSide, targetSide);
  if (open(direct, blocks)) return draw(direct);
  const vertical = sourceSide === Position.Top || sourceSide === Position.Bottom;
  const lanes = vertical ? gutterXs(tx) : gutterYs(sx, sy, boxes);
  for (const lane of lanes) {
    const pts = vertical
      ? routePts(sx, sy, tx, ty, sourceSide, targetSide, lane)
      : routePts(sx, sy, tx, ty, sourceSide, targetSide, undefined, lane);
    if (open(pts, blocks)) return draw(pts);
  }
  return draw(direct);
}

function pathPoints(d: string) {
  let x = 0;
  let y = 0;
  const pts: number[][] = [];
  for (const part of d.trim().split(/(?=[MLHV])/)) {
    if (!part) continue;
    const cmd = part[0];
    const nums = part.slice(1).match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    if (cmd === "M" || cmd === "L") {
      x = nums[0];
      y = nums[1];
    } else if (cmd === "H") x = nums[0];
    else if (cmd === "V") y = nums[0];
    else continue;
    pts.push([x, y]);
  }
  return pts;
}

function axisValue(d: string, axis: "x" | "y") {
  const pts = pathPoints(d);
  let best = -1;
  let value: number | null = null;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    const along = axis === "y" ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
    const flat = axis === "y" ? Math.abs(y2 - y1) < 1 : Math.abs(x2 - x1) < 1;
    if (!flat || along < best) continue;
    best = along;
    value = axis === "y" ? y1 : x1;
  }
  return value;
}

function grabbedAxis(d: string, x: number, y: number) {
  const pts = pathPoints(d);
  let best = 28;
  let axis: "x" | "y" | null = null;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (len * len)));
    const dist = Math.hypot(x - (x1 + dx * t), y - (y1 + dy * t));
    if (dist >= best) continue;
    best = dist;
    axis = Math.abs(dx) >= Math.abs(dy) ? "y" : "x";
  }
  return axis;
}

function sameSnap(a: Snap, b: Snap) {
  return a.kind === b.kind && a.col === b.col && a.sectionId === b.sectionId && a.row === b.row;
}

function laneFrom(snap: Snap, axis: "x" | "y"): XLane | YLane {
  if (axis === "x") return { kind: snap.kind, col: snap.col ?? 0 };
  return { kind: snap.kind, sectionId: snap.sectionId ?? 0, row: snap.row ?? 0 };
}

function lanePixels(route: ResearchRoute | undefined, snaps: { x: Snap[]; y: Snap[] }) {
  const x = route?.x
    ? snaps.x.find((item) => item.kind === route.x?.kind && item.col === route.x.col)?.at
    : undefined;
  const y = route?.y
    ? snaps.y.find(
        (item) =>
          item.kind === route.y?.kind && item.sectionId === route.y.sectionId && item.row === route.y.row,
      )?.at
    : undefined;
  return { x, y };
}

function pickLane(
  axis: "x" | "y",
  at: number,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  sourceSide: Position,
  targetSide: Position,
  boxes: Box[],
  snaps: Snap[],
  held: { x?: number; y?: number },
) {
  if (!snaps.length) return undefined;
  const auto = busPath(sx, sy, tx, ty, sourceSide, targetSide, boxes);
  const autoAt = axisValue(auto, axis);
  const home =
    autoAt == null
      ? null
      : snaps.reduce((best, snap) => (Math.abs(snap.at - autoAt) < Math.abs(best.at - autoAt) ? snap : best));
  const blocks = others(boxes, sx, sy, tx, ty);
  const ordered = snaps.slice().sort((a, b) => Math.abs(a.at - at) - Math.abs(b.at - at));
  for (const snap of ordered) {
    if (home && sameSnap(snap, home)) return { at: null, snap: null };
    const laneX = axis === "x" ? snap.at : held.x;
    const laneY = axis === "y" ? snap.at : held.y;
    const pts = routePts(sx, sy, tx, ty, sourceSide, targetSide, laneX, laneY);
    if (!open(pts, blocks)) continue;
    return { at: snap.at, snap };
  }
  return undefined;
}

type LineData = {
  boxes?: Box[];
  editable?: boolean;
  route?: ResearchRoute;
  snaps?: { x: Snap[]; y: Snap[] };
  toFlow?: (point: { x: number; y: number }) => { x: number; y: number } | null;
  onLane?: (id: string, axis: "x" | "y", lane: XLane | YLane | null) => void;
  onLine?: (active: boolean) => void;
};

type LinePreview = { axis: "x" | "y"; at: number | null; snap: Snap | null; picked: boolean };

function BusEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const info = (data ?? {}) as LineData;
  const boxes = info.boxes ?? [];
  const snaps = info.snaps ?? { x: [], y: [] };
  const held = lanePixels(info.route, snaps);
  const [preview, setPreview] = useState<LinePreview | null>(null);
  const previewRef = useRef<LinePreview | null>(null);
  const show = (next: LinePreview | null) => {
    previewRef.current = next;
    setPreview(next);
  };
  const laneX = preview?.axis === "x" ? (preview.at ?? undefined) : held.x;
  const laneY = preview?.axis === "y" ? (preview.at ?? undefined) : held.y;
  const path = busPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    boxes,
    laneX,
    laneY,
  );

  const move = (event: { clientX: number; clientY: number }) => {
    const current = previewRef.current;
    if (!current || !info.toFlow) return;
    const at = info.toFlow({ x: event.clientX, y: event.clientY });
    if (!at) return;
    const next = pickLane(
      current.axis,
      current.axis === "y" ? at.y : at.x,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      boxes,
      current.axis === "y" ? snaps.y : snaps.x,
      held,
    );
    if (!next) return;
    if (current.picked && current.at === next.at) return;
    show({ axis: current.axis, at: next.at, snap: next.snap, picked: true });
  };

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{ ...style, fill: "none", strokeLinejoin: "miter" }}
      />
      {info.editable ? (
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={18}
          style={{ pointerEvents: "stroke", cursor: "grab" }}
          onPointerDown={(event) => {
            const at = info.toFlow?.({ x: event.clientX, y: event.clientY });
            if (!at) return;
            const axis = grabbedAxis(path, at.x, at.y);
            if (!axis) return;
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            info.onLine?.(true);
            show({ axis, at: axis === "y" ? (held.y ?? null) : (held.x ?? null), snap: null, picked: false });
          }}
          onPointerMove={move}
          onPointerUp={(event) => {
            const current = previewRef.current;
            if (current?.picked && info.onLane) {
              info.onLane(
                id,
                current.axis,
                current.at == null || !current.snap ? null : laneFrom(current.snap, current.axis),
              );
            }
            show(null);
            info.onLine?.(false);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
        />
      ) : null}
    </>
  );
}

const edgeTypes = { bus: BusEdge };

function ResearchCard({
  data,
}: {
  data: {
    label: string;
    cost: number | null;
    imageUrl: string | null;
    edit: CardEdit | null;
    dots: string[];
    localDelete?: () => void;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (pending) return;
    if (data.localDelete) {
      if (!window.confirm("Delete this research card?")) return;
      data.localDelete();
      return;
    }
    if (!data.edit) return;
    if (!window.confirm("Delete this research card?")) return;
    setPending(true);
    try {
      const ok = await postLocalEdit({
        kind: "research-delete",
        factionSlug: data.edit.factionSlug,
        nodeSlug: data.edit.nodeSlug,
      });
      if (ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {SIDES.flatMap((side) =>
        SLOTS.map((slot) => {
          const used = data.dots.includes(`${side}-${slot}`);
          const style = slotStyle(side, slot);
          return (
            <Handle
              key={`t-${side}-${slot}`}
              id={`t-${side}-${slot}`}
              type="target"
              position={sidePosition(side)}
              style={style}
              className={
                used
                  ? "!size-1.5 !border-0 !bg-muted-foreground"
                  : "!size-1.5 !border-0 !bg-transparent !opacity-0"
              }
            />
          );
        }),
      )}
      <div className="relative flex h-full w-full flex-col">
        {data.edit || data.localDelete ? (
          <button
            type="button"
            aria-label="Delete research"
            disabled={pending}
            className="nodrag nopan absolute top-1 left-1 z-10 inline-flex size-6 items-center justify-center rounded-sm border border-border bg-card/90"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void remove();
            }}
          >
            <Trash2 className="size-3" />
          </button>
        ) : null}
        <div className="min-h-0 flex-1 overflow-hidden bg-muted">
          {data.imageUrl ? (
            <img src={data.imageUrl} alt="" draggable={false} className="size-full object-cover" />
          ) : null}
        </div>
        <div
          className="flex shrink-0 flex-col justify-center overflow-hidden border-t border-border px-2"
          style={{ height: CAPTION_H }}
        >
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
          <div className="truncate text-muted-foreground">
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
        </div>
      </div>
      {SIDES.flatMap((side) =>
        SLOTS.map((slot) => (
          <Handle
            key={`s-${side}-${slot}`}
            id={`s-${side}-${slot}`}
            type="source"
            position={sidePosition(side)}
            style={slotStyle(side, slot)}
            className="!size-1.5 !border-0 !bg-transparent !opacity-0"
          />
        )),
      )}
    </>
  );
}

function SectionTitle({
  saved,
  label,
  editable,
  sectionId,
  factionSlug,
  onLocalRename,
}: {
  saved: string | null;
  label: string;
  editable: boolean;
  sectionId: number;
  factionSlug: string | null;
  onLocalRename?: (name: string) => void;
}) {
  const router = useRouter();
  const cancelRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(saved ?? "");
  const [pending, setPending] = useState(false);

  async function commit() {
    if (cancelRef.current) {
      cancelRef.current = false;
      return;
    }
    const next = draft.replace(/\s+/g, " ").trim();
    const current = (saved ?? "").replace(/\s+/g, " ").trim();
    if (next === current) {
      setEditing(false);
      return;
    }
    if (onLocalRename) {
      onLocalRename(next);
      setEditing(false);
      return;
    }
    if (!factionSlug) {
      setEditing(false);
      return;
    }
    setPending(true);
    try {
      const ok = await postLocalEdit({
        kind: "section-name",
        factionSlug,
        sectionId,
        name: next,
      });
      if (ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  if (!editable) {
    return <div className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{label}</div>;
  }
  if (!editing) {
    return (
      <button
        type="button"
        className="nodrag nopan min-w-0 flex-1 truncate text-left text-xs font-medium text-foreground"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          cancelRef.current = false;
          setDraft(saved ?? "");
          setEditing(true);
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <input
      autoFocus
      aria-label="Section name"
      disabled={pending}
      placeholder={label}
      className="nodrag nopan min-w-0 flex-1 rounded-sm border border-input bg-background px-1 py-0.5 text-xs outline-none"
      value={draft}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelRef.current = true;
          setEditing(false);
        }
        if (event.key === "Enter") {
          event.preventDefault();
          void commit();
        }
      }}
      onBlur={() => void commit()}
    />
  );
}

function SectionMark({
  data,
}: {
  data: {
    saved: string | null;
    label: string;
    sectionId: number;
    factionSlug: string | null;
    editable: boolean;
    showGrid: boolean;
    onAdd: ((sectionId: number, mode: SectionAddMode) => void) | null;
    onLocalDelete?: () => void;
    onLocalRename?: (name: string) => void;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function move(dir: "up" | "down") {
    if (pending || !data.editable || !data.factionSlug) return;
    setPending(true);
    try {
      const ok = await postLocalEdit({
        kind: "section-order",
        factionSlug: data.factionSlug,
        sectionId: data.sectionId,
        dir,
      });
      if (ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (data.onLocalDelete) {
      if (!window.confirm("Delete this section and its research cards?")) return;
      data.onLocalDelete();
      return;
    }
    if (pending || !data.editable || !data.factionSlug) return;
    if (!window.confirm("Delete this section and its research cards?")) return;
    setPending(true);
    try {
      const ok = await postLocalEdit({
        kind: "section-delete",
        factionSlug: data.factionSlug,
        sectionId: data.sectionId,
      });
      if (ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pointer-events-none flex h-full w-full flex-col">
      <div className="pointer-events-auto flex h-10 items-center gap-1">
        {data.editable && data.onAdd ? (
          <button
            type="button"
            aria-label="Add research"
            className="nodrag nopan inline-flex size-6 shrink-0 items-center justify-center rounded-sm border border-border bg-card"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              data.onAdd?.(data.sectionId, "research");
            }}
          >
            <Plus className="size-3" />
          </button>
        ) : null}
        <SectionTitle
          saved={data.saved}
          label={data.label}
          editable={data.editable}
          sectionId={data.sectionId}
          factionSlug={data.factionSlug}
          onLocalRename={data.onLocalRename}
        />
        {data.editable ? (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              aria-label="Delete section"
              disabled={pending}
              className="nodrag nopan inline-flex size-6 items-center justify-center rounded-sm border border-border bg-card"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                void remove();
              }}
            >
              <Trash2 className="size-3" />
            </button>
            {data.sectionId > 0 ? (
              <>
            <button
              type="button"
              aria-label="Move section up"
              disabled={pending}
              className="nodrag nopan inline-flex size-6 items-center justify-center rounded-sm border border-border bg-card"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                void move("up");
              }}
            >
              <ChevronUp className="size-3" />
            </button>
            <button
              type="button"
              aria-label="Move section down"
              disabled={pending}
              className="nodrag nopan inline-flex size-6 items-center justify-center rounded-sm border border-border bg-card"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                void move("down");
              }}
            >
              <ChevronDown className="size-3" />
            </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <div
        className="min-h-0 flex-1 rounded-md border border-border bg-muted/30"
        style={
          data.showGrid
            ? {
                backgroundImage:
                  "linear-gradient(to right, color-mix(in srgb, var(--border) 70%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border) 70%, transparent) 1px, transparent 1px)",
                backgroundSize: `${COL}px ${BODY}px`,
                backgroundPosition: `${PAD}px ${PAD}px`,
              }
            : undefined
        }
      />
    </div>
  );
}

function AddSection({ data }: { data: { factionSlug: string | null } }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function create() {
    if (pending || !data.factionSlug) return;
    setPending(true);
    try {
      const ok = await postLocalEdit({
        kind: "section-create",
        factionSlug: data.factionSlug,
      });
      if (ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      className="nodrag nopan inline-flex items-center gap-2 text-xs font-medium text-foreground"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        void create();
      }}
    >
      <span className="inline-flex size-6 items-center justify-center rounded-sm bg-primary text-primary-foreground">
        <Plus className="size-3" />
      </span>
      Add new Section
    </button>
  );
}

const nodeTypes = { research: ResearchCard, section: SectionMark, "add-section": AddSection };

async function postLocalEdit(body: Record<string, unknown>) {
  const res = await fetch("/api/local-edit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function postResearch(body: {
  factionSlug: string;
  name: string;
  cost: number | null;
  parentSlugs: string[];
  sectionId: number | null;
  sectionName: string | null;
  image: File | null;
  opensSection: boolean;
}) {
  const form = new FormData();
  form.set("kind", "research");
  form.set("factionSlug", body.factionSlug);
  form.set("name", body.name);
  if (body.opensSection) {
    form.set("newSection", "1");
    if (body.sectionName) form.set("sectionName", body.sectionName);
  } else if (body.sectionId != null) {
    form.set("sectionId", String(body.sectionId));
  }
  for (const parent of body.parentSlugs) form.append("parentSlug", parent);
  if (body.cost != null) form.set("cost", String(body.cost));
  if (body.image) form.set("image", body.image);
  const res = await fetch("/api/local-edit", { method: "POST", body: form });
  const payload = (await res.json().catch(() => null)) as {
    error?: string;
    slug?: string;
    sectionId?: number;
  } | null;
  if (!res.ok || !payload?.slug || payload.sectionId == null) {
    return { ok: false as const, error: payload?.error || "Save failed" };
  }
  return { ok: true as const, slug: payload.slug, sectionId: payload.sectionId };
}

function stampSection(nodes: ResearchNodeData[], edges: ResearchEdge[], sectionId: number) {
  const cells = cellsFor(
    nodes.filter((node) => node.sectionId === sectionId),
    edges,
  );
  return nodes.map((node) => {
    if (node.sectionId !== sectionId) return node;
    const cell = cells.get(node.id);
    if (!cell || (node.column === cell.column && node.row === cell.row)) return node;
    return { ...node, column: cell.column, row: cell.row };
  });
}

function openCell(nodes: ResearchNodeData[], sectionId: number) {
  const taken = new Set(
    nodes
      .filter((node) => node.sectionId === sectionId && node.column != null && node.row != null)
      .map((node) => `${node.column}:${node.row}`),
  );
  for (let row = 0; row <= GRID_MAX; row++) {
    for (let column = 0; column <= GRID_MAX; column++) {
      if (!taken.has(`${column}:${row}`)) return { column, row };
    }
  }
  return { column: 0, row: 0 };
}

function orderAdds(adds: PendingAdd[]) {
  const bySlug = new Map(adds.map((add) => [add.slug, add]));
  const seen = new Set<number>();
  const stack = new Set<number>();
  const out: PendingAdd[] = [];
  function walk(add: PendingAdd): boolean {
    if (seen.has(add.id)) return true;
    if (stack.has(add.id)) return false;
    stack.add(add.id);
    for (const slug of add.parentSlugs) {
      const parent = bySlug.get(slug);
      if (parent && !walk(parent)) return false;
    }
    stack.delete(add.id);
    seen.add(add.id);
    out.push(add);
    return true;
  }
  for (const add of adds) {
    if (!walk(add)) return null;
  }
  return out;
}

function changedSections(board: ResearchNodeData[], saved: ResearchNodeData[]) {
  const prior = new Map(saved.map((node) => [node.id, node]));
  const groups = new Map<number, { nodeSlug: string; column: number; row: number }[]>();
  for (const node of board) {
    const before = prior.get(node.id);
    if (!before || before.sectionId == null || node.sectionId !== before.sectionId) continue;
    if (node.column == null || node.row == null) continue;
    if (before.column === node.column && before.row === node.row) continue;
    const cards = groups.get(node.sectionId) ?? [];
    cards.push({ nodeSlug: node.slug, column: node.column, row: node.row });
    groups.set(node.sectionId, cards);
  }
  return groups;
}

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

function nodeForUnit(nodes: ResearchNodeData[], slug: string | null) {
  if (!slug) return null;
  return (
    nodes.find((node) => node.units.some((unit) => unit.unitSlug === slug)) ??
    nodes.find((node) => node.slug === slug) ??
    null
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
  edges: ResearchEdge[];
  sections?: ResearchSectionData[];
  highlightSlug?: string | null;
  factionSlug?: string | null;
  editable?: boolean;
  onAdd?: ((sectionId: number, mode: SectionAddMode) => void) | null;
  addRef?: { current: ((seed: ResearchSeed) => void) | null } | null;
  onPending?: ((pending: PendingCatalog) => void) | null;
  onReady?: (() => void) | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ResearchNodeData | null>(null);
  const [pathQuery, setPathQuery] = useState("");
  const [highlight, setHighlight] = useState<Set<number>>(new Set());
  const [board, setBoard] = useState(rawNodes);
  const [adds, setAdds] = useState<PendingAdd[]>([]);
  const [extraSections, setExtraSections] = useState<LayoutSection[]>([]);
  const [drag, setDrag] = useState<GridDrag | null>(null);
  const [routes, setRoutes] = useState(() => routesFrom(rawEdges));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const active = editable && editing;
  const dragRef = useRef<GridDrag | null>(null);
  const lineRef = useRef(false);
  const takeRoutes = useRef(false);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const temp = useRef(0);
  const takeServer = useRef(false);
  const boardRef = useRef(board);
  const addsRef = useRef(adds);
  const extraRef = useRef(extraSections);
  const edgesRef = useRef(rawEdges);
  const sectionsRef = useRef(sections);
  boardRef.current = board;
  addsRef.current = adds;
  extraRef.current = extraSections;
  edgesRef.current = rawEdges;
  sectionsRef.current = sections;
  const pendingLayout = changedSections(board, rawNodes).size > 0;
  const pendingAdds = adds.length > 0;
  const serverRoutes = useMemo(() => routesFrom(rawEdges), [rawEdges]);
  const pendingRoutes = useMemo(() => !sameRoutes(routes, serverRoutes), [routes, serverRoutes]);

  const dropIds = useCallback((ids: Set<number>) => {
    if (!ids.size) return;
    for (const add of addsRef.current) {
      if (ids.has(add.id) && add.previewUrl) URL.revokeObjectURL(add.previewUrl);
    }
    const nextBoard = boardRef.current.filter((node) => !ids.has(node.id));
    const nextAdds = addsRef.current.filter((add) => !ids.has(add.id));
    const nextSections = extraRef.current.filter((section) =>
      nextBoard.some((node) => node.sectionId === section.id),
    );
    boardRef.current = nextBoard;
    addsRef.current = nextAdds;
    extraRef.current = nextSections;
    setBoard(nextBoard);
    setAdds(nextAdds);
    setExtraSections(nextSections);
    setRoutes((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const key of prev.keys()) {
        const [fromId, toId] = key.split(":").map(Number);
        if (!ids.has(fromId) && !ids.has(toId)) continue;
        next.delete(key);
        changed = true;
      }
      return changed ? next : prev;
    });
    setSelected((current) => (current && ids.has(current.id) ? null : current));
  }, []);

  const placeSeed = useCallback((seed: ResearchSeed) => {
    const id = --temp.current;
    const slug = `unsaved${-id}`;
    const previewUrl = seed.image ? URL.createObjectURL(seed.image) : null;
    let sectionId = seed.sectionId;
    if (sectionId == null) {
      sectionId = --temp.current;
      const sort =
        Math.max(
          0,
          ...sectionsRef.current.map((section) => section.sortOrder),
          ...extraRef.current.map((section) => section.sortOrder),
        ) + 1;
      extraRef.current = [
        ...extraRef.current,
        { id: sectionId, name: seed.sectionName.trim() || null, sortOrder: sort },
      ];
      setExtraSections(extraRef.current);
    }
    const add: PendingAdd = {
      id,
      slug,
      parentSlugs: seed.parentSlugs.filter(Boolean),
      image: seed.image,
      previewUrl,
    };
    addsRef.current = [...addsRef.current, add];
    setAdds(addsRef.current);
    const node: ResearchNodeData = {
      id,
      slug,
      name: seed.name.trim(),
      branch: null,
      researchCost: seed.cost,
      imageUrl: previewUrl,
      sectionId,
      sortOrder: 10000 - id,
      column: null,
      row: null,
      units: [],
    };
    setBoard((prev) => {
      const next = sectionId != null && sectionId > 0 ? stampSection(prev, edgesRef.current, sectionId) : prev;
      const cell = openCell(next, sectionId ?? 0);
      const list = [...next, { ...node, column: cell.column, row: cell.row }];
      boardRef.current = list;
      return list;
    });
  }, []);

  useEffect(() => {
    if (!addRef) return;
    addRef.current = placeSeed;
    onReady?.();
    return () => {
      if (addRef.current === placeSeed) addRef.current = null;
    };
  }, [addRef, placeSeed, onReady]);

  useEffect(() => {
    if (dragRef.current || lineRef.current) return;
    if (takeServer.current) {
      takeServer.current = false;
      setBoard(rawNodes);
      return;
    }
    if (pendingLayout || pendingAdds || pendingRoutes) return;
    setBoard(rawNodes);
    setRoutes((prev) => (sameRoutes(prev, serverRoutes) ? prev : serverRoutes));
  }, [rawNodes, pendingLayout, pendingAdds, pendingRoutes, serverRoutes]);

  useEffect(() => {
    if (!takeRoutes.current || lineRef.current) return;
    takeRoutes.current = false;
    setRoutes((prev) => (sameRoutes(prev, serverRoutes) ? prev : serverRoutes));
  }, [serverRoutes]);

  useEffect(() => {
    setSelected((current) => {
      if (!current) return current;
      return rawNodes.find((node) => node.id === current.id) ?? null;
    });
  }, [rawNodes]);

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

  const treeSections = useMemo(
    () => [...sections, ...extraSections],
    [sections, extraSections],
  );
  const liveEdges = useMemo(() => {
    const bySlug = new Map(board.map((node) => [node.slug, node.id]));
    const extra: ResearchEdge[] = [];
    for (const add of adds) {
      for (const slug of add.parentSlugs) {
        const from = bySlug.get(slug);
        if (from) extra.push({ fromNodeId: from, toNodeId: add.id });
      }
    }
    return [...rawEdges, ...extra];
  }, [rawEdges, board, adds]);

  const previewNodes = useMemo(
    () => applyGridDrag(board, liveEdges, drag),
    [board, liveEdges, drag],
  );
  const baseRows = useMemo(
    () => layoutResearch(board, treeSections, liveEdges, active, COL, BODY, CARD_Y).rows,
    [board, treeSections, liveEdges, active],
  );

  const placed = useMemo(
    () => layoutResearch(previewNodes, treeSections, liveEdges, active, COL, BODY, CARD_Y),
    [previewNodes, treeSections, liveEdges, active],
  );
  const ports = useMemo(() => linkPorts(liveEdges, placed.pos), [liveEdges, placed.pos]);

  useEffect(() => {
    if (!onPending || !factionSlug) return;
    onPending({
      research: adds.map((add) => {
        const node = board.find((item) => item.id === add.id);
        return {
          factionSlug,
          slug: add.slug,
          name: node?.name ?? "",
          sectionId: node?.sectionId ?? null,
          sortOrder: node?.sortOrder ?? 0,
        };
      }),
      sections: extraSections.map((section) => ({
        id: section.id,
        factionSlug,
        name: section.name,
        sortOrder: section.sortOrder,
      })),
    });
  }, [adds, board, extraSections, factionSlug, onPending]);

  const nodes: Node[] = useMemo(() => {
    const { rows, pos, bottom } = placed;
    const dragSectionId = drag
      ? (previewNodes.find((node) => node.id === drag.id)?.sectionId ?? null)
      : null;
    const cards: Node[] = previewNodes.map((node) => {
      const onPath = highlight.has(node.id);
      const at = pos.get(node.id) ?? { x: 0, y: bottom };
      return {
        id: String(node.id),
        type: "research",
        position: at,
        draggable: active && node.sectionId != null,
        data: {
          label: node.name,
          cost: node.researchCost,
          imageUrl: node.imageUrl,
          raw: node,
          edit: active && factionSlug && node.id > 0 ? { factionSlug, nodeSlug: node.slug } : null,
          dots: ports.dots.get(node.id) ?? [],
          localDelete: active && node.id < 0 ? () => dropIds(new Set([node.id])) : undefined,
        },
        style: {
          border: onPath ? "1px solid var(--brass)" : "1px solid var(--border)",
          background: onPath
            ? "color-mix(in srgb, var(--brass) 20%, var(--card))"
            : "var(--card)",
          color: "var(--foreground)",
          borderRadius: 2,
          padding: 0,
          fontSize: 12,
          width: BOX_W,
          height: BOX_H,
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "none",
        },
      };
    });
    const marks: Node[] = rows.map(({ section, y, cols, stacks }, index) => ({
      id: `section-${section.id}`,
      type: "section",
      position: { x: -PAD, y },
      draggable: false,
      selectable: false,
      connectable: false,
      zIndex: 0,
      data: {
        saved: section.name,
        label: sectionLabel(section.name, index, firstNodeName(previewNodes, section.id)),
        sectionId: section.id,
        factionSlug,
        editable: active,
        showGrid: dragSectionId === section.id,
        onAdd,
        onLocalDelete:
          section.id < 0
            ? () =>
                dropIds(
                  new Set(
                    boardRef.current.filter((node) => node.sectionId === section.id).map((node) => node.id),
                  ),
                )
            : undefined,
        onLocalRename:
          section.id < 0
            ? (name: string) => {
                extraRef.current = extraRef.current.map((item) =>
                  item.id === section.id ? { ...item, name: name || null } : item,
                );
                setExtraSections(extraRef.current);
              }
            : undefined,
      },
      style: {
        width: frameWidth(cols),
        height: frameHeight(stacks),
        background: "transparent",
        border: "none",
        boxShadow: "none",
        padding: 0,
        zIndex: 0,
        pointerEvents: "none" as const,
      },
    }));
    const extra: Node[] =
      active && factionSlug
        ? [
            {
              id: "add-section",
              type: "add-section",
              position: { x: -PAD, y: bottom },
              draggable: false,
              selectable: false,
              connectable: false,
              data: { factionSlug },
              style: {
                width: 220,
                height: 32,
                background: "transparent",
                border: "none",
                boxShadow: "none",
                padding: 0,
              },
            },
          ]
        : [];
    return [...marks, ...cards, ...extra];
  }, [placed, previewNodes, highlight, active, factionSlug, onAdd, drag, ports, dropIds]);

  const toFlow = useCallback((point: { x: number; y: number }) => {
    return flowRef.current?.screenToFlowPosition(point) ?? null;
  }, []);

  const onLine = useCallback((active: boolean) => {
    lineRef.current = active;
  }, []);

  const onLane = useCallback((id: string, axis: "x" | "y", lane: XLane | YLane | null) => {
    setRoutes((prev) => {
      const current = { ...(prev.get(id) ?? {}) };
      if (axis === "x") {
        if (lane == null) delete current.x;
        else current.x = lane as XLane;
      } else if (lane == null) delete current.y;
      else current.y = lane as YLane;
      const nextRoute = current.x || current.y ? current : undefined;
      if (sameRoute(prev.get(id), nextRoute)) return prev;
      const next = new Map(prev);
      if (!nextRoute) next.delete(id);
      else next.set(id, nextRoute);
      return next;
    });
  }, []);

  const edges: Edge[] = useMemo(
    () => {
      const boxes: Box[] = previewNodes.flatMap((node) => {
        const at = placed.pos.get(node.id);
        return at ? [{ x: at.x, y: at.y, w: BOX_W, h: BOX_H }] : [];
      });
      const maxCol = previewNodes.reduce((max, node) => {
        const at = placed.pos.get(node.id);
        return at ? Math.max(max, Math.round(at.x / COL)) : max;
      }, 0);
      const snaps = { x: xSnaps(maxCol), y: ySnaps(placed.rows) };
      return liveEdges.map((edge, index) => {
        const onPath = highlight.has(edge.fromNodeId) && highlight.has(edge.toNodeId);
        const stroke = onPath ? "var(--brass)" : "var(--muted-foreground)";
        const from = placed.pos.get(edge.fromNodeId);
        const to = placed.pos.get(edge.toNodeId);
        const sourceSide = from && to ? nearestSide(from, to) : "right";
        const targetSide = from && to ? nearestSide(to, from) : "left";
        const sourceSlot = ports.slot.get(`${index}:source`) ?? 1;
        const targetSlot = ports.slot.get(`${index}:target`) ?? 1;
        return {
          id: routeKey(edge.fromNodeId, edge.toNodeId),
          source: String(edge.fromNodeId),
          target: String(edge.toNodeId),
          sourceHandle: `s-${sourceSide}-${sourceSlot}`,
          targetHandle: `t-${targetSide}-${targetSlot}`,
          type: "bus",
          selectable: false,
          data: {
            boxes,
            snaps,
            editable: active,
            route: routes.get(routeKey(edge.fromNodeId, edge.toNodeId)),
            toFlow,
            onLane,
            onLine,
          },
          zIndex: onPath ? 1 : 0,
          style: { stroke, strokeWidth: 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: stroke,
          },
        };
      });
    },
    [liveEdges, highlight, placed, ports, previewNodes, routes, active, toFlow, onLane, onLine],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const raw = (node.data as { raw?: ResearchNodeData }).raw;
    if (raw) setSelected(raw);
  }, []);

  const onNodeDrag = useCallback(
    (event: MouseEvent | TouchEvent, node: Node) => {
      const id = Number(node.id);
      const raw = board.find((item) => item.id === id);
      const flow = flowRef.current;
      if (!raw?.sectionId || !flow) return;
      const section = baseRows.find((row) => row.section.id === raw.sectionId);
      if (!section) return;
      const point = "clientX" in event ? event : (event.touches[0] ?? event.changedTouches[0]);
      if (!point) return;
      const at = flow.screenToFlowPosition({ x: point.clientX, y: point.clientY });
      const column = Math.max(
        -GRID_MAX,
        Math.min(GRID_MAX, Math.round((at.x - BOX_W / 2) / COL)),
      );
      const row = Math.max(
        -GRID_MAX,
        Math.min(GRID_MAX, Math.round((at.y - section.y - CARD_Y - BOX_H / 2) / BODY)),
      );
      const next = { id, column, row };
      dragRef.current = next;
      setDrag((prev) =>
        prev && prev.id === id && prev.column === column && prev.row === row ? prev : next,
      );
    },
    [board, baseRows],
  );

  const onNodeDragStop = useCallback(() => {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!current) return;
    setBoard((prev) => applyGridDrag(prev, liveEdges, current));
  }, [liveEdges]);

  const saveLayout = useCallback(async () => {
    if (saving || !factionSlug || (!pendingLayout && adds.length === 0 && !pendingRoutes)) return;
    setSaving(true);
    setSaveError(null);
    const done = new Set<number>();
    try {
      const ordered = orderAdds(adds);
      if (!ordered) {
        setSaveError("Research can't depend on itself");
        return;
      }
      const real = new Map<string, string>();
      const localSection = new Map<number, number>();
      const made: { sectionId: number; nodeSlug: string; column: number; row: number }[] = [];
      for (const add of ordered) {
        const node = board.find((item) => item.id === add.id);
        if (!node || node.sectionId == null || node.column == null || node.row == null) {
          setSaveError("Could not place a card");
          return;
        }
        let sectionId = node.sectionId;
        let opens = false;
        let sectionName: string | null = null;
        if (sectionId < 0) {
          const known = localSection.get(sectionId);
          if (known) sectionId = known;
          else {
            opens = true;
            sectionName = extraSections.find((section) => section.id === node.sectionId)?.name ?? null;
          }
        }
        const result = await postResearch({
          factionSlug,
          name: node.name,
          cost: node.researchCost,
          parentSlugs: add.parentSlugs.map((slug) => real.get(slug) ?? slug),
          sectionId: opens ? null : sectionId,
          sectionName,
          image: add.image,
          opensSection: opens,
        });
        if (!result.ok) {
          setSaveError(result.error);
          if (done.size) {
            dropIds(done);
            takeServer.current = true;
            router.refresh();
          }
          return;
        }
        if (node.sectionId < 0) localSection.set(node.sectionId, result.sectionId);
        real.set(add.slug, result.slug);
        made.push({
          sectionId: result.sectionId,
          nodeSlug: result.slug,
          column: node.column,
          row: node.row,
        });
        done.add(add.id);
      }
      const groups = changedSections(
        board.filter((node) => node.id > 0),
        rawNodes,
      );
      for (const card of made) {
        const list = groups.get(card.sectionId) ?? [];
        list.push({ nodeSlug: card.nodeSlug, column: card.column, row: card.row });
        groups.set(card.sectionId, list);
      }
      for (const cards of groups.values()) {
        const ok = await postLocalEdit({ kind: "research-grid", factionSlug, cards });
        if (!ok) {
          setSaveError("Save failed");
          dropIds(done);
          takeServer.current = true;
          router.refresh();
          return;
        }
      }
      const slugOf = (id: number) => {
        const node = board.find((item) => item.id === id);
        if (!node) return null;
        return id < 0 ? (real.get(node.slug) ?? null) : node.slug;
      };
      const saved = routesFrom(rawEdges);
      const routeEdges: { fromSlug: string; toSlug: string; route: ResearchRoute | null }[] = [];
      for (const key of new Set([...routes.keys(), ...saved.keys()])) {
        const local = routes.get(key);
        if (sameRoute(local, saved.get(key))) continue;
        const [fromId, toId] = key.split(":").map(Number);
        const fromSlug = slugOf(fromId);
        const toSlug = slugOf(toId);
        if (!fromSlug || !toSlug) continue;
        let route = local ?? null;
        if (route?.y && route.y.sectionId < 0) {
          const sectionId = localSection.get(route.y.sectionId);
          if (!sectionId) continue;
          route = { ...route, y: { ...route.y, sectionId } };
        }
        routeEdges.push({ fromSlug, toSlug, route });
      }
      if (routeEdges.length) {
        const ok = await postLocalEdit({ kind: "research-routes", factionSlug, edges: routeEdges });
        if (!ok) {
          setSaveError("Save failed");
          dropIds(done);
          takeServer.current = true;
          router.refresh();
          return;
        }
      }
      takeRoutes.current = true;
      dropIds(done);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [saving, factionSlug, pendingLayout, pendingRoutes, adds, board, extraSections, rawNodes, rawEdges, routes, router, dropIds]);

  const findPath = () => {
    const query = pathQuery.trim().toLowerCase();
    if (!query) {
      setHighlight(new Set());
      return;
    }
    const target = board.find(
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
    setHighlight(ancestorIds(target.id, liveEdges));
    setSelected(target);
  };

  if (rawNodes.length === 0 && sections.length === 0 && adds.length === 0 && extraSections.length === 0) {
    return (
      <EmptyState
        title="No research nodes"
        description="This faction has no research entries in the game files."
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="find-path" className="shrink-0 text-xs text-muted-foreground">
          Find path
        </label>
        <Input
          id="find-path"
          className="h-8 w-auto min-w-40 flex-1"
          value={pathQuery}
          onChange={(event) => setPathQuery(event.target.value)}
          placeholder="Target unit or research node..."
        />
        <Button size="sm" onClick={findPath}>Highlight path</Button>
        {editable && factionSlug ? (
          <>
            <EditToggle size="sm" editing={editing} disabled={saving} onClick={() => setEditing((on) => !on)} />
            <SaveButton
              size="sm"
              pending={saving}
              disabled={!pendingLayout && adds.length === 0 && !pendingRoutes}
              onClick={() => void saveLayout()}
            />
          </>
        ) : null}
      </div>
      {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

      <div className="h-[min(70vh,640px)] overflow-hidden rounded-md border border-border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={(instance) => {
            flowRef.current = instance;
          }}
          onNodeClick={onNodeClick}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          nodesDraggable={active}
          nodesConnectable={false}
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

      <ResearchDetailDialog node={selected} onClose={() => setSelected(null)}>
        {active && factionSlug && selected && selected.id > 0 ? (
          <>
            <ResearchSectionEditor
              key={`${selected.slug}-section`}
              factionSlug={factionSlug}
              nodeSlug={selected.slug}
              sectionId={selected.sectionId}
              sections={sections.map((section) => ({
                ...section,
                firstName: firstNodeName(rawNodes, section.id),
              }))}
            />
            <ResearchParentEditor
              key={selected.slug}
              factionSlug={factionSlug}
              nodeSlug={selected.slug}
              parentSlugs={rawEdges.flatMap((edge) => {
                if (edge.toNodeId !== selected.id) return [];
                const slug = rawNodes.find((node) => node.id === edge.fromNodeId)?.slug;
                return slug ? [slug] : [];
              })}
              choices={rawNodes.map((node) => ({ slug: node.slug, name: node.name }))}
            />
          </>
        ) : null}
      </ResearchDetailDialog>
    </div>
  );
}
