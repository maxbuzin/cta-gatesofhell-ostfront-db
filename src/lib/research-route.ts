export type LaneKind = "cell" | "gap";

export type XLane = { kind: LaneKind; col: number };
export type YLane = { kind: LaneKind; sectionId: number; row: number };
export type ResearchRoute = { x?: XLane; y?: YLane };

const KINDS = new Set<LaneKind>(["cell", "gap"]);

function kindOf(value: unknown): LaneKind | null {
  return typeof value === "string" && KINDS.has(value as LaneKind) ? (value as LaneKind) : null;
}

function indexOf(value: unknown, max: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max ? value : null;
}

export function parseRoute(value: unknown): ResearchRoute | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { x?: unknown; y?: unknown };
  let x: XLane | undefined;
  let y: YLane | undefined;
  if (raw.x != null) {
    if (!raw.x || typeof raw.x !== "object") return null;
    const item = raw.x as { kind?: unknown; col?: unknown };
    const kind = kindOf(item.kind);
    const col = indexOf(item.col, 49);
    if (!kind || col == null) return null;
    x = { kind, col };
  }
  if (raw.y != null) {
    if (!raw.y || typeof raw.y !== "object") return null;
    const item = raw.y as { kind?: unknown; sectionId?: unknown; row?: unknown };
    const kind = kindOf(item.kind);
    const row = indexOf(item.row, 48);
    const sectionId =
      typeof item.sectionId === "number" && Number.isInteger(item.sectionId) && item.sectionId > 0
        ? item.sectionId
        : null;
    if (!kind || row == null || sectionId == null) return null;
    y = { kind, sectionId, row };
  }
  if (!x && !y) return null;
  return { x, y };
}

export function sameRoute(a?: ResearchRoute, b?: ResearchRoute) {
  const xSame =
    (!a?.x && !b?.x) || (!!a?.x && !!b?.x && a.x.kind === b.x.kind && a.x.col === b.x.col);
  const ySame =
    (!a?.y && !b?.y) ||
    (!!a?.y && !!b?.y && a.y.kind === b.y.kind && a.y.sectionId === b.y.sectionId && a.y.row === b.y.row);
  return xSame && ySame;
}

export function routeKey(fromNodeId: number, toNodeId: number) {
  return `${fromNodeId}:${toNodeId}`;
}

export function routesFrom(edges: { fromNodeId: number; toNodeId: number; route?: unknown }[]) {
  const map = new Map<string, ResearchRoute>();
  for (const edge of edges) {
    const route = parseRoute(edge.route);
    if (route) map.set(routeKey(edge.fromNodeId, edge.toNodeId), route);
  }
  return map;
}

export function sameRoutes(a: Map<string, ResearchRoute>, b: Map<string, ResearchRoute>) {
  if (a.size !== b.size) return false;
  for (const [key, route] of a) {
    if (!sameRoute(route, b.get(key))) return false;
  }
  return true;
}
