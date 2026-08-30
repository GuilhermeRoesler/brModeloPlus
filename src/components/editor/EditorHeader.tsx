import { useRef, type ChangeEvent } from 'react';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
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

        <div
          className="flex p-1 rounded-xl bg-muted/80 border border-border/60"
          role="tablist"
          aria-label="Modo de modelagem"
        >
          {Object.values(MODES).map((m) => (
            <Button
              key={m}
              type="button"
              role="tab"
              variant={mode === m ? 'secondary' : 'ghost'}
              size="sm"
              aria-selected={mode === m}
              onClick={() => onChangeMode(m)}
              className={cn(
                'editor-mode-tab h-8 rounded-lg px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold shadow-none',
                mode === m
                  ? 'bg-background text-primary shadow-sm hover:bg-background hover:text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {MODE_LABELS[m]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json,.brmodelo.json"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl gap-1.5 text-xs font-semibold text-muted-foreground"
          title="Importar diagrama JSON"
        >
          <Upload />
          <span className="hidden sm:inline">Importar</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onExportJson}
          className="rounded-xl gap-1.5 text-xs font-semibold text-muted-foreground"
          title="Exportar diagrama JSON"
        >
          <Download />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </div>
    </header>
  );
};
