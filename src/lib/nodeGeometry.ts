import { NODE_TYPES, type ErNode, type NodeType, type Point, type TableColumn } from '../types';

export type NodeSize = { width: number; height: number };

type SizeInput = {
  type: NodeType | string | undefined;
  data?: { columns?: TableColumn[] };
  columns?: TableColumn[];
};

/** Tamanho visual do nó no React Flow (hitbox). */
export const getNodeSize = (node: SizeInput): NodeSize => {
  switch (node.type) {
    case NODE_TYPES.ENTITY:
      return { width: 120, height: 60 };
    case NODE_TYPES.RELATIONSHIP:
      return { width: 100, height: 80 };
    case NODE_TYPES.ATTRIBUTE:
      return { width: 20, height: 20 };
    case NODE_TYPES.TABLE: {
      const cols = node.data?.columns ?? node.columns ?? [];
      const h = 32 + cols.length * 24 + 10;
      return { width: 160, height: h };
    }
    default:
      return { width: 80, height: 60 };
  }
};

/** Centro geométrico a partir de `position` (top-left). */
export const getNodeCenter = (node: ErNode): Point => {
  const { width, height } = getNodeSize(node);
  return { x: node.position.x + width / 2, y: node.position.y + height / 2 };
};

/** Top-left para que o centro fique em `center`. */
export const topLeftFromCenter = (
  center: Point,
  node: SizeInput,
): Point => {
  const { width, height } = getNodeSize(node);
  return { x: center.x - width / 2, y: center.y - height / 2 };
};
