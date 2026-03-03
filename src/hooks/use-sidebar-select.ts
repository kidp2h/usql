import * as React from "react";
import { useSidebarStore } from "@/stores/sidebar-store";
import { TreeDataItem } from "@/components/tree-view";

export function useSidebarSelect() {
  const connections = useSidebarStore((state) => state.connections);
  const updateSelectedConnectionId = useSidebarStore((state) => state.updateSelectedConnectionId);

  const handleSelectChange = React.useCallback(async (item: TreeDataItem | undefined) => {
    if (!item) return;

    // 4. Indexes folder selected
    if (item.id.includes(':indexes')) {
      const connId = item.id.split(':schema:')[0];
      const conn = connections.find(c => c.id === connId);
      if (!conn) return;
      updateSelectedConnectionId(conn.id);
    }

    // 5. Query file selected
    if (item.id.includes(':query:')) {
      const connId = item.id.split(':query:')[0];
      const filePath = (item as any).path;
      if (!filePath) return;

      updateSelectedConnectionId(connId);

      if (window.electron?.readQuery) {
        try {
          const { useTabStore } = await import("@/stores/tab-store");
          const tabState = useTabStore.getState();

          // Check if already open
          const existingTab = tabState.queryTabs.find(t => t.filePath === filePath);
          if (existingTab) {
            tabState.updateActiveQueryTabId(existingTab.id);
            return;
          }

          const res = await window.electron.readQuery(filePath);
          if (res.ok && res.content !== undefined) {
            const fileName = filePath.split(/[/\\]/).pop() || filePath;
            tabState.openSqlTab({
              title: fileName,
              sql: res.content,
              filePath,
            });
          } else {
            const { toast } = await import("sonner");
            toast.error("Failed to read query file", { description: res.message });
          }
        } catch (error) {
          console.error("Error reading query file:", error);
        }
      }
    }
  }, [connections, updateSelectedConnectionId]);

  return { handleSelectChange, connections };
}