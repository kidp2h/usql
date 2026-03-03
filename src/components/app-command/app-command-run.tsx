import { Play, Activity } from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { Shortcut } from "../ui/kbd";

interface BaseCommandGroupProps {
  setOpen: (open: boolean) => void;
}

export function RunCommandGroup({ setOpen }: BaseCommandGroupProps) {
  const { dispatchCommand } = useGlobalEvents();
  return (
    <CommandGroup heading="Run">
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("execute"); }}>
        <Play className="size-4 text-emerald-500 mr-2" />
        Execute
        <Shortcut shortcut="⌘ + Enter" />
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("explain"); }}>
        <Activity className="size-4 text-amber-500 mr-2" />
        Explain Analyze
        <Shortcut shortcut="⌘ + ⇧ + Enter" />
      </CommandItem>
    </CommandGroup>
  );
}
