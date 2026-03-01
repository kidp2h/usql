"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnDef,
  RowSelectionState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Clock, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import type { QueryResult } from "@/components/query/types";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QueryResultsContextMenu } from "./query-results-context-menu";

type QueryResultsPanelProps = {
  isExecuting: boolean;
  queryResult: QueryResult | null;
  isExplainMode: boolean;
  executionTime: number | null;
  copyText: (text: string) => void | Promise<void>;
};

export const QueryResultsPanel = React.memo(function QueryResultsPanel({
  isExecuting,
  queryResult,
  isExplainMode,
  executionTime,
  copyText,
}: QueryResultsPanelProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const footerSummaryRef = React.useRef<HTMLDivElement>(null);
  const footerSummaryContentRef = React.useRef<HTMLSpanElement>(null);

  // A Set of "row,col" strings that holds firmly selected cells (e.g. from previous Ctrl+clicks)
  const finalizedSelectionRef = React.useRef<Set<string>>(new Set());

  // Data cell drag selection state
  const isSelectingCellRef = React.useRef(false);
  const selectionStartRef = React.useRef<{ row: number, col: number } | null>(null);
  const selectionEndRef = React.useRef<{ row: number, col: number } | null>(null);

  const updateSelectionDOM = React.useCallback((startRow: number, startCol: number, endRow: number, endCol: number) => {
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    // Fast path: find all cells and toggle data-selected based on current drag matrix OR previously finalized cells
    const allCells = tableContainerRef.current?.querySelectorAll('.data-cell') || [];

    let sum = 0;
    let count = 0;
    let hasNonNumeric = false;

    allCells.forEach(cell => {
      const r = parseInt(cell.getAttribute('data-row') || '-1', 10);
      const c = parseInt(cell.getAttribute('data-col') || '-1', 10);

      const isInCurrentDrag = (r >= minRow && r <= maxRow && c >= minCol && c <= maxCol);
      const isInPrevious = finalizedSelectionRef.current.has(`${r},${c}`);

      if (isInCurrentDrag || isInPrevious) {
        cell.setAttribute('data-selected', 'true');
        count++;

        const text = (cell.textContent || "").trim();
        if (text !== "") {
          if (text.toLowerCase() === "null") {
            hasNonNumeric = true;
          } else {
            const cleanText = text.replace(/,/g, '');
            const num = Number(cleanText);
            if (Number.isNaN(num)) {
              hasNonNumeric = true;
            } else {
              sum += num;
            }
          }
        }
      } else {
        cell.removeAttribute('data-selected');
      }
    });

    if (footerSummaryContentRef.current && footerSummaryRef.current) {
      if (count === 0) {
        footerSummaryContentRef.current.textContent = "";
        footerSummaryRef.current.classList.add('invisible');
      } else if (hasNonNumeric) {
        footerSummaryContentRef.current.textContent = `Count: ${count}`;
        footerSummaryRef.current.classList.remove('invisible');
      } else {
        const displaySum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(sum);
        footerSummaryContentRef.current.textContent = `Count: ${count} | Sum: ${displaySum}`;
        footerSummaryRef.current.classList.remove('invisible');
      }
    }
  }, []);

  React.useEffect(() => {
    const handleMouseUp = () => {
      if (isSelectingCellRef.current && selectionStartRef.current && selectionEndRef.current) {
        // When mouse drag ends, "bake" the current drag matrix into the finalized selection set
        const start = selectionStartRef.current;
        const end = selectionEndRef.current;
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);

        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            finalizedSelectionRef.current.add(`${r},${c}`);
          }
        }
      }
      isSelectingCellRef.current = false;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const columns = React.useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!queryResult) return [];

    const selectColumn: ColumnDef<Record<string, unknown>> = {
      id: "select",
      size: 40,
      header: ({ table }) => (
        <div className="flex w-full items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex w-full items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
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
      cell: (info) => {
        const value = info.getValue();
        if (value === null || value === undefined) {
          return <span className="text-muted-foreground italic">null</span>;
        }
        if (typeof value === "object") {
          return <span className="text-cyan-600 dark:text-cyan-400 font-mono text-xs">{JSON.stringify(value)}</span>;
        }
        if (typeof value === "number") {
          return <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>;
        }
        return <span className="text-green-700 dark:text-green-400 truncate max-w-[300px] inline-block">{String(value)}</span>
      }
    }));

    if (queryResult.rowCount === 0) {
      return dataColumns;
    }

    return [selectColumn, ...dataColumns];
  }, [queryResult]);

  const data = React.useMemo(() => {
    return queryResult?.rows ?? [];
  }, [queryResult]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    state: {
      sorting,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 100,
      }
    }
  });

  const getSelectedMatrix = React.useCallback(() => {
    const selectedCells = Array.from(tableContainerRef.current?.querySelectorAll('.data-cell[data-selected="true"]') || []);
    if (selectedCells.length === 0) return null;

    const rowMap = new Map<number, { col: number, text: string, type: string }[]>();
    selectedCells.forEach(cell => {
      const r = parseInt(cell.getAttribute('data-row') || '-1', 10);
      const c = parseInt(cell.getAttribute('data-col') || '-1', 10);
      const type = cell.getAttribute('data-type') || 'string';
      const text = cell.textContent || "";
      if (!rowMap.has(r)) rowMap.set(r, []);
      rowMap.get(r)!.push({ col: c, text, type });
    });
    return rowMap;
  }, []);

  const handleCopy = React.useCallback(() => {
    const rowMap = getSelectedMatrix();
    if (!rowMap) return;

    const sortedRows = Array.from(rowMap.keys()).sort((a, b) => a - b);
    const matrixString = sortedRows.map(r => {
      const cols = rowMap.get(r)!;
      cols.sort((a, b) => a.col - b.col);
      return cols.map(c => c.text !== "null" ? c.text : "NULL").join('\t');
    }).join('\n');

    copyText(matrixString);
    toast.success(`Copied table selection to clipboard`);
  }, [getSelectedMatrix, copyText]);

  const handleCopyInStatement = React.useCallback(() => {
    const rowMap = getSelectedMatrix();
    if (!rowMap) return;

    const values: string[] = [];
    rowMap.forEach(cols => {
      cols.forEach(c => {
        if (c.text !== "null") {
          const value = c.type === "number" ? c.text : `'${c.text.replace(/'/g, "''")}'`;
          values.push(value);
        }
      });
    });

    if (values.length === 0) return;

    // De-duplicate values for IN statement
    const uniqueValues = Array.from(new Set(values));
    const inStatement = `IN (${uniqueValues.join(', ')})`;
    copyText(inStatement);
    toast.success(`Copied IN statement to clipboard`);
  }, [getSelectedMatrix, copyText]);

  if (isExecuting) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground/50" />
          <span className="text-sm font-medium text-muted-foreground/70 animate-pulse">
            Executing query...
          </span>
        </div>
      </div>
    );
  }

  if (queryResult?.error) {
    return (
      <div className="p-4 text-red-500 font-mono whitespace-pre-wrap">
        {queryResult.error}
      </div>
    )
  }

  if (!queryResult) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No results
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-1.5 text-xs bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Query Results</span>
          {isExplainMode && (
            <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 py-0 h-4 text-[9px] font-bold">
              EXPLAIN
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}</span>
          <div className="flex gap-1 ml-2">
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="size-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      <QueryResultsContextMenu onCopy={handleCopy} onCopyInStatement={handleCopyInStatement}>
        <div
          className="flex-1 overflow-auto relative focus:outline-none"
          ref={tableContainerRef}
          tabIndex={-1}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
              e.preventDefault();
              handleCopy();
            }
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
              e.preventDefault();
              handleCopyInStatement();
            }
          }}
        >
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className={`group whitespace-nowrap py-2 font-semibold select-none sticky top-0 z-20 bg-background shadow-[0_1px_0_hsl(var(--border))] border-r last:border-r-0 ${header.column.getCanSort() ? "cursor-pointer" : ""} ${header.id === "select" ? "w-[40px] min-w-[40px] max-w-[40px] px-0" : "px-4"}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder ? null : (
                          <div className={`flex items-center w-full ${header.id === "select" ? "justify-center" : "justify-between"}`}>
                            <div className="flex items-center gap-1">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </div>
                            {header.column.getCanSort() && (
                              <div className="ml-2 flex-shrink-0">
                                {header.column.getIsSorted() === "asc" ? (
                                  <ArrowUp className="size-3.5 text-foreground" />
                                ) : header.column.getIsSorted() === "desc" ? (
                                  <ArrowDown className="size-3.5 text-foreground" />
                                ) : (
                                  <ArrowUpDown className="size-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell, cIndex) => {
                      const isSelectCol = cell.column.id === "select";
                      // During render, paint firmly selected cells. Current drag matrix uses DOM overriding anyway,
                      // but on initial render/pagination we need to paint what was finalized.
                      const isSelected = finalizedSelectionRef.current.has(`${row.index},${cIndex}`);
                      return (
                        <TableCell
                          key={cell.id}
                          data-row={row.index}
                          data-col={cIndex}
                          data-type={isSelectCol ? undefined : typeof cell.getValue()}
                          data-selected={isSelected ? "true" : undefined}
                          className={`data-cell select-none whitespace-nowrap font-mono text-sm max-w-[400px] border-r border-b last:border-r-0 bg-background data-[selected=true]:bg-blue-500/20 dark:data-[selected=true]:bg-blue-500/30 ${isSelectCol ? "w-[40px] min-w-[40px] max-w-[40px] p-0" : "px-4 py-1.5 cursor-cell"}`}
                          onMouseDown={(e) => {
                            if (isSelectCol) return;

                            const isAlreadySelected = finalizedSelectionRef.current.has(`${row.index},${cIndex}`);

                            if (e.button === 2) {
                              // On right click: if cell is already selected, do nothing (preserve selection for context menu)
                              if (isAlreadySelected) return;

                              // If it's not selected, we clear the previous selection and select this single cell
                              finalizedSelectionRef.current.clear();
                              updateSelectionDOM(row.index, cIndex, row.index, cIndex);
                              finalizedSelectionRef.current.add(`${row.index},${cIndex}`);
                              return;
                            }

                            e.preventDefault();
                            tableContainerRef.current?.focus();

                            // If ctrl/cmd is NOT held, clear the existing selection so we start a fresh one, just like Excel
                            if (!e.ctrlKey && !e.metaKey) {
                              finalizedSelectionRef.current.clear();
                            }

                            isSelectingCellRef.current = true;
                            selectionStartRef.current = { row: row.index, col: cIndex };
                            selectionEndRef.current = { row: row.index, col: cIndex };
                            updateSelectionDOM(row.index, cIndex, row.index, cIndex);
                          }}
                          onMouseEnter={(e) => {
                            if (isSelectCol) return;
                            if (isSelectingCellRef.current && selectionStartRef.current) {
                              selectionEndRef.current = { row: row.index, col: cIndex };
                              updateSelectionDOM(selectionStartRef.current.row, selectionStartRef.current.col, row.index, cIndex);
                            }
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </QueryResultsContextMenu>
      <div className="border-t bg-muted/40 px-4 py-1 flex items-center shrink-0 min-h-[34px] justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 py-0.5 px-2 font-semibold">
            {queryResult.rowCount} rows
          </Badge>

          {executionTime !== null && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 py-0.5 px-2 font-semibold">
              <Clock className="size-3 mr-1" />
              {executionTime}ms
            </Badge>
          )}

          {Object.keys(rowSelection).length > 0 && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 py-0.5 px-2 font-semibold">
              {Object.keys(rowSelection).length} selected rows
            </Badge>
          )}
        </div>

        <div ref={footerSummaryRef} className="flex items-center invisible select-none">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 py-0.5 px-2 font-semibold">
            <span ref={footerSummaryContentRef}></span>
          </Badge>
        </div>
      </div>
    </div>
  );
});
