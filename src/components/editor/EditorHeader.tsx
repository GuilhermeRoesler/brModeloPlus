import { useRef, type ChangeEvent } from 'react';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MODES, type Mode } from '../../types';

type EditorHeaderProps = {
  mode: Mode;
  projectName: string;
  onBack: () => void;
  onChangeMode: (mode: Mode) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
};

const MODE_LABELS: Record<Mode, string> = {
  [MODES.CONCEPTUAL]: 'Conceitual',
  [MODES.LOGICAL]: 'Lógico',
  [MODES.PHYSICAL]: 'Físico',
};

export const EditorHeader = ({
  mode,
  projectName,
  onBack,
  onChangeMode,
  onExportJson,
  onImportJson,
}: EditorHeaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onImportJson(file);
  };

  return (
    <header className="editor-chrome h-14 sm:h-16 shrink-0 z-20 flex items-center justify-between gap-3 px-3 sm:px-5 border-b border-border/80">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-xl shrink-0 text-muted-foreground"
              aria-label="Voltar aos projetos"
            >
              <ArrowLeft />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Voltar aos projetos</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt=""
            className="w-8 h-8 rounded-[10px] shrink-0"
          />
          <div className="min-w-0 hidden sm:block">
            <h1
              className="text-[15px] font-bold tracking-tight text-foreground leading-none truncate max-w-[12rem] lg:max-w-[18rem]"
              title={projectName}
            >
              {projectName}
            </h1>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5 tracking-wide">
              BrModelo<span className="text-primary">Plus</span>
            </p>
          </div>
        </div>

        <Separator orientation="vertical" className="hidden sm:block h-7 mx-1" />

        <Tabs
          value={mode}
          onValueChange={(v) => onChangeMode(v as Mode)}
          className="gap-0"
        >
          <TabsList
            variant="default"
            className="h-9 rounded-xl bg-muted/80 border border-border/60 p-1"
            aria-label="Modo de modelagem"
          >
            {Object.values(MODES).map((m) => (
              <TabsTrigger
                key={m}
                value={m}
                className="editor-mode-tab h-7 rounded-lg px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold data-[state=active]:text-primary"
              >
                {MODE_LABELS[m]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json,.brmodelo.json"
          className="hidden"
          onChange={handleFileChange}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl gap-1.5 text-xs font-semibold text-muted-foreground"
              aria-label="Importar diagrama JSON"
            >
              <Upload />
              <span className="hidden sm:inline">Importar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Importar diagrama JSON</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onExportJson}
              className="rounded-xl gap-1.5 text-xs font-semibold text-muted-foreground"
              aria-label="Exportar diagrama JSON"
            >
              <Download />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Exportar diagrama JSON</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
};
