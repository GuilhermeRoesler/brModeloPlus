import type { ComponentType } from 'react';
import {
  Diamond,
  LayoutGrid,
  Minus,
  MousePointer2,
  Square,
} from 'lucide-react';
import { MODES, type Mode, type Tool } from '../../types';

type ToolbarProps = {
  tool: Tool;
  setTool: (tool: Tool) => void;
  currentMode: Mode;
  onAutoLayout: () => void;
  /** Lógico/físico derivados: só seleção (sem editar estrutura). */
  derivedReadOnly?: boolean;
};

type ToolbarButtonProps = {
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  active?: boolean;
  onClick: () => void;
  color?: string;
};

const ToolbarButton = ({ icon: Icon, label, active, onClick, color }: ToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={active}
    className={`group relative flex items-center justify-center w-11 h-11 rounded-xl transition-colors duration-150 ${
      active
        ? 'bg-indigo-600 text-white'
        : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-800'
    }`}
  >
    <Icon size={20} className={active ? undefined : color} strokeWidth={2.1} />
    <span className="absolute left-full ml-2.5 px-2 py-1 bg-slate-800 text-white text-[11px] font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
      {label}
    </span>
  </button>
);

export const Toolbar = ({
  tool,
  setTool,
  currentMode,
  onAutoLayout,
  derivedReadOnly = false,
}: ToolbarProps) => (
  <aside className="editor-chrome absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-1.5 rounded-2xl z-10 select-none">
    <ToolbarButton
      icon={MousePointer2}
      label="Selecionar"
      active={tool === 'select'}
      onClick={() => setTool('select')}
    />

    {derivedReadOnly ? (
      <p className="max-w-[3.75rem] mx-auto text-[9px] leading-tight text-center text-slate-400 px-0.5 py-1.5">
        Derivado do conceitual
      </p>
    ) : (
      <>
        <div className="w-7 h-px bg-slate-200/90 mx-auto my-0.5" />

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
            <div className="w-7 h-px bg-slate-200/90 mx-auto my-0.5" />
          </>
        )}

        <ToolbarButton
          icon={Minus}
          label="Conectar"
          active={tool === 'connection'}
          onClick={() => setTool('connection')}
        />
        <div className="w-7 h-px bg-slate-200/90 mx-auto my-0.5" />
        <ToolbarButton
          icon={LayoutGrid}
          label="Auto layout"
          onClick={onAutoLayout}
          color="text-violet-600"
        />
      </>
    )}
  </aside>
);
