import type { NodeProps } from '@xyflow/react';
import type { ErNodeData } from '../../../types';
import { useDiagramFlow } from './DiagramFlowContext';
import { NodeHandles } from './NodeHandles';

const diamondClip = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export const EntityNode = ({
  data,
  selected,
}: NodeProps & { data: ErNodeData }) => {
  const { connectable } = useDiagramFlow();

  return (
    <div
      className={`relative w-[120px] h-[60px] overflow-visible ${connectable ? 'cursor-crosshair' : ''}`}
    >
      <NodeHandles />
      {data.isWeak && (
        <div className="absolute -inset-1 rounded-md border border-slate-800 pointer-events-none" />
      )}
      <div
        className={`absolute inset-0 rounded border-2 flex items-center justify-center text-center p-1 ${
          selected
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-800 bg-white shadow-sm'
        }`}
      >
        <span className="text-sm font-semibold text-slate-800 leading-tight select-none">
          {data.label}
        </span>
      </div>
    </div>
  );
};

export const RelationshipNode = ({
  data,
  selected,
}: NodeProps & { data: ErNodeData }) => {
  const { connectable } = useDiagramFlow();
  const border = selected ? 'bg-indigo-500' : 'bg-slate-800';
  const fill = selected ? 'bg-indigo-50' : 'bg-white';

  return (
    <div
      className={`relative w-[100px] h-[80px] overflow-visible ${connectable ? 'cursor-crosshair' : ''}`}
    >
      <NodeHandles />
      <div
        className={`absolute inset-0 ${border} ${selected ? '' : 'shadow-sm'}`}
        style={{ clipPath: diamondClip }}
      />
      <div
        className={`absolute inset-[2px] ${fill}`}
        style={{ clipPath: diamondClip }}
      />
      {data.isWeak && (
        <div
          className="absolute inset-[7px] bg-slate-800 pointer-events-none"
          style={{ clipPath: diamondClip }}
        >
          <div
            className={`absolute inset-[1.5px] ${fill}`}
            style={{ clipPath: diamondClip }}
          />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none z-[1]">
        <span className="text-xs font-bold text-slate-800 select-none">{data.label}</span>
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
      className={`relative rounded shadow-sm overflow-hidden border-2 ${
        selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-800 bg-white'
      } ${connectable ? 'cursor-crosshair' : ''}`}
      style={{ width: w, height: h }}
    >
      <NodeHandles />
      <div className="h-8 bg-slate-100 flex items-center justify-center px-2 border-b border-slate-300">
        <span className="font-bold text-sm text-slate-800 truncate">{data.label}</span>
      </div>
      <div className="flex flex-col pt-1 px-2">
        {data.columns?.map((col) => (
          <div
            key={col.id}
            className="flex items-center justify-between h-6 text-[10px] text-slate-700 border-b border-slate-50 last:border-0"
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
    </div>
  );
};
