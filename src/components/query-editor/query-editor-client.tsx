"use client";

import * as React from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useSidebarStore } from "@/stores/sidebar-store";

const KEYWORDS = [
  "ADD",
  "ALL",
  "ALTER",
  "AND",
  "ARRAY",
  "AS",
  "ASC",
  "BEGIN",
  "BETWEEN",
  "BY",
  "CASE",
  "CAST",
  "CHECK",
  "COLUMN",
  "COMMIT",
  "CONSTRAINT",
  "CREATE",
  "CROSS",
  "DATABASE",
  "DEFAULT",
  "DELETE",
  "DESC",
  "DISTINCT",
  "DO",
  "DROP",
  "ELSE",
  "END",
  "EXCEPT",
  "EXISTS",
  "FALSE",
  "FETCH",
  "FILTER",
  "FOR",
  "FOREIGN",
  "FROM",
  "FULL",
  "FUNCTION",
  "GROUP BY",
  "HAVING",
  "IF",
  "ILIKE",
  "IN",
  "INDEX",
  "INNER",
  "INSERT",
  "INTERSECT",
  "INTO",
  "IS",
  "IS NULL",
  "IS NOT NULL",
  "JOIN",
  "JSON",
  "JSONB",
  "KEY",
  "LATERAL",
  "LEFT",
  "LIKE",
  "LIMIT",
  "MATERIALIZED",
  "NOT",
  "NULL",
  "OFFSET",
  "ON",
  "OR",
  "ORDER BY",
  "OUTER",
  "OVER",
  "PARTITION BY",
  "PRIMARY",
  "REFERENCES",
  "RETURNING",
  "RIGHT",
  "ROLLBACK",
  "SELECT",
  "SET",
  "SIMILAR TO",
  "TABLE",
  "THEN",
  "TRUE",
  "UNION",
  "UNIQUE",
  "UPDATE",
  "USING",
  "VALUES",
  "VIEW",
  "WHEN",
  "WHERE",
  "WINDOW",
  "WITH",
];

type QueryEditorClientProps = {
  value: string;
  onChange: (value: string) => void;
  documentUri?: string;
  isDark: boolean;
  resolveFontFamily: () => string;
  applyEditorTheme: (monaco: any, isDark: boolean) => void;
};

type TableSuggestion = {
  label: string;
  insertText: string;
};

type ColumnSuggestion = {
  label: string;
  insertText: string;
  detail?: string;
};

type AliasTableRef = {
  tableName: string;
  schemaName?: string;
};

const normalizeIdentifier = (value: string) =>
  value.replace(/"/g, "").trim();

const parseAliasMap = (sql: string) => {
  const aliasMap = new Map<string, AliasTableRef>();
  const aliasRegex = /\b(from|join|update|into)\s+([a-zA-Z0-9_."-]+)\s+(?:as\s+)?([a-zA-Z0-9_"]+)/gi;
  let match: RegExpExecArray | null = null;

  while ((match = aliasRegex.exec(sql)) !== null) {
    const tableToken = match[2];
    const aliasToken = match[3];

    if (!tableToken || tableToken.startsWith("(")) {
      continue;
    }

    const normalizedAlias = normalizeIdentifier(aliasToken);
    const parts = normalizeIdentifier(tableToken).split(".");
    const tableName = parts[parts.length - 1];
    const schemaName = parts.length > 1 ? parts[parts.length - 2] : undefined;

    if (normalizedAlias && tableName) {
      aliasMap.set(normalizedAlias, { tableName, schemaName });
    }
  }

  return aliasMap;
};

export function QueryEditorClient({
  value,
  onChange,
  documentUri = "file:///query.sql",
  isDark,
  resolveFontFamily,
  applyEditorTheme,
}: QueryEditorClientProps) {
  const [MonacoEditor, setMonacoEditor] = React.useState<any>(null);
  const editorRef = React.useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = React.useRef<typeof import("monaco-editor") | null>(null);
  const completionDisposableRef = React.useRef<{ dispose: () => void } | null>(null);
  const tableSuggestionsRef = React.useRef<TableSuggestion[]>([]);
  const aliasMapRef = React.useRef<Map<string, AliasTableRef>>(new Map());
  const columnSuggestionsRef = React.useRef<ColumnSuggestion[]>([]);
  const queryTabs = useSidebarStore((state) => state.queryTabs);
  const activeQueryTabId = useSidebarStore((state) => state.activeQueryTabId);
  const connections = useSidebarStore((state) => state.connections);
  const selectedSchema = useSidebarStore((state) => state.selectedSchema);

  const activeTab = React.useMemo(() => {
    if (queryTabs.length === 0) {
      return undefined;
    }

    return (
      queryTabs.find((tab) => tab.id === activeQueryTabId) ?? queryTabs[0]
    );
  }, [activeQueryTabId, queryTabs]);

  const activeConnection = React.useMemo(() => {
    if (!activeTab?.context?.connectionId) {
      return undefined;
    }

    return connections.find(
      (connection) => connection.config.id === activeTab.context?.connectionId
    );
  }, [activeTab?.context?.connectionId, connections]);

  const tableSuggestions = React.useMemo<TableSuggestion[]>(() => {
    if (!activeConnection) {
      return [];
    }

    const schemaName =
      activeTab?.context?.schema ??
      (selectedSchema?.connectionId === activeConnection.config.id
        ? selectedSchema.name
        : undefined);

    const suggestions: TableSuggestion[] = [];
    const seen = new Set<string>();

    if (schemaName) {
      const schema = activeConnection.schemas.find(
        (schemaItem) => schemaItem.name === schemaName
      );
      for (const table of schema?.tables ?? []) {
        if (seen.has(table)) continue;
        seen.add(table);
        suggestions.push({ label: `${schemaName}.${table}`, insertText: table });
      }
      return suggestions;
    }

    for (const schema of activeConnection.schemas) {
      for (const table of schema.tables) {
        if (seen.has(table)) continue;
        seen.add(table);
        suggestions.push({ label: `${schema.name}.${table}`, insertText: table });
      }
    }

    return suggestions;
  }, [activeConnection, activeTab?.context?.schema, selectedSchema]);

  const columnSuggestions = React.useMemo<ColumnSuggestion[]>(() => {
    if (!activeConnection) {
      return [];
    }

    const schemaName =
      activeTab?.context?.schema ??
      (selectedSchema?.connectionId === activeConnection.config.id
        ? selectedSchema.name
        : undefined);
    const tableName = activeTab?.context?.table;

    if (!tableName) {
      return [];
    }

    const schema = schemaName
      ? activeConnection.schemas.find((item) => item.name === schemaName)
      : undefined;
    const columns = schema?.tableColumns?.[tableName] ?? [];
    console.log("Column Suggestions:", columns);
    return columns.map((column) => ({
      label: column.name,
      insertText: column.name,
      detail: tableName,
    }));
  }, [activeConnection, activeTab?.context?.schema, activeTab?.context?.table, selectedSchema]);

  React.useEffect(() => {
    tableSuggestionsRef.current = tableSuggestions;
  }, [tableSuggestions]);

  React.useEffect(() => {
    columnSuggestionsRef.current = columnSuggestions;
  }, [columnSuggestions]);

  // Load Monaco dynamically
  React.useEffect(() => {
    import("@monaco-editor/react").then((mod) => {
      setMonacoEditor(() => mod.default);
    });
  }, []);


  // Apply theme when it changes
  React.useEffect(() => {
    if (monacoRef.current) {
      applyEditorTheme(monacoRef.current, isDark);
    }
  }, [applyEditorTheme, isDark]);

  if (!MonacoEditor) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="sql"
      theme={isDark ? "usql-dark" : "usql-light"}
      path={documentUri}
      value={value}
      onChange={(nextValue: string) => onChange(nextValue ?? "")}
      onMount={(editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        
        applyEditorTheme(monaco, isDark);

        // Configure SQL language
        monaco.languages.setLanguageConfiguration('sql', {
          comments: {
            lineComment: '--',
            blockComment: ['/*', '*/'],
          },
          brackets: [
            ['(', ')'],
            ['{', '}'],
            ['[', ']'],
          ],
          autoClosingPairs: [
            { open: '(', close: ')' },
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: "'", close: "'" },
            { open: '"', close: '"' },
            { open: '`', close: '`' },
          ],
        });

        editor.updateOptions({
          fontFamily: resolveFontFamily(),
          renderLineHighlight: "none",
          contextmenu: false,
        });

        if (completionDisposableRef.current) {
          completionDisposableRef.current.dispose();
        }

        completionDisposableRef.current = monaco.languages.registerCompletionItemProvider(
          "sql",
          {
            triggerCharacters: ["."],
            provideCompletionItems: (model, position) => {
              const wordInfo = model.getWordUntilPosition(position);
              const lineUntilPos = model.getValueInRange(
                new monaco.Range(position.lineNumber, 1, position.lineNumber, position.column)
              );
              const aliasMatch = /([a-zA-Z_][\w$\"]*)\.\w*$/.exec(lineUntilPos);
              const aliasName = aliasMatch ? normalizeIdentifier(aliasMatch[1]) : undefined;
              aliasMapRef.current = parseAliasMap(model.getValue());
              const range = new monaco.Range(
                position.lineNumber,
                wordInfo.startColumn,
                position.lineNumber,
                wordInfo.endColumn
              );
              const keywordPrefix = wordInfo.word.toUpperCase();
              const tablePrefix = wordInfo.word.toLowerCase();
              const columnPrefix = wordInfo.word.toLowerCase();

              const aliasSuggestions = Array.from(aliasMapRef.current.keys())
                .filter((alias) => alias.toLowerCase().startsWith(tablePrefix))
                .map((alias) => ({
                  label: alias,
                  kind: monaco.languages.CompletionItemKind.Variable,
                  insertText: alias,
                  range,
                }));

              const keywordSuggestions = KEYWORDS.filter((keyword) =>
                keyword.startsWith(keywordPrefix)
              ).map((keyword) => ({
                label: keyword,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: keyword,
                range,
              }));

              const tableSuggestions = tableSuggestionsRef.current
                .filter((table) =>
                  table.insertText.toLowerCase().startsWith(tablePrefix)
                )
                .map((table) => ({
                  label: table.label,
                  kind: monaco.languages.CompletionItemKind.Class,
                  insertText: table.insertText,
                  range,
                }));

              let columnSuggestions = [];

              if (aliasName && activeConnection) {
                const aliasRef = aliasMapRef.current.get(aliasName);
                const tableName = aliasRef?.tableName ?? aliasName;
                const schema = aliasRef?.schemaName
                  ? activeConnection.schemas.find(
                      (item) => item.name === aliasRef.schemaName
                    )
                  : activeConnection.schemas.find((item) =>
                      item.tables.includes(tableName)
                    );
                const columns = schema?.tableColumns?.[tableName] || [];

                columnSuggestions = columns
                  .filter((column) =>
                    column.name.toLowerCase().startsWith(columnPrefix)
                  )
                  .map((column) => ({
                    label: column.name,
                    kind: monaco.languages.CompletionItemKind.Field,
                    insertText: column.name,
                    detail: tableName,
                    range,
                  }));
              }

              if (columnSuggestions.length === 0) {
                columnSuggestions = columnSuggestionsRef.current
                  .filter((column) =>
                    column.insertText.toLowerCase().startsWith(columnPrefix)
                  )
                  .map((column) => ({
                    label: column.label,
                    kind: monaco.languages.CompletionItemKind.Field,
                    insertText: column.insertText,
                    detail: column.detail,
                    range,
                  }));
              }

              return {
                suggestions: [
                  ...columnSuggestions,
                  ...tableSuggestions,
                  ...aliasSuggestions,
                  ...keywordSuggestions,
                ],
              };
            },
          }
        );


        editor.focus();
      }}
      options={{
        fontSize: 14,
        fontFamily: resolveFontFamily(),
        renderLineHighlight: "none",
        contextmenu: false,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: "on",
        tabCompletion: "on",
      }}
    />
  );
}