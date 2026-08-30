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
  <kbd className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-md bg-muted border border-border text-[10px] font-semibold text-muted-foreground tabular-nums">
    {children}
  </kbd>
);

const EmptyDiagramIllustration = () => (
  <svg
    viewBox="0 0 200 72"
    className="w-full max-w-[14rem] mx-auto mb-5 text-foreground"
    aria-hidden
  >
    <rect
      x="8"
      y="18"
      width="56"
      height="36"
      rx="6"
      fill="var(--card)"
      stroke="currentColor"
      strokeWidth="2.5"
      className="opacity-80"
    />
    <text
      x="36"
      y="40"
      textAnchor="middle"
      className="fill-foreground"
      style={{ fontSize: 9, fontWeight: 700, fontFamily: 'Sora, sans-serif' }}
    >
      Entidade
    </text>
    <line
      x1="64"
      y1="36"
      x2="88"
      y2="36"
      stroke="var(--primary)"
      strokeWidth="2"
      strokeDasharray="3 3"
    />
    <polygon
      points="100,12 132,36 100,60 68,36"
      fill="var(--accent)"
      stroke="var(--primary)"
      strokeWidth="2.5"
    />
    <text
      x="100"
      y="39"
      textAnchor="middle"
      className="fill-primary"
      style={{ fontSize: 8, fontWeight: 700, fontFamily: 'Sora, sans-serif' }}
    >
      Rel
    </text>
    <line
      x1="132"
      y1="36"
      x2="156"
      y2="36"
      stroke="var(--primary)"
      strokeWidth="2"
      strokeDasharray="3 3"
    />
    <rect
      x="156"
      y="18"
      width="36"
      height="36"
      rx="6"
      fill="var(--card)"
      stroke="currentColor"
      strokeWidth="2.5"
      className="opacity-80"
    />
    <circle cx="174" cy="54" r="5" fill="var(--foreground)" />
  </svg>
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
          <EmptyDiagramIllustration />
          <h3 className="text-sm font-bold text-foreground mb-2">Nada derivado ainda</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
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
        <EmptyDiagramIllustration />
        <h3 className="text-base font-bold text-foreground mb-2">Comece o diagrama</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-5">
          Escolha <span className="font-semibold text-foreground">Entidade</span> na barra e
          clique no canvas — ou use os atalhos abaixo.
        </p>
        <ul className="text-left space-y-2.5 text-xs text-muted-foreground mx-auto max-w-[16rem]">
          <li className="flex items-center gap-2.5">
            <Kbd>E</Kbd>
            <span>Ferramenta entidade</span>
          </li>
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
        </ul>
      </div>
    </div>
  );
};

const ShortcutHints = ({ raised }: { raised?: boolean }) => (
  <div
    className={`absolute right-4 z-10 hidden md:flex editor-chrome rounded-xl px-3 py-2 gap-3 items-center pointer-events-none ${
      raised ? 'bottom-28' : 'bottom-12'
    }`}
  >
    <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
      <Kbd>Enter</Kbd> atributo
    </span>
    <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
      <Kbd>Tab</Kbd> cadeia
    </span>
    <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
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
        className={`flex-1 relative h-full w-full min-w-0 ${isConnectionTool ? 'editor-connect-mode' : ''}`}
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
          connectionLineStyle={{
            stroke: 'var(--primary)',
            strokeWidth: 2.5,
            strokeDasharray: '6 4',
          }}
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
            gap={20}
            size={1.4}
            color="color-mix(in oklab, var(--primary) 28%, transparent)"
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
              className="!bg-card/90 !border !border-border/80 !rounded-xl !shadow-none"
              style={{ width: 140, height: 96 }}
            />
          ) : null}
          {isConnectionTool ? (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <span className="editor-chrome text-foreground text-xs font-semibold px-3.5 py-2 rounded-xl shadow-sm">
                Arraste do handle de um nó até outro para conectar
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
