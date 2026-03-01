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
import { Button } from "@/components/ui/button";
import { useTabStore } from "@/stores/tab-store";
import type { QueryTab } from "@/stores/tab-store";

export function QueryTabsBar() {
  const tabs = useTabStore((state) => state.queryTabs);
  const activeTabId = useTabStore((state) => state.activeQueryTabId);
  const onActivateTab = useTabStore((state) => state.updateActiveQueryTabId);
  const onCloseTab = useTabStore((state) => state.removeQueryTab);
  const onCloseAllTabs = useTabStore((state) => state.closeAllTabs);
  const onReorderTabs = useTabStore((state) => state.reorderQueryTabs);
  const closeQuery = useTabStore((state) => state.closeQuery);

  const [draggedTabIndex, setDraggedTabIndex] = React.useState<number | null>(
    null,
  );
  const [dragOverTabIndex, setDragOverTabIndex] = React.useState<number | null>(
    null,
  );
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);
  const [pendingCloseTabId, setPendingCloseTabId] = React.useState<string | null>(null);
  const [pendingCloseType, setPendingCloseType] = React.useState<"tab" | "app" | "all" | null>(null);

  const activeTab = React.useMemo(() => {
    if (tabs.length === 0) {
      return undefined;
    }
    return tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  }, [activeTabId, tabs]);

  const isTabDirty = React.useCallback((tab?: typeof activeTab) => {
    if (!tab) {
      return false;
    }

    const savedSql = tab.savedSql ?? tab.sql;
    return savedSql !== tab.sql;
  }, []);

  const requestCloseQuery = React.useCallback(
    (tabId?: string) => {
      const targetTab = tabId
        ? tabs.find((tab) => tab.id === tabId)
        : activeTab;

      if (!targetTab) {
        closeQuery();
        return;
      }

      if (!isTabDirty(targetTab)) {
        if (tabId) {
          onCloseTab(tabId);
        } else {
          closeQuery();
        }
        return;
      }

      setPendingCloseTabId(targetTab.id);
      setPendingCloseType("tab");
      setShowUnsavedDialog(true);
    },
    [activeTab, closeQuery, onCloseTab, isTabDirty, tabs],
  );

  const requestCloseAllTabs = React.useCallback(() => {
    const hasDirty = tabs.some((tab) => isTabDirty(tab));
    if (!hasDirty) {
      onCloseAllTabs();
      return;
    }

    setPendingCloseTabId(null);
    setPendingCloseType("all");
    setShowUnsavedDialog(true);
  }, [onCloseAllTabs, isTabDirty, tabs]);

  React.useEffect(() => {
    const electronApi = window.electron as
      | {
        onAppCloseRequest?: (handler: () => void) => (() => void) | undefined;
        removeAppCloseRequest?: (handler: () => void) => void;
        confirmClose?: () => Promise<{ ok: boolean }>;
        cancelClose?: () => Promise<{ ok: boolean }>;
      }
      | undefined;

    if (!electronApi?.onAppCloseRequest) {
      return;
    }

    const handleAppCloseRequest = () => {
      void electronApi.cancelClose?.();
      const hasDirty = tabs.some((tab) => isTabDirty(tab));
      if (!hasDirty) {
        void electronApi.confirmClose?.();
        return;
      }

      setPendingCloseTabId(null);
      setPendingCloseType("app");
      setShowUnsavedDialog(true);
    };

    const cleanup = electronApi.onAppCloseRequest(handleAppCloseRequest);
    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      } else {
        electronApi.removeAppCloseRequest?.(handleAppCloseRequest);
      }
    };
  }, [isTabDirty, tabs]);

  React.useEffect(() => {
    const handleAppQuitRequest = () => {
      const hasDirty = tabs.some((tab) => isTabDirty(tab));
      if (!hasDirty) {
        void window.electron?.confirmClose?.();
        return;
      }

      setPendingCloseTabId(null);
      setPendingCloseType("app");
      setShowUnsavedDialog(true);
    };

    globalThis.addEventListener("app-quit-request", handleAppQuitRequest);
    return () => {
      globalThis.removeEventListener("app-quit-request", handleAppQuitRequest);
    };
  }, [isTabDirty, tabs]);

  React.useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; tabId?: string }>).detail;
      const type = detail?.type;

      switch (type) {
        case "close-tab-by-id":
          if (detail.tabId) {
            requestCloseQuery(detail.tabId);
          }
          break;
        case "close-all-tabs":
          requestCloseAllTabs();
          break;
      }
    };

    globalThis.addEventListener("usql:command", handleCommand);
    return () => globalThis.removeEventListener("usql:command", handleCommand);
  }, [requestCloseAllTabs, requestCloseQuery]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "w"
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey) {
        requestCloseAllTabs();
      } else if (activeTabId) {
        requestCloseQuery(activeTabId);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [activeTabId, requestCloseAllTabs, requestCloseQuery]);

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

  if (tabs.length === 0) return null;

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
                    {renderTabIcon(tab.icon)}
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
                        requestCloseQuery(tab.id);
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
                <ContextMenuItem onSelect={() => requestCloseQuery(tab.id)}>
                  Close tab
                  <Kbd className="ml-auto text-xs">⌘ + W</Kbd>
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => requestCloseAllTabs()}>
                  Close all tabs
                  <Kbd className="ml-auto text-xs">⌘ + ⇧ + W</Kbd>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
      {showUnsavedDialog ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
            <h3 className="text-sm font-semibold">Unsaved changes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingCloseType === "app"
                ? "You have unsaved changes. Close the app anyway?"
                : pendingCloseType === "all"
                  ? "Some queries have unsaved changes. Close all tabs anyway?"
                  : "This query has unsaved changes. Close it anyway?"}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUnsavedDialog(false);
                  setPendingCloseTabId(null);
                  if (pendingCloseType === "app") {
                    void window.electron?.cancelClose?.();
                  }
                  setPendingCloseType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowUnsavedDialog(false);
                  if (pendingCloseType === "app") {
                    void window.electron?.confirmClose?.();
                    setPendingCloseType(null);
                    setPendingCloseTabId(null);
                    return;
                  }

                  if (pendingCloseType === "all") {
                    onCloseAllTabs();
                    setPendingCloseType(null);
                    setPendingCloseTabId(null);
                    return;
                  }

                  if (pendingCloseTabId) {
                    onCloseTab(pendingCloseTabId);
                  } else {
                    closeQuery();
                  }
                  setPendingCloseTabId(null);
                  setPendingCloseType(null);
                }}
              >
                Close Without Saving
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}