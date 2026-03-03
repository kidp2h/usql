import * as React from "react";
import {
  RefreshCw, FilePlusCorner, Edit, Trash2
} from "lucide-react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger
} from "@/components/ui/context-menu";
import { Kbd, Shortcut } from "@/components/ui/kbd";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/v2/sidebar-store";
import { getTypeColor, isConnectionNode } from "./sidebar-utils";

interface SidebarTreeItemProps {
  item: any;
  isSelected: boolean;
  isOpen: boolean;
  connections: any[];
  handleSelectChange: (item: any) => void;
  _handleViewComments: (context: any) => void;
  newQueryWithContext: (context: any) => void;
  setEditingConnection: (conn: any) => void;
}

export const SidebarTreeItem: React.FC<SidebarTreeItemProps> = ({
  item,
  isSelected,
  isOpen,
  connections,
  handleSelectChange,
  _handleViewComments,
  newQueryWithContext,
  setEditingConnection,
}) => {
  const isConnection = isConnectionNode(item.id, connections);
  const removeConnection = useSidebarStore((state) => state.removeConnection);
  const updateConnection = useSidebarStore((state) => state.updateConnection);

  const content = (
    <div className="flex items-center w-full min-w-0 overflow-hidden">
      {item.isLoading ? (
        <div className="h-4 w-4 shrink-0 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : (
        item.icon ? <item.icon className="h-4 w-4 shrink-0 mr-2" /> : null
      )}
      <span className="text-sm truncate">{item.name}</span>
      {item.dataType && (
        <Badge
          variant="outline"
          className={cn(
            "ml-auto mr-1 h-5 text-[10px] px-1.5 font-normal rounded-md shrink-0",
            getTypeColor(item.dataType)
          )}
        >
          {item.dataType}
        </Badge>
      )}
    </div>
  );

  if (isConnection) {
    return (
      <ContextMenu>
        <ContextMenuTrigger className="flex items-center w-full">
          {content}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onSelect={(e) => {
              e.stopPropagation();
              const conn = connections.find(c => c.id === item.id);
              if (conn) {
                updateConnection({ ...conn, children: [] });
                handleSelectChange(item);
              }
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={(e) => {
              e.stopPropagation();
              const conn = connections.find(c => c.id === item.id);
              if (conn) {
                newQueryWithContext({
                  connectionId: conn.id,
                  connectionName: conn.name
                });
              }
            }}
          >
            <FilePlusCorner className="mr-2 h-4 w-4" />
            New query
            <Shortcut shortcut="⌘ + N" />
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={(e) => {
              e.stopPropagation();
              const conn = connections.find(c => c.id === item.id);
              if (conn) {
                setEditingConnection({ config: conn } as any);
              }
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit connection
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.stopPropagation();
              removeConnection(item.id);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  // Table Context Menu
  if (item.id.includes(':table:') && !item.id.includes(':columns') && !item.id.includes(':indexes') && !item.id.includes(':column:') && !item.id.includes(':index:')) {
    const parts = item.id.split(':table:');
    const schemaPath = parts[0];
    const schemaName = schemaPath.split(':schema:')[1];
    const connId = schemaPath.split(':schema:')[0];
    const tableName = parts[1];

    return (
      <ContextMenu>
        <ContextMenuTrigger className="flex items-center w-full">
          {content}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onSelect={(e) => {
              e.stopPropagation();
              void _handleViewComments({
                connectionId: connId,
                connectionName: connId,
                schema: schemaName,
                table: tableName,
              });
            }}
          >
            View comment
            <Shortcut shortcut="⌘ + ⌥ + C" />
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return content;
};
