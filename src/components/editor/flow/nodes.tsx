import type { NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ErNodeData } from '../../../types';
import { useDiagramFlow } from './DiagramFlowContext';
import { NodeHandles } from './NodeHandles';

const diamondClip = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

const InlineLabelInput = ({
  id,
  value,
  placeholder,
  className,
}: {
  id: string;
  value: string;
  placeholder: string;
  className: string;
}) => {
  const {
    onInlineLabelChange,
    onInlineLabelEnd,
    onInlineLabelSubmit,
    onInlineLabelTab,
  } = useDiagramFlow();

  return (
    <input
      data-inline-label-edit=""
      autoFocus
      value={value}
      placeholder={placeholder}
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
      className={className}
    />
  );
};

const inlineInputClass =
  'bg-background border border-primary text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md text-center z-20';

export const EntityNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: ErNodeData }) => {
  const { editingLabelId, connectable } = useDiagramFlow();
  const isEditing = editingLabelId === id;

  return (
    <div
      className={cn(
        'group/node relative w-[128px] h-[64px] overflow-visible transition-transform duration-150',
        connectable && 'cursor-crosshair',
        selected && 'z-[1]',
      )}
    >
      <NodeHandles />
      {data.isWeak && (
        <div
          className={cn(
            'absolute -inset-[5px] rounded-lg border-2 border-dashed pointer-events-none transition-colors',
            selected ? 'border-primary/70' : 'border-foreground/45',
          )}
        />
      )}
      <div
        className={cn(
          'absolute inset-0 rounded-lg border-[2.5px] flex items-center justify-center text-center p-1.5',
          'bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06)]',
          'transition-[border-color,box-shadow,background-color] duration-150',
          'group-hover/node:shadow-md',
          selected
            ? 'border-primary bg-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_22%,transparent)]'
            : 'border-foreground/75 group-hover/node:border-primary/55',
          connectable &&
            'ring-2 ring-primary/35 ring-offset-2 ring-offset-[var(--rf-bg,transparent)]',
        )}
      >
        {isEditing ? (
          <InlineLabelInput
            id={id}
            value={data.label}
            placeholder="Entidade"
            className={cn(inlineInputClass, 'w-full h-7 px-1 text-sm font-semibold tracking-tight')}
          />
        ) : (
          <span className="text-[13px] font-semibold tracking-tight leading-tight select-none px-0.5">
            {data.label}
          </span>
        )}
      </div>
    </div>
  );
};

export const RelationshipNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: ErNodeData }) => {
  const { editingLabelId, connectable } = useDiagramFlow();
  const isEditing = editingLabelId === id;
  const border = selected ? 'bg-primary' : 'bg-foreground/80';
  const fill = selected ? 'bg-accent' : 'bg-card';

  return (
    <div
      className={cn(
        'group/node relative w-[108px] h-[86px] overflow-visible',
        connectable && 'cursor-crosshair',
        selected && 'z-[1]',
      )}
    >
      <NodeHandles />
      {selected && (
        <div
          className="absolute -inset-1 bg-primary/20 pointer-events-none"
          style={{ clipPath: diamondClip }}
        />
      )}
      <div
        className={cn(
          'absolute inset-0 transition-opacity',
          border,
          !selected && 'opacity-90 group-hover/node:opacity-100',
        )}
        style={{ clipPath: diamondClip }}
      />
      <div
        className={cn('absolute inset-[2.5px]', fill)}
        style={{ clipPath: diamondClip }}
      />
      {data.isWeak && (
        <div
          className={cn(
            'absolute inset-[8px] pointer-events-none',
            selected ? 'bg-primary/70' : 'bg-foreground/55',
          )}
          style={{ clipPath: diamondClip }}
        >
          <div
            className={cn('absolute inset-[1.5px]', fill)}
            style={{ clipPath: diamondClip }}
          />
        </div>
      )}
      {connectable && (
        <div
          className="absolute inset-[6px] bg-primary/15 pointer-events-none"
          style={{ clipPath: diamondClip }}
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center text-center z-[1] text-card-foreground">
        {isEditing ? (
          <InlineLabelInput
            id={id}
            value={data.label}
            placeholder="Rel"
            className={cn(
              inlineInputClass,
              'w-[76px] h-6 px-1 text-xs font-bold tracking-tight pointer-events-auto',
            )}
          />
        ) : (
          <span className="text-[11px] font-bold tracking-tight select-none pointer-events-none px-1">
            {data.label}
          </span>
        )}
      </div>
    </div>
  );
};

export const TableNode = ({
  data,
  selected,
}: NodeProps & { data: ErNodeData }) => {
  const { connectable } = useDiagramFlow();
  const rowH = 24;
  const headH = 34;
  const w = 168;
  const h = headH + (data.columns?.length || 0) * rowH + 10;

  return (
    <div
      className={cn(
        'group/node relative rounded-xl overflow-hidden border-2 bg-card text-card-foreground',
        'shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow] duration-150',
        selected
          ? 'border-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_22%,transparent)]'
          : 'border-foreground/70 group-hover/node:border-primary/50 group-hover/node:shadow-md',
        connectable && 'ring-2 ring-primary/35 cursor-crosshair',
      )}
      style={{ width: w, height: h }}
    >
      <NodeHandles />
      <div className="h-[34px] bg-gradient-to-b from-muted to-muted/70 flex items-center justify-center px-2.5 border-b border-border">
        <span className="font-bold text-sm tracking-tight truncate">{data.label}</span>
      </div>
      <div className="flex flex-col pt-1 px-2.5">
        {data.columns?.map((col) => (
          <div
            key={col.id}
            className="flex items-center justify-between h-6 text-[10px] text-foreground/85 border-b border-border/40 last:border-0"
          >
            <div className="flex items-center gap-1 overflow-hidden min-w-0">
              {col.isPk && (
                <Badge
                  variant="secondary"
                  className="h-3.5 px-1 rounded text-[8px] font-bold text-amber-800 bg-amber-100/90 border-0 dark:text-amber-200 dark:bg-amber-900/50"
                >
                  PK
                </Badge>
              )}
              {col.isFk && (
                <Badge
                  variant="secondary"
                  className="h-3.5 px-1 rounded text-[8px] font-bold text-sky-800 bg-sky-100/90 border-0 dark:text-sky-200 dark:bg-sky-900/50"
                >
                  FK
                </Badge>
              )}
              <span className={cn('truncate tracking-tight', col.isPk && 'font-bold')}>
                {col.name}
              </span>
            </div>
            <span className="text-muted-foreground text-[9px] ml-1 shrink-0 font-medium">
              {col.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
