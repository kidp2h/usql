"use client";

import * as React from "react";
import { QueryResultsPanel } from "@/components/query/v2/query-results-panel";
import { QueryTabsBar } from "@/components/query/v2/query-tabs-bar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useSidebar } from "@/components/ui/sidebar";
import { useTabStore } from "@/stores/tab-store";
import { Alpha } from "@/components/alpha";
import { useQuery } from "@/hooks/use-query";
import { QueryEditor } from "@/components/query-editor/v2/query-editor";

export default function Home() {
  const { setOpen } = useSidebar();
  const [isEditorFocused, setIsEditorFocused] = React.useState(false);
  const setQuerySql = useTabStore((state) => state.setQuerySql);

  const {
    queryResult,
    isExecuting,
    isExplainMode,
    executionTime,
    fileInputRef,
    activeTab,
    handleOpenFileChange,
    copyText,
    getSelectedTextRef,
  } = useQuery({ setOpen, isEditorFocused });


  return (

    <section className="flex h-full min-h-105 min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      {
        activeTab ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql"
              multiple
              onChange={handleOpenFileChange}
              className="hidden"
            />
            <QueryTabsBar />
            <ResizablePanelGroup orientation="vertical" className="flex-1 min-w-0">
              <ResizablePanel defaultSize={50} minSize={15}>
                <QueryEditor
                  value={activeTab.sql}
                  onChange={(value) => {
                    if (value !== undefined) setQuerySql(value);
                  }}
                  onEditorMount={(getSelection) => {
                    getSelectedTextRef.current = getSelection;
                  }}
                  onEditorFocusChange={setIsEditorFocused}
                />
              </ResizablePanel>
              {activeTab ? (<ResizableHandle withHandle />) : null}
              {activeTab ? (<ResizablePanel defaultSize={50} minSize={15}>
                <QueryResultsPanel
                  isExecuting={isExecuting}
                  queryResult={queryResult}
                  isExplainMode={isExplainMode}
                  executionTime={executionTime}
                  copyText={copyText}
                />
              </ResizablePanel>) : null}
            </ResizablePanelGroup>
          </>
        ) : <Alpha />
      }
    </section>
  );
}
