import { NODE_TYPES, type DiagramNode } from '../types';

export const generateSQL = (nodes: DiagramNode[]) => {
  const tables = nodes.filter((n) => n.type === NODE_TYPES.TABLE);
  if (tables.length === 0) return '-- Nenhuma tabela encontrada para gerar SQL.';

  return tables
    .map((table) => {
      let sql = `CREATE TABLE ${table.label.replace(/\s+/g, '_').toLowerCase()} (\n`;
      const pks: string[] = [];
      const colDefs = (table.columns || []).map((col) => {
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
