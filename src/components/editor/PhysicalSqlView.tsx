import { useMemo, useState } from 'react';
import { Check, Code, Copy } from 'lucide-react';
import { generateSQL } from '../../lib/sql';
import type { ErNode } from '../../types';

type PhysicalSqlViewProps = {
  nodes: ErNode[];
};

/** Modo físico: editor de texto SQL (read-only), gerado a partir das tabelas do lógico. */
export const PhysicalSqlView = ({ nodes }: PhysicalSqlViewProps) => {
  const [copied, setCopied] = useState(false);
  const sqlCode = useMemo(() => generateSQL(nodes), [nodes]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 editor-canvas-bg text-slate-800">
      <div className="shrink-0 px-5 sm:px-6 py-3.5 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center shrink-0">
            <Code size={18} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              Modelo físico — SQL DDL
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              Gerado do modelo lógico · somente leitura
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {copied ? (
            <>
              <Check size={14} /> Copiado
            </>
          ) : (
            <>
              <Copy size={14} /> Copiar
            </>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 p-4 md:p-6">
        <textarea
          readOnly
          value={sqlCode}
          spellCheck={false}
          aria-label="SQL DDL gerado"
          className="w-full h-full resize-none rounded-2xl border border-slate-200/90 bg-white/95 text-slate-700 font-mono text-sm leading-relaxed p-5 outline-none focus:ring-2 focus:ring-indigo-500/25 caret-transparent selection:bg-indigo-100 selection:text-indigo-900"
        />
      </div>
    </div>
  );
};
