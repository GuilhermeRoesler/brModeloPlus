import { NODE_TYPES, type DiagramNode, type Point } from '../types';

export type NodeSize = { width: number; height: number };

const ATTR_GAP_FROM_OWNER = 56;

/** Tamanho visual do nó no React Flow (hitbox). */
export const getNodeSize = (node: DiagramNode): NodeSize => {
  switch (node.type) {
    case NODE_TYPES.ENTITY:
      return { width: 120, height: 60 };
    case NODE_TYPES.RELATIONSHIP:
      return { width: 100, height: 80 };
    case NODE_TYPES.ATTRIBUTE:
      return { width: 20, height: 20 };
    case NODE_TYPES.TABLE: {
      const h = 32 + (node.columns?.length || 0) * 24 + 10;
      return { width: 160, height: h };
    }
    default:
      return { width: 80, height: 60 };
  }
};

/** Centro geométrico a partir do top-left persistido. */
export const getNodeCenter = (node: DiagramNode): Point => {
  const { width, height } = getNodeSize(node);
  return { x: node.x + width / 2, y: node.y + height / 2 };
};

/** Top-left para que o centro fique em `center`. */
export const topLeftFromCenter = (
  center: Point,
  node: Pick<DiagramNode, 'type' | 'columns'>,
): Point => {
  const { width, height } = getNodeSize(node as DiagramNode);
  return { x: center.x - width / 2, y: center.y - height / 2 };
};

/**
 * Distância centro→centro na horizontal para o atributo não encostar no dono.
 */
export const attributeOffsetX = (
  owner: Pick<DiagramNode, 'type' | 'columns'>,
): number => {
  const ownerHalf = getNodeSize(owner as DiagramNode).width / 2;
  const attrHalf = 10;
  return ownerHalf + attrHalf + ATTR_GAP_FROM_OWNER;
};
