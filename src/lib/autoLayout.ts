import ELK from 'elkjs/lib/elk.bundled.js';
import type { ErEdge, ErNode } from '../types';
import { normalizeErNodes } from './diagramFlow';
import { getNodeSize } from './nodeGeometry';

const elk = new ELK();

type LayoutOptions = {
  selectedIds?: string[];
};

/**
 * Auto layout via ELK.js stress em todos os nós (entidades, relacionamentos,
 * atributos, tabelas) e edges do diagrama.
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
  const movable = nodes.filter((n) => shouldMove(n.id));

  if (movable.length === 0) return normalizeErNodes(nodes);

  if (movable.length === 1) {
    return normalizeErNodes(nodes);
  }

  const idSet = new Set(movable.map((n) => n.id));
  const elkEdges = edges
    .filter(
      (e) =>
        idSet.has(e.source) && idSet.has(e.target) && e.source !== e.target,
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
    children: movable.map((n) => {
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

  return normalizeErNodes(
    nodes.map((n) => {
      const p = positions.get(n.id);
      if (!p || !shouldMove(n.id)) return n;
      return {
        ...n,
        position: {
          x: Math.round(p.x),
          y: Math.round(p.y),
        },
      };
    }),
  );
};
