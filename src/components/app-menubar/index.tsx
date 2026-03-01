"use client";

import { useKeyboard } from "@/hooks/use-keyboard";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useTheme } from "@/hooks/use-theme";
import { Menubar } from "@/components/ui/menubar";
import { AppMenubarFile } from "./app-menubar-file";
import { AppMenubarView } from "./app-menubar-view";
import { AppMenubarRun } from "./app-menubar-run";
import { AppMenubarResult } from "./app-menubar-result";
import { AppMenubarHelp } from "./app-menubar-help";

export function AppMenubar() {
  const { toggleTheme } = useTheme();
  const { dispatchCommand, dispatchAppearance } = useGlobalEvents();

  // New query
  useKeyboard({
    key: "n",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchCommand("new-query"),
  });

  // Open file
  useKeyboard({
    key: "o",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchCommand("open-file"),
  });

  useKeyboard({
    key: "d",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => toggleTheme(),
  });

  useKeyboard({
    key: "+",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchAppearance("zoom-in"),
  });

  useKeyboard({
    key: "=",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchAppearance("zoom-in"),
  });

  useKeyboard({
    key: "-",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchAppearance("zoom-out"),
  });

  useKeyboard({
    key: "0",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchAppearance("zoom-reset"),
  });

  // Execute
  useKeyboard({
    key: "Enter",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchCommand("execute"),
  });

  // Explain Analyze
  useKeyboard({
    key: "Enter",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("explain"),
  });

  // Save
  useKeyboard({
    key: "s",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchCommand("save"),
  });

  // Save As
  useKeyboard({
    key: "s",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => dispatchCommand("save-as"),
  });

  // Format
  useKeyboard({
    key: "l",
    ctrlKey: true,
    metaKey: true,
    onKeyDown: () => dispatchCommand("format"),
  });

  return (
    <div className="border-b flex flex-col">
      <Menubar className="border-0 border-b">
        <AppMenubarFile />
        <AppMenubarView />
        <AppMenubarRun />
        <AppMenubarResult />
        <AppMenubarHelp />
        <div className="app-region-drag"></div>
      </Menubar>
    </div>
  );
}
