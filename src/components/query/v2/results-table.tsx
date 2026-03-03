import * as React from "react";
import {
  flexRender, Row, Column,
  getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel,
  getFacetedRowModel, getFacetedUniqueValues,
  useReactTable,
  ColumnDef, RowSelectionState, SortingState, ColumnFiltersState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Loader2, EyeOff, RotateCcw, Filter, X, Search } from "lucide-react";
import { debounce } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";


interface ResultsTableProps {
  data: Record<string, unknown>[];
  columns: ColumnDef<Record<string, unknown>>[];
  sorting: SortingState;
  onSortingChange: React.Dispatch<React.SetStateAction<SortingState>>;
  onSelectionChange: (count: number) => void;
  getSelectedRowsRef: React.MutableRefObject<() => Record<string, unknown>[]>;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  finalizedSelectionRef: React.RefObject<Set<string>>;
  onCellMouseDown: (e: React.MouseEvent, row: number, col: number, isSelectCol: boolean) => void;
  onCellMouseEnter: (row: number, col: number, isSelectCol: boolean) => void;
  onCopy: () => void;
  onCopyInStatement: () => void;
}

// ✅ Tách row ra component riêng với custom areEqual
// Chỉ re-render khi đúng row đó thay đổi selection
interface MemoizedRowProps {
  row: Row<Record<string, unknown>>;
  isSelected: boolean; // primitive, dùng để compare
  columnVisibility: any;
  finalizedSelectionRef: React.RefObject<Set<string>>;
  onCellMouseDown: (e: React.MouseEvent, row: number, col: number, isSelectCol: boolean) => void;
  onCellMouseEnter: (row: number, col: number, isSelectCol: boolean) => void;
}

const MemoizedTableRow = React.memo(
  function MemoizedTableRow({ row, finalizedSelectionRef, onCellMouseDown, onCellMouseEnter }: MemoizedRowProps) {
    return (
      <TableRow
        data-state={row.getIsSelected() && "selected"}
        className="hover:bg-muted/50"
      >
        {row.getVisibleCells().map((cell, cIndex) => {
          const isSelectCol = cell.column.id === "select";
          const isSelected = finalizedSelectionRef.current?.has(`${row.index},${cIndex}`);
          return (
            <TableCell
              key={cell.id}
              data-row={row.index}
              data-col={cIndex}
              data-type={isSelectCol ? undefined : typeof cell.getValue()}
              data-selected={isSelected ? "true" : undefined}
              className={`data-cell select-none whitespace-nowrap font-mono text-sm max-w-[400px] border-r bg-background data-[selected=true]:bg-blue-500/20 dark:data-[selected=true]:bg-blue-500/30 ${isSelectCol ? "w-[40px] min-w-[40px] max-w-[40px] p-0" : "px-4 py-1.5 cursor-cell"}`}
              onContextMenu={(e) => { if (isSelectCol) e.stopPropagation(); }}
              onMouseDown={(e) => onCellMouseDown(e, row.index, cIndex, isSelectCol)}
              onMouseEnter={() => onCellMouseEnter(row.index, cIndex, isSelectCol)}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        })}
      </TableRow>
    );
  },
  // ✅ Custom compare: chỉ re-render khi đúng row này thay đổi selection HOẶC visibility thay đổi
  (prev, next) =>
    prev.row.id === next.row.id &&
    prev.isSelected === next.isSelected &&
    prev.columnVisibility === next.columnVisibility && // Chỉ re-render khi visibility change
    prev.row.original === next.row.original
);

interface ColumnFilterPopoverProps {
  column: Column<Record<string, unknown>, unknown>;
  filterValue: string[]; // ✅ prop reactive từ parent
}

function ColumnFilterPopover({ column, filterValue }: ColumnFilterPopoverProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  const { sortedUniqueValues, countMap } = React.useMemo(() => {
    const values = new Set<string>();
    const countMap = new Map<string, number>();
    column.getFacetedUniqueValues().forEach((count, val) => {
      const strVal = val === null || val === undefined ? "(Blanks)" : String(val);
      values.add(strVal);
      countMap.set(strVal, (countMap.get(strVal) ?? 0) + count);
    });
    return { sortedUniqueValues: Array.from(values).sort(), countMap };
  }, [column, column.getFacetedUniqueValues()]);

  const filteredValues = React.useMemo(
    () => sortedUniqueValues.filter((v) =>
      v.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [sortedUniqueValues, searchTerm]
  );

  const selectedValuesSet = React.useMemo(
    () => new Set((filterValue ?? []).map(String)),
    [filterValue],
  );

  const [listEl, setListEl] = React.useState<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: filteredValues.length,
    getScrollElement: () => listEl, // ✅ dùng state thay vì ref
    estimateSize: () => 32,
    overscan: 5,
  });

  // ✅ Tự động measure khi element mount vào DOM
  React.useLayoutEffect(() => {
    if (listEl) virtualizer.measure();
  }, [listEl]);

  const toggleValue = (value: string) => {
    column.setFilterValue((prev: any[] | undefined) => {
      const current = Array.isArray(prev) ? prev.map(String) : [];
      const index = current.indexOf(value);
      if (index === -1) return [...current, value];
      const next = current.filter((v) => v !== value);
      return next.length === 0 ? undefined : next;
    });
  };

  const isAllSelected = !filterValue?.length || filterValue.length === sortedUniqueValues.length;

  return (
    <PopoverContent className="w-60 p-0" align="start">
      <div className="flex flex-col">
        <div className="p-2 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search ${sortedUniqueValues.length} values...`}
              className="h-8 pl-8 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Select All row - ngoài virtual list */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors border-b"
          onClick={(e) => { e.stopPropagation(); column.setFilterValue(undefined); }}
        >
          <Checkbox checked={isAllSelected} className="size-3.5 pointer-events-none" />
          <span className="text-xs font-medium flex-1">(Select All)</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
            {filteredValues.length}
          </span>
        </div>

        {/* ✅ Virtual scroll container — fixed height */}
        <div
          ref={setListEl} // ✅ callback ref — gọi ngay khi DOM ready
          className="overflow-y-auto p-1"
          style={{ maxHeight: 240 }}
        >
          {/* ✅ Total height container để scrollbar đúng */}
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const value = filteredValues[virtualItem.index];
              return (
                <Label
                  key={virtualItem.key}
                  style={{
                    position: "absolute",
                    top: virtualItem.start,
                    left: 0,
                    right: 0,
                    height: virtualItem.size,
                  }}
                  className="flex items-center gap-2 px-2 hover:bg-muted/50 rounded-sm cursor-pointer transition-colors font-normal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedValuesSet.has(value)}
                    onCheckedChange={() => toggleValue(value)}
                    className="size-3.5"
                  />
                  <span className="text-xs truncate flex-1">{value}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0 tabular-nums">
                    {countMap.get(value) ?? 0}
                  </span>
                </Label>
              );
            })}
          </div>
        </div>

        {filteredValues.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground italic">No values found</div>
        )}

        <div className="p-2 border-t flex justify-end bg-muted/10">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider"
            onClick={() => column.setFilterValue(undefined)}
          >
            Clear
          </Button>
        </div>
      </div>
    </PopoverContent>
  );
}
export const ResultsTable = React.memo(function ResultsTable({
  data, columns, sorting, onSortingChange,
  onSelectionChange, getSelectedRowsRef,
  tableContainerRef, finalizedSelectionRef,
  onCellMouseDown, onCellMouseEnter, onCopy, onCopyInStatement,
}: ResultsTableProps) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [isPageChanging, setIsPageChanging] = React.useState(false);

  // Wrapper to handle page changes with a loading state
  const handlePageChange = React.useCallback((action: () => void) => {
    setIsPageChanging(true);
    // Use a small timeout to allow the loading state to be painted before the heavy table update
    setTimeout(() => {
      action();
      // After the action (which is synchronous in react-table), we can reset the loading state
      // Wrapping in another timeout or requestAnimationFrame ensures the paint has happened
      requestAnimationFrame(() => {
        setIsPageChanging(false);
      });
    }, 10);
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange,
    onRowSelectionChange: (updater) => {
      setRowSelection((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        onSelectionChange(Object.keys(next).length);
        return next;
      });
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    filterFns: {
      arrIncludes: (row, columnId, filterValue: string[]) => {
        const val = row.getValue(columnId);
        const strVal = val === null || val === undefined ? "(Blanks)" : String(val);
        return filterValue.includes(strVal);
      },
    },
    defaultColumn: {
      filterFn: "arrIncludes",
    },
    enableRowSelection: true,
    state: { sorting, rowSelection, columnVisibility, columnFilters },
    initialState: { pagination: { pageSize: 100 } },
  });

  React.useEffect(() => {
    getSelectedRowsRef.current = () =>
      table.getSelectedRowModel().rows.map((r) => r.original);
  });

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Table Header/Pagination */}
      <div className="flex items-center justify-between border-b px-4 py-1 text-xs bg-muted/30 shrink-0 min-h-[34px]">
        <div className="flex items-center gap-2">
          {!table.getIsAllColumnsVisible() && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 gap-1 font-bold uppercase tracking-tighter"
              onClick={() => table.resetColumnVisibility()}
            >
              <RotateCcw className="size-3" />
              Reset Columns
            </Button>
          )}
          {columnFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 gap-1 font-bold uppercase tracking-tighter"
              onClick={() => table.resetColumnFilters()}
            >
              <X className="size-3" />
              Clear Filters
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}</span>
          <div className="flex gap-1 ml-2">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handlePageChange(() => table.previousPage())}
              disabled={!table.getCanPreviousPage() || isPageChanging}
            >
              <ChevronLeft className="size-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handlePageChange(() => table.nextPage())}
              disabled={!table.getCanNextPage() || isPageChanging}
            >
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto relative focus:outline-none"
        ref={tableContainerRef}
        tabIndex={-1}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "c") { e.preventDefault(); onCopy(); }
          if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "i") { e.preventDefault(); onCopyInStatement(); }
        }}
      >
        {isPageChanging && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/50 backdrop-blur-[1px] animate-in fade-in duration-200">
            <div className="flex flex-col items-center gap-2 bg-card p-4 rounded-lg border shadow-lg">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Loading page...</span>
            </div>
          </div>
        )}
        <Table className="border-collapse border-spacing-0">
          <TableHeader
            className="sticky top-0 bg-background z-10 shadow-sm"
            onContextMenu={(e) => e.stopPropagation()}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`group whitespace-nowrap py-2 font-semibold select-none sticky top-0 z-20 bg-background border-b border-r ${header.id === "select" ? "w-[40px] min-w-[40px] max-w-[40px] px-0" : "px-4"}`}
                  >
                    {header.isPlaceholder ? null : header.id === "select" ? (
                      <div className="flex items-center justify-center w-full">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              header.column.toggleVisibility(false);
                            }}
                          >
                            <EyeOff className="size-3" />
                          </Button>
                          <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-5 w-5 text-muted-foreground hover:text-foreground shrink-0 ${header.column.getFilterValue() ? "text-blue-500 opacity-100" : ""}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Filter className="size-3" />
                              </Button>
                            </PopoverTrigger>
                            <ColumnFilterPopover
                              column={header.column}
                              filterValue={(header.column.getFilterValue() as string[]) ?? []} // ✅
                            />
                          </Popover>
                        </div>
                        {header.column.getCanSort() && (
                          <div className="ml-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-5 w-5 hover:text-foreground transition-opacity ${header.column.getIsSorted() ? "opacity-100 text-foreground" : "opacity-0 group-hover:opacity-100 text-muted-foreground/50"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const handler = header.column.getToggleSortingHandler();
                                if (handler) handler(e);
                              }}
                            >
                              {header.column.getIsSorted() === "asc" ? (
                                <ArrowUp className="size-3.5" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ArrowDown className="size-3.5" />
                              ) : (
                                <ArrowUpDown className="size-3.5" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                // ✅ Truyền isSelected như primitive để areEqual so sánh đúng
                <MemoizedTableRow
                  key={row.id}
                  row={row}
                  isSelected={row.getIsSelected()}
                  columnVisibility={columnVisibility}
                  finalizedSelectionRef={finalizedSelectionRef}
                  onCellMouseDown={onCellMouseDown}
                  onCellMouseEnter={onCellMouseEnter}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});