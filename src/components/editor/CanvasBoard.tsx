import {
  useCallback,
  useEffect,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  useReactFlow,
  type Connection as RfConnection,
  type Edge,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ErEdge, ErNode, Tool } from '../../types';
import type { CardinalitySide } from '../../lib/cardinality';
import { AttributeNode } from './flow/AttributeNode';
import { CardinalityEdge } from './flow/CardinalityEdge';
import { DiagramFlowProvider } from './flow/DiagramFlowContext';
import { EntityNode, RelationshipNode, TableNode } from './flow/nodes';

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
  nodes: ErNode[];
  edges: ErEdge[];
  onNodesChange: OnNodesChange<ErNode>;
  onEdgesChange: OnEdgesChange<ErEdge>;
  tool: Tool;
  onConnect: (source: string, target: string) => void;
  onPaneAddNode: (flowPos: { x: number; y: number }) => void;
  editingLabelId?: string | null;
  onInlineLabelChange?: (id: string, label: string) => void;
  onInlineLabelEnd?: (id: string) => void;
  onInlineLabelSubmit?: (id: string) => void;
  onInlineLabelTab?: (id: string) => void;
  onCycleEdgeCardinality?: (edgeId: string, side: CardinalitySide) => void;
  fitRequestId?: number;
  /** Modos derivados: pan/zoom/seleção sem editar. */
  readOnly?: boolean;
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

export const CanvasBoard = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  tool,
  onConnect,
  onPaneAddNode,
  editingLabelId = null,
  onInlineLabelChange,
  onInlineLabelEnd,
  onInlineLabelSubmit,
  onInlineLabelTab,
  onCycleEdgeCardinality,
  fitRequestId = 0,
  readOnly = false,
}: CanvasBoardProps) => {
  const { screenToFlowPosition } = useReactFlow();

  const contextValue = useMemo(
    () => ({
      editingLabelId: readOnly ? null : editingLabelId,
      onInlineLabelChange: onInlineLabelChange ?? (() => undefined),
      onInlineLabelEnd: onInlineLabelEnd ?? (() => undefined),
      onInlineLabelSubmit: onInlineLabelSubmit ?? (() => undefined),
      onInlineLabelTab: onInlineLabelTab ?? (() => undefined),
      onCycleEdgeCardinality: readOnly
        ? () => undefined
        : (onCycleEdgeCardinality ?? (() => undefined)),
      connectable: !readOnly && tool === 'connection',
    }),
    [
      readOnly,
      editingLabelId,
      onInlineLabelChange,
      onInlineLabelEnd,
      onInlineLabelSubmit,
      onInlineLabelTab,
      onCycleEdgeCardinality,
      tool,
    ],
  );

  const handlePaneClick = useCallback(
    (e: ReactMouseEvent) => {
      if (readOnly) return;
      if (editingLabelId && onInlineLabelEnd) {
        onInlineLabelEnd(editingLabelId);
      }

      if (tool === 'entity' || tool === 'relationship' || tool === 'table') {
        const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        onPaneAddNode(pos);
      }
    },
    [
      readOnly,
      editingLabelId,
      onInlineLabelEnd,
      tool,
      screenToFlowPosition,
      onPaneAddNode,
    ],
  );

  const isDuplicate = useCallback(
    (source: string, target: string) =>
      edges.some(
        (c) =>
          (c.source === source && c.target === target) ||
          (c.source === target && c.target === source),
      ),
    [edges],
  );

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

  const isPlacementTool =
    !readOnly &&
    (tool === 'entity' || tool === 'relationship' || tool === 'table');
  const isConnectionTool = !readOnly && tool === 'connection';

  return (
    <DiagramFlowProvider value={contextValue}>
      <div
        className="flex-1 relative h-full w-full"
        id="diagram-canvas"
        onContextMenu={(e) => e.preventDefault()}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onPaneClick={handlePaneClick}
          onConnect={handleConnect}
          isValidConnection={isValidConnection}
          connectionMode={ConnectionMode.Loose}
          connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
          nodesDraggable={!readOnly && tool === 'select'}
          nodesConnectable={isConnectionTool}
          elementsSelectable={tool === 'select' || readOnly}
          panOnDrag={tool === 'select' || readOnly ? true : [1, 2]}
          panOnScroll={false}
          zoomOnScroll
          zoomOnPinch
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Shift"
          deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
          minZoom={0.1}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          className={isPlacementTool || isConnectionTool ? 'cursor-crosshair' : ''}
          defaultEdgeOptions={{ type: 'cardinality' }}
          fitView={false}
        >
          <Background
            id="grid"
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.25}
            color="#c7d2fe"
          />
          <FitController fitRequestId={fitRequestId} />
          {isConnectionTool ? (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <span className="editor-chrome text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl">
                Arraste de um nó até outro para conectar
              </span>
            </div>
          ) : null}
        </ReactFlow>
      </div>
    </DiagramFlowProvider>
  );
};
