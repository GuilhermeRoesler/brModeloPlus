import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  Download,
  MoreHorizontal,
  Moon,
  Sun,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getStoredTheme, toggleTheme, type ThemeMode } from '../../lib/theme';
import { MODES, type Mode } from '../../types';

type EditorHeaderProps = {
  mode: Mode;
  projectName: string;
  saveLabel: string;
  onBack: () => void;
  onChangeMode: (mode: Mode) => void;
  onRenameProject: (name: string) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
};

const MODE_LABELS: Record<Mode, string> = {
  [MODES.CONCEPTUAL]: 'Conceitual',
  [MODES.LOGICAL]: 'Lógico',
  [MODES.PHYSICAL]: 'Físico',
};

const MODE_ORDER = Object.values(MODES);

export const EditorHeader = ({
  mode,
  projectName,
  saveLabel,
  onBack,
  onChangeMode,
  onRenameProject,
  onExportJson,
  onImportJson,
}: EditorHeaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftName(projectName);
  }, [projectName]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  const commitName = () => {
    setEditingName(false);
    const next = draftName.trim() || 'Projeto';
    setDraftName(next);
    if (next !== projectName) onRenameProject(next);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onImportJson(file);
  };

  const modeIndex = Math.max(0, MODE_ORDER.indexOf(mode));

  return (
    <header className="editor-chrome h-14 sm:h-16 shrink-0 z-20 flex items-center justify-between gap-3 px-3 sm:px-5 border-b border-border/80">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-xl shrink-0 text-muted-foreground"
          title="Voltar aos projetos"
        >
          <ArrowLeft />
        </Button>

        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt=""
            className="w-8 h-8 rounded-[10px] shrink-0"
          />
          <div className="min-w-0 hidden sm:block">
            {editingName ? (
              <Input
                ref={nameInputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitName();
                  } else if (e.key === 'Escape') {
                    setDraftName(projectName);
                    setEditingName(false);
                  }
                }}
                className="h-7 w-[12rem] lg:w-[18rem] rounded-lg px-2 text-[15px] font-bold tracking-tight"
                aria-label="Nome do projeto"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="block text-left rounded-md -mx-1 px-1 hover:bg-muted/70 transition-colors max-w-[12rem] lg:max-w-[18rem]"
                title="Clique para renomear"
              >
                <h1 className="text-[15px] font-bold tracking-tight text-foreground leading-none truncate">
                  {projectName}
                </h1>
              </button>
            )}
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5 tracking-wide flex items-center gap-1.5">
              <span>
                BrModelo<span className="text-primary">Plus</span>
              </span>
              <span className="text-border" aria-hidden>
                ·
              </span>
              <span className="tabular-nums">{saveLabel}</span>
            </p>
          </div>
        </div>

        <Separator orientation="vertical" className="hidden sm:block h-7 mx-1" />

        <div
          className="relative grid grid-cols-[repeat(3,minmax(0,1fr))] p-1 rounded-xl bg-muted/80 border border-border/60 shrink-0"
          role="tablist"
          aria-label="Modo de modelagem"
        >
          <span
            aria-hidden
            className="editor-mode-pill absolute top-1 bottom-1 left-1 rounded-lg bg-background shadow-sm border border-border/50 pointer-events-none"
            style={{
              width: `calc((100% - 0.5rem) / ${MODE_ORDER.length})`,
              transform: `translateX(calc(${modeIndex} * 100%))`,
            }}
          />
          {MODE_ORDER.map((m) => (
            <Button
              key={m}
              type="button"
              role="tab"
              variant="ghost"
              size="sm"
              aria-selected={mode === m}
              onClick={() => onChangeMode(m)}
              className={cn(
                'editor-mode-tab relative z-[1] h-8 w-full min-w-0 rounded-lg px-1.5 sm:px-3 text-[11px] sm:text-xs font-semibold shadow-none',
                'hover:translate-y-0 active:translate-y-0 active:scale-100',
                mode === m
                  ? 'text-primary hover:bg-transparent hover:text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-transparent',
              )}
            >
              {MODE_LABELS[m]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json,.brmodelo.json"
          className="hidden"
          onChange={handleFileChange}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl text-muted-foreground"
              aria-label="Mais ações"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Projeto</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload /> Importar JSON
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportJson} className="gap-2">
              <Download /> Exportar JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setTheme(toggleTheme())}
              className="gap-2"
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
              {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
