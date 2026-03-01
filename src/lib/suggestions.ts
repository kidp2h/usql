import type { Monaco } from '@monaco-editor/react';
import { PG_FUNCTIONS, PG_KEYWORDS } from '@/constants';
export interface TableSchema {
  name: string;
  columns: string[];
}
export interface CteSchema {
  name: string;
  columns: string[];
}
export type AliasMap = Record<string, string>; // alias/cte_name → real table name
type Range = {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
};
export type SqlContext =
  | { type: 'keyword' }
  | { type: 'table' }
  | { type: 'column'; aliases: AliasMap }
  | { type: 'column_of'; resolvedTable: string; aliases: AliasMap };
const TABLE_TRIGGERS = ['FROM', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
  'FULL OUTER JOIN', 'CROSS JOIN', 'UPDATE', 'INTO'];

const COLUMN_TRIGGERS = ['SELECT', 'WHERE', 'HAVING', 'SET', 'RETURNING',
  'AND', 'OR', 'NOT', 'ON', 'WHEN', 'THEN', 'ELSE'];

const SQL_KEYWORD_SET = new Set([
  ...TABLE_TRIGGERS, ...COLUMN_TRIGGERS,
  'AS', 'BY', 'GROUP', 'ORDER', 'LIMIT', 'OFFSET', 'DISTINCT',
  'CASE', 'END', 'IS', 'IN', 'LIKE', 'BETWEEN', 'EXISTS', 'NULL',
  'ASC', 'DESC', 'WITH', 'UNION', 'INTERSECT', 'EXCEPT', 'ALL',
]);
const SNIPPETS = [
  {
    label: 'sel',
    detail: 'SELECT ... FROM ...',
    insertText: 'SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:1=1};',
  },
  {
    label: 'cte',
    detail: 'WITH cte AS (...)',
    insertText: 'WITH ${1:cte} AS (\n\tSELECT ${2:*}\n\tFROM ${3:table}\n)\nSELECT *\nFROM ${1:cte};',
  },
  {
    label: 'upsert',
    detail: 'INSERT ... ON CONFLICT',
    insertText: 'INSERT INTO ${1:table} (${2:col})\nVALUES (${3:val})\nON CONFLICT (${4:id}) DO UPDATE\nSET ${2:col} = EXCLUDED.${2:col};',
  },
  {
    label: 'window',
    detail: 'ROW_NUMBER() OVER (...)',
    insertText: 'ROW_NUMBER() OVER (\n\tPARTITION BY ${1:col}\n\tORDER BY ${2:col} DESC\n) AS ${3:rn}',
  },
];
export const parseTablesFromQuery = (sql: string): Map<string, string> | null => {
  if (!sql || sql.length === 0) return null;

  const lowerSql = sql.toLowerCase();

  // Quick check if query contains FROM/JOIN keywords
  if (!lowerSql.includes('from') && !lowerSql.includes('join')) {
    return null;
  }

  const tableMap = new Map<string, string>();
  const fromPattern = /(?:from|join)\s+(?:`)?([a-z_][a-z0-9_]*)(?:`)?(?:\s+(?:as\s+)?(?:`)?([a-z_][a-z0-9_]*)(?:`)?)?/gi;

  let match: any;
  let matchCount = 0;
  const MAX_MATCHES = 10; // Prevent regex catastrophic backtracking

  while ((match = fromPattern.exec(lowerSql)) !== null && matchCount++ < MAX_MATCHES) {
    const tableName = match[1];
    const alias = match[2] || tableName;
    tableMap.set(alias, tableName);
  }

  return tableMap.size > 0 ? tableMap : null;
};
function extractCteColumns(body: string, tables: TableSchema[] = []): string[] {
  const columns: string[] = [];
  const selectMatch = body.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  if (!selectMatch) return columns;

  const selectList = selectMatch[1].trim();

  // SELECT * → lấy columns từ table trong CTE body
  if (selectList === '*') {
    const fromMatch = body.match(/FROM\s+(\w+)/i);
    if (fromMatch) {
      const tableName = fromMatch[1].toLowerCase();
      const schema = tables.find((t) => t.name === tableName);
      return schema?.columns ?? [];
    }
    return [];
  }

  const parts = selectList.split(',').map((p) => p.trim());
  for (const part of parts) {
    if (part === '*') continue;
    // expr AS alias
    const asMatch = part.match(/\bAS\s+(\w+)\s*$/i);
    if (asMatch) { columns.push(asMatch[1]); continue; }
    // expr alias (bare)
    const bareMatch = part.match(/\w+\s+(\w+)\s*$/);
    if (bareMatch && !SQL_KEYWORD_SET.has(bareMatch[1].toUpperCase())) {
      columns.push(bareMatch[1]); continue;
    }
    // bare column
    const colMatch = part.match(/(\w+)\s*$/);
    if (colMatch) columns.push(colMatch[1]);
  }
  return columns;
}

function lastIndexOfKeyword(upper: string, keyword: string): number {
  const re = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'g');
  let pos = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(upper)) !== null) pos = m.index;
  return pos;
}

export function extractCtes(sql: string, tables: TableSchema[] = []): CteSchema[] {
  const ctes: CteSchema[] = [];

  const withPos = sql.search(/\bWITH\b/i);
  if (withPos === -1) return ctes;

  // Skip "WITH"
  let remaining = sql.slice(withPos + 4);

  const cteNameRe = /^\s*(\w+)\s+AS\s*\(/i;

  while (true) {
    const nameMatch = remaining.match(cteNameRe);
    if (!nameMatch) break;

    const name = nameMatch[1].toLowerCase();
    const startIdx = nameMatch[0].length; // position right after opening (

    // Find matching closing paren
    let depth = 1;
    let i = startIdx;
    while (i < remaining.length && depth > 0) {
      if (remaining[i] === '(') depth++;
      else if (remaining[i] === ')') depth--;
      i++;
    }

    const body = remaining.slice(startIdx, i - 1);
    ctes.push({
      name,
      columns: extractCteColumns(body, tables),
    });

    remaining = remaining.slice(i);

    // Nếu tiếp theo là "," → còn CTE nữa, nếu là SELECT/INSERT/... → hết
    const next = remaining.match(/^\s*(,|SELECT|INSERT|UPDATE|DELETE|;)/i);
    if (!next || next[1].toUpperCase() !== ',') break;
    remaining = remaining.slice(next[0].length);
  }

  return ctes;
}

// ─── Alias extractor ──────────────────────────────────────────────────────────

export function extractAliases(sql: string, ctes: CteSchema[] = []): AliasMap {
  const aliases: AliasMap = {};

  // CTE names
  for (const cte of ctes) {
    aliases[cte.name] = cte.name;
  }

  // FROM/JOIN table (AS)? alias
  const fromJoinRe = /(?:FROM|JOIN)\s+(\w+)(?:\s+AS\s+|\s+)(\w+)/gi;
  let m: RegExpExecArray | null;
  while ((m = fromJoinRe.exec(sql)) !== null) {
    const [, table, alias] = m;
    if (!SQL_KEYWORD_SET.has(alias.toUpperCase())) {
      aliases[alias.toLowerCase()] = table.toLowerCase();
    }
    aliases[table.toLowerCase()] = table.toLowerCase();
  }

  // Bare table (no alias)
  const bareRe = /(?:FROM|JOIN)\s+(\w+)\s*(?:$|WHERE|ON|GROUP|ORDER|HAVING|LIMIT|INNER|LEFT|RIGHT|CROSS|FULL|JOIN|,|\))/gi;
  while ((m = bareRe.exec(sql)) !== null) {
    const table = m[1].toLowerCase();
    if (!aliases[table]) aliases[table] = table;
  }

  return aliases;
}

// ─── detectContext ────────────────────────────────────────────────────────────

export function detectContext(
  textBeforeCursor: string,
  fullText?: string,
  ctes: CteSchema[] = [],
): SqlContext {
  const text = textBeforeCursor;
  const upper = text.toUpperCase();
  const aliases = extractAliases(fullText ?? text, ctes);

  console.log('[detectContext] text:', text.slice(-20));
  console.log('[detectContext] aliases count:', Object.keys(aliases).length);

  let lastTablePos = -1;
  let lastTableKw = '';
  for (const kw of TABLE_TRIGGERS) {
    const pos = lastIndexOfKeyword(upper, kw);
    if (pos > lastTablePos) { lastTablePos = pos; lastTableKw = kw; }
  }

  let lastColumnPos = -1;
  for (const kw of ['GROUP\\s+BY', 'ORDER\\s+BY']) {
    const pos = lastIndexOfKeyword(upper, kw);
    if (pos > lastColumnPos) lastColumnPos = pos;
  }
  for (const kw of COLUMN_TRIGGERS) {
    const pos = lastIndexOfKeyword(upper, kw);
    if (pos > lastColumnPos) lastColumnPos = pos;
  }

  // Dot notation
  const dotMatch = text.match(/(\w+)\.\s*$/);
  if (dotMatch) {
    const id = dotMatch[1].toLowerCase();
    const resolvedTable = aliases[id] ?? id;
    return { type: 'column_of', resolvedTable, aliases };
  }

  if (lastTablePos === -1 && lastColumnPos === -1) return { type: 'keyword' };

  // Actually let's keep the logic but log it
  const finalCtx = (lastTablePos > lastColumnPos) ?
    ((() => {
      const afterTrigger = text.slice(lastTablePos + lastTableKw.length);
      const endsWithSpace = /[\s,]$/.test(afterTrigger);
      if (!endsWithSpace) return { type: 'table' as const };
      const trimmed = afterTrigger.trimStart();
      const tokens = trimmed.split(/[\s,()]+/).filter(Boolean);
      const hasCompletedTable = tokens.length > 0 && !SQL_KEYWORD_SET.has(tokens[0].toUpperCase()) && /\s/.test(afterTrigger.trimStart().slice(tokens[0].length));
      if (hasCompletedTable) return { type: 'keyword' as const };
      return { type: 'table' as const };
    })()) : { type: 'column' as const, aliases };

  console.log('[detectContext] finalCtx:', finalCtx.type);
  return finalCtx;
}
export function buildSuggestions(
  monaco: Monaco,
  range: Range,
  tables: TableSchema[],
  model: any,
  position: any,
) {
  const fullText = model.getValue();
  const ctes = extractCtes(fullText, tables);  // ← truyền tables để resolve SELECT *
  console.log('[buildSuggestions] tables count:', tables.length);
  console.log('[buildSuggestions] ctes count:', ctes.length);
  const textBeforeCursor = model.getValueInRange({
    startLineNumber: 1, startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
  const { CompletionItemKind: K, CompletionItemInsertTextRule: R } = monaco.languages;

  const ctx = detectContext(textBeforeCursor, fullText, ctes);

  function resolveColumns(name: string): string[] {
    const cte = ctes.find((c) => c.name === name.toLowerCase());
    if (cte) return cte.columns;
    return tables.find((t) => t.name === name)?.columns ?? [];
  }

  switch (ctx.type) {

    case 'keyword':
      return [
        ...PG_KEYWORDS.map((kw) => ({
          label: kw, kind: K.Keyword, insertText: kw, sortText: `2_${kw}`, range,
        })),
        ...SNIPPETS.map((s) => ({
          label: s.label, kind: K.Snippet, detail: s.detail,
          sortText: `1_${s.label}`,
          insertText: s.insertText, insertTextRules: R.InsertAsSnippet, range,
        })),
      ];

    case 'table':
      return [
        // Real tables
        ...tables.map((t) => ({
          label: t.name, kind: K.Class,
          detail: `table · ${t.columns.length} cols`,
          insertText: t.name, range,
          sortText: `1_${t.name}`,
        })),
        // CTE names
        ...ctes.map((c) => ({
          label: c.name, kind: K.Module,
          detail: `cte · ${c.columns.length} cols`,
          insertText: c.name, range,
          sortText: `2_${c.name}`,
        })),
      ];

    case 'column': {
      const { aliases } = ctx;
      const usedTables = new Set(Object.values(aliases));

      const cols: { label: string; kind: any; insertText: string; detail: string; range: Range }[] = [];

      for (const tableName of usedTables) {
        const columns = resolveColumns(tableName);
        cols.push(...columns.map((col) => ({
          label: col, kind: K.Field,
          insertText: col,
          sortText: `1_${col}`,   // ← field lên đầu
          detail: `↳ ${tableName}`,
          range,
        })));
      }

      const aliasSuggestions = Object.entries(aliases).map(([alias, tableName]) => ({
        label: alias, kind: K.Variable,
        insertText: alias,
        detail: alias !== tableName ? `alias → ${tableName}` : 'table',
        sortText: `2_${alias}`,
        range,
      }));

      return [
        ...aliasSuggestions,
        ...cols,
        ...PG_FUNCTIONS.map((fn) => ({
          label: fn.label, kind: K.Function,
          insertText: fn.insertText,
          insertTextRules: R.InsertAsSnippet,
          sortText: `3_${fn.label}`,
          detail: fn.detail, range,
        })),
        ...PG_KEYWORDS.map((kw) => ({ label: kw, kind: K.Keyword, insertText: kw, sortText: `4_${kw}`, range })),
      ];
    }

    case 'column_of': {
      const { resolvedTable } = ctx;
      const columns = resolveColumns(resolvedTable);
      if (!columns.length) return [];

      return columns.map((col) => ({
        label: col, kind: K.Field,
        insertText: col,
        sortText: `1_${col}`,
        detail: `↳ ${resolvedTable}`,
        range,
      }));
    }
  }
}

export function parseConnectionSchema(connection: any): TableSchema[] {
  return (connection?.children ?? [])           // schemas: [public, ...]
    .flatMap((schema: any) => schema.children ?? [])  // tables
    .map((table: any) => ({
      name: table.name,
      columns: (
        table.children
          ?.find((c: any) => c.name === 'Columns')
          ?.children ?? []
      ).map((col: any) => col.name as string),
    }));
}

export function getQueryAtCursor(model: any, position: any, monaco: any): { text: string; range: any } | null {
  const fullText: string = model.getValue();
  const cursorOffset: number = model.getOffsetAt(position);

  const statements: { text: string; start: number; end: number }[] = [];
  let currentStart = 0;
  let inQuote: string | null = null;

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];

    // Handle quotes
    if ((char === "'" || char === '"') && fullText[i - 1] !== '\\') {
      if (!inQuote) inQuote = char;
      else if (inQuote === char) inQuote = null;
    }

    // Handle statement end
    if (char === ';' && !inQuote) {
      statements.push({
        text: fullText.substring(currentStart, i + 1),
        start: currentStart,
        end: i + 1
      });
      currentStart = i + 1;
    }
  }

  if (currentStart < fullText.length) {
    statements.push({
      text: fullText.substring(currentStart),
      start: currentStart,
      end: fullText.length
    });
  }

  let targetStatement: { text: string; start: number; end: number } | null = null;

  for (const s of statements) {
    if (cursorOffset >= s.start && cursorOffset <= s.end) {
      const segmentBeforeCursor = fullText.substring(s.start, cursorOffset).trim();
      const segmentAfterCursor = fullText.substring(cursorOffset, s.end).trim();

      if (!segmentBeforeCursor && !segmentAfterCursor) {
        continue;
      }

      targetStatement = s;
      break;
    }
  }

  if (!targetStatement || !targetStatement.text.trim()) {
    for (let i = statements.length - 1; i >= 0; i--) {
      const s = statements[i];
      if (s.end <= cursorOffset && s.text.trim()) {
        targetStatement = s;
        break;
      }
    }
  }

  if (!targetStatement || !targetStatement.text.trim()) return null;

  const trimmedSql = targetStatement.text.trim();
  const relativeStart = targetStatement.text.indexOf(trimmedSql);
  const actualStartOffset = targetStatement.start + relativeStart;
  const actualEndOffset = actualStartOffset + trimmedSql.length;

  const startPos = model.getPositionAt(actualStartOffset);
  const endPos = model.getPositionAt(actualEndOffset);

  return {
    text: trimmedSql,
    range: new monaco.Range(
      startPos.lineNumber,
      startPos.column,
      endPos.lineNumber,
      endPos.column
    )
  };
}