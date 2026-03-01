import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DbType } from "@/lib/db-types";

type SidebarSubItem = {
  title: string;
  url: string;
  isActive?: boolean;
};

type SidebarGroup = {
  title: string;
  url: string;
  items?: SidebarSubItem[];
};

type ConnectionConfig = {
  id: string;
  name: string;
  dbType: DbType;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  readOnly: boolean;
};

type ConnectionSchema = {
  name: string;
  tables: string[];
  tablesLoaded?: boolean;
  loading: boolean;
  error?: string;
  tableColumns: Record<string, TableColumn[]>;
  tableColumnsLoading: Record<string, boolean>;
  tableColumnsError: Record<string, string | undefined>;
  tableIndexes: Record<string, string[]>;
  tableIndexesLoading: Record<string, boolean>;
  tableIndexesError: Record<string, string | undefined>;
};

type TableColumn = {
  name: string;
  dataType?: string;
  isPrimary: boolean;
  isForeign: boolean;
};

type ConnectionState = {
  config: ConnectionConfig;
  schemas: ConnectionSchema[];
  schemasLoaded?: boolean;
  loading: boolean;
  error?: string;
};

type QueryContext = {
  connectionId: string;
  connectionName: string;
  schema?: string;
  table?: string;
};

type QueryTabIcon = "connection" | "schema" | "table" | "query";

export type QueryTab = {
  id: string;
  title: string;
  icon: QueryTabIcon;
  context?: QueryContext;
  sql: string;
  savedSql?: string;
  filePath?: string;
};

type SidebarState = {
  navMain: SidebarGroup[];
  connections: ConnectionState[];
  selectedConnectionId?: string;
  selectedSchema?: { connectionId: string; name: string };
  selectedTable?: { connectionId: string; schema: string; name: string };
  queryTabs: QueryTab[];
  activeQueryTabId?: string;
  setNavMain: (navMain: SidebarGroup[]) => void;
  setActiveItem: (groupTitle: string, itemTitle: string) => void;
  addConnection: (connection: Omit<ConnectionConfig, "id">) => void;
  deleteConnection: (id: string) => void;
  updateConnection: (
    id: string,
    connection: Omit<ConnectionConfig, "id">,
  ) => void;
  setSelectedConnection: (id: string) => void;
  setSelectedSchema: (connectionId: string, name: string) => void;
  setSelectedTable: (
    connectionId: string,
    schema: string,
    name: string,
  ) => void;
  openQuery: (context: QueryContext) => void;
  openSqlTab: (payload: {
    title?: string;
    sql: string;
    filePath?: string;
  }) => void;
  closeQuery: () => void;
  closeQueryTab: (tabId: string) => void;
  closeAllTabs: () => void;
  setActiveQueryTab: (tabId: string) => void;
  reorderQueryTabs: (fromIndex: number, toIndex: number) => void;
  setQuerySql: (sql: string) => void;
  setQuerySaved: (sql?: string) => void;
  setQueryFilePath: (filePath?: string) => void;
  setQueryTitle: (tabId: string, title: string) => void;
  setConnectionLoading: (id: string, loading: boolean) => void;
  setConnectionError: (id: string, error?: string) => void;
  setConnectionSchemas: (id: string, schemas: string[]) => void;
  setSchemaLoading: (id: string, schema: string, loading: boolean) => void;
  setSchemaError: (id: string, schema: string, error?: string) => void;
  setSchemaTables: (id: string, schema: string, tables: string[]) => void;
  setTableColumnsLoading: (
    id: string,
    schema: string,
    table: string,
    loading: boolean,
  ) => void;
  setTableColumnsError: (
    id: string,
    schema: string,
    table: string,
    error?: string,
  ) => void;
  setTableColumns: (
    id: string,
    schema: string,
    table: string,
    columns: TableColumn[],
  ) => void;
  setTableIndexesLoading: (
    id: string,
    schema: string,
    table: string,
    loading: boolean,
  ) => void;
  setTableIndexesError: (
    id: string,
    schema: string,
    table: string,
    error?: string,
  ) => void;
  setTableIndexes: (
    id: string,
    schema: string,
    table: string,
    indexes: string[],
  ) => void;
};

const initialNav: SidebarGroup[] = [];

const updateActiveItems = (
  navMain: SidebarGroup[],
  groupTitle: string,
  itemTitle: string,
) => {
  const next: SidebarGroup[] = [];

  for (const group of navMain) {
    if (group.title !== groupTitle || !group.items) {
      next.push(group);
      continue;
    }

    const items: SidebarSubItem[] = [];
    for (const item of group.items) {
      items.push({
        ...item,
        isActive: item.title === itemTitle,
      });
    }

    next.push({
      ...group,
      items,
    });
  }

  return next;
};

const setConnectionLoadingInList = (
  connections: ConnectionState[],
  id: string,
  loading: boolean,
) => {
  const next: ConnectionState[] = [];

  for (const connection of connections) {
    next.push(
      connection.config.id === id ? { ...connection, loading } : connection,
    );
  }

  return next;
};

const setConnectionErrorInList = (
  connections: ConnectionState[],
  id: string,
  error?: string,
) => {
  const next: ConnectionState[] = [];

  for (const connection of connections) {
    next.push(
      connection.config.id === id ? { ...connection, error } : connection,
    );
  }

  return next;
};

const setConnectionSchemasInList = (
  connections: ConnectionState[],
  id: string,
  schemas: string[],
) => {
  const nextSchemas: ConnectionSchema[] = [];

  for (const name of schemas) {
    nextSchemas.push({
      name,
      tables: [],
      tablesLoaded: false,
      loading: false,
      tableColumns: {},
      tableColumnsLoading: {},
      tableColumnsError: {},
      tableIndexes: {},
      tableIndexesLoading: {},
      tableIndexesError: {},
    });
  }

  const next: ConnectionState[] = [];

  for (const connection of connections) {
    if (connection.config.id === id) {
      next.push({
        ...connection,
        schemas: nextSchemas,
        schemasLoaded: true,
        error: undefined,
      });
    } else {
      next.push(connection);
    }
  }

  return next;
};

const setSchemaLoadingInList = (
  connections: ConnectionState[],
  id: string,
  schema: string,
  loading: boolean,
) => {
  const next: ConnectionState[] = [];

  for (const connection of connections) {
    if (connection.config.id !== id) {
      next.push(connection);
      continue;
    }

    const schemas: ConnectionSchema[] = [];
    for (const item of connection.schemas) {
      schemas.push(item.name === schema ? { ...item, loading } : item);
    }

    next.push({
      ...connection,
      schemas,
    });
  }

  return next;
};

const setSchemaErrorInList = (
  connections: ConnectionState[],
  id: string,
  schema: string,
  error?: string,
) => {
  const next: ConnectionState[] = [];

  for (const connection of connections) {
    if (connection.config.id !== id) {
      next.push(connection);
      continue;
    }

    const schemas: ConnectionSchema[] = [];
    for (const item of connection.schemas) {
      schemas.push(item.name === schema ? { ...item, error } : item);
    }

    next.push({
      ...connection,
      schemas,
    });
  }

  return next;
};

const setSchemaTablesInList = (
  connections: ConnectionState[],
  id: string,
  schema: string,
  tables: string[],
) => {
  const next: ConnectionState[] = [];

  for (const connection of connections) {
    if (connection.config.id !== id) {
      next.push(connection);
      continue;
    }

    const schemas: ConnectionSchema[] = [];
    for (const item of connection.schemas) {
      schemas.push(
        item.name === schema
          ? {
            ...item,
            tables,
            tablesLoaded: true,
            loading: false,
            error: undefined,
          }
          : item,
      );
    }

    next.push({
      ...connection,
      schemas,
    });
  }

  return next;
};

const setTableColumnsLoadingInList = (
  connections: ConnectionState[],
  id: string,
  schema: string,
  table: string,
  loading: boolean,
) => {
  const next: ConnectionState[] = [];

  for (const connection of connections) {
    if (connection.config.id !== id) {
      next.push(connection);
      continue;
    }

    const schemas = connection.schemas.map((item) =>
      item.name === schema
        ? {
          ...item,
          tableColumnsLoading: {
            ...item.tableColumnsLoading,
            [table]: loading,
          },
        }
        : item,
    );

    next.push({
      ...connection,
      schemas,
    });
  }

  return next;
};

const setTableColumnsErrorInList = (
  connections: ConnectionState[],
  id: string,
  schema: string,
  table: string,
  error?: string,
) => {
  const next: ConnectionState[] = [];

  for (const connection of connections) {
    if (connection.config.id !== id) {
      next.push(connection);
      continue;
    }

    const schemas = connection.schemas.map((item) =>
      item.name === schema
        ? {
          ...item,
          tableColumnsError: {
            ...item.tableColumnsError,
            [table]: error,
          },
        }
        : item,
    );

    next.push({
      ...connection,
      schemas,
    });
  }

  return next;
};

const setTableColumnsInList = (
  connections: ConnectionState[],
  id: string,
  schema: string,
  table: string,
  columns: TableColumn[],
) => {
  const next: ConnectionState[] = [];

  for (const connection of connections) {
    if (connection.config.id !== id) {
      next.push(connection);
      continue;
    }

    const schemas = connection.schemas.map((item) =>
      item.name === schema
        ? {
          ...item,
          tableColumns: {
            ...item.tableColumns,
            [table]: columns,
          },
          tableColumnsLoading: {
            ...item.tableColumnsLoading,
            [table]: false,
          },
          tableColumnsError: {
            ...item.tableColumnsError,
            [table]: undefined,
          },
        }
        : item,
    );

    next.push({
      ...connection,
      schemas,
    });
  }

  return next;
};

const setTableIndexesLoadingInList = (
  connections: ConnectionState[],
  id: string,
  schema: string,
  table: string,
  loading: boolean,
) => {
  const next: ConnectionState[] = [];

  for (const connection of connections) {
    if (connection.config.id !== id) {
      next.push(connection);
      continue;
    }

    const schemas = connection.schemas.map((item) =>
      item.name === schema
        ? {
          ...item,
          tableIndexesLoading: {
            ...item.tableIndexesLoading,
            [table]: loading,
          },
        }
        : item,
    );

    next.push({
      ...connection,
      schemas,
    });
  }

  return next;
};

const setTableIndexesErrorInList = (
  connections: ConnectionState[],
  id: string,
  schema: string,
  table: string,
  error?: string,
) => {
  const next: ConnectionState[] = [];

  for (const connection of connections) {
    if (connection.config.id !== id) {
      next.push(connection);
      continue;
    }

    const schemas = connection.schemas.map((item) =>
      item.name === schema
        ? {
          ...item,
          tableIndexesError: {
            ...item.tableIndexesError,
            [table]: error,
          },
        }
        : item,
    );

    next.push({
      ...connection,
      schemas,
    });
  }

  return next;
};

const setTableIndexesInList = (
  connections: ConnectionState[],
  id: string,
  schema: string,
  table: string,
  indexes: string[],
) => {
  const next: ConnectionState[] = [];

  for (const connection of connections) {
    if (connection.config.id !== id) {
      next.push(connection);
      continue;
    }

    const schemas = connection.schemas.map((item) =>
      item.name === schema
        ? {
          ...item,
          tableIndexes: {
            ...item.tableIndexes,
            [table]: indexes,
          },
          tableIndexesLoading: {
            ...item.tableIndexesLoading,
            [table]: false,
          },
          tableIndexesError: {
            ...item.tableIndexesError,
            [table]: undefined,
          },
        }
        : item,
    );

    next.push({
      ...connection,
      schemas,
    });
  }

  return next;
};

const createQueryTabTitle = (context: QueryContext, existing: QueryTab[]) => {
  const baseTitle = context.table || context.schema || context.connectionName;
  let title = baseTitle;
  let suffix = 2;

  while (existing.some((tab) => tab.title === title)) {
    title = `${baseTitle} (${suffix})`;
    suffix += 1;
  }

  return title;
};

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

const createQueryTabIcon = (context: QueryContext): QueryTabIcon => {
  if (context.table) {
    return "table";
  }
  if (context.schema) {
    return "schema";
  }
  if (context.connectionName) {
    return "connection";
  }
  return "query";
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      navMain: initialNav,
      connections: [],
      selectedConnectionId: undefined,
      selectedSchema: undefined,
      selectedTable: undefined,
      queryTabs: [],
      activeQueryTabId: undefined,

      setNavMain: (navMain) => set({ navMain }),
      setActiveItem: (groupTitle, itemTitle) =>
        set((state) => ({
          navMain: updateActiveItems(state.navMain, groupTitle, itemTitle),
        })),
      addConnection: (connection) =>
        set((state) => {
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : String(Date.now());

          return {
            connections: [
              ...state.connections,
              {
                config: {
                  id,
                  ...connection,
                },
                schemas: [],
                loading: false,
              },
            ],
          };
        }),
      deleteConnection: (id) =>
        set((state) => ({
          connections: state.connections.filter((c) => c.config.id !== id),
          selectedConnectionId:
            state.selectedConnectionId === id
              ? undefined
              : state.selectedConnectionId,
          queryTabs: state.queryTabs.filter(
            (tab) => tab.context?.connectionId !== id,
          ),
          activeQueryTabId: state.queryTabs.find(
            (tab) => tab.context?.connectionId !== id,
          )?.id,
        })),
      updateConnection: (id, connection) =>
        set((state) => ({
          connections: state.connections.map((c) =>
            c.config.id === id
              ? {
                ...c,
                config: {
                  id,
                  ...connection,
                },
              }
              : c,
          ),
        })),
      setSelectedConnection: (id) =>
        set(() => ({
          selectedConnectionId: id,
          selectedSchema: undefined,
          selectedTable: undefined,
        })),
      setSelectedSchema: (connectionId, name) =>
        set(() => ({
          selectedConnectionId: connectionId,
          selectedSchema: { connectionId, name },
          selectedTable: undefined,
        })),
      setSelectedTable: (connectionId, schema, name) =>
        set(() => ({
          selectedConnectionId: connectionId,
          selectedSchema: { connectionId, name: schema },
          selectedTable: { connectionId, schema, name },
        })),
      openQuery: (context) =>
        set((state) => {
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : String(Date.now());
          const title = createQueryTabTitle(context, state.queryTabs);
          const icon = createQueryTabIcon(context);

          // Default SQL based on context
          let defaultSql = "";
          if (context.table) {
            defaultSql = `SELECT * FROM ${context.table} LIMIT 100`;
          }

          const nextTab: QueryTab = {
            id,
            title,
            icon,
            context,
            sql: defaultSql,
            savedSql: defaultSql,
            filePath: undefined,
          };

          return {
            queryTabs: [...state.queryTabs, nextTab],
            activeQueryTabId: id,
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
      closeQuery: () =>
        set((state) => {
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
      closeQueryTab: (tabId) =>
        set((state) => {
          const index = state.queryTabs.findIndex((tab) => tab.id === tabId);
          if (index === -1) {
            return {
              queryTabs: state.queryTabs,
              activeQueryTabId: state.activeQueryTabId,
            };
          }

          const nextTabs = state.queryTabs.filter((tab) => tab.id !== tabId);
          const nextActive =
            state.activeQueryTabId === tabId
              ? nextTabs[index]?.id || nextTabs[index - 1]?.id
              : state.activeQueryTabId;

          return {
            queryTabs: nextTabs,
            activeQueryTabId: nextActive,
          };
        }),
      closeAllTabs: () =>
        set(() => ({
          queryTabs: [],
          activeQueryTabId: undefined,
        })),
      setActiveQueryTab: (tabId) =>
        set(() => ({
          activeQueryTabId: tabId,
        })),
      reorderQueryTabs: (fromIndex, toIndex) =>
        set((state) => {
          const tabs = [...state.queryTabs];
          const [movedTab] = tabs.splice(fromIndex, 1);
          tabs.splice(toIndex, 0, movedTab);
          return { queryTabs: tabs };
        }),
      setQuerySql: (sql) =>
        set((state) => ({
          queryTabs: state.queryTabs.map((tab) =>
            tab.id === state.activeQueryTabId ? { ...tab, sql } : tab,
          ),
        })),
      setQuerySaved: (sql) =>
        set((state) => ({
          queryTabs: state.queryTabs.map((tab) =>
            tab.id === state.activeQueryTabId
              ? { ...tab, savedSql: sql ?? tab.sql }
              : tab,
          ),
        })),
      setQueryFilePath: (filePath) =>
        set((state) => ({
          queryTabs: state.queryTabs.map((tab) =>
            tab.id === state.activeQueryTabId ? { ...tab, filePath } : tab,
          ),
        })),
      setQueryTitle: (tabId, title) =>
        set((state) => ({
          queryTabs: state.queryTabs.map((tab) =>
            tab.id === tabId ? { ...tab, title } : tab,
          ),
        })),
      setConnectionLoading: (id, loading) =>
        set((state) => ({
          connections: setConnectionLoadingInList(
            state.connections,
            id,
            loading,
          ),
        })),
      setConnectionError: (id, error) =>
        set((state) => ({
          connections: setConnectionErrorInList(state.connections, id, error),
        })),
      setConnectionSchemas: (id, schemas) =>
        set((state) => ({
          connections: setConnectionSchemasInList(
            state.connections,
            id,
            schemas,
          ),
        })),
      setSchemaLoading: (id, schema, loading) =>
        set((state) => ({
          connections: setSchemaLoadingInList(
            state.connections,
            id,
            schema,
            loading,
          ),
        })),
      setSchemaError: (id, schema, error) =>
        set((state) => ({
          connections: setSchemaErrorInList(
            state.connections,
            id,
            schema,
            error,
          ),
        })),
      setSchemaTables: (id, schema, tables) =>
        set((state) => ({
          connections: setSchemaTablesInList(
            state.connections,
            id,
            schema,
            tables,
          ),
        })),
      setTableColumnsLoading: (id, schema, table, loading) =>
        set((state) => ({
          connections: setTableColumnsLoadingInList(
            state.connections,
            id,
            schema,
            table,
            loading,
          ),
        })),
      setTableColumnsError: (id, schema, table, error) =>
        set((state) => ({
          connections: setTableColumnsErrorInList(
            state.connections,
            id,
            schema,
            table,
            error,
          ),
        })),
      setTableColumns: (id, schema, table, columns) =>
        set((state) => ({
          connections: setTableColumnsInList(
            state.connections,
            id,
            schema,
            table,
            columns,
          ),
        })),
      setTableIndexesLoading: (id, schema, table, loading) =>
        set((state) => ({
          connections: setTableIndexesLoadingInList(
            state.connections,
            id,
            schema,
            table,
            loading,
          ),
        })),
      setTableIndexesError: (id, schema, table, error) =>
        set((state) => ({
          connections: setTableIndexesErrorInList(
            state.connections,
            id,
            schema,
            table,
            error,
          ),
        })),
      setTableIndexes: (id, schema, table, indexes) =>
        set((state) => ({
          connections: setTableIndexesInList(
            state.connections,
            id,
            schema,
            table,
            indexes,
          ),
        })),
    }),
    {
      name: "usql-sidebar",
      partialize: (state) => ({
        connections: state.connections.map((connection) => ({
          config: connection.config,
        })),
        selectedConnectionId: state.selectedConnectionId,
        selectedSchema: state.selectedSchema,
        selectedTable: state.selectedTable,
      }),
      merge: (persisted, current) => {
        const safe = persisted as {
          connections?: Array<{ config: ConnectionConfig }>;
          selectedConnectionId?: string;
          selectedSchema?: { connectionId: string; name: string };
          selectedTable?: {
            connectionId: string;
            schema: string;
            name: string;
          };
        };
        const hydrated = (safe.connections ?? []).map((item) => ({
          config: item.config,
          schemas: [],
          loading: false,
        }));

        return {
          ...current,
          connections: hydrated,
          selectedConnectionId: safe.selectedConnectionId,
          selectedSchema: safe.selectedSchema,
          selectedTable: safe.selectedTable,
        };
      },
    },
  ),
);

export type {
  SidebarGroup,
  SidebarSubItem,
  ConnectionConfig,
  ConnectionSchema,
  ConnectionState,
  TableColumn,
};
