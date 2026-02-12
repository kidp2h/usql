"use client";

import { Copy, Sparkles } from "lucide-react";

import { Kbd } from "@/components/ui/kbd";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";

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
        <h2 className="text-sm font-semibold">SQL Query</h2>
      </div>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Actions</MenubarTrigger>
          <MenubarContent align="end">
            <MenubarItem onSelect={onFormat} disabled={!hasSql}>
              <Sparkles className="size-4" />
              Format
              <MenubarShortcut>
                <Kbd className="opacity-70">⌘ + L</Kbd>
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem onSelect={onCopy} disabled={!hasSql}>
              <Copy className="size-4" />
              Copy
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem
              onSelect={onExecute}
              disabled={!canExecute || isExecuting}
            >
              {isExecuting ? "Running" : "Execute"}
              <MenubarShortcut>
                <Kbd className="opacity-70">⌘ + Enter</Kbd>
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              onSelect={onExplain}
              disabled={!canExecute || isExecuting}
            >
              Explain Analyze
              <MenubarShortcut>
                <Kbd className="opacity-70">⌘ + ⇧ + Enter</Kbd>
              </MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={onClose}>
              Close
              <MenubarShortcut>
                <Kbd className="opacity-70">⌘ + Q</Kbd>
              </MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </header>
  );
}
