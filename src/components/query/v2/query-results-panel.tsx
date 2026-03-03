"use client";

import * as React from "react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { QueryResult } from "@/components/query/types";

import { QueryResultsContextMenu } from "./query-results-context-menu";
import { ResultsTable } from "@/components/query/v2/results-table";
import { useCellSelection } from "@/hooks/use-cell-selection";
import { useExport } from "@/hooks/use-export";

type QueryResultsPanelProps = {
  isExecuting: boolean;
  queryResult: QueryResult | null;
  isExplainMode: boolean;
  executionTime: number | null;
  copyText: (text: string) => void | Promise<void>;
};

export const QueryResultsPanel = React.memo(function QueryResultsPanel({
  isExecuting, queryResult, isExplainMode, executionTime, copyText,
}: QueryResultsPanelProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // ✅ Chỉ giữ count để hiển thị badge ở footer
  const [selectionCount, setSelectionCount] = React.useState(0);

  // ✅ Ref để lấy selected rows cho useExport, không trigger re-render
  const getSelectedRowsRef = React.useRef<() => Record<string, unknown>[]>(() => []);

  const {
    tableContainerRef, footerSummaryRef, footerSummaryContentRef,
    finalizedSelectionRef, handleCellMouseDown, handleCellMouseEnter,
    handleCopy: _handleCopy, handleCopyInStatement: _handleCopyInStatement,
  } = useCellSelection(copyText);

  const handleCopy = React.useCallback(() => {
    _handleCopy();
    toast.success("Copied table selection to clipboard");
  }, [_handleCopy]);

  const handleCopyInStatement = React.useCallback(() => {
    _handleCopyInStatement();
    toast.success("Copied IN statement to clipboard");
  }, [_handleCopyInStatement]);

  const columns = React.useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!queryResult) return [];

    const selectColumn: ColumnDef<Record<string, unknown>> = {
      id: "select",
      size: 40,
      header: ({ table }) => (
        <div className="flex w-full items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex w-full items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    };

    const dataColumns = queryResult.columns.map((col) => ({
      accessorKey: col,
      header: col,
      cell: (info: any) => {
        const value = info.getValue();
        if (value === null || value === undefined) return <span className="text-muted-foreground italic">null</span>;
        if (typeof value === "object") return <span className="text-cyan-600 dark:text-cyan-400 font-mono text-xs">{JSON.stringify(value)}</span>;
        if (typeof value === "number") return <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>;
        return <span className="text-green-700 dark:text-green-400 truncate max-w-[300px] inline-block">{String(value)}</span>;
      },
    }));

    return queryResult.rowCount === 0 ? dataColumns : [selectColumn, ...dataColumns];
  }, [queryResult]);

  const data = React.useMemo(() => queryResult?.rows ?? [], [queryResult]);

  // ✅ useExport đọc selected rows từ ref
  useExport(
    queryResult,
    () => getSelectedRowsRef.current(),
    data,
  );

  if (isExecuting) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground/50" />
          <span className="text-sm font-medium text-muted-foreground/70 animate-pulse">Executing query...</span>
        </div>
      </div>
    );
  }

  if (queryResult?.error) {
    return <div className="p-4 text-red-500 font-mono whitespace-pre-wrap">{queryResult.error}</div>;
  }

  if (!queryResult) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No results</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-1.5 text-xs bg-muted/50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Query Results</span>
          {isExplainMode && (
            <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 py-0 h-4 text-[9px] font-bold">EXPLAIN</Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <QueryResultsContextMenu onCopy={handleCopy} onCopyInStatement={handleCopyInStatement}>
          {queryResult.message && queryResult.rows.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
              <div className="relative mb-6">
                <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
                <div className="relative flex items-center justify-center size-20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-3xl border border-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm">
                  <div className="absolute inset-0 bg-white/5 rounded-3xl" />
                  <Clock className="size-10 relative z-10" />
                </div>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{queryResult.message}</h3>
              <p className="text-muted-foreground font-medium text-md">Query executed successfully in <span className="text-foreground">{executionTime}ms</span></p>
            </div>
          ) : (
            <ResultsTable
              data={data}
              columns={columns}
              sorting={sorting}
              onSortingChange={setSorting}
              onSelectionChange={setSelectionCount}
              getSelectedRowsRef={getSelectedRowsRef}
              tableContainerRef={tableContainerRef}
              finalizedSelectionRef={finalizedSelectionRef}
              onCellMouseDown={handleCellMouseDown}
              onCellMouseEnter={handleCellMouseEnter}
              onCopy={handleCopy}
              onCopyInStatement={handleCopyInStatement}
            />
          )}
        </QueryResultsContextMenu>
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/40 px-4 py-1 flex items-center shrink-0 min-h-[34px] justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 py-0.5 px-2 font-semibold">{queryResult.rowCount} rows</Badge>
          {executionTime !== null && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 py-0.5 px-2 font-semibold">
              <Clock className="size-3 mr-1" />{executionTime}ms
            </Badge>
          )}
          {/* ✅ Dùng selectionCount thay vì Object.keys(rowSelection).length */}
          {selectionCount > 0 && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 py-0.5 px-2 font-semibold">{selectionCount} selected rows</Badge>
          )}
        </div>
        <div ref={footerSummaryRef} className="flex items-center invisible select-none">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 py-0.5 px-2 font-semibold">
            <span ref={footerSummaryContentRef} />
          </Badge>
        </div>
      </div>
    </div>
  );
});