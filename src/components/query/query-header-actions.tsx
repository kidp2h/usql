"use client";

import { Copy, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

type QueryHeaderActionsProps = {
  contextLabel: string;
  hasSql: boolean;
  isExecuting: boolean;
  canExecute: boolean;
  onFormat: () => void;
  onCopy: () => void;
  onExecute: () => void;
  onExplain: () => void;
  onClose: () => void;
};

export function QueryHeaderActions({
  contextLabel,
  hasSql,
  isExecuting,
  canExecute,
  onFormat,
  onCopy,
  onExecute,
  onExplain,
  onClose,
}: QueryHeaderActionsProps) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold">New SQL Query</h2>
        <p className="text-xs text-muted-foreground">{contextLabel}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onFormat} disabled={!hasSql}>
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-4" />
            <span>Format</span>
            <Kbd className="opacity-70">⌘ + L</Kbd>
          </span>
        </Button>
        <Button size="sm" variant="outline" onClick={onCopy} disabled={!hasSql}>
          <span className="inline-flex items-center gap-2">
            <Copy className="size-4" />
            <span>Copy</span>
          </span>
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={onExecute}
          disabled={!canExecute || isExecuting}
        >
          <span className="inline-flex items-center gap-2">
            <span>{isExecuting ? "Running" : "Execute"}</span>
            <Kbd className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 opacity-90">
              ⌘ + Enter
            </Kbd>
          </span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onExplain}
          disabled={!canExecute || isExecuting}
        >
          <span className="inline-flex items-center gap-2">
            <span>Explain Analyze</span>
            <Kbd className="opacity-70">⌘ + ⇧ + Enter</Kbd>
          </span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <span className="inline-flex items-center gap-2">
            <span>Close</span>
            <Kbd className="opacity-70">⌘ + Q</Kbd>
          </span>
        </Button>
      </div>
    </header>
  );
}
