import type { NodeProps } from '@xyflow/react';
import type { ErNodeData } from '../../../types';
import { useDiagramFlow } from './DiagramFlowContext';
import { NodeHandles } from './NodeHandles';

/** Atributo na notação Heuser: círculo + rótulo à direita. */
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
          className="absolute top-1/2 left-full ml-1.5 -translate-y-1/2 h-7 px-1.5 text-xs font-medium text-slate-800 bg-white border border-indigo-400 rounded shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 z-20 text-left"
          style={{ width: editWidth }}
        />
      ) : (
        <span
          className={`absolute top-1/2 left-full ml-1.5 -translate-y-1/2 text-xs select-none pointer-events-none whitespace-nowrap z-10 text-left ${
            isKey ? 'font-bold text-slate-900 underline' : 'text-slate-800'
          }`}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
};
