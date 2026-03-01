"use client";

import { Database, FileText, Folder, Table, X } from "lucide-react";
import * as React from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Kbd } from "@/components/ui/kbd";
import type { QueryTab } from "@/stores/tab-store";

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
    null,
  );
  const [dragOverTabIndex, setDragOverTabIndex] = React.useState<number | null>(
    null,
  );
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      const target = scrollRef.current;
      if (!target || event.shiftKey) {
        return;
      }

      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
        return;
      }

      if (target.scrollWidth <= target.clientWidth) {
        return;
      }

      event.preventDefault();
      target.scrollLeft += event.deltaY;
    },
    [],
  );


  return (
    <div className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden border-b px-2 py-2">
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain scroll-smooth"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const isDragging = draggedTabIndex === index;
          const isDragOver = dragOverTabIndex === index;
          const isDirty = (tab.savedSql ?? tab.sql) !== tab.sql;

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
                      if (
                        draggedTabIndex !== null &&
                        draggedTabIndex !== index
                      ) {
                        setDragOverTabIndex(index);
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverTabIndex(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (
                        draggedTabIndex !== null &&
                        draggedTabIndex !== index
                      ) {
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
                    <FileText className="size-4 text-muted-foreground" />
                    {isDirty ? (
                      <span className="text-amber-500" title="Unsaved">
                        •
                      </span>
                    ) : null}
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
                      className="rounded p-0.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
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
                  <Kbd className="ml-auto text-xs">⌘ + ⇧ + W</Kbd>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
}
