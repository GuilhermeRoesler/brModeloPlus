import { useMemo, useState } from 'react';
import { Check, Code, Copy, X } from 'lucide-react';
import { generateSQL } from '../../lib/sql';
import type { ErNode } from '../../types';

type SQLPanelProps = {
  nodes: ErNode[];
  onClose: () => void;
};

export const SQLPanel = ({ nodes, onClose }: SQLPanelProps) => {
  const [copied, setCopied] = useState(false);
  const sqlCode = useMemo(() => generateSQL(nodes), [nodes]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-700 shadow-2xl transition-all duration-300 z-30 flex flex-col h-full absolute right-0 top-0 text-slate-300">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-2">
          <Code size={18} className="text-indigo-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">SQL Gerado</h2>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
        <pre>{sqlCode}</pre>
      </div>
      <div className="p-4 border-t border-slate-700 bg-slate-950">
        <button
          type="button"
          onClick={handleCopy}
          className={`w-full py-3 flex items-center justify-center gap-2 rounded-xl transition-all font-bold text-sm ${
            copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {copied ? (
            <>
              <Check size={18} /> Copiado!
            </>
          ) : (
            <>
              <Copy size={18} /> Copiar SQL
            </>
          )}
        </button>
      </div>
    </div>
  );
};
