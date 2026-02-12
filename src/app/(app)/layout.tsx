"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {selectedConnection ? (
                  <>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">
                        {selectedConnection.config.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {selectedSchema ? (
                      <>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#">
                            {selectedSchema.name}
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        {selectedTable ? (
                          <>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                              <BreadcrumbPage>
                                {selectedTable.name}
                              </BreadcrumbPage>
                            </BreadcrumbItem>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem>
                          <BreadcrumbPage>Schema</BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">
                        Connections
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Select a table</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 overflow-hidden min-w-0 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
