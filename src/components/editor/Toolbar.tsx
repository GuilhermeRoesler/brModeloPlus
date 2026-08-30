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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  derivedReadOnly?: boolean;
};

type ToolIcon = ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;

const ToolTipButton = ({
  value,
  label,
  icon: Icon,
  className,
}: {
  value: string;
  label: string;
  icon: ToolIcon;
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <ToggleGroupItem
        value={value}
        aria-label={label}
        className={cn(
          'size-11 rounded-xl data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm data-[state=on]:shadow-primary/25',
          className,
        )}
      >
        <Icon size={20} strokeWidth={2.1} />
      </ToggleGroupItem>
    </TooltipTrigger>
    <TooltipContent side="right" sideOffset={10}>
      {label}
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
  <aside className="editor-chrome absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-1.5 rounded-2xl z-10 select-none">
    <ToggleGroup
      type="single"
      value={derivedReadOnly ? 'select' : tool}
      onValueChange={(v) => {
        if (v) setTool(v as Tool);
      }}
      orientation="vertical"
      className="flex flex-col gap-1"
    >
      <ToolTipButton value="select" label="Selecionar" icon={MousePointer2} />

      {derivedReadOnly ? (
        <p className="max-w-[3.75rem] mx-auto text-[9px] leading-tight text-center text-muted-foreground px-0.5 py-1.5">
          Derivado do conceitual
        </p>
      ) : (
        <>
          <Separator className="w-7 mx-auto my-0.5" />

          {currentMode === MODES.CONCEPTUAL && (
            <>
              <ToolTipButton
                value="entity"
                label="Entidade"
                icon={Square}
                className="text-emerald-600 data-[state=on]:text-primary-foreground"
              />
              <ToolTipButton
                value="relationship"
                label="Relacionamento"
                icon={Diamond}
                className="text-rose-500 data-[state=on]:text-primary-foreground"
              />
              <Separator className="w-7 mx-auto my-0.5" />
            </>
          )}

          <ToolTipButton value="connection" label="Conectar" icon={Minus} />
        </>
      )}
    </ToggleGroup>

    {!derivedReadOnly && (
      <>
        <Separator className="w-7 mx-auto my-0.5" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onAutoLayout}
              aria-label="Auto layout"
              className="size-11 rounded-xl text-violet-600"
            >
              <LayoutGrid strokeWidth={2.1} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            Auto layout
          </TooltipContent>
        </Tooltip>
      </>
    )}
  </aside>
);
