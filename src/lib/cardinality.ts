import { NODE_TYPES, type ErEdge, type ErNode } from '../types';

export const CARDINALITY_VALUES = [
  '',
  '1',
  'n',
  '(0,1)',
  '(1,1)',
  '(0,n)',
  '(1,n)',
] as const;

export type CardinalityValue = (typeof CARDINALITY_VALUES)[number];

export const CARDINALITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Nenhuma' },
  { value: '1', label: '1' },
  { value: 'n', label: 'N' },
  { value: '(0,1)', label: '(0,1)' },
  { value: '(1,1)', label: '(1,1)' },
  { value: '(0,n)', label: '(0,n)' },
  { value: '(1,n)', label: '(1,n)' },
];

export type CardinalitySide = 'source' | 'target';

/** Próximo valor no ciclo de clique no canvas. */
export const nextCardinality = (current: string | undefined): string => {
  const cur = current ?? '';
  const idx = CARDINALITY_VALUES.indexOf(cur as CardinalityValue);
  const i = idx >= 0 ? idx : 0;
  return CARDINALITY_VALUES[(i + 1) % CARDINALITY_VALUES.length];
};

/**
 * Em aresta entidade ↔ relacionamento (notação Heuser), a cardinalidade
 * fica no lado da entidade. Retorna esse lado, ou null se não for o caso.
 */
export const entityParticipationSide = (
  edge: Pick<ErEdge, 'source' | 'target'>,
  nodes: ErNode[],
): CardinalitySide | null => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const src = byId.get(edge.source);
  const tgt = byId.get(edge.target);
  if (!src || !tgt) return null;

  const srcEnt = src.type === NODE_TYPES.ENTITY;
  const tgtEnt = tgt.type === NODE_TYPES.ENTITY;
  const srcRel = src.type === NODE_TYPES.RELATIONSHIP;
  const tgtRel = tgt.type === NODE_TYPES.RELATIONSHIP;

  if (srcEnt && tgtRel) return 'source';
  if (srcRel && tgtEnt) return 'target';
  return null;
};

export const cardinalityFieldForSide = (
  side: CardinalitySide,
): 'cardinalitySource' | 'cardinalityTarget' =>
  side === 'source' ? 'cardinalitySource' : 'cardinalityTarget';

/** Distância fixa (px) da borda do nó até o centro do chip. */
export const CARDINALITY_OFFSET_PX = 22;

type Rect = { x: number; y: number; width: number; height: number };
type Pt = { x: number; y: number };

/**
 * Distância ao longo do raio (origin + t*dir) até sair do retângulo.
 * `origin` deve estar dentro (ex.: handle central do RF).
 */
const rayExitDistance = (
  origin: Pt,
  ux: number,
  uy: number,
  rect: Rect,
): number => {
  let tMin = Number.POSITIVE_INFINITY;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  if (ux > 1e-8) {
    const t = (right - origin.x) / ux;
    const y = origin.y + t * uy;
    if (t > 0 && y >= rect.y - 0.5 && y <= bottom + 0.5) tMin = Math.min(tMin, t);
  }
  if (ux < -1e-8) {
    const t = (rect.x - origin.x) / ux;
    const y = origin.y + t * uy;
    if (t > 0 && y >= rect.y - 0.5 && y <= bottom + 0.5) tMin = Math.min(tMin, t);
  }
  if (uy > 1e-8) {
    const t = (bottom - origin.y) / uy;
    const x = origin.x + t * ux;
    if (t > 0 && x >= rect.x - 0.5 && x <= right + 0.5) tMin = Math.min(tMin, t);
  }
  if (uy < -1e-8) {
    const t = (rect.y - origin.y) / uy;
    const x = origin.x + t * ux;
    if (t > 0 && x >= rect.x - 0.5 && x <= right + 0.5) tMin = Math.min(tMin, t);
  }

  return Number.isFinite(tMin) ? tMin : 0;
};

/**
 * Centro do chip: sobre a mesma reta da aresta (handle→handle),
 * a `offset` px além da borda do nó. Assim fica alinhado à linha
 * e à entidade (sai pelo meio do lado correspondente).
 */
export const cardinalityLabelPoint = (
  rect: Rect,
  handle: Pt,
  otherHandle: Pt,
  offset: number = CARDINALITY_OFFSET_PX,
): Pt => {
  const dx = otherHandle.x - handle.x;
  const dy = otherHandle.y - handle.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const toBorder = rayExitDistance(handle, ux, uy, rect);
  const dist = toBorder + offset;
  return { x: handle.x + ux * dist, y: handle.y + uy * dist };
};
