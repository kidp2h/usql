"use client";

import * as React from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarRail, useSidebar } from "@/components/ui/sidebar";
import { SidebarConnectionDrawer } from "@/components/sidebar-connection-drawer";
import { SheetEditConnection } from "@/components/sheet-edit-connection";
import { DrawerViewComments } from "@/components/drawer-view-comments";
import { TreeDataItem, TreeView } from "@/components/tree-view";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useQuery } from "@/hooks/use-query";

import { useCommentsModal } from "@/hooks/use-comments-modal";
import { useSidebarSelect } from "@/hooks/use-sidebar-select";
import { useTreeData } from "@/hooks/use-tree-data";
import { SidebarItem } from "@/components/sidebar-item";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const connections = useSidebarStore((state) => state.connections);
  const selectedConnectionId = useSidebarStore((state) => state.selectedConnectionId);
  const [editingConnection, setEditingConnection] = React.useState<any>(null);
  const { setOpen } = useSidebar();

  const { newQueryWithContext } = useQuery({ setOpen, isEditorFocused: false, enableCommands: false });
  const { open, setOpen: setCommentsOpen, context, data, loading, error, handleViewComments } = useCommentsModal();
  const { handleSelectChange } = useSidebarSelect();
  const { treeData, getTypeColor } = useTreeData(connections);

  const handleRefresh = React.useCallback(async (item: TreeDataItem) => {
    const conn = connections.find(c => c.id === item.id);
    if (!conn) return;

    // Reset children and set loading
    useSidebarStore.getState().updateConnection({ ...conn, isLoading: true, children: [] });
    handleSelectChange(item);

    if (window.electron?.getFullMetadata) {
      try {
        const res = await window.electron.getFullMetadata(conn);
        if (res.ok && res.metadata) {
          const schemaNodes = res.metadata.map((s: any) => ({
            id: `${conn.id}:schema:${s.name}`,
            name: s.name,
            tableCount: s.tableCount,
            children: s.tables.map((t: any) => ({
              id: `${conn.id}:schema:${s.name}:table:${t.name}`,
              name: t.name,
              size: t.size,
              children: [
                {
                  id: `${conn.id}:schema:${s.name}:table:${t.name}:columns`,
                  name: "Columns",
                  count: t.columnCount,
                  children: t.columns.map((col: any) => ({
                    id: `${conn.id}:schema:${s.name}:table:${t.name}:column:${col.name}`,
                    name: col.name,
                    isPrimary: col.isPrimary,
                    isForeign: col.isForeign,
                    dataType: col.dataType,
                    references: col.references,
                  })),
                },
                {
                  id: `${conn.id}:schema:${s.name}:table:${t.name}:indexes`,
                  name: "Indexes",
                  count: t.indexCount,
                  children: t.indexes.map((idxName: any) => ({
                    id: `${conn.id}:schema:${s.name}:table:${t.name}:index:${idxName}`,
                    name: idxName,
                  })),
                },
              ],
            })),
          }));

          useSidebarStore.getState().updateConnection({
            ...conn,
            isLoading: false,
            children: schemaNodes.length > 0 ? schemaNodes : [
              { id: `${conn.id}:empty`, name: "No schemas found", disabled: true }
            ],
          });
        } else {
          useSidebarStore.getState().updateConnection({
            ...conn,
            isLoading: false,
            children: [{ id: `${conn.id}:error`, name: res.message || "Failed to load", disabled: true, className: "text-destructive" }],
          });
        }
      } catch (err) {
        useSidebarStore.getState().updateConnection({
          ...conn,
          isLoading: false,
          children: [{ id: `${conn.id}:error`, name: "Failed to load", disabled: true, className: "text-destructive" }],
        });
      }
    }
  }, [connections, handleSelectChange]);

  const renderSidebarItem = React.useCallback(({ item }: any) => (
    <SidebarItem
      item={item}
      getTypeColor={getTypeColor}
      onRefresh={handleRefresh}
      onNewQuery={(id, name) => newQueryWithContext({ connectionId: id, connectionName: name })}
      onEdit={setEditingConnection}
      onViewComments={handleViewComments}
    />
  ), [getTypeColor, handleRefresh, newQueryWithContext, setEditingConnection, handleViewComments]);

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
          renderItem={renderSidebarItem}
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