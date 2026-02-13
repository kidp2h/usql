"use client";

import {
  Activity,
  Braces,
  Copy,
  Download,
  FilePlus,
  FileX,
  Info,
  Layers,
  Moon,
  Palette,
  PanelLeft,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  X,
  EyeOff,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import * as React from "react";

import { Kbd } from "@/components/ui/kbd";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useSidebar } from "@/components/ui/sidebar";

const storageKey = "theme";

function getPreferredTheme(): "dark" | "light" {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(storageKey);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function AppMenubar() {
  const { toggleSidebar } = useSidebar();

  const dispatchCommand = React.useCallback((type: string) => {
    globalThis.dispatchEvent(
      new CustomEvent("usql:command", { detail: { type } }),
    );
  }, []);
  const dispatchAppearance = React.useCallback((type: string) => {
    globalThis.dispatchEvent(
      new CustomEvent("usql:appearance", { detail: { type } }),
    );
  }, []);
  const [theme, setTheme] = React.useState<"dark" | "light">("light");

  React.useEffect(() => {
    const preferred = getPreferredTheme();
    setTheme(preferred);
    document.documentElement.classList.toggle("dark", preferred === "dark");
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem(storageKey, next);
      return next;
    });
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) {
        return;
      }

      if (event.key.toLowerCase() !== "d") {
        return;
      }

      event.preventDefault();
      toggleTheme();
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [toggleTheme]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        dispatchAppearance("zoom-in");
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        dispatchAppearance("zoom-out");
        return;
      }

      if (event.key === "0") {
        event.preventDefault();
        dispatchAppearance("zoom-reset");
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [dispatchAppearance]);

  return (
    <div className="border-b px-3 py-2">
      <Menubar className="">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => dispatchCommand("close-tab")}>
              <X className="size-4 text-rose-500" />
              Close Tab
              <Kbd className="ml-auto text-xs">⌘ + W</Kbd>
            </MenubarItem>
            <MenubarItem onSelect={() => dispatchCommand("save")}>
              <Save className="size-4 text-emerald-500" />
              Save
              <Kbd className="ml-auto text-xs">⌘ + S</Kbd>
            </MenubarItem>
            <MenubarItem onSelect={() => dispatchCommand("save-as")}>
              <FilePlus className="size-4 text-emerald-400" />
              Save As
              <Kbd className="ml-auto text-xs">⌘ + ⇧ + S</Kbd>
            </MenubarItem>
            <MenubarItem onSelect={() => dispatchCommand("close-all-tabs")}>
              <Layers className="size-4 text-orange-500" />
              Close All Tabs
              <Kbd className="ml-auto text-xs">⌘ + ⇧ + W</Kbd>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={() => dispatchCommand("close-query")}>
              <FileX className="size-4 text-amber-500" />
              Close Query
              <Kbd className="ml-auto text-xs">⌘ + Q</Kbd>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={toggleSidebar}>
              <PanelLeft className="size-4 text-sky-500" />
              Toggle Sidebar
              <Kbd className="ml-auto text-xs">⌘ + B</Kbd>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={toggleTheme} className="justify-between">
              {theme === "dark" ? (
                <Sun className="size-4 text-amber-500" />
              ) : (
                <Moon className="size-4 text-indigo-400" />
              )}
              Theme
              <Kbd className="ml-auto text-xs">⌘ + ⇧ + D</Kbd>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger className="justify-between gap-2">
                <Palette className="size-4 text-fuchsia-500" />
                Appearance
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem onSelect={() => dispatchAppearance("zoom-in")}>
                  <ZoomIn className="size-4 text-emerald-500" />
                  Increase Font Size
                  <Kbd className="ml-auto text-xs">⌘ + +</Kbd>
                </MenubarItem>
                <MenubarItem onSelect={() => dispatchAppearance("zoom-out")}>
                  <ZoomOut className="size-4 text-orange-500" />
                  Decrease Font Size
                  <Kbd className="ml-auto text-xs">⌘ + -</Kbd>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onSelect={() => dispatchAppearance("zoom-reset")}>
                  <RotateCcw className="size-4 text-slate-500" />
                  Reset Font Size
                  <Kbd className="ml-auto text-xs">⌘ + 0</Kbd>
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => dispatchCommand("format")}>
              <Sparkles className="size-4 text-violet-500" />
              Format
              <Kbd className="ml-auto text-xs">⌘ + L</Kbd>
            </MenubarItem>
            <MenubarItem onSelect={() => dispatchCommand("copy")}>
              <Copy className="size-4 text-cyan-500" />
              Copy
              <Kbd className="ml-auto text-xs">⌘ + C</Kbd>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Run</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => dispatchCommand("execute")}>
              <Play className="size-4 text-emerald-500" />
              Execute
              <Kbd className="ml-auto text-xs">⌘ + Enter</Kbd>
            </MenubarItem>
            <MenubarItem onSelect={() => dispatchCommand("explain")}>
              <Activity className="size-4 text-amber-500" />
              Explain Analyze
              <Kbd className="ml-auto text-xs">⌘ + ⇧ + Enter</Kbd>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Result</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => dispatchCommand("result-export-csv")}>
              <Download className="size-4 text-emerald-500" />
              Export CSV
              <Kbd className="ml-auto text-xs">⌘ ⇧ C</Kbd>
            </MenubarItem>
            <MenubarItem
              onSelect={() => dispatchCommand("result-export-json")}
            >
              <Braces className="size-4 text-sky-500" />
              Export JSON
              <Kbd className="ml-auto text-xs">⌘ ⇧ J</Kbd>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem
              onSelect={() => dispatchCommand("result-show-all-columns")}
            >
              <EyeOff className="size-4 text-slate-500" />
              Show All Columns
              <Kbd className="ml-auto text-xs">⌘ ⇧ H</Kbd>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Help</MenubarTrigger>
          <MenubarContent>
            <MenubarItem disabled>
              <Info className="size-4 text-slate-500" />
              About
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
}
