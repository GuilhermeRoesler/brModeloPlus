import { useMemo, useState } from 'react';
import { Check, Code, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <div className="flex-1 flex flex-col min-h-0 editor-canvas-bg text-foreground">
      <div className="shrink-0 px-5 sm:px-6 py-3.5 border-b border-border/80 bg-background/80 backdrop-blur-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
            <Code size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Modelo físico — SQL DDL
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-muted-foreground truncate">
                Gerado do modelo lógico
              </p>
              <Badge variant="secondary" className="rounded-md text-[10px] font-semibold">
                somente leitura
              </Badge>
            </div>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant={copied ? 'secondary' : 'default'}
          onClick={handleCopy}
          className={`rounded-xl gap-2 text-xs font-semibold ${
            copied ? 'bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white' : ''
          }`}
        >
          {copied ? (
            <>
              <Check /> Copiado
            </>
          ) : (
            <>
              <Copy /> Copiar
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 min-h-0 p-4 md:p-6">
        <textarea
          readOnly
          value={sqlCode}
          spellCheck={false}
          aria-label="SQL DDL gerado"
          className="w-full h-full resize-none rounded-2xl border border-border/90 bg-background/95 text-foreground font-mono text-sm leading-relaxed p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/25 caret-transparent selection:bg-primary/15 selection:text-foreground"
        />
      </div>
    </div>
  );
};
