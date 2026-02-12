"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AppMenubar } from "@/components/app-menubar";
import {
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useSidebarStore } from "@/stores/sidebar-store";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const selectedConnectionId = useSidebarStore(
    (state) => state.selectedConnectionId
  );
  const selectedSchema = useSidebarStore((state) => state.selectedSchema);
  const selectedTable = useSidebarStore((state) => state.selectedTable);
  const connections = useSidebarStore((state) => state.connections);

  const selectedConnection = connections.find(
    (connection) => connection.config.id === selectedConnectionId
  );

  return (
     <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "30%",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      {children}
    </SidebarProvider>
  );
}
