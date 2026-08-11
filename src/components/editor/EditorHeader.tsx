import {
  ArrowLeft,
  Code,
  Grid,
  Share2,
  Users,
} from 'lucide-react';
import { isRealtimeCollabEnabled } from '../../config/firebase';
import { MODES, type Mode } from '../../types';

type EditorHeaderProps = {
  mode: Mode;
  onBack: () => void;
  onChangeMode: (mode: Mode) => void;
  showSql: boolean;
  onToggleSql: () => void;
  onlineUsers: number;
};

export const EditorHeader = ({
  mode,
  onBack,
  onChangeMode,
  showSql,
  onToggleSql,
  onlineUsers,
}: EditorHeaderProps) => (
  <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
    <div className="flex items-center gap-4">
      <button
        onClick={onBack}
        className="p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
        title="Voltar ao Dashboard"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Grid className="text-white" size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800 leading-none">
            BrModelo<span className="text-indigo-600">Plus</span>
          </h1>
          <div className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isRealtimeCollabEnabled ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
              {isRealtimeCollabEnabled ? 'Editor' : 'Editor local'}
            </span>
          </div>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-200 mx-2" />

      <div className="flex bg-slate-100 p-1 rounded-lg">
        {Object.values(MODES).map((m) => (
          <button
            key={m}
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
      {mode === MODES.PHYSICAL && (
        <button
          onClick={onToggleSql}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all mr-2 ${
            showSql
              ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Code size={14} /> SQL
        </button>
      )}

      {isRealtimeCollabEnabled ? (
        <>
          <div
            className="flex items-center gap-2 mr-4 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100"
            title="Usuários nesta sala"
          >
            <Users size={14} />
            <span>{onlineUsers}</span>
          </div>

          <button
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href);
              alert('Link copiado!');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-slate-200"
          >
            <Share2 size={16} /> Compartilhar
          </button>
        </>
      ) : (
        <span
          className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1.5 rounded border border-amber-100 uppercase tracking-wide"
          title="Colaboração desabilitada — Firebase sem API key"
        >
          Sem colaboração
        </span>
      )}
    </div>
  </header>
);
