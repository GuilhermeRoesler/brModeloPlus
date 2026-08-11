import type { Edge, Node } from '@xyflow/react';

export const MODES = {
  CONCEPTUAL: 'conceitual',
  LOGICAL: 'logico',
  PHYSICAL: 'fisico',
} as const;

export type Mode = (typeof MODES)[keyof typeof MODES];

export const NODE_TYPES = {
  ENTITY: 'entity',
  RELATIONSHIP: 'relationship',
  ATTRIBUTE: 'attribute',
  TABLE: 'table',
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export type AttrType = 'normal' | 'key' | 'derived' | 'multivalued';

export type Tool =
  | 'select'
  | 'entity'
  | 'relationship'
  | 'table'
  | 'connection';

export interface TableColumn {
  id: string;
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
}

/** Payload de modelagem ER em `node.data` (React Flow). */
export type ErNodeData = {
  label: string;
  isWeak?: boolean;
  attrType?: AttrType;
  columns?: TableColumn[];
};

export type ErEdgeData = {
  cardinalitySource?: string;
  cardinalityTarget?: string;
};

/** Nó do diagrama = Node do React Flow. */
export type ErNode = Node<ErNodeData, NodeType>;

/** Aresta do diagrama = Edge do React Flow. */
export type ErEdge = Edge<ErEdgeData>;

/** Diagrama independente de um modo (conceitual / lógico / físico). */
export type ModeDiagram = {
  nodes: ErNode[];
  edges: ErEdge[];
};

/** Versão atual do documento de sala (um canvas por modo). */
export const ROOM_VERSION = 3 as const;

export interface RoomData {
  diagrams: Record<Mode, ModeDiagram>;
  mode: Mode;
  version: typeof ROOM_VERSION;
}

export interface TimestampLike {
  seconds?: number;
}

export interface Project {
  id: string;
  name: string;
  roomId: string;
  ownerId: string;
  createdAt?: TimestampLike | unknown;
}

export interface AppUser {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
  isLocal?: boolean;
}

export interface Point {
  x: number;
  y: number;
}
