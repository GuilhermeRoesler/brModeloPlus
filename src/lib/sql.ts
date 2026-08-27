import { NODE_TYPES, type ErNode } from '../types';

/** Aspas duplas SQL (padrão): "ident""ifier". */
const quoteIdent = (raw: string): string => {
  const name = raw.replace(/\s+/g, '_').toLowerCase() || 'unnamed';
  return `"${name.replace(/"/g, '""')}"`;
};

/** Tipos DDL permitidos (evita injeção de SQL no texto gerado). */
const sanitizeSqlType = (raw: string | undefined): string => {
  const t = (raw ?? '').trim();
  if (/^[A-Za-z][A-Za-z0-9_ ]*(\(\s*\d+(\s*,\s*\d+)?\s*\))?$/.test(t)) {
    return t.toUpperCase().replace(/\s+/g, ' ');
  }
  return 'VARCHAR(255)';
};

export const generateSQL = (nodes: ErNode[]) => {
  const tables = nodes.filter((n) => n.type === NODE_TYPES.TABLE);
  if (tables.length === 0) return '-- Nenhuma tabela encontrada para gerar SQL.';

  return tables
    .map((table) => {
      const label = quoteIdent(String(table.data?.label ?? 'tabela'));
      let sql = `CREATE TABLE ${label} (\n`;
      const pks: string[] = [];
      const colDefs = (table.data?.columns || []).map((col) => {
        const colName = quoteIdent(String(col.name ?? 'coluna'));
        if (col.isPk) pks.push(colName);
        const type = sanitizeSqlType(col.type);
        return `  ${colName} ${type}${col.isFk ? ' -- FK' : ''}`;
      });

      if (pks.length > 0) {
        colDefs.push(`  PRIMARY KEY (${pks.join(', ')})`);
      }

      sql += colDefs.join(',\n');
      sql += `\n);`;
      return sql;
    })
    .join('\n\n');
};
