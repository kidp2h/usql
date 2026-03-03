import * as React from "react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Shortcut } from "@/components/ui/kbd";
import { TreeDataItem } from "@/components/tree-view";

interface TableContextMenuProps {
  item: TreeDataItem;
  children: React.ReactNode;
  onViewComments: (ctx: { connectionId: string; connectionName: string; schema?: string; table?: string }) => void;
}

export function TableContextMenu({ item, children, onViewComments }: TableContextMenuProps) {
  const parts = item.id.split(':table:');
  const schemaPath = parts[0];
  const schemaName = schemaPath.split(':schema:')[1];
  const connId = schemaPath.split(':schema:')[0];
  const tableName = parts[1];

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex items-center w-full">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={(e) => {
            e.stopPropagation();
            onViewComments({ connectionId: connId, connectionName: connId, schema: schemaName, table: tableName });
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          View comment
          <Shortcut shortcut="⌘ + ⌥ + C" />
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}