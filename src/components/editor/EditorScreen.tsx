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
import { Map, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { createEmptyDiagrams } from '../../lib/localStorage';
import { syncDerivedDiagrams } from '../../lib/deriveRelational';
import { downloadTextFile, readFileAsText } from '../../lib/fileTransfer';
import { topLeftFromCenter } from '../../lib/nodeGeometry';
import {
  parseProjectFileJson,
  ProjectFileError,
  serializeProjectFile,
  suggestExportFilename,
} from '../../lib/projectFile';
import { generateId } from '../../lib/utils';
import { findProjectByRoomId } from '../../services/projects';
import {
  MODES,
  NODE_TYPES,
  ROOM_VERSION,
  type AppUser,
  type ErEdge,
  type ErNode,
  type ErNodeData,
  type Mode,
  type ModeDiagram,
  type RoomData,
  type Tool,
} from '../../types';
import { CanvasBoard } from './CanvasBoard';
import { EditorHeader } from './EditorHeader';
import { PhysicalSqlView } from './PhysicalSqlView';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';

type EditorScreenProps = {
  user: AppUser;
  roomId: string;
  onBack: () => void;
};

type ZoomControlsProps = {
  showMinimap: boolean;
  onToggleMinimap: () => void;
};

const ZoomControls = ({ showMinimap, onToggleMinimap }: ZoomControlsProps) => {
  const { zoomIn, zoomOut, setViewport, getViewport, fitView } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  return (
    <div className="absolute bottom-4 left-3 sm:left-4 flex gap-2 z-10">
      <div className="editor-chrome rounded-xl p-1 flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void zoomOut({ duration: 150 })}
              className="rounded-lg text-muted-foreground"
              aria-label="Diminuir zoom"
            >
              <ZoomOut />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Diminuir zoom</TooltipContent>
        </Tooltip>
        <span className="text-[11px] font-semibold w-11 text-center text-muted-foreground tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void zoomIn({ duration: 150 })}
              className="rounded-lg text-muted-foreground"
              aria-label="Aumentar zoom"
            >
              <ZoomIn />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Aumentar zoom</TooltipContent>
        </Tooltip>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              void fitView({ padding: 0.18, duration: 200, maxZoom: 1.15, minZoom: 0.35 });
            }}
            className="editor-chrome size-9 rounded-xl text-muted-foreground hover:bg-background"
            aria-label="Ajustar à tela"
          >
            <Maximize2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Ajustar à tela</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const vp = getViewport();
              void setViewport({ ...vp, x: 0, y: 0, zoom: 1 }, { duration: 150 });
            }}
            className="editor-chrome h-9 rounded-xl px-3 text-[11px] font-semibold text-muted-foreground hover:bg-background"
            aria-label="Zoom 100%"
          >
            100%
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom 100% e origem</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={showMinimap ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={onToggleMinimap}
            aria-pressed={showMinimap}
            className={`editor-chrome size-9 rounded-xl ${
              showMinimap ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-background'
            }`}
            aria-label={showMinimap ? 'Ocultar minimapa' : 'Mostrar minimapa'}
          >
            <Map />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {showMinimap ? 'Ocultar minimapa' : 'Mostrar minimapa'}
        </TooltipContent>
      </Tooltip>
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
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [fitRequestId, setFitRequestId] = useState(0);
  const [roomReady, setRoomReady] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [canvasFlashKey, setCanvasFlashKey] = useState(0);

  const projectName = useMemo(
    () => findProjectByRoomId(roomId)?.name?.trim() || 'Projeto',
    [roomId, roomReady],
  );

  useEffect(() => {
    document.title = `${projectName} · BrModeloPlus`;
    return () => {
      document.title = 'BrModeloPlus';
    };
  }, [projectName]);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const modeRef = useRef(mode);
  const editingLabelIdRef = useRef(editingLabelId);
  const diagramsRef = useRef<Record<Mode, ModeDiagram>>(createEmptyDiagrams());

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
      const activeMode = newMode ?? modeRef.current;
      const nextNodes = newNodes ?? nodesRef.current;
      const nextEdges = newEdges ?? edgesRef.current;
      let diagrams: Record<Mode, ModeDiagram> = {
        ...diagramsRef.current,
        [activeMode]: { nodes: nextNodes, edges: nextEdges },
      };
      if (activeMode === MODES.CONCEPTUAL) {
        diagrams = syncDerivedDiagrams(diagrams);
      }
      diagramsRef.current = diagrams;
      void saveRoom(roomId, {
        diagrams,
        mode: activeMode,
        version: ROOM_VERSION,
      });
    },
    [roomId],
  );

  const applyRoomData = useCallback(
    (data: RoomData, options: { persist?: boolean; fit?: boolean } = {}) => {
      const { persist: shouldPersist = false, fit = false } = options;
      const diagrams = syncDerivedDiagrams(data.diagrams);
      diagramsRef.current = diagrams;
      const active = diagrams[data.mode] ?? { nodes: [], edges: [] };
      const nextNodes = normalizeErNodes(active.nodes);
      const nextEdges = normalizeErEdges(active.edges);
      setMode(data.mode);
      modeRef.current = data.mode;
      setNodes(nextNodes);
      setEdges(nextEdges);
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      setTool('select');
      setEditingLabelId(null);
      editingLabelIdRef.current = null;
      if (shouldPersist) {
        void saveRoom(roomId, {
          diagrams,
          mode: data.mode,
          version: ROOM_VERSION,
        });
      }
      if (fit) setFitRequestId((n) => n + 1);
    },
    [roomId, setNodes, setEdges],
  );

  useEffect(() => {
    setRoomReady(false);
    const unsub = subscribeToRoom(roomId, {
      onRoomData: (data) => {
        applyRoomData(data);
        setRoomReady(true);
      },
    });
    return () => unsub?.();
  }, [roomId, applyRoomData]);

  const snapshotRoomData = (): RoomData => {
    let diagrams: Record<Mode, ModeDiagram> = {
      ...diagramsRef.current,
      [modeRef.current]: {
        nodes: nodesRef.current,
        edges: edgesRef.current,
      },
    };
    if (modeRef.current === MODES.CONCEPTUAL) {
      diagrams = syncDerivedDiagrams(diagrams);
    }
    diagramsRef.current = diagrams;
    return {
      diagrams,
      mode: modeRef.current,
      version: ROOM_VERSION,
    };
  };

  const handleExportJson = () => {
    const room = snapshotRoomData();
    const project = findProjectByRoomId(roomId);
    const json = serializeProjectFile(room, project?.name);
    downloadTextFile(
      suggestExportFilename(project?.name, roomId),
      json,
    );
  };

  const handleImportJson = async (file: File) => {
    const ok = window.confirm(
      'Importar este JSON substitui os diagramas conceitual, lógico e físico do projeto atual. Continuar?',
    );
    if (!ok) return;

    try {
      const text = await readFileAsText(file);
      const parsed = parseProjectFileJson(text);
      applyRoomData(parsed.room, { persist: true, fit: true });
    } catch (err) {
      const message =
        err instanceof ProjectFileError
          ? err.message
          : 'Não foi possível importar o arquivo.';
      window.alert(message);
    }
  };

  const requestFit = () => setFitRequestId((n) => n + 1);
  const triggerCanvasFlash = () => setCanvasFlashKey((n) => n + 1);
  const isLogicalReadOnly = mode === MODES.LOGICAL;

  const commitDiagram = async (
    nextNodes: ErNode[],
    nextEdges: ErEdge[] = edgesRef.current,
    options: { fit?: boolean; layout?: boolean } = {},
  ) => {
    if (modeRef.current !== MODES.CONCEPTUAL) return nextNodes;
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
      if (modeRef.current !== MODES.CONCEPTUAL) {
        // Em modos derivados: só seleção / dimensões (sem mover nem excluir).
        const allowed = changes.filter(
          (c) => c.type === 'select' || c.type === 'dimensions',
        );
        if (allowed.length === 0) return;
        setNodes((nds) => {
          const next = applyNodeChanges(allowed, nds);
          nodesRef.current = next;
          return next;
        });
        return;
      }

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
      if (modeRef.current !== MODES.CONCEPTUAL) {
        const allowed = changes.filter((c) => c.type === 'select');
        if (allowed.length === 0) return;
        setEdges((eds) => {
          const next = applyEdgeChanges(allowed, eds);
          edgesRef.current = next;
          return next;
        });
        return;
      }

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
    if (modeRef.current !== MODES.CONCEPTUAL) return;
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
    triggerCanvasFlash();
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
    if (modeRef.current !== MODES.CONCEPTUAL) return;
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
    if (modeRef.current !== MODES.CONCEPTUAL) return;
    const updated = patchNodeData(nodesRef.current, id, changes);
    void commitDiagram(updated, edgesRef.current, { fit: false, layout: false });
  };

  const updateEdge = (
    id: string,
    changes: Partial<NonNullable<ErEdge['data']>>,
  ) => {
    if (modeRef.current !== MODES.CONCEPTUAL) return;
    const updated = edgesRef.current.map((e) =>
      e.id === id ? { ...e, data: { ...e.data, ...changes } } : e,
    );
    void commitDiagram(nodesRef.current, updated, { fit: false, layout: false });
  };

  const handleCycleEdgeCardinality = (
    edgeId: string,
    side: CardinalitySide,
  ) => {
    if (modeRef.current !== MODES.CONCEPTUAL) return;
    const edge = edgesRef.current.find((e) => e.id === edgeId);
    if (!edge) return;
    const field = cardinalityFieldForSide(side);
    updateEdge(edgeId, {
      [field]: nextCardinality(edge.data?.[field]),
    });
  };

  const deleteSelected = (idOverride?: string | null) => {
    if (modeRef.current !== MODES.CONCEPTUAL) return;
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
    if (m === modeRef.current) return;

    let diagrams: Record<Mode, ModeDiagram> = {
      ...diagramsRef.current,
      [modeRef.current]: {
        nodes: nodesRef.current,
        edges: edgesRef.current,
      },
    };
    if (modeRef.current === MODES.CONCEPTUAL) {
      diagrams = syncDerivedDiagrams(diagrams);
    }
    diagramsRef.current = diagrams;

    const next = diagrams[m] ?? { nodes: [], edges: [] };
    setMode(m);
    modeRef.current = m;
    setNodes(next.nodes);
    setEdges(next.edges);
    nodesRef.current = next.nodes;
    edgesRef.current = next.edges;
    setTool('select');
    setEditingLabelId(null);
    editingLabelIdRef.current = null;

    void saveRoom(roomId, {
      diagrams,
      mode: m,
      version: ROOM_VERSION,
    });
    if (m !== MODES.PHYSICAL) requestFit();
  };

  const handleAutoLayout = () => {
    if (modeRef.current !== MODES.CONCEPTUAL) return;
    void commitDiagram(nodesRef.current, edgesRef.current).then(() => {
      triggerCanvasFlash();
    });
  };

  if (!roomReady) {
    return (
      <div className="editor-shell w-full h-screen flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
        <span className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        Carregando diagrama…
      </div>
    );
  }

  return (
    <div className="editor-shell w-full h-screen flex flex-col overflow-hidden text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <EditorHeader
        mode={mode}
        projectName={projectName}
        onBack={onBack}
        onChangeMode={handleChangeMode}
        onExportJson={handleExportJson}
        onImportJson={(file) => {
          void handleImportJson(file);
        }}
      />

      {mode === MODES.PHYSICAL ? (
        <div key="physical" className="editor-mode-in flex-1 flex flex-col min-h-0">
          <PhysicalSqlView nodes={nodes} />
        </div>
      ) : (
        <ReactFlowProvider key={mode}>
          <div className="editor-mode-in flex-1 flex relative overflow-hidden editor-canvas-bg">
            <Toolbar
              tool={tool}
              setTool={setTool}
              currentMode={mode}
              onAutoLayout={handleAutoLayout}
              derivedReadOnly={isLogicalReadOnly}
            />

            <CanvasBoard
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              tool={isLogicalReadOnly ? 'select' : tool}
              mode={mode}
              onConnect={handleConnect}
              onPaneAddNode={addNodeAt}
              editingLabelId={isLogicalReadOnly ? null : editingLabelId}
              onInlineLabelChange={handleInlineLabelChange}
              onInlineLabelEnd={handleInlineLabelEnd}
              onInlineLabelSubmit={handleInlineLabelSubmit}
              onInlineLabelTab={handleInlineLabelTab}
              onCycleEdgeCardinality={handleCycleEdgeCardinality}
              fitRequestId={fitRequestId}
              readOnly={isLogicalReadOnly}
              showMinimap={showMinimap}
            />

            <ZoomControls
              showMinimap={showMinimap}
              onToggleMinimap={() => setShowMinimap((v) => !v)}
            />

            <PropertiesPanel
              selectedIds={selectedIds}
              nodes={nodes}
              edges={edges}
              updateNode={updateNode}
              updateEdge={updateEdge}
              deleteSelected={deleteSelected}
              readOnly={isLogicalReadOnly}
            />

            {canvasFlashKey > 0 && (
              <div
                key={canvasFlashKey}
                className="editor-canvas-flash"
                aria-hidden
              />
            )}
          </div>
        </ReactFlowProvider>
      )}
    </div>
  );
};

export const EditorScreen = (props: EditorScreenProps) => (
  <EditorWorkspace {...props} />
);
