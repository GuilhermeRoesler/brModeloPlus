import { NODE_TYPES, type DiagramNode, type Point } from '../types';

export type NodesBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

const halfSize = (node: DiagramNode): Point => {
  switch (node.type) {
    case NODE_TYPES.ENTITY:
      return { x: 60, y: 30 };
    case NODE_TYPES.RELATIONSHIP:
      return { x: 50, y: 40 };
    case NODE_TYPES.ATTRIBUTE:
      return { x: 70, y: 14 };
    case NODE_TYPES.TABLE: {
      const h = 32 + (node.columns?.length || 0) * 24 + 10;
      return { x: 80, y: h / 2 };
    }
    default:
      return { x: 40, y: 30 };
  }
};

export const getNodesBounds = (nodes: DiagramNode[]): NodesBounds | null => {
  if (nodes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    const { x: hx, y: hy } = halfSize(n);
    minX = Math.min(minX, n.x - hx);
    maxX = Math.max(maxX, n.x + hx);
    minY = Math.min(minY, n.y - hy);
    maxY = Math.max(maxY, n.y + hy);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
};

type FitViewOptions = {
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
};

/** Calcula pan/zoom para centralizar e enquadrar os nós no viewport. */
export const computeFitView = (
  nodes: DiagramNode[],
  viewport: ViewportSize,
  options: FitViewOptions = {},
): { pan: Point; zoom: number } | null => {
  const bounds = getNodesBounds(nodes);
  if (!bounds || viewport.width <= 0 || viewport.height <= 0) return null;

  const padding = options.padding ?? 72;
  const minZoom = options.minZoom ?? 0.35;
  const maxZoom = options.maxZoom ?? 1.15;

  const availW = Math.max(viewport.width - padding * 2, 1);
  const availH = Math.max(viewport.height - padding * 2, 1);
  const zoomX = availW / bounds.width;
  const zoomY = availH / bounds.height;
  // Evita zoom fracionário “nervoso” entre cliques (ratchet por subpixel)
  const raw = Math.min(zoomX, zoomY);
  const zoom = Math.min(maxZoom, Math.max(minZoom, Math.round(raw * 100) / 100));

  return {
    zoom,
    pan: {
      x: Math.round(viewport.width / 2 - bounds.cx * zoom),
      y: Math.round(viewport.height / 2 - bounds.cy * zoom),
    },
  };
};
