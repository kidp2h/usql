"use client";

import * as React from "react";
import type { TreeDataItem } from "@/components/tree-view";
import { Badge } from "@/components/ui/badge";
import { ConnectionContextMenu } from "@/components/connection-context-menu";
import { TableContextMenu } from "@/components/table-context-menu";
import { cn, formatRelativeTime, formatBytes } from "@/lib/utils";
import {
  PostgresIcon,
  SchemaIcon,
  TableIcon,
  FolderIcon,
  IndexIcon,
  QueryIcon,
  ColumnPrimaryIcon,
  ColumnForeignIcon,
  ColumnDefaultIcon,
} from "@/hooks/use-tree-data";

interface SidebarItemProps {
  item: TreeDataItem;
  getTypeColor: (type: string) => string;
  onRefresh: (item: TreeDataItem) => void;
  onNewQuery: (connectionId: string, connectionName: string) => void;
  onEdit: (connection: any) => void;
  onViewComments: (ctx: any) => void;
}

export const SidebarItem = React.memo(
  function SidebarItem({
    item,
    getTypeColor,
    onRefresh,
    onNewQuery,
    onEdit,
    onViewComments,
  }: SidebarItemProps) {
    const isConnection = !item.id.includes(":");
    const isTable =
      item.id.includes(":table:") &&
      !item.id.includes(":columns") &&
      !item.id.includes(":indexes") &&
      !item.id.includes(":column:") &&
      !item.id.includes(":index:");

    const isFolder =
      (item.id.includes(":schema:") && !item.id.includes(":table:")) ||
      (item.id.includes(":columns") && !item.id.includes(":column:")) ||
      (item.id.includes(":indexes") && !item.id.includes(":index:")) ||
      (item.id.includes(":queries") && !item.id.includes(":query:"));

    // Resolve icon with clear priority to fix reported "wrong icon" issues
    const ResolvedIcon = React.useMemo(() => {
      // 1. Root Connection
      if (isConnection) return PostgresIcon;

      // 2. Specialized folders (Columns, Indexes, Queries)
      if (
        (item.id.includes(":columns") && !item.id.includes(":column:")) ||
        (item.id.includes(":indexes") && !item.id.includes(":index:")) ||
        (item.id.includes(":queries") && !item.id.includes(":query:"))
      ) return FolderIcon;

      // 3. Database Leaf Items
      if (item.id.includes(":column:")) {
        if ((item as any).isPrimary) return ColumnPrimaryIcon;
        if ((item as any).isForeign) return ColumnForeignIcon;
        return ColumnDefaultIcon;
      }
      if (item.id.includes(":index:")) return IndexIcon;
      if (item.id.includes(":query:")) return QueryIcon;

      // 4. Tables
      if (isTable) return TableIcon;

      // 5. Schemas (least specific, often a prefix in other IDs)
      if (item.id.includes(":schema:")) return SchemaIcon;

      // 6. Fallback to provided icon (cover stale data or custom nodes)
      return item.icon || null;
    }, [item.id, item.icon, isConnection, isTable, (item as any).isPrimary, (item as any).isForeign]);

    const content = (
      <div className="flex items-center w-full min-w-0 overflow-hidden">
        {item.isLoading ? (
          <div className="h-4 w-4 shrink-0 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : ResolvedIcon ? (
          <ResolvedIcon className="h-4 w-4 shrink-0 mr-2" />
        ) : null}
        <span
          className={cn(
            "text-sm truncate",
            (isConnection || isTable || isFolder) && "font-medium font-display tracking-tight"
          )}
        >
          {String(item.name)}
        </span>
        {isTable && (item as any).size !== undefined && (
          <span className="ml-auto text-[10px] text-muted-foreground font-mono shrink-0 pr-1">
            {formatBytes((item as any).size)}
          </span>
        )}
        {item.id.includes(":schema:") && !item.id.includes(":table:") && (item as any).tableCount !== undefined && (
          <span className="ml-auto text-[10px] text-muted-foreground font-mono shrink-0 pr-1">
            {(item as any).tableCount} {(item as any).tableCount === 1 ? "table" : "tables"}
          </span>
        )}
        {(item.id.includes(":columns") || item.id.includes(":indexes") || item.id.includes(":queries")) &&
          (item as any).count !== undefined && (
            <span className="ml-auto text-[10px] text-muted-foreground font-mono shrink-0 pr-1">
              {(item as any).count}{" "}
              {item.id.includes(":columns")
                ? (item as any).count === 1
                  ? "column"
                  : "columns"
                : item.id.includes(":indexes")
                  ? (item as any).count === 1
                    ? "index"
                    : "indexes"
                  : (item as any).count === 1
                    ? "query"
                    : "queries"}
            </span>
          )}
        {item.id.includes(":query:") && (item as any).mtimeMs && (
          <span className="ml-auto text-[10px] text-muted-foreground font-mono shrink-0">
            {formatRelativeTime((item as any).mtimeMs)}
          </span>
        )}
        {(item as any).dataType && (
          <div className="ml-auto flex items-center gap-1.5 overflow-hidden">
            <Badge
              variant="outline"
              className={cn(
                "h-5 text-[10px] px-1.5 font-mono rounded-md shrink-0",
                getTypeColor((item as any).dataType)
              )}
            >
              {String((item as any).dataType)}
            </Badge>
            {(item as any).references && (
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px]">
                → {String((item as any).references)}
              </span>
            )}
          </div>
        )}
      </div>
    );

    if (isConnection) {
      return (
        <ConnectionContextMenu
          item={item}
          onRefresh={onRefresh}
          onNewQuery={onNewQuery}
          onEdit={onEdit}
        >
          {content}
        </ConnectionContextMenu>
      );
    }

    if (isTable) {
      return (
        <TableContextMenu item={item} onViewComments={onViewComments}>
          {content}
        </TableContextMenu>
      );
    }

    return content;
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.name === next.item.name &&
      prev.item.isLoading === next.item.isLoading &&
      prev.item.count === next.item.count &&
      prev.item.tableCount === next.item.tableCount &&
      (prev.item as any).size === (next.item as any).size &&
      (prev.item as any).mtimeMs === (next.item as any).mtimeMs &&
      (prev.item as any).dataType === (next.item as any).dataType &&
      (prev.item as any).references === (next.item as any).references &&
      (prev.item as any).isPrimary === (next.item as any).isPrimary &&
      (prev.item as any).isForeign === (next.item as any).isForeign
    );
  }
);
