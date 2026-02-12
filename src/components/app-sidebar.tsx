"use client"

import * as React from "react"
import {
  Database,
  Dot,
  Folder,
  KeyRound,
  Link2,
  ListTree,
  Table,
  Trash2,
  Edit,
  RefreshCw,
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Kbd } from "@/components/ui/kbd"

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
} from "@/components/ui/sidebar"
import Link from "next/link"
import { useSidebarStore } from "@/stores/sidebar-store"
import { SidebarConnectionDrawer } from "@/components/sidebar-connection-drawer"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  ConnectionForm,
  type ConnectionFormValues,
} from "@/components/connection-form"
import { Button } from "@/components/ui/button"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navMain = useSidebarStore((state) => state.navMain)
  const connections = useSidebarStore((state) => state.connections)
  const deleteConnection = useSidebarStore((state) => state.deleteConnection)
  const updateConnection = useSidebarStore((state) => state.updateConnection)
  const selectedConnectionId = useSidebarStore(
    (state) => state.selectedConnectionId
  )
  const selectedSchema = useSidebarStore((state) => state.selectedSchema)
  const selectedTable = useSidebarStore((state) => state.selectedTable)
  const openQuery = useSidebarStore((state) => state.openQuery)
  const setConnectionLoading = useSidebarStore(
    (state) => state.setConnectionLoading
  )
  const setConnectionError = useSidebarStore(
    (state) => state.setConnectionError
  )
  const setConnectionSchemas = useSidebarStore(
    (state) => state.setConnectionSchemas
  )
  const setSelectedConnection = useSidebarStore(
    (state) => state.setSelectedConnection
  )
  const setSelectedSchema = useSidebarStore((state) => state.setSelectedSchema)
  const setSelectedTable = useSidebarStore((state) => state.setSelectedTable)
  const setSchemaLoading = useSidebarStore((state) => state.setSchemaLoading)
  const setSchemaError = useSidebarStore((state) => state.setSchemaError)
  const setSchemaTables = useSidebarStore((state) => state.setSchemaTables)
  const [expandedConnections, setExpandedConnections] = React.useState<
    Record<string, boolean>
  >({})
  const setTableColumnsLoading = useSidebarStore(
    (state) => state.setTableColumnsLoading
  )
  const setTableColumnsError = useSidebarStore(
    (state) => state.setTableColumnsError
  )
  const setTableColumns = useSidebarStore((state) => state.setTableColumns)
  const setTableIndexesLoading = useSidebarStore(
    (state) => state.setTableIndexesLoading
  )
  const setTableIndexesError = useSidebarStore(
    (state) => state.setTableIndexesError
  )
  const setTableIndexes = useSidebarStore((state) => state.setTableIndexes)
  const [expandedSchemas, setExpandedSchemas] = React.useState<
    Record<string, boolean>
  >({})
  const [expandedTables, setExpandedTables] = React.useState<
    Record<string, boolean>
  >({})
  const [expandedTableColumns, setExpandedTableColumns] = React.useState<
    Record<string, boolean>
  >({})
  const [expandedTableIndexes, setExpandedTableIndexes] = React.useState<
    Record<string, boolean>
  >({})
  const [editingConnection, setEditingConnection] = React.useState<
    { id: string; config: ConnectionFormValues } | null
  >(null)
  const electronApi = (
    globalThis as typeof globalThis & { electron?: Window["electron"] }
  ).electron
  const getSchemas = electronApi?.getSchemas
  const getTables = electronApi?.getTables
  const getColumns = electronApi?.getColumns
  const getIndexes = electronApi?.getIndexes

  const ensureTableColumnsLoaded = React.useCallback(
    async (connectionId: string, schemaName: string, tableName: string) => {
      const connection = connections.find(
        (item) => item.config.id === connectionId
      )

      if (!connection || !getColumns) {
        return
      }

      const schema = connection.schemas.find((item) => item.name === schemaName)

      if (!schema) {
        return
      }

      const existing = schema.tableColumns?.[tableName]
      const loading = schema.tableColumnsLoading?.[tableName]

      if ((existing && existing.length > 0) || loading) {
        return
      }

      setTableColumnsLoading(connectionId, schemaName, tableName, true)
      setTableColumnsError(connectionId, schemaName, tableName, undefined)

      const result = await getColumns(
        connection.config,
        schemaName,
        tableName
      )

      if (result.ok && result.columns) {
        setTableColumns(connectionId, schemaName, tableName, result.columns)
      } else {
        setTableColumnsError(
          connectionId,
          schemaName,
          tableName,
          result.message || "Failed to load columns."
        )
      }

      setTableColumnsLoading(connectionId, schemaName, tableName, false)
    },
    [
      connections,
      getColumns,
      setTableColumns,
      setTableColumnsError,
      setTableColumnsLoading,
    ]
  )

  const ensureTableIndexesLoaded = React.useCallback(
    async (connectionId: string, schemaName: string, tableName: string) => {
      const connection = connections.find(
        (item) => item.config.id === connectionId
      )

      if (!connection || !getIndexes) {
        return
      }

      const schema = connection.schemas.find((item) => item.name === schemaName)

      if (!schema) {
        return
      }

      const existing = schema.tableIndexes?.[tableName]
      const loading = schema.tableIndexesLoading?.[tableName]

      if ((existing && existing.length > 0) || loading) {
        return
      }

      setTableIndexesLoading(connectionId, schemaName, tableName, true)
      setTableIndexesError(connectionId, schemaName, tableName, undefined)

      const result = await getIndexes(
        connection.config,
        schemaName,
        tableName
      )

      if (result.ok && result.indexes) {
        setTableIndexes(connectionId, schemaName, tableName, result.indexes)
      } else {
        setTableIndexesError(
          connectionId,
          schemaName,
          tableName,
          result.message || "Failed to load indexes."
        )
      }

      setTableIndexesLoading(connectionId, schemaName, tableName, false)
    },
    [
      connections,
      getIndexes,
      setTableIndexes,
      setTableIndexesError,
      setTableIndexesLoading,
    ]
  )

  React.useEffect(() => {
    const loadPersistedSelection = async () => {
      if (!selectedConnectionId) {
        return
      }

      const connection = connections.find(
        (item) => item.config.id === selectedConnectionId
      )

      if (!connection) {
        return
      }

      if (
        connection.schemas.length === 0 &&
        !connection.loading &&
        getSchemas
      ) {
        setConnectionLoading(selectedConnectionId, true)
        setConnectionError(selectedConnectionId, undefined)

        const result = await getSchemas(connection.config)

        if (result.ok && result.schemas) {
          setConnectionSchemas(selectedConnectionId, result.schemas)
        } else {
          setConnectionError(
            selectedConnectionId,
            result.message || "Failed to load schemas."
          )
        }

        setConnectionLoading(selectedConnectionId, false)
      }

      if (!selectedSchema || !getTables) {
        return
      }

      const schema = connection.schemas.find(
        (item) => item.name === selectedSchema.name
      )

      if (!schema || schema.tables.length > 0 || schema.loading) {
        return
      }

      setSchemaLoading(selectedConnectionId, selectedSchema.name, true)
      setSchemaError(selectedConnectionId, selectedSchema.name, undefined)

      const tablesResult = await getTables(
        connection.config,
        selectedSchema.name
      )

      if (tablesResult.ok && tablesResult.tables) {
        setSchemaTables(
          selectedConnectionId,
          selectedSchema.name,
          tablesResult.tables
        )
      } else {
        setSchemaError(
          selectedConnectionId,
          selectedSchema.name,
          tablesResult.message || "Failed to load tables."
        )
      }

      setSchemaLoading(selectedConnectionId, selectedSchema.name, false)

    }

    void loadPersistedSelection()
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
  ])

  React.useEffect(() => {
    if (selectedConnectionId) {
      setExpandedConnections((prev) => ({
        ...prev,
        [selectedConnectionId]: true,
      }))
    }

    if (selectedSchema) {
      const key = `${selectedSchema.connectionId}:${selectedSchema.name}`
      setExpandedSchemas((prev) => ({
        ...prev,
        [key]: true,
      }))
    }

    if (selectedTable) {
      const key = `${selectedTable.connectionId}:${selectedTable.schema}`
      setExpandedSchemas((prev) => ({
        ...prev,
        [key]: true,
      }))
    }
  }, [selectedConnectionId, selectedSchema, selectedTable])

  const handleNewQuery = React.useCallback(
    (context: {
      connectionId: string
      connectionName: string
      schema?: string
      table?: string
    }) => {
      openQuery(context)
    },
    [openQuery]
  )

  const handleEditConnection = React.useCallback(
    (connectionId: string) => {
      const connection = connections.find((c) => c.config.id === connectionId)
      if (!connection) return

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
      })
    },
    [connections]
  )

  const handleDeleteConnection = React.useCallback(
    (connectionId: string) => {
      if (confirm("Are you sure you want to delete this connection?")) {
        deleteConnection(connectionId)
      }
    },
    [deleteConnection]
  )

  const handleRefreshConnection = React.useCallback(
    async (connectionId: string) => {
      const connection = connections.find((c) => c.config.id === connectionId)
      if (!connection || !getSchemas) {
        return
      }

      setConnectionLoading(connectionId, true)
      setConnectionError(connectionId, undefined)

      const result = await getSchemas(connection.config)

      if (result.ok && result.schemas) {
        setConnectionSchemas(connectionId, result.schemas)
      } else {
        setConnectionError(
          connectionId,
          result.message || "Failed to load schemas."
        )
      }

      setConnectionLoading(connectionId, false)
    },
    [connections, getSchemas, setConnectionLoading, setConnectionError, setConnectionSchemas]
  )

  const handleUpdateConnection = React.useCallback(
    async (values: ConnectionFormValues) => {
      if (!editingConnection) {
        return { ok: false, message: "No connection selected for editing." }
      }

      const normalizedName = values.name.trim().toLowerCase()
      const hasDuplicate = connections.some(
        (connection) =>
          connection.config.id !== editingConnection.id &&
          connection.config.name.trim().toLowerCase() === normalizedName
      )

      if (hasDuplicate) {
        return { ok: false, message: "Database name already exists." }
      }

      const electron = (
        globalThis as typeof globalThis & { electron?: Window["electron"] }
      ).electron

      if (!electron?.testConnection) {
        return { ok: false, message: "Test only works in the desktop app." }
      }

      const result = await electron.testConnection(values)

      if (result.ok) {
        updateConnection(editingConnection.id, {
          name: values.name,
          dbType: values.dbType,
          host: values.host,
          port: values.port,
          database: values.database,
          username: values.username,
          password: values.password,
          ssl: values.ssl,
          readOnly: values.readOnly,
        })
        setEditingConnection(null)
        return { ok: true, message: "Connection updated." }
      }

      return { ok: false, message: result.message || "Connection failed." }
    },
    [editingConnection, connections, updateConnection]
  )

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "n") {
        return
      }

      const targetConnectionId =
        selectedTable?.connectionId ||
        selectedSchema?.connectionId ||
        selectedConnectionId

      if (!targetConnectionId) {
        return
      }

      const connection = connections.find(
        (item) => item.config.id === targetConnectionId
      )

      if (!connection) {
        return
      }

      event.preventDefault()
      handleNewQuery({
        connectionId: targetConnectionId,
        connectionName: connection.config.name,
        schema: selectedTable?.schema || selectedSchema?.name,
        table: selectedTable?.name,
      })
    }

    globalThis.addEventListener("keydown", onKeyDown)
    return () => globalThis.removeEventListener("keydown", onKeyDown)
  }, [
    connections,
    handleNewQuery,
    selectedConnectionId,
    selectedSchema,
    selectedTable,
  ])

  const renderDisabledSubItem = React.useCallback((label: string) => {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          className="pointer-events-none opacity-60"
          aria-disabled="true"
        >
          {label}
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }, [])

  const renderTables = React.useCallback(
    (
      connectionId: string,
      schema: {
        name: string
        tables: string[]
        loading: boolean
        error?: string
        tableColumns: Record<
          string,
          { name: string; isPrimary: boolean; isForeign: boolean }[]
        >
        tableColumnsLoading: Record<string, boolean>
        tableColumnsError: Record<string, string | undefined>
        tableIndexes: Record<string, string[]>
        tableIndexesLoading: Record<string, boolean>
        tableIndexesError: Record<string, string | undefined>
      }
    ) => {
      const schemaKey = `${connectionId}:${schema.name}`

      if (!expandedSchemas[schemaKey]) {
        return null
      }

      if (schema.loading) {
        return renderDisabledSubItem("Loading tables...")
      }

      if (schema.error) {
        return renderDisabledSubItem(schema.error)
      }

      if (schema.tables.length === 0) {
        return renderDisabledSubItem("No tables found")
      }

      return schema.tables.map((table) => {
        const tableKey = `${connectionId}:${schema.name}:${table}`
        const isExpanded = expandedTables[tableKey]
        const columnsExpanded = expandedTableColumns[tableKey]
        const indexesExpanded = expandedTableIndexes[tableKey]
        const tableColumns = schema.tableColumns?.[table] ?? []
        const columnsLoading = schema.tableColumnsLoading?.[table]
        const columnsError = schema.tableColumnsError?.[table]
        const tableIndexes = schema.tableIndexes?.[table] ?? []
        const indexesLoading = schema.tableIndexesLoading?.[table]
        const indexesError = schema.tableIndexesError?.[table]

        return (
          <SidebarMenuSubItem key={table}>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <SidebarMenuSubButton
                  onClick={() => {
                    setSelectedTable(connectionId, schema.name, table)
                    setExpandedTables((prev) => ({
                      ...prev,
                      [tableKey]: !prev[tableKey],
                    }))
                  }}
                  className={
                    selectedTable?.connectionId === connectionId &&
                    selectedTable.schema === schema.name &&
                    selectedTable.name === table
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : undefined
                  }
                >
                  <Table className="size-4 opacity-70" />
                  {table}
                </SidebarMenuSubButton>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onSelect={() => {
                    const connection = connections.find(
                      (item) => item.config.id === connectionId
                    )
                    if (!connection) {
                      return
                    }
                    void ensureTableColumnsLoaded(
                      connectionId,
                      schema.name,
                      table
                    )
                    handleNewQuery({
                      connectionId,
                      connectionName: connection.config.name,
                      schema: schema.name,
                      table,
                    })
                  }}
                >
                  New query
                  <Kbd className="ml-auto text-xs">c+N</Kbd>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            {isExpanded ? (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    onClick={() => {
                      setExpandedTableColumns((prev) => ({
                        ...prev,
                        [tableKey]: !prev[tableKey],
                      }))
                      void ensureTableColumnsLoaded(
                        connectionId,
                        schema.name,
                        table
                      )
                    }}
                  >
                    <Folder className="size-4 opacity-70" />
                    Columns
                  </SidebarMenuSubButton>
                  {columnsExpanded ? (
                    <SidebarMenuSub>
                      {columnsLoading
                        ? renderDisabledSubItem("Loading columns...")
                        : columnsError
                        ? renderDisabledSubItem(columnsError)
                        : tableColumns.length === 0
                        ? renderDisabledSubItem("No columns found")
                        : tableColumns.map((column) => (
                            <SidebarMenuSubItem key={column.name}>
                              <SidebarMenuSubButton className="pointer-events-none">
                                {column.isPrimary ? (
                                  <KeyRound className="size-4 text-amber-400" />
                                ) : column.isForeign ? (
                                  <Link2 className="size-4 text-muted-foreground" />
                                ) : (
                                  <Dot className="size-4 text-muted-foreground" />
                                )}
                                {column.name}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    onClick={() => {
                      setExpandedTableIndexes((prev) => ({
                        ...prev,
                        [tableKey]: !prev[tableKey],
                      }))
                      void ensureTableIndexesLoaded(
                        connectionId,
                        schema.name,
                        table
                      )
                    }}
                  >
                    <Folder className="size-4 opacity-70" />
                    Indexes
                  </SidebarMenuSubButton>
                  {indexesExpanded ? (
                    <SidebarMenuSub>
                      {indexesLoading
                        ? renderDisabledSubItem("Loading indexes...")
                        : indexesError
                        ? renderDisabledSubItem(indexesError)
                        : tableIndexes.length === 0
                        ? renderDisabledSubItem("No indexes found")
                        : tableIndexes.map((index) => (
                            <SidebarMenuSubItem key={index}>
                              <SidebarMenuSubButton className="pointer-events-none">
                                <ListTree className="size-4 text-muted-foreground" />
                                {index}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            ) : null}
          </SidebarMenuSubItem>
        )
      })
    },
    [
      connections,
      expandedSchemas,
      expandedTableColumns,
      expandedTableIndexes,
      expandedTables,
      ensureTableColumnsLoaded,
      ensureTableIndexesLoaded,
      handleNewQuery,
      renderDisabledSubItem,
      selectedTable,
      setSelectedTable,
    ]
  )

  const toggleConnection = React.useCallback(
    async (id: string) => {
      setSelectedConnection(id)
      setExpandedConnections((prev) => ({
        ...prev,
        [id]: !prev[id],
      }))

      const connection = connections.find((item) => item.config.id === id)
      if (!connection || connection.schemas.length > 0) {
        return
      }

      if (!getSchemas) {
        setConnectionError(id, "Schemas only available in desktop app.")
        return
      }

      setConnectionLoading(id, true)
      setConnectionError(id, undefined)

      const result = await getSchemas(connection.config)

      if (result.ok && result.schemas) {
        setConnectionSchemas(id, result.schemas)
      } else {
        setConnectionError(id, result.message || "Failed to load schemas.")
      }

      setConnectionLoading(id, false)
    },
    [
      connections,
      getSchemas,
      setConnectionLoading,
      setConnectionError,
      setConnectionSchemas,
      setSelectedConnection,
    ]
  )

  const toggleSchema = React.useCallback(
    async (connectionId: string, schemaName: string) => {
      const key = `${connectionId}:${schemaName}`
      setSelectedSchema(connectionId, schemaName)
      setExpandedSchemas((prev) => ({
        ...prev,
        [key]: !prev[key],
      }))

      const connection = connections.find(
        (item) => item.config.id === connectionId
      )
      const schema = connection?.schemas.find(
        (item) => item.name === schemaName
      )

      if (!connection || !schema || schema.tables.length > 0) {
        return
      }

      if (!getTables) {
        setSchemaError(
          connectionId,
          schemaName,
          "Tables only available in desktop app."
        )
        return
      }

      setSchemaLoading(connectionId, schemaName, true)
      setSchemaError(connectionId, schemaName, undefined)

      const result = await getTables(
        connection.config,
        schemaName
      )

      if (result.ok && result.tables) {
        setSchemaTables(connectionId, schemaName, result.tables)
      } else {
        setSchemaError(
          connectionId,
          schemaName,
          result.message || "Failed to load tables."
        )
      }

      setSchemaLoading(connectionId, schemaName, false)
    },
    [
      connections,
      getTables,
      setSchemaLoading,
      setSchemaError,
      setSchemaTables,
      setSelectedSchema,
    ]
  )

  const renderSchemas = React.useCallback(
    (
      connection: {
        config: { id: string, name: string }
        schemas: {
          name: string
          tables: string[]
          loading: boolean
          error?: string
          tableColumns: Record<
            string,
            { name: string; isPrimary: boolean; isForeign: boolean }[]
          >
          tableColumnsLoading: Record<string, boolean>
          tableColumnsError: Record<string, string | undefined>
          tableIndexes: Record<string, string[]>
          tableIndexesLoading: Record<string, boolean>
          tableIndexesError: Record<string, string | undefined>
        }[]
        loading: boolean
        error?: string
      }
    ) => {
      if (connection.loading) {
        return renderDisabledSubItem("Loading schemas...")
      }

      if (connection.error) {
        return renderDisabledSubItem(connection.error)
      }

      if (connection.schemas.length === 0) {
        return renderDisabledSubItem("No schemas found")
      }

      return connection.schemas.map((schema) => (
        <SidebarMenuSubItem key={schema.name}>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <SidebarMenuSubButton
                onClick={() => toggleSchema(connection.config.id, schema.name)}
                className={
                  selectedSchema?.connectionId === connection.config.id &&
                  selectedSchema.name === schema.name
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : undefined
                }
              >
                <Folder className="size-4 opacity-70" />
                {schema.name}
              </SidebarMenuSubButton>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onSelect={() =>
                  handleNewQuery({
                    connectionId: connection.config.id,
                    connectionName: connection.config.name,
                    schema: schema.name,
                  })
                }
              >
                New query
                <Kbd className="ml-auto text-xs">⌘+N</Kbd>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          <SidebarMenuSub>
            {renderTables(connection.config.id, schema) ?? null}
          </SidebarMenuSub>
        </SidebarMenuSubItem>
      ))
    },
    [handleNewQuery, renderDisabledSubItem, renderTables, toggleSchema]
  )

  return (
    <Sidebar {...props}>
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
                          onClick={() => toggleConnection(connection.config.id)}
                          className="flex-1 font-semibold"
                        >
                          <Database className="size-4 opacity-70" />
                          {connection.config.name}
                        </SidebarMenuButton>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onSelect={() =>
                            handleNewQuery({
                              connectionId: connection.config.id,
                              connectionName: connection.config.name,
                            })
                          }
                        >
                          New query
                          <Kbd className="ml-auto text-xs">⌘ + N</Kbd>
                        </ContextMenuItem>
                        <ContextMenuItem
                          onSelect={() => handleRefreshConnection(connection.config.id)}
                        >
                          <RefreshCw className="mr-2 size-4" />
                          Refresh
                          <Kbd className="ml-auto text-xs">⌘ + F5</Kbd>
                        </ContextMenuItem>
                        <ContextMenuItem
                          onSelect={() => handleEditConnection(connection.config.id)}
                        >
                          <Edit className="mr-2 size-4" />
                          Edit connection
                        </ContextMenuItem>
                        <ContextMenuItem
                          onSelect={() => handleDeleteConnection(connection.config.id)}
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
                        e.stopPropagation()
                        handleDeleteConnection(connection.config.id)
                      }}
                    >
                      <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                  {expandedConnections[connection.config.id] ? (
                    <SidebarMenuSub>
                      {renderSchemas(connection)}
                    </SidebarMenuSub>
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
      
      <Sheet open={!!editingConnection} onOpenChange={(open) => !open && setEditingConnection(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl lg:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Edit Connection</SheetTitle>
            <SheetDescription>
              Update the connection details and test the connection.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {editingConnection && (
              <ConnectionForm
                onSubmit={handleUpdateConnection}
                defaultValues={editingConnection.config}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Sidebar>
  )
}
