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
        'relative w-[120px] h-[60px] overflow-visible',
        connectable && 'cursor-crosshair',
      )}
    >
      <NodeHandles />
      {data.isWeak && (
        <div className="absolute -inset-1 rounded-md border border-foreground/80 pointer-events-none" />
      )}
      <div
        className={cn(
          'absolute inset-0 rounded-md border-2 flex items-center justify-center text-center p-1 bg-card text-card-foreground shadow-sm',
          selected ? 'border-primary bg-accent' : 'border-foreground/80',
        )}
      >
        {isEditing ? (
          <InlineLabelInput
            id={id}
            value={data.label}
            placeholder="Entidade"
            className={cn(inlineInputClass, 'w-full h-7 px-1 text-sm font-semibold')}
          />
        ) : (
          <span className="text-sm font-semibold leading-tight select-none">
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
        'relative w-[100px] h-[80px] overflow-visible',
        connectable && 'cursor-crosshair',
      )}
    >
      <NodeHandles />
      <div
        className={cn('absolute inset-0', border, !selected && 'shadow-sm')}
        style={{ clipPath: diamondClip }}
      />
      <div
        className={cn('absolute inset-[2px]', fill)}
        style={{ clipPath: diamondClip }}
      />
      {data.isWeak && (
        <div
          className="absolute inset-[7px] bg-foreground/80 pointer-events-none"
          style={{ clipPath: diamondClip }}
        >
          <div
            className={cn('absolute inset-[1.5px]', fill)}
            style={{ clipPath: diamondClip }}
          />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center text-center z-[1] text-card-foreground">
        {isEditing ? (
          <InlineLabelInput
            id={id}
            value={data.label}
            placeholder="Rel"
            className={cn(
              inlineInputClass,
              'w-[72px] h-6 px-1 text-xs font-bold pointer-events-auto',
            )}
          />
        ) : (
          <span className="text-xs font-bold select-none pointer-events-none">
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
  const headH = 32;
  const w = 160;
  const h = headH + (data.columns?.length || 0) * rowH + 10;

  return (
    <div
      className={cn(
        'relative rounded-md shadow-sm overflow-hidden border-2 bg-card text-card-foreground',
        selected ? 'border-primary bg-accent' : 'border-foreground/80',
        connectable && 'cursor-crosshair',
      )}
      style={{ width: w, height: h }}
    >
      <NodeHandles />
      <div className="h-8 bg-muted flex items-center justify-center px-2 border-b border-border">
        <span className="font-bold text-sm truncate">{data.label}</span>
      </div>
      <div className="flex flex-col pt-1 px-2">
        {data.columns?.map((col) => (
          <div
            key={col.id}
            className="flex items-center justify-between h-6 text-[10px] text-foreground/80 border-b border-border/40 last:border-0"
          >
            <div className="flex items-center gap-1 overflow-hidden min-w-0">
              {col.isPk && (
                <Badge
                  variant="secondary"
                  className="h-3.5 px-1 rounded text-[8px] font-bold text-amber-700 bg-amber-100 border-0"
                >
                  PK
                </Badge>
              )}
              {col.isFk && (
                <Badge
                  variant="secondary"
                  className="h-3.5 px-1 rounded text-[8px] font-bold text-sky-700 bg-sky-100 border-0"
                >
                  FK
                </Badge>
              )}
              <span className={cn('truncate', col.isPk && 'font-bold')}>
                {col.name}
              </span>
            </div>
            <span className="text-muted-foreground text-[9px] ml-1 shrink-0">
              {col.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
