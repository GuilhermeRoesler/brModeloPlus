import ELK from 'elkjs/lib/elk.bundled.js';
import { NODE_TYPES, type Connection, type DiagramNode, type Point } from '../types';
import { getNodeSize } from './nodeGeometry';

const elk = new ELK();

const STRUCTURAL_TYPES = new Set<string>([
  NODE_TYPES.ENTITY,
  NODE_TYPES.RELATIONSHIP,
  NODE_TYPES.TABLE,
]);

type LayoutOptions = {
  selectedIds?: string[];
};

const isStructural = (node: DiagramNode) => STRUCTURAL_TYPES.has(node.type);

const neighborsOf = (id: string, connections: Connection[]) => {
  const ids: string[] = [];
  for (const c of connections) {
    if (c.source === id) ids.push(c.target);
    else if (c.target === id) ids.push(c.source);
  }
  return ids;
};

/**
 * Layout da estrutura (entidades, relacionamentos, tabelas).
 * Stress/undirected: o losango fica entre as entidades, não como raiz de árvore.
 */
const layoutStructural = async (
  nodes: DiagramNode[],
  connections: Connection[],
): Promise<Map<string, Point>> => {
  const positions = new Map<string, Point>();
  if (nodes.length === 0) return positions;

  if (nodes.length === 1) {
    positions.set(nodes[0].id, { x: nodes[0].x, y: nodes[0].y });
    return positions;
  }

  const idSet = new Set(nodes.map((n) => n.id));
  const edges = connections
    .filter(
      (c) =>
        idSet.has(c.source) && idSet.has(c.target) && c.source !== c.target,
    )
    .map((c) => ({
      id: c.id,
      sources: [c.source],
      targets: [c.target],
    }));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'org.eclipse.elk.stress',
      // Espaço para atributos orbitarem as entidades sem colidir
      'elk.stress.desiredEdgeLength': '320',
      'elk.spacing.nodeNode': '100',
      'elk.spacing.componentComponent': '120',
      'elk.padding': '[80, 80, 80, 80]',
      'elk.separateConnectedComponents': 'true',
    },
    children: nodes.map((n) => {
      const size = getNodeSize(n);
      return { id: n.id, width: size.width, height: size.height };
    }),
    edges,
  };

  const layouted = await elk.layout(graph);
  for (const child of layouted.children ?? []) {
    if (child.x == null || child.y == null) continue;
    positions.set(child.id, { x: child.x, y: child.y });
  }

  return positions;
};

const ownerOfAttribute = (
  attrId: string,
  connections: Connection[],
  nodesById: Map<string, DiagramNode>,
): string | null => {
  const neighbors = neighborsOf(attrId, connections);
  const structural = neighbors.find((id) => {
    const n = nodesById.get(id);
    return n && isStructural(n);
  });
  if (structural) return structural;
  const parentAttr = neighbors.find(
    (id) => nodesById.get(id)?.type === NODE_TYPES.ATTRIBUTE,
  );
  return parentAttr ?? null;
};

/**
 * Atributos em círculo ao redor do dono (notação Chen / Heuser).
 * Compostos: órbita menor em torno do atributo pai.
 */
const placeAttributesAroundOwners = (
  attributes: DiagramNode[],
  connections: Connection[],
  nodesById: Map<string, DiagramNode>,
  positions: Map<string, Point>,
) => {
  const pending = new Set(attributes.map((a) => a.id));
  const attrById = new Map(attributes.map((a) => [a.id, a]));

  let guard = 0;
  while (pending.size > 0 && guard < attributes.length + 2) {
    guard += 1;
    const byOwner = new Map<string, DiagramNode[]>();

    for (const id of pending) {
      const ownerId = ownerOfAttribute(id, connections, nodesById);
      if (!ownerId || !positions.has(ownerId)) continue;
      const attr = attrById.get(id);
      if (!attr) continue;
      const list = byOwner.get(ownerId) ?? [];
      list.push(attr);
      byOwner.set(ownerId, list);
    }

    if (byOwner.size === 0) break;

    for (const [ownerId, attrs] of byOwner) {
      const owner = nodesById.get(ownerId);
      const ownerPos = positions.get(ownerId);
      if (!owner || !ownerPos) continue;

      const ownerSize = getNodeSize(owner);
      const cx = ownerPos.x + ownerSize.width / 2;
      const cy = ownerPos.y + ownerSize.height / 2;

      const sorted = [...attrs].sort((a, b) =>
        a.label.localeCompare(b.label, 'pt-BR'),
      );
      const count = sorted.length;
      const isAttrOwner = owner.type === NODE_TYPES.ATTRIBUTE;
      const radius = isAttrOwner
        ? Math.max(56, 40 + count * 10)
        : Math.max(110, 80 + count * 14);

      sorted.forEach((attr, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
        positions.set(attr.id, {
          x: cx + Math.cos(angle) * radius - 10,
          y: cy + Math.sin(angle) * radius - 10,
        });
        pending.delete(attr.id);
      });
    }
  }

  // Órfãos: mantém posição atual
  for (const id of pending) {
    const attr = attrById.get(id);
    if (attr) positions.set(id, { x: attr.x, y: attr.y });
  }
};

/**
 * Auto layout conceitual:
 * 1) stress nos nós estruturais (entidade — relacionamento — entidade)
 * 2) atributos em órbita ao redor do dono
 */
export const autoLayout = async (
  nodes: DiagramNode[],
  connections: Connection[],
  options: LayoutOptions = {},
): Promise<DiagramNode[]> => {
  if (nodes.length === 0) return nodes;

  const nodesById = new Map(nodes.map((n) => [n.id, n]));

  const selected = options.selectedIds?.length
    ? new Set(options.selectedIds)
    : null;

  if (selected) {
    for (const n of nodes) {
      if (n.type !== NODE_TYPES.ATTRIBUTE || selected.has(n.id)) continue;
      const owner = neighborsOf(n.id, connections).find((id) => {
        const o = nodesById.get(id);
        return o && isStructural(o) && selected.has(o.id);
      });
      if (owner) selected.add(n.id);
    }
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of nodes) {
        if (n.type !== NODE_TYPES.ATTRIBUTE || selected.has(n.id)) continue;
        const parentAttr = neighborsOf(n.id, connections).find((id) =>
          selected.has(id),
        );
        if (parentAttr) {
          selected.add(n.id);
          grew = true;
        }
      }
    }
  }

  const shouldMove = (id: string) => !selected || selected.has(id);
  const movable = nodes.filter((n) => shouldMove(n.id));

  const positions = new Map<string, Point>();
  for (const n of nodes) {
    if (!shouldMove(n.id)) positions.set(n.id, { x: n.x, y: n.y });
  }

  const structural = movable.filter(isStructural);
  const attributes = movable.filter((n) => n.type === NODE_TYPES.ATTRIBUTE);

  const structuralPos = await layoutStructural(structural, connections);
  for (const [id, p] of structuralPos) positions.set(id, p);

  placeAttributesAroundOwners(attributes, connections, nodesById, positions);

  return nodes.map((n) => {
    const p = positions.get(n.id);
    if (!p || !shouldMove(n.id)) return n;
    return {
      ...n,
      x: Math.round(p.x),
      y: Math.round(p.y),
    };
  });
};
