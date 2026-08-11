import { NODE_TYPES, type ErEdge, type ErNode, type ErNodeData, type NodeType } from '../types';
import { getNodeSize } from './nodeGeometry';

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
      style: { ...n.style, width: size.width, height: size.height },
    };
  });

/** Garante width/height/style e limpa parentId residual. */
export const normalizeErNodes = (nodes: ErNode[]): ErNode[] =>
  nodes.map((n) => {
    const size = getNodeSize(n);
    return {
      ...n,
      parentId: undefined,
      width: size.width,
      height: size.height,
      style: {
        ...n.style,
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
      ...e.style,
    },
  }));
