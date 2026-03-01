import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Connection } from "./v2/sidebar-store";

export type QueryTabIcon = "connection" | "schema" | "table" | "query";

export type QueryContext = {
  connectionId: string;
  connectionName: string;
  schema?: string;
  table?: string;
};

export type QueryTab = {
  id: string;
  title: string;
  icon?: QueryTabIcon;
  context?: QueryContext;
  connectionId?: Connection['id']
  sql: string;
  savedSql?: string;
  filePath?: string;
};

type TabState = {
  queryTabs: QueryTab[];
  activeQueryTabId: string | undefined;
  updateQueryTab: (queryTab: QueryTab) => void;
  addQueryTab: (queryTab: QueryTab) => void;
  removeQueryTab: (queryTabId: QueryTab['id']) => void;
  updateActiveQueryTabId: (queryTabId: QueryTab['id'] | undefined) => void;
  closeAllTabs: () => void;
  closeQuery: () => void;
  openSqlTab: (payload: {
    title?: string;
    sql: string;
    filePath?: string;
  }) => void;
  reorderQueryTabs: (fromIndex: number, toIndex: number) => void;
  setQuerySql: (sql: string) => void;
  setQuerySaved: (sql?: string) => void;
  setQueryFilePath: (filePath?: string) => void;
  setQueryTitle: (tabId: string, title: string) => void;
  openQuery: (context: {
    connectionId: string;
    connectionName: string;
    schema?: string;
    table?: string;
  }) => void;
}

const createFileTabTitle = (baseTitle: string, existing: QueryTab[]) => {
  const normalized = baseTitle.trim().length > 0 ? baseTitle.trim() : "Query";
  let title = normalized;
  let suffix = 2;

  while (existing.some((tab) => tab.title === title)) {
    title = `${normalized} (${suffix})`;
    suffix += 1;
  }

  return title;
};

export const useTabStore = create<TabState>()(
  persist(
    (set) => ({
      queryTabs: [],
      activeQueryTabId: undefined,
      openQuery: (context) => set((state) => {
        const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());

        let title = context.table || context.schema || context.connectionName;
        let suffix = 2;
        while (state.queryTabs.some((tab) => tab.title === title)) {
          title = `${context.table || context.schema || context.connectionName} (${suffix})`;
          suffix += 1;
        }

        let defaultSql = "";
        if (context.table) {
          defaultSql = `SELECT * FROM ${context.table} LIMIT 100`;
        }

        const nextTab: QueryTab = {
          id,
          title,
          connectionId: context.connectionId,
          sql: defaultSql,
          savedSql: defaultSql,
          filePath: undefined,
        };

        return {
          queryTabs: [...state.queryTabs, nextTab],
          activeQueryTabId: id,
        };
      }),
      updateQueryTab: (queryTab: QueryTab) => set((state) => ({
        queryTabs: state.queryTabs.map((q) => q.id === queryTab.id ? queryTab : q),
      })),
      addQueryTab: (queryTab: QueryTab) => set((state) => ({
        queryTabs: [...state.queryTabs, queryTab],
      })),
      removeQueryTab: (queryTabId: QueryTab['id']) => set((state) => {
        const index = state.queryTabs.findIndex((tab) => tab.id === queryTabId);
        if (index === -1) {
          return {
            queryTabs: state.queryTabs,
            activeQueryTabId: state.activeQueryTabId,
          };
        }

        const nextTabs = state.queryTabs.filter((tab) => tab.id !== queryTabId);
        let nextActive = state.activeQueryTabId;
        if (state.activeQueryTabId === queryTabId) {
          nextActive = nextTabs[index]?.id || nextTabs[index - 1]?.id;
        }

        return {
          queryTabs: nextTabs,
          activeQueryTabId: nextActive,
        };
      }),
      updateActiveQueryTabId: (queryTabId: QueryTab['id'] | undefined) => set(() => ({
        activeQueryTabId: queryTabId,
      })),
      closeAllTabs: () => set(() => ({ queryTabs: [], activeQueryTabId: undefined })),
      closeQuery: () => set((state) => {
        if (!state.activeQueryTabId) {
          return { queryTabs: state.queryTabs, activeQueryTabId: undefined };
        }

        const index = state.queryTabs.findIndex(
          (tab) => tab.id === state.activeQueryTabId,
        );
        if (index === -1) {
          return { queryTabs: state.queryTabs, activeQueryTabId: undefined };
        }

        const nextTabs = state.queryTabs.filter(
          (tab) => tab.id !== state.activeQueryTabId,
        );
        const nextActive = nextTabs[index]?.id || nextTabs[index - 1]?.id;

        return {
          queryTabs: nextTabs,
          activeQueryTabId: nextActive,
        };
      }),
      openSqlTab: ({ title, sql, filePath }) =>
        set((state) => {
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : String(Date.now());
          const nextTitle = createFileTabTitle(title ?? "Query", state.queryTabs);

          const nextTab: QueryTab = {
            id,
            title: nextTitle,
            icon: "query",
            context: undefined,
            sql,
            savedSql: sql,
            filePath,
          };

          return {
            queryTabs: [...state.queryTabs, nextTab],
            activeQueryTabId: id,
          };
        }),
      reorderQueryTabs: (fromIndex: number, toIndex: number) =>
        set((state) => {
          const nextTabs = [...state.queryTabs];
          const [movedTab] = nextTabs.splice(fromIndex, 1);
          if (!movedTab) {
            return { queryTabs: state.queryTabs };
          }

          nextTabs.splice(toIndex, 0, movedTab);
          return { queryTabs: nextTabs };
        }),
      setQuerySql: (sql: string) =>
        set((state) => {
          if (!state.activeQueryTabId) {
            return { queryTabs: state.queryTabs };
          }

          return {
            queryTabs: state.queryTabs.map((tab) =>
              tab.id === state.activeQueryTabId ? { ...tab, sql } : tab,
            ),
          };
        }),
      setQuerySaved: (sql?: string) =>
        set((state) => {
          if (!state.activeQueryTabId) {
            return { queryTabs: state.queryTabs };
          }

          return {
            queryTabs: state.queryTabs.map((tab) =>
              tab.id === state.activeQueryTabId
                ? { ...tab, savedSql: sql ?? tab.sql }
                : tab,
            ),
          };
        }),
      setQueryFilePath: (filePath?: string) =>
        set((state) => {
          if (!state.activeQueryTabId) {
            return { queryTabs: state.queryTabs };
          }

          return {
            queryTabs: state.queryTabs.map((tab) =>
              tab.id === state.activeQueryTabId ? { ...tab, filePath } : tab,
            ),
          };
        }),
      setQueryTitle: (tabId: string, title: string) =>
        set((state) => ({
          queryTabs: state.queryTabs.map((tab) =>
            tab.id === tabId ? { ...tab, title } : tab,
          ),
        })),
    }),
    {
      name: "tab-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
