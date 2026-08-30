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

/** Tipos SQL allowlisted para atributos (conceitual → coluna no lógico/físico). */
export const DATA_TYPES = [
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'DECIMAL(10,2)',
  'REAL',
  'VARCHAR(50)',
  'VARCHAR(100)',
  'VARCHAR(255)',
  'CHAR(1)',
  'TEXT',
  'BOOLEAN',
  'DATE',
  'TIME',
  'TIMESTAMP',
  'UUID',
] as const;

export type DataType = (typeof DATA_TYPES)[number];

export const DEFAULT_DATA_TYPE: DataType = 'VARCHAR(255)';

export const DATA_TYPE_OPTIONS: { value: DataType; label: string }[] =
  DATA_TYPES.map((value) => ({ value, label: value }));

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
  /** Classificação conceitual (chave, derivado, multivalorado…). */
  attrType?: AttrType;
  /** Tipo de dado SQL do atributo (propaga para coluna no lógico/físico). */
  dataType?: DataType;
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
}

export interface Point {
  x: number;
  y: number;
}
