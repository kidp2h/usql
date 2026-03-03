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
import { useSidebarStore } from "@/stores/sidebar-store";

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

        // Fetch full metadata (schemas, tables, and columns) in the background
        if (window.electron?.getFullMetadata) {
          window.electron.getFullMetadata(newConnection).then((res: any) => {
            if (res.ok && res.metadata) {
              const schemaNodes = res.metadata.map((s: any) => ({
                id: `${id}:schema:${s.name}`,
                name: s.name,
                tableCount: s.tableCount,
                children: s.tables.map((t: any) => ({
                  id: `${id}:schema:${s.name}:table:${t.name}`,
                  name: t.name,
                  size: t.size,
                  children: [
                    {
                      id: `${id}:schema:${s.name}:table:${t.name}:columns`,
                      name: "Columns",
                      count: t.columnCount,
                      children: t.columns.map((col: any) => ({
                        id: `${id}:schema:${s.name}:table:${t.name}:column:${col.name}`,
                        name: col.name,
                        isPrimary: col.isPrimary,
                        isForeign: col.isForeign,
                        dataType: col.dataType,
                        references: col.references,
                      })),
                    },
                    {
                      id: `${id}:schema:${s.name}:table:${t.name}:indexes`,
                      name: "Indexes",
                      count: t.indexCount,
                      children: t.indexes.map((idxName: any) => ({
                        id: `${id}:schema:${s.name}:table:${t.name}:index:${idxName}`,
                        name: idxName,
                      })),
                    },
                  ],
                })),
              }));

              useSidebarStore.getState().updateConnection({
                ...newConnection,
                isLoading: false,
                children: schemaNodes.length > 0 ? schemaNodes : [
                  { id: `${id}:empty`, name: "No schemas found", disabled: true }
                ],
              });
            } else {
              useSidebarStore.getState().updateConnection({
                ...newConnection,
                isLoading: false,
                children: [{ id: `${id}:error`, name: res.message || "Failed to load", disabled: true, className: "text-destructive" }],
              });
            }
          }).catch(() => {
            useSidebarStore.getState().updateConnection({
              ...newConnection,
              isLoading: false,
              children: [{ id: `${id}:error`, name: "Failed to load", disabled: true, className: "text-destructive" }],
            });
          });
        }
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
