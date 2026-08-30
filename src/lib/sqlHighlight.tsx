import type { ReactNode } from 'react';

const KEYWORDS = new Set([
  'CREATE',
  'TABLE',
  'PRIMARY',
  'KEY',
  'FOREIGN',
  'REFERENCES',
  'NOT',
  'NULL',
  'UNIQUE',
  'CONSTRAINT',
  'ALTER',
  'DROP',
  'INDEX',
  'ON',
  'DEFAULT',
  'CHECK',
  'AND',
  'OR',
]);

const TYPES = new Set([
  'INTEGER',
  'INT',
  'BIGINT',
  'SMALLINT',
  'SERIAL',
  'VARCHAR',
  'CHAR',
  'TEXT',
  'BOOLEAN',
  'BOOL',
  'DATE',
  'TIME',
  'TIMESTAMP',
  'NUMERIC',
  'DECIMAL',
  'FLOAT',
  'DOUBLE',
  'REAL',
  'BLOB',
  'JSON',
]);

const TOKEN_RE =
  /(\s+)|(--[^\n]*)|("(?:[^"]|"")*")|(\b[A-Za-z_][A-Za-z0-9_]*\b)|(\d+(?:\.\d+)?)|([(),;])/g;

/** Destaca SQL DDL em nós React (sem dependência externa). */
export const highlightSql = (sql: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let i = 0;
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;

  while ((match = TOKEN_RE.exec(sql)) !== null) {
    const [, ws, comment, ident, word, num, punct] = match;
    const key = `t-${i++}`;

    if (ws) {
      nodes.push(<span key={key}>{ws}</span>);
      continue;
    }
    if (comment) {
      nodes.push(
        <span key={key} className="text-muted-foreground/80 italic">
          {comment}
        </span>,
      );
      continue;
    }
    if (ident) {
      nodes.push(
        <span key={key} className="text-emerald-700 dark:text-emerald-400">
          {ident}
        </span>,
      );
      continue;
    }
    if (word) {
      const upper = word.toUpperCase();
      if (KEYWORDS.has(upper)) {
        nodes.push(
          <span key={key} className="text-primary font-semibold">
            {word}
          </span>,
        );
      } else if (TYPES.has(upper)) {
        nodes.push(
          <span key={key} className="text-sky-700 dark:text-sky-400 font-medium">
            {word}
          </span>,
        );
      } else {
        nodes.push(<span key={key}>{word}</span>);
      }
      continue;
    }
    if (num) {
      nodes.push(
        <span key={key} className="text-amber-700 dark:text-amber-400">
          {num}
        </span>,
      );
      continue;
    }
    if (punct) {
      nodes.push(
        <span key={key} className="text-muted-foreground">
          {punct}
        </span>,
      );
    }
  }

  return nodes;
};

export const sqlLineCount = (sql: string) =>
  sql.length === 0 ? 1 : sql.split('\n').length;
