import * as React from "react";
import { useEvent } from "./use-event";

interface UseQueryCommandsProps {
  newQuery: () => void;
  newQueryWithContext: (context: {
    connectionId: string;
    connectionName: string;
  }) => void;
  saveSQL: () => Promise<void>;
  saveAsSQL: () => Promise<void>;
  formatSQL: () => Promise<void>;
  copySQL: () => Promise<void>;
  executeQuery: () => Promise<void>;
  explainAnalyzeQuery: () => Promise<void>;
  handleOpenFileClick: () => void;
}

export function useQueryCommands(
  {
    newQuery,
    newQueryWithContext,
    saveSQL,
    saveAsSQL,
    formatSQL,
    copySQL,
    executeQuery,
    explainAnalyzeQuery,
    handleOpenFileClick,
  }: UseQueryCommandsProps,
  enabled = true,
) {
  const handleCommand = useEvent((event: Event) => {
    if (!enabled) {
      return;
    }
    const detail = (event as CustomEvent<{ type?: string, connectionId?: string, connectionName?: string }>).detail;
    const type = detail?.type;

    switch (type) {
      case "new-query":
        newQuery();
        break;
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
      case "open-file":
        handleOpenFileClick();
        break;
      case "new-query-with-context":
        newQueryWithContext({
          connectionId: detail.connectionId || "",
          connectionName: detail.connectionName || "",
        });
        break;
      default:
        break;
    }
  });

  React.useEffect(() => {
    globalThis.addEventListener("usql:command", handleCommand);
    return () => globalThis.removeEventListener("usql:command", handleCommand);
  }, [handleCommand]);
}
