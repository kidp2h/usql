"use client";

import * as React from "react";

import { QueryEditor } from "@/components/query-editor/query-editor";
import { QueryHeaderActions } from "@/components/query/query-header-actions";
import { QueryResultsPanel } from "@/components/query/query-results-panel";
import { QueryTabsBar } from "@/components/query/query-tabs-bar";
import type { QueryResult } from "@/components/query/types";
import { Kbd } from "@/components/ui/kbd";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useSidebar } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/stores/sidebar-store";

export default function Home() {
  const { setOpen } = useSidebar();
  const queryTabs = useSidebarStore((state) => state.queryTabs);
  const activeQueryTabId = useSidebarStore((state) => state.activeQueryTabId);
  const connections = useSidebarStore((state) => state.connections);
  const setActiveQueryTab = useSidebarStore(
    (state) => state.setActiveQueryTab
  );
  const closeQueryTab = useSidebarStore((state) => state.closeQueryTab);
  const closeAllTabs = useSidebarStore((state) => state.closeAllTabs);
  const reorderQueryTabs = useSidebarStore((state) => state.reorderQueryTabs);
  const setQuerySql = useSidebarStore((state) => state.setQuerySql);
  const closeQuery = useSidebarStore((state) => state.closeQuery);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [isExplainMode, setIsExplainMode] = React.useState(false);
  const [queryResult, setQueryResult] = React.useState<QueryResult | null>(
    null
  );
  const [executionTime, setExecutionTime] = React.useState<number | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.key.toLowerCase() !== "q") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeQuery();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [closeQuery]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "w") {
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

    return (
      queryTabs.find((tab) => tab.id === activeQueryTabId) ?? queryTabs[0]
    );
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

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "l") {
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

  const contextLabel = React.useMemo(() => {
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

  const activeConnection = React.useMemo(() => {
    if (!activeTab?.context?.connectionId) {
      return undefined;
    }

    return connections.find(
      (connection) => connection.config.id === activeTab.context?.connectionId
    );
  }, [activeTab?.context?.connectionId, connections]);

  const canExecute = Boolean(activeTab?.sql.trim()) && Boolean(activeConnection);

  const executeQuery = React.useCallback(async () => {
    if (!activeTab || !activeConnection || !activeTab.sql.trim()) {
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
        sql: activeTab.sql,
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

    const trimmedSql = activeTab.sql.trim();
    if (!trimmedSql.toUpperCase().startsWith("SELECT")) {
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
      const explainSql = `EXPLAIN ANALYZE ${trimmedSql}`;
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
  if (queryTabs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/40 p-6 text-muted-foreground">
        Select a connection or table, then choose New query (or press <Kbd>⌘ + N</Kbd>).
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-105 min-w-0 flex-col rounded-xl border bg-card shadow-sm">
      <QueryTabsBar
        tabs={queryTabs}
        activeTabId={activeTab?.id}
        onActivateTab={setActiveQueryTab}
        onCloseTab={closeQueryTab}
        onCloseAllTabs={closeAllTabs}
        onReorderTabs={reorderQueryTabs}
      />
      <QueryHeaderActions
        contextLabel={contextLabel}
        hasSql={Boolean(activeTab?.sql)}
        isExecuting={isExecuting}
        canExecute={canExecute}
        onFormat={() => void formatSQL()}
        onCopy={() => void copySQL()}
        onExecute={() => void executeQuery()}
        onExplain={() => void explainAnalyzeQuery()}
        onClose={closeQuery}
      />
      <ResizablePanelGroup orientation="vertical" className="flex-1 min-w-0">
        <ResizablePanel defaultSize={30} minSize={15}>
          <div className="h-full w-full overflow-hidden rounded-md border">
            {activeTab ? (
              <QueryEditor
                value={activeTab.sql}
                onChange={setQuerySql}
                documentUri={`inmemory://model/${activeTab.id}.sql`}
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
  );
}
