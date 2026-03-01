"use client";

import * as React from "react";
import { editor as _MonacoEditor } from "monaco-editor";
import { parse } from "pgsql-ast-parser";
import { toast } from "sonner";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useTabStore } from "@/stores/tab-store";
import { getCurrentStatement, getAllStatements } from "@/lib/utils";

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
const SQL_MARKER_OWNER = "usql:sql-parse";
const SQL_WARNING_OWNER = "usql:sql-warning";
const SQL_VALIDATE_DEBOUNCE = 250;
const MAX_SUGGESTIONS = 25;

const ALWAYS_TRUE_PATTERNS = [
  {
    regex: /\bwhere\s+1\s*=\s*1\b/i,
    message: "WHERE condition is always true.",
  },
  {
    regex: /\bwhere\s+true\b/i,
    message: "WHERE condition is always true.",
  },
];

const getLineColumnFromIndex = (text: string, index: number) => {
  const safeIndex = Math.max(0, Math.min(index, text.length));
  const before = text.slice(0, safeIndex);
  const lines = before.split("\n");
  const line = lines.length;
  const column = (lines[lines.length - 1]?.length ?? 0) + 1;
  return { line, column };
};

const findAlwaysTrueCondition = (sql: string) => {
  for (const pattern of ALWAYS_TRUE_PATTERNS) {
    const match = pattern.regex.exec(sql);
    if (match && typeof match.index === "number") {
      return {
        index: match.index,
        length: match[0]?.length ?? 1,
        message: pattern.message,
      };
    }
  }

  return null;
};

type QueryEditorClientProps = {
  value: string;
  onChange: (value: string) => void;
  documentUri?: string;
  isDark: boolean;
  language: string;
  readonly: boolean;
  resolveFontFamily: () => string;
  applyEditorTheme: (monaco: any, isDark: boolean) => void;
  onEditorMount?: (getSelectedText: () => { text: string; range?: any } | null) => void;
  onEditorFocusChange?: (isFocused: boolean) => void;
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
  dataType?: string;
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

  if (!sql) return aliasMap;

  // Extremely fast CTE name matcher (no internal column scanning to avoid catastrophic backtracking)
  const simpleCteRegex = /\bwith\s+([a-zA-Z0-9_"]+)\s+as\s*\(/gi;
  let cteMatch: RegExpExecArray | null;
  while ((cteMatch = simpleCteRegex.exec(sql)) !== null) {
    const cteName = normalizeIdentifier(cteMatch[1]);
    if (cteName) {
      aliasMap.set(cteName, { tableName: `__cte_${cteName}` });
    }
  }

  // Parse standard FROM/JOIN aliases
  const aliasRegex =
    /\b(from|join|update|into)\s+([a-zA-Z0-9_."-]+)(?:\s+(?:as\s+)?(?!where|and|or|on|inner|left|right|outer|cross|full|join|group|order|limit|union|except|intersect|returning|with|from)([a-zA-Z0-9_"]+))?/gi;

  let match: RegExpExecArray | null;
  while ((match = aliasRegex.exec(sql)) !== null) {
    const tableToken = match[2];

    if (!tableToken || tableToken.startsWith("(")) {
      continue;
    }

    const parts = normalizeIdentifier(tableToken).split(".");
    const tableName = parts[parts.length - 1];
    const schemaName = parts.length > 1 ? parts[parts.length - 2] : undefined;

    // If there is no explicit alias token, use the table name as its own "alias"
    const aliasToken = match[3] || tableName;
    const normalizedAlias = normalizeIdentifier(aliasToken);

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
  onEditorMount,
  onEditorFocusChange,
}: QueryEditorClientProps) {
  const [MonacoEditor, setMonacoEditor] = React.useState<any>(null);
  const [editorFontSize, setEditorFontSize] = React.useState(
    DEFAULT_EDITOR_FONT_SIZE,
  );
  const [editorReady, setEditorReady] = React.useState(false);
  const editorRef = React.useRef<_MonacoEditor.IStandaloneCodeEditor | null>(
    null,
  );
  const editorContainerRef = React.useRef<HTMLDivElement | null>(null);
  const monacoRef = React.useRef<typeof import("monaco-editor") | null>(null);
  const completionDisposableRef = React.useRef<{ dispose: () => void } | null>(
    null,
  );
  const focusDisposableRef = React.useRef<{ dispose: () => void } | null>(null);
  const blurDisposableRef = React.useRef<{ dispose: () => void } | null>(null);
  const inlineErrorZoneIdRef = React.useRef<string | null>(null);
  const inlineWarningZoneIdRef = React.useRef<string | null>(null);
  const tableSuggestionsRef = React.useRef<TableSuggestion[]>([]);
  const aliasMapRef = React.useRef<Map<string, AliasTableRef>>(new Map());
  const columnSuggestionsRef = React.useRef<ColumnSuggestion[]>([]);
  const columnsCacheRef = React.useRef<Map<string, TableColumn[]>>(new Map());
  const columnsPromiseRef = React.useRef<
    Map<string, Promise<TableColumn[] | undefined>>
  >(new Map());
  const playMarginDecorationsCollectionRef = React.useRef<any>(null);
  const queryTabs = useTabStore((state) => state.queryTabs);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const connections = useSidebarStore((state) => state.connections);
  const selectedSchema = useSidebarStore((state) => state.selectedSchema);
  const openSqlTab = useTabStore((state) => state.openSqlTab);
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

  const getSelectedText = React.useCallback(() => {
    if (!editorRef.current) return null;
    const selection = editorRef.current.getSelection();
    if (!selection || selection.isEmpty()) {
      const position = editorRef.current.getPosition();
      const model = editorRef.current.getModel();
      if (position && model) {
        return getCurrentStatement(model as any, position);
      }
      return null;
    }

    const range = {
      startLineNumber: selection.startLineNumber,
      startColumn: selection.startColumn,
      endLineNumber: selection.endLineNumber,
      endColumn: selection.endColumn
    };

    return {
      text: editorRef.current.getModel()?.getValueInRange(selection) ?? "",
      range
    };
  }, []);

  React.useEffect(() => {
    const handleHighlight = (event: Event) => {
      const detail = (event as CustomEvent<{ range?: any }>).detail;
      if (!detail?.range || !editorRef.current || !monacoRef.current) return;

      const editor = editorRef.current;
      const monaco = monacoRef.current;

      const decorations = editor.createDecorationsCollection([
        {
          range: new monaco.Range(
            detail.range.startLineNumber,
            detail.range.startColumn,
            detail.range.endLineNumber,
            detail.range.endColumn
          ),
          options: {
            className: 'usql-execute-highlight',
            inlineClassName: 'usql-execute-highlight',
            isWholeLine: false,
          }
        }
      ]);

      setTimeout(() => {
        decorations.clear();
      }, 400); // highlight for 400ms
    };

    globalThis.addEventListener("usql:highlight-range", handleHighlight);
    return () => globalThis.removeEventListener("usql:highlight-range", handleHighlight);
  }, []);

  React.useEffect(() => {
    return () => {
      focusDisposableRef.current?.dispose();
      blurDisposableRef.current?.dispose();
    };
  }, []);

  const validateSql = React.useCallback(() => {
    if (!monacoRef.current || !editorRef.current) {
      return;
    }

    const model = editorRef.current.getModel();
    if (!model) {
      return;
    }

    try {
      parse(value);
      monacoRef.current.editor.setModelMarkers(model, SQL_MARKER_OWNER, []);
      const warning = findAlwaysTrueCondition(value ?? "");
      if (warning) {
        const position = getLineColumnFromIndex(value, warning.index);
        monacoRef.current.editor.setModelMarkers(model, SQL_WARNING_OWNER, [
          {
            severity: monacoRef.current.MarkerSeverity.Warning,
            message: warning.message,
            startLineNumber: position.line,
            startColumn: position.column,
            endLineNumber: position.line,
            endColumn: position.column + Math.max(warning.length, 1),
          },
        ]);
        const editor = editorRef.current;
        editor.changeViewZones((accessor) => {
          if (inlineWarningZoneIdRef.current !== null) {
            accessor.removeZone(inlineWarningZoneIdRef.current);
          }
          const node = document.createElement("div");
          node.className = "usql-inline-warning-zone";
          node.textContent = warning.message;
          inlineWarningZoneIdRef.current = accessor.addZone({
            afterLineNumber: position.line,
            heightInPx: 16,
            domNode: node,
          });
        });
      } else {
        monacoRef.current.editor.setModelMarkers(model, SQL_WARNING_OWNER, []);
        if (inlineWarningZoneIdRef.current !== null) {
          const editor = editorRef.current;
          editor.changeViewZones((accessor) => {
            if (inlineWarningZoneIdRef.current) {
              accessor.removeZone(inlineWarningZoneIdRef.current);
            }
          });
          inlineWarningZoneIdRef.current = null;
        }
      }

      if (inlineErrorZoneIdRef.current !== null) {
        const editor = editorRef.current;
        editor.changeViewZones((accessor) => {
          if (inlineErrorZoneIdRef.current) {
            accessor.removeZone(inlineErrorZoneIdRef.current);
          }
        });
        inlineErrorZoneIdRef.current = null;
      }
    } catch (error) {
      monacoRef.current.editor.setModelMarkers(model, SQL_WARNING_OWNER, []);
      if (inlineWarningZoneIdRef.current !== null) {
        const editor = editorRef.current;
        editor.changeViewZones((accessor) => {
          if (inlineWarningZoneIdRef.current) {
            accessor.removeZone(inlineWarningZoneIdRef.current);
          }
        });
        inlineWarningZoneIdRef.current = null;
      }
      const details = error as {
        message?: string;
        location?: {
          start?: { line: number; column: number };
          end?: { line: number; column: number };
        };
      };
      const message = details.message ?? "Invalid SQL syntax";
      const messageMatch = /line\s+(\d+)\s+col\s+(\d+)/i.exec(message);
      const messageLine = messageMatch ? Number(messageMatch[1]) : undefined;
      const messageColumn = messageMatch ? Number(messageMatch[2]) : undefined;
      const startLine = details.location?.start?.line ?? messageLine ?? 1;
      const startColumn = Math.max(
        details.location?.start?.column ?? messageColumn ?? 1,
        1,
      );
      const endLine = details.location?.end?.line ?? startLine;
      const endColumn = Math.max(
        details.location?.end?.column ?? startColumn + 1,
        startColumn + 1,
      );

      monacoRef.current.editor.setModelMarkers(model, SQL_MARKER_OWNER, [
        {
          severity: monacoRef.current.MarkerSeverity.Error,
          message,
          startLineNumber: startLine,
          startColumn,
          endLineNumber: endLine,
          endColumn,
        },
      ]);

      const editor = editorRef.current;
      editor.changeViewZones((accessor) => {
        if (inlineErrorZoneIdRef.current !== null) {
          accessor.removeZone(inlineErrorZoneIdRef.current);
        }
        const node = document.createElement("div");
        node.className = "usql-inline-error-zone";
        node.textContent = message;
        inlineErrorZoneIdRef.current = accessor.addZone({
          afterLineNumber: startLine,
          heightInPx: 16,
          domNode: node,
        });
      });
    }
  }, [value]);

  React.useEffect(() => {
    if (!editorReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (language !== "sql") {
        return;
      }

      validateSql();
      aliasMapRef.current = parseAliasMap(value ?? "");

      // Update play margins
      if (editorRef.current && monacoRef.current) {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        const model = editor.getModel();
        if (model) {
          const statements = getAllStatements(value ?? "");
          const newDecorations = statements.map(stmt => {
            const startPos = model.getPositionAt(stmt.startIndex);
            return {
              range: new monaco.Range(startPos.lineNumber, 1, startPos.lineNumber, 1),
              options: {
                isWholeLine: false,
                glyphMarginClassName: 'usql-play-gutter-icon',
              }
            };
          });

          if (!playMarginDecorationsCollectionRef.current) {
            playMarginDecorationsCollectionRef.current = editorRef.current.createDecorationsCollection(newDecorations);
          } else {
            playMarginDecorationsCollectionRef.current.set(newDecorations);
          }
        }
      }

    }, SQL_VALIDATE_DEBOUNCE);

    return () => window.clearTimeout(timeoutId);
  }, [editorReady, validateSql, value, language]);

  const blurEditor = React.useCallback(() => {
    const editorNode = editorRef.current?.getDomNode() as HTMLElement | null;
    if (!editorNode) {
      return;
    }
    const active = document.activeElement;
    if (active && editorNode.contains(active)) {
      (active as HTMLElement).blur();
      return;
    }
    const textarea = editorNode.querySelector("textarea");
    textarea?.blur();
  }, []);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (editorContainerRef.current?.contains(target)) {
        return;
      }
      blurEditor();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [blurEditor]);

  const handleDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [],
  );

  const handleDrop = React.useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length === 0) {
        return;
      }

      const allowedExtensions = new Set([".sql"]);
      const validFiles = files.filter((file) => {
        const name = file.name.toLowerCase();
        return Array.from(allowedExtensions).some((ext) => name.endsWith(ext));
      });

      const invalidFiles = files.filter((file) => !validFiles.includes(file));
      for (const file of invalidFiles) {
        toast.error(
          `Unsupported file: ${file.name}. Only .sql files are allowed.`,
        );
      }

      if (validFiles.length === 0) {
        return;
      }

      const entries = await Promise.all(
        validFiles.map(async (file) => {
          try {
            const sql = await file.text();
            return { file, sql };
          } catch {
            toast.error(`Failed to read file: ${file.name}`);
            return null;
          }
        }),
      );

      for (const entry of entries) {
        if (!entry) {
          continue;
        }

        const filePath = (entry.file as File & { path?: string }).path;
        openSqlTab({
          title: entry.file.name,
          sql: entry.sql,
          filePath: filePath ?? entry.file.name,
        });
      }
    },
    [openSqlTab],
  );

  if (!MonacoEditor) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div
      ref={editorContainerRef}
      className="h-full w-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <style>{`
        .monaco-editor .usql-inline-error-zone {
          color: #dc2626;
          opacity: 0.9;
          font-size: 12px;
          line-height: 18px;
          white-space: pre-wrap;
          font-family: ${resolveFontFamily()};
        }
        .monaco-editor .usql-inline-warning-zone {
          color: #b45309;
          opacity: 0.9;
          font-size: 12px;
          line-height: 18px;
          white-space: pre-wrap;
          font-family: ${resolveFontFamily()};
        }
      `}</style>
      <MonacoEditor
        height="100%"
        defaultLanguage={language}
        theme={isDark ? "usql-dark" : "usql-light"}
        path={documentUri}
        value={value}
        onChange={(nextValue: string) => {
          onChange(nextValue ?? "")
        }}
        onMount={(editor: any, monaco: any) => {
          editorRef.current = editor;
          monacoRef.current = monaco;

          applyEditorTheme(monaco, isDark);

          if (onEditorMount) {
            onEditorMount(getSelectedText);
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
            contextmenu: false, // Enable right-click context menu
            padding: { top: 6 },
            hover: { enabled: false },
          });

          if (completionDisposableRef.current) {
            completionDisposableRef.current.dispose();
          }
          if (focusDisposableRef.current) {
            focusDisposableRef.current.dispose();
          }
          if (blurDisposableRef.current) {
            blurDisposableRef.current.dispose();
          }

          focusDisposableRef.current = editor.onDidFocusEditorText(() => {
            onEditorFocusChange?.(true);
          });
          blurDisposableRef.current = editor.onDidBlurEditorText(() => {
            onEditorFocusChange?.(false);
          });

          editor.onMouseDown((e: any) => {
            if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
              const position = e.target.position;
              if (position) {
                // Select the text of the clicked statement and dispatch execute command
                editor.setPosition(position);
                const model = editor.getModel();
                if (model) {
                  const statement = getCurrentStatement(model, position);
                  if (statement.text.trim()) {
                    globalThis.dispatchEvent(new CustomEvent('usql:command', { detail: { type: 'execute' } }));
                  }
                }
              }
            }
          });

          setEditorReady(true);

          completionDisposableRef.current =
            monaco.languages.registerCompletionItemProvider(language, {
              triggerCharacters: ["."],
              provideCompletionItems: async (model, position, token) => {
                if (token.isCancellationRequested) {
                  return { suggestions: [] };
                }
                const wordInfo = model.getWordUntilPosition(position);
                const lineUntilPos = model.getValueInRange(
                  new monaco.Range(
                    position.lineNumber,
                    1,
                    position.lineNumber,
                    position.column,
                  ),
                );
                const isTableQualifierDot =
                  /\b(from|join|update|into)\s+[a-zA-Z0-9_."-]+\.$/i.test(
                    lineUntilPos,
                  ) ||
                  /\b(from|join|update|into)\s+[a-zA-Z0-9_."-]+\s+[a-zA-Z0-9_"-]+\.$/i.test(
                    lineUntilPos,
                  ) ||
                  /\bwhere\s+.*[a-zA-Z0-9_"-]+\.[a-zA-Z0-9_"-]+\.$/i.test(
                    lineUntilPos,
                  ) ||
                  /\bon\s+.*[a-zA-Z0-9_"-]+\.[a-zA-Z0-9_"-]+\.$/i.test(
                    lineUntilPos,
                  );
                if (isTableQualifierDot) {
                  return { suggestions: [] };
                }
                const aliasMatch = /([a-zA-Z_][\w$"]*)\.([\w$"]*)$/.exec(
                  lineUntilPos,
                );
                const aliasName = aliasMatch
                  ? normalizeIdentifier(aliasMatch[1])
                  : undefined;
                const aliasColumnPrefix = aliasMatch
                  ? normalizeIdentifier(aliasMatch[2])
                  : "";

                if (token.isCancellationRequested) {
                  return { suggestions: [] };
                }

                const tokenMatch = /([a-zA-Z_][\w$"]*)$/.exec(lineUntilPos);
                const tokenPrefix = tokenMatch
                  ? normalizeIdentifier(tokenMatch[1])
                  : "";

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
                  .filter((alias) =>
                    alias.toLowerCase().startsWith(tablePrefix),
                  )
                  .map((alias) => ({
                    label: alias,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    insertText: alias,
                    range,
                  }))
                  .slice(0, MAX_SUGGESTIONS);

                const keywordSuggestions = KEYWORDS.filter((keyword) =>
                  keyword.startsWith(keywordPrefix),
                )
                  .map((keyword) => ({
                    label: keyword,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: keyword,
                    range,
                  }))
                  .slice(0, MAX_SUGGESTIONS);

                const tableSuggestions = tableSuggestionsRef.current
                  .filter((table) =>
                    table.insertText.toLowerCase().startsWith(tablePrefix),
                  )
                  .map((table) => ({
                    label: table.label,
                    kind: monaco.languages.CompletionItemKind.Class,
                    insertText: table.insertText,
                    range,
                  }))
                  .slice(0, MAX_SUGGESTIONS);

                let columnSuggestions: any[] = [];

                if (aliasName && activeConnection) {
                  let aliasRef = aliasMapRef.current.get(aliasName);
                  if (!aliasRef) {
                    const aliasKey = aliasName.toLowerCase();
                    for (const [key, value] of aliasMapRef.current.entries()) {
                      if (key.toLowerCase() === aliasKey) {
                        aliasRef = value;
                        break;
                      }
                    }
                  }
                  const tableName = aliasRef?.tableName ?? aliasName;

                  // Check if this is a CTE or derived table (prefixed with __cte_ or __derived_)
                  const isCTE = tableName?.startsWith("__cte_");
                  const isDerived = tableName?.startsWith("__derived_");
                  const isVirtualTable = isCTE || isDerived;

                  if (isVirtualTable && aliasRef?.schemaName) {
                    // For CTEs and derived tables, columns are stored in schemaName field
                    const virtualTableColumnNames =
                      aliasRef.schemaName.split(",");
                    columnSuggestions = virtualTableColumnNames
                      .filter((colName) =>
                        colName.toLowerCase().startsWith(columnPrefix),
                      )
                      .map((colName) => ({
                        label: colName,
                        kind: monaco.languages.CompletionItemKind.Field,
                        insertText: colName,
                        detail: aliasName,
                        range,
                      }))
                      .slice(0, MAX_SUGGESTIONS);
                  } else if (!isVirtualTable) {
                    // For regular tables, fetch columns from database
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
                      if (token.isCancellationRequested) {
                        return { suggestions: [] };
                      }
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
                      }))
                      .slice(0, MAX_SUGGESTIONS);
                  }
                }
                if (columnSuggestions.length === 0 && !aliasName && activeConnection) {
                  // Parse tất cả tables đang được dùng trong query
                  const aliasMap = aliasMapRef.current;

                  const allColumnSuggestions: any[] = [];

                  for (const [alias, aliasRef] of aliasMap.entries()) {
                    const tableName = aliasRef?.tableName ?? alias;
                    const isCTE = tableName?.startsWith("__cte_");
                    const isDerived = tableName?.startsWith("__derived_");

                    if (isCTE || isDerived) {
                      if (aliasRef?.schemaName) {
                        const cols = aliasRef.schemaName.split(",");
                        cols
                          .filter((c) => c.toLowerCase().startsWith(columnPrefix))
                          .forEach((c) =>
                            allColumnSuggestions.push({
                              label: c,
                              kind: monaco.languages.CompletionItemKind.Field,
                              insertText: c,
                              detail: tableName,
                              range,
                            })
                          );
                      }
                    } else {
                      const schemaName = resolveSchemaName(tableName, aliasRef?.schemaName);
                      const schema = schemaName
                        ? activeConnection.schemas.find((s) => s.name === schemaName)
                        : undefined;
                      let columns = schema?.tableColumns?.[tableName] || [];

                      if (columns.length === 0) {
                        const loaded = await loadColumnsForTable(tableName, aliasRef?.schemaName);
                        if (token.isCancellationRequested) return { suggestions: [] };
                        if (loaded) columns = loaded;
                      }

                      columns
                        .filter((col) => col.name.toLowerCase().startsWith(columnPrefix))
                        .forEach((col) =>
                          allColumnSuggestions.push({
                            label: col.name,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: col.name,
                            detail: tableName,
                            range,
                          })
                        );
                    }
                  }

                  if (allColumnSuggestions.length > 0) {
                    columnSuggestions = allColumnSuggestions.slice(0, MAX_SUGGESTIONS);
                  }
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
                    }))
                    .slice(0, MAX_SUGGESTIONS);
                }

                const orderedSuggestions = [
                  ...columnSuggestions,
                  ...tableSuggestions,
                  ...aliasSuggestions,
                  ...keywordSuggestions,
                ];

                const uniqueSuggestions: any[] = [];
                const seenKeys = new Set<string>();
                for (const item of orderedSuggestions) {
                  const key = `${item.insertText}:${item.detail || ""}`;
                  if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    uniqueSuggestions.push(item);
                  }
                }

                const limitedSuggestions = uniqueSuggestions.slice(
                  0,
                  MAX_SUGGESTIONS,
                );
                const withSortText = limitedSuggestions.map((item, index) => {
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

                return {
                  suggestions: withSortText,
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
          peekWidgetDefaultFocus: "editor",
          renderWhitespace: "trailing",
          matchOnWordStartOnly: true,
          contextmenu: false,
          padding: { top: 10 },
          hover: { enabled: false },
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
          codeLens: true,
          smoothScrolling: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",
          fontLigatures: true,
          cursorSmoothCaretAnimation: "on",
          mouseWheelZoom: true,
          cursorBlinking: "smooth",
          roundSelection: true,
          dragAndDrop: true,
          glyphMargin: true,
        }}
      />
    </div>
  );
}
