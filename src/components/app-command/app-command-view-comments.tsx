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
  const selectedSchema = useSidebarStore((state) => state.selectedSchema);

  const activeConnection = React.useMemo(() => {
    return connections.find((c) => c.config.id === selectedConnectionId);
  }, [connections, selectedConnectionId]);

  const activeSchema = React.useMemo(() => {
    if (!activeConnection || !selectedSchema) return undefined;
    return activeConnection.schemas.find((s) => s.name === selectedSchema.name);
  }, [activeConnection, selectedSchema]);

  if (!activeConnection || !activeSchema || activeSchema.tables.length === 0) {
    return null;
  }

  return (
    <CommandGroup heading={`View Comments (${activeSchema.name})`}>
      {activeSchema.tables.map((table) => (
        <CommandItem
          key={table}
          setOpen={setOpen}
          onSelect={() => {
            dispatchViewComments(
              activeConnection.config.id,
              activeConnection.config.name,
              activeSchema.name,
              table,
            );
          }}
        >
          <MessageSquareText className="size-4 text-emerald-500 mr-2" />
          View table comments for {table}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
