import type { NodeProps } from '@xyflow/react';
import { useStore } from '@xyflow/react';
import { NODE_TYPES, type ErNodeData } from '../../../types';
import { useDiagramFlow } from './DiagramFlowContext';
import { NodeHandles } from './NodeHandles';

export const AttributeNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: ErNodeData }) => {
  const {
    editingLabelId,
    onInlineLabelChange,
    onInlineLabelEnd,
    onInlineLabelSubmit,
    connectable,
  } = useDiagramFlow();

  const labelOnLeft = useStore((s) => {
    const me = s.nodeLookup.get(id);
    if (!me) return false;
    const edge = s.edges.find((e) => e.source === id || e.target === id);
    if (!edge) return false;
    const ownerId = edge.source === id ? edge.target : edge.source;
    const owner = s.nodeLookup.get(ownerId);
    if (
      !owner ||
      (owner.type !== NODE_TYPES.ENTITY &&
        owner.type !== NODE_TYPES.RELATIONSHIP)
    ) {
      return false;
    }
    const mx = me.internals.positionAbsolute.x + (me.measured?.width ?? 20) / 2;
    const ox =
      owner.internals.positionAbsolute.x + (owner.measured?.width ?? 120) / 2;
    return mx < ox;
  });

  const isEditing = editingLabelId === id;
  const isKey = data.attrType === 'key';
  const isDerived = data.attrType === 'derived';
  const isMulti = data.attrType === 'multivalued';
  const displayLabel = data.label || 'Atributo';
  const labelWidth = Math.max(48, displayLabel.length * 7 + 8);
  const editWidth = Math.max(96, labelWidth + 24);

  const circleBorder = selected ? 'border-indigo-500' : 'border-slate-800';
  const circleFill = isKey
    ? selected
      ? 'bg-indigo-500'
      : 'bg-slate-800'
    : selected
      ? 'bg-indigo-50'
      : 'bg-white';

  return (
    <div
      className={`relative w-5 h-5 ${connectable ? 'cursor-crosshair' : ''}`}
      style={{ overflow: 'visible' }}
    >
      <NodeHandles />
      <div
        className={`absolute inset-0 rounded-full border-2 ${circleBorder} ${circleFill} ${
          isDerived ? 'border-dashed' : ''
        }`}
      />
      {isMulti && (
        <div
          className={`absolute inset-[3.5px] rounded-full border-[1.5px] pointer-events-none ${
            selected ? 'border-indigo-500' : 'border-slate-800'
          } ${isDerived ? 'border-dashed' : ''}`}
        />
      )}

      {isEditing ? (
        <input
          data-inline-label-edit=""
          autoFocus
          value={data.label}
          placeholder="Atributo"
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onInlineLabelChange(id, e.target.value)}
          onBlur={() => onInlineLabelEnd(id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              onInlineLabelSubmit(id);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              onInlineLabelEnd(id);
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`absolute top-1/2 -translate-y-1/2 h-7 px-1.5 text-xs font-medium text-slate-800 bg-white border border-indigo-400 rounded shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 z-20 ${
            labelOnLeft ? 'right-full mr-1 text-right' : 'left-full ml-1 text-left'
          }`}
          style={{ width: editWidth }}
        />
      ) : (
        <span
          className={`absolute top-1/2 -translate-y-1/2 text-xs select-none pointer-events-none whitespace-nowrap z-10 ${
            isKey ? 'font-bold text-slate-900' : 'text-slate-800'
          } ${labelOnLeft ? 'right-full mr-1.5 text-right' : 'left-full ml-1.5 text-left'}`}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
};
