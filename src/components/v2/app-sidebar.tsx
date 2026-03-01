"use client";

import * as React from "react";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { SidebarConnectionDrawer } from "../sidebar-connection-drawer";
import { SheetEditConnection } from "../sheet-edit-connection";
import { useSidebarStore } from "@/stores/v2/sidebar-store";
import { DrawerViewComments } from "../drawer-view-comments";
import { Kbd } from "@/components/ui/kbd";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TreeDataItem, TreeView } from "../tree-view";
import { Database, Dot, Edit, FilePlusCorner, FileText, Folder, Key, KeyRound, Plus, RefreshCw, SwatchBook, Table, TableOfContents, Trash2 } from "lucide-react";
import { useQuery } from "@/hooks/use-query";
import { cn } from "@/lib/utils";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const connections = useSidebarStore((state) => state.connections);
  const updateSelectedConnectionId = useSidebarStore((state) => state.updateSelectedConnectionId);
  const selectedConnectionId = useSidebarStore((state) => state.selectedConnectionId);
  const [editingConnection, setEditingConnection] = React.useState<any>(null);
  const { setOpen } = useSidebar();

  const { newQuery, newQueryWithContext } = useQuery({
    setOpen,
    isEditorFocused: false,
    enableCommands: false,
  });
  // Comments modal state
  const [commentsModalOpen, setCommentsModalOpen] = React.useState(false);
  const [commentsContext, setCommentsContext] = React.useState<{
    connectionId: string;
    schema: string;
    table: string;
  } | null>(null);
  const [commentsData, setCommentsData] = React.useState<
    Array<{ column_name: string; comment: string | null }>
  >([]);
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [commentsError, setCommentsError] = React.useState<
    string | undefined
  >();

  const _handleViewComments = React.useCallback(
    async (context: {
      connectionId: string;
      connectionName: string;
      schema?: string;
      table?: string;
    }) => {
      if (!context.schema || !context.table || !window.electron?.executeQuery) {
        return;
      }

      setCommentsContext({
        connectionId: context.connectionId,
        schema: context.schema,
        table: context.table,
      });
      setCommentsModalOpen(true);
      setCommentsLoading(true);
      setCommentsError(undefined);
      setCommentsData([]);

      try {
        const connection = connections.find(
          (item) => item.id === context.connectionId,
        );
        if (!connection) {
          throw new Error("Connection not found");
        }

        const query = `SELECT
    column_name,
    col_description('${context.schema}.${context.table}'::regclass, ordinal_position) AS comment
FROM information_schema.columns
WHERE table_schema = '${context.schema}'
  AND table_name = '${context.table}'
ORDER BY ordinal_position;`;

        const result = await window.electron.executeQuery({
          ...connection, // In v2, the connection config is flattened
          sql: query,
        } as any);

        if (result.ok && result.rows) {
          setCommentsData(
            result.rows as Array<{
              column_name: string;
              comment: string | null;
            }>,
          );
        } else {
          setCommentsError(result.message || "Failed to fetch comments");
        }
      } catch (err) {
        setCommentsError(
          err instanceof Error ? err.message : "Unknown error occurred",
        );
      } finally {
        setCommentsLoading(false);
      }
    },
    [connections],
  );

  const handleSelectChange = React.useCallback(async (item: TreeDataItem | undefined) => {
    if (!item) return;

    // Currently, let's see what was selected
    const isConnection = connections.some(c => c.id === item.id);

    // 1. Connection selected
    if (isConnection) {
      updateSelectedConnectionId(item.id);
      const connection = connections.find(c => c.id === item.id);
      if (!connection) return;

      // Fetch schemas if children are not loaded yet
      if (!connection.children || connection.children.length === 0) {
        useSidebarStore.getState().updateConnection({
          ...connection,
          isLoading: true
        });

        if (window.electron?.getSchemas) {
          try {
            const res = await window.electron.getSchemas(connection);
            if (res.ok && res.schemas) {
              useSidebarStore.getState().updateConnection({
                ...connection,
                isLoading: false,
                children: res.schemas.length > 0 ? res.schemas.map((schemaName: string) => ({
                  id: `${connection.id}:schema:${schemaName}`,
                  name: schemaName,
                  children: []
                })) : [{
                  id: `${connection.id}:empty`,
                  name: "No schemas found",
                  disabled: true
                }]
              });
            } else {
              useSidebarStore.getState().updateConnection({
                ...connection,
                isLoading: false,
                children: [{
                  id: `${connection.id}:error`,
                  name: res.message || "Failed to load schemas",
                  disabled: true,
                  className: "text-destructive"
                }]
              });
            }
          } catch {
            useSidebarStore.getState().updateConnection({
              ...connection,
              isLoading: false,
              children: [{
                id: `${connection.id}:error`,
                name: "Failed to load schemas",
                disabled: true,
                className: "text-destructive"
              }]
            });
          }
        }
      }
      return;
    }

    // 2. Schema selected (id includes :schema: but doesn't include :table:)
    if (item.id.includes(':schema:') && !item.id.includes(':table:')) {
      const parts = item.id.split(':schema:');
      const connId = parts[0];
      const schemaName = parts[1];

      const conn = connections.find(c => c.id === connId);
      if (conn) {
        updateSelectedConnectionId(conn.id);

        const schemaNode = conn.children?.find(c => c.id === item.id);
        if (schemaNode && (!schemaNode.children || schemaNode.children.length === 0)) {
          // Set loading state for schema node
          const updatedConnLoading = {
            ...conn,
            children: conn.children?.map(c => c.id === item.id ? { ...c, isLoading: true } : c)
          };
          useSidebarStore.getState().updateConnection(updatedConnLoading);

          if (window.electron?.getTables) {
            try {
              const res = await window.electron.getTables(conn, schemaName);
              if (res.ok && res.tables) {
                const updatedConnSuccess = {
                  ...conn,
                  children: conn.children?.map(c => c.id === item.id ? {
                    ...c,
                    isLoading: false,
                    children: res.tables && res.tables.length > 0 ? res.tables.map(tableName => ({
                      id: `${connId}:schema:${schemaName}:table:${tableName}`,
                      name: tableName,
                      children: [
                        { id: `${connId}:schema:${schemaName}:table:${tableName}:columns`, name: "Columns", children: [] },
                        { id: `${connId}:schema:${schemaName}:table:${tableName}:indexes`, name: "Indexes", children: [] }
                      ]
                    })) : [{ id: `${item.id}:empty`, name: "No tables found", disabled: true }]
                  } : c)
                };
                useSidebarStore.getState().updateConnection(updatedConnSuccess);
              } else {
                const updatedConnError = {
                  ...conn,
                  children: conn.children?.map(c => c.id === item.id ? {
                    ...c,
                    isLoading: false,
                    children: [{ id: `${item.id}:error`, name: res.message || "Failed to load tables", disabled: true, className: "text-destructive" }]
                  } : c)
                };
                useSidebarStore.getState().updateConnection(updatedConnError);
              }
            } catch {
              const updatedConnError = {
                ...conn,
                children: conn.children?.map(c => c.id === item.id ? {
                  ...c,
                  isLoading: false,
                  children: [{ id: `${item.id}:error`, name: "Failed to load tables", disabled: true, className: "text-destructive" }]
                } : c)
              };
              useSidebarStore.getState().updateConnection(updatedConnError);
            }
          }
        }
      }
      return;
    }

    // 4. Columns folder selected
    if (item.id.includes(':columns')) {
      const parts = item.id.split(':table:');
      const schemaPath = parts[0];
      const schemaName = schemaPath.split(':schema:')[1];
      const connId = schemaPath.split(':schema:')[0];
      const tableName = parts[1].split(':columns')[0];

      const conn = connections.find(c => c.id === connId);
      if (conn) {
        updateSelectedConnectionId(conn.id);

        const schemaNode = conn.children?.find(c => c.id === schemaPath);
        if (schemaNode) {
          const tableNode = schemaNode.children?.find(c => c.id === `${schemaPath}:table:${tableName}`);
          if (tableNode) {
            const columnsNode = tableNode.children?.find(c => c.id === item.id);
            if (columnsNode && (!columnsNode.children || columnsNode.children.length === 0)) {
              // Set loading state
              const updatedConnLoading = {
                ...conn,
                children: conn.children?.map(s => s.id === schemaPath ? {
                  ...s,
                  children: s.children?.map(t => t.id === tableNode.id ? {
                    ...t,
                    children: t.children?.map(col => col.id === item.id ? { ...col, isLoading: true } : col)
                  } : t)
                } : s)
              };
              useSidebarStore.getState().updateConnection(updatedConnLoading);

              if (window.electron?.getColumns) {
                try {
                  console.log("fetching columns for:", conn, schemaName, tableName);
                  const res = await window.electron.getColumns(conn, schemaName, tableName);
                  console.log("getColumns res:", res);
                  if (res.ok && res.columns) {
                    const updatedConnSuccess = {
                      ...conn,
                      children: conn.children?.map(s => s.id === schemaPath ? {
                        ...s,
                        children: s.children?.map(t => t.id === tableNode.id ? {
                          ...t,
                          children: t.children?.map(col => col.id === item.id ? {
                            ...col,
                            isLoading: false,
                            children: res.columns && res.columns.length > 0 ? res.columns.map(colData => ({
                              id: `${item.id}:column:${colData.name}`,
                              name: colData.name,
                              isPrimary: colData.isPrimary,
                              isForeign: colData.isForeign,
                              dataType: colData.dataType,
                            })) : [{ id: `${item.id}:empty`, name: "No columns", disabled: true }]
                          } : col)
                        } : t)
                      } : s)
                    };
                    console.log("updatedConnSuccess:", updatedConnSuccess);
                    useSidebarStore.getState().updateConnection(updatedConnSuccess);
                  } else {
                    const updatedConnError = {
                      ...conn,
                      children: conn.children?.map(s => s.id === schemaPath ? {
                        ...s,
                        children: s.children?.map(t => t.id === tableNode.id ? {
                          ...t,
                          children: t.children?.map(col => col.id === item.id ? {
                            ...col,
                            isLoading: false,
                            children: [{ id: `${item.id}:error`, name: res.message || "Failed", disabled: true, className: "text-destructive" }]
                          } : col)
                        } : t)
                      } : s)
                    };
                    useSidebarStore.getState().updateConnection(updatedConnError);
                  }
                } catch {
                  const updatedConnError = {
                    ...conn,
                    children: conn.children?.map(s => s.id === schemaPath ? {
                      ...s,
                      children: s.children?.map(t => t.id === tableNode.id ? {
                        ...t,
                        children: t.children?.map(col => col.id === item.id ? {
                          ...col,
                          isLoading: false,
                          children: [{ id: `${item.id}:error`, name: "Failed to load", disabled: true, className: "text-destructive" }]
                        } : col)
                      } : t)
                    } : s)
                  };
                  useSidebarStore.getState().updateConnection(updatedConnError);
                }
              } else {
                console.error("window.electron.getColumns is not defined. Please restart the app.");
                const updatedConnError = {
                  ...conn,
                  children: conn.children?.map(s => s.id === schemaPath ? {
                    ...s,
                    children: s.children?.map(t => t.id === tableNode.id ? {
                      ...t,
                      children: t.children?.map(col => col.id === item.id ? {
                        ...col,
                        isLoading: false,
                        children: [{ id: `${item.id}:error`, name: "Restart App", disabled: true, className: "text-destructive" }]
                      } : col)
                    } : t)
                  } : s)
                };
                useSidebarStore.getState().updateConnection(updatedConnError);
              }
            }
          }
        }
      }
      return;
    }

    // 5. Indexes folder selected
    if (item.id.includes(':indexes')) {
      const parts = item.id.split(':table:');
      const schemaPath = parts[0];
      const schemaName = schemaPath.split(':schema:')[1];
      const connId = schemaPath.split(':schema:')[0];
      const tableName = parts[1].split(':indexes')[0];

      const conn = connections.find(c => c.id === connId);
      if (conn) {
        updateSelectedConnectionId(conn.id);

        const schemaNode = conn.children?.find(c => c.id === schemaPath);
        if (schemaNode) {
          const tableNode = schemaNode.children?.find(c => c.id === `${schemaPath}:table:${tableName}`);
          if (tableNode) {
            const indexesNode = tableNode.children?.find(c => c.id === item.id);
            if (indexesNode && (!indexesNode.children || indexesNode.children.length === 0)) {
              // Set loading state
              const updatedConnLoading = {
                ...conn,
                children: conn.children?.map(s => s.id === schemaPath ? {
                  ...s,
                  children: s.children?.map(t => t.id === tableNode.id ? {
                    ...t,
                    children: t.children?.map(idx => idx.id === item.id ? { ...idx, isLoading: true } : idx)
                  } : t)
                } : s)
              };
              useSidebarStore.getState().updateConnection(updatedConnLoading);

              if (window.electron?.getIndexes) {
                try {
                  const res = await window.electron.getIndexes(conn, schemaName, tableName);
                  if (res.ok && res.indexes) {
                    const updatedConnSuccess = {
                      ...conn,
                      children: conn.children?.map(s => s.id === schemaPath ? {
                        ...s,
                        children: s.children?.map(t => t.id === tableNode.id ? {
                          ...t,
                          children: t.children?.map(idx => idx.id === item.id ? {
                            ...idx,
                            isLoading: false,
                            children: res.indexes && res.indexes.length > 0 ? res.indexes.map((idxName: string) => ({
                              id: `${item.id}:index:${idxName}`,
                              name: idxName,
                            })) : [{ id: `${item.id}:empty`, name: "No indexes", disabled: true }]
                          } : idx)
                        } : t)
                      } : s)
                    };
                    useSidebarStore.getState().updateConnection(updatedConnSuccess);
                  } else {
                    const updatedConnError = {
                      ...conn,
                      children: conn.children?.map(s => s.id === schemaPath ? {
                        ...s,
                        children: s.children?.map(t => t.id === tableNode.id ? {
                          ...t,
                          children: t.children?.map(idx => idx.id === item.id ? {
                            ...idx,
                            isLoading: false,
                            children: [{ id: `${item.id}:error`, name: res.message || "Failed", disabled: true, className: "text-destructive" }]
                          } : idx)
                        } : t)
                      } : s)
                    };
                    useSidebarStore.getState().updateConnection(updatedConnError);
                  }
                } catch {
                  const updatedConnError = {
                    ...conn,
                    children: conn.children?.map(s => s.id === schemaPath ? {
                      ...s,
                      children: s.children?.map(t => t.id === tableNode.id ? {
                        ...t,
                        children: t.children?.map(idx => idx.id === item.id ? {
                          ...idx,
                          isLoading: false,
                          children: [{ id: `${item.id}:error`, name: "Failed to load", disabled: true, className: "text-destructive" }]
                        } : idx)
                      } : t)
                    } : s)
                  };
                  useSidebarStore.getState().updateConnection(updatedConnError);
                }
              } else {
                console.error("window.electron.getIndexes is not defined. Please restart the app.");
                const updatedConnError = {
                  ...conn,
                  children: conn.children?.map(s => s.id === schemaPath ? {
                    ...s,
                    children: s.children?.map(t => t.id === tableNode.id ? {
                      ...t,
                      children: t.children?.map(idx => idx.id === item.id ? {
                        ...idx,
                        isLoading: false,
                        children: [{ id: `${item.id}:error`, name: "Restart App", disabled: true, className: "text-destructive" }]
                      } : idx)
                    } : t)
                  } : s)
                };
                useSidebarStore.getState().updateConnection(updatedConnError);
              }
            }
          }
        }
      }
      return;
    }
  }, [connections, updateSelectedConnectionId]);
  // 1. Tạo một function đệ quy để map lại icons dựa vào loại node (hoặc cấp độ của node)
  const getTreeDataWithIcons = React.useCallback((nodes: TreeDataItem[], level = 0): TreeDataItem[] => {
    return nodes.map(node => {
      let icon = Database; // Default

      if (node.id.includes(':schema:')) icon = SwatchBook;
      if (node.id.includes(':table:')) icon = Table;
      if (node.id.includes(':columns') || node.id.includes(':indexes')) icon = Folder;
      if (node.id.includes(':column:')) {
        if ((node as any).isPrimary) {
          return {
            ...node,
            icon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-yellow-500")} />,
            openIcon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-yellow-500")} />,
            selectedIcon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-yellow-500")} />,
            children: node.children ? getTreeDataWithIcons(node.children, level + 1) : undefined
          };
        }
        if ((node as any).isForeign) {
          return {
            ...node,
            icon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-slate-900 dark:text-slate-400")} />,
            openIcon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-slate-900 dark:text-slate-400")} />,
            selectedIcon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-slate-900 dark:text-slate-400")} />,
            children: node.children ? getTreeDataWithIcons(node.children, level + 1) : undefined
          };
        }
        icon = Dot;
      }
      if (node.id.includes(':index:')) icon = TableOfContents; // or a specific index icon

      return {
        ...node,
        icon,
        openIcon: icon,
        selectedIcon: icon,
        children: node.children ? getTreeDataWithIcons(node.children, level + 1) : undefined
      };
    });
  }, []);

  const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('int') || t.includes('serial')) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    if (t.includes('char') || t.includes('text') || t.includes('varchar')) return "text-green-500 bg-green-500/10 border-green-500/20";
    if (t.includes('bool')) return "text-purple-500 bg-purple-500/10 border-purple-500/20";
    if (t.includes('time') || t.includes('date')) return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    if (t.includes('json') || t.includes('xml')) return "text-teal-500 bg-teal-500/10 border-teal-500/20";
    if (t.includes('num') || t.includes('dec') || t.includes('double') || t.includes('float')) return "text-indigo-500 bg-indigo-500/10 border-indigo-500/20";
    return "text-muted-foreground bg-muted border-border";
  };
  // 2. Chuyển đổi dữ liệu trước khi feed vào TreeView
  const treeData = React.useMemo(
    () => getTreeDataWithIcons(connections),
    [connections, getTreeDataWithIcons]
  );
  console.log(treeData);
  return (
    <Sidebar {...props} collapsible="offcanvas" side="right" {...props}>
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
          renderItem={({ item, isSelected, isOpen }) => {
            const isConnection = connections.some(c => c.id === item.id);
            const content = (
              <div className="flex items-center w-full min-w-0 overflow-hidden">
                {item.isLoading ? (
                  <div className="h-4 w-4 shrink-0 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  item.icon ? <item.icon className="h-4 w-4 shrink-0 mr-2" /> : null
                )}
                <span className="text-sm truncate">{item.name}</span>
                {(item as any).dataType && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "ml-auto mr-1 h-5 text-[10px] px-1.5 font-normal rounded-md shrink-0",
                      getTypeColor((item as any).dataType)
                    )}
                  >
                    {(item as any).dataType}
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
                        // 1. Reset children and fetching state
                        useSidebarStore.getState().updateConnection({
                          ...connections.find(c => c.id === item.id)!,
                          children: []
                        });
                        // 2. Trigger select to run fetch logic
                        handleSelectChange(item);
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={(e) => {
                        e.stopPropagation();
                        console.log("new query in sidebar");
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
                      <Kbd className="ml-auto text-xs">⌘+N</Kbd>
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
                        useSidebarStore.getState().removeConnection(item.id);
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
                      <Kbd className="ml-auto text-xs">⌘ + ⌥ + C</Kbd>
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            }

            return content;
          }}
        />
      </SidebarContent>
      <SidebarRail />
      <SheetEditConnection
        editingConnection={editingConnection}
        setEditingConnection={setEditingConnection}
      />
      <DrawerViewComments
        open={commentsModalOpen}
        onOpenChange={setCommentsModalOpen}
        tableName={commentsContext?.table}
        schemaName={commentsContext?.schema}
        comments={commentsData}
        loading={commentsLoading}
        error={commentsError}
      />
    </Sidebar>
  )
}