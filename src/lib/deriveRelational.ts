import {
  cardinalityFieldForSide,
  entityParticipationSide,
} from './cardinality';
import {
  attributeSubtreeOf,
  createErEdge,
  createErNode,
  linkedAttributesOf,
  normalizeErEdges,
  normalizeErNodes,
} from './diagramFlow';
import {
  DEFAULT_DATA_TYPE,
  MODES,
  NODE_TYPES,
  type DataType,
  type ErEdge,
  type ErNode,
  type Mode,
  type ModeDiagram,
  type TableColumn,
} from '../types';

const DEFAULT_COL_TYPE: DataType = DEFAULT_DATA_TYPE;
const DEFAULT_PK_TYPE: DataType = 'INTEGER';

const resolveAttrDataType = (attr: ErNode): DataType =>
  attr.data?.dataType ?? DEFAULT_COL_TYPE;

const slug = (label: unknown, fallback: string) => {
  const s = String(label ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  return s || fallback;
};

const isManyCard = (card: string | undefined) => {
  const v = (card ?? '').toLowerCase().replace(/\s/g, '');
  return v === 'n' || v === '(0,n)' || v === '(1,n)';
};

const isOneCard = (card: string | undefined) => {
  const v = (card ?? '').toLowerCase().replace(/\s/g, '');
  return v === '1' || v === '(0,1)' || v === '(1,1)';
};

const tableIdForEntity = (entityId: string) => `drv:tbl:ent:${entityId}`;
const tableIdForRel = (relId: string) => `drv:tbl:rel:${relId}`;
const tableIdForMultivalued = (attrId: string) => `drv:tbl:mv:${attrId}`;
const colIdForAttr = (attrId: string) => `drv:col:attr:${attrId}`;
const colIdSynthPk = (ownerKey: string) => `drv:col:pk:${ownerKey}`;
const colIdFk = (relId: string, targetEntityId: string) =>
  `drv:col:fk:${relId}:${targetEntityId}`;
const edgeIdFk = (fromTableId: string, toTableId: string, key: string) =>
  `drv:edge:fk:${fromTableId}:${toTableId}:${key}`;

type Participant = { entityId: string; card: string };

/** Atributos-folha do dono (ignora compostos intermediários e derivados). */
const leafAttributesOf = (
  ownerId: string,
  nodes: ErNode[],
  edges: ErEdge[],
): ErNode[] => {
  const all = attributeSubtreeOf(ownerId, nodes, edges);
  return all.filter((attr) => {
    if (attr.data?.attrType === 'derived') return false;
    return linkedAttributesOf(attr.id, nodes, edges).length === 0;
  });
};

const columnsFromAttributes = (
  attrs: ErNode[],
  options: { skipMultivalued?: boolean } = {},
): TableColumn[] => {
  const cols: TableColumn[] = [];
  for (const attr of attrs) {
    if (options.skipMultivalued && attr.data?.attrType === 'multivalued') continue;
    cols.push({
      id: colIdForAttr(attr.id),
      name: slug(attr.data?.label, 'atributo'),
      type: resolveAttrDataType(attr),
      isPk: attr.data?.attrType === 'key',
    });
  }
  return cols;
};

const ensurePrimaryKey = (
  columns: TableColumn[],
  ownerKey: string,
): TableColumn[] => {
  if (columns.some((c) => c.isPk)) return columns;
  return [
    {
      id: colIdSynthPk(ownerKey),
      name: 'id',
      type: DEFAULT_PK_TYPE,
      isPk: true,
    },
    ...columns,
  ];
};

const pkColumnName = (columns: TableColumn[]): string =>
  columns.find((c) => c.isPk)?.name ?? 'id';

const participantsOfRelationship = (
  relId: string,
  nodes: ErNode[],
  edges: ErEdge[],
): Participant[] => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parts: Participant[] = [];

  for (const edge of edges) {
    if (edge.source !== relId && edge.target !== relId) continue;
    const side = entityParticipationSide(edge, nodes);
    if (!side) continue;
    const entityId = side === 'source' ? edge.source : edge.target;
    if (byId.get(entityId)?.type !== NODE_TYPES.ENTITY) continue;
    const field = cardinalityFieldForSide(side);
    parts.push({
      entityId,
      card: edge.data?.[field] ?? '',
    });
  }

  return parts;
};

/**
 * Deriva diagrama relacional (tabelas + FKs) a partir do modelo conceitual.
 * Regras v1:
 * - entidade → tabela; atributos (exceto derivados) → colunas; key → PK
 * - sem PK explícita → coluna sintética `id`
 * - multivalorado → tabela auxiliar com FK
 * - relacionamento 1:N → FK no lado N; 1:1 → FK em um dos lados; N:N / n-ário → tabela associativa
 * - atributos do relacionamento → colunas na tabela que recebe a FK / associativa
 */
export const deriveRelationalFromConceptual = (
  nodes: ErNode[],
  edges: ErEdge[],
): ModeDiagram => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const entities = nodes.filter((n) => n.type === NODE_TYPES.ENTITY);
  const relationships = nodes.filter((n) => n.type === NODE_TYPES.RELATIONSHIP);

  const tableNodes: ErNode[] = [];
  const tableEdges: ErEdge[] = [];
  const columnsByTable = new Map<string, TableColumn[]>();

  const addFkEdge = (
    fromTableId: string,
    toTableId: string,
    key: string,
    cardSource = 'n',
    cardTarget = '1',
  ) => {
    tableEdges.push(
      createErEdge({
        id: edgeIdFk(fromTableId, toTableId, key),
        source: fromTableId,
        target: toTableId,
        cardinalitySource: cardSource,
        cardinalityTarget: cardTarget,
      }),
    );
  };

  const pushFkColumn = (
    tableId: string,
    relId: string,
    refEntityId: string,
    refColumns: TableColumn[],
    asPk = false,
  ) => {
    const refEntity = byId.get(refEntityId);
    const refName = slug(refEntity?.data?.label ?? 'ref', 'ref');
    const cols = columnsByTable.get(tableId) ?? [];
    cols.push({
      id: colIdFk(relId, refEntityId),
      name: `${refName}_${pkColumnName(refColumns)}`,
      type: refColumns.find((c) => c.isPk)?.type ?? DEFAULT_PK_TYPE,
      isPk: asPk,
      isFk: true,
    });
    columnsByTable.set(tableId, cols);
  };

  // 1) Tabelas de entidades
  for (const entity of entities) {
    const tableId = tableIdForEntity(entity.id);
    const leafs = leafAttributesOf(entity.id, nodes, edges);
    const regular = leafs.filter((a) => a.data?.attrType !== 'multivalued');
    const multivalued = leafs.filter((a) => a.data?.attrType === 'multivalued');

    let columns = ensurePrimaryKey(
      columnsFromAttributes(regular),
      entity.id,
    );
    columnsByTable.set(tableId, columns);

    tableNodes.push(
      createErNode({
        id: tableId,
        type: NODE_TYPES.TABLE,
        position: { ...entity.position },
        label: String(entity.data?.label || 'Entidade'),
        data: { columns },
      }),
    );

    for (const mv of multivalued) {
      const mvTableId = tableIdForMultivalued(mv.id);
      const valueCol: TableColumn = {
        id: colIdForAttr(mv.id),
        name: slug(mv.data?.label, 'valor'),
        type: resolveAttrDataType(mv),
      };
      const ownerPk = pkColumnName(columns);
      const ownerSlug = slug(entity.data?.label, 'ent');
      const mvColumns = ensurePrimaryKey(
        [
          {
            id: colIdFk(`mv:${mv.id}`, entity.id),
            name: `${ownerSlug}_${ownerPk}`,
            type: columns.find((c) => c.isPk)?.type ?? DEFAULT_PK_TYPE,
            isFk: true,
          },
          valueCol,
        ],
        mv.id,
      );
      columnsByTable.set(mvTableId, mvColumns);
      tableNodes.push(
        createErNode({
          id: mvTableId,
          type: NODE_TYPES.TABLE,
          position: {
            x: entity.position.x + 40,
            y: entity.position.y + 140,
          },
          label: `${entity.data?.label ?? 'ent'}_${mv.data?.label ?? 'mv'}`.trim() || 'multivalorado',
          data: { columns: mvColumns },
        }),
      );
      addFkEdge(mvTableId, tableId, mv.id);
    }
  }

  // Refresh columns map after entity tables (references for FK types)
  for (const node of tableNodes) {
    if (node.type === NODE_TYPES.TABLE) {
      columnsByTable.set(node.id, node.data.columns ?? []);
    }
  }

  // 2) Relacionamentos
  for (const rel of relationships) {
    const parts = participantsOfRelationship(rel.id, nodes, edges);
    if (parts.length < 2) continue;

    const relAttrs = leafAttributesOf(rel.id, nodes, edges).filter(
      (a) => a.data?.attrType !== 'multivalued',
    );
    const manyParts = parts.filter((p) => isManyCard(p.card));
    const useAssociative =
      parts.length > 2 ||
      manyParts.length >= 2 ||
      (manyParts.length === 0 && parts.every((p) => !isOneCard(p.card)));

    if (useAssociative) {
      const tableId = tableIdForRel(rel.id);
      let columns: TableColumn[] = [];
      columnsByTable.set(tableId, columns);

      for (const part of parts) {
        const refTableId = tableIdForEntity(part.entityId);
        const refCols = columnsByTable.get(refTableId) ?? [];
        pushFkColumn(tableId, rel.id, part.entityId, refCols, true);
        addFkEdge(tableId, refTableId, part.entityId, 'n', '1');
      }

      columns = [
        ...(columnsByTable.get(tableId) ?? []),
        ...columnsFromAttributes(relAttrs),
      ];
      // PK composta = FKs já marcadas; se só rel attrs, ensure pk
      if (!columns.some((c) => c.isPk)) {
        columns = ensurePrimaryKey(columns, rel.id);
      }
      columnsByTable.set(tableId, columns);

      tableNodes.push(
        createErNode({
          id: tableId,
          type: NODE_TYPES.TABLE,
          position: { ...rel.position },
          label: String(rel.data?.label || 'Relacionamento'),
          data: { columns },
        }),
      );
      continue;
    }

    // 1:N ou 1:1
    const manyPart =
      manyParts[0] ??
      parts.find((p) => !isOneCard(p.card)) ??
      parts[1];
    const onePart =
      parts.find((p) => p.entityId !== manyPart.entityId) ?? parts[0];

    const manyTableId = tableIdForEntity(manyPart.entityId);
    const oneTableId = tableIdForEntity(onePart.entityId);
    const oneCols = columnsByTable.get(oneTableId) ?? [];

    pushFkColumn(manyTableId, rel.id, onePart.entityId, oneCols, false);

    const manyCols = [
      ...(columnsByTable.get(manyTableId) ?? []),
      ...columnsFromAttributes(relAttrs),
    ];
    columnsByTable.set(manyTableId, manyCols);
    addFkEdge(manyTableId, oneTableId, rel.id, 'n', '1');
  }

  // Aplicar colunas finais nos nós de tabela
  const finalNodes = tableNodes.map((node) => {
    const columns = columnsByTable.get(node.id) ?? node.data.columns ?? [];
    return createErNode({
      id: node.id,
      type: NODE_TYPES.TABLE,
      position: node.position,
      label: String(node.data?.label ?? 'tabela'),
      data: { columns },
    });
  });

  return {
    nodes: normalizeErNodes(finalNodes),
    edges: normalizeErEdges(tableEdges),
  };
};

/** Regenera lógico e físico a partir do conceitual (mesma derivação). */
export const syncDerivedDiagrams = (
  diagrams: Record<Mode, ModeDiagram>,
): Record<Mode, ModeDiagram> => {
  const conceptual = diagrams[MODES.CONCEPTUAL] ?? { nodes: [], edges: [] };
  const derived = deriveRelationalFromConceptual(
    conceptual.nodes,
    conceptual.edges,
  );
  const clone = (): ModeDiagram => ({
    nodes: derived.nodes.map((n) => ({
      ...n,
      position: { ...n.position },
      data: {
        ...n.data,
        columns: n.data.columns?.map((c) => ({ ...c })),
      },
    })),
    edges: derived.edges.map((e) => ({
      ...e,
      data: e.data ? { ...e.data } : e.data,
    })),
  });

  return {
    ...diagrams,
    [MODES.CONCEPTUAL]: conceptual,
    [MODES.LOGICAL]: clone(),
    [MODES.PHYSICAL]: clone(),
  };
};
