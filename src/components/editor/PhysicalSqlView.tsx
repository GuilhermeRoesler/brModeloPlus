import { useMemo, useState } from 'react';
import { Check, Code, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateSQL } from '../../lib/sql';
import { highlightSql, sqlLineCount } from '../../lib/sqlHighlight';
import type { ErNode } from '../../types';
import { NODE_TYPES } from '../../types';

type PhysicalSqlViewProps = {
  nodes: ErNode[];
  onCopied?: () => void;
};

/** Modo físico: SQL DDL com highlight leve (read-only). */
export const PhysicalSqlView = ({ nodes, onCopied }: PhysicalSqlViewProps) => {
  const [copied, setCopied] = useState(false);
  const tableCount = useMemo(
    () => nodes.filter((n) => n.type === NODE_TYPES.TABLE).length,
    [nodes],
  );
  const sqlCode = useMemo(() => generateSQL(nodes), [nodes]);
  const isEmpty = tableCount === 0;
  const lineCount = sqlLineCount(sqlCode);
  const highlighted = useMemo(() => highlightSql(sqlCode), [sqlCode]);

  const handleCopy = () => {
    if (isEmpty) return;
    void navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    onCopied?.();
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
          disabled={isEmpty}
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
        {isEmpty ? (
          <div className="h-full flex items-center justify-center">
            <div className="editor-chrome editor-panel-in max-w-sm text-center px-6 py-8 rounded-2xl">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Code size={26} />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-2">
                Nenhum SQL ainda
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Modele entidades e relacionamentos no modo conceitual — o DDL aparece
                aqui automaticamente a partir do lógico.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full rounded-2xl border border-border/90 bg-background/95 overflow-hidden flex shadow-sm">
            <div
              aria-hidden
              className="shrink-0 w-11 sm:w-12 bg-muted/40 border-r border-border/70 py-5 text-right select-none overflow-hidden"
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div
                  key={i}
                  className="h-[1.375rem] leading-[1.375rem] pr-2.5 text-[11px] font-mono text-muted-foreground/70 tabular-nums"
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <pre
              aria-label="SQL DDL gerado"
              className="flex-1 min-w-0 overflow-auto p-5 m-0 font-mono text-sm leading-[1.375rem] text-foreground selection:bg-primary/15"
            >
              <code>{highlighted}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
