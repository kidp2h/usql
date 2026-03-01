"use client";

import { AppSidebar } from "@/components/v2/app-sidebar";
import { AppMenubar } from "@/components/app-menubar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import React from "react";
import { useTheme } from "@/hooks/use-theme";
import { AboutModal } from "@/components/about-modal";
import { SettingsModal } from "@/components/settings-modal";
import { AppCommand } from "@/components/app-command";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [open, setOpen] = React.useState(false)
  const [showAboutDialog, setShowAboutDialog] = React.useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = React.useState(false);
  const { theme, setThemeMode } = useTheme();

  const handleCommand = React.useCallback((event: Event) => {
    const detail = (event as CustomEvent<{ type?: string }>).detail;
    const type = detail?.type;

    switch (type) {
      case "open-command-palette":
        setOpen(true);
        break;
      case "open-settings":
        setShowSettingsDialog(true);
        break;
      case "open-about":
        setShowAboutDialog(true);
        break;
      case "quit":
        if (window.electron?.windowClose) {
          void window.electron.windowClose();
        }
        break;
    }
  }, []);

  React.useEffect(() => {
    globalThis.addEventListener("usql:command", handleCommand);
    return () => globalThis.removeEventListener("usql:command", handleCommand);
  }, [handleCommand]);

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
      <SidebarInset>
        <AppMenubar />
        <AboutModal open={showAboutDialog} onOpenChange={setShowAboutDialog} />
        <SettingsModal open={showSettingsDialog} onOpenChange={setShowSettingsDialog} theme={theme} setThemeMode={setThemeMode} />
        <AppCommand
          open={open}
          setOpen={setOpen}
          setShowSettingsDialog={setShowSettingsDialog}
          setShowAboutDialog={setShowAboutDialog}
        />
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
      <AppSidebar />

    </SidebarProvider>
  );
}
