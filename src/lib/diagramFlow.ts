import { NODE_TYPES, type ErEdge, type ErNode, type ErNodeData, type NodeType } from '../types';
import { getNodeCenter, getNodeSize, topLeftFromCenter } from './nodeGeometry';

/** Espaço horizontal entre nós estruturais criados em cadeia (Tab). */
const TAB_CHAIN_GAP_X = 80;

const STRUCTURAL = new Set<string>([
  NODE_TYPES.ENTITY,
  NODE_TYPES.RELATIONSHIP,
  NODE_TYPES.TABLE,
]);

const neighborsOf = (id: string, edges: ErEdge[]) => {
  const ids: string[] = [];
  for (const e of edges) {
    if (e.source === id) ids.push(e.target);
    else if (e.target === id) ids.push(e.source);
  }
  return ids;
};

/** Dono do atributo via edges: estrutural, senão atributo composto. */
export const findAttributeOwnerId = (
  attrId: string,
  nodes: ErNode[],
  edges: ErEdge[],
): string | null => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const neighbors = neighborsOf(attrId, edges);
  const structural = neighbors.find((id) => {
    const n = byId.get(id);
    return n && STRUCTURAL.has(n.type);
  });
  if (structural) return structural;
  return (
    neighbors.find((id) => byId.get(id)?.type === NODE_TYPES.ATTRIBUTE) ?? null
  );
};

/** Atributos ligados diretamente a um dono estrutural (entidade/relacionamento). */
export const linkedAttributesOf = (
  ownerId: string,
  nodes: ErNode[],
  edges: ErEdge[],
): ErNode[] => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const attrs: ErNode[] = [];
  for (const e of edges) {
    const other =
      e.source === ownerId ? e.target : e.target === ownerId ? e.source : null;
    if (!other) continue;
    const n = byId.get(other);
    if (n?.type === NODE_TYPES.ATTRIBUTE) attrs.push(n);
  }
  return attrs;
};

/** Atributos diretos + compostos (BFS pela árvore de atributos do dono). */
export const attributeSubtreeOf = (
  ownerId: string,
  nodes: ErNode[],
  edges: ErEdge[],
): ErNode[] => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const result: ErNode[] = [];
  const seen = new Set<string>();
  const queue = linkedAttributesOf(ownerId, nodes, edges).map((a) => a.id);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (!node || node.type !== NODE_TYPES.ATTRIBUTE) continue;
    result.push(node);
    for (const child of linkedAttributesOf(id, nodes, edges)) {
      if (!seen.has(child.id)) queue.push(child.id);
    }
  }
  return result;
};

/**
 * Após mover entidade/relacionamento, desloca a subárvore de atributos
 * pelo mesmo delta. Ignora ids que já vieram no lote de drag (multi-seleção).
 */
export const followStructuralDrags = (
  before: ErNode[],
  after: ErNode[],
  edges: ErEdge[],
  alreadyMovedIds: ReadonlySet<string>,
): ErNode[] => {
  const beforeById = new Map(before.map((n) => [n.id, n]));
  const attrDelta = new Map<string, { dx: number; dy: number }>();

  for (const node of after) {
    if (
      node.type !== NODE_TYPES.ENTITY &&
      node.type !== NODE_TYPES.RELATIONSHIP
    ) {
      continue;
    }
    if (!alreadyMovedIds.has(node.id)) continue;
    const prev = beforeById.get(node.id);
    if (!prev) continue;
    const dx = node.position.x - prev.position.x;
    const dy = node.position.y - prev.position.y;
    if (dx === 0 && dy === 0) continue;

    for (const attr of attributeSubtreeOf(node.id, after, edges)) {
      if (alreadyMovedIds.has(attr.id) || attrDelta.has(attr.id)) continue;
      attrDelta.set(attr.id, { dx, dy });
    }
  }

  if (attrDelta.size === 0) return after;

  return after.map((n) => {
    const d = attrDelta.get(n.id);
    if (!d) return n;
    return {
      ...n,
      position: { x: n.position.x + d.dx, y: n.position.y + d.dy },
    };
  });
};

const ATTR_NODE = 20;
const HEUSER_BASE_GAP = 28;
const HEUSER_STEP_Y = 28;
const HEUSER_PAD_X = 16;

/**
 * Posições Heuser: atributos sob o dono, hastes verticais escalonadas
 * (esquerda = mais longa). Rótulo fica à direita do círculo no nó.
 */
export const heuserAttributePosition = (
  owner: ErNode,
  index: number,
  total: number,
): { x: number; y: number } => {
  const { width, height } = getNodeSize(owner);
  const n = Math.max(total, 1);
  const usableW = Math.max(width - HEUSER_PAD_X * 2, 0);
  const spacing = n <= 1 ? 0 : Math.min(36, usableW / (n - 1));
  const cx =
    n <= 1
      ? owner.position.x + width / 2
      : owner.position.x + HEUSER_PAD_X + index * spacing;
  // índice 0 à esquerda = haste mais longa (como na notação clássica)
  const depth = n - 1 - index;
  return {
    x: Math.round(cx - ATTR_NODE / 2),
    y: Math.round(
      owner.position.y + height + HEUSER_BASE_GAP + depth * HEUSER_STEP_Y,
    ),
  };
};

/** Reaplica cascata Heuser aos atributos diretos do dono (ordem estável por id). */
export const layoutHeuserAttributes = (
  ownerId: string,
  nodes: ErNode[],
  edges: ErEdge[],
): ErNode[] => {
  const owner = nodes.find((n) => n.id === ownerId);
  if (
    !owner ||
    (owner.type !== NODE_TYPES.ENTITY &&
      owner.type !== NODE_TYPES.RELATIONSHIP)
  ) {
    return nodes;
  }

  const attrs = linkedAttributesOf(ownerId, nodes, edges).sort(
    (a, b) =>
      a.position.x - b.position.x || a.position.y - b.position.y,
  );
  if (attrs.length === 0) return nodes;

  const positions = new Map(
    attrs.map((attr, i) => [
      attr.id,
      heuserAttributePosition(owner, i, attrs.length),
    ]),
  );

  return nodes.map((n) => {
    const p = positions.get(n.id);
    if (!p) return n;
    return { ...n, position: p };
  });
};

/**
 * Top-left à direita de `from`, alinhado pelo centro vertical —
 * usado pela cadeia Tab (entidade → relacionamento → entidade).
 */
export const positionRightOf = (
  from: ErNode,
  nextType: NodeType,
  nextData?: Partial<ErNodeData>,
): { x: number; y: number } => {
  const fromSize = getNodeSize(from);
  const nextSize = getNodeSize({ type: nextType, data: nextData });
  const center = getNodeCenter(from);
  return topLeftFromCenter(
    {
      x: center.x + fromSize.width / 2 + TAB_CHAIN_GAP_X + nextSize.width / 2,
      y: center.y,
    },
    { type: nextType, data: nextData },
  );
};

export const createErNode = (opts: {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  label: string;
  data?: Partial<Omit<ErNodeData, 'label'>>;
}): ErNode => {
  const size = getNodeSize({
    type: opts.type,
    data: { columns: opts.data?.columns },
  });
  return {
    id: opts.id,
    type: opts.type,
    position: opts.position,
    width: size.width,
    height: size.height,
    data: {
      label: opts.label,
      ...opts.data,
    },
    style: {
      width: size.width,
      height: size.height,
      overflow: 'visible',
    },
    zIndex: opts.type === NODE_TYPES.ATTRIBUTE ? 10 : 2,
  };
};

export const createErEdge = (opts: {
  id: string;
  source: string;
  target: string;
  cardinalitySource?: string;
  cardinalityTarget?: string;
}): ErEdge => ({
  id: opts.id,
  source: opts.source,
  target: opts.target,
  sourceHandle: 'c-source',
  targetHandle: 'c-source',
  type: 'cardinality',
  data: {
    cardinalitySource: opts.cardinalitySource ?? '',
    cardinalityTarget: opts.cardinalityTarget ?? '',
  },
  style: { stroke: '#cbd5e1', strokeWidth: 2 },
});

export const patchNodeData = (
  nodes: ErNode[],
  id: string,
  patch: Partial<ErNodeData>,
): ErNode[] =>
  nodes.map((n) => {
    if (n.id !== id) return n;
    const data = { ...n.data, ...patch };
    const size = getNodeSize({ ...n, data });
    return {
      ...n,
      data,
      width: size.width,
      height: size.height,
      style: { width: size.width, height: size.height },
    };
  });

/** Garante width/height/style controlado (sem herdar style arbitrário do JSON). */
export const normalizeErNodes = (nodes: ErNode[]): ErNode[] =>
  nodes.map((n) => {
    const size = getNodeSize(n);
    return {
      ...n,
      parentId: undefined,
      width: size.width,
      height: size.height,
      style: {
        width: size.width,
        height: size.height,
        overflow: 'visible',
      },
      zIndex: n.type === NODE_TYPES.ATTRIBUTE ? 10 : 2,
    };
  });

export const normalizeErEdges = (edges: ErEdge[]): ErEdge[] =>
  edges.map((e) => ({
    ...e,
    sourceHandle: e.sourceHandle ?? 'c-source',
    targetHandle: e.targetHandle ?? 'c-source',
    type: e.type ?? 'cardinality',
    style: {
      stroke: '#cbd5e1',
      strokeWidth: 2,
    },
  }));
