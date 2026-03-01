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
  | { type: 'none' }
  | { type: 'operator' }
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
  // ✅ Thêm join modifiers đứng độc lập
  'CROSS', 'INNER', 'OUTER', 'FULL', 'LEFT', 'RIGHT', 'NATURAL',
  'LATERAL', 'WHERE', 'SET', 'VALUES', 'RETURNING', 'USING',
]);
const OPERATORS = [
  { label: '=', insertText: '= ' },
  { label: '!=', insertText: '!= ' },
  { label: '>', insertText: '> ' },
  { label: '<', insertText: '< ' },
  { label: '>=', insertText: '>= ' },
  { label: '<=', insertText: '<= ' },
  { label: 'IS NULL', insertText: 'IS NULL' },
  { label: 'IS NOT NULL', insertText: 'IS NOT NULL' },
  { label: 'IN', insertText: 'IN ()' },
  { label: 'NOT IN', insertText: 'NOT IN ()' },
  { label: 'LIKE', insertText: "LIKE '%'" },
  { label: 'BETWEEN', insertText: 'BETWEEN ' },
];
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
function extractCteColumns(body: string, tables: TableSchema[] = [], ctes: CteSchema[] = []): string[] {
  const columns: string[] = [];
  const selectMatch = body.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  if (!selectMatch) return columns;

  const selectList = selectMatch[1].trim();
  const fromBody = body.slice(body.search(/\bFROM\b/i));

  const localAliases: Record<string, string> = {};
  const aliasRe = /(?:FROM|JOIN)\s+(\w+)(?:\s+AS\s+|\s+)(\w+)/gi;
  let m: RegExpExecArray | null;
  while ((m = aliasRe.exec(fromBody)) !== null) {
    localAliases[m[2].toLowerCase()] = m[1].toLowerCase();
  }

  function resolveLocalColumns(name: string): string[] {
    const lower = name.toLowerCase();
    const cte = ctes.find(c => c.name === lower);
    if (cte) return cte.columns;
    return tables.find(t => t.name.toLowerCase() === lower)?.columns ?? [];
  }

  // ✅ Helper: kiểm tra có phải keyword không
  const isKeyword = (word: string) => SQL_KEYWORD_SET.has(word.toUpperCase());

  const parts = selectList.split(',').map(p => p.trim());

  for (const part of parts) {
    // alias.*
    const starMatch = part.match(/^(\w+)\.\*$/);
    if (starMatch) {
      const alias = starMatch[1].toLowerCase();
      const tableName = localAliases[alias] ?? alias;
      columns.push(...resolveLocalColumns(tableName));
      continue;
    }

    // SELECT *
    if (part === '*') {
      const fromMatch = fromBody.match(/FROM\s+(\w+)/i);
      if (fromMatch) {
        columns.push(...resolveLocalColumns(fromMatch[1]));
      }
      continue;
    }

    // expr AS alias
    const asMatch = part.match(/\bAS\s+(\w+)\s*$/i);
    if (asMatch) {
      const col = asMatch[1];
      if (!isKeyword(col)) columns.push(col);  // ✅
      continue;
    }

    // bare alias (no AS)
    const bareMatch = part.match(/\w+\s+(\w+)\s*$/);
    if (bareMatch && !isKeyword(bareMatch[1])) {  // ✅
      columns.push(bareMatch[1]);
      continue;
    }

    // bare column
    const colMatch = part.match(/(\w+)\s*$/);
    if (colMatch && !isKeyword(colMatch[1])) {  // ✅
      columns.push(colMatch[1]);
    }
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

  let remaining = sql.slice(withPos + 4);

  const cteNameRe = /^\s*(\w+)\s+AS\s*\(/i;

  while (true) {
    const nameMatch = remaining.match(cteNameRe);
    if (!nameMatch) break;

    const name = nameMatch[1].toLowerCase();
    const startIdx = nameMatch[0].length;

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
      columns: extractCteColumns(body, tables, ctes), // ← truyền ctes đã parse để resolve chain
    });

    remaining = remaining.slice(i);

    const next = remaining.match(/^\s*(,|SELECT|INSERT|UPDATE|DELETE|;)/i);
    if (!next || next[1].toUpperCase() !== ',') break;
    remaining = remaining.slice(next[0].length);
  }

  return ctes;
}

// ─── Alias extractor ──────────────────────────────────────────────────────────

export function extractAliases(sql: string, ctes: CteSchema[] = []): AliasMap {
  const aliases: AliasMap = {};

  const cteNames = new Set(ctes.map(c => c.name.toLowerCase()));

  // Pass 1: FROM/JOIN table AS alias hoặc FROM/JOIN table alias
  const fromJoinRe = /(?:FROM|JOIN)\s+(\w+)(?:\s+AS\s+|\s+)(\w+)/gi;
  let m: RegExpExecArray | null;
  while ((m = fromJoinRe.exec(sql)) !== null) {
    const table = m[1].toLowerCase();
    const alias = m[2].toLowerCase();
    if (!SQL_KEYWORD_SET.has(alias.toUpperCase())) {
      aliases[alias] = table;
    }
    aliases[table] = table;
  }

  // Pass 2: bare table không có alias
  const bareRe = /(?:FROM|JOIN)\s+(\w+)\s*(?:$|WHERE|ON|GROUP|ORDER|HAVING|LIMIT|INNER|LEFT|RIGHT|CROSS|FULL|JOIN|,|\))/gi;
  while ((m = bareRe.exec(sql)) !== null) {
    const table = m[1].toLowerCase();
    if (!aliases[table]) aliases[table] = table;
  }

  // Pass 3: trailing (query chưa hoàn chỉnh)
  const trailingRe = /(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s*$/gi;
  while ((m = trailingRe.exec(sql)) !== null) {
    const table = m[1].toLowerCase();
    const alias = m[2]?.toLowerCase();
    aliases[table] = table;
    if (alias && !SQL_KEYWORD_SET.has(alias.toUpperCase())) {
      aliases[alias] = table;
    }
  }

  return aliases;
}
function extractCurrentCteScope(fullText: string, cursorOffset: number): string {
  // Tìm CTE block (name AS (...)) nào đang bao quanh cursor
  const cteRe = /\b(\w+)\s+AS\s*\(/gi;
  let match: RegExpExecArray | null;

  while ((match = cteRe.exec(fullText)) !== null) {
    // Vị trí của dấu '(' mở CTE
    const openParen = match.index + match[0].length - 1;

    // Nếu '(' đã vượt qua cursor thì dừng
    if (openParen >= cursorOffset) break;

    // Tìm closing paren tương ứng
    let depth = 1;
    let i = openParen + 1;
    while (i < fullText.length && depth > 0) {
      if (fullText[i] === '(') depth++;
      else if (fullText[i] === ')') depth--;
      i++;
    }
    const closeParen = i - 1;

    // Cursor nằm trong CTE block này
    if (cursorOffset >= openParen && cursorOffset <= closeParen) {
      return fullText.slice(openParen + 1, closeParen);
    }
  }

  // Cursor nằm ở final SELECT (ngoài mọi CTE)
  return fullText;
}
// ─── detectContext ────────────────────────────────────────────────────────────

export function detectContext(
  textBeforeCursor: string,
  fullText?: string,
  ctes: CteSchema[] = [],
  cursorOffset?: number,
): SqlContext {
  const text = textBeforeCursor;
  const upper = text.toUpperCase();
  const offset = cursorOffset ?? text.length;

  // ── DDL guard ──────────────────────────────────────────────────────────────
  if (/\bALTER\s+TABLE\b/i.test(upper)) {
    const afterAlterTable = upper.replace(/^[\s\S]*\bALTER\s+TABLE\s+/i, '');
    const tokens = afterAlterTable.trim().split(/\s+/);
    if (tokens.length <= 1) return { type: 'table' };
    return { type: 'none' };
  }
  if (/\bCREATE\s+TABLE\b/i.test(upper)) {
    return { type: 'none' };
  }
  
  
  // ── Xác định CTE đang chứa cursor để loại khỏi aliases ──────────────────
  const currentCteName = fullText
    ? getCurrentCteName(fullText, offset)
    : null;
  // ✅ Nếu không nằm trong CTE nào → dùng final SELECT scope
  const scope = fullText
    ? (currentCteName
        ? extractCurrentCteScope(fullText, offset)
        : extractFinalSelectScope(fullText))       // ← thêm branch này
    : text;

  // CTEs có thể dùng trong scope này (loại bỏ CTE hiện tại)
  const visibleCtes = currentCteName
    ? ctes.filter(c => c.name !== currentCteName)
    : ctes;
    // ── LIMIT / OFFSET guard ───────────────────────────────────────────────────
  const limitOffsetMatch = text.match(/\b(LIMIT|OFFSET)\s*(\w*)$/i);
  if (limitOffsetMatch) {
    return { type: 'none' }; // chỉ cần số, không suggest gì
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── ORDER BY / GROUP BY guard → suggest columns ───────────────────────────
  const orderGroupMatch = text.match(/\b(ORDER|GROUP)\s+BY\s+[\w\s,]*$/i);
  if (orderGroupMatch) {
    const scope = fullText ? extractCurrentCteScope(fullText, offset) : text;
    const aliases = extractAliases(scope, visibleCtes);
    return { type: 'column', aliases };
  }
  // ── Dot notation ──────────────────────────────────────────────────────────
  const dotMatch = text.match(/(\w+)\.(\w*)$/);
  if (dotMatch) {
    const id = dotMatch[1].toLowerCase();
    const aliasesInScope = extractAliases(scope, visibleCtes);   // ← visibleCtes
    const aliasesBeforeCursor = extractAliases(text, visibleCtes);
    const mergedAliases = { ...aliasesBeforeCursor, ...aliasesInScope };
    const resolvedTable = mergedAliases[id] ?? id;
    return { type: 'column_of', resolvedTable, aliases: mergedAliases };
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ✅ Dùng scope thay vì fullText → chỉ lấy alias trong CTE hiện tại
  const aliases = extractAliases(scope, visibleCtes);
  console.log('[detectContext] text:', text.slice(-20));
  console.log('[detectContext] aliases count:', Object.keys(aliases).length);

  let lastTablePos = -1;
  let lastTableKw = '';
  const upperScope = scope.toUpperCase(); // dùng scope để detect trigger position
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

  if (lastTablePos === -1 && lastColumnPos === -1) return { type: 'keyword' };

  const finalCtx = (lastTablePos > lastColumnPos) ?
    ((() => {
      const afterTrigger = text.slice(lastTablePos + lastTableKw.length);
      const endsWithSpace = /[\s,]$/.test(afterTrigger);
      if (!endsWithSpace) return { type: 'table' as const };
      const trimmed = afterTrigger.trimStart();
      const tokens = trimmed.split(/[\s,()]+/).filter(Boolean);
      const hasCompletedTable = tokens.length > 0
        && !SQL_KEYWORD_SET.has(tokens[0].toUpperCase())
        && /\s/.test(afterTrigger.trimStart().slice(tokens[0].length));
      if (hasCompletedTable) return { type: 'keyword' as const };
      return { type: 'table' as const };
    })()) : (() => {
      // ✅ Check nếu token cuối là identifier → cần operator
      const trimmed = text.trimEnd();
      const lastToken = trimmed.match(/(\w+)\s*$/)?.[1] ?? '';
      const endsWithSpace = text !== trimmed; // có space sau token

      if (
        endsWithSpace &&
        lastToken.length > 0 &&
        !SQL_KEYWORD_SET.has(lastToken.toUpperCase())
      ) {
        return { type: 'operator' as const };
      }

      return { type: 'column' as const, aliases };
    })();

  console.log('[detectContext] finalCtx:', finalCtx.type);
  return finalCtx;
}
function getCurrentCteName(fullText: string, cursorOffset: number): string | null {
  const cteRe = /\b(\w+)\s+AS\s*\(/gi;
  let match: RegExpExecArray | null;
  let currentCte: string | null = null;

  while ((match = cteRe.exec(fullText)) !== null) {
    const openParen = match.index + match[0].length - 1;
    if (openParen >= cursorOffset) break;

    // Tìm closing paren
    let depth = 1;
    let i = openParen + 1;
    while (i < fullText.length && depth > 0) {
      if (fullText[i] === '(') depth++;
      else if (fullText[i] === ')') depth--;
      i++;
    }
    const closeParen = i - 1;

    if (cursorOffset >= openParen && cursorOffset <= closeParen) {
      currentCte = match[1].toLowerCase();
    }
  }

  return currentCte;
}
function extractFinalSelectScope(fullText: string): string {
  // Tìm SELECT cuối cùng nằm ngoài mọi CTE (depth = 0)
  let depth = 0;
  let finalSelectPos = -1;

  for (let i = 0; i < fullText.length; i++) {
    if (fullText[i] === '(') depth++;
    else if (fullText[i] === ')') depth--;

    if (depth === 0) {
      const slice = fullText.slice(i);
      if (/^SELECT\b/i.test(slice)) {
        finalSelectPos = i;
      }
    }
  }

  return finalSelectPos !== -1 ? fullText.slice(finalSelectPos) : fullText;
}
export function buildSuggestions(
  monaco: Monaco,
  range: Range,
  tables: TableSchema[],
  model: any,
  position: any,
) {
  const fullText = model.getValue();
  const cursorOffset = model.getOffsetAt(position);
  const allCtes = extractCtes(fullText, tables);  // ← truyền tables để resolve SELECT *
  const ctes = allCtes.filter(cte => {
    const cteDefRe = new RegExp(`\\b${cte.name}\\s+AS\\s*\\(`, 'i');
    const match = cteDefRe.exec(fullText);
    return match ? match.index < cursorOffset : true;
  });
  const textBeforeCursor = model.getValueInRange({
    startLineNumber: 1, startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
  const { CompletionItemKind: K, CompletionItemInsertTextRule: R } = monaco.languages;

  const ctx = detectContext(textBeforeCursor, fullText, ctes, cursorOffset);
  if (ctx.type === 'none') return [];
  function resolveColumns(name: string): string[] {
    const lower = name.toLowerCase();
    const cte = ctes.find((c) => c.name === lower);
    if (cte) return cte.columns;
    return tables.find((t) => t.name.toLowerCase() === lower)?.columns ?? [];
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
    case 'operator':
      return OPERATORS.map((op, i) => ({
        label: op.label,
        kind: K.Operator,
        insertText: op.insertText,
        sortText: `a_${String(i).padStart(2, '0')}`,
        range,
      }));
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

      const colAliasMap = new Map<string, string[]>();

      for (const [alias, tableName] of Object.entries(aliases)) {
        const hasAlias = Object.entries(aliases).some(
          ([a, t]) => t === tableName && a !== tableName
        );
        if (hasAlias && alias === tableName) continue;

        for (const col of resolveColumns(tableName)) {
          if (!colAliasMap.has(col)) colAliasMap.set(col, []);
          colAliasMap.get(col)!.push(alias);
        }
      }

      const cols: any[] = [];
      for (const [col, aliasList] of colAliasMap.entries()) {
        if (aliasList.length === 1) {
          const alias = aliasList[0];
          cols.push({
            label: col,
            kind: K.Field,
            insertText: col,
            filterText: col,          // ← Monaco filter chỉ dựa trên col name
            sortText: `a_${col}`,     // ← 'a' < 'b' < 'c' < 'd'
            detail: `↳ ${alias}`,
            range,
          });
        } else {
          for (const alias of aliasList) {
            const tableName = aliases[alias];
            cols.push({
              label: `${alias}.${col}`,
              kind: K.Field,
              insertText: `${alias}.${col}`,
              filterText: `${alias}.${col}`,
              sortText: `a_${alias}_${col}`,
              detail: `↳ ${tableName}`,
              range,
            });
          }
        }
      }

      const aliasSuggestions = Object.entries(aliases).map(([alias, tableName]) => ({
        label: alias,
        kind: K.Variable,
        insertText: alias,
        filterText: alias,
        sortText: `b_${alias}`,       // ← sau columns
        detail: alias !== tableName ? `alias → ${tableName}` : 'table',
        range,
      }));

      return [
        ...cols,                      // ← columns trước
        ...aliasSuggestions,          // ← aliases/tables sau
        ...PG_FUNCTIONS.map((fn) => ({
          label: fn.label, kind: K.Function,
          insertText: fn.insertText,
          insertTextRules: R.InsertAsSnippet,
          filterText: fn.label,
          sortText: `c_${fn.label}`,  // ← functions sau aliases
          detail: fn.detail, range,
        })),
        ...PG_KEYWORDS.map((kw) => ({
          label: kw, kind: K.Keyword,
          insertText: kw,
          filterText: kw,
          sortText: `d_${kw}`,        // ← keywords cuối
          range,
        })),
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