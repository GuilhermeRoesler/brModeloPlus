import ELK from 'elkjs/lib/elk.bundled.js';
import { NODE_TYPES, type ErEdge, type ErNode } from '../types';
import {
  layoutHeuserAttributes,
  normalizeErNodes,
} from './diagramFlow';
import { getNodeSize } from './nodeGeometry';

const elk = new ELK();

type LayoutOptions = {
  selectedIds?: string[];
};

/**
 * Auto layout via ELK.js stress em nós estruturais; atributos Heuser
 * são reposicionados em cascata sob o dono após o ELK.
 */
export const autoLayout = async (
  nodes: ErNode[],
  edges: ErEdge[],
  options: LayoutOptions = {},
): Promise<ErNode[]> => {
  if (nodes.length === 0) return nodes;

  const selected = options.selectedIds?.length
    ? new Set(options.selectedIds)
    : null;

  const shouldMove = (id: string) => !selected || selected.has(id);

  const structural = nodes.filter(
    (n) => n.type !== NODE_TYPES.ATTRIBUTE && shouldMove(n.id),
  );
  const attrs = nodes.filter((n) => n.type === NODE_TYPES.ATTRIBUTE);

  // Só atributos selecionados (sem estruturais): mantém posições
  if (structural.length === 0) {
    return normalizeErNodes(nodes);
  }

  if (structural.length === 1 && attrs.every((a) => !shouldMove(a.id))) {
    return normalizeErNodes(nodes);
  }

  const idSet = new Set(structural.map((n) => n.id));
  const elkEdges = edges
    .filter(
      (e) =>
        idSet.has(e.source) &&
        idSet.has(e.target) &&
        e.source !== e.target,
    )
    .map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    }));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'org.eclipse.elk.stress',
      'elk.stress.desiredEdgeLength': '220',
      'elk.spacing.nodeNode': '80',
      'elk.spacing.componentComponent': '120',
      'elk.padding': '[80, 80, 80, 80]',
      'elk.separateConnectedComponents': 'true',
    },
    children: structural.map((n) => {
      const size = getNodeSize(n);
      return { id: n.id, width: size.width, height: size.height };
    }),
    edges: elkEdges,
  };

  const layouted = await elk.layout(graph);
  const positions = new Map<string, { x: number; y: number }>();
  for (const child of layouted.children ?? []) {
    if (child.x == null || child.y == null) continue;
    positions.set(child.id, { x: child.x, y: child.y });
  }

  let next = nodes.map((n) => {
    const p = positions.get(n.id);
    if (!p || !shouldMove(n.id)) return n;
    return {
      ...n,
      position: {
        x: Math.round(p.x),
        y: Math.round(p.y),
      },
    };
  });

  const owners = new Set<string>();
  for (const n of next) {
    if (
      n.type === NODE_TYPES.ENTITY ||
      n.type === NODE_TYPES.RELATIONSHIP
    ) {
      owners.add(n.id);
    }
  }
  for (const ownerId of owners) {
    next = layoutHeuserAttributes(ownerId, next, edges);
  }

  return normalizeErNodes(next);
};
