"use client";

import * as React from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarRail, useSidebar } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { SidebarConnectionDrawer } from "@/components/sidebar-connection-drawer";
import { SheetEditConnection } from "@/components/sheet-edit-connection";
import { DrawerViewComments } from "@/components/drawer-view-comments";
import { TreeDataItem, TreeView } from "@/components/tree-view";
import { useSidebarStore } from "@/stores/v2/sidebar-store";
import { useQuery } from "@/hooks/use-query";
import { cn } from "@/lib/utils";

import { useCommentsModal } from "@/hooks/use-comments-modal";
import { useSidebarSelect } from "@/hooks/use-sidebar-select";
import { useTreeData } from "@/hooks/use-tree-data";
import { ConnectionContextMenu } from "@/components/connection-context-menu";
import { TableContextMenu } from "@/components/table-context-menu";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const connections = useSidebarStore((state) => state.connections);
  const selectedConnectionId = useSidebarStore((state) => state.selectedConnectionId);
  const [editingConnection, setEditingConnection] = React.useState<any>(null);
  const { setOpen } = useSidebar();

  const { newQueryWithContext } = useQuery({ setOpen, isEditorFocused: false, enableCommands: false });
  const { open, setOpen: setCommentsOpen, context, data, loading, error, handleViewComments } = useCommentsModal();
  const { handleSelectChange } = useSidebarSelect();
  const { treeData, getTypeColor } = useTreeData(connections);

  const handleRefresh = React.useCallback((item: TreeDataItem) => {
    const conn = connections.find(c => c.id === item.id);
    if (conn) {
      useSidebarStore.getState().updateConnection({ ...conn, children: [] });
    }
    handleSelectChange(item);
  }, [connections, handleSelectChange]);

  return (
    <Sidebar {...props} collapsible="offcanvas" side="right">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarConnectionDrawer />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <TreeView
          data={treeData}
          onSelectChange={handleSelectChange}
          selectedItemId={selectedConnectionId}
          initialSelectedItemId={selectedConnectionId}
          renderItem={({ item }) => {
            const isConnection = connections.some(c => c.id === item.id);
            const isTable = item.id.includes(':table:') && !item.id.includes(':columns') && !item.id.includes(':indexes') && !item.id.includes(':column:') && !item.id.includes(':index:');

            const content = (
              <div className="flex items-center w-full min-w-0 overflow-hidden">
                {item.isLoading
                  ? <div className="h-4 w-4 shrink-0 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  : item.icon ? <item.icon className="h-4 w-4 shrink-0 mr-2" /> : null
                }
                <span className="text-sm truncate">{item.name}</span>
                {(item as any).dataType && (
                  <Badge variant="outline" className={cn("ml-auto mr-1 h-5 text-[10px] px-1.5 font-normal rounded-md shrink-0", getTypeColor((item as any).dataType))}>
                    {(item as any).dataType}
                  </Badge>
                )}
              </div>
            );

            if (isConnection) {
              return (
                <ConnectionContextMenu
                  item={item}
                  onRefresh={handleRefresh}
                  onNewQuery={(id, name) => newQueryWithContext({ connectionId: id, connectionName: name })}
                  onEdit={setEditingConnection}
                >
                  {content}
                </ConnectionContextMenu>
              );
            }

            if (isTable) {
              return (
                <TableContextMenu item={item} onViewComments={handleViewComments}>
                  {content}
                </TableContextMenu>
              );
            }

            return content;
          }}
        />
      </SidebarContent>
      <SidebarRail />
      <SheetEditConnection editingConnection={editingConnection} setEditingConnection={setEditingConnection} />
      <DrawerViewComments
        open={open}
        onOpenChange={setCommentsOpen}
        tableName={context?.table}
        schemaName={context?.schema}
        comments={data}
        loading={loading}
        error={error}
      />
    </Sidebar>
  );
}