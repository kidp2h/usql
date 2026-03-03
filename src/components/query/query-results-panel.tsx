"use client";

import * as React from "react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { QueryResult } from "@/components/query/types";
import { BsFiletypeJson } from "react-icons/bs";
import { QueryResultsContextMenu } from "./query-results-context-menu";
import { ResultsTable } from "@/components/query/results-table";
import { useCellSelection } from "@/hooks/use-cell-selection";
import { useExport } from "@/hooks/use-export";
import { DrawerViewJson } from "@/components/drawer-view-json";

type QueryResultsPanelProps = {
  isExecuting: boolean;
  queryResult: QueryResult | null;
  isExplainMode: boolean;
  executionTime: number | null;
  copyText: (text: string) => void | Promise<void>;
};

const TruncatedCell = ({ value }: { value: string }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [remainingCount, setRemainingCount] = React.useState(0);

  const checkOverflow = React.useCallback(() => {
    if (textRef.current && containerRef.current) {
      const scrollWidth = textRef.current.scrollWidth;
      const clientWidth = containerRef.current.clientWidth;
      const isOverflowing = scrollWidth > clientWidth;

      if (isOverflowing) {
        const totalLen = value.length;
        const visibleRatio = clientWidth / scrollWidth;
        const estimatedVisible = Math.floor(totalLen * visibleRatio);
        // Ensure we don't show 0 if it's clearly overflowing
        setRemainingCount(Math.max(1, totalLen - estimatedVisible));
      } else {
        setRemainingCount(0);
      }
    }
  }, [value]);

  React.useLayoutEffect(() => {
    checkOverflow();
  }, [checkOverflow]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [checkOverflow]);

  return (
    <div ref={containerRef} className="flex items-center gap-1.5 w-full min-w-0 overflow-hidden">
      <span
        ref={textRef}
        className="text-green-700 dark:text-green-400 text-ellipsis overflow-hidden whitespace-nowrap flex-1"
      >
        {value}
      </span>
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className="h-4.5 px-1 text-[9px] font-mono shrink-0 bg-muted/30 text-muted-foreground/70 border-muted-foreground/20 leading-none"
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
};

export const QueryResultsPanel = React.memo(function QueryResultsPanel({
  isExecuting, queryResult, isExplainMode, executionTime, copyText,
}: QueryResultsPanelProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // ✅ Chỉ giữ count để hiển thị badge ở footer
  const [selectionCount, setSelectionCount] = React.useState(0);
  const [isJsonDrawerOpen, setIsJsonDrawerOpen] = React.useState(false);
  const [jsonContent, setJsonContent] = React.useState("");

  // ✅ Ref để lấy selected rows cho useExport, không trigger re-render
  const getSelectedRowsRef = React.useRef<() => Record<string, unknown>[]>(() => []);

  const {
    tableContainerRef,
    footerSummaryRef,
    footerSummaryContentRef,
    finalizedSelectionRef,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCopy: _handleCopy,
    handleCopyInStatement: _handleCopyInStatement,
    getSingleSelectedCellText,
  } = useCellSelection(copyText);

  const handleCopy = React.useCallback(() => {
    _handleCopy();
    toast.success("Copied table selection to clipboard");
  }, [_handleCopy]);

  const handleCopyInStatement = React.useCallback(() => {
    _handleCopyInStatement();
    toast.success("Copied IN statement to clipboard");
  }, [_handleCopyInStatement]);

  const handleViewAsJson = React.useCallback(() => {
    const text = getSingleSelectedCellText();
    if (!text) return;
    try {
      const formatted = JSON.stringify(JSON.parse(text), null, 2);
      setJsonContent(formatted);
      setIsJsonDrawerOpen(true);
    } catch {
      setJsonContent(text);
      setIsJsonDrawerOpen(true);
    }
  }, [getSingleSelectedCellText]);

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
        return <TruncatedCell value={String(value)} />;
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
    const isConnectionError = queryResult.error.toLowerCase().includes("connect") ||
      queryResult.error.toLowerCase().includes("enotfound") ||
      queryResult.error.toLowerCase().includes("econnrefused");

    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-red-500/10 rounded-full blur-xl animate-pulse" />
          <div className="relative flex items-center justify-center size-20 bg-gradient-to-br from-red-500/10 to-rose-500/10 rounded-3xl border border-red-500/20 text-red-600 dark:text-red-400 shadow-sm">
            <div className="absolute inset-0 bg-white/5 rounded-3xl" />
            <AlertCircle className="size-10 relative z-10" />
          </div>
        </div>

        <h3 className="text-2xl font-bold tracking-tight mb-2 bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
          {isConnectionError ? "Connection Failed" : "Query Execution Failed"}
        </h3>

        <div className="max-w-md w-full mb-6">
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-left">
            <p className="text-xs font-mono text-red-600/80 dark:text-red-400/80 break-words whitespace-pre-wrap leading-relaxed">
              {queryResult.error}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 border-red-500/20 hover:bg-red-500/5 hover:text-red-600 transition-all rounded-full font-medium"
            onClick={() => {
              copyText(queryResult?.error || "");
              toast.success("Error details copied to clipboard");
            }}
          >
            Copy error details
          </Button>
          {isConnectionError && (
            <Button
              variant="default"
              size="sm"
              className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white transition-all rounded-full font-medium shadow-sm shadow-red-500/20"
              onClick={() => {
                window.location.reload();
              }}
            >
              Verify configuration
            </Button>
          )}
        </div>
      </div>
    );
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
        <div ref={footerSummaryRef} className="flex items-center invisible select-none gap-2">
          <Badge
            id="view-as-json-button"
            variant="outline"
            className="hidden bg-amber-500/10 flex flex-row items-center text-amber-600 dark:text-amber-400 border-amber-500/30 py-0.5 px-2 font-bold cursor-pointer hover:bg-amber-500/20 transition-colors uppercase text-[10px] tracking-tight"
            onClick={handleViewAsJson}
          >
            <BsFiletypeJson className="size-5 mr-0.5" />
            View as JSON
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 py-0.5 px-2 font-semibold">
            <span ref={footerSummaryContentRef} />
          </Badge>
        </div>
      </div>
      <DrawerViewJson
        open={isJsonDrawerOpen}
        onOpenChange={setIsJsonDrawerOpen}
        json={jsonContent}
      />
    </div>
  );
});