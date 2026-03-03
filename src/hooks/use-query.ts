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
  const [dmlConfirmation, setDmlConfirmation] = React.useState<{
    open: boolean;
    sql: string;
    estimatedRows: number | null;
  }>({ open: false, sql: "", estimatedRows: null });

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

  const executeQuery = React.useCallback(async (overrideSql?: string, skipConfirm = false) => {
    if (!activeTab || !activeConnection || !(overrideSql || activeTab.sql).trim()) {
      return;
    }

    if (!window.electron?.executeQuery) {
      console.warn("Query execution is only available in the desktop app.");
      return;
    }

    let sqlToExecute = overrideSql || activeTab.sql;
    if (!overrideSql && getSelectedTextRef.current) {
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

    // Dangerous query check (UPDATE/DELETE/DROP/TRUNCATE/ALTER)
    const dmlRegex = /^\s*(UPDATE|DELETE|DROP|TRUNCATE|ALTER)\b/i;
    let isDangerous = dmlRegex.test(sqlToExecute);

    // Try AST parsing for better accuracy if possible
    try {
      const parsed = parse(sqlToExecute);
      const statements = Array.isArray(parsed) ? parsed : (parsed as any).statements ?? [];
      const hasDangerous = statements.some((stmt: any) =>
        ["update", "delete", "drop", "truncate", "alter"].includes(stmt.type?.toLowerCase())
      );
      if (hasDangerous) isDangerous = true;
    } catch (e) {
      // Ignore parser errors, rely on regex fallback
    }

    if (isDangerous && !skipConfirm) {
      // Start with a loading state for the dialog if needed, but for now we'll just block
      try {
        let estimatedRows: number | null = null;

        // Try to get exact count for simple UPDATE/DELETE
        const tryGetExactCount = async (sql: string): Promise<number | null> => {
          try {
            const parsed = parse(sql);
            const stmt = (Array.isArray(parsed) ? parsed[0] : (parsed as any).statements?.[0]) as any;

            if (!stmt) return null;

            let tableName = "";
            let whereClause = "";

            if (stmt.type === "delete") {
              tableName = stmt.from?.name;
              // Extract WHERE clause if it exists
              // Note: pgsql-ast-parser doesn't easily stringify back to SQL from AST,
              // so we do a simple regex extraction for typical simple cases
              const whereMatch = sql.match(/WHERE\s+([\s\S]+)$/i);
              whereClause = whereMatch ? `WHERE ${whereMatch[1]}` : "";
            } else if (stmt.type === "update") {
              tableName = stmt.table?.name;
              const whereMatch = sql.match(/WHERE\s+([\s\S]+)$/i);
              whereClause = whereMatch ? `WHERE ${whereMatch[1]}` : "";
            }

            if (tableName) {
              const countSql = `SELECT COUNT(*) FROM ${tableName} ${whereClause.replace(/;$/, "")}`;
              const countResult = await window.electron!.executeQuery({
                ...activeConnection,
                port: String(activeConnection.port),
                sql: countSql,
              });

              if (countResult.ok && countResult.rows?.[0]) {
                const count = Object.values(countResult.rows[0])[0];
                return Number(count);
              }
            }
          } catch (e) {
            console.error("Failed to get exact count:", e);
          }
          return null;
        };

        const exactCount = await tryGetExactCount(sqlToExecute);
        if (exactCount !== null) {
          estimatedRows = exactCount;
        } else {
          // Fallback to EXPLAIN
          const explainSql = `EXPLAIN (FORMAT JSON) ${sqlToExecute}`;
          const result = await window.electron!.executeQuery({
            ...activeConnection,
            port: String(activeConnection.port),
            sql: explainSql,
          });

          if (result.ok && result.rows?.[0]) {
            try {
              const firstRow = result.rows[0] as any;
              const planKey = Object.keys(firstRow).find(key => key.toUpperCase() === "QUERY PLAN" || key.toUpperCase() === "PLAN");
              let planData = planKey ? firstRow[planKey] : firstRow;

              if (typeof planData === "string") {
                try {
                  planData = JSON.parse(planData);
                } catch (e) { }
              }

              const planObj = Array.isArray(planData) ? planData[0] : planData;

              // Helper to recursively find rows (skipping 0 to find the actual estimate in DML sub-plans)
              const findRows = (obj: any): number | null => {
                if (!obj || typeof obj !== "object") return null;

                // Direct match for PostgreSQL JSON format
                if (obj["Plan Rows"] !== undefined && obj["Plan Rows"] > 0) return obj["Plan Rows"];
                if (obj["Rows"] !== undefined && obj["Rows"] > 0) return obj["Rows"];

                // Search in "Plan" property if it exists (common in PG)
                if (obj.Plan) {
                  const rows = findRows(obj.Plan);
                  if (rows !== null) return rows;
                }

                // Search in sub-plans (Plans array)
                if (Array.isArray(obj.Plans)) {
                  for (const subPlan of obj.Plans) {
                    const rows = findRows(subPlan);
                    if (rows !== null) return rows;
                  }
                }

                // Generic recursive search for any key containing "Rows"
                for (const key in obj) {
                  // Skip recursive search if we already looked at Plan or Plans
                  if (key === "Plan" || key === "Plans") continue;

                  if (key.includes("Rows") && typeof obj[key] === "number" && obj[key] > 0) {
                    return obj[key];
                  }
                  if (typeof obj[key] === "object") {
                    const rows = findRows(obj[key]);
                    if (rows !== null) return rows;
                  }
                }

                // Fallback to 0 if we specifically found a 0 value earlier but no non-zero values exist
                if (obj["Plan Rows"] === 0 || obj["Rows"] === 0) return 0;

                return null;
              };

              estimatedRows = findRows(planObj);
              // Final fallback to 0 if the recursive search found nothing but we had a valid result
              if (estimatedRows === null && planObj) {
                estimatedRows = 0;
              }
            } catch (e) {
              console.error("Failed to parse EXPLAIN rows:", e);
            }
          }
        }

        setDmlConfirmation({
          open: true,
          sql: sqlToExecute,
          estimatedRows,
        });
        return;
      } catch (err) {
        console.error("DML estimation failed:", err);
        // Fallback: still show confirmation even if count fails
        setDmlConfirmation({
          open: true,
          sql: sqlToExecute,
          estimatedRows: null,
        });
        return;
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

      let message: string | undefined;
      if (rows.length === 0) {
        const sqlTrimmed = sqlToExecute.trim().toUpperCase();
        if (
          sqlTrimmed.startsWith("UPDATE") ||
          sqlTrimmed.startsWith("DELETE") ||
          sqlTrimmed.startsWith("INSERT")
        ) {
          message = `${result.rowCount ?? 0} rows affected`;
        }
      }

      setQueryResult({
        columns,
        rows,
        rowCount: result.rowCount ?? rows.length,
        message,
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
    newQueryWithContext,
    dmlConfirmation,
    setDmlConfirmation,
  };
}
