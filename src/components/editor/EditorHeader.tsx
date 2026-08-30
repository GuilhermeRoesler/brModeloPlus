import { useRef, type ChangeEvent } from 'react';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import { MODES, type Mode } from '../../types';

type EditorHeaderProps = {
  mode: Mode;
  onBack: () => void;
  onChangeMode: (mode: Mode) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
};

export const EditorHeader = ({
  mode,
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
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
          title="Voltar ao Dashboard"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt="BrModeloPlus"
            className="w-8 h-8 rounded-lg shadow-indigo-200 shadow-lg"
          />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800 leading-none">
              BrModelo<span className="text-indigo-600">Plus</span>
            </h1>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                Editor local
              </span>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2" />

        <div className="flex bg-slate-100 p-1 rounded-lg">
          {Object.values(MODES).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChangeMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                mode === m
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 transition-all"
          title="Importar diagrama JSON"
        >
          <Upload size={14} /> Importar
        </button>
        <button
          type="button"
          onClick={onExportJson}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 transition-all"
          title="Exportar diagrama JSON"
        >
          <Download size={14} /> Exportar
        </button>
        <span
          className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1.5 rounded border border-amber-100 uppercase tracking-wide"
          title="Persistência local (localStorage)"
        >
          Local
        </span>
      </div>
    </header>
  );
};
