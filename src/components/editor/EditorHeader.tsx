import { useRef, type ChangeEvent } from 'react';
import { ArrowLeft, Download, Upload } from 'lucide-react';
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
    <header className="editor-chrome h-14 sm:h-16 shrink-0 z-20 flex items-center justify-between gap-3 px-3 sm:px-5 border-b border-slate-200/80">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="btn-hover btn-hover--soft p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 rounded-xl shrink-0"
          title="Voltar aos projetos"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt=""
            className="w-8 h-8 rounded-[10px] shrink-0"
          />
          <div className="min-w-0 hidden sm:block">
            <h1
              className="text-[15px] font-bold tracking-tight text-slate-800 leading-none truncate max-w-[12rem] lg:max-w-[18rem]"
              title={projectName}
            >
              {projectName}
            </h1>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 tracking-wide">
              BrModelo<span className="text-indigo-500">Plus</span>
            </p>
          </div>
        </div>

        <div className="hidden sm:block h-7 w-px bg-slate-200/90 mx-1" />

        <div
          className="flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/60"
          role="tablist"
          aria-label="Modo de modelagem"
        >
          {Object.values(MODES).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => onChangeMode(m)}
              className={`editor-mode-tab btn-hover px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold ${
                mode === m
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/70'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
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
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-hover btn-hover--soft inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100/90 border border-transparent hover:border-slate-200/80"
          title="Importar diagrama JSON"
        >
          <Upload size={14} />
          <span className="hidden sm:inline">Importar</span>
        </button>
        <button
          type="button"
          onClick={onExportJson}
          className="btn-hover btn-hover--soft inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100/90 border border-transparent hover:border-slate-200/80"
          title="Exportar diagrama JSON"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Exportar</span>
        </button>
      </div>
    </header>
  );
};
