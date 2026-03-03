import * as React from "react";
import { RefreshCw, FilePlusCorner, Edit, Trash2, Database } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Kbd, Shortcut } from "@/components/ui/kbd";
import { useSidebarStore } from "@/stores/sidebar-store";
import { TreeDataItem } from "@/components/tree-view";
import { ModalDumpDatabase } from "@/components/modal-dump-database";

interface ConnectionContextMenuProps {
  item: TreeDataItem;
  children: React.ReactNode;
  onRefresh: (item: TreeDataItem) => void;
  onNewQuery: (connectionId: string, connectionName: string) => void;
  onEdit: (connection: any) => void;
}

export function ConnectionContextMenu({ item, children, onRefresh, onNewQuery, onEdit }: ConnectionContextMenuProps) {
  const connections = useSidebarStore((state) => state.connections);
  const [isDumpModalOpen, setIsDumpModalOpen] = React.useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className="flex items-center w-full">
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onSelect={(e) => { e.stopPropagation(); onRefresh(item); }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={(e) => {
              e.stopPropagation();
              const conn = connections.find(c => c.id === item.id);
              if (conn) onNewQuery(conn.id, conn.name);
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <FilePlusCorner className="mr-2 h-4 w-4" />
            New query
            <Shortcut shortcut="⌘ + N" />
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={(e) => {
              e.stopPropagation();
              const conn = connections.find(c => c.id === item.id);
              if (conn) onEdit({ id: conn.id, config: conn });
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit connection
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={(e) => {
              e.stopPropagation();
              setIsDumpModalOpen(true);
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Database className="mr-2 h-4 w-4" />
            Dump database
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => { e.stopPropagation(); useSidebarStore.getState().removeConnection(item.id); }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ModalDumpDatabase
        isOpen={isDumpModalOpen}
        onClose={() => setIsDumpModalOpen(false)}
        item={item}
      />
    </>
  );
}
