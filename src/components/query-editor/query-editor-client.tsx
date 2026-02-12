"use client";

import * as React from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useSidebarStore } from "@/stores/sidebar-store";
import { read } from "fs";

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

const DEFAULT_EDITOR_FONT_SIZE = 14;
const FONT_SIZE_STORAGE_KEY = "usql:editorFontSize";

type QueryEditorClientProps = {
  value: string;
  onChange: (value: string) => void;
  documentUri?: string;
  isDark: boolean;
  language: string;
  readonly: boolean;
  resolveFontFamily: () => string;
  applyEditorTheme: (monaco: any, isDark: boolean) => void;
  onEditorMount?: (getSelectedText: () => string | null) => void;
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

type TableColumn = {
  name: string;
  isPrimary: boolean;
  isForeign: boolean;
};

type AliasTableRef = {
  tableName: string;
  schemaName?: string;
};

const normalizeIdentifier = (value: string) => value.replace(/"/g, "").trim();

const parseAliasMap = (sql: string) => {
  const aliasMap = new Map<string, AliasTableRef>();
  const aliasRegex =
    /\b(from|join|update|into)\s+([a-zA-Z0-9_."-]+)\s+(?:as\s+)?([a-zA-Z0-9_"]+)/gi;
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
  language = "sql",
  resolveFontFamily,
  applyEditorTheme,
  readonly = false,
  onEditorMount
}: QueryEditorClientProps) {
  const [MonacoEditor, setMonacoEditor] = React.useState<any>(null);
  const [editorFontSize, setEditorFontSize] = React.useState(
    DEFAULT_EDITOR_FONT_SIZE,
  );
  const editorRef = React.useRef<MonacoEditor.IStandaloneCodeEditor | null>(
    null,
  );
  const monacoRef = React.useRef<typeof import("monaco-editor") | null>(null);
  const completionDisposableRef = React.useRef<{ dispose: () => void } | null>(
    null,
  );
  const tableSuggestionsRef = React.useRef<TableSuggestion[]>([]);
  const aliasMapRef = React.useRef<Map<string, AliasTableRef>>(new Map());
  const columnSuggestionsRef = React.useRef<ColumnSuggestion[]>([]);
  const columnsCacheRef = React.useRef<Map<string, TableColumn[]>>(new Map());
  const columnsPromiseRef = React.useRef<
    Map<string, Promise<TableColumn[] | undefined>>
  >(new Map());
  const [sqlParser, setSqlParser] = React.useState<null | {
    parse: (input: string, options?: { locationTracking?: boolean }) => unknown;
  }>(null);
  const queryTabs = useSidebarStore((state) => state.queryTabs);
  const activeQueryTabId = useSidebarStore((state) => state.activeQueryTabId);
  const connections = useSidebarStore((state) => state.connections);
  const selectedSchema = useSidebarStore((state) => state.selectedSchema);
  const setTableColumnsLoading = useSidebarStore(
    (state) => state.setTableColumnsLoading,
  );
  const setTableColumnsError = useSidebarStore(
    (state) => state.setTableColumnsError,
  );
  const setTableColumns = useSidebarStore((state) => state.setTableColumns);
  const electronApi = (
    globalThis as typeof globalThis & { electron?: Window["electron"] }
  ).electron;
  const getColumns = electronApi?.getColumns;

  const activeTab = React.useMemo(() => {
    if (queryTabs.length === 0) {
      return undefined;
    }

    return queryTabs.find((tab) => tab.id === activeQueryTabId) ?? queryTabs[0];
  }, [activeQueryTabId, queryTabs]);

  const activeConnection = React.useMemo(() => {
    if (!activeTab?.context?.connectionId) {
      return undefined;
    }

    return connections.find(
      (connection) => connection.config.id === activeTab.context?.connectionId,
    );
  }, [activeTab?.context?.connectionId, connections]);

  const buildColumnsCacheKey = React.useCallback(
    (connectionId: string, schemaName: string, tableName: string) =>
      `${connectionId}:${schemaName}:${tableName}`,
    [],
  );

  const resolveSchemaName = React.useCallback(
    (tableName: string, schemaHint?: string) => {
      if (!activeConnection) {
        return undefined;
      }

      if (schemaHint) {
        return schemaHint;
      }

      const tabSchema = activeTab?.context?.schema;
      if (tabSchema) {
        return tabSchema;
      }

      const selectedSchemaName =
        selectedSchema?.connectionId === activeConnection.config.id
          ? selectedSchema.name
          : undefined;
      if (selectedSchemaName) {
        return selectedSchemaName;
      }

      const candidates = activeConnection.schemas.filter((schema) =>
        schema.tables.includes(tableName),
      );

      if (candidates.length === 1) {
        return candidates[0].name;
      }

      return undefined;
    },
    [activeConnection, activeTab?.context?.schema, selectedSchema],
  );

  const loadColumnsForTable = React.useCallback(
    async (tableName: string, schemaHint?: string) => {
      if (!activeConnection || !getColumns) {
        return undefined;
      }

      const schemaName = resolveSchemaName(tableName, schemaHint);
      if (!schemaName) {
        return undefined;
      }

      const cacheKey = buildColumnsCacheKey(
        activeConnection.config.id,
        schemaName,
        tableName,
      );

      const cached = columnsCacheRef.current.get(cacheKey);
      if (cached) {
        return cached;
      }

      const inflight = columnsPromiseRef.current.get(cacheKey);
      if (inflight) {
        return await inflight;
      }

      const schema = activeConnection.schemas.find(
        (item) => item.name === schemaName,
      );

      if (!schema) {
        return undefined;
      }

      const existing = schema.tableColumns?.[tableName];
      const loading = schema.tableColumnsLoading?.[tableName];

      if (existing && existing.length > 0) {
        columnsCacheRef.current.set(cacheKey, existing);
        return existing;
      }

      if (loading) {
        return existing;
      }

      const loadPromise = (async () => {
        setTableColumnsLoading(
          activeConnection.config.id,
          schemaName,
          tableName,
          true,
        );
        setTableColumnsError(
          activeConnection.config.id,
          schemaName,
          tableName,
          undefined,
        );

        try {
          const result = await getColumns(
            activeConnection.config,
            schemaName,
            tableName,
          );

          if (result.ok && result.columns) {
            setTableColumns(
              activeConnection.config.id,
              schemaName,
              tableName,
              result.columns,
            );
            columnsCacheRef.current.set(cacheKey, result.columns);
            return result.columns;
          }

          setTableColumnsError(
            activeConnection.config.id,
            schemaName,
            tableName,
            result.message || "Failed to load columns.",
          );
          columnsCacheRef.current.set(cacheKey, []);
          return [];
        } finally {
          columnsPromiseRef.current.delete(cacheKey);
          setTableColumnsLoading(
            activeConnection.config.id,
            schemaName,
            tableName,
            false,
          );
        }
      })();

      columnsPromiseRef.current.set(cacheKey, loadPromise);
      return await loadPromise;
    },
    [
      activeConnection,
      buildColumnsCacheKey,
      getColumns,
      resolveSchemaName,
      setTableColumns,
      setTableColumnsError,
      setTableColumnsLoading,
    ],
  );

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
        (schemaItem) => schemaItem.name === schemaName,
      );
      for (const table of schema?.tables ?? []) {
        if (seen.has(table)) continue;
        seen.add(table);
        suggestions.push({ label: `${table}`, insertText: table });
      }
      return suggestions;
    }

    for (const schema of activeConnection.schemas) {
      for (const table of schema.tables) {
        if (seen.has(table)) continue;
        seen.add(table);
        suggestions.push({ label: `${table}`, insertText: table });
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
  }, [
    activeConnection,
    activeTab?.context?.schema,
    activeTab?.context?.table,
    selectedSchema,
  ]);

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

  React.useEffect(() => {
    if (typeof globalThis === "undefined") {
      return;
    }

    try {
      const stored = globalThis.localStorage?.getItem(FONT_SIZE_STORAGE_KEY);
      const parsed = stored ? Number.parseInt(stored, 10) : NaN;
      if (!Number.isNaN(parsed)) {
        setEditorFontSize(parsed);
      }
    } catch {
      // Ignore storage access errors.
    }
  }, []);

  React.useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    editorRef.current.updateOptions({ fontSize: editorFontSize });
  }, [editorFontSize]);

  React.useEffect(() => {
    let active = true;

    import("pgsql-ast-parser")
      .then((mod) => {
        if (!active) {
          return;
        }

        setSqlParser({ parse: mod.parse });
      })
      .catch(() => {
        if (active) {
          setSqlParser(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();

    if (!monaco || !model || !sqlParser) {
      return;
    }

    const handle = globalThis.setTimeout(() => {
      const text = value ?? "";

      if (!text.trim()) {
        monaco.editor.setModelMarkers(model, "sql-lint", []);
        return;
      }

      try {
        sqlParser.parse(text, { locationTracking: true });
        monaco.editor.setModelMarkers(model, "sql-lint", []);
      } catch (error) {
        const details = error as {
          message?: string;
          location?: {
            start?: { line?: number; column?: number };
            end?: { line?: number; column?: number };
          };
        };
        const startLine = details.location?.start?.line ?? 1;
        const startColumn = details.location?.start?.column ?? 1;
        const endLine = details.location?.end?.line ?? startLine;
        const endColumn = details.location?.end?.column ?? startColumn + 1;

        monaco.editor.setModelMarkers(model, "sql-lint", [
          {
            severity: monaco.MarkerSeverity.Error,
            message: details.message || "SQL syntax error",
            startLineNumber: startLine,
            startColumn,
            endLineNumber: endLine,
            endColumn,
          },
        ]);
      }
    }, 300);

    return () => {
      globalThis.clearTimeout(handle);
    };
  }, [sqlParser, value]);

  React.useEffect(() => {
    const clampFontSize = (next: number) => Math.min(24, Math.max(10, next));

    const applyFontSize = (update: (current: number) => number) => {
      setEditorFontSize((current) => {
        const next = clampFontSize(update(current));
        try {
          globalThis.localStorage?.setItem(FONT_SIZE_STORAGE_KEY, String(next));
        } catch {
          // Ignore storage access errors.
        }
        return next;
      });
    };

    const handleAppearance = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;
      const type = detail?.type;

      if (type === "zoom-in") {
        applyFontSize((current) => current + 1);
        return;
      }

      if (type === "zoom-out") {
        applyFontSize((current) => current - 1);
        return;
      }

      if (type === "zoom-reset") {
        applyFontSize(() => DEFAULT_EDITOR_FONT_SIZE);
      }
    };

    globalThis.addEventListener("usql:appearance", handleAppearance);
    return () =>
      globalThis.removeEventListener("usql:appearance", handleAppearance);
  }, []);

  // Apply theme when it changes
  React.useEffect(() => {
    if (monacoRef.current) {
      applyEditorTheme(monacoRef.current, isDark);
    }
  }, [applyEditorTheme, isDark]);

  const [lang, setLang] = React.useState(language);

  React.useEffect(() => {
    setLang(language);
  }, []);

  const getSelectedText = React.useCallback(() => {
    if (!editorRef.current) return null;
    const selection = editorRef.current.getSelection();
    if (!selection || selection.isEmpty()) return null;
    return editorRef.current.getModel()?.getValueInRange(selection) ?? null;
  }, []);

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
      defaultLanguage={language}
      theme={isDark ? "usql-dark" : "usql-light"}
      path={documentUri}
      value={value}
      onChange={(nextValue: string) => onChange(nextValue ?? "")}
      onMount={(editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        applyEditorTheme(monaco, isDark);

        if (onEditorMount) {
          onEditorMount(() => {
            const selection = editor.getSelection();
            if (!selection || selection.isEmpty()) return null;
            return editor.getModel()?.getValueInRange(selection) ?? null;
          });
        }

        // Configure SQL language
        monaco.languages.setLanguageConfiguration(language, {
          comments: {
            lineComment: "--",
            blockComment: ["/*", "*/"],
          },
          brackets: [
            ["(", ")"],
            ["{", "}"],
            ["[", "]"],
          ],
          autoClosingPairs: [
            { open: "(", close: ")" },
            { open: "{", close: "}" },
            { open: "[", close: "]" },
            { open: "'", close: "'" },
            { open: '"', close: '"' },
            { open: "`", close: "`" },
          ],
        });

        editor.updateOptions({
          fontFamily: resolveFontFamily(),
          tabSize: 2,
          insertSpaces: true,
          renderLineHighlight: "none",
          contextmenu: false,
        });

        if (completionDisposableRef.current) {
          completionDisposableRef.current.dispose();
        }

        completionDisposableRef.current =
          monaco.languages.registerCompletionItemProvider(language, {
            triggerCharacters: ["."],
            provideCompletionItems: async (model, position) => {
              const wordInfo = model.getWordUntilPosition(position);
              const lineUntilPos = model.getValueInRange(
                new monaco.Range(
                  position.lineNumber,
                  1,
                  position.lineNumber,
                  position.column,
                ),
              );
              const aliasMatch = /([a-zA-Z_][\w$"]*)\.([\w$"]*)$/.exec(
                lineUntilPos,
              );
              const aliasName = aliasMatch
                ? normalizeIdentifier(aliasMatch[1])
                : undefined;
              const aliasColumnPrefix = aliasMatch
                ? normalizeIdentifier(aliasMatch[2])
                : "";
              const tokenMatch = /([a-zA-Z_][\w$"]*)$/.exec(lineUntilPos);
              const tokenPrefix = tokenMatch
                ? normalizeIdentifier(tokenMatch[1])
                : "";
              aliasMapRef.current = parseAliasMap(model.getValue());
              const range = new monaco.Range(
                position.lineNumber,
                wordInfo.startColumn,
                position.lineNumber,
                wordInfo.endColumn,
              );
              const keywordPrefix = tokenPrefix.toUpperCase();
              const tablePrefix = tokenPrefix.toLowerCase();
              const columnPrefix = (
                aliasName ? aliasColumnPrefix : tokenPrefix
              ).toLowerCase();

              const aliasSuggestions = Array.from(aliasMapRef.current.keys())
                .filter((alias) => alias.toLowerCase().startsWith(tablePrefix))
                .map((alias) => ({
                  label: alias,
                  kind: monaco.languages.CompletionItemKind.Variable,
                  insertText: alias,
                  range,
                }));

              const keywordSuggestions = KEYWORDS.filter((keyword) =>
                keyword.startsWith(keywordPrefix),
              ).map((keyword) => ({
                label: keyword,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: keyword,
                range,
              }));

              const tableSuggestions = tableSuggestionsRef.current
                .filter((table) =>
                  table.insertText.toLowerCase().startsWith(tablePrefix),
                )
                .map((table) => ({
                  label: table.label,
                  kind: monaco.languages.CompletionItemKind.Class,
                  insertText: table.insertText,
                  range,
                }));

              let columnSuggestions: any[] = [];

              if (aliasName && activeConnection) {
                const aliasRef = aliasMapRef.current.get(aliasName);
                const tableName = aliasRef?.tableName ?? aliasName;
                const schemaName = resolveSchemaName(
                  tableName,
                  aliasRef?.schemaName,
                );
                const schema = schemaName
                  ? activeConnection.schemas.find(
                    (item) => item.name === schemaName,
                  )
                  : undefined;
                let columns = schema?.tableColumns?.[tableName] || [];

                if (columns.length === 0) {
                  const loadedColumns = await loadColumnsForTable(
                    tableName,
                    aliasRef?.schemaName,
                  );
                  if (loadedColumns) {
                    columns = loadedColumns;
                  }
                }

                columnSuggestions = columns
                  .filter((column) =>
                    column.name.toLowerCase().startsWith(columnPrefix),
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
                    column.insertText.toLowerCase().startsWith(columnPrefix),
                  )
                  .map((column) => ({
                    label: column.label,
                    kind: monaco.languages.CompletionItemKind.Field,
                    insertText: column.insertText,
                    detail: column.detail,
                    range,
                  }));
              }

              const orderedSuggestions = [
                ...columnSuggestions,
                ...tableSuggestions,
                ...aliasSuggestions,
                ...keywordSuggestions,
              ];

              const withSortText = orderedSuggestions.map((item, index) => {
                let rank = "9";

                if (item.kind === monaco.languages.CompletionItemKind.Field) {
                  rank = "0";
                } else if (
                  item.kind === monaco.languages.CompletionItemKind.Class
                ) {
                  rank = "1";
                } else if (
                  item.kind === monaco.languages.CompletionItemKind.Variable
                ) {
                  rank = "2";
                } else if (
                  item.kind === monaco.languages.CompletionItemKind.Keyword
                ) {
                  rank = "3";
                }

                return {
                  ...item,
                  sortText: `${rank}-${String(index).padStart(4, "0")}`,
                };
              });
              const uniqueBySortText = Array.from(
                new Map(withSortText.map((item) => [item.sortText, item])).values(),
              )
              return {
                suggestions: uniqueBySortText,
              };
            },
          });

        editor.focus();
      }}
      options={{
        fontSize: editorFontSize,
        fontFamily: resolveFontFamily(),
        tabSize: 2,
        insertSpaces: true,
        renderLineHighlight: "none",
        contextmenu: false,
        minimap: { enabled: false },
        automaticLayout: true,
        readOnly: readonly || false,
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
        },
        suggest: {
          filterGraceful: false,
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
