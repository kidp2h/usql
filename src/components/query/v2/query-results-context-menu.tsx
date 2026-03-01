import * as React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { Copy, FileJson } from "lucide-react";

interface QueryResultsContextMenuProps {
  children: React.ReactNode;
  onCopy: () => void;
  onCopyInStatement: () => void;
}

export function QueryResultsContextMenu({
  children,
  onCopy,
  onCopyInStatement,
}: QueryResultsContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onCopy}>
          <Copy className="mr-2 size-4" />
          <span>Copy</span>
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopyInStatement}>
          <FileJson className="mr-2 size-4" />
          <span>Copy as IN statement</span>
          <ContextMenuShortcut>⌘ + ⇧ + I</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
