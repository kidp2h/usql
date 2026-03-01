import { useSidebarStore } from "@/stores/v2/sidebar-store";
import { TreeDataItem } from "@/components/tree-view";
import * as React from "react";

export function useConnection() {
  const connections = useSidebarStore((state) => state.connections);
  const selectedConnectionId = useSidebarStore(
    (state) => state.selectedConnectionId
  );

  const updateConnection = useSidebarStore((state) => state.updateConnection);
  const addConnection = useSidebarStore((state) => state.addConnection);
  const removeConnection = useSidebarStore((state) => state.removeConnection);
  const updateSelectedConnectionId = useSidebarStore(
    (state) => state.updateSelectedConnectionId
  );
  const updateTableOfConnection = useSidebarStore(
    (state) => state.updateTableOfConnection
  );
  const updateColumnOfTable = useSidebarStore(
    (state) => state.updateColumnOfTable
  );
  const updateIndexesOfTable = useSidebarStore(
    (state) => state.updateIndexesOfTable
  );

  const activeConnection = React.useMemo(() => {
    if (!selectedConnectionId) {
      return undefined;
    }
    return connections.find((conn) => conn.id === selectedConnectionId);
  }, [selectedConnectionId, connections]);

  return {
    connections,
    selectedConnectionId,
    activeConnection,
    updateConnection,
    addConnection,
    removeConnection,
    updateSelectedConnectionId,
    updateTableOfConnection,
    updateColumnOfTable,
    updateIndexesOfTable,
  };
}
