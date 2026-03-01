import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DbType } from "@/lib/db-types";
import type { TreeDataItem } from "@/components/tree-view";

export type Connection = TreeDataItem & {
  dbType: DbType;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  readOnly: boolean;
};




type SidebarState = {
  connections: Connection[];
  selectedConnectionId: string | undefined;
  updateConnection: (connection: Connection) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (connectionId: Connection['id']) => void;
  updateSelectedConnectionId: (connectionId: Connection['id']) => void;
  updateTableOfConnection: (connectionId: Connection['id'], table: TreeDataItem) => void;
  updateColumnOfTable: (connectionId: Connection['id'], tableId: TreeDataItem['id'], column: TreeDataItem) => void;
  updateIndexesOfTable: (connectionId: Connection['id'], tableId: TreeDataItem['id'], indexes: TreeDataItem[]) => void;
}
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      connections: [],
      selectedConnectionId: undefined,
      updateConnection: (connection: Connection) => set((state) => ({
        connections: state.connections.map((c) => c.id === connection.id ? connection : c),
      })),
      addConnection: (connection: Connection) => set((state) => ({
        connections: [connection, ...state.connections],
      })),
      removeConnection: (connectionId: Connection['id']) => set((state) => ({
        connections: state.connections.filter((c) => c.id !== connectionId),
      })),
      updateSelectedConnectionId: (connectionId: Connection['id']) => set((state) => ({
        selectedConnectionId: connectionId,
      })),
      updateTableOfConnection: (connectionId: Connection['id'], table: TreeDataItem) => set((state) => ({
        connections: state.connections.map((c) => c.id === connectionId ? { ...c, children: [...(c.children || []), table] } : c),
      })),
      updateColumnOfTable: (connectionId: Connection['id'], tableId: TreeDataItem['id'], column: TreeDataItem) => set((state) => ({
        connections: state.connections.map((c) => c.id === connectionId ? { ...c, children: c.children?.map((t) => t.id === tableId ? { ...t, children: [...(t.children || []), column] } : t) } : c),
      })),
      updateIndexesOfTable: (connectionId: Connection['id'], tableId: TreeDataItem['id'], indexes: TreeDataItem[]) => set((state) => ({
        connections: state.connections.map((c) => c.id === connectionId ? { ...c, children: c.children?.map((t) => t.id === tableId ? { ...t, children: [...(t.children || []), ...indexes] } : t) } : c),
      })),
    }),
    {
      name: "sidebar-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)