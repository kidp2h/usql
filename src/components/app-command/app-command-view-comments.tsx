import * as React from "react";
import { MessageSquareText } from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useSidebarStore } from "@/stores/sidebar-store";

interface BaseCommandGroupProps {
  setOpen: (open: boolean) => void;
}

export function ViewCommentsCommandGroup({ setOpen }: BaseCommandGroupProps) {
  const { dispatchViewComments } = useGlobalEvents();
  const connections = useSidebarStore((state) => state.connections);
  const selectedConnectionId = useSidebarStore(
    (state) => state.selectedConnectionId,
  );

  const activeConnection = React.useMemo(() => {
    return connections.find((c) => c.id === selectedConnectionId);
  }, [connections, selectedConnectionId]);

  const allTables = React.useMemo(() => {
    if (!activeConnection?.children) return [];

    const tables: { id: string; name: string; schemaName?: string }[] = [];

    // Helper to traverse and find table nodes
    activeConnection.children.forEach(node => {
      // Is it a direct table node?
      if (node.id.includes(':table:')) {
        tables.push({ id: node.id, name: node.name });
      }
      // Is it a schema node?
      else if (node.id.includes(':schema:')) {
        const schemaName = node.name;
        node.children?.forEach(subNode => {
          if (subNode.id.includes(':table:')) {
            tables.push({ id: subNode.id, name: subNode.name, schemaName });
          }
        });
      }
    });

    return tables;
  }, [activeConnection]);

  if (!activeConnection || allTables.length === 0) {
    return null;
  }

  return (
    <CommandGroup heading={`View Table Comments (${activeConnection.name})`}>
      {allTables.map((table) => (
        <CommandItem
          key={table.id}
          setOpen={setOpen}
          onSelect={() => {
            dispatchViewComments(
              activeConnection.id,
              activeConnection.name,
              table.schemaName || "public",
              table.name,
            );
          }}
        >
          <MessageSquareText className="size-4 text-emerald-500 mr-2" />
          <span className="flex-1 truncate">
            View comments for {table.schemaName ? `${table.schemaName}.` : ""}{table.name}
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
