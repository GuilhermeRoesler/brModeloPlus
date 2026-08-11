import { NODE_TYPES, type ErNode } from '../types';

export const generateSQL = (nodes: ErNode[]) => {
  const tables = nodes.filter((n) => n.type === NODE_TYPES.TABLE);
  if (tables.length === 0) return '-- Nenhuma tabela encontrada para gerar SQL.';

  return tables
    .map((table) => {
      const label = table.data.label.replace(/\s+/g, '_').toLowerCase();
      let sql = `CREATE TABLE ${label} (\n`;
      const pks: string[] = [];
      const colDefs = (table.data.columns || []).map((col) => {
        if (col.isPk) pks.push(col.name);
        return `  ${col.name} ${col.type}${col.isFk ? ' -- FK' : ''}`;
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
