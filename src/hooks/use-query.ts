import * as React from "react";
import { parse } from "pgsql-ast-parser";
import { toast } from "sonner";
import type { QueryResult } from "@/components/query/types";
import { useTabStore } from "@/stores/tab-store";
import { useQueryCommands } from "./use-query-commands";
import { useConnection } from "@/hooks/use-connection";

interface UseQueryProps {
  setOpen: (open: boolean) => void;
  isEditorFocused: boolean;
  enableCommands?: boolean;
}

export function useQuery({
  setOpen,
  isEditorFocused,
  enableCommands = true,
}: UseQueryProps) {
  const queryTabs = useTabStore((state) => state.queryTabs);
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId);
  const { connections, activeConnection, updateSelectedConnectionId } = useConnection();
  const [queryResult, setQueryResult] = React.useState<QueryResult | null>(null);

  const setQuerySql = useTabStore((state) => state.setQuerySql);
  const setQuerySaved = useTabStore((state) => state.setQuerySaved);
  const setQueryFilePath = useTabStore((state) => state.setQueryFilePath);
  const setQueryTitle = useTabStore((state) => state.setQueryTitle);
  const openSqlTab = useTabStore((state) => state.openSqlTab);
  const openQuery = useTabStore((state) => state.openQuery);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [isExplainMode, setIsExplainMode] = React.useState(false);
  const [executionTime, setExecutionTime] = React.useState<number | null>(null);

  const getSelectedTextRef = React.useRef<
    (() => { text: string; range?: any } | null) | null
  >(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeTab = React.useMemo(() => {
    if (queryTabs.length === 0) {
      return undefined;
    }
    return queryTabs.find((tab) => tab.id === activeQueryTabId) ?? queryTabs[0];
  }, [activeQueryTabId, queryTabs]);

  // Sync sidebar connection with active tab
  React.useEffect(() => {
    if (activeTab?.connectionId && activeTab.connectionId !== activeConnection?.id) {
      const exists = connections.some(c => c.id === activeTab.connectionId);
      if (exists) {
        updateSelectedConnectionId(activeTab.connectionId);
      }
    }
  }, [activeTab?.id, activeTab?.connectionId, activeConnection?.id, connections, updateSelectedConnectionId]);

  const formatSQL = React.useCallback(async () => {
    if (!activeTab?.sql) return;

    try {
      const { format } = await import("sql-formatter");
      const formatted = format(activeTab.sql, {
        language: "postgresql",
        tabWidth: 2,
        keywordCase: "upper",
        linesBetweenQueries: 2,
      });
      setQuerySql(formatted);
    } catch (error) {
      console.error("Failed to format SQL:", error);
    }
  }, [activeTab, setQuerySql]);

  const copyText = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fallback for clipboard restrictions.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }, []);

  const copySQL = React.useCallback(async () => {
    if (!activeTab?.sql) return;
    await copyText(activeTab.sql);
  }, [activeTab?.sql, copyText]);

  const saveAsSQL = React.useCallback(async () => {
    if (!activeTab?.sql) {
      return;
    }

    if (!window.electron?.saveQuery) {
      alert("Save is only available in the desktop app.");
      return;
    }

    const suggestedName = `${activeTab.title || "query"}.sql`;
    const result = await window.electron.saveQuery({
      content: activeTab.sql,
      suggestedName,
      filePath: activeTab.filePath,
      forceDialog: true,
    });

    if (result.ok && !result.canceled) {
      setQuerySaved(activeTab.sql);
      if (result.filePath) {
        const filePath = result.filePath;
        setQueryFilePath(filePath);
        const name = filePath.split(/[/\\]/).pop()?.trim();
        if (name) {
          setQueryTitle(activeTab.id, name);
        }
      }
    } else if (!result.ok) {
      alert(result.message || "Save failed");
    }
  }, [activeTab, setQueryFilePath, setQuerySaved, setQueryTitle]);

  const saveSQL = React.useCallback(async () => {
    if (!activeTab?.sql) {
      return;
    }

    if (!window.electron?.saveQuery) {
      alert("Save is only available in the desktop app.");
      return;
    }

    if (!activeTab.filePath) {
      await saveAsSQL();
      return;
    }

    const suggestedName = `${activeTab.title || "query"}.sql`;
    const result = await window.electron.saveQuery({
      content: activeTab.sql,
      suggestedName,
      filePath: activeTab.filePath,
    });

    if (result.ok && !result.canceled) {
      setQuerySaved(activeTab.sql);
      if (result.filePath) {
        setQueryFilePath(result.filePath);
      }
    } else if (!result.ok) {
      alert(result.message || "Save failed");
    }
  }, [activeTab, saveAsSQL, setQueryFilePath, setQuerySaved]);

  const handleOpenFileClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleOpenFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
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
        event.target.value = "";
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

      event.target.value = "";
    },
    [openSqlTab],
  );

  const executeQuery = React.useCallback(async () => {
    if (!activeTab || !activeConnection || !activeTab.sql.trim()) {
      return;
    }

    if (!window.electron?.executeQuery) {
      console.warn("Query execution is only available in the desktop app.");
      return;
    }

    let sqlToExecute = activeTab.sql;
    if (getSelectedTextRef.current) {
      const selectedText = getSelectedTextRef.current();
      if (selectedText?.text?.trim()) {
        sqlToExecute = selectedText.text;

        // Dispatch highlight event
        if (selectedText.range) {
          globalThis.dispatchEvent(new CustomEvent('usql:highlight-range', {
            detail: { range: selectedText.range }
          }));
        }
      }
    }

    if (!sqlToExecute.trim()) {
      return;
    }

    if (activeConnection.readOnly) {
      // Check if query starts with WITH (CTE) - these are always SELECT
      const isCTE = sqlToExecute.trim().toUpperCase().startsWith("WITH");

      if (!isCTE) {
        try {
          const parsed = parse(sqlToExecute);
          const statements = Array.isArray(parsed)
            ? parsed
            : ((parsed as { statements?: unknown[] })?.statements ?? []);

          const hasNonSelect = statements.some((statement) => {
            const stmtType = (
              statement as { type?: string }
            )?.type?.toLowerCase();
            // Accept SELECT and WITH statements
            return stmtType !== "select" && stmtType !== "with";
          });

          if (statements.length === 0 || hasNonSelect) {
            toast.error(
              "SQL syntax error. Read-only connections only allow SELECT queries.",
            );
            return;
          }
        } catch {
          toast.error(
            "SQL syntax error. Read-only connections only allow SELECT queries.",
          );
          return;
        }
      }
    }
    setIsExecuting(true);
    setQueryResult(null);
    setExecutionTime(null);
    setOpen(false);
    setIsExplainMode(false);

    const startTime = performance.now();
    try {
      const result = await window.electron.executeQuery({
        dbType: activeConnection.dbType,
        host: activeConnection.host,
        port: String(activeConnection.port),
        database: activeConnection.database,
        username: activeConnection.username,
        password: activeConnection.password,
        ssl: activeConnection.ssl,
        readOnly: activeConnection.readOnly,
        name: activeConnection.name,
        sql: sqlToExecute,
      });

      if (!result.ok) {
        setQueryResult({
          columns: [],
          rows: [],
          rowCount: 0,
          error: result.message || "Query failed",
        });
        return;
      }

      const rows = result.rows ?? [];
      const columns = rows[0] ? Object.keys(rows[0]) : [];

      setQueryResult({
        columns,
        rows,
        rowCount: result.rowCount ?? rows.length,
      });

      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));
    } finally {
      setIsExecuting(false);
    }
  }, [activeConnection, activeTab, setOpen]);

  const explainAnalyzeQuery = React.useCallback(async () => {
    if (!activeTab || !activeConnection || !activeTab.sql.trim()) {
      return;
    }
    let sqlToExplain = activeTab.sql.trim();
    if (getSelectedTextRef.current) {
      const selectedText = getSelectedTextRef.current();
      if (selectedText?.text?.trim()) {
        sqlToExplain = selectedText.text.trim();

        // Dispatch highlight event
        if (selectedText.range) {
          globalThis.dispatchEvent(new CustomEvent('usql:highlight-range', {
            detail: { range: selectedText.range }
          }));
        }
      }
    }

    if (!sqlToExplain.toUpperCase().startsWith("SELECT")) {
      toast.error("EXPLAIN ANALYZE only works with SELECT queries");
      return;
    }

    if (!window.electron?.executeQuery) {
      console.warn("Query execution is only available in the desktop app.");
      return;
    }

    setIsExecuting(true);
    setQueryResult(null);
    setExecutionTime(null);
    setOpen(false);
    setIsExplainMode(true);

    const startTime = performance.now();
    try {
      const explainSql = `EXPLAIN ANALYZE ${sqlToExplain}`;
      const result = await window.electron.executeQuery({
        dbType: activeConnection.dbType,
        host: activeConnection.host,
        port: String(activeConnection.port),
        database: activeConnection.database,
        username: activeConnection.username,
        password: activeConnection.password,
        ssl: activeConnection.ssl,
        readOnly: activeConnection.readOnly,
        name: activeConnection.name,
        sql: explainSql,
      });

      if (!result.ok) {
        setQueryResult({
          columns: [],
          rows: [],
          rowCount: 0,
          error: result.message || "EXPLAIN ANALYZE failed",
        });
        return;
      }

      const rows = result.rows ?? [];
      const columns = rows[0] ? Object.keys(rows[0]) : [];

      setQueryResult({
        columns,
        rows,
        rowCount: result.rowCount ?? rows.length,
      });

      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));
    } finally {
      setIsExecuting(false);
    }
  }, [activeConnection, activeTab, setOpen]);


  const newQueryWithContext = React.useCallback(
    (context: {
      connectionId: string;
      connectionName: string;
    }) => {
      console.log(context);
      openQuery(context);
      setOpen(false);
    },
    [openQuery, setOpen],
  );

  const newQuery = React.useCallback(
    () => {
      if (!activeConnection) {
        return;
      }
      console.log(activeConnection);
      openQuery({
        connectionId: activeConnection.id,
        connectionName: activeConnection.name,
      });
      setOpen(false);
    },
    [openQuery, setOpen, activeConnection],
  );



  useQueryCommands({
    newQueryWithContext,
    newQuery,
    saveSQL,
    saveAsSQL,
    formatSQL,
    copySQL,
    executeQuery,
    explainAnalyzeQuery,
    handleOpenFileClick,
  }, enableCommands);

  return {
    queryResult,
    isExecuting,
    isExplainMode,
    executionTime,
    getSelectedTextRef,
    fileInputRef,
    activeTab,
    activeConnection,
    handleOpenFileChange,
    copyText,
    executeQuery,
    explainAnalyzeQuery,
    newQuery,
    newQueryWithContext
  };
}
