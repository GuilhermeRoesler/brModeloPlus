import {
  DIAGRAM_MAX_EDGES,
  DIAGRAM_MAX_NODES,
  ID_MAX_LENGTH,
  LABEL_MAX_LENGTH,
  TABLE_MAX_COLUMNS,
} from '../config/limits';
import {
  DATA_TYPES,
  NODE_TYPES,
  type AttrType,
  type DataType,
  type ErEdge,
  type ErEdgeData,
  type ErNode,
  type ErNodeData,
  type ModeDiagram,
  type NodeType,
  type TableColumn,
} from '../types';

const NODE_TYPE_SET = new Set<string>(Object.values(NODE_TYPES));
const ATTR_TYPE_SET = new Set<string>([
  'normal',
  'key',
  'derived',
  'multivalued',
]);
const DATA_TYPE_SET = new Set<string>(DATA_TYPES);

const asFiniteNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const id = value.slice(0, ID_MAX_LENGTH).trim();
  return id || null;
};

const asLabel = (value: unknown, fallback = ''): string =>
  String(value ?? '')
    .slice(0, LABEL_MAX_LENGTH)
    .trim() || fallback;

const sanitizeColumns = (raw: unknown): TableColumn[] => {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, TABLE_MAX_COLUMNS).map((item, index) => {
    const col =
      item && typeof item === 'object' && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {};
    return {
      id: asId(col.id) ?? `col-${index}`,
      name: asLabel(col.name, `col_${index}`),
      type: asLabel(col.type, 'VARCHAR(255)'),
      ...(col.isPk ? { isPk: true } : {}),
      ...(col.isFk ? { isFk: true } : {}),
    };
  });
};

const sanitizeNodeData = (
  type: NodeType,
  raw: Record<string, unknown>,
): ErNodeData => {
  const data: ErNodeData = {
    label: asLabel(raw.label, type),
  };

  if (type === NODE_TYPES.ENTITY && raw.isWeak === true) {
    data.isWeak = true;
  }

  if (type === NODE_TYPES.ATTRIBUTE) {
    if (typeof raw.attrType === 'string' && ATTR_TYPE_SET.has(raw.attrType)) {
      data.attrType = raw.attrType as AttrType;
    }
    if (typeof raw.dataType === 'string' && DATA_TYPE_SET.has(raw.dataType)) {
      data.dataType = raw.dataType as DataType;
    }
  }

  if (type === NODE_TYPES.TABLE) {
    data.columns = sanitizeColumns(raw.columns);
  }

  return data;
};

/** Aceita só campos conhecidos de nó (descarta style/HTML/handlers do JSON). */
export const sanitizeErNode = (raw: unknown): ErNode | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const n = raw as Record<string, unknown>;
  const id = asId(n.id);
  if (!id || typeof n.type !== 'string' || !NODE_TYPE_SET.has(n.type)) {
    return null;
  }
  const type = n.type as NodeType;
  const positionRaw =
    n.position && typeof n.position === 'object' && !Array.isArray(n.position)
      ? (n.position as Record<string, unknown>)
      : {};
  const dataRaw =
    n.data && typeof n.data === 'object' && !Array.isArray(n.data)
      ? (n.data as Record<string, unknown>)
      : {};

  const node: ErNode = {
    id,
    type,
    position: {
      x: asFiniteNumber(positionRaw.x, 0),
      y: asFiniteNumber(positionRaw.y, 0),
    },
    data: sanitizeNodeData(type, dataRaw),
  };

  if (n.selected === true) node.selected = true;
  return node;
};

const sanitizeEdgeData = (raw: Record<string, unknown>): ErEdgeData => {
  const data: ErEdgeData = {};
  if (typeof raw.cardinalitySource === 'string') {
    data.cardinalitySource = raw.cardinalitySource.slice(0, 32);
  }
  if (typeof raw.cardinalityTarget === 'string') {
    data.cardinalityTarget = raw.cardinalityTarget.slice(0, 32);
  }
  return data;
};

/** Aceita só campos conhecidos de aresta (style fixo depois em normalizeErEdges). */
export const sanitizeErEdge = (raw: unknown): ErEdge | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const e = raw as Record<string, unknown>;
  const id = asId(e.id);
  const source = asId(e.source);
  const target = asId(e.target);
  if (!id || !source || !target) return null;

  const dataRaw =
    e.data && typeof e.data === 'object' && !Array.isArray(e.data)
      ? (e.data as Record<string, unknown>)
      : {};

  const edge: ErEdge = {
    id,
    source,
    target,
    data: sanitizeEdgeData(dataRaw),
  };

  if (typeof e.sourceHandle === 'string') {
    edge.sourceHandle = e.sourceHandle.slice(0, 64);
  }
  if (typeof e.targetHandle === 'string') {
    edge.targetHandle = e.targetHandle.slice(0, 64);
  }
  if (typeof e.type === 'string') {
    edge.type = e.type.slice(0, 64);
  }
  if (e.selected === true) edge.selected = true;

  return edge;
};

export const sanitizeModeDiagram = (value: unknown): ModeDiagram => {
  if (!value || typeof value !== 'object') {
    return { nodes: [], edges: [] };
  }
  const d = value as Partial<ModeDiagram>;
  const nodes = (Array.isArray(d.nodes) ? d.nodes : [])
    .map(sanitizeErNode)
    .filter((n): n is ErNode => n != null)
    .slice(0, DIAGRAM_MAX_NODES);
  const edges = (Array.isArray(d.edges) ? d.edges : [])
    .map(sanitizeErEdge)
    .filter((e): e is ErEdge => e != null)
    .slice(0, DIAGRAM_MAX_EDGES);
  return { nodes, edges };
};
