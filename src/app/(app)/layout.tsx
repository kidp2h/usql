"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AppMenubar } from "@/components/app-menubar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
     <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "30%",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      
      <SidebarInset>
        <AppMenubar />
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
      <AppSidebar />
    </SidebarProvider>
  );
}
