import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlowProvider, useReactFlow, useStore } from '@xyflow/react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { saveRoom, subscribeToRoom } from '../../services/rooms';
import { autoLayout } from '../../lib/autoLayout';
import { attributeOffsetX, getNodeCenter, topLeftFromCenter } from '../../lib/nodeGeometry';
import { findAttributeOwnerId as resolveAttributeOwner } from '../../lib/reactFlowAdapter';
import { generateId } from '../../lib/utils';
import {
  MODES,
  NODE_TYPES,
  type AppUser,
  type Connection,
  type DiagramNode,
  type Mode,
  type RemoteCursor,
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

const EditorWorkspace = ({ user, roomId, onBack }: EditorScreenProps) => {
  const [mode, setMode] = useState<Mode>(MODES.CONCEPTUAL);
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [showSql, setShowSql] = useState(false);
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [fitRequestId, setFitRequestId] = useState(0);

  const isDraggingNode = useRef(false);
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const modeRef = useRef(mode);
  const selectedIdsRef = useRef(selectedIds);
  const editingLabelIdRef = useRef(editingLabelId);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);
  useEffect(() => {
    editingLabelIdRef.current = editingLabelId;
  }, [editingLabelId]);

  useEffect(() => {
    const unsub = subscribeToRoom(roomId, {
      shouldIgnoreRemote: () => isDraggingNode.current,
      onRoomData: (data) => {
        setNodes(data.nodes);
        setConnections(data.connections);
        setMode(data.mode);
      },
      onCursors: (activeCursors) => {
        setCursors(activeCursors);
        setOnlineUsers(activeCursors.length);
      },
    });
    return () => unsub?.();
  }, [roomId]);

  const persist = async (
    newNodes?: DiagramNode[],
    newConns?: Connection[],
    newMode?: Mode,
  ) => {
    await saveRoom(roomId, {
      nodes: newNodes ?? nodesRef.current,
      connections: newConns ?? connectionsRef.current,
      mode: newMode ?? modeRef.current,
      coordSpace: 'topLeft',
    });
  };

  const requestFit = () => setFitRequestId((n) => n + 1);

  const commitDiagram = async (
    nextNodes: DiagramNode[],
    nextConns: Connection[] = connectionsRef.current,
    options: { fit?: boolean; layout?: boolean } = {},
  ) => {
    const { fit = true, layout = true } = options;
    const next =
      layout && nextNodes.length > 0
        ? await autoLayout(nextNodes, nextConns)
        : nextNodes;
    setNodes(next);
    setConnections(nextConns);
    nodesRef.current = next;
    connectionsRef.current = nextConns;
    if (fit) requestFit();
    void persist(next, nextConns);
    return next;
  };

  const addNodeAt = (flowPos: { x: number; y: number }) => {
    let draft: Omit<DiagramNode, 'x' | 'y'> | null = null;

    if (tool === 'entity') {
      draft = {
        id: generateId(),
        type: NODE_TYPES.ENTITY,
        label: 'Entidade',
        isWeak: false,
      };
    } else if (tool === 'relationship') {
      draft = {
        id: generateId(),
        type: NODE_TYPES.RELATIONSHIP,
        label: 'Rel',
      };
    } else if (tool === 'table') {
      draft = {
        id: generateId(),
        type: NODE_TYPES.TABLE,
        label: 'Tabela',
        columns: [{ id: generateId(), name: 'id', type: 'INT', isPk: true }],
      };
    }
    if (!draft) return;

    const topLeft = topLeftFromCenter(flowPos, draft);
    const newNode: DiagramNode = { ...draft, x: topLeft.x, y: topLeft.y };

    void commitDiagram([...nodesRef.current, newNode]);
    setTool('select');
    setSelectedIds([newNode.id]);
  };

  const findAttributeOwnerId = (attrId: string) =>
    resolveAttributeOwner(attrId, nodesRef.current, connectionsRef.current);

  const linkedAttributesOf = (ownerId: string) => {
    const nodesList = nodesRef.current;
    const conns = connectionsRef.current;
    const attrs: DiagramNode[] = [];
    for (const c of conns) {
      const other =
        c.source === ownerId ? c.target : c.target === ownerId ? c.source : null;
      if (!other) continue;
      const n = nodesList.find((x) => x.id === other);
      if (n?.type === NODE_TYPES.ATTRIBUTE) attrs.push(n);
    }
    return attrs;
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

    const ownerCenter = getNodeCenter(owner);
    const siblings = linkedAttributesOf(ownerId);
    const side: 1 | -1 =
      siblings.length > 0
        ? getNodeCenter(siblings[0]).x >= ownerCenter.x
          ? 1
          : -1
        : 1;
    const centerY =
      siblings.length === 0
        ? ownerCenter.y
        : Math.max(...siblings.map((s) => getNodeCenter(s).y)) + 32;

    const draft: Pick<DiagramNode, 'id' | 'type' | 'label' | 'attrType'> = {
      id: generateId(),
      type: NODE_TYPES.ATTRIBUTE,
      label: '',
      attrType: 'normal',
    };
    const topLeft = topLeftFromCenter(
      { x: ownerCenter.x + side * attributeOffsetX(owner), y: centerY },
      draft,
    );

    const newAttr: DiagramNode = {
      ...draft,
      x: topLeft.x,
      y: topLeft.y,
    };
    const newConn: Connection = {
      id: generateId(),
      source: ownerId,
      target: newAttr.id,
      cardinalitySource: '',
      cardinalityTarget: '',
    };

    void commitDiagram(
      [...nodesRef.current, newAttr],
      [...connectionsRef.current, newConn],
      { fit: false, layout: false },
    );
    setTool('select');
    setSelectedIds([newAttr.id]);
    editingLabelIdRef.current = newAttr.id;
    setEditingLabelId(newAttr.id);
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
      return findAttributeOwnerId(selected.id);
    }
    return null;
  };

  const finalizeLabelIfEmpty = (id: string) => {
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node || node.label.trim()) return;
    const updated = nodesRef.current.map((n) =>
      n.id === id ? { ...n, label: 'Atributo' } : n,
    );
    nodesRef.current = updated;
    setNodes(updated);
  };

  const handleInlineLabelChange = (id: string, label: string) => {
    const updated = nodesRef.current.map((n) =>
      n.id === id ? { ...n, label } : n,
    );
    nodesRef.current = updated;
    setNodes(updated);
  };

  const handleInlineLabelEnd = (id: string) => {
    if (editingLabelIdRef.current !== id) return;
    finalizeLabelIfEmpty(id);
    editingLabelIdRef.current = null;
    setEditingLabelId(null);
    void persist(nodesRef.current, connectionsRef.current);
  };

  const handleInlineLabelSubmit = (id: string) => {
    finalizeLabelIfEmpty(id);
    void persist(nodesRef.current, connectionsRef.current);
    const ownerId = findAttributeOwnerId(id);
    if (ownerId) createLinkedAttribute(ownerId);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (modeRef.current !== MODES.CONCEPTUAL) return;

      if (e.key === 'Escape' && editingLabelIdRef.current) {
        handleInlineLabelEnd(editingLabelIdRef.current);
        return;
      }

      if (e.key !== 'Enter') return;

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

      const ownerId = resolveOwnerForEnter();
      if (!ownerId) return;
      e.preventDefault();
      createLinkedAttribute(ownerId);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePersistNodes = useCallback(
    (next: DiagramNode[]) => {
      isDraggingNode.current = false;
      nodesRef.current = next;
      setNodes(next);
      void persist(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId],
  );

  const handleDraggingChange = useCallback((dragging: boolean) => {
    isDraggingNode.current = dragging;
  }, []);

  const handleConnect = useCallback((source: string, target: string) => {
    const exists = connectionsRef.current.some(
      (c) =>
        (c.source === source && c.target === target) ||
        (c.source === target && c.target === source),
    );
    if (exists) return;

    const newConn: Connection = {
      id: generateId(),
      source,
      target,
      cardinalitySource: '',
      cardinalityTarget: '',
    };
    void commitDiagram(nodesRef.current, [...connectionsRef.current, newConn], {
      fit: false,
      layout: false,
    });
    setTool('select');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateNode = (id: string, changes: Partial<DiagramNode>) => {
    const updated = nodesRef.current.map((n) =>
      n.id === id ? { ...n, ...changes } : n,
    );
    void commitDiagram(updated, connectionsRef.current, { fit: false });
  };

  const updateConnection = (id: string, changes: Partial<Connection>) => {
    const updated = connectionsRef.current.map((c) =>
      c.id === id ? { ...c, ...changes } : c,
    );
    void commitDiagram(nodesRef.current, updated, { fit: false });
  };

  const deleteSelected = (idOverride?: string | null) => {
    const idsToDelete = idOverride ? [idOverride] : selectedIdsRef.current;
    if (idsToDelete.length === 0) return;

    const newNodes = nodesRef.current.filter((n) => !idsToDelete.includes(n.id));
    const newConns = connectionsRef.current.filter(
      (c) =>
        !idsToDelete.includes(c.id) &&
        !idsToDelete.includes(c.source) &&
        !idsToDelete.includes(c.target),
    );

    setSelectedIds([]);
    void commitDiagram(newNodes, newConns);
  };

  const handleChangeMode = (m: Mode) => {
    setMode(m);
    void persist(undefined, undefined, m);
  };

  const handleAutoLayout = () => {
    void commitDiagram(nodesRef.current, connectionsRef.current);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100 overflow-hidden font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <EditorHeader
        mode={mode}
        onBack={onBack}
        onChangeMode={handleChangeMode}
        showSql={showSql}
        onToggleSql={() => setShowSql((v) => !v)}
        onlineUsers={onlineUsers}
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
          connections={connections}
          tool={tool}
          selectedIds={selectedIds}
          onSelectedIdsChange={(ids) => {
            setSelectedIds((prev) => {
              if (
                prev.length === ids.length &&
                prev.every((id, i) => id === ids[i])
              ) {
                return prev;
              }
              return ids;
            });
          }}
          onPersistNodes={handlePersistNodes}
          onDraggingChange={handleDraggingChange}
          onConnect={handleConnect}
          onPaneAddNode={addNodeAt}
          cursors={cursors}
          currentUserId={user.uid}
          roomId={roomId}
          editingLabelId={editingLabelId}
          onInlineLabelChange={handleInlineLabelChange}
          onInlineLabelEnd={handleInlineLabelEnd}
          onInlineLabelSubmit={handleInlineLabelSubmit}
          fitRequestId={fitRequestId}
        />

        {showSql && mode === MODES.PHYSICAL && (
          <SQLPanel nodes={nodes} onClose={() => setShowSql(false)} />
        )}

        <ZoomControls />

        <PropertiesPanel
          selectedIds={selectedIds}
          nodes={nodes}
          connections={connections}
          updateNode={updateNode}
          updateConnection={updateConnection}
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
