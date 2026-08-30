import type { NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
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
    onInlineLabelTab,
    connectable,
  } = useDiagramFlow();

  const isEditing = editingLabelId === id;
  const isKey = data.attrType === 'key';
  const isDerived = data.attrType === 'derived';
  const isMulti = data.attrType === 'multivalued';
  const displayLabel = data.label || 'Atributo';
  const labelWidth = Math.max(48, displayLabel.length * 7 + 8);
  const editWidth = Math.max(96, labelWidth + 24);

  const circleBorder = selected ? 'border-primary' : 'border-foreground/80';
  const circleFill = isKey
    ? selected
      ? 'bg-primary'
      : 'bg-foreground/80'
    : selected
      ? 'bg-accent'
      : 'bg-card';

  return (
    <div
      className={cn('relative w-5 h-5', connectable && 'cursor-crosshair')}
      style={{ overflow: 'visible' }}
    >
      <NodeHandles />
      <div
        className={cn(
          'absolute inset-0 rounded-full border-2',
          circleBorder,
          circleFill,
          isDerived && 'border-dashed',
        )}
      />
      {isMulti && (
        <div
          className={cn(
            'absolute inset-[3.5px] rounded-full border-[1.5px] pointer-events-none',
            selected ? 'border-primary' : 'border-foreground/80',
            isDerived && 'border-dashed',
          )}
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
            } else if (e.key === 'Tab') {
              e.preventDefault();
              e.stopPropagation();
              onInlineLabelTab(id);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              onInlineLabelEnd(id);
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-1/2 left-full ml-1.5 -translate-y-1/2 h-7 px-1.5 text-xs font-medium text-foreground bg-background border border-primary rounded-md shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 z-20 text-left"
          style={{ width: editWidth }}
        />
      ) : (
        <span
          className={cn(
            'absolute top-1/2 left-full ml-1.5 -translate-y-1/2 text-xs select-none pointer-events-none whitespace-nowrap z-10 text-left text-foreground',
            isKey && 'font-bold underline',
          )}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
};
