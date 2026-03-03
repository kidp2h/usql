import * as React from "react";
import { toast } from "sonner";
import type { QueryResult } from "@/components/query/types";

export function useExport(
  queryResult: QueryResult | null,
  getSelectedRows: () => Record<string, unknown>[],
  allData: Record<string, unknown>[],
) {
  const getExportRows = React.useCallback(() => {
    const selected = getSelectedRows();
    return selected.length > 0 ? selected : allData;
  }, [getSelectedRows, allData]);

  const handleExport = React.useCallback(async (type: "csv" | "json") => {
    if (!queryResult || queryResult.rows.length === 0) return;

    const rows = getExportRows();
    let content = "";
    let defaultExtension = "";
    let filters: { name: string; extensions: string[] }[] = [];

    if (type === "csv") {
      const headers = queryResult.columns;
      content = [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
        ...rows.map((row) =>
          headers.map((col) => {
            const v = row[col];
            if (v === null || v === undefined) return "";
            return `"${String(v).replace(/"/g, '""')}"`;
          }).join(","),
        ),
      ].join("\n");
      defaultExtension = "csv";
      filters = [{ name: "CSV Files", extensions: ["csv"] }];
    } else {
      content = JSON.stringify(rows, null, 2);
      defaultExtension = "json";
      filters = [{ name: "JSON Files", extensions: ["json"] }];
    }

    try {
      const { canceled, filePath } = await window.electron.showSaveDialog({
        title: `Export to ${type.toUpperCase()}`,
        defaultPath: `query-results-${Date.now()}.${defaultExtension}`,
        filters: [...filters, { name: "All Files", extensions: ["*"] }],
      });

      if (canceled || !filePath) return;

      const result = await window.electron.writeFileContent({ filePath, content });

      if (result.ok) {
        toast.success(`Exported to ${type.toUpperCase()} successfully`, {
          description: filePath,
          action: {
            label: "Open Folder",
            onClick: () => window.electron.showItemInFolder(filePath),
          },
        });
      } else {
        toast.error(`Failed to export: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(`Export error: ${error.message}`);
    }
  }, [getExportRows, queryResult]);

  const exportToCSV = React.useCallback(() => handleExport("csv"), [handleExport]);
  const exportToJSON = React.useCallback(() => handleExport("json"), [handleExport]);

  React.useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;
      if (detail?.type === "result-export-csv") exportToCSV();
      if (detail?.type === "result-export-json") exportToJSON();
    };
    globalThis.addEventListener("usql:command", handleCommand);
    return () => globalThis.removeEventListener("usql:command", handleCommand);
  }, [exportToCSV, exportToJSON]);

  return { exportToCSV, exportToJSON };
}
