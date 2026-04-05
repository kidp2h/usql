"use client";

import * as React from "react";
import { QueryResultsPanel } from "@/components/query/query-results-panel";
import { QueryTabsBar } from "@/components/query/query-tabs-bar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useSidebar } from "@/components/ui/sidebar";
import { Alpha } from "@/components/alpha";
import { useQuery } from "@/hooks/use-query";

import { DMLConfirmationDialog } from "@/components/query/dml-confirmation-dialog";
import {SqlEditor} from "@/components/query/query-codemirror-editor";
import {useTheme} from "@/hooks/use-theme";

export default function Home() {
  const { setOpen } = useSidebar();
  const [isEditorFocused,] = React.useState(false);
  const [query, setQuery] = React.useState('')
  const { theme } = useTheme();
  const {
    queryResult,
    isExecuting,
    isExplainMode,
    executionTime,
    fileInputRef,
    activeTab,
    handleOpenFileChange,
    copyText,
    executeQuery,
    dmlConfirmation,
    setDmlConfirmation,
  } = useQuery({ setOpen, isEditorFocused });


  return (
    <section className="flex h-full min-h-105 min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept=".sql"
        multiple
        onChange={handleOpenFileChange}
        className="hidden"
      />
      {
        activeTab ? (
          <>
            <QueryTabsBar />
            <ResizablePanelGroup orientation="vertical" className="flex-1 min-w-0">
              <ResizablePanel defaultSize={50} minSize={15}>
                <SqlEditor value={query} onChange={setQuery} theme={theme} />
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
            <DMLConfirmationDialog
              open={dmlConfirmation.open}
              onOpenChange={(open) => setDmlConfirmation((prev) => ({ ...prev, open }))}
              estimatedRows={dmlConfirmation.estimatedRows}
              sql={dmlConfirmation.sql}
              onConfirm={() => executeQuery(dmlConfirmation.sql, true)}
            />
          </>
        ) : <Alpha />
      }
    </section>
  );
}
