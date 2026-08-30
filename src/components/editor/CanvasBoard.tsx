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
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection as RfConnection,
  type Edge,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MODES, type ErEdge, type ErNode, type Mode, type Tool } from '../../types';
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
  mode: Mode;
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
  showMinimap?: boolean;
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

const Kbd = ({ children }: { children: string }) => (
  <kbd className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/90 text-[10px] font-semibold text-slate-600 tabular-nums">
    {children}
  </kbd>
);

const CanvasEmptyState = ({
  readOnly,
  mode,
}: {
  readOnly: boolean;
  mode: Mode;
}) => {
  if (readOnly || mode === MODES.LOGICAL) {
    return (
      <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none p-6">
        <div className="editor-chrome editor-panel-in max-w-sm text-center px-6 py-8 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Nada derivado ainda</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Modele entidades e relacionamentos no modo conceitual — o lógico aparece aqui
            automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none p-6">
      <div className="editor-chrome editor-panel-in max-w-md text-center px-6 py-8 rounded-2xl">
        <h3 className="text-base font-bold text-slate-800 mb-2">Comece o diagrama</h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-5">
          Escolha <span className="font-semibold text-slate-700">Entidade</span> na barra e
          clique no canvas — ou use os atalhos abaixo.
        </p>
        <ul className="text-left space-y-2.5 text-xs text-slate-600 mx-auto max-w-[16rem]">
          <li className="flex items-center gap-2.5">
            <Kbd>Enter</Kbd>
            <span>Atributo sob o selecionado</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Kbd>Tab</Kbd>
            <span>Cadeia entidade ↔ relacionamento</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Kbd>Del</Kbd>
            <span>Excluir seleção</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Kbd>Shift</Kbd>
            <span>Multi-seleção</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

const ShortcutHints = ({ raised }: { raised?: boolean }) => (
  <div
    className={`absolute right-4 z-10 hidden md:flex editor-chrome rounded-xl px-3 py-2 gap-3 items-center pointer-events-none ${
      raised ? 'bottom-28' : 'bottom-4'
    }`}
  >
    <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
      <Kbd>Enter</Kbd> atributo
    </span>
    <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
      <Kbd>Tab</Kbd> cadeia
    </span>
    <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
      <Kbd>Del</Kbd>
    </span>
  </div>
);

export const CanvasBoard = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  tool,
  mode,
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
  showMinimap = false,
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
  const isEmpty = nodes.length === 0;
  const showConceptualHints = !readOnly && mode === MODES.CONCEPTUAL && !isEmpty;

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
          {showMinimap && !isEmpty ? (
            <MiniMap
              pannable
              zoomable
              nodeStrokeWidth={2}
              nodeColor={(n) => {
                if (n.type === 'relationship') return '#f43f5e';
                if (n.type === 'attribute') return '#6366f1';
                if (n.type === 'table') return '#0f172a';
                return '#4f46e5';
              }}
              maskColor="rgba(15, 23, 42, 0.08)"
              className="!bg-white/90 !border !border-slate-200/80 !rounded-xl !shadow-none"
              style={{ width: 140, height: 96 }}
            />
          ) : null}
          {isConnectionTool ? (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <span className="editor-chrome text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl">
                Arraste de um nó até outro para conectar
              </span>
            </div>
          ) : null}
        </ReactFlow>

        {isEmpty ? <CanvasEmptyState readOnly={readOnly} mode={mode} /> : null}
        {showConceptualHints ? (
          <ShortcutHints raised={showMinimap && !isEmpty} />
        ) : null}
      </div>
    </DiagramFlowProvider>
  );
};
