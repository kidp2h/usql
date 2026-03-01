"use client";

import {
  Database,
  Dot,
  Edit,
  Folder,
  KeyRound,
  Link2,
  ListTree,
  RefreshCw,
  Table,
  Trash2,
  Type,
  Hash,
  CalendarDays,
  ToggleLeft,
  Braces,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { SidebarConnectionDrawer } from "@/components/sidebar-connection-drawer";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Kbd } from "@/components/ui/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSidebarStore } from "@/stores/sidebar-store";
import {
  SheetEditConnection,
  SheetEditConnectionProps,
} from "./sheet-edit-connection";
import { DrawerViewComments } from "./drawer-view-comments";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // #region State and stores
  const navMain = useSidebarStore((state) => state.navMain);
  const { setOpen } = useSidebar();
  const connections = useSidebarStore((state) => state.connections);
  const deleteConnection = useSidebarStore((state) => state.deleteConnection);
  const [editingConnection, setEditingConnection] =
    React.useState<SheetEditConnectionProps["editingConnection"]>(null);

  const selectedConnectionId = useSidebarStore(
    (state) => state.selectedConnectionId,
  );
  const selectedSchema = useSidebarStore((state) => state.selectedSchema);
  const selectedTable = useSidebarStore((state) => state.selectedTable);
  const openQuery = useSidebarStore((state) => state.openQuery);
  const setConnectionLoading = useSidebarStore(
    (state) => state.setConnectionLoading,
  );
  const setConnectionError = useSidebarStore(
    (state) => state.setConnectionError,
  );

  const setConnectionSchemas = useSidebarStore(
    (state) => state.setConnectionSchemas,
  );
  const setSelectedConnection = useSidebarStore(
    (state) => state.setSelectedConnection,
  );
  const setSelectedSchema = useSidebarStore((state) => state.setSelectedSchema);
  const setSelectedTable = useSidebarStore((state) => state.setSelectedTable);
  const setSchemaLoading = useSidebarStore((state) => state.setSchemaLoading);
  const setSchemaError = useSidebarStore((state) => state.setSchemaError);
  const setSchemaTables = useSidebarStore((state) => state.setSchemaTables);
  const [expandedConnections, setExpandedConnections] = React.useState<
    Record<string, boolean>
  >({});
  const setTableColumnsLoading = useSidebarStore(
    (state) => state.setTableColumnsLoading,
  );
  const setTableColumnsError = useSidebarStore(
    (state) => state.setTableColumnsError,
  );
  const setTableColumns = useSidebarStore((state) => state.setTableColumns);
  const setTableIndexesLoading = useSidebarStore(
    (state) => state.setTableIndexesLoading,
  );
  const setTableIndexesError = useSidebarStore(
    (state) => state.setTableIndexesError,
  );
  const setTableIndexes = useSidebarStore((state) => state.setTableIndexes);
  const [expandedSchemas, setExpandedSchemas] = React.useState<
    Record<string, boolean>
  >({});
  const [expandedTables, setExpandedTables] = React.useState<
    Record<string, boolean>
  >({});
  const [expandedTableColumns, setExpandedTableColumns] = React.useState<
    Record<string, boolean>
  >({});
  const [expandedTableIndexes, setExpandedTableIndexes] = React.useState<
    Record<string, boolean>
  >({});

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

  const electronApi = (
    globalThis as typeof globalThis & { electron?: Window["electron"] }
  ).electron;
  const getSchemas = electronApi?.getSchemas;
  const getTables = electronApi?.getTables;
  const getColumns = electronApi?.getColumns;
  const getIndexes = electronApi?.getIndexes;
  const executeQuery = electronApi?.executeQuery;
  // #endregion

  // #region Handlers
  const ensureTableColumnsLoaded = React.useCallback(
    async (connectionId: string, schemaName: string, tableName: string) => {
      const connection = connections.find(
        (item) => item.config.id === connectionId,
      );

      if (!connection || !getColumns) {
        return;
      }

      const schema = connection.schemas.find(
        (item) => item.name === schemaName,
      );

      if (!schema) {
        return;
      }

      const existing = schema.tableColumns?.[tableName];
      const loading = schema.tableColumnsLoading?.[tableName];

      if ((existing && existing.length > 0) || loading) {
        return;
      }

      setTableColumnsLoading(connectionId, schemaName, tableName, true);
      setTableColumnsError(connectionId, schemaName, tableName, undefined);

      const result = await getColumns(connection.config, schemaName, tableName);

      if (result.ok && result.columns) {
        setTableColumns(connectionId, schemaName, tableName, result.columns);
      } else {
        setTableColumnsError(
          connectionId,
          schemaName,
          tableName,
          result.message || "Failed to load columns.",
        );
      }

      setTableColumnsLoading(connectionId, schemaName, tableName, false);
    },
    [
      connections,
      getColumns,
      setTableColumns,
      setTableColumnsError,
      setTableColumnsLoading,
    ],
  );

  const ensureTableIndexesLoaded = React.useCallback(
    async (connectionId: string, schemaName: string, tableName: string) => {
      const connection = connections.find(
        (item) => item.config.id === connectionId,
      );

      if (!connection || !getIndexes) {
        return;
      }

      const schema = connection.schemas.find(
        (item) => item.name === schemaName,
      );

      if (!schema) {
        return;
      }

      const existing = schema.tableIndexes?.[tableName];
      const loading = schema.tableIndexesLoading?.[tableName];

      if ((existing && existing.length > 0) || loading) {
        return;
      }

      setTableIndexesLoading(connectionId, schemaName, tableName, true);
      setTableIndexesError(connectionId, schemaName, tableName, undefined);

      const result = await getIndexes(connection.config, schemaName, tableName);

      if (result.ok && result.indexes) {
        setTableIndexes(connectionId, schemaName, tableName, result.indexes);
      } else {
        setTableIndexesError(
          connectionId,
          schemaName,
          tableName,
          result.message || "Failed to load indexes.",
        );
      }

      setTableIndexesLoading(connectionId, schemaName, tableName, false);
    },
    [
      connections,
      getIndexes,
      setTableIndexes,
      setTableIndexesError,
      setTableIndexesLoading,
    ],
  );
  const handleNewQuery = React.useCallback(
    (context: {
      connectionId: string;
      connectionName: string;
      schema?: string;
      table?: string;
    }) => {
      openQuery(context);
      setOpen(false);
    },
    [openQuery],
  );
  const _handleViewComments = React.useCallback(
    async (context: {
      connectionId: string;
      connectionName: string;
      schema?: string;
      table?: string;
    }) => {
      if (!context.schema || !context.table || !executeQuery) {
        return;
      }

      // Set context and open modal
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
        // Find the connection to get its config
        const connection = connections.find(
          (item) => item.config.id === context.connectionId,
        );
        if (!connection) {
          throw new Error("Connection not found");
        }

        // Execute query to fetch column comments
        const query = `SELECT
    column_name,
    col_description('${context.schema}.${context.table}'::regclass, ordinal_position) AS comment
FROM information_schema.columns
WHERE table_schema = '${context.schema}'
  AND table_name = '${context.table}'
ORDER BY ordinal_position;`;

        const result = await executeQuery({
          ...connection.config,
          sql: query,
        });

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
    [connections, executeQuery],
  );
  const handleEditConnection = React.useCallback(
    (connectionId: string) => {
      const connection = connections.find((c) => c.config.id === connectionId);
      if (!connection) return;

      setEditingConnection({
        id: connectionId,
        config: {
          name: connection.config.name,
          dbType: connection.config.dbType,
          host: connection.config.host,
          port: connection.config.port,
          database: connection.config.database,
          username: connection.config.username,
          password: connection.config.password,
          ssl: connection.config.ssl,
          readOnly: connection.config.readOnly,
        },
      });
    },
    [connections],
  );

  const handleDeleteConnection = React.useCallback(
    (connectionId: string) => {
      if (confirm("Are you sure you want to delete this connection?")) {
        deleteConnection(connectionId);
      }
    },
    [deleteConnection],
  );

  const handleRefreshConnection = React.useCallback(
    async (connectionId: string) => {
      const connection = connections.find((c) => c.config.id === connectionId);
      if (!connection || !getSchemas) {
        return;
      }

      setConnectionLoading(connectionId, true);
      setConnectionError(connectionId, undefined);

      const result = await getSchemas(connection.config);

      if (result.ok && result.schemas) {
        setConnectionSchemas(connectionId, result.schemas);
      } else {
        setConnectionError(
          connectionId,
          result.message || "Failed to load schemas.",
        );
      }

      setConnectionLoading(connectionId, false);
    },
    [
      connections,
      getSchemas,
      setConnectionLoading,
      setConnectionError,
      setConnectionSchemas,
    ],
  );
  const renderDisabledSubItem = React.useCallback((label: string) => {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          className="pointer-events-none opacity-60 cursor-pointer"
          aria-disabled="true"
        >
          {label}
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }, []);

  const MemoizedTableNode = React.memo(
    ({
      connectionId,
      schema,
      table,
      isExpanded,
      columnsExpanded,
      indexesExpanded,
      isSelected,
      setExpandedTables,
      setExpandedTableColumns,
      setExpandedTableIndexes,
      setSelectedTable,
      ensureTableColumnsLoaded,
      ensureTableIndexesLoaded,
      handleNewQuery,
      _handleViewComments,
      renderDisabledSubItem,
    }: any) => {
      const tableKey = `${connectionId}:${schema.name}:${table}`;
      const tableColumns = schema.tableColumns?.[table] ?? [];
      const columnsLoading = schema.tableColumnsLoading?.[table];
      const columnsError = schema.tableColumnsError?.[table];
      const tableIndexes = schema.tableIndexes?.[table] ?? [];
      const indexesLoading = schema.tableIndexesLoading?.[table];
      const indexesError = schema.tableIndexesError?.[table];

      const columnsRender = React.useMemo(() => {
        if (!columnsExpanded) return null;
        return (
          <SidebarMenuSub>
            {columnsLoading ? (
              renderDisabledSubItem("Loading columns...")
            ) : columnsError ? (
              renderDisabledSubItem(columnsError)
            ) : tableColumns.length === 0 ? (
              renderDisabledSubItem("No columns found")
            ) : (
              tableColumns.map((column: any) => (
                <SidebarMenuSubItem key={column.name}>
                  <SidebarMenuSubButton className="pointer-events-none">
                    {column.isPrimary ? (
                      <KeyRound className="size-4 text-amber-400" />
                    ) : column.isForeign ? (
                      <Link2 className="size-4 text-muted-foreground" />
                    ) : (
                      <Dot className="size-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{column.name}</span>
                    {column.dataType && (() => {
                      const type = column.dataType.toLowerCase();
                      let badgeColor = "text-muted-foreground bg-muted/50 border-muted";
                      let Icon = Hash;

                      if (type.includes("char") || type.includes("text") || type.includes("varchar")) {
                        badgeColor = "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/50 dark:border-green-800";
                        Icon = Type;
                      } else if (type.includes("int") || type.includes("numeric") || type.includes("float") || type.includes("double") || type.includes("decimal") || type.includes("real")) {
                        badgeColor = "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/50 dark:border-blue-800";
                        Icon = Hash;
                      } else if (type.includes("date") || type.includes("time") || type.includes("timestamp")) {
                        badgeColor = "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/50 dark:border-purple-800";
                        Icon = CalendarDays;
                      } else if (type.includes("bool")) {
                        badgeColor = "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/50 dark:border-orange-800";
                        Icon = ToggleLeft;
                      } else if (type.includes("json") || type.includes("xml")) {
                        badgeColor = "text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-950/50 dark:border-cyan-800";
                        Icon = Braces;
                      }

                      return (
                        <Badge variant="outline" className={`ml-2 px-1 text-[10px] font-normal gap-1 ${badgeColor}`}>
                          <Icon className="size-3" />
                          {column.dataType}
                        </Badge>
                      );
                    })()}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))
            )}
          </SidebarMenuSub>
        );
      }, [columnsExpanded, columnsLoading, columnsError, tableColumns, renderDisabledSubItem]);

      const indexesRender = React.useMemo(() => {
        if (!indexesExpanded) return null;
        return (
          <SidebarMenuSub>
            {indexesLoading ? (
              renderDisabledSubItem("Loading indexes...")
            ) : indexesError ? (
              renderDisabledSubItem(indexesError)
            ) : tableIndexes.length === 0 ? (
              renderDisabledSubItem("No indexes found")
            ) : (
              tableIndexes.map((index: string) => (
                <SidebarMenuSubItem key={index}>
                  <SidebarMenuSubButton className="pointer-events-none text-muted-foreground">
                    <ListTree className="size-4" />
                    <span className="truncate">{index}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))
            )}
          </SidebarMenuSub>
        );
      }, [indexesExpanded, indexesLoading, indexesError, tableIndexes, renderDisabledSubItem]);

      return (
        <SidebarMenuSubItem>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <SidebarMenuSubButton
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedTable(connectionId, schema.name, table);
                  setExpandedTables((prev: any) => ({
                    ...prev,
                    [tableKey]: !prev[tableKey],
                  }));
                }}
                className={
                  isSelected
                    ? "bg-sidebar-accent text-sidebar-accent-foreground cursor-pointer"
                    : "cursor-pointer"
                }
              >
                <Table className="size-4 opacity-70" />
                {table}
              </SidebarMenuSubButton>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onSelect={() => {
                  void ensureTableColumnsLoaded(connectionId, schema.name, table);
                  handleNewQuery({
                    connectionId,
                    connectionName: connectionId, // Not exact but works for typing
                    schema: schema.name,
                    table,
                  });
                }}
              >
                New query
                <Kbd className="ml-auto text-xs">⌘+N</Kbd>
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  void _handleViewComments({
                    connectionId,
                    connectionName: connectionId,
                    schema: schema.name,
                    table,
                  });
                }}
              >
                View comment
                <Kbd className="ml-auto text-xs">⌘ + ⌥ + C</Kbd>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          {isExpanded && (
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  onClick={() => {
                    setExpandedTableColumns((prev: any) => ({
                      ...prev,
                      [tableKey]: !prev[tableKey],
                    }));
                    void ensureTableColumnsLoaded(connectionId, schema.name, table);
                  }}
                  className="cursor-pointer"
                >
                  <Folder className="size-4 opacity-70" />
                  Columns
                </SidebarMenuSubButton>
                {columnsRender}
              </SidebarMenuSubItem>

              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  className="cursor-pointer"
                  onClick={() => {
                    setExpandedTableIndexes((prev: any) => ({
                      ...prev,
                      [tableKey]: !prev[tableKey],
                    }));
                    void ensureTableIndexesLoaded(
                      connectionId,
                      schema.name,
                      table,
                    );
                  }}
                >
                  <Folder className="size-4 opacity-70" />
                  Indexes
                </SidebarMenuSubButton>
                {indexesRender}
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          )}
        </SidebarMenuSubItem>
      );
    },
    (prevProps, nextProps) => {
      // Custom equality check to prevent massive re-renders
      return (
        prevProps.connectionId === nextProps.connectionId &&
        prevProps.schema === nextProps.schema &&
        prevProps.table === nextProps.table &&
        prevProps.isExpanded === nextProps.isExpanded &&
        prevProps.columnsExpanded === nextProps.columnsExpanded &&
        prevProps.indexesExpanded === nextProps.indexesExpanded &&
        prevProps.isSelected === nextProps.isSelected
      );
    }
  );

  const renderTables = React.useCallback(
    (
      connectionId: string,
      schema: {
        name: string;
        tables: string[];
        loading: boolean;
        error?: string;
        tableColumns: Record<
          string,
          { name: string; isPrimary: boolean; isForeign: boolean; dataType?: string }[]
        >;
        tableColumnsLoading: Record<string, boolean>;
        tableColumnsError: Record<string, string | undefined>;
        tableIndexes: Record<string, string[]>;
        tableIndexesLoading: Record<string, boolean>;
        tableIndexesError: Record<string, string | undefined>;
      },
    ) => {
      const schemaKey = `${connectionId}:${schema.name}`;

      if (!expandedSchemas[schemaKey]) {
        return null;
      }

      if (schema.loading) {
        return renderDisabledSubItem("Loading tables...");
      }

      if (schema.error) {
        return renderDisabledSubItem(schema.error);
      }

      if (schema.tables.length === 0) {
        return renderDisabledSubItem("No tables found");
      }

      return schema.tables.map((table) => {
        const tableKey = `${connectionId}:${schema.name}:${table}`;
        return (
          <MemoizedTableNode
            key={table}
            connectionId={connectionId}
            schema={schema}
            table={table}
            isExpanded={!!expandedTables[tableKey]}
            columnsExpanded={!!expandedTableColumns[tableKey]}
            indexesExpanded={!!expandedTableIndexes[tableKey]}
            isSelected={
              selectedTable?.connectionId === connectionId &&
              selectedTable.schema === schema.name &&
              selectedTable.name === table
            }
            setExpandedTables={setExpandedTables}
            setExpandedTableColumns={setExpandedTableColumns}
            setExpandedTableIndexes={setExpandedTableIndexes}
            setSelectedTable={setSelectedTable}
            ensureTableColumnsLoaded={ensureTableColumnsLoaded}
            ensureTableIndexesLoaded={ensureTableIndexesLoaded}
            handleNewQuery={handleNewQuery}
            _handleViewComments={_handleViewComments}
            renderDisabledSubItem={renderDisabledSubItem}
          />
        );
      });
    },
    [
      expandedSchemas,
      expandedTables,
      expandedTableColumns,
      expandedTableIndexes,
      selectedTable,
      setSelectedTable,
      setExpandedTables,
      setExpandedTableColumns,
      setExpandedTableIndexes,
      ensureTableColumnsLoaded,
      ensureTableIndexesLoaded,
      handleNewQuery,
      _handleViewComments,
      renderDisabledSubItem,
    ],
  );

  const toggleConnection = React.useCallback(
    async (id: string, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setSelectedConnection(id);
      setExpandedConnections((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));

      const connection = connections.find((item) => item.config.id === id);
      if (!connection || connection.schemas.length > 0 || connection.schemasLoaded) {
        return;
      }

      if (!getSchemas) {
        setConnectionError(id, "Schemas only available in desktop app.");
        return;
      }

      setConnectionLoading(id, true);
      setConnectionError(id, undefined);

      const result = await getSchemas(connection.config);

      if (result.ok && result.schemas) {
        setConnectionSchemas(id, result.schemas);
      } else {
        setConnectionError(id, result.message || "Failed to load schemas.");
      }

      setConnectionLoading(id, false);
    },
    [
      connections,
      getSchemas,
      setConnectionLoading,
      setConnectionError,
      setConnectionSchemas,
      setSelectedConnection,
    ],
  );

  const toggleSchema = React.useCallback(
    async (connectionId: string, schemaName: string) => {
      const key = `${connectionId}:${schemaName}`;
      const isExpanded = expandedSchemas[key];
      if (!isExpanded) {
        setSelectedSchema(connectionId, schemaName);
      }
      setExpandedSchemas((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));

      const connection = connections.find(
        (item) => item.config.id === connectionId,
      );
      const schema = connection?.schemas.find(
        (item) => item.name === schemaName,
      );

      if (!connection || !schema || schema.tables.length > 0 || schema.tablesLoaded) {
        return;
      }

      if (!getTables) {
        setSchemaError(
          connectionId,
          schemaName,
          "Tables only available in desktop app.",
        );
        return;
      }

      setSchemaLoading(connectionId, schemaName, true);
      setSchemaError(connectionId, schemaName, undefined);

      const result = await getTables(connection.config, schemaName);

      if (result.ok && result.tables) {
        setSchemaTables(connectionId, schemaName, result.tables);
      } else {
        setSchemaError(
          connectionId,
          schemaName,
          result.message || "Failed to load tables.",
        );
      }

      setSchemaLoading(connectionId, schemaName, false);
    },
    [
      connections,
      expandedSchemas,
      getTables,
      setSchemaLoading,
      setSchemaError,
      setSchemaTables,
      setSelectedSchema,
    ],
  );

  // #region Effects
  React.useEffect(() => {
    const loadPersistedSelection = async () => {
      if (!selectedConnectionId) {
        return;
      }

      const connection = connections.find(
        (item) => item.config.id === selectedConnectionId,
      );

      if (!connection) {
        return;
      }

      if (
        connection.schemas.length === 0 &&
        !connection.loading &&
        getSchemas
      ) {
        setConnectionLoading(selectedConnectionId, true);
        setConnectionError(selectedConnectionId, undefined);

        const result = await getSchemas(connection.config);

        if (result.ok && result.schemas) {
          setConnectionSchemas(selectedConnectionId, result.schemas);
        } else {
          setConnectionError(
            selectedConnectionId,
            result.message || "Failed to load schemas.",
          );
        }

        setConnectionLoading(selectedConnectionId, false);
      }

      if (!selectedSchema || !getTables) {
        return;
      }

      const schema = connection.schemas.find(
        (item) => item.name === selectedSchema.name,
      );

      if (!schema || schema.tables.length > 0 || schema.loading) {
        return;
      }

      setSchemaLoading(selectedConnectionId, selectedSchema.name, true);
      setSchemaError(selectedConnectionId, selectedSchema.name, undefined);

      const tablesResult = await getTables(
        connection.config,
        selectedSchema.name,
      );

      if (tablesResult.ok && tablesResult.tables) {
        setSchemaTables(
          selectedConnectionId,
          selectedSchema.name,
          tablesResult.tables,
        );
      } else {
        setSchemaError(
          selectedConnectionId,
          selectedSchema.name,
          tablesResult.message || "Failed to load tables.",
        );
      }

      setSchemaLoading(selectedConnectionId, selectedSchema.name, false);
    };

    void loadPersistedSelection();
  }, [
    connections,
    getSchemas,
    getTables,
    selectedConnectionId,
    selectedSchema,
    setConnectionError,
    setConnectionLoading,
    setConnectionSchemas,
    setSchemaError,
    setSchemaLoading,
    setSchemaTables,
  ]);

  const MemoizedSchemaRow = React.memo(
    ({
      schema,
      connectionId,
      selectedSchema,
      toggleSchema,
      renderTables,
    }: {
      schema: {
        name: string;
        tables: string[];
        loading: boolean;
        error?: string;
        tableColumns: Record<
          string,
          { name: string; isPrimary: boolean; isForeign: boolean; dataType?: string }[]
        >;
        tableColumnsLoading: Record<string, boolean>;
        tableColumnsError: Record<string, string | undefined>;
        tableIndexes: Record<string, string[]>;
        tableIndexesLoading: Record<string, boolean>;
        tableIndexesError: Record<string, string | undefined>;
      };
      connectionId: string;
      selectedSchema?: { connectionId: string; name: string };
      toggleSchema: (connectionId: string, schemaName: string) => void;
      renderTables: (connectionId: string, schema: any) => React.ReactNode;
    }) => {
      return (
        <SidebarMenuSubItem key={schema.name}>
          <SidebarMenuSubButton
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleSchema(connectionId, schema.name);
            }}
            className={
              selectedSchema?.connectionId === connectionId &&
                selectedSchema.name === schema.name
                ? "bg-sidebar-accent text-sidebar-accent-foreground cursor-pointer"
                : "cursor-pointer"
            }
          >
            <Folder className="size-4 opacity-70" />
            {schema.name}
          </SidebarMenuSubButton>
          <SidebarMenuSub>
            {renderTables(connectionId, schema) ?? null}
          </SidebarMenuSub>
        </SidebarMenuSubItem>
      );
    }
  );

  const renderSchemas = React.useCallback(
    (connection: {
      config: { id: string; name: string };
      schemas: {
        name: string;
        tables: string[];
        loading: boolean;
        error?: string;
        tableColumns: Record<
          string,
          { name: string; isPrimary: boolean; isForeign: boolean; dataType?: string }[]
        >;
        tableColumnsLoading: Record<string, boolean>;
        tableColumnsError: Record<string, string | undefined>;
        tableIndexes: Record<string, string[]>;
        tableIndexesLoading: Record<string, boolean>;
        tableIndexesError: Record<string, string | undefined>;
      }[];
      loading: boolean;
      error?: string;
    }) => {
      if (connection.loading) {
        return renderDisabledSubItem("Loading schemas...");
      }

      if (connection.error) {
        return renderDisabledSubItem(connection.error);
      }

      if (connection.schemas.length === 0) {
        return renderDisabledSubItem("No schemas found");
      }

      return connection.schemas.map((schema) => (
        <MemoizedSchemaRow
          key={schema.name}
          schema={schema}
          connectionId={connection.config.id}
          selectedSchema={selectedSchema}
          toggleSchema={toggleSchema}
          renderTables={renderTables}
        />
      ));
    },
    [handleNewQuery, renderDisabledSubItem, renderTables, toggleSchema, selectedSchema],
  );

  // #endregion

  // #region Effects
  React.useEffect(() => {
    const loadPersistedSelection = async () => {
      if (!selectedConnectionId) {
        return;
      }

      const connection = connections.find(
        (item) => item.config.id === selectedConnectionId,
      );

      if (!connection) {
        return;
      }

      if (
        connection.schemas.length === 0 &&
        !connection.loading &&
        getSchemas
      ) {
        setConnectionLoading(selectedConnectionId, true);
        setConnectionError(selectedConnectionId, undefined);

        const result = await getSchemas(connection.config);

        if (result.ok && result.schemas) {
          setConnectionSchemas(selectedConnectionId, result.schemas);
        } else {
          setConnectionError(
            selectedConnectionId,
            result.message || "Failed to load schemas.",
          );
        }

        setConnectionLoading(selectedConnectionId, false);
      }

      if (!selectedSchema || !getTables) {
        return;
      }

      const schema = connection.schemas.find(
        (item) => item.name === selectedSchema.name,
      );

      if (!schema || schema.tables.length > 0 || schema.loading) {
        return;
      }

      setSchemaLoading(selectedConnectionId, selectedSchema.name, true);
      setSchemaError(selectedConnectionId, selectedSchema.name, undefined);

      const tablesResult = await getTables(
        connection.config,
        selectedSchema.name,
      );

      if (tablesResult.ok && tablesResult.tables) {
        setSchemaTables(
          selectedConnectionId,
          selectedSchema.name,
          tablesResult.tables,
        );
      } else {
        setSchemaError(
          selectedConnectionId,
          selectedSchema.name,
          tablesResult.message || "Failed to load tables.",
        );
      }

      setSchemaLoading(selectedConnectionId, selectedSchema.name, false);
    };

    void loadPersistedSelection();
  }, [
    connections,
    getSchemas,
    getTables,
    selectedConnectionId,
    selectedSchema,
    setConnectionError,
    setConnectionLoading,
    setConnectionSchemas,
    setSchemaError,
    setSchemaLoading,
    setSchemaTables,
  ]);

  const prevConnId = React.useRef(selectedConnectionId);
  const prevSchema = React.useRef(selectedSchema);
  const prevTable = React.useRef(selectedTable);

  React.useEffect(() => {
    if (selectedConnectionId !== prevConnId.current) {
      if (selectedConnectionId) {
        setExpandedConnections((prev) => ({
          ...prev,
          [selectedConnectionId]: true,
        }));
      }
      prevConnId.current = selectedConnectionId;
    }

    if (
      selectedSchema &&
      (selectedSchema.connectionId !== prevSchema.current?.connectionId ||
        selectedSchema.name !== prevSchema.current?.name)
    ) {
      const key = `${selectedSchema.connectionId}:${selectedSchema.name}`;
      setExpandedSchemas((prev) => ({
        ...prev,
        [key]: true,
      }));
      prevSchema.current = selectedSchema;
    }

    if (
      selectedTable &&
      (selectedTable.connectionId !== prevTable.current?.connectionId ||
        selectedTable.schema !== prevTable.current?.schema ||
        selectedTable.name !== prevTable.current?.name)
    ) {
      const key = `${selectedTable.connectionId}:${selectedTable.schema}`;
      setExpandedSchemas((prev) => ({
        ...prev,
        [key]: true,
      }));
      prevTable.current = selectedTable;
    }
  }, [selectedConnectionId, selectedSchema, selectedTable]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "n"
      ) {
        return;
      }

      if (!selectedTable) {
        toast.error("Please select a table to create a new query");
        return;
      }

      const targetConnectionId = selectedTable.connectionId;

      const connection = connections.find(
        (item) => item.config.id === targetConnectionId,
      );

      if (!connection) {
        return;
      }

      event.preventDefault();
      handleNewQuery({
        connectionId: targetConnectionId,
        connectionName: connection.config.name,
        schema: selectedTable.schema,
        table: selectedTable.name,
      });
    };

    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [
    connections,
    handleNewQuery,
    selectedConnectionId,
    selectedSchema,
    selectedTable,
  ]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        !event.shiftKey ||
        event.key.toLowerCase() !== "r"
      ) {
        return;
      }

      const targetConnectionId =
        selectedTable?.connectionId ||
        selectedSchema?.connectionId ||
        selectedConnectionId;

      if (!targetConnectionId) {
        return;
      }

      event.preventDefault();
      void handleRefreshConnection(targetConnectionId);
    };

    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [
    handleRefreshConnection,
    selectedConnectionId,
    selectedSchema,
    selectedTable,
  ]);

  // View comments shortcut: Ctrl+Alt+C
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.altKey || event.key.toLowerCase() !== "c") {
        return;
      }

      event.preventDefault();

      if (!selectedTable || !selectedSchema) {
        return;
      }

      const connection = connections.find(
        (item) => item.config.id === selectedTable.connectionId,
      );
      if (!connection) {
        return;
      }

      void _handleViewComments({
        connectionId: connection.config.id,
        connectionName: connection.config.name,
        schema: selectedSchema.name,
        table: selectedTable.name,
      });
    };

    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [connections, selectedSchema, selectedTable, _handleViewComments]);

  React.useEffect(() => {
    const handleViewCommentsEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) {
        void _handleViewComments(detail);
      }
    };

    globalThis.addEventListener("usql:view-comments", handleViewCommentsEvent);
    return () => globalThis.removeEventListener("usql:view-comments", handleViewCommentsEvent);
  }, [_handleViewComments]);

  // Close sidebar when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Find sidebar using data-sidebar attribute (shadcn/ui standard)
      const sidebarElement = document.querySelector("[data-sidebar]");
      const target = event.target as HTMLElement;

      console.log("Click detected:", {
        hasSidebar: !!sidebarElement,
        targetClass: target?.className,
        targetTag: target?.tagName,
        isInSidebar: sidebarElement?.contains(target),
      });

      // If click is outside sidebar, close it
      if (sidebarElement && !sidebarElement.contains(target)) {
        console.log("Closing sidebar");
        setOpen(false);
      }
    };

    // Add small delay to ensure sidebar is mounted
    const timer = setTimeout(() => {
      console.log("Attaching click listener");
      document.addEventListener("mousedown", handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setOpen]);
  // #endregion
  return (
    <Sidebar collapsible="offcanvas" side="right" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarConnectionDrawer />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {connections.length === 0 ? (
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="text-muted-foreground">
                  No connections yet
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : (
              connections.map((connection) => (
                <SidebarMenuItem key={connection.config.id}>
                  <div className="group flex items-center gap-1">
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <SidebarMenuButton
                          onPointerDown={(e) => toggleConnection(connection.config.id, e)}
                          className="flex-1 font-semibold cursor-pointer"
                        >
                          <Database className="size-4 opacity-70" />
                          {connection.config.name}
                        </SidebarMenuButton>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onSelect={() =>
                            handleRefreshConnection(connection.config.id)
                          }
                        >
                          <RefreshCw className="mr-2 size-4" />
                          Refresh
                          <Kbd className="ml-auto text-xs">⌘ + ⇧ + R</Kbd>
                        </ContextMenuItem>
                        <ContextMenuItem
                          onSelect={() =>
                            handleEditConnection(connection.config.id)
                          }
                        >
                          <Edit className="mr-2 size-4" />
                          Edit connection
                        </ContextMenuItem>
                        <ContextMenuItem
                          onSelect={() =>
                            handleDeleteConnection(connection.config.id)
                          }
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete connection
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConnection(connection.config.id);
                      }}
                    >
                      <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                  {expandedConnections[connection.config.id] ? (
                    <SidebarMenuSub>{renderSchemas(connection)}</SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarMenu>
            {navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link href={item.url} className="font-medium">
                    {item.title}
                  </Link>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={item.isActive}>
                          <Link href={item.url}>{item.title}</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
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
  );
}
