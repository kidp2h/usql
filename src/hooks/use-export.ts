import * as React from "react";
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

  const exportToCSV = React.useCallback(() => {
    if (!queryResult || queryResult.rows.length === 0) return;
    const headers = queryResult.columns;
    const rows = getExportRows();
    const csv = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map((row) =>
        headers.map((col) => {
          const v = row[col];
          if (v === null || v === undefined) return "";
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(","),
      ),
    ].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })));
    link.setAttribute("download", `query-results-${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [getExportRows, queryResult]);

  const exportToJSON = React.useCallback(() => {
    if (!queryResult || queryResult.rows.length === 0) return;
    const rows = getExportRows();
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json;charset=utf-8;" })));
    link.setAttribute("download", `query-results-${Date.now()}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [getExportRows, queryResult]);

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