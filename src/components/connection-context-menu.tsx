import * as React from "react";
import { RefreshCw, FilePlusCorner, Edit, Trash2 } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Kbd, Shortcut } from "@/components/ui/kbd";
import { useSidebarStore } from "@/stores/v2/sidebar-store";
import { TreeDataItem } from "@/components/tree-view";

interface ConnectionContextMenuProps {
  item: TreeDataItem;
  children: React.ReactNode;
  onRefresh: (item: TreeDataItem) => void;
  onNewQuery: (connectionId: string, connectionName: string) => void;
  onEdit: (connection: any) => void;
}

export function ConnectionContextMenu({ item, children, onRefresh, onNewQuery, onEdit }: ConnectionContextMenuProps) {
  const connections = useSidebarStore((state) => state.connections);

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex items-center w-full">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={(e) => { e.stopPropagation(); onRefresh(item); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </ContextMenuItem>
        <ContextMenuItem onSelect={(e) => {
          e.stopPropagation();
          const conn = connections.find(c => c.id === item.id);
          if (conn) onNewQuery(conn.id, conn.name);
        }}>
          <FilePlusCorner className="mr-2 h-4 w-4" />
          New query
          <Shortcut shortcut="⌘ + N" />
        </ContextMenuItem>
        <ContextMenuItem onSelect={(e) => {
          e.stopPropagation();
          const conn = connections.find(c => c.id === item.id);
          if (conn) onEdit({ id: conn.id, config: conn });
        }}>
          <Edit className="mr-2 h-4 w-4" />
          Edit connection
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(e) => { e.stopPropagation(); useSidebarStore.getState().removeConnection(item.id); }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}