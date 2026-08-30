import { MODES, type Mode } from '../../types';

const MODE_LABELS: Record<Mode, string> = {
  [MODES.CONCEPTUAL]: 'Conceitual',
  [MODES.LOGICAL]: 'Lógico',
  [MODES.PHYSICAL]: 'Físico',
};

type EditorStatusBarProps = {
  mode: Mode;
  nodeCount: number;
  edgeCount: number;
  saveLabel: string;
};

export const EditorStatusBar = ({
  mode,
  nodeCount,
  edgeCount,
  saveLabel,
}: EditorStatusBarProps) => (
  <footer className="editor-chrome shrink-0 h-8 border-t border-border/70 flex items-center justify-between gap-3 px-3 sm:px-4 text-[10px] font-medium text-muted-foreground select-none z-20">
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-foreground/80 font-semibold">{MODE_LABELS[mode]}</span>
      <span className="text-border" aria-hidden>
        ·
      </span>
      <span className="tabular-nums truncate">
        {nodeCount} {nodeCount === 1 ? 'nó' : 'nós'}
        <span className="mx-1 text-border">·</span>
        {edgeCount} {edgeCount === 1 ? 'aresta' : 'arestas'}
      </span>
    </div>
    <span className="shrink-0 tabular-nums">{saveLabel}</span>
  </footer>
);
