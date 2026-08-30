import type { ComponentType } from 'react';
import {
  Diamond,
  LayoutGrid,
  Minus,
  MousePointer2,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  color?: string;
  tipSide?: 'right' | 'top';
};

const ToolbarButton = ({
  icon: Icon,
  label,
  shortcut,
  active,
  onClick,
  color,
  tipSide = 'right',
}: ToolbarButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant={active ? 'default' : 'ghost'}
        size="icon"
        onClick={onClick}
        aria-label={shortcut ? `${label} (${shortcut})` : label}
        aria-pressed={active}
        className={cn(
          'group relative size-10 sm:size-11 rounded-xl shrink-0',
          active && 'shadow-sm shadow-primary/25',
        )}
      >
        <Icon
          size={20}
          className={active ? undefined : color}
          strokeWidth={2.1}
        />
      </Button>
    </TooltipTrigger>
    <TooltipContent side={tipSide} className="flex items-center gap-2">
      <span>{label}</span>
      {shortcut ? (
        <kbd className="rounded border border-background/25 bg-background/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
          {shortcut}
        </kbd>
      ) : null}
    </TooltipContent>
  </Tooltip>
);

export const Toolbar = ({
  tool,
  setTool,
  currentMode,
  onAutoLayout,
  derivedReadOnly = false,
}: ToolbarProps) => (
  <aside
    className={cn(
      'editor-chrome z-10 select-none',
      /* Desktop: vertical flutuante à esquerda */
      'hidden md:flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 flex-col gap-1 p-1.5 rounded-2xl',
    )}
  >
    <ToolbarButton
      icon={MousePointer2}
      label="Selecionar"
      shortcut="V"
      active={tool === 'select'}
      onClick={() => setTool('select')}
    />

    {derivedReadOnly ? (
      <p className="max-w-[3.75rem] mx-auto text-[9px] leading-tight text-center text-muted-foreground px-0.5 py-1.5">
        Derivado do conceitual
      </p>
    ) : (
      <>
        <Separator className="w-7 mx-auto my-0.5" />

        {currentMode === MODES.CONCEPTUAL && (
          <>
            <ToolbarButton
              icon={Square}
              label="Entidade"
              shortcut="E"
              active={tool === 'entity'}
              onClick={() => setTool('entity')}
              color="text-emerald-600"
            />
            <ToolbarButton
              icon={Diamond}
              label="Relacionamento"
              shortcut="R"
              active={tool === 'relationship'}
              onClick={() => setTool('relationship')}
              color="text-rose-500"
            />
            <Separator className="w-7 mx-auto my-0.5" />
          </>
        )}

        <ToolbarButton
          icon={Minus}
          label="Conectar"
          shortcut="C"
          active={tool === 'connection'}
          onClick={() => setTool('connection')}
        />
        <Separator className="w-7 mx-auto my-0.5" />
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

/** Barra horizontal inferior (mobile). */
export const MobileToolbar = ({
  tool,
  setTool,
  currentMode,
  onAutoLayout,
  derivedReadOnly = false,
}: ToolbarProps) => (
  <div className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(100%-1.5rem,24rem)]">
    <div className="editor-chrome rounded-2xl p-1.5 flex items-center justify-center gap-0.5 overflow-x-auto">
      <ToolbarButton
        tipSide="top"
        icon={MousePointer2}
        label="Selecionar"
        shortcut="V"
        active={tool === 'select'}
        onClick={() => setTool('select')}
      />
      {!derivedReadOnly && currentMode === MODES.CONCEPTUAL && (
        <>
          <ToolbarButton
            tipSide="top"
            icon={Square}
            label="Entidade"
            shortcut="E"
            active={tool === 'entity'}
            onClick={() => setTool('entity')}
            color="text-emerald-600"
          />
          <ToolbarButton
            tipSide="top"
            icon={Diamond}
            label="Relacionamento"
            shortcut="R"
            active={tool === 'relationship'}
            onClick={() => setTool('relationship')}
            color="text-rose-500"
          />
        </>
      )}
      {!derivedReadOnly && (
        <>
          <ToolbarButton
            tipSide="top"
            icon={Minus}
            label="Conectar"
            shortcut="C"
            active={tool === 'connection'}
            onClick={() => setTool('connection')}
          />
          <ToolbarButton
            tipSide="top"
            icon={LayoutGrid}
            label="Auto layout"
            onClick={onAutoLayout}
            color="text-violet-600"
          />
        </>
      )}
    </div>
  </div>
);
