"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Filter,
  Pin,
  PinOff,
  Loader2,
} from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import type { QueryResult } from "@/components/query/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Kbd } from "@/components/ui/kbd";
import { DrawerViewJson } from "../drawer-view-json";
import { toast } from "sonner";
import { Badge } from "../ui/badge";

type QueryResultsPanelProps = {
  isExecuting: boolean;
  queryResult: QueryResult | null;
  isExplainMode: boolean;
  executionTime: number | null;
  copyText: (text: string) => void | Promise<void>;
};

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
};

type SelectionSummary = {
  label: string;
};

type IndexedRow = {
  row: Record<string, unknown>;
  index: number;
};

const pageSize = 100;
const maxCellChars = 50;

export const QueryResultsPanel = React.memo(function QueryResultsPanel({
  isExecuting,
  queryResult,
  isExplainMode,
  executionTime,
  copyText,
}: QueryResultsPanelProps) {
  // #region handlers
  const formatFilterValue = React.useCallback((value: unknown) => {
    if (value === null || value === undefined) {
      return "NULL";
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }, []);
  const getTruncatedCellText = React.useCallback((text: string) => {
    if (text.length <= maxCellChars) {
      return { text, extra: 0 };
    }
    return {
      text: text.slice(0, maxCellChars),
      extra: text.length - maxCellChars,
    };
  }, []);

  // #endregion

  // #region States, variables, memos, refs
  const [columnWidths, setColumnWidths] = React.useState<
    Record<string, number>
  >({});
  const [openDrawerJson, setOpenDrawerJson] = React.useState(false);
  const [jsonContent, setJsonContent] = React.useState("");
  const resizeRef = React.useRef<{
    column: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [sortConfig, setSortConfig] = React.useState<SortConfig | null>(null);
  const [checkedRows, setCheckedRows] = React.useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = React.useState<
    Record<string, Set<string>>
  >({});
  const [hiddenColumns, setHiddenColumns] = React.useState<Set<string>>(
    new Set(),
  );
  const [pinnedColumns, setPinnedColumns] = React.useState<Set<string>>(
    new Set(),
  );
  const [openHiddenColumns, setOpenHiddenColumns] = React.useState(false);
  const hiddenColumnsRef = React.useRef<HTMLDivElement | null>(null);
  const [selectionStart, setSelectionStart] = React.useState<{
    row: number;
    col: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = React.useState<{
    row: number;
    col: number;
  } | null>(null);
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [openFilterColumn, setOpenFilterColumn] = React.useState<string | null>(
    null,
  );
  const filterPopoverRef = React.useRef<HTMLDivElement | null>(null);
  const filterButtonRefs = React.useRef<
    Record<string, HTMLButtonElement | null>
  >({});
  const tableContainerRef = React.useRef<HTMLDivElement | null>(null);

  const columnValueCounts = React.useMemo(() => {
    if (!queryResult) {
      return {} as Record<string, Record<string, number>>;
    }

    const counts: Record<string, Record<string, number>> = {};
    queryResult.columns.forEach((column) => {
      counts[column] = {};
    });

    queryResult.rows.forEach((row) => {
      queryResult.columns.forEach((column) => {
        const value = formatFilterValue(row[column]);
        const next = (counts[column]?.[value] ?? 0) + 1;
        counts[column][value] = next;
      });
    });

    return counts;
  }, [formatFilterValue, queryResult]);
  const [filterPopoverStyle, setFilterPopoverStyle] =
    React.useState<React.CSSProperties | null>(null);
  const indexedRows = React.useMemo<IndexedRow[]>(() => {
    return queryResult?.rows.map((row, index) => ({ row, index })) ?? [];
  }, [queryResult]);

  const filteredRows = React.useMemo<IndexedRow[]>(() => {
    if (!queryResult) {
      return [];
    }

    if (Object.keys(columnFilters).length === 0) {
      return indexedRows;
    }

    return indexedRows.filter((entry) => {
      for (const [column, values] of Object.entries(columnFilters)) {
        if (values.size === 0) {
          continue;
        }
        const cellValue = formatFilterValue(entry.row[column]);
        if (!values.has(cellValue)) {
          return false;
        }
      }
      return true;
    });
  }, [columnFilters, formatFilterValue, indexedRows, queryResult]);

  const visibleRowKeys = React.useMemo(
    () => filteredRows.map((entry) => String(entry.index)),
    [filteredRows],
  );
  const visibleColumns = React.useMemo(() => {
    const filtered = (queryResult?.columns ?? []).filter(
      (column) => !hiddenColumns.has(column),
    );
    return filtered.sort((a, b) => {
      const aPinned = pinnedColumns.has(a);
      const bPinned = pinnedColumns.has(b);
      if (aPinned === bPinned) return 0;
      return aPinned ? -1 : 1;
    });
  }, [hiddenColumns, pinnedColumns, queryResult?.columns]);

  const allVisibleSelected =
    visibleRowKeys.length > 0 &&
    visibleRowKeys.every((key) => checkedRows.has(key));

  // #endregion

  React.useEffect(() => {
    if (queryResult) {
      setPageIndex(0);
      setSortConfig(null);
      return;
    }
    setPageIndex(0);
    setSortConfig(null);
  }, [queryResult]);

  React.useEffect(() => {
    if (queryResult) {
      setColumnFilters({});
      setOpenFilterColumn(null);
      setHiddenColumns(new Set());
      setPinnedColumns(new Set());
      setOpenHiddenColumns(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelecting(false);
      return;
    }
    setColumnFilters({});
    setOpenFilterColumn(null);
    setHiddenColumns(new Set());
    setPinnedColumns(new Set());
    setOpenHiddenColumns(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  }, [queryResult]);

  React.useEffect(() => {
    if (!openFilterColumn) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const popover = filterPopoverRef.current;
      const button = filterButtonRefs.current[openFilterColumn];
      const target = event.target as Node;

      if (popover?.contains(target)) {
        return;
      }
      if (button?.contains(target)) {
        return;
      }

      setOpenFilterColumn(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openFilterColumn]);

  React.useEffect(() => {
    if (!openHiddenColumns) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (hiddenColumnsRef.current?.contains(target)) {
        return;
      }
      setOpenHiddenColumns(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openHiddenColumns]);

  React.useEffect(() => {
    if (!openFilterColumn) {
      setFilterPopoverStyle(null);
      return;
    }

    const updatePosition = () => {
      const button = filterButtonRefs.current[openFilterColumn];
      if (!button) {
        setFilterPopoverStyle(null);
        return;
      }

      const rect = button.getBoundingClientRect();
      const width = 240;
      const padding = 12;
      const left = Math.min(
        Math.max(padding, rect.right - width),
        window.innerWidth - width - padding,
      );
      const top = Math.min(rect.bottom + 8, window.innerHeight - padding);

      setFilterPopoverStyle({
        position: "fixed",
        top,
        left,
        width,
        zIndex: 50,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openFilterColumn]);

  const columnValueOptions = React.useMemo(() => {
    if (!queryResult) {
      return {} as Record<string, string[]>;
    }

    const options: Record<string, string[]> = {};
    queryResult.columns.forEach((column) => {
      const values = new Set<string>();
      queryResult.rows.forEach((row) => {
        values.add(formatFilterValue(row[column]));
      });

      const sorted = Array.from(values).sort((left, right) => {
        if (left === "NULL") {
          return right === "NULL" ? 0 : -1;
        }
        if (right === "NULL") {
          return 1;
        }
        return left.localeCompare(right);
      });

      options[column] = sorted;
    });

    return options;
  }, [formatFilterValue, queryResult]);

  const getCellValueInfo = React.useCallback(
    (value: unknown): { text: string; type: string } => {
      if (value === null || value === undefined) {
        return { text: "", type: "null" };
      }

      if (typeof value === "boolean") {
        return { text: String(value), type: "boolean" };
      }

      if (typeof value === "number") {
        return { text: String(value), type: "number" };
      }

      if (typeof value === "object") {
        try {
          return { text: JSON.stringify(value), type: "object" };
        } catch {
          return { text: String(value), type: "string" };
        }
      }

      const strValue = String(value);

      if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(strValue)) {
        return { text: strValue, type: "datetime" };
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
        return { text: strValue, type: "date" };
      }

      if (/^\d{2}:\d{2}:\d{2}/.test(strValue)) {
        return { text: strValue, type: "time" };
      }

      return { text: strValue, type: "string" };
    },
    [],
  );

  const getCellClassName = React.useCallback((type: string) => {
    switch (type) {
      case "number":
        return "text-blue-600 dark:text-blue-400 font-medium";
      case "string":
        return "text-green-700 dark:text-green-400";
      case "date":
        return "text-purple-600 dark:text-purple-400 font-medium";
      case "datetime":
        return "text-violet-600 dark:text-violet-400 font-medium";
      case "time":
        return "text-pink-600 dark:text-pink-400 font-medium";
      case "boolean":
        return "text-orange-600 dark:text-orange-400 font-semibold";
      case "object":
        return "text-cyan-600 dark:text-cyan-400 font-mono text-xs";
      default:
        return "";
    }
  }, []);

  const getExportRows = React.useCallback(() => {
    if (!queryResult) {
      return [] as Record<string, unknown>[];
    }

    if (checkedRows.size > 0) {
      return queryResult.rows.filter((_, idx) => checkedRows.has(String(idx)));
    }

    if (filteredRows.length !== queryResult.rows.length) {
      return filteredRows.map((entry) => entry.row);
    }

    return queryResult.rows;
  }, [checkedRows, filteredRows, queryResult]);

  const toggleColumnVisibility = React.useCallback((column: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  }, []);

  const toggleColumnPin = React.useCallback((column: string) => {
    setPinnedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  }, []);

  const showAllColumns = React.useCallback(() => {
    setHiddenColumns(new Set());
    setOpenHiddenColumns(false);
  }, []);

  const toggleSelectAll = React.useCallback(() => {
    if (!queryResult) return;
    setCheckedRows((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const key of visibleRowKeys) {
          next.delete(key);
        }
      } else {
        for (const key of visibleRowKeys) {
          next.add(key);
        }
      }
      return next;
    });
  }, [queryResult, allVisibleSelected, visibleRowKeys]);

  const exportToCSV = React.useCallback(() => {
    if (!queryResult || queryResult.rows.length === 0) return;

    const headers = queryResult.columns;
    const rows = getExportRows();

    const csvContent = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map((row) =>
        headers
          .map((col) => {
            const value = row[col];
            if (value === null || value === undefined) return "";
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `query-results-${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [getExportRows, queryResult]);

  const exportToJSON = React.useCallback(() => {
    if (!queryResult || queryResult.rows.length === 0) return;

    const rows = getExportRows();

    const jsonContent = JSON.stringify(rows, null, 2);

    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `query-results-${Date.now()}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [getExportRows, queryResult]);

  React.useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;
      switch (detail?.type) {
        case "result-export-csv":
          exportToCSV();
          break;
        case "result-export-json":
          exportToJSON();
          break;
        case "result-show-all-columns":
          showAllColumns();
          break;
        default:
          break;
      }
    };

    globalThis.addEventListener("usql:command", handleCommand);
    return () => globalThis.removeEventListener("usql:command", handleCommand);
  }, [exportToCSV, exportToJSON, showAllColumns]);

  const viewJson = (j) => {
    try {
      const json = JSON.stringify(JSON.parse(j), null, 2);
      setJsonContent(json);
      setOpenDrawerJson(true);
    } catch {
      toast.error("Selected cell is not valid JSON");
    }
  };

  const startResize = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, column: string) => {
      event.preventDefault();
      event.stopPropagation();

      const headerCell = event.currentTarget.parentElement;
      const startWidth = headerCell
        ? Math.round(headerCell.getBoundingClientRect().width)
        : (columnWidths[column] ?? 150);

      resizeRef.current = {
        column,
        startX: event.clientX,
        startWidth,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const current = resizeRef.current;
        if (!current) {
          return;
        }

        const delta = moveEvent.clientX - current.startX;
        const nextWidth = Math.max(80, current.startWidth + delta);

        setColumnWidths((prev) => ({
          ...prev,
          [current.column]: nextWidth,
        }));
      };

      const handleMouseUp = () => {
        resizeRef.current = null;
        globalThis.removeEventListener("mousemove", handleMouseMove);
        globalThis.removeEventListener("mouseup", handleMouseUp);
      };

      globalThis.addEventListener("mousemove", handleMouseMove);
      globalThis.addEventListener("mouseup", handleMouseUp);
    },
    [columnWidths],
  );

  const sortedRows = React.useMemo(() => {
    if (!queryResult?.rows || !sortConfig) {
      return filteredRows;
    }

    const { key, direction } = sortConfig;
    const rows = [...filteredRows];
    rows.sort((left, right) => {
      const a = left.row[key];
      const b = right.row[key];

      if (a === null && b === null) {
        return 0;
      }
      if (a === null) {
        return 1;
      }
      if (b === null) {
        return -1;
      }

      if (typeof a === "number" && typeof b === "number") {
        return a - b;
      }

      return String(a).localeCompare(String(b));
    });

    return direction === "asc" ? rows : rows.reverse();
  }, [filteredRows, queryResult?.rows, sortConfig]);

  const handleSort = React.useCallback((column: string) => {
    setPageIndex(0);
    setSortConfig((current) => {
      if (current?.key === column) {
        return {
          key: column,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return { key: column, direction: "asc" };
    });
  }, []);

  const totalRows = sortedRows.length;
  const totalPages = totalRows > 0 ? Math.ceil(totalRows / pageSize) : 1;
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pageStart = totalRows === 0 ? 0 : safePageIndex * pageSize + 1;
  const pageEnd =
    totalRows === 0 ? 0 : Math.min(totalRows, (safePageIndex + 1) * pageSize);
  const pagedRows = sortedRows.slice(safePageIndex * pageSize, pageEnd);
  const canPaginate = Boolean(
    queryResult && !queryResult.error && totalRows > 0,
  );

  const selectionRange = React.useMemo(() => {
    if (!selectionStart || !selectionEnd) {
      return null;
    }

    const rowStart = Math.min(selectionStart.row, selectionEnd.row);
    const rowEnd = Math.max(selectionStart.row, selectionEnd.row);
    const colStart = Math.min(selectionStart.col, selectionEnd.col);
    const colEnd = Math.max(selectionStart.col, selectionEnd.col);

    return { rowStart, rowEnd, colStart, colEnd };
  }, [selectionEnd, selectionStart]);

  const selectionSummary = React.useMemo<SelectionSummary | null>(() => {
    if (!selectionRange || pagedRows.length === 0) {
      return null;
    }

    let sum = 0;
    let count = 0;
    let allNumeric = true;

    for (let r = selectionRange.rowStart; r <= selectionRange.rowEnd; r += 1) {
      const rowEntry = pagedRows[r];
      if (!rowEntry) {
        continue;
      }
      for (
        let c = selectionRange.colStart;
        c <= selectionRange.colEnd;
        c += 1
      ) {
        const column = visibleColumns[c];
        if (!column) {
          continue;
        }
        const value = rowEntry.row[column];
        count += 1;
        if (typeof value === "number" && Number.isFinite(value)) {
          sum += value;
        } else {
          allNumeric = false;
        }
      }
    }

    if (count === 0) {
      return null;
    }

    if (allNumeric) {
      return { label: `Sum ${sum.toLocaleString()}` };
    }

    return { label: `Count ${count.toLocaleString()}` };
  }, [pagedRows, selectionRange, visibleColumns]);
  const hasSelection = Boolean(selectionRange);

  const getCellCopyValue = React.useCallback(
    (value: unknown) => {
      const info = getCellValueInfo(value);
      if (info.type === "null") {
        return "NULL";
      }
      return info.text;
    },
    [getCellValueInfo],
  );

  const getSelectedMatrix = React.useCallback(() => {
    if (!selectionRange) {
      return [] as string[][];
    }

    const rows: string[][] = [];
    for (let r = selectionRange.rowStart; r <= selectionRange.rowEnd; r += 1) {
      const rowEntry = pagedRows[r];
      if (!rowEntry) {
        continue;
      }
      const rowValues: string[] = [];
      for (
        let c = selectionRange.colStart;
        c <= selectionRange.colEnd;
        c += 1
      ) {
        const column = visibleColumns[c];
        if (!column) {
          continue;
        }
        rowValues.push(getCellCopyValue(rowEntry.row[column]));
      }
      if (rowValues.length > 0) {
        rows.push(rowValues);
      }
    }

    return rows;
  }, [getCellCopyValue, pagedRows, selectionRange, visibleColumns]);

  const getSelectedMatrixWithTypes = React.useCallback(() => {
    if (!selectionRange) {
      return [] as Array<Array<{ value: string; type: string }>>;
    }

    const rows: Array<Array<{ value: string; type: string }>> = [];
    for (let r = selectionRange.rowStart; r <= selectionRange.rowEnd; r += 1) {
      const rowEntry = pagedRows[r];
      if (!rowEntry) {
        continue;
      }
      const rowValues: Array<{ value: string; type: string }> = [];
      for (
        let c = selectionRange.colStart;
        c <= selectionRange.colEnd;
        c += 1
      ) {
        const column = visibleColumns[c];
        if (!column) {
          continue;
        }
        const cellValue = rowEntry.row[column];
        const info = getCellValueInfo(cellValue);
        rowValues.push({
          value: getCellCopyValue(cellValue),
          type: info.type,
        });
      }
      if (rowValues.length > 0) {
        rows.push(rowValues);
      }
    }

    return rows;
  }, [
    getCellCopyValue,
    getCellValueInfo,
    pagedRows,
    selectionRange,
    visibleColumns,
  ]);

  const copySelection = React.useCallback(
    (
      separator: string,
      options?: {
        withQuotes?: boolean;
        flattenRows?: boolean;
        smartQuote?: boolean;
      },
    ) => {
      const rows = getSelectedMatrix();
      if (rows.length === 0) {
        return;
      }

      const withQuotes = options?.withQuotes ?? false;
      const flattenRows = options?.flattenRows ?? false;
      const smartQuote = options?.smartQuote ?? false;

      const normalizeValue = (value: string) => {
        const normalized = value.replace(/\r?\n/g, " ");
        if (!withQuotes) {
          return normalized;
        }
        return `"${normalized.replace(/"/g, '""')}"`;
      };

      if (smartQuote) {
        const rowsWithTypes = getSelectedMatrixWithTypes();
        const content = flattenRows
          ? rowsWithTypes
            .flat()
            .map((item) => {
              if (item.type === "string") {
                return `"${item.value.replace(/"/g, '""')}"`;
              }
              return item.value;
            })
            .join(separator)
          : rowsWithTypes
            .map((row) =>
              row
                .map((item) => {
                  if (item.type === "string") {
                    return `'${item.value.replace(/'/g, "''")}'`;
                  }
                  return item.value;
                })
                .join(separator),
            )
            .join("\n");
        void copyText(content);
        return;
      }

      const content = flattenRows
        ? rows.flat().map(normalizeValue).join(separator)
        : rows.map((row) => row.map(normalizeValue).join(separator)).join("\n");
      void copyText(content);
    },
    [copyText, getSelectedMatrix, getSelectedMatrixWithTypes],
  );

  const handleCopyInStatement = React.useCallback(() => {
    const matrix = getSelectedMatrixWithTypes();
    if (matrix.length === 0) return;

    const values: string[] = [];
    matrix.forEach((row) => {
      row.forEach((cell) => {
        if (cell.type !== "null") {
          const formatted =
            cell.type === "number"
              ? cell.value
              : `'${cell.value.replace(/'/g, "''")}'`;
          values.push(formatted);
        }
      });
    });

    if (values.length === 0) return;

    const uniqueValues = Array.from(new Set(values));
    const inStatement = `IN (${uniqueValues.join(", ")})`;
    void copyText(inStatement);
    toast.success("Copied IN statement to clipboard");
  }, [copyText, getSelectedMatrixWithTypes]);

  React.useEffect(() => {
    if (!hasSelection) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (!event.shiftKey && key === "c") {
        event.preventDefault();
        event.stopPropagation();
        copySelection("\t");
        return;
      }

      if (event.shiftKey && key === "m") {
        event.preventDefault();
        event.stopPropagation();
        copySelection(",", { flattenRows: true, smartQuote: true });
        return;
      }

      if (event.shiftKey && key === "i") {
        event.preventDefault();
        event.stopPropagation();
        handleCopyInStatement();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [copySelection, hasSelection]);

  React.useEffect(() => {
    const shouldResetSelection = pageIndex >= 0 && visibleColumns.length >= 0;
    if (!shouldResetSelection) {
      return;
    }
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  }, [pageIndex, visibleColumns]);

  React.useEffect(() => {
    if (!isSelecting) {
      return;
    }

    const handleMouseUp = () => {
      setIsSelecting(false);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isSelecting]);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Element;
      if (tableContainerRef.current?.contains(target)) {
        return;
      }
      // Do not clear selection if clicking on the context menu or other popovers
      if (target.closest('[role="menu"]') || target.closest('[data-radix-popper-content-wrapper]')) {
        return;
      }
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const toggleFilterValue = React.useCallback(
    (column: string, value: string) => {
      setColumnFilters((prev) => {
        const next = new Set(prev[column] ?? []);
        if (next.has(value)) {
          next.delete(value);
        } else {
          next.add(value);
        }

        const updated = { ...prev };
        if (next.size === 0) {
          delete updated[column];
        } else {
          updated[column] = next;
        }
        return updated;
      });
      setPageIndex(0);
    },
    [],
  );

  const clearColumnFilter = React.useCallback((column: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[column];
      return next;
    });
    setPageIndex(0);
  }, []);

  const handleCellMouseDown = React.useCallback(
    (
      row: number,
      col: number,
      event: React.MouseEvent<HTMLTableCellElement>,
    ) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      setSelectionStart({ row, col });
      setSelectionEnd({ row, col });
      setIsSelecting(true);
    },
    [],
  );

  const handleCellMouseEnter = React.useCallback(
    (row: number, col: number) => {
      if (!isSelecting) {
        return;
      }
      setSelectionEnd({ row, col });
    },
    [isSelecting],
  );
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Ctrl + Alt + J
      if (event.ctrlKey && event.altKey && key === "j") {
        event.preventDefault();
        event.stopPropagation();
        void viewJson(getSelectedMatrix()[0][0]);
        return;
      }

      // Ctrl/Cmd + Shift + ...
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) {
        return;
      }

      if (key === "c") {
        event.preventDefault();
        event.stopPropagation();
        void exportToCSV();
      } else if (key === "j") {
        event.preventDefault();
        event.stopPropagation();
        void exportToJSON();
      } else if (key === "h") {
        event.preventDefault();
        event.stopPropagation();
        showAllColumns();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [exportToCSV, exportToJSON, showAllColumns, getSelectedMatrix]);
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-md border">
      <div className="border-b px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 justify-center">
            <span className="font-medium text-foreground">Results</span>
            {hiddenColumns.size > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {hiddenColumns.size} col{hiddenColumns.size > 1 ? "s" : ""} hidden
              </span>
            )}

            {isExplainMode && (
              <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                EXPLAIN ANALYZE
              </span>
            )}
            {executionTime !== null && (
              <span className="font-mono">
                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                  <Clock />
                  {executionTime.toLocaleString()} ms
                </Badge>
              </span>
            )}
            {selectionSummary ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {selectionSummary.label}
              </span>
            ) : null}
          </div>
          <div className="font-medium text-xs text-muted-foreground ml-2">
            <kbd className="rounded-sm border border-border bg-muted px-1 text-xs font-mono text-muted-foreground">
              ⇧ + Wheel
            </kbd>
            <span className="text-xs italic text-muted-foreground"> to scroll horizontally</span>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {isExecuting ? (
          <div className="flex h-full w-full items-center justify-center p-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="size-8 animate-spin text-muted-foreground/50" />
              <span className="text-sm font-medium text-muted-foreground/70 animate-pulse">
                Executing query...
              </span>
            </div>
          </div>
        ) : !queryResult ? (
          <div className="p-4 text-sm text-muted-foreground">
            Run a query to see results.
          </div>
        ) : queryResult.error ? (
          <div className="flex items-start justify-between gap-4 p-4 text-sm text-destructive">
            <span className="min-w-0 whitespace-pre-wrap">
              {queryResult.error}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void copyText(queryResult.error ?? "")}
              className="h-7 px-2 text-xs"
            >
              <span className="inline-flex items-center gap-1">
                <Copy className="size-3.5" />
                <span>Copy error</span>
              </span>
            </Button>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            {queryResult.rows.length === 0
              ? "Query returned no rows."
              : "No rows match the current filters."}
          </div>
        ) : (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="w-full overflow-x-auto" ref={tableContainerRef}>
                <table className="w-full min-w-max text-sm select-none">
                  <thead className="sticky top-0 bg-card">
                    <tr>
                      <th className="border-b border-l px-3 py-2 text-left font-medium text-muted-foreground first:border-l-0 w-10">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={() => void toggleSelectAll()}
                        />
                      </th>
                      {visibleColumns.map((column) => {
                        const isPinned = pinnedColumns.has(column);

                        return (
                          <th
                            key={column}
                            className={
                              "relative border-b border-l px-3 py-2 text-left font-medium text-muted-foreground first:border-l-0 " +
                              (isPinned ? "sticky bg-card shadow-sm z-10" : "")
                            }
                            style={{
                              width: columnWidths[column] ?? 150,
                              ...(isPinned && {
                                left: Array.from(visibleColumns)
                                  .slice(0, visibleColumns.indexOf(column))
                                  .filter((col) => pinnedColumns.has(col))
                                  .reduce(
                                    (sum, col) =>
                                      sum + (columnWidths[col] ?? 150),
                                    0,
                                  ),
                              }),
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => toggleColumnVisibility(column)}
                                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  aria-label={`Hide ${column}`}
                                >
                                  <Eye className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleColumnPin(column)}
                                  className="rounded p-0.5 hover:bg-muted text-foreground"
                                  aria-label={`Pin ${column}`}
                                >
                                  {pinnedColumns.has(column) ? (
                                    <Pin className="size-3.5" />
                                  ) : (
                                    <PinOff className="size-3.5" />
                                  )}
                                </button>
                                <span className="truncate">{column}</span>
                                <div className="relative">
                                  <button
                                    ref={(node) => {
                                      filterButtonRefs.current[column] = node;
                                    }}
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenFilterColumn((current) =>
                                        current === column ? null : column,
                                      );
                                    }}
                                    className={
                                      "rounded p-0.5 hover:bg-muted " +
                                      (columnFilters[column]?.size
                                        ? "text-foreground"
                                        : "text-muted-foreground")
                                    }
                                    aria-label={`Filter ${column}`}
                                  >
                                    <Filter className="size-3.5" />
                                  </button>
                                  {openFilterColumn === column &&
                                    filterPopoverStyle
                                    ? createPortal(
                                      <div
                                        ref={filterPopoverRef}
                                        style={filterPopoverStyle}
                                        className="rounded-md border bg-card p-2 shadow-lg"
                                      >
                                        <div className="max-h-64 overflow-auto">
                                          {(columnValueOptions[column] ?? [])
                                            .length > 0 ? (
                                            columnValueOptions[column].map(
                                              (value) => {
                                                const isChecked =
                                                  columnFilters[column]?.has(
                                                    value,
                                                  ) ?? false;
                                                const count =
                                                  columnValueCounts[column]?.[
                                                  value
                                                  ] ?? 0;
                                                return (
                                                  <div
                                                    key={value}
                                                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                                                  >
                                                    <Checkbox
                                                      checked={isChecked}
                                                      onCheckedChange={() =>
                                                        toggleFilterValue(
                                                          column,
                                                          value,
                                                        )
                                                      }
                                                    />
                                                    <span className="truncate">
                                                      {value}
                                                    </span>
                                                    <span className="ml-auto text-xs text-muted-foreground">
                                                      {count}
                                                    </span>
                                                  </div>
                                                );
                                              },
                                            )
                                          ) : (
                                            <div className="px-2 py-1 text-xs text-muted-foreground">
                                              No values
                                            </div>
                                          )}
                                        </div>
                                        {columnFilters[column]?.size ? (
                                          <div className="mt-2 flex items-center justify-end">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                clearColumnFilter(column)
                                              }
                                              className="text-xs text-muted-foreground hover:text-foreground"
                                            >
                                              Clear filter
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>,
                                      document.body,
                                    )
                                    : null}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSort(column)}
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label={`Sort by ${column}`}
                              >
                                {sortConfig?.key === column ? (
                                  sortConfig.direction === "asc" ? (
                                    <ArrowUp className="size-3.5" />
                                  ) : (
                                    <ArrowDown className="size-3.5" />
                                  )
                                ) : (
                                  <ArrowUpDown className="size-3.5" />
                                )}
                              </button>
                            </div>
                            <button
                              type="button"
                              onMouseDown={(event) =>
                                startResize(event, column)
                              }
                              className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                              aria-label={`Resize ${column}`}
                            />
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((entry, rowIndex) => {
                      const rowKey = String(entry.index);
                      return (
                        <tr key={rowKey}>
                          <td className="border-b border-l px-3 py-2 align-top first:border-l-0 w-5">
                            <Checkbox
                              checked={checkedRows.has(rowKey)}
                              onCheckedChange={() => toggleRowCheckbox(rowKey)}
                            />
                          </td>
                          {visibleColumns.map((column, colIndex) => {
                            const isPinned = pinnedColumns.has(column);
                            return (
                              <td
                                key={column}
                                onMouseDown={(event) =>
                                  handleCellMouseDown(rowIndex, colIndex, event)
                                }
                                onMouseEnter={() =>
                                  handleCellMouseEnter(rowIndex, colIndex)
                                }
                                className={
                                  "truncate border-b border-l px-3 py-2 align-top first:border-l-0 " +
                                  (isPinned
                                    ? "sticky bg-card z-0 shadow-sm"
                                    : "") +
                                  " " +
                                  (selectionRange &&
                                    rowIndex >= selectionRange.rowStart &&
                                    rowIndex <= selectionRange.rowEnd &&
                                    colIndex >= selectionRange.colStart &&
                                    colIndex <= selectionRange.colEnd
                                    ? "bg-primary/10"
                                    : "")
                                }
                                style={{
                                  width: columnWidths[column] ?? 150,
                                  ...(isPinned && {
                                    left: Array.from(visibleColumns)
                                      .slice(0, visibleColumns.indexOf(column))
                                      .filter((col) => pinnedColumns.has(col))
                                      .reduce(
                                        (sum, col) =>
                                          sum + (columnWidths[col] ?? 150),
                                        0,
                                      ),
                                  }),
                                }}
                              >
                                {(() => {
                                  const cellInfo = getCellValueInfo(
                                    entry.row[column],
                                  );
                                  if (cellInfo.type === "null") {
                                    return (
                                      <div className="font-semibold italic text-muted-foreground">
                                        NULL
                                      </div>
                                    );
                                  }
                                  if (
                                    cellInfo.type === "string" &&
                                    cellInfo.text === ""
                                  ) {
                                    return (
                                      <div className="font-semibold italic text-muted-foreground">
                                        ""
                                      </div>
                                    );
                                  }
                                  const { text: displayText, extra } =
                                    getTruncatedCellText(cellInfo.text);
                                  return (
                                    <div className="flex items-start gap-2">
                                      <span
                                        className={getCellClassName(
                                          cellInfo.type,
                                        )}
                                      >
                                        {displayText}
                                      </span>
                                      {extra > 0 ? (
                                        <span className="mt-0.5 inline-flex items-center rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                                          +{extra}
                                        </span>
                                      ) : null}
                                    </div>
                                  );
                                })()}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                disabled={!hasSelection}
                onSelect={() =>
                  copySelection(",", { flattenRows: true, smartQuote: true })
                }
              >
                Copy with separator (,)
                <Kbd className="ml-auto text-xs">⌘ ⇧ M</Kbd>
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!hasSelection}
                onSelect={() => copySelection("\t")}
              >
                Copy
                <Kbd className="ml-auto text-xs">⌘ + C</Kbd>
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!hasSelection}
                onSelect={() => {
                  void viewJson(getSelectedMatrix()[0][0]);
                }}
              >
                View as JSON
                <Kbd className="ml-auto text-xs">⌘ + ⌥ + J</Kbd>
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!hasSelection}
                onSelect={handleCopyInStatement}
              >
                Copy as IN statement
                <Kbd className="ml-auto text-xs">⌘ ⇧ I</Kbd>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )}
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground shadow">
            <Button
              variant="ghost"
              size="icon"
              disabled={!canPaginate || safePageIndex === 0}
              onClick={() =>
                setPageIndex((current) => Math.max(0, current - 1))
              }
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {queryResult ? (
              <span className="min-w-30 text-center">
                {pageStart}-{pageEnd} of {totalRows}
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              disabled={!canPaginate || safePageIndex >= totalPages - 1}
              onClick={() =>
                setPageIndex((current) => Math.min(totalPages - 1, current + 1))
              }
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        <DrawerViewJson
          open={openDrawerJson}
          onOpenChange={setOpenDrawerJson}
          json={jsonContent}
        />
      </div>
    </div>
  );

  function toggleRowCheckbox(rowKey: string) {
    setCheckedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  }
});
