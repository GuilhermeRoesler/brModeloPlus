import { NODE_TYPES, type Connection, type DiagramNode, type Point } from '../types';

const STRUCTURAL_TYPES = new Set<string>([
  NODE_TYPES.ENTITY,
  NODE_TYPES.RELATIONSHIP,
  NODE_TYPES.TABLE,
]);

const ATTR_OFFSET_X = 110;
const ATTR_GAP_Y = 32;
const COMPOSITE_OFFSET_X = 90;
const FORCE_ITERATIONS = 180;
const IDEAL_EDGE_LENGTH = 180;

type LayoutOptions = {
  /** Se informado, só reposiciona estes nós (e atributos ligados a eles). */
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

const buildAdjacency = (ids: string[], connections: Connection[]) => {
  const set = new Set(ids);
  const edges: Array<[string, string]> = [];
  for (const c of connections) {
    if (set.has(c.source) && set.has(c.target) && c.source !== c.target) {
      edges.push([c.source, c.target]);
    }
  }
  return edges;
};

/** Force-directed estável: seed canônico + gravidade + escala normalizada. */
const layoutStructural = (nodes: DiagramNode[], connections: Connection[]): Map<string, Point> => {
  const positions = new Map<string, Point>();
  if (nodes.length === 0) return positions;

  if (nodes.length === 1) {
    positions.set(nodes[0].id, { x: 0, y: 0 });
    return positions;
  }

  const ids = nodes.map((n) => n.id);
  const edges = buildAdjacency(ids, connections);
  const ideal = IDEAL_EDGE_LENGTH;
  // Raio inicial proporcional à quantidade (não às posições atuais)
  const seedRadius = Math.max(ideal, ideal * Math.sqrt(nodes.length / Math.PI));

  ids.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / ids.length - Math.PI / 2;
    positions.set(id, {
      x: Math.cos(angle) * seedRadius,
      y: Math.sin(angle) * seedRadius,
    });
  });

  let temp = ideal;
  const cooling = temp / (FORCE_ITERATIONS + 1);
  const gravity = 0.08;

  for (let iter = 0; iter < FORCE_ITERATIONS; iter++) {
    const disp = new Map<string, Point>();
    for (const id of ids) disp.set(id, { x: 0, y: 0 });

    // Repulsão com corte: evita empurrão residual a longas distâncias
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = positions.get(ids[i])!;
        const b = positions.get(ids[j])!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d > ideal * 4) continue;
        const force = (ideal * ideal) / d;
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        const da = disp.get(ids[i])!;
        const db = disp.get(ids[j])!;
        da.x += fx;
        da.y += fy;
        db.x -= fx;
        db.y -= fy;
      }
    }

    // Atração nas arestas
    for (const [s, t] of edges) {
      const a = positions.get(s)!;
      const b = positions.get(t)!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const force = (d * d) / ideal;
      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      const da = disp.get(s)!;
      const db = disp.get(t)!;
      da.x -= fx;
      da.y -= fy;
      db.x += fx;
      db.y += fy;
    }

    // Relacionamentos no ponto médio dos vizinhos
    for (const n of nodes) {
      if (n.type !== NODE_TYPES.RELATIONSHIP) continue;
      const neigh = neighborsOf(n.id, connections).filter((id) =>
        nodes.some((x) => x.id === id && x.type !== NODE_TYPES.RELATIONSHIP),
      );
      if (neigh.length < 2) continue;
      let mx = 0;
      let my = 0;
      for (const id of neigh) {
        const p = positions.get(id)!;
        mx += p.x;
        my += p.y;
      }
      mx /= neigh.length;
      my /= neigh.length;
      const p = positions.get(n.id)!;
      const d = disp.get(n.id)!;
      d.x += (mx - p.x) * 0.45;
      d.y += (my - p.y) * 0.45;
    }

    // Gravidade para o centro — impede expansão infinita
    for (const id of ids) {
      const p = positions.get(id)!;
      const d = disp.get(id)!;
      d.x -= p.x * gravity;
      d.y -= p.y * gravity;
    }

    for (const id of ids) {
      const p = positions.get(id)!;
      const d = disp.get(id)!;
      const len = Math.hypot(d.x, d.y) || 0.01;
      const limited = Math.min(len, temp);
      p.x += (d.x / len) * limited;
      p.y += (d.y / len) * limited;
    }

    temp -= cooling;
  }

  // Normaliza escala para distância média alvo entre pares ligados (ou vizinhos)
  let scalePairs = 0;
  let scaleSum = 0;
  if (edges.length > 0) {
    for (const [s, t] of edges) {
      const a = positions.get(s)!;
      const b = positions.get(t)!;
      scaleSum += Math.hypot(a.x - b.x, a.y - b.y);
      scalePairs++;
    }
  } else {
    for (let i = 0; i < ids.length; i++) {
      const a = positions.get(ids[i])!;
      const b = positions.get(ids[(i + 1) % ids.length])!;
      scaleSum += Math.hypot(a.x - b.x, a.y - b.y);
      scalePairs++;
    }
  }
  const avg = scaleSum / Math.max(scalePairs, 1);
  if (avg > 1) {
    const scale = ideal / avg;
    for (const id of ids) {
      const p = positions.get(id)!;
      p.x *= scale;
      p.y *= scale;
    }
  }

  return positions;
};

const placeFan = (
  owner: Point,
  count: number,
  side: -1 | 1,
  offsetX: number,
): Point[] => {
  if (count === 0) return [];
  const totalH = (count - 1) * ATTR_GAP_Y;
  const startY = owner.y - totalH / 2;
  return Array.from({ length: count }, (_, i) => ({
    x: owner.x + side * offsetX,
    y: startY + i * ATTR_GAP_Y,
  }));
};

/**
 * Reorganiza o diagrama: nós estruturais via force-directed;
 * atributos em colunas laterais (estilo Heuser / “árvore de natal”).
 */
export const autoLayout = (
  nodes: DiagramNode[],
  connections: Connection[],
  options: LayoutOptions = {},
): DiagramNode[] => {
  if (nodes.length === 0) return nodes;

  const selected = options.selectedIds?.length
    ? new Set(options.selectedIds)
    : null;

  // Inclui atributos ligados a nós estruturais selecionados
  if (selected) {
    for (const n of nodes) {
      if (n.type !== NODE_TYPES.ATTRIBUTE || selected.has(n.id)) continue;
      const owner = neighborsOf(n.id, connections).find((id) => {
        const o = nodes.find((x) => x.id === id);
        return o && isStructural(o) && selected.has(o.id);
      });
      if (owner) selected.add(n.id);
    }
  }

  const shouldMove = (id: string) => !selected || selected.has(id);

  const structural = nodes.filter((n) => isStructural(n) && shouldMove(n.id));
  const attributes = nodes.filter(
    (n) => n.type === NODE_TYPES.ATTRIBUTE && shouldMove(n.id),
  );

  const positions = new Map<string, Point>();
  for (const n of nodes) {
    positions.set(n.id, { x: n.x, y: n.y });
  }

  const structuralPositions = layoutStructural(structural, connections);
  for (const [id, p] of structuralPositions) {
    positions.set(id, p);
  }

  const placedAttrs = new Set<string>();
  const attrsByOwner = new Map<string, DiagramNode[]>();

  for (const attr of attributes) {
    const neigh = neighborsOf(attr.id, connections);
    const ownerId = neigh.find((id) => {
      const n = nodes.find((x) => x.id === id);
      return n && isStructural(n);
    });
    if (!ownerId) continue;
    const list = attrsByOwner.get(ownerId) ?? [];
    list.push(attr);
    attrsByOwner.set(ownerId, list);
  }

  for (const [ownerId, attrs] of attrsByOwner) {
    const ownerPos = positions.get(ownerId)!;
    const sorted = [...attrs].sort((a, b) => a.label.localeCompare(b.label, 'pt'));
    const mid = Math.ceil(sorted.length / 2);
    const left = sorted.slice(0, mid);
    const right = sorted.slice(mid);

    const leftPts = placeFan(ownerPos, left.length, -1, ATTR_OFFSET_X);
    const rightPts = placeFan(ownerPos, right.length, 1, ATTR_OFFSET_X);

    left.forEach((attr, i) => {
      positions.set(attr.id, leftPts[i]);
      placedAttrs.add(attr.id);
    });
    right.forEach((attr, i) => {
      positions.set(attr.id, rightPts[i]);
      placedAttrs.add(attr.id);
    });
  }

  const composites = attributes.filter((a) => !placedAttrs.has(a.id));
  let changed = true;
  let guard = 0;
  while (changed && guard < 20) {
    changed = false;
    guard++;
    for (const attr of composites) {
      if (placedAttrs.has(attr.id)) continue;
      const parentId = neighborsOf(attr.id, connections).find((id) => placedAttrs.has(id));
      if (!parentId) continue;

      const siblings = composites.filter((c) => {
        if (placedAttrs.has(c.id) && c.id !== attr.id) return false;
        return neighborsOf(c.id, connections).includes(parentId);
      });
      const group = siblings
        .filter((c) => !placedAttrs.has(c.id) || c.id === attr.id)
        .sort((a, b) => a.label.localeCompare(b.label, 'pt'));

      const parentPos = positions.get(parentId)!;
      const ownerStructural = neighborsOf(parentId, connections).find((id) => {
        const n = nodes.find((x) => x.id === id);
        return n && isStructural(n);
      });
      const ownerPos = ownerStructural ? positions.get(ownerStructural)! : parentPos;
      const side: -1 | 1 = parentPos.x >= ownerPos.x ? 1 : -1;
      const pts = placeFan(parentPos, group.length, side, COMPOSITE_OFFSET_X);

      group.forEach((child, i) => {
        positions.set(child.id, pts[i]);
        placedAttrs.add(child.id);
      });
      changed = true;
    }
  }

  const orphans = attributes.filter((a) => !placedAttrs.has(a.id));
  if (orphans.length > 0) {
    let minX = Infinity;
    let maxY = -Infinity;
    for (const p of positions.values()) {
      minX = Math.min(minX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    if (!Number.isFinite(minX)) minX = 0;
    if (!Number.isFinite(maxY)) maxY = 0;

    orphans
      .sort((a, b) => a.label.localeCompare(b.label, 'pt'))
      .forEach((attr, i) => {
        positions.set(attr.id, {
          x: minX + (i % 6) * ATTR_OFFSET_X,
          y: maxY + 100 + Math.floor(i / 6) * ATTR_GAP_Y,
        });
      });
  }

  const movedIds = new Set([
    ...structural.map((n) => n.id),
    ...attributes.map((n) => n.id),
  ]);
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (const id of movedIds) {
    const p = positions.get(id);
    if (!p) continue;
    sx += p.x;
    sy += p.y;
    count++;
  }
  if (count > 0) {
    const ox = sx / count;
    const oy = sy / count;
    for (const id of movedIds) {
      const p = positions.get(id)!;
      p.x -= ox;
      p.y -= oy;
    }
  }

  return nodes.map((n) => {
    const p = positions.get(n.id);
    if (!p || !shouldMove(n.id)) return n;
    return { ...n, x: Math.round(p.x), y: Math.round(p.y) };
  });
};
