import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { HEADER_HEIGHT } from '../../config/constants';
import { saveRoom, subscribeToRoom, updateRemoteCursor } from '../../services/rooms';
import { autoLayout } from '../../lib/autoLayout';
import { computeFitView } from '../../lib/viewport';
import { generateId } from '../../lib/utils';
import {
  MODES,
  NODE_TYPES,
  type AppUser,
  type Connection,
  type DiagramNode,
  type Mode,
  type Point,
  type RemoteCursor,
  type SelectionBox,
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

export const EditorScreen = ({ user, roomId, onBack }: EditorScreenProps) => {
  const [mode, setMode] = useState<Mode>(MODES.CONCEPTUAL);
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [showSql, setShowSql] = useState(false);
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const tempConnectionStart = useRef<string | null>(null);
  const isDraggingCanvas = useRef(false);
  const isDraggingNode = useRef(false);
  const isSelecting = useRef(false);
  const didCanvasPan = useRef(false);
  const selectionBoxStart = useRef<Point | null>(null);
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const canvasDragStart = useRef<Point>({ x: 0, y: 0 });
  const initialNodePositions = useRef<Record<string, Point>>({});
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const modeRef = useRef(mode);

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

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      const delta = -e.deltaY * 0.001;
      setZoom((z) => Math.min(3, Math.max(0.1, z + delta)));
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const persist = async (
    newNodes?: DiagramNode[],
    newConns?: Connection[],
    newMode?: Mode,
  ) => {
    await saveRoom(roomId, {
      nodes: newNodes ?? nodesRef.current,
      connections: newConns ?? connectionsRef.current,
      mode: newMode ?? modeRef.current,
    });
  };

  const fitNodesInView = (laidOut: DiagramNode[]) => {
    if (laidOut.length === 0) return;
    const canvas = document.getElementById('diagram-canvas');
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const fitted = computeFitView(laidOut, {
      width: rect.width,
      height: rect.height,
    });
    if (fitted) {
      setPan(fitted.pan);
      setZoom(fitted.zoom);
    }
  };

  /** Aplica auto layout, atualiza estado e persiste. */
  const commitDiagram = (
    nextNodes: DiagramNode[],
    nextConns: Connection[] = connectionsRef.current,
    options: { fit?: boolean } = {},
  ) => {
    const { fit = true } = options;
    const laidOut =
      nextNodes.length > 0 ? autoLayout(nextNodes, nextConns) : nextNodes;
    setNodes(laidOut);
    setConnections(nextConns);
    nodesRef.current = laidOut;
    connectionsRef.current = nextConns;
    if (fit) fitNodesInView(laidOut);
    void persist(laidOut, nextConns);
    return laidOut;
  };

  const getMousePos = (e: MouseEvent) => {
    const x = (e.clientX - pan.x) / zoom;
    const y = (e.clientY - HEADER_HEIGHT - pan.y) / zoom;
    return { x, y, rawX: e.clientX, rawY: e.clientY - HEADER_HEIGHT };
  };

  const addNode = (pos: Point) => {
    let newNode: DiagramNode | null = null;
    if (tool === 'entity') {
      newNode = {
        id: generateId(),
        x: pos.x,
        y: pos.y,
        type: NODE_TYPES.ENTITY,
        label: 'Entidade',
        isWeak: false,
      };
    } else if (tool === 'relationship') {
      newNode = {
        id: generateId(),
        x: pos.x,
        y: pos.y,
        type: NODE_TYPES.RELATIONSHIP,
        label: 'Rel',
        width: 80,
        height: 80,
      };
    } else if (tool === 'attribute') {
      newNode = {
        id: generateId(),
        x: pos.x,
        y: pos.y,
        type: NODE_TYPES.ATTRIBUTE,
        label: 'Atributo',
        attrType: 'normal',
      };
    } else if (tool === 'table') {
      newNode = {
        id: generateId(),
        x: pos.x,
        y: pos.y,
        type: NODE_TYPES.TABLE,
        label: 'Tabela',
        columns: [{ id: generateId(), name: 'id', type: 'INT', isPk: true }],
      };
    }
    if (!newNode) return;

    commitDiagram([...nodes, newNode]);
    setTool('select');
    setSelectedIds([newNode.id]);
  };

  const handleCanvasMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;

    const pos = getMousePos(e);
    const target = e.target as HTMLElement;
    const isEmptyCanvas =
      target.id === 'grid-bg' || target.tagName === 'svg' || target.tagName === 'DIV';

    if (!isEmptyCanvas) return;

    if (tool === 'select') {
      if (e.shiftKey) {
        isSelecting.current = true;
        selectionBoxStart.current = { x: pos.x, y: pos.y };
        setSelectionBox({
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
        });
      } else {
        isDraggingCanvas.current = true;
        didCanvasPan.current = false;
        canvasDragStart.current = { x: e.clientX, y: e.clientY };
        dragStart.current = { ...pan };
      }
    } else {
      addNode(pos);
    }
  };

  const handleNodeMouseDown = (e: MouseEvent, id: string, isConnection = false) => {
    e.stopPropagation();

    if (tool === 'connection') {
      if (!tempConnectionStart.current) {
        tempConnectionStart.current = id;
      } else {
        if (tempConnectionStart.current !== id) {
          const newConn: Connection = {
            id: generateId(),
            source: tempConnectionStart.current,
            target: id,
            cardinalitySource: '',
            cardinalityTarget: '',
          };
          commitDiagram(nodes, [...connections, newConn]);
        }
        tempConnectionStart.current = null;
        setTool('select');
      }
      return;
    }

    let newSelection = [...selectedIds];
    if (e.shiftKey) {
      if (newSelection.includes(id)) newSelection = newSelection.filter((item) => item !== id);
      else newSelection.push(id);
    } else if (!newSelection.includes(id)) {
      newSelection = [id];
    }
    setSelectedIds(newSelection);

    if (!isConnection) {
      isDraggingNode.current = true;
      const positions: Record<string, Point> = {};
      nodes.forEach((n) => {
        if (newSelection.includes(n.id)) positions[n.id] = { x: n.x, y: n.y };
      });
      initialNodePositions.current = positions;
      dragStart.current = getMousePos(e);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    const pos = getMousePos(e);
    updateRemoteCursor(roomId, user.uid, pos.x, pos.y);

    if (isDraggingCanvas.current) {
      const dx = e.clientX - canvasDragStart.current.x;
      const dy = e.clientY - canvasDragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didCanvasPan.current = true;
      setPan({ x: dragStart.current.x + dx, y: dragStart.current.y + dy });
      return;
    }

    if (isSelecting.current && selectionBoxStart.current) {
      setSelectionBox({
        startX: Math.min(selectionBoxStart.current.x, pos.x),
        startY: Math.min(selectionBoxStart.current.y, pos.y),
        currentX: Math.max(selectionBoxStart.current.x, pos.x),
        currentY: Math.max(selectionBoxStart.current.y, pos.y),
      });
      return;
    }

    if (isDraggingNode.current && selectedIds.length > 0) {
      const dx = pos.x - dragStart.current.x;
      const dy = pos.y - dragStart.current.y;
      setNodes(
        nodes.map((n) => {
          if (selectedIds.includes(n.id) && initialNodePositions.current[n.id]) {
            return {
              ...n,
              x: initialNodePositions.current[n.id].x + dx,
              y: initialNodePositions.current[n.id].y + dy,
            };
          }
          return n;
        }),
      );
    }
  };

  const handleMouseUp = () => {
    if (isDraggingNode.current) {
      void persist(nodes);
    }

    if (isDraggingCanvas.current && !didCanvasPan.current) {
      setSelectedIds([]);
    }

    isDraggingCanvas.current = false;
    isDraggingNode.current = false;
    didCanvasPan.current = false;

    if (isSelecting.current) {
      isSelecting.current = false;
      const box = selectionBox;
      if (box) {
        const inside = nodes
          .filter(
            (n) =>
              n.x >= box.startX &&
              n.x <= box.currentX &&
              n.y >= box.startY &&
              n.y <= box.currentY,
          )
          .map((n) => n.id);

        setSelectedIds((prev) => [...new Set([...prev, ...inside])]);
      }
      setSelectionBox(null);
    }
  };

  const updateNode = (id: string, changes: Partial<DiagramNode>) => {
    const updated = nodes.map((n) => (n.id === id ? { ...n, ...changes } : n));
    commitDiagram(updated, connections, { fit: false });
  };

  const updateConnection = (id: string, changes: Partial<Connection>) => {
    const updated = connections.map((c) => (c.id === id ? { ...c, ...changes } : c));
    commitDiagram(nodes, updated, { fit: false });
  };

  const deleteSelected = (idOverride?: string | null) => {
    const idsToDelete = idOverride ? [idOverride] : selectedIds;
    if (idsToDelete.length === 0) return;

    const newNodes = nodes.filter((n) => !idsToDelete.includes(n.id));
    const newConns = connections.filter(
      (c) =>
        !idsToDelete.includes(c.id) &&
        !idsToDelete.includes(c.source) &&
        !idsToDelete.includes(c.target),
    );

    setSelectedIds([]);
    commitDiagram(newNodes, newConns);
  };

  const handleChangeMode = (m: Mode) => {
    setMode(m);
    void persist(undefined, undefined, m);
  };

  const handleAutoLayout = () => {
    commitDiagram(nodes, connections);
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
          pan={pan}
          zoom={zoom}
          handleCanvasMouseDown={handleCanvasMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
          handleNodeMouseDown={handleNodeMouseDown}
          tempConnectionStart={tempConnectionStart.current}
          dragStart={dragStart.current}
          cursors={cursors}
          currentUserId={user.uid}
          selectionBox={selectionBox}
        />

        {showSql && mode === MODES.PHYSICAL && (
          <SQLPanel nodes={nodes} onClose={() => setShowSql(false)} />
        )}

        <div className="absolute bottom-6 left-6 flex gap-2 z-10">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-1 flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-xs font-bold w-12 text-center text-slate-600 tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ZoomIn size={18} />
            </button>
          </div>
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoom(1);
            }}
            className="bg-white rounded-xl shadow-lg border border-slate-100 p-2 hover:bg-slate-50 text-slate-600 transition-colors text-xs font-medium"
          >
            Resetar
          </button>
        </div>

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
