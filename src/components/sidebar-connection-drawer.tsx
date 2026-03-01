"use client";

import { Plus } from "lucide-react";
import * as React from "react";
import {
  ConnectionForm,
  type ConnectionFormValues,
} from "@/components/connection-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/stores/v2/sidebar-store";

export function SidebarConnectionDrawer() {
  const addConnection = useSidebarStore((state) => state.addConnection);
  const connections = useSidebarStore((state) => state.connections);
  const [open, setOpen] = React.useState(false);

  const onSubmit = React.useCallback(
    async (values: ConnectionFormValues) => {
      const normalizedName = values.name.trim().toLowerCase();
      const hasDuplicate = connections.some(
        (connection) =>
          connection.name.trim().toLowerCase() === normalizedName,
      );

      if (hasDuplicate) {
        return { ok: false, message: "Database name already exists." };
      }

      if (!window.electron?.testConnection) {
        return { ok: false, message: "Test only works in the desktop app." };
      }

      const result = await window.electron.testConnection(values);

      if (result.ok) {
        const id = crypto.randomUUID();
        const newConnection = {
          id,
          name: values.name,
          dbType: values.dbType,
          host: values.host,
          port: values.port,
          database: values.database,
          username: values.username,
          password: values.password,
          ssl: values.ssl,
          readOnly: values.readOnly,
          isLoading: true, // Set to true initially
          children: [],
        };
        addConnection(newConnection);
        setOpen(false);

        // Fetch schemas, tables, and columns in the background
        if (window.electron?.getSchemas) {
          window.electron.getSchemas(newConnection).then(async (res) => {
            if (res.ok && res.schemas) {
              // Fetch tables and columns for each schema
              const schemaNodes = await Promise.all(
                res.schemas.map(async (schemaName: string) => {
                  const schemaNode: any = {
                    id: `${id}:schema:${schemaName}`,
                    name: schemaName,
                    children: [],
                  };

                  if (window.electron?.getTables) {
                    const tablesRes = await window.electron.getTables(newConnection, schemaName);
                    if (tablesRes.ok && tablesRes.tables) {
                      schemaNode.children = await Promise.all(
                        tablesRes.tables.map(async (tableName: string) => {
                          const tableNode: any = {
                            id: `${id}:schema:${schemaName}:table:${tableName}`,
                            name: tableName,
                            children: [],
                          };

                          if (window.electron?.getColumns) {
                            const columnsRes = await window.electron.getColumns(
                              newConnection,
                              schemaName,
                              tableName
                            );
                            if (columnsRes.ok && columnsRes.columns) {
                              tableNode.children = [
                                {
                                  id: `${id}:schema:${schemaName}:table:${tableName}:columns`,
                                  name: "Columns",
                                  children: columnsRes.columns.map((col: any) => ({
                                    id: `${id}:schema:${schemaName}:table:${tableName}:column:${col.name}`,
                                    name: col.name,
                                    isPrimary: col.isPrimary,
                                    isForeign: col.isForeign,
                                    dataType: col.dataType,
                                  })),
                                },
                                {
                                  id: `${id}:schema:${schemaName}:table:${tableName}:indexes`,
                                  name: "Indexes",
                                  children: [], // Add indexes later if needed
                                },
                              ];
                            }
                          }
                          return tableNode;
                        })
                      );
                    }
                  }

                  return schemaNode;
                })
              );

              useSidebarStore.getState().updateConnection({
                ...newConnection,
                isLoading: false,
                children:
                  schemaNodes.length > 0
                    ? schemaNodes
                    : [
                      {
                        id: `${id}:empty`,
                        name: "No schemas found",
                        disabled: true,
                      },
                    ],
              });
            } else {
              useSidebarStore.getState().updateConnection({
                ...newConnection,
                isLoading: false,
                children: [
                  {
                    id: `${id}:error`,
                    name: res.message || "Failed to load",
                    disabled: true,
                    className: "text-destructive",
                  },
                ],
              });
            }
          }).catch(() => {
            useSidebarStore.getState().updateConnection({
              ...newConnection,
              isLoading: false,
              children: [
                {
                  id: `${id}:error`,
                  name: "Failed to load",
                  disabled: true,
                  className: "text-destructive",
                },
              ],
            });
          });
        }

        return { ok: true, message: "Connection saved." };
      }

      return { ok: false, message: result.message || "Connection failed." };
    },
    [addConnection, connections],
  );

  const onTest = React.useCallback((values: ConnectionFormValues) => {
    console.info("Connection test", values);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <SidebarMenuButton size="lg" data-tour-step-id="welcome" className="cursor-pointer">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Plus className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none text-left">
            <span className="font-medium">Universe SQL</span>
            <span className="">Add connection</span>
          </div>
        </SidebarMenuButton>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl lg:max-w-2xl">
        <SheetHeader>
          <SheetTitle>New database connection</SheetTitle>
          <SheetDescription>
            Add credentials to connect to your database.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <ConnectionForm onSubmit={onSubmit} onTest={onTest} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
