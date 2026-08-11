import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  applyNodeChanges,
  useReactFlow,
  type Connection as RfConnection,
  type Edge,
  type NodeChange,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { updateRemoteCursor } from '../../services/rooms';
import {
  fromFlowNodes,
  pruneChildSelection,
  toFlowEdges,
  toFlowNodes,
  type DiagramFlowNode,
} from '../../lib/reactFlowAdapter';
import type { Connection, DiagramNode, RemoteCursor, Tool } from '../../types';
import { AttributeNode } from './flow/AttributeNode';
import { CardinalityEdge } from './flow/CardinalityEdge';
import { DiagramFlowProvider } from './flow/DiagramFlowContext';
import { EntityNode, RelationshipNode, TableNode } from './flow/nodes';
import { RemoteCursors } from './flow/RemoteCursors';

const nodeTypes = {
  entity: EntityNode,
  relationship: RelationshipNode,
  attribute: AttributeNode,
  table: TableNode,
};

const edgeTypes = {
  cardinality: CardinalityEdge,
};

type CanvasBoardProps = {
  nodes: DiagramNode[];
  connections: Connection[];
  tool: Tool;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onPersistNodes: (nodes: DiagramNode[]) => void;
  onDraggingChange?: (dragging: boolean) => void;
  onConnect: (source: string, target: string) => void;
  onPaneAddNode: (flowPos: { x: number; y: number }) => void;
  cursors: RemoteCursor[];
  currentUserId?: string;
  roomId: string;
  editingLabelId?: string | null;
  onInlineLabelChange?: (id: string, label: string) => void;
  onInlineLabelEnd?: (id: string) => void;
  onInlineLabelSubmit?: (id: string) => void;
  fitRequestId?: number;
};

const FitController = ({ fitRequestId }: { fitRequestId: number }) => {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (fitRequestId <= 0) return;
    const t = requestAnimationFrame(() => {
      void fitView({ padding: 0.18, duration: 200, maxZoom: 1.15, minZoom: 0.35 });
    });
    return () => cancelAnimationFrame(t);
  }, [fitRequestId, fitView]);
  return null;
};

/** Conteúdo do diagrama (sem seleção) — remonta RF quando domínio muda. */
const diagramSignature = (nodes: DiagramNode[], connections: Connection[]) => {
  const n = nodes
    .map(
      (node) =>
        `${node.id}:${node.x}:${node.y}:${node.label}:${node.type}:${node.isWeak ? 1 : 0}:${node.attrType ?? ''}:${node.columns?.length ?? 0}`,
    )
    .join('|');
  const c = connections
    .map(
      (conn) =>
        `${conn.id}:${conn.source}:${conn.target}:${conn.cardinalitySource}:${conn.cardinalityTarget}`,
    )
    .join('|');
  return `${n}#${c}`;
};

const applySelection = (
  rfNodes: DiagramFlowNode[],
  selectedIds: string[],
): DiagramFlowNode[] => {
  const selected = new Set(selectedIds);
  let changed = false;
  const next = rfNodes.map((n) => {
    const isSelected = selected.has(n.id);
    if (!!n.selected === isSelected) return n;
    changed = true;
    return { ...n, selected: isSelected };
  });
  return changed ? next : rfNodes;
};

export const CanvasBoard = ({
  nodes,
  connections,
  tool,
  selectedIds,
  onSelectedIdsChange,
  onPersistNodes,
  onDraggingChange,
  onConnect,
  onPaneAddNode,
  cursors,
  currentUserId,
  roomId,
  editingLabelId = null,
  onInlineLabelChange,
  onInlineLabelEnd,
  onInlineLabelSubmit,
  fitRequestId = 0,
}: CanvasBoardProps) => {
  const { screenToFlowPosition } = useReactFlow();
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const draggingRef = useRef(false);
  const signatureRef = useRef(diagramSignature(nodes, connections));
  const selectingFromPropsRef = useRef(false);

  nodesRef.current = nodes;
  connectionsRef.current = connections;

  const [rfNodes, setRfNodes] = useState<DiagramFlowNode[]>(() =>
    toFlowNodes(nodes, connections, selectedIds),
  );
  const [rfEdges, setRfEdges] = useState(() => toFlowEdges(connections, selectedIds));

  // Domínio → RF quando o diagrama muda (load remoto, create, layout, props)
  useEffect(() => {
    if (draggingRef.current) return;
    const nextSig = diagramSignature(nodes, connections);
    if (nextSig === signatureRef.current) return;
    signatureRef.current = nextSig;
    setRfNodes(toFlowNodes(nodes, connections, selectedIds));
    setRfEdges(toFlowEdges(connections, selectedIds));
  }, [nodes, connections, selectedIds]);

  // Seleção externa (Enter cria atributo, delete, etc.)
  useEffect(() => {
    if (draggingRef.current) return;
    selectingFromPropsRef.current = true;
    setRfNodes((prev) => applySelection(prev, selectedIds));
    setRfEdges(toFlowEdges(connectionsRef.current, selectedIds));
    queueMicrotask(() => {
      selectingFromPropsRef.current = false;
    });
  }, [selectedIds]);

  const contextValue = useMemo(
    () => ({
      editingLabelId,
      onInlineLabelChange: onInlineLabelChange ?? (() => undefined),
      onInlineLabelEnd: onInlineLabelEnd ?? (() => undefined),
      onInlineLabelSubmit: onInlineLabelSubmit ?? (() => undefined),
      connectable: tool === 'connection',
    }),
    [
      editingLabelId,
      onInlineLabelChange,
      onInlineLabelEnd,
      onInlineLabelSubmit,
      tool,
    ],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<DiagramFlowNode>[]) => {
      // `dimensions` causa loop com StoreUpdater; select vem de onSelectionChange/props
      const filtered = changes.filter(
        (c) => c.type !== 'dimensions' && c.type !== 'select',
      );
      if (filtered.length === 0) return;

      let dragStarted = false;
      let dragEnded = false;

      for (const change of filtered) {
        if (change.type !== 'position') continue;
        if (change.dragging === true) dragStarted = true;
        if (change.dragging === false) dragEnded = true;
      }

      if (dragStarted && !draggingRef.current) {
        draggingRef.current = true;
        onDraggingChange?.(true);
      }

      setRfNodes((current) => {
        const next = applyNodeChanges(filtered, current);

        if (dragEnded) {
          // parentId do RF já moveu os atributos; só converte absoluto → domínio
          const merged = fromFlowNodes(next, nodesRef.current);
          nodesRef.current = merged;
          signatureRef.current = diagramSignature(merged, connectionsRef.current);
          queueMicrotask(() => {
            onPersistNodes(merged);
            draggingRef.current = false;
            onDraggingChange?.(false);
          });
        }

        return next;
      });
    },
    [onDraggingChange, onPersistNodes],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      if (tool === 'connection') return;
      if (draggingRef.current) return;
      if (selectingFromPropsRef.current) return;

      const nodeIds = pruneChildSelection(
        selNodes.map((n) => n.id),
        rfNodes,
      );
      const ids = [...nodeIds, ...selEdges.map((e) => e.id)];
      onSelectedIdsChange(ids);
    },
    [onSelectedIdsChange, tool, rfNodes],
  );

  const handlePaneClick = useCallback(
    (e: ReactMouseEvent) => {
      if (editingLabelId && onInlineLabelEnd) {
        onInlineLabelEnd(editingLabelId);
      }

      if (tool === 'entity' || tool === 'relationship' || tool === 'table') {
        const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        onPaneAddNode(pos);
      }
    },
    [editingLabelId, onInlineLabelEnd, tool, screenToFlowPosition, onPaneAddNode],
  );

  const handleEdgeClick = useCallback(
    (_e: ReactMouseEvent, edge: Edge) => {
      if (tool === 'connection') return;
      onSelectedIdsChange([edge.id]);
    },
    [onSelectedIdsChange, tool],
  );

  const isDuplicate = useCallback((source: string, target: string) => {
    return connectionsRef.current.some(
      (c) =>
        (c.source === source && c.target === target) ||
        (c.source === target && c.target === source),
    );
  }, []);

  const handleConnect = useCallback(
    (connection: RfConnection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;
      if (isDuplicate(connection.source, connection.target)) return;
      onConnect(connection.source, connection.target);
    },
    [isDuplicate, onConnect],
  );

  const isValidConnection = useCallback(
    (connection: RfConnection | Edge) => {
      const source = connection.source;
      const target = connection.target;
      if (!source || !target || source === target) return false;
      return !isDuplicate(source, target);
    },
    [isDuplicate],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      updateRemoteCursor(roomId, currentUserId ?? '', pos.x, pos.y);
    },
    [screenToFlowPosition, roomId, currentUserId],
  );

  const isPlacementTool =
    tool === 'entity' || tool === 'relationship' || tool === 'table';
  const isConnectionTool = tool === 'connection';

  return (
    <DiagramFlowProvider value={contextValue}>
      <div
        className="flex-1 relative h-full w-full"
        id="diagram-canvas"
        onPointerMove={handlePointerMove}
        onContextMenu={(e) => e.preventDefault()}
      >
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onSelectionChange={handleSelectionChange}
          onPaneClick={handlePaneClick}
          onEdgeClick={handleEdgeClick}
          onConnect={handleConnect}
          isValidConnection={isValidConnection}
          connectionMode={ConnectionMode.Loose}
          connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
          nodesDraggable={tool === 'select'}
          nodesConnectable={isConnectionTool}
          elementsSelectable={tool === 'select'}
          panOnDrag={tool === 'select' ? true : [1, 2]}
          panOnScroll={false}
          zoomOnScroll
          zoomOnPinch
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Shift"
          minZoom={0.1}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          className={isPlacementTool || isConnectionTool ? 'cursor-crosshair' : ''}
          defaultEdgeOptions={{ type: 'cardinality' }}
          fitView={false}
          deleteKeyCode={null}
        >
          <Background
            id="grid"
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#94a3b8"
          />
          <FitController fitRequestId={fitRequestId} />
          {isConnectionTool ? (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <span className="bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow">
                Arraste de um nó até outro para conectar
              </span>
            </div>
          ) : null}
        </ReactFlow>
        <RemoteCursors cursors={cursors} currentUserId={currentUserId} />
      </div>
    </DiagramFlowProvider>
  );
};
