import { Settings2, Palette, ZoomIn, ZoomOut, RotateCcw, Sun, Moon, PanelLeft, AppWindow, Minus, Maximize, X } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger
} from "@/components/ui/menubar";
import { useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { cn } from "@/lib/utils";
import * as React from "react";

export const AppMenubarView = () => {
  const { toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { dispatchCommand, dispatchAppearance } = useGlobalEvents();

  const handleWindowMinimize = React.useCallback(async () => {
    if (window.electron?.windowMinimize) {
      await window.electron.windowMinimize();
    }
  }, []);

  const handleWindowMaximize = React.useCallback(async () => {
    if (window.electron?.windowMaximize) {
      await window.electron.windowMaximize();
    }
  }, []);

  const handleWindowClose = React.useCallback(async () => {
    if (window.electron?.windowClose) {
      await window.electron.windowClose();
    }
  }, []);

  return (
    <MenubarMenu>
      <MenubarTrigger>View</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={() => dispatchCommand("open-settings")}>
          <Settings2 className="size-4 text-purple-500" />
          Settings
        </MenubarItem>
        <MenubarSub>
          <MenubarSubTrigger className="justify-between gap-2">
            <Palette className="size-4 text-fuchsia-500" />
            Appearance
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem onSelect={() => dispatchAppearance("zoom-in")}>
              <ZoomIn className="size-4 text-emerald-500" />
              Increase Font Size
              <Kbd className="ml-auto text-xs font-bold">⌘ + +</Kbd>
            </MenubarItem>
            <MenubarItem onSelect={() => dispatchAppearance("zoom-out")}>
              <ZoomOut className="size-4 text-orange-500" />
              Decrease Font Size
              <Kbd className="ml-auto text-xs font-bold">⌘ + -</Kbd>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={() => dispatchAppearance("zoom-reset")}>
              <RotateCcw className="size-4 text-slate-500" />
              Reset Font Size
              <Kbd className="ml-auto text-xs font-bold">⌘ + 0</Kbd>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={toggleTheme} className="justify-between">
              {theme === "dark" ? (
                <Sun className="size-4 text-amber-500" />
              ) : (
                <Moon className="size-4 text-indigo-400" />
              )}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
              <Kbd className="ml-auto text-xs font-bold">⌘ + ⇧ + D</Kbd>
            </MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
        <MenubarItem onSelect={toggleSidebar}>
          <PanelLeft className="size-4 text-sky-500" />
          Toggle Sidebar
          <Kbd className="ml-auto text-xs font-bold">⌘ + B</Kbd>
        </MenubarItem>
        <MenubarSeparator />
        <MenubarSub>
          <MenubarSubTrigger className="justify-between gap-2">
            <AppWindow className="size-4 text-emerald-500" />
            Window
          </MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem onSelect={handleWindowMinimize}>
              <Minus className="size-4 text-slate-500" />
              Minimize
            </MenubarItem>
            <MenubarItem onSelect={handleWindowMaximize}>
              <Maximize className="size-4 text-slate-500" />
              Maximize
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={handleWindowClose}>
              <X className="size-4 text-red-500" />
              Close
            </MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
      </MenubarContent>
    </MenubarMenu>
  );
};
