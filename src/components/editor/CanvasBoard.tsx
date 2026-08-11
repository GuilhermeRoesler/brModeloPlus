import type { MouseEvent } from 'react';
import { MousePointer2 } from 'lucide-react';
import { THEME } from '../../config/constants';
import {
  NODE_TYPES,
  type Connection,
  type DiagramNode,
  type Point,
  type RemoteCursor,
  type SelectionBox,
  type Tool,
} from '../../types';

type CanvasBoardProps = {
  nodes: DiagramNode[];
  connections: Connection[];
  tool: Tool;
  selectedIds: string[];
  pan: Point;
  zoom: number;
  handleCanvasMouseDown: (e: MouseEvent) => void;
  handleMouseMove: (e: MouseEvent) => void;
  handleMouseUp: (e: MouseEvent) => void;
  handleNodeMouseDown: (e: MouseEvent, id: string, isConnection?: boolean) => void;
  tempConnectionStart: string | null;
  dragStart: Point;
  cursors: RemoteCursor[];
  currentUserId?: string;
  selectionBox: SelectionBox | null;
  editingLabelId?: string | null;
  onInlineLabelChange?: (id: string, label: string) => void;
  onInlineLabelEnd?: (id: string) => void;
  onInlineLabelSubmit?: (id: string) => void;
};

type InlineEditHandlers = {
  isEditing: boolean;
  onChange: (label: string) => void;
  onEnd: () => void;
  onSubmit: () => void;
};

const STRUCTURAL_TYPES = new Set<string>([
  NODE_TYPES.ENTITY,
  NODE_TYPES.RELATIONSHIP,
  NODE_TYPES.TABLE,
]);

const renderNode = (
  node: DiagramNode,
  isSelected: boolean,
  editing?: InlineEditHandlers,
  labelOnLeft = false,
) => {
  const strokeClass = isSelected ? THEME.selection : 'stroke-slate-800 stroke-2';
  const fillClass = isSelected ? THEME.selectionFill : 'fill-white';
  const filter = isSelected ? 'url(#glow)' : 'drop-shadow(0px 2px 3px rgba(0,0,0,0.1))';

  switch (node.type) {
    case NODE_TYPES.ENTITY:
      return (
        <g transform={`translate(${node.x - 60}, ${node.y - 30})`}>
          {node.isWeak && (
            <rect
              x="-4"
              y="-4"
              width="128"
              height="68"
              rx="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-slate-800"
            />
          )}
          <rect
            width="120"
            height="60"
            rx="4"
            className={`${fillClass} ${strokeClass} transition-colors`}
            style={{ filter }}
          />
          <foreignObject x="0" y="0" width="120" height="60">
            <div className="w-full h-full flex items-center justify-center text-center p-1">
              <span className="text-sm font-semibold text-slate-800 leading-tight select-none">
                {node.label}
              </span>
            </div>
          </foreignObject>
        </g>
      );
    case NODE_TYPES.RELATIONSHIP:
      return (
        <g transform={`translate(${node.x}, ${node.y})`}>
          <path
            d="M 0 -40 L 50 0 L 0 40 L -50 0 Z"
            className={`${fillClass} ${strokeClass} transition-colors`}
            style={{ filter }}
          />
          {node.isWeak && (
            <path
              d="M 0 -34 L 42 0 L 0 34 L -42 0 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-slate-800"
            />
          )}
          <foreignObject x="-40" y="-20" width="80" height="40">
            <div className="w-full h-full flex items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-800 select-none">{node.label}</span>
            </div>
          </foreignObject>
        </g>
      );
    case NODE_TYPES.ATTRIBUTE: {
      const r = 10;
      const isKey = node.attrType === 'key';
      const isDerived = node.attrType === 'derived';
      const isMulti = node.attrType === 'multivalued';
      const circleFill = isKey
        ? isSelected
          ? 'fill-indigo-500'
          : 'fill-slate-800'
        : fillClass;
      const displayLabel = node.label || 'Atributo';
      const labelWidth = Math.max(48, displayLabel.length * 7 + 8);
      const editWidth = Math.max(96, labelWidth + 24);
      const textW = editing?.isEditing ? editWidth : labelWidth;
      const hitX = labelOnLeft ? -r - 4 - textW : -r - 4;

      return (
        <g transform={`translate(${node.x}, ${node.y})`}>
          <rect
            x={hitX}
            y={-r - 6}
            width={r + 8 + textW}
            height={r * 2 + 12}
            fill="transparent"
          />
          <circle
            cx="0"
            cy="0"
            r={r}
            className={`${circleFill} ${strokeClass} transition-colors`}
            style={{ filter }}
            strokeDasharray={isDerived ? '3 2' : undefined}
          />
          {isMulti && (
            <circle
              cx="0"
              cy="0"
              r={r - 3.5}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={isSelected ? 'text-indigo-500' : 'text-slate-800'}
              strokeDasharray={isDerived ? '3 2' : undefined}
            />
          )}
          {editing?.isEditing ? (
            <foreignObject
              x={labelOnLeft ? -r - 4 - editWidth : r + 4}
              y={-14}
              width={editWidth}
              height={28}
            >
              <input
                data-inline-label-edit=""
                autoFocus
                value={node.label}
                placeholder="Atributo"
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => editing.onChange(e.target.value)}
                onBlur={() => editing.onEnd()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    editing.onSubmit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    editing.onEnd();
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-full h-7 px-1.5 text-xs font-medium text-slate-800 bg-white border border-indigo-400 rounded shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 ${
                  labelOnLeft ? 'text-right' : 'text-left'
                }`}
              />
            </foreignObject>
          ) : (
            <text
              x={labelOnLeft ? -r - 6 : r + 6}
              y="0"
              dy="0.35em"
              textAnchor={labelOnLeft ? 'end' : 'start'}
              className={`text-xs select-none pointer-events-none ${
                isKey ? 'font-bold fill-slate-900' : 'fill-slate-800'
              }`}
            >
              {displayLabel}
            </text>
          )}
        </g>
      );
    }
    case NODE_TYPES.TABLE: {
      const rowH = 24;
      const headH = 32;
      const w = 160;
      const h = headH + (node.columns?.length || 0) * rowH + 10;
      return (
        <g transform={`translate(${node.x - w / 2}, ${node.y - headH / 2})`}>
          <rect width={w} height={h} rx="4" className={`${fillClass} ${strokeClass}`} style={{ filter }} />
          <rect width={w} height={headH} rx="4" className="fill-slate-100 stroke-none" />
          <line x1="0" y1={headH} x2={w} y2={headH} stroke="currentColor" className="text-slate-300" />
          <foreignObject x="0" y="0" width={w} height={headH}>
            <div className="w-full h-full flex items-center justify-center px-2">
              <span className="font-bold text-sm text-slate-800 truncate">{node.label}</span>
            </div>
          </foreignObject>
          <foreignObject x="0" y={headH} width={w} height={h - headH}>
            <div className="flex flex-col pt-1 px-2">
              {node.columns?.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between h-[24px] text-[10px] text-slate-700 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center gap-1 overflow-hidden">
                    {col.isPk && <span className="text-[9px] font-bold text-amber-600">PK</span>}
                    {col.isFk && <span className="text-[9px] font-bold text-blue-600">FK</span>}
                    <span className={`truncate ${col.isPk ? 'font-bold' : ''}`}>{col.name}</span>
                  </div>
                  <span className="text-slate-400 text-[9px] ml-1 shrink-0">{col.type}</span>
                </div>
              ))}
            </div>
          </foreignObject>
        </g>
      );
    }
    default:
      return null;
  }
};

export const CanvasBoard = ({
  nodes,
  connections,
  tool,
  selectedIds,
  pan,
  zoom,
  handleCanvasMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleNodeMouseDown,
  tempConnectionStart,
  dragStart,
  cursors,
  currentUserId,
  selectionBox,
  editingLabelId = null,
  onInlineLabelChange,
  onInlineLabelEnd,
  onInlineLabelSubmit,
}: CanvasBoardProps) => {
  const tempSource = tempConnectionStart
    ? nodes.find((n) => n.id === tempConnectionStart)
    : null;

  return (
    <div
      className="flex-1 bg-slate-50 relative cursor-default overflow-hidden h-full w-full"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor: tool === 'select' ? 'grab' : 'crosshair' }}
      id="diagram-canvas"
    >
      <div
        id="grid-bg"
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      <svg className="w-full h-full pointer-events-none">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {connections.map((conn) => {
            const s = nodes.find((n) => n.id === conn.source);
            const t = nodes.find((n) => n.id === conn.target);
            if (!s || !t) return null;
            const isSelected = selectedIds.includes(conn.id);
            return (
              <g key={conn.id} className="pointer-events-auto cursor-pointer group">
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={isSelected ? '#6366f1' : '#cbd5e1'}
                  strokeWidth="2"
                  className="transition-colors"
                />
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke="transparent"
                  strokeWidth="15"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeMouseDown(e, conn.id, true);
                  }}
                />
                {(conn.cardinalitySource || conn.cardinalityTarget) && (
                  <>
                    <text
                      x={s.x + (t.x - s.x) * 0.25}
                      y={s.y + (t.y - s.y) * 0.25}
                      className="text-[10px] fill-slate-500 font-bold"
                      textAnchor="middle"
                      dy="-5"
                      stroke="white"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      {conn.cardinalitySource}
                    </text>
                    <text
                      x={s.x + (t.x - s.x) * 0.25}
                      y={s.y + (t.y - s.y) * 0.25}
                      className="text-[10px] fill-slate-500 font-bold"
                      textAnchor="middle"
                      dy="-5"
                    >
                      {conn.cardinalitySource}
                    </text>
                    <text
                      x={s.x + (t.x - s.x) * 0.75}
                      y={s.y + (t.y - s.y) * 0.75}
                      className="text-[10px] fill-slate-500 font-bold"
                      textAnchor="middle"
                      dy="-5"
                      stroke="white"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      {conn.cardinalityTarget}
                    </text>
                    <text
                      x={s.x + (t.x - s.x) * 0.75}
                      y={s.y + (t.y - s.y) * 0.75}
                      className="text-[10px] fill-slate-500 font-bold"
                      textAnchor="middle"
                      dy="-5"
                    >
                      {conn.cardinalityTarget}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {tool === 'connection' && tempSource && (
            <line
              x1={tempSource.x}
              y1={tempSource.y}
              x2={dragStart.x}
              y2={dragStart.y}
              stroke="#cbd5e1"
              strokeDasharray="5,5"
              strokeWidth="2"
            />
          )}

          {nodes.map((node) => {
            const isEditing = editingLabelId === node.id;
            let labelOnLeft = false;
            if (node.type === NODE_TYPES.ATTRIBUTE) {
              const owner = connections
                .map((c) => {
                  const other =
                    c.source === node.id
                      ? c.target
                      : c.target === node.id
                        ? c.source
                        : null;
                  return other ? nodes.find((n) => n.id === other) : undefined;
                })
                .find((n) => n && STRUCTURAL_TYPES.has(n.type));
              if (owner) labelOnLeft = node.x < owner.x;
            }
            return (
              <g
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                className={`pointer-events-auto ${isEditing ? 'cursor-text' : 'cursor-move'}`}
              >
                {renderNode(
                  node,
                  selectedIds.includes(node.id),
                  isEditing && onInlineLabelChange && onInlineLabelEnd && onInlineLabelSubmit
                    ? {
                        isEditing: true,
                        onChange: (label) => onInlineLabelChange(node.id, label),
                        onEnd: () => onInlineLabelEnd(node.id),
                        onSubmit: () => onInlineLabelSubmit(node.id),
                      }
                    : undefined,
                  labelOnLeft,
                )}
              </g>
            );
          })}

          {cursors.map(
            (cursor) =>
              cursor.userId !== currentUserId && (
                <g key={cursor.userId} transform={`translate(${cursor.x}, ${cursor.y})`}>
                  <MousePointer2 className="w-4 h-4" fill={cursor.color} color="white" />
                  <text
                    x="12"
                    y="10"
                    className="text-[10px] font-bold fill-white px-1"
                    stroke={cursor.color}
                    strokeWidth="2"
                    paintOrder="stroke"
                  >
                    {cursor.userId.substring(0, 4)}
                  </text>
                </g>
              ),
          )}

          {selectionBox && (
            <rect
              x={selectionBox.startX}
              y={selectionBox.startY}
              width={selectionBox.currentX - selectionBox.startX}
              height={selectionBox.currentY - selectionBox.startY}
              fill="rgba(99, 102, 241, 0.1)"
              stroke="#6366f1"
              strokeDasharray="4"
              strokeWidth={1 / zoom}
              className="pointer-events-none"
            />
          )}
        </g>
      </svg>
    </div>
  );
};
