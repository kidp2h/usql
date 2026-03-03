import * as React from "react";
import { useSidebarStore } from "@/stores/v2/sidebar-store";
import { TreeDataItem } from "@/components/tree-view";

export function useSidebarSelect() {
  const connections = useSidebarStore((state) => state.connections);
  const updateSelectedConnectionId = useSidebarStore((state) => state.updateSelectedConnectionId);

  const handleSelectChange = React.useCallback(async (item: TreeDataItem | undefined) => {
    if (!item) return;

    const isConnection = connections.some(c => c.id === item.id);

    // 1. Connection selected
    if (isConnection) {
      updateSelectedConnectionId(item.id);
      const connection = connections.find(c => c.id === item.id);
      if (!connection) return;

      if (!connection.children || connection.children.length === 0) {
        useSidebarStore.getState().updateConnection({ ...connection, isLoading: true });

        if (window.electron?.getSchemas) {
          try {
            const res = await window.electron.getSchemas(connection);
            useSidebarStore.getState().updateConnection({
              ...connection,
              isLoading: false,
              children: res.ok && (res?.schemas?.length || 0) > 0
                ? res?.schemas?.map((schemaName: string) => ({
                  id: `${connection.id}:schema:${schemaName}`,
                  name: schemaName,
                  children: [],
                }))
                : [{ id: `${connection.id}:${res.ok ? 'empty' : 'error'}`, name: res.ok ? "No schemas found" : res.message || "Failed to load schemas", disabled: true, className: res.ok ? undefined : "text-destructive" }],
            });
          } catch {
            useSidebarStore.getState().updateConnection({
              ...connection,
              isLoading: false,
              children: [{ id: `${connection.id}:error`, name: "Failed to load schemas", disabled: true, className: "text-destructive" }],
            });
          }
        }
      }
      return;
    }

    // 2. Schema selected
    if (item.id.includes(':schema:') && !item.id.includes(':table:')) {
      const [connId, schemaName] = [item.id.split(':schema:')[0], item.id.split(':schema:')[1]];
      const conn = connections.find(c => c.id === connId);
      if (!conn) return;

      updateSelectedConnectionId(conn.id);
      const schemaNode = conn.children?.find(c => c.id === item.id);
      if (!schemaNode || (schemaNode.children && schemaNode.children.length > 0)) return;

      useSidebarStore.getState().updateConnection({
        ...conn,
        children: conn.children?.map(c => c.id === item.id ? { ...c, isLoading: true } : c),
      });

      if (window.electron?.getTables) {
        try {
          const res = await window.electron.getTables(conn, schemaName);
          useSidebarStore.getState().updateConnection({
            ...conn,
            children: conn.children?.map(c => c.id === item.id ? {
              ...c,
              isLoading: false,
              children: res.ok && (res?.tables?.length || 0) > 0
                ? res?.tables?.map(tableName => ({
                  id: `${connId}:schema:${schemaName}:table:${tableName}`,
                  name: tableName,
                  children: [
                    { id: `${connId}:schema:${schemaName}:table:${tableName}:columns`, name: "Columns", children: [] },
                    { id: `${connId}:schema:${schemaName}:table:${tableName}:indexes`, name: "Indexes", children: [] },
                  ],
                }))
                : [{ id: `${item.id}:${res.ok ? 'empty' : 'error'}`, name: res.ok ? "No tables found" : res.message || "Failed to load tables", disabled: true, className: res.ok ? undefined : "text-destructive" }],
            } : c),
          });
        } catch {
          useSidebarStore.getState().updateConnection({
            ...conn,
            children: conn.children?.map(c => c.id === item.id ? {
              ...c, isLoading: false,
              children: [{ id: `${item.id}:error`, name: "Failed to load tables", disabled: true, className: "text-destructive" }],
            } : c),
          });
        }
      }
      return;
    }

    // 3. Columns folder selected
    if (item.id.includes(':columns')) {
      const [schemaPath, rest] = item.id.split(':table:');
      const schemaName = schemaPath.split(':schema:')[1];
      const connId = schemaPath.split(':schema:')[0];
      const tableName = rest.split(':columns')[0];
      const tableNodeId = `${schemaPath}:table:${tableName}`;

      const conn = connections.find(c => c.id === connId);
      if (!conn) return;

      updateSelectedConnectionId(conn.id);

      const schemaNode = conn.children?.find(c => c.id === schemaPath);
      const tableNode = schemaNode?.children?.find(c => c.id === tableNodeId);
      const columnsNode = tableNode?.children?.find(c => c.id === item.id);
      if (!columnsNode || (columnsNode.children && columnsNode.children.length > 0)) return;

      const updateNested = (children: any[], isLoading: boolean, newChildren?: any[]) =>
        conn.children?.map(s => s.id !== schemaPath ? s : {
          ...s,
          children: s.children?.map(t => t.id !== tableNodeId ? t : {
            ...t,
            children: t.children?.map(col => col.id !== item.id ? col : {
              ...col,
              isLoading,
              ...(newChildren ? { children: newChildren } : {}),
            }),
          }),
        });

      useSidebarStore.getState().updateConnection({ ...conn, children: updateNested([], true) });

      if (!window.electron?.getColumns) {
        useSidebarStore.getState().updateConnection({ ...conn, children: updateNested([], false, [{ id: `${item.id}:error`, name: "Restart App", disabled: true, className: "text-destructive" }]) });
        return;
      }

      try {
        const res = await window.electron.getColumns(conn, schemaName, tableName);
        useSidebarStore.getState().updateConnection({
          ...conn,
          children: updateNested([], false, res.ok && (res?.columns?.length || 0) > 0
            ? res?.columns?.map(colData => ({ id: `${item.id}:column:${colData.name}`, name: colData.name, isPrimary: colData.isPrimary, isForeign: colData.isForeign, dataType: colData.dataType }))
            : [{ id: `${item.id}:${res.ok ? 'empty' : 'error'}`, name: res.ok ? "No columns" : res.message || "Failed", disabled: true, className: res.ok ? undefined : "text-destructive" }]
          ),
        });
      } catch {
        useSidebarStore.getState().updateConnection({ ...conn, children: updateNested([], false, [{ id: `${item.id}:error`, name: "Failed to load", disabled: true, className: "text-destructive" }]) });
      }
      return;
    }

    // 4. Indexes folder selected
    if (item.id.includes(':indexes')) {
      const [schemaPath, rest] = item.id.split(':table:');
      const schemaName = schemaPath.split(':schema:')[1];
      const connId = schemaPath.split(':schema:')[0];
      const tableName = rest.split(':indexes')[0];
      const tableNodeId = `${schemaPath}:table:${tableName}`;

      const conn = connections.find(c => c.id === connId);
      if (!conn) return;

      updateSelectedConnectionId(conn.id);

      const schemaNode = conn.children?.find(c => c.id === schemaPath);
      const tableNode = schemaNode?.children?.find(c => c.id === tableNodeId);
      const indexesNode = tableNode?.children?.find(c => c.id === item.id);
      if (!indexesNode || (indexesNode.children && indexesNode.children.length > 0)) return;

      const updateNested = (isLoading: boolean, newChildren?: any[]) =>
        conn.children?.map(s => s.id !== schemaPath ? s : {
          ...s,
          children: s.children?.map(t => t.id !== tableNodeId ? t : {
            ...t,
            children: t.children?.map(idx => idx.id !== item.id ? idx : {
              ...idx,
              isLoading,
              ...(newChildren ? { children: newChildren } : {}),
            }),
          }),
        });

      useSidebarStore.getState().updateConnection({ ...conn, children: updateNested(true) });

      if (!window.electron?.getIndexes) {
        useSidebarStore.getState().updateConnection({ ...conn, children: updateNested(false, [{ id: `${item.id}:error`, name: "Restart App", disabled: true, className: "text-destructive" }]) });
        return;
      }

      try {
        const res = await window.electron.getIndexes(conn, schemaName, tableName);
        useSidebarStore.getState().updateConnection({
          ...conn,
          children: updateNested(false, res.ok && (res?.indexes?.length || 0) > 0
            ? res?.indexes?.map((idxName: string) => ({ id: `${item.id}:index:${idxName}`, name: idxName }))
            : [{ id: `${item.id}:${res.ok ? 'empty' : 'error'}`, name: res.ok ? "No indexes" : res.message || "Failed", disabled: true, className: res.ok ? undefined : "text-destructive" }]
          ),
        });
      } catch {
        useSidebarStore.getState().updateConnection({ ...conn, children: updateNested(false, [{ id: `${item.id}:error`, name: "Failed to load", disabled: true, className: "text-destructive" }]) });
      }
    }
  }, [connections, updateSelectedConnectionId]);

  return { handleSelectChange, connections };
}