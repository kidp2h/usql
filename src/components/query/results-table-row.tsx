import * as React from "react";
import { Row, flexRender } from "@tanstack/react-table";
import { TableRow, TableCell } from "@/components/ui/table";

interface MemoizedRowProps {
  row: Row<Record<string, unknown>>;
  isSelected: boolean;
  columnVisibility: any;
  finalizedSelectionRef: React.RefObject<Set<string>>;
  onCellMouseDown: (e: React.MouseEvent, row: number, col: number, isSelectCol: boolean) => void;
  onCellMouseEnter: (row: number, col: number, isSelectCol: boolean) => void;
}

export const MemoizedTableRow = React.memo(
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
  (prev, next) =>
    prev.row.id === next.row.id &&
    prev.isSelected === next.isSelected &&
    prev.columnVisibility === next.columnVisibility &&
    prev.row.original === next.row.original
);
