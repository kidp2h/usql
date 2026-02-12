"use client";

import * as React from "react";
import { QueryResultsPanel } from "@/components/query/query-results-panel";
import { QueryTabsBar } from "@/components/query/query-tabs-bar";
import type { QueryResult } from "@/components/query/types";
import { QueryEditor } from "@/components/query-editor/query-editor";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useSidebar } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/stores/sidebar-store";

export default function Home() {
  const { setOpen } = useSidebar();
  const queryTabs = useSidebarStore((state) => state.queryTabs);
  const activeQueryTabId = useSidebarStore((state) => state.activeQueryTabId);
  const connections = useSidebarStore((state) => state.connections);
  const [queryResult, setQueryResult] = React.useState<QueryResult | null>(
    null,
  );
  const setActiveQueryTab = useSidebarStore((state) => state.setActiveQueryTab);
  const closeQueryTab = useSidebarStore((state) => state.closeQueryTab);
  const closeAllTabs = useSidebarStore((state) => state.closeAllTabs);
  const reorderQueryTabs = useSidebarStore((state) => state.reorderQueryTabs);
  const setQuerySql = useSidebarStore((state) => state.setQuerySql);
  const setQuerySaved = useSidebarStore((state) => state.setQuerySaved);
  const setQueryFilePath = useSidebarStore((state) => state.setQueryFilePath);
  const setQueryTitle = useSidebarStore((state) => state.setQueryTitle);
  const closeQuery = useSidebarStore((state) => state.closeQuery);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [isExplainMode, setIsExplainMode] = React.useState(false);

  const [executionTime, setExecutionTime] = React.useState<number | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);
  // Thêm ref cho getSelectedText
  const getSelectedTextRef = React.useRef<(() => string | null) | null>(null);

  // Thêm callback này
  const handleEditorMount = React.useCallback(
    (getSelectedText: () => string | null) => {
      getSelectedTextRef.current = getSelectedText;
    },
    [],
  );
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "w"
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey) {
        closeAllTabs();
      } else if (activeQueryTabId) {
        closeQueryTab(activeQueryTabId);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [activeQueryTabId, closeQueryTab, closeAllTabs]);

  const activeTab = React.useMemo(() => {
    if (queryTabs.length === 0) {
      return undefined;
    }

    return queryTabs.find((tab) => tab.id === activeQueryTabId) ?? queryTabs[0];
  }, [activeQueryTabId, queryTabs]);

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

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "l"
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void formatSQL();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [formatSQL]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "s"
      ) {
        return;
      }

      if (event.shiftKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void saveSQL();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [saveSQL]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) {
        return;
      }

      if (event.key.toLowerCase() !== "s") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void saveAsSQL();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [saveAsSQL]);

  const _contextLabel = React.useMemo(() => {
    if (!activeTab?.context) {
      return "";
    }

    const parts = [activeTab.context.connectionName];
    if (activeTab.context.schema) {
      parts.push(activeTab.context.schema);
    }
    if (activeTab.context.table) {
      parts.push(activeTab.context.table);
    }
    return parts.join(" / ");
  }, [activeTab?.context]);

  const isActiveDirty = React.useMemo(() => {
    if (!activeTab) {
      return false;
    }

    const savedSql = activeTab.savedSql ?? activeTab.sql;
    return savedSql !== activeTab.sql;
  }, [activeTab]);

  const activeConnection = React.useMemo(() => {
    if (!activeTab?.context?.connectionId) {
      return undefined;
    }

    return connections.find(
      (connection) => connection.config.id === activeTab.context?.connectionId,
    );
  }, [activeTab?.context?.connectionId, connections]);

  const _canExecute =
    Boolean(activeTab?.sql.trim()) && Boolean(activeConnection);

  const requestCloseQuery = React.useCallback(() => {
    if (!activeTab) {
      closeQuery();
      return;
    }

    if (!isActiveDirty) {
      closeQuery();
      return;
    }

    setShowUnsavedDialog(true);
  }, [activeTab, closeQuery, isActiveDirty]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.key.toLowerCase() !== "q") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void requestCloseQuery();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [requestCloseQuery]);

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
      if (selectedText && selectedText.trim()) {
        sqlToExecute = selectedText;
      }
    }

    if (!sqlToExecute.trim()) {
      return;
    }
    setIsExecuting(true);
    setQueryResult(null);
    setExecutionTime(null);
    setOpen(false);
    setIsExplainMode(false);

    const startTime = performance.now();
    try {
      const result = await window.electron.executeQuery({
        dbType: activeConnection.config.dbType,
        host: activeConnection.config.host,
        port: String(activeConnection.config.port),
        database: activeConnection.config.database,
        username: activeConnection.config.username,
        password: activeConnection.config.password,
        ssl: activeConnection.config.ssl,
        readOnly: activeConnection.config.readOnly,
        name: activeConnection.config.name,
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
      if (selectedText && selectedText.trim()) {
        sqlToExplain = selectedText.trim();
      }
    }

    if (!sqlToExplain.toUpperCase().startsWith("SELECT")) {
      alert("EXPLAIN ANALYZE only works with SELECT queries");
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
        dbType: activeConnection.config.dbType,
        host: activeConnection.config.host,
        port: String(activeConnection.config.port),
        database: activeConnection.config.database,
        username: activeConnection.config.username,
        password: activeConnection.config.password,
        ssl: activeConnection.config.ssl,
        readOnly: activeConnection.config.readOnly,
        name: activeConnection.config.name,
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

  React.useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;
      const type = detail?.type;

      switch (type) {
        case "save":
          void saveSQL();
          break;
        case "save-as":
          void saveAsSQL();
          break;
        case "format":
          void formatSQL();
          break;
        case "copy":
          void copySQL();
          break;
        case "execute":
          void executeQuery();
          break;
        case "explain":
          void explainAnalyzeQuery();
          break;
        case "close-tab":
          if (activeQueryTabId) {
            closeQueryTab(activeQueryTabId);
          }
          break;
        case "close-all-tabs":
          closeAllTabs();
          break;
        case "close-query":
          requestCloseQuery();
          break;
        default:
          break;
      }
    };

    globalThis.addEventListener("usql:command", handleCommand);
    return () => globalThis.removeEventListener("usql:command", handleCommand);
  }, [
    activeQueryTabId,
    closeAllTabs,
    closeQuery,
    closeQueryTab,
    copySQL,
    executeQuery,
    explainAnalyzeQuery,
    formatSQL,
    requestCloseQuery,
    saveAsSQL,
    saveSQL,
  ]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey) {
        void explainAnalyzeQuery();
      } else {
        void executeQuery();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, {
        capture: true,
      });
  }, [executeQuery, explainAnalyzeQuery]);

  React.useEffect(() => {
    if (queryResult !== null) {
      setIsExplainMode(false);
      return;
    }
    setIsExplainMode(false);
  }, [queryResult]);

  

  return (
    
    <>
      <section className="flex h-full min-h-105 min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <QueryTabsBar
          tabs={queryTabs}
          activeTabId={activeTab?.id}
          onActivateTab={setActiveQueryTab}
          onCloseTab={closeQueryTab}
          onCloseAllTabs={closeAllTabs}
          onReorderTabs={reorderQueryTabs}
        />
        <ResizablePanelGroup orientation="vertical" className="flex-1 min-w-0">
          <ResizablePanel defaultSize={30} minSize={15}>
            <div className="h-full w-full overflow-hidden rounded-md">
              {activeTab ? (
                <QueryEditor
                  language="sql"
                  readonly={false}
                  value={activeTab.sql}
                  onChange={setQuerySql}
                  documentUri={`inmemory://model/${activeTab.id}.sql`}
                  onEditorMount={handleEditorMount}
                />
              ) : null}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70} minSize={15}>
            <QueryResultsPanel
              isExecuting={isExecuting}
              queryResult={queryResult}
              isExplainMode={isExplainMode}
              executionTime={executionTime}
              copyText={copyText}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>
      {showUnsavedDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
            <h3 className="text-sm font-semibold">Unsaved changes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This query has unsaved changes. Close it anyway?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUnsavedDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowUnsavedDialog(false);
                  closeQuery();
                }}
              >
                Close Without Saving
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
