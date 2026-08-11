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

export interface DiagramNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: NodeType;
  isWeak?: boolean;
  attrType?: AttrType;
  width?: number;
  height?: number;
  columns?: TableColumn[];
}

export interface Connection {
  id: string;
  source: string;
  target: string;
  cardinalitySource: string;
  cardinalityTarget: string;
}

export interface RoomData {
  nodes: DiagramNode[];
  connections: Connection[];
  mode: Mode;
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

export interface RemoteCursor {
  userId: string;
  roomId: string;
  x: number;
  y: number;
  color: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}
