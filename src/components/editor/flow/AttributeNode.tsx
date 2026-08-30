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
  const labelWidth = Math.max(48, displayLabel.length * 7.2 + 8);
  const editWidth = Math.max(96, labelWidth + 24);

  return (
    <div
      className={cn(
        'group/node relative w-5 h-5',
        connectable && 'cursor-crosshair',
        selected && 'z-[1]',
      )}
      style={{ overflow: 'visible' }}
    >
      <NodeHandles />
      {selected && (
        <div className="absolute -inset-1.5 rounded-full bg-primary/15 pointer-events-none" />
      )}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-[2.5px] transition-[border-color,background-color,box-shadow] duration-150',
          isDerived && 'border-dashed',
          isKey
            ? selected
              ? 'border-primary bg-primary shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_25%,transparent)]'
              : 'border-foreground bg-foreground group-hover/node:border-primary group-hover/node:bg-primary'
            : selected
              ? 'border-primary bg-accent shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_20%,transparent)]'
              : 'border-foreground/75 bg-card group-hover/node:border-primary/60',
          connectable && !isKey && 'ring-2 ring-primary/30',
        )}
      />
      {isMulti && (
        <div
          className={cn(
            'absolute inset-[3.5px] rounded-full border-[1.5px] pointer-events-none',
            selected || isKey ? 'border-primary-foreground/90' : 'border-foreground/70',
            isKey && !selected && 'border-background/80',
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
            'absolute top-1/2 left-full ml-1.5 -translate-y-1/2 text-xs select-none pointer-events-none whitespace-nowrap z-10 text-left tracking-tight',
            isKey
              ? 'font-bold underline decoration-2 underline-offset-2 text-foreground'
              : 'font-medium text-foreground/90',
            isDerived && 'italic text-muted-foreground',
          )}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
};
