import type { ComponentType } from 'react';
import {
  Circle,
  Diamond,
  LayoutGrid,
  Minus,
  MousePointer2,
  Square,
  Table as TableIcon,
} from 'lucide-react';
import { MODES, type Mode, type Tool } from '../../types';

type ToolbarProps = {
  tool: Tool;
  setTool: (tool: Tool) => void;
  currentMode: Mode;
  onAutoLayout: () => void;
};

type ToolbarButtonProps = {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
  color?: string;
};

const ToolbarButton = ({ icon: Icon, label, active, onClick, color }: ToolbarButtonProps) => (
  <button
    onClick={onClick}
    className={`group relative flex items-center justify-center p-3 rounded-2xl transition-all duration-200 ${
      active
        ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-200'
        : 'hover:bg-slate-100 text-slate-600'
    }`}
  >
    <Icon size={22} className={color} />
    <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
      {label}
    </span>
  </button>
);

export const Toolbar = ({ tool, setTool, currentMode, onAutoLayout }: ToolbarProps) => (
  <aside className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-10 select-none">
    <ToolbarButton
      icon={MousePointer2}
      label="Selecionar"
      active={tool === 'select'}
      onClick={() => setTool('select')}
    />
    <div className="w-8 h-px bg-slate-100 mx-auto my-1" />

    {currentMode === MODES.CONCEPTUAL && (
      <>
        <ToolbarButton
          icon={Square}
          label="Entidade"
          active={tool === 'entity'}
          onClick={() => setTool('entity')}
          color="text-emerald-600"
        />
        <ToolbarButton
          icon={Diamond}
          label="Relacionamento"
          active={tool === 'relationship'}
          onClick={() => setTool('relationship')}
          color="text-rose-500"
        />
        <ToolbarButton
          icon={Circle}
          label="Atributo"
          active={tool === 'attribute'}
          onClick={() => setTool('attribute')}
          color="text-amber-500"
        />
      </>
    )}

    {(currentMode === MODES.LOGICAL || currentMode === MODES.PHYSICAL) && (
      <ToolbarButton
        icon={TableIcon}
        label="Tabela"
        active={tool === 'table'}
        onClick={() => setTool('table')}
        color="text-blue-600"
      />
    )}

    <div className="w-8 h-px bg-slate-100 mx-auto my-1" />
    <ToolbarButton
      icon={Minus}
      label="Conectar"
      active={tool === 'connection'}
      onClick={() => setTool('connection')}
    />
    <div className="w-8 h-px bg-slate-100 mx-auto my-1" />
    <ToolbarButton
      icon={LayoutGrid}
      label="Auto layout"
      onClick={onAutoLayout}
      color="text-violet-600"
    />
  </aside>
);
