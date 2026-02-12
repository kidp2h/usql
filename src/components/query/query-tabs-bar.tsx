"use client";

import * as React from "react";
import { Database, FileText, Folder, Table, X } from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Kbd } from "@/components/ui/kbd";
import type { QueryTab } from "@/stores/sidebar-store";

type QueryTabsBarProps = {
  tabs: QueryTab[];
  activeTabId?: string;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseAllTabs: () => void;
  onReorderTabs: (fromIndex: number, toIndex: number) => void;
};

export function QueryTabsBar({
  tabs,
  activeTabId,
  onActivateTab,
  onCloseTab,
  onCloseAllTabs,
  onReorderTabs,
}: QueryTabsBarProps) {
  const [draggedTabIndex, setDraggedTabIndex] = React.useState<number | null>(
    null
  );
  const [dragOverTabIndex, setDragOverTabIndex] = React.useState<number | null>(
    null
  );

  const renderTabIcon = (icon: QueryTab["icon"]) => {
    switch (icon) {
      case "table":
        return <Table className="size-4 text-muted-foreground" />;
      case "schema":
        return <Folder className="size-4 text-muted-foreground" />;
      case "connection":
        return <Database className="size-4 text-muted-foreground" />;
      default:
        return <FileText className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-center gap-2 border-b px-2 py-2">
      <div className="flex flex-1 items-center gap-2 overflow-x-auto">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const isDragging = draggedTabIndex === index;
          const isDragOver = dragOverTabIndex === index;

          return (
            <ContextMenu key={tab.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={
                    "group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition " +
                    (isActive
                      ? "border-foreground/15 bg-muted text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-muted/60") +
                    (isDragging ? " opacity-50" : "") +
                    (isDragOver ? " ring-2 ring-primary ring-offset-1" : "")
                  }
                >
                  <button
                    type="button"
                    draggable
                    onClick={() => onActivateTab(tab.id)}
                    onDragStart={(event) => {
                      setDraggedTabIndex(index);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      if (draggedTabIndex !== null && draggedTabIndex !== index) {
                        setDragOverTabIndex(index);
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverTabIndex(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedTabIndex !== null && draggedTabIndex !== index) {
                        onReorderTabs(draggedTabIndex, index);
                      }
                      setDraggedTabIndex(null);
                      setDragOverTabIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedTabIndex(null);
                      setDragOverTabIndex(null);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {renderTabIcon(tab.icon)}
                    <span className="max-w-40 truncate">{tab.title}</span>
                  </button>
                  <span className="flex items-center gap-1">
                    <span className="h-4 w-px bg-border" />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Close ${tab.title}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => onCloseTab(tab.id)}>
                  Close tab
                  <Kbd className="ml-auto text-xs">⌘ + W</Kbd>
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onCloseAllTabs()}>
                  Close all tabs
                  <Kbd className="ml-auto text-xs">⌘ + Shift + W</Kbd>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
}
