import type { Edge, Node } from '@xyflow/react';
import { NODE_TYPES, type Connection, type DiagramNode } from '../types';
import { getNodeCenter, getNodeSize } from './nodeGeometry';

export type DiagramFlowNodeData = {
  diagram: DiagramNode;
  labelOnLeft?: boolean;
};

export type DiagramFlowNode = Node<DiagramFlowNodeData, NodeTypeKey>;
export type DiagramFlowEdge = Edge<{
  cardinalitySource?: string;
  cardinalityTarget?: string;
}>;

type NodeTypeKey = 'entity' | 'relationship' | 'attribute' | 'table';

const STRUCTURAL = new Set<string>([
  NODE_TYPES.ENTITY,
  NODE_TYPES.RELATIONSHIP,
  NODE_TYPES.TABLE,
]);

const neighborsOf = (id: string, connections: Connection[]) => {
  const ids: string[] = [];
  for (const c of connections) {
    if (c.source === id) ids.push(c.target);
    else if (c.target === id) ids.push(c.source);
  }
  return ids;
};

/** Dono do atributo: estrutural, senão atributo composto. */
export const findAttributeOwnerId = (
  attrId: string,
  nodes: DiagramNode[],
  connections: Connection[],
): string | null => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const neighbors = neighborsOf(attrId, connections);
  const structural = neighbors.find((id) => {
    const n = byId.get(id);
    return n && STRUCTURAL.has(n.type);
  });
  if (structural) return structural;
  return (
    neighbors.find((id) => byId.get(id)?.type === NODE_TYPES.ATTRIBUTE) ?? null
  );
};

/** Rótulo Heuser à esquerda se o centro do atributo está à esquerda do dono. */
export const attributeLabelOnLeft = (
  attr: DiagramNode,
  nodes: DiagramNode[],
  connections: Connection[],
): boolean => {
  const ownerId = findAttributeOwnerId(attr.id, nodes, connections);
  const owner = ownerId ? nodes.find((n) => n.id === ownerId) : undefined;
  if (!owner || !STRUCTURAL.has(owner.type)) return false;
  return getNodeCenter(attr).x < getNodeCenter(owner).x;
};

const attributeDepth = (
  attrId: string,
  nodes: DiagramNode[],
  connections: Connection[],
): number => {
  let d = 0;
  let current: string | null = attrId;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current)) break;
    seen.add(current);
    const owner = findAttributeOwnerId(current, nodes, connections);
    if (!owner) break;
    d += 1;
    const ownerNode = nodes.find((n) => n.id === owner);
    if (ownerNode && STRUCTURAL.has(ownerNode.type)) break;
    current = owner;
  }
  return d;
};

/** Posição absoluta no fluxo (soma parentIds). */
export const absoluteFlowPosition = (
  node: DiagramFlowNode,
  byId: Map<string, DiagramFlowNode>,
): { x: number; y: number } => {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  const seen = new Set<string>();
  while (parentId) {
    if (seen.has(parentId)) break;
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
};

/**
 * Domínio (posições absolutas top-left) → nós React Flow.
 * Atributos usam `parentId` do dono: o RF move filhos com o pai (sem snap custom).
 */
export const toFlowNodes = (
  nodes: DiagramNode[],
  connections: Connection[],
  selectedIds: string[],
): DiagramFlowNode[] => {
  const selected = new Set(selectedIds);
  const absById = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));

  const ownerByAttr = new Map<string, string>();
  for (const n of nodes) {
    if (n.type !== NODE_TYPES.ATTRIBUTE) continue;
    const owner = findAttributeOwnerId(n.id, nodes, connections);
    if (owner) ownerByAttr.set(n.id, owner);
  }

  const structural = nodes.filter((n) => n.type !== NODE_TYPES.ATTRIBUTE);
  const attributes = nodes
    .filter((n) => n.type === NODE_TYPES.ATTRIBUTE)
    .sort(
      (a, b) =>
        attributeDepth(a.id, nodes, connections) -
        attributeDepth(b.id, nodes, connections),
    );

  // Pais antes dos filhos (requisito do React Flow)
  const ordered = [...structural, ...attributes];

  return ordered.map((node) => {
    const size = getNodeSize(node);
    const ownerId =
      node.type === NODE_TYPES.ATTRIBUTE ? ownerByAttr.get(node.id) : undefined;
    const abs = absById.get(node.id) ?? { x: node.x, y: node.y };

    let position = abs;
    if (ownerId) {
      const ownerAbs = absById.get(ownerId);
      if (ownerAbs) {
        position = { x: abs.x - ownerAbs.x, y: abs.y - ownerAbs.y };
      }
    }

    return {
      id: node.id,
      type: node.type as NodeTypeKey,
      position,
      parentId: ownerId,
      width: size.width,
      height: size.height,
      selected: selected.has(node.id),
      // Atributos fora do bbox do pai precisam ficar acima na pilha
      zIndex: node.type === NODE_TYPES.ATTRIBUTE ? 10 : 2,
      data: {
        diagram: node,
        labelOnLeft:
          node.type === NODE_TYPES.ATTRIBUTE
            ? attributeLabelOnLeft(node, nodes, connections)
            : undefined,
      },
      style: {
        width: size.width,
        height: size.height,
        overflow: 'visible',
      },
    };
  });
};

/** Nós React Flow → domínio com posições absolutas top-left. */
export const fromFlowNodes = (
  rfNodes: DiagramFlowNode[],
  domainNodes: DiagramNode[],
): DiagramNode[] => {
  const byId = new Map(rfNodes.map((n) => [n.id, n]));

  return domainNodes.map((domain) => {
    const rf = byId.get(domain.id);
    if (!rf) return domain;
    const abs = absoluteFlowPosition(rf, byId);
    const nextData = rf.data?.diagram;
    return {
      ...domain,
      ...(nextData
        ? {
            label: nextData.label,
            isWeak: nextData.isWeak,
            attrType: nextData.attrType,
            columns: nextData.columns,
          }
        : {}),
      x: abs.x,
      y: abs.y,
    };
  });
};

export const toFlowEdges = (
  connections: Connection[],
  selectedIds: string[],
): DiagramFlowEdge[] => {
  const selected = new Set(selectedIds);
  return connections.map((c) => ({
    id: c.id,
    source: c.source,
    target: c.target,
    sourceHandle: 'c-source',
    targetHandle: 'c-source',
    type: 'cardinality',
    selected: selected.has(c.id),
    data: {
      cardinalitySource: c.cardinalitySource,
      cardinalityTarget: c.cardinalityTarget,
    },
    style: {
      stroke: selected.has(c.id) ? '#6366f1' : '#cbd5e1',
      strokeWidth: 2,
    },
  }));
};

/**
 * Se pai e filho estão selecionados juntos, o RF move o filho duas vezes.
 * Mantém só o ancestral mais externo na seleção de nós.
 */
export const pruneChildSelection = (
  selectedNodeIds: string[],
  rfNodes: DiagramFlowNode[],
): string[] => {
  const byId = new Map(rfNodes.map((n) => [n.id, n]));
  const selected = new Set(selectedNodeIds);
  return selectedNodeIds.filter((id) => {
    let parentId = byId.get(id)?.parentId;
    while (parentId) {
      if (selected.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId;
    }
    return true;
  });
};
