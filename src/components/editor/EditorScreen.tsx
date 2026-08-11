import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStore,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { saveRoom, subscribeToRoom } from '../../services/rooms';
import { autoLayout } from '../../lib/autoLayout';
import {
  cardinalityFieldForSide,
  nextCardinality,
  type CardinalitySide,
} from '../../lib/cardinality';
import {
  createErEdge,
  createErNode,
  findAttributeOwnerId,
  followStructuralDrags,
  heuserAttributePosition,
  layoutHeuserAttributes,
  linkedAttributesOf,
  normalizeErEdges,
  normalizeErNodes,
  patchNodeData,
  positionRightOf,
} from '../../lib/diagramFlow';
import { topLeftFromCenter } from '../../lib/nodeGeometry';
import { generateId } from '../../lib/utils';
import {
  MODES,
  NODE_TYPES,
  ROOM_VERSION,
  type AppUser,
  type ErEdge,
  type ErNode,
  type ErNodeData,
  type Mode,
  type Tool,
} from '../../types';
import { CanvasBoard } from './CanvasBoard';
import { EditorHeader } from './EditorHeader';
import { PropertiesPanel } from './PropertiesPanel';
import { SQLPanel } from './SQLPanel';
import { Toolbar } from './Toolbar';

type EditorScreenProps = {
  user: AppUser;
  roomId: string;
  onBack: () => void;
};

const ZoomControls = () => {
  const { zoomIn, zoomOut, setViewport, getViewport } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  return (
    <div className="absolute bottom-6 left-6 flex gap-2 z-10">
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => void zoomOut({ duration: 150 })}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
        >
          <ZoomOut size={18} />
        </button>
        <span className="text-xs font-bold w-12 text-center text-slate-600 tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => void zoomIn({ duration: 150 })}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
        >
          <ZoomIn size={18} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          const vp = getViewport();
          void setViewport({ ...vp, x: 0, y: 0, zoom: 1 }, { duration: 150 });
        }}
        className="bg-white rounded-xl shadow-lg border border-slate-100 p-2 hover:bg-slate-50 text-slate-600 transition-colors text-xs font-medium"
      >
        Resetar
      </button>
    </div>
  );
};

const selectedIdsFrom = (nodes: ErNode[], edges: ErEdge[]) => [
  ...nodes.filter((n) => n.selected).map((n) => n.id),
  ...edges.filter((e) => e.selected).map((e) => e.id),
];

const EditorWorkspace = ({ roomId, onBack }: EditorScreenProps) => {
  const [mode, setMode] = useState<Mode>(MODES.CONCEPTUAL);
  const [nodes, setNodes] = useNodesState<ErNode>([]);
  const [edges, setEdges] = useEdgesState<ErEdge>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [showSql, setShowSql] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [fitRequestId, setFitRequestId] = useState(0);
  const [roomReady, setRoomReady] = useState(false);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const modeRef = useRef(mode);
  const editingLabelIdRef = useRef(editingLabelId);

  nodesRef.current = nodes;
  edgesRef.current = edges;
  modeRef.current = mode;
  editingLabelIdRef.current = editingLabelId;

  const selectedIds = useMemo(
    () => selectedIdsFrom(nodes, edges),
    [nodes, edges],
  );
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const persist = useCallback(
    (newNodes?: ErNode[], newEdges?: ErEdge[], newMode?: Mode) => {
      void saveRoom(roomId, {
        nodes: newNodes ?? nodesRef.current,
        edges: newEdges ?? edgesRef.current,
        mode: newMode ?? modeRef.current,
        version: ROOM_VERSION,
      });
    },
    [roomId],
  );

  useEffect(() => {
    setRoomReady(false);
    const unsub = subscribeToRoom(roomId, {
      onRoomData: (data) => {
        setNodes(data.nodes);
        setEdges(data.edges);
        setMode(data.mode);
        setRoomReady(true);
      },
    });
    return () => unsub?.();
  }, [roomId, setNodes, setEdges]);

  const requestFit = () => setFitRequestId((n) => n + 1);

  const commitDiagram = async (
    nextNodes: ErNode[],
    nextEdges: ErEdge[] = edgesRef.current,
    options: { fit?: boolean; layout?: boolean } = {},
  ) => {
    const { fit = true, layout = true } = options;
    const laidOut =
      layout && nextNodes.length > 0
        ? await autoLayout(nextNodes, nextEdges)
        : normalizeErNodes(nextNodes);
    const nextEdgeList = normalizeErEdges(nextEdges);
    setNodes(laidOut);
    setEdges(nextEdgeList);
    nodesRef.current = laidOut;
    edgesRef.current = nextEdgeList;
    if (fit) requestFit();
    persist(laidOut, nextEdgeList);
    return laidOut;
  };

  const handleNodesChange = useCallback(
    (changes: NodeChange<ErNode>[]) => {
      const filtered = changes.filter((c) => c.type !== 'dimensions');
      if (filtered.length === 0) return;

      const shouldPersist = filtered.some(
        (c) =>
          c.type === 'remove' ||
          (c.type === 'position' && c.dragging === false),
      );

      const movedIds = new Set(
        filtered.filter((c) => c.type === 'position').map((c) => c.id),
      );

      setNodes((nds) => {
        const applied = applyNodeChanges(filtered, nds);
        const next =
          movedIds.size > 0
            ? followStructuralDrags(nds, applied, edgesRef.current, movedIds)
            : applied;
        nodesRef.current = next;
        if (shouldPersist) {
          queueMicrotask(() => persist(next, edgesRef.current));
        }
        return next;
      });
    },
    [setNodes, persist],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<ErEdge>[]) => {
      const shouldPersist = changes.some(
        (c) => c.type === 'remove' || c.type === 'add',
      );

      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        edgesRef.current = next;
        if (shouldPersist) {
          queueMicrotask(() => persist(nodesRef.current, next));
        }
        return next;
      });
    },
    [setEdges, persist],
  );

  const addNodeAt = (flowPos: { x: number; y: number }) => {
    let type: (typeof NODE_TYPES)[keyof typeof NODE_TYPES] | null = null;
    let label = '';
    let data: Partial<ErNodeData> = {};

    if (tool === 'entity') {
      type = NODE_TYPES.ENTITY;
      label = 'Entidade';
      data = { isWeak: false };
    } else if (tool === 'relationship') {
      type = NODE_TYPES.RELATIONSHIP;
      label = 'Rel';
    } else if (tool === 'table') {
      type = NODE_TYPES.TABLE;
      label = 'Tabela';
      data = {
        columns: [{ id: generateId(), name: 'id', type: 'INT', isPk: true }],
      };
    }
    if (!type) return;

    const topLeft = topLeftFromCenter(flowPos, { type, data });
    const newNode = createErNode({
      id: generateId(),
      type,
      position: topLeft,
      label,
      data,
    });
    newNode.selected = true;

    const cleared = nodesRef.current.map((n) => ({ ...n, selected: false }));
    const clearedEdges = edgesRef.current.map((e) => ({ ...e, selected: false }));
    void commitDiagram([...cleared, newNode], clearedEdges);
    setTool('select');
  };

  const createLinkedAttribute = (ownerId: string) => {
    const owner = nodesRef.current.find((n) => n.id === ownerId);
    if (!owner) return;
    if (
      owner.type !== NODE_TYPES.ENTITY &&
      owner.type !== NODE_TYPES.RELATIONSHIP
    ) {
      return;
    }

    const siblings = linkedAttributesOf(
      ownerId,
      nodesRef.current,
      edgesRef.current,
    );
    const attrId = generateId();
    const topLeft = heuserAttributePosition(
      owner,
      siblings.length,
      siblings.length + 1,
    );

    const newAttr = createErNode({
      id: attrId,
      type: NODE_TYPES.ATTRIBUTE,
      position: topLeft,
      label: '',
      data: { attrType: 'normal' },
    });
    newAttr.selected = true;

    const newEdge = createErEdge({
      id: generateId(),
      source: ownerId,
      target: attrId,
    });

    const cleared = nodesRef.current.map((n) => ({ ...n, selected: false }));
    const clearedEdges = edgesRef.current.map((e) => ({ ...e, selected: false }));
    const withAttr = [...cleared, newAttr];
    const withEdge = [...clearedEdges, newEdge];
    const laidOut = layoutHeuserAttributes(ownerId, withAttr, withEdge);

    void commitDiagram(laidOut, withEdge, { fit: false, layout: false });
    setTool('select');
    editingLabelIdRef.current = attrId;
    setEditingLabelId(attrId);
  };

  /** Tab: entidade → relacionamento à direita, já conectado, edição inline. */
  const createLinkedRelationship = (entityId: string) => {
    const entity = nodesRef.current.find((n) => n.id === entityId);
    if (!entity || entity.type !== NODE_TYPES.ENTITY) return;

    const relId = generateId();
    const newRel = createErNode({
      id: relId,
      type: NODE_TYPES.RELATIONSHIP,
      position: positionRightOf(entity, NODE_TYPES.RELATIONSHIP),
      label: '',
    });
    newRel.selected = true;

    const newEdge = createErEdge({
      id: generateId(),
      source: entityId,
      target: relId,
    });

    const cleared = nodesRef.current.map((n) => ({ ...n, selected: false }));
    const clearedEdges = edgesRef.current.map((e) => ({ ...e, selected: false }));

    void commitDiagram([...cleared, newRel], [...clearedEdges, newEdge], {
      fit: false,
      layout: false,
    });
    setTool('select');
    editingLabelIdRef.current = relId;
    setEditingLabelId(relId);
  };

  /** Tab: relacionamento → entidade à direita, já interligada, edição inline. */
  const createLinkedEntity = (relationshipId: string) => {
    const rel = nodesRef.current.find((n) => n.id === relationshipId);
    if (!rel || rel.type !== NODE_TYPES.RELATIONSHIP) return;

    const entityId = generateId();
    const newEntity = createErNode({
      id: entityId,
      type: NODE_TYPES.ENTITY,
      position: positionRightOf(rel, NODE_TYPES.ENTITY, { isWeak: false }),
      label: '',
      data: { isWeak: false },
    });
    newEntity.selected = true;

    const newEdge = createErEdge({
      id: generateId(),
      source: relationshipId,
      target: entityId,
    });

    const cleared = nodesRef.current.map((n) => ({ ...n, selected: false }));
    const clearedEdges = edgesRef.current.map((e) => ({ ...e, selected: false }));

    void commitDiagram([...cleared, newEntity], [...clearedEdges, newEdge], {
      fit: false,
      layout: false,
    });
    setTool('select');
    editingLabelIdRef.current = entityId;
    setEditingLabelId(entityId);
  };

  const resolveOwnerForEnter = (): string | null => {
    const ids = selectedIdsRef.current;
    if (ids.length !== 1) return null;
    const selected = nodesRef.current.find((n) => n.id === ids[0]);
    if (!selected) return null;
    if (
      selected.type === NODE_TYPES.ENTITY ||
      selected.type === NODE_TYPES.RELATIONSHIP
    ) {
      return selected.id;
    }
    if (selected.type === NODE_TYPES.ATTRIBUTE) {
      return findAttributeOwnerId(
        selected.id,
        nodesRef.current,
        edgesRef.current,
      );
    }
    return null;
  };

  const resolveTabChainSource = (): ErNode | null => {
    const ids = selectedIdsRef.current;
    if (ids.length !== 1) return null;
    const selected = nodesRef.current.find((n) => n.id === ids[0]);
    if (!selected) return null;
    if (
      selected.type === NODE_TYPES.ENTITY ||
      selected.type === NODE_TYPES.RELATIONSHIP
    ) {
      return selected;
    }
    return null;
  };

  const defaultLabelFor = (type: string | undefined) => {
    if (type === NODE_TYPES.ENTITY) return 'Entidade';
    if (type === NODE_TYPES.RELATIONSHIP) return 'Rel';
    return 'Atributo';
  };

  const finalizeLabelIfEmpty = (id: string) => {
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node || node.data.label.trim()) return;
    const updated = patchNodeData(nodesRef.current, id, {
      label: defaultLabelFor(node.type),
    });
    nodesRef.current = updated;
    setNodes(updated);
  };

  const handleInlineLabelChange = (id: string, label: string) => {
    const updated = patchNodeData(nodesRef.current, id, { label });
    nodesRef.current = updated;
    setNodes(updated);
  };

  const handleInlineLabelEnd = (id: string) => {
    if (editingLabelIdRef.current !== id) return;
    finalizeLabelIfEmpty(id);
    editingLabelIdRef.current = null;
    setEditingLabelId(null);
    persist();
  };

  /** Enter na edição: atributo → próximo atributo; demais → só finaliza. */
  const handleInlineLabelSubmit = (id: string) => {
    finalizeLabelIfEmpty(id);
    persist();
    const node = nodesRef.current.find((n) => n.id === id);
    if (node?.type !== NODE_TYPES.ATTRIBUTE) {
      editingLabelIdRef.current = null;
      setEditingLabelId(null);
      return;
    }
    const ownerId = findAttributeOwnerId(
      id,
      nodesRef.current,
      edgesRef.current,
    );
    if (ownerId) createLinkedAttribute(ownerId);
  };

  /** Tab na edição: atributo finaliza; entidade/rel continua a cadeia. */
  const handleInlineLabelTab = (id: string) => {
    finalizeLabelIfEmpty(id);
    persist();
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node) {
      editingLabelIdRef.current = null;
      setEditingLabelId(null);
      return;
    }
    if (node.type === NODE_TYPES.ENTITY) {
      createLinkedRelationship(id);
      return;
    }
    if (node.type === NODE_TYPES.RELATIONSHIP) {
      createLinkedEntity(id);
      return;
    }
    editingLabelIdRef.current = null;
    setEditingLabelId(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (modeRef.current !== MODES.CONCEPTUAL) return;

      if (e.key === 'Escape' && editingLabelIdRef.current) {
        handleInlineLabelEnd(editingLabelIdRef.current);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-inline-label-edit]')) return;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Enter') {
        const ownerId = resolveOwnerForEnter();
        if (!ownerId) return;
        e.preventDefault();
        createLinkedAttribute(ownerId);
        return;
      }

      if (e.key === 'Tab') {
        const source = resolveTabChainSource();
        if (!source) return;
        e.preventDefault();
        if (source.type === NODE_TYPES.ENTITY) {
          createLinkedRelationship(source.id);
        } else if (source.type === NODE_TYPES.RELATIONSHIP) {
          createLinkedEntity(source.id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = useCallback((source: string, target: string) => {
    const exists = edgesRef.current.some(
      (c) =>
        (c.source === source && c.target === target) ||
        (c.source === target && c.target === source),
    );
    if (exists) return;

    const newEdge = createErEdge({
      id: generateId(),
      source,
      target,
    });
    void commitDiagram(nodesRef.current, [...edgesRef.current, newEdge], {
      fit: false,
      layout: false,
    });
    setTool('select');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateNode = (id: string, changes: Partial<ErNodeData>) => {
    const updated = patchNodeData(nodesRef.current, id, changes);
    void commitDiagram(updated, edgesRef.current, { fit: false, layout: false });
  };

  const updateEdge = (
    id: string,
    changes: Partial<NonNullable<ErEdge['data']>>,
  ) => {
    const updated = edgesRef.current.map((e) =>
      e.id === id ? { ...e, data: { ...e.data, ...changes } } : e,
    );
    void commitDiagram(nodesRef.current, updated, { fit: false, layout: false });
  };

  const handleCycleEdgeCardinality = (
    edgeId: string,
    side: CardinalitySide,
  ) => {
    const edge = edgesRef.current.find((e) => e.id === edgeId);
    if (!edge) return;
    const field = cardinalityFieldForSide(side);
    updateEdge(edgeId, {
      [field]: nextCardinality(edge.data?.[field]),
    });
  };

  const deleteSelected = (idOverride?: string | null) => {
    const idsToDelete = idOverride ? [idOverride] : selectedIdsRef.current;
    if (idsToDelete.length === 0) return;

    const newNodes = nodesRef.current.filter((n) => !idsToDelete.includes(n.id));
    const newEdges = edgesRef.current.filter(
      (e) =>
        !idsToDelete.includes(e.id) &&
        !idsToDelete.includes(e.source) &&
        !idsToDelete.includes(e.target),
    );

    void commitDiagram(newNodes, newEdges, { fit: false, layout: false });
  };

  const handleChangeMode = (m: Mode) => {
    setMode(m);
    persist(undefined, undefined, m);
  };

  const handleAutoLayout = () => {
    void commitDiagram(nodesRef.current, edgesRef.current);
  };

  if (!roomReady) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-100 text-slate-500 text-sm">
        Carregando diagrama…
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100 overflow-hidden font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <EditorHeader
        mode={mode}
        onBack={onBack}
        onChangeMode={handleChangeMode}
        showSql={showSql}
        onToggleSql={() => setShowSql((v) => !v)}
      />

      <div className="flex-1 flex relative overflow-hidden">
        <Toolbar
          tool={tool}
          setTool={setTool}
          currentMode={mode}
          onAutoLayout={handleAutoLayout}
        />

        <CanvasBoard
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          tool={tool}
          onConnect={handleConnect}
          onPaneAddNode={addNodeAt}
          editingLabelId={editingLabelId}
          onInlineLabelChange={handleInlineLabelChange}
          onInlineLabelEnd={handleInlineLabelEnd}
          onInlineLabelSubmit={handleInlineLabelSubmit}
          onInlineLabelTab={handleInlineLabelTab}
          onCycleEdgeCardinality={handleCycleEdgeCardinality}
          fitRequestId={fitRequestId}
        />

        {showSql && mode === MODES.PHYSICAL && (
          <SQLPanel nodes={nodes} onClose={() => setShowSql(false)} />
        )}

        <ZoomControls />

        <PropertiesPanel
          selectedIds={selectedIds}
          nodes={nodes}
          edges={edges}
          updateNode={updateNode}
          updateEdge={updateEdge}
          deleteSelected={deleteSelected}
        />
      </div>
    </div>
  );
};

export const EditorScreen = (props: EditorScreenProps) => (
  <ReactFlowProvider>
    <EditorWorkspace {...props} />
  </ReactFlowProvider>
);
