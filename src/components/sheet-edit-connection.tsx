import React from "react";
import { ConnectionForm, ConnectionFormValues } from "./connection-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { useSidebarStore } from "@/stores/sidebar-store";

export type SheetEditConnectionProps = {
  editingConnection: {
    id: string;
    config: ConnectionFormValues;
  } | null;
  setEditingConnection: React.Dispatch<
    React.SetStateAction<{
      id: string;
      config: ConnectionFormValues;
    } | null>
  >;
};

export function SheetEditConnection({
  editingConnection,
  setEditingConnection,
}: SheetEditConnectionProps) {
  const connections = useSidebarStore((state) => state.connections);

  const updateConnection = useSidebarStore((state) => state.updateConnection);
  const handleUpdateConnection = React.useCallback(
    async (values: ConnectionFormValues) => {
      if (!editingConnection) {
        return { ok: false, message: "No connection selected for editing." };
      }

      const normalizedName = values.name.trim().toLowerCase();
      const hasDuplicate = connections.some(
        (connection) =>
          connection.config.id !== editingConnection.id &&
          connection.config.name.trim().toLowerCase() === normalizedName,
      );

      if (hasDuplicate) {
        return { ok: false, message: "Database name already exists." };
      }

      const electron = (
        globalThis as typeof globalThis & { electron?: Window["electron"] }
      ).electron;

      if (!electron?.testConnection) {
        return { ok: false, message: "Test only works in the desktop app." };
      }

      const result = await electron.testConnection(values);

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
        });
        setEditingConnection(null);
        return { ok: true, message: "Connection updated." };
      }

      return { ok: false, message: result.message || "Connection failed." };
    },
    [editingConnection, connections, updateConnection],
  );
  return (
    <Sheet
      open={!!editingConnection}
      onOpenChange={(open) => !open && setEditingConnection(null)}
    >
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
  );
}
