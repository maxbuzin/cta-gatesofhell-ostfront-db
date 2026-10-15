export type LayoutNode = {
  id: number;
  name: string;
  sectionId: number | null;
  sortOrder: number;
  column: number | null;
  row: number | null;
};

export type LayoutSection = {
  id: number;
  name: string | null;
  sortOrder: number;
};

export type LayoutEdge = {
  fromNodeId: number;
  toNodeId: number;
};

export type LayoutRow = {
  section: LayoutSection;
  y: number;
  cols: number;
  stacks: number;
};

export type GridCell = { column: number; row: number };

export const GRID_MAX = 48;

const SECTION_GAP = 24;

function compareNodes(a: LayoutNode, b: LayoutNode) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  const name = a.name.localeCompare(b.name);
  if (name) return name;
  return a.id - b.id;
}

function cellKey(column: number, row: number) {
  return `${column}:${row}`;
}

function columnsOf(list: LayoutNode[], edges: LayoutEdge[]) {
  const ids = new Set(list.map((node) => node.id));
  const parents = new Map<number, number[]>();
  for (const edge of edges) {
    if (!ids.has(edge.fromNodeId) || !ids.has(edge.toNodeId)) continue;
    const row = parents.get(edge.toNodeId) ?? [];
    row.push(edge.fromNodeId);
    parents.set(edge.toNodeId, row);
  }
  const col = new Map<number, number>();
  const stack = new Set<number>();
  function walk(id: number): number {
    const known = col.get(id);
    if (known != null) return known;
    if (stack.has(id)) return 0;
    stack.add(id);
    const above = parents.get(id) ?? [];
    const value = above.length === 0 ? 0 : Math.max(...above.map(walk)) + 1;
    stack.delete(id);
    col.set(id, Math.min(value, list.length));
    return col.get(id) ?? 0;
  }
  for (const node of list) walk(node.id);
  return col;
}

function autoCells(list: LayoutNode[], edges: LayoutEdge[]) {
  const depth = columnsOf(list, edges);
  const groups = new Map<number, LayoutNode[]>();
  for (const node of list) {
    const index = depth.get(node.id) ?? 0;
    const group = groups.get(index) ?? [];
    group.push(node);
    groups.set(index, group);
  }
  const cells = new Map<number, GridCell>();
  for (const [column, group] of groups) {
    group.sort(compareNodes).forEach((node, row) => {
      cells.set(node.id, { column, row });
    });
  }
  return cells;
}

export function cellsFor(list: LayoutNode[], edges: LayoutEdge[]) {
  const taken = new Set<string>();
  const cells = new Map<number, GridCell>();
  for (const node of list) {
    if (node.column == null || node.row == null) continue;
    if (node.column < 0 || node.row < 0 || node.column > GRID_MAX || node.row > GRID_MAX) continue;
    const key = cellKey(node.column, node.row);
    if (taken.has(key)) continue;
    taken.add(key);
    cells.set(node.id, { column: node.column, row: node.row });
  }
  const auto = autoCells(list, edges);
  for (const node of [...list].sort(compareNodes)) {
    if (cells.has(node.id)) continue;
    let cell = auto.get(node.id) ?? { column: 0, row: 0 };
    while (taken.has(cellKey(cell.column, cell.row))) {
      cell =
        cell.row >= GRID_MAX
          ? { column: Math.min(GRID_MAX, cell.column + 1), row: 0 }
          : { column: cell.column, row: cell.row + 1 };
    }
    taken.add(cellKey(cell.column, cell.row));
    cells.set(node.id, cell);
  }
  return cells;
}

export function moveCells(cells: Map<number, GridCell>, id: number, raw: GridCell) {
  const column = Math.max(-GRID_MAX, Math.min(GRID_MAX, raw.column));
  const row = Math.max(-GRID_MAX, Math.min(GRID_MAX, raw.row));
  const dx = column < 0 ? -column : 0;
  const dy = row < 0 ? -row : 0;
  const shifted = new Map<number, GridCell>();
  for (const [nodeId, cell] of cells) {
    shifted.set(nodeId, {
      column: Math.min(GRID_MAX, cell.column + dx),
      row: Math.min(GRID_MAX, cell.row + dy),
    });
  }
  const target = { column: Math.min(GRID_MAX, column + dx), row: Math.min(GRID_MAX, row + dy) };
  const from = shifted.get(id) ?? target;
  let occupant: number | null = null;
  for (const [nodeId, cell] of shifted) {
    if (nodeId !== id && cell.column === target.column && cell.row === target.row) occupant = nodeId;
  }
  shifted.set(id, target);
  if (occupant != null) shifted.set(occupant, from);
  return shifted;
}

export function applyGridDrag<T extends LayoutNode>(
  nodes: T[],
  edges: LayoutEdge[],
  drag: { id: number; column: number; row: number } | null,
) {
  if (!drag) return nodes;
  const node = nodes.find((item) => item.id === drag.id);
  if (!node || node.sectionId == null) return nodes;
  const group = nodes.filter((item) => item.sectionId === node.sectionId);
  const next = moveCells(cellsFor(group, edges), drag.id, drag);
  return nodes.map((item) => {
    if (item.sectionId !== node.sectionId) return item;
    const cell = next.get(item.id);
    if (!cell) return item;
    return { ...item, column: cell.column, row: cell.row };
  });
}

function place(
  list: LayoutNode[],
  edges: LayoutEdge[],
  originY: number,
  column: number,
  row: number,
  header: number,
  pos: Map<number, { x: number; y: number }>,
) {
  if (!list.length) return { cols: 1, stacks: 1, height: header + row };
  const cells = cellsFor(list, edges);
  let cols = 1;
  let stacks = 1;
  for (const node of list) {
    const cell = cells.get(node.id) ?? { column: 0, row: 0 };
    cols = Math.max(cols, cell.column + 1);
    stacks = Math.max(stacks, cell.row + 1);
    pos.set(node.id, { x: cell.column * column, y: originY + header + cell.row * row });
  }
  return { cols, stacks, height: header + stacks * row };
}

export function layoutResearch(
  nodes: LayoutNode[],
  sections: LayoutSection[],
  edges: LayoutEdge[],
  editable: boolean,
  column: number,
  row: number,
  header: number,
) {
  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const ids = new Set(ordered.map((section) => section.id));
  const grouped = new Map<number, LayoutNode[]>();
  const loose: LayoutNode[] = [];
  for (const node of nodes) {
    if (node.sectionId == null || !ids.has(node.sectionId)) {
      loose.push(node);
      continue;
    }
    const list = grouped.get(node.sectionId) ?? [];
    list.push(node);
    grouped.set(node.sectionId, list);
  }
  const visible = editable
    ? ordered
    : ordered.filter((section) => (grouped.get(section.id) ?? []).length > 0);
  const pos = new Map<number, { x: number; y: number }>();
  const rows: LayoutRow[] = [];
  let y = 0;
  for (const section of visible) {
    const placed = place(grouped.get(section.id) ?? [], edges, y, column, row, header, pos);
    rows.push({ section, y, cols: placed.cols, stacks: placed.stacks });
    y += placed.height + SECTION_GAP;
  }
  if (loose.length) {
    const placed = place(loose, edges, y, column, row, header, pos);
    y += placed.height + SECTION_GAP;
  }
  return { rows, pos, bottom: y };
}
