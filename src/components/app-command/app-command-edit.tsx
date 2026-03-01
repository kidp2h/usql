
import { Sparkles, Copy } from "lucide-react";
import { CommandGroup, CommandShortcut } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";

interface BaseCommandGroupProps {
  setOpen: (open: boolean) => void;
}

export function EditCommandGroup({ setOpen }: BaseCommandGroupProps) {
  const { dispatchCommand } = useGlobalEvents();
  return (
    <CommandGroup heading="Edit">
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("format"); }}>
        <Sparkles className="size-4 text-violet-500 mr-2" />
        Format
        <CommandShortcut className="text-md">⌘ + L</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("copy"); }}>
        <Copy className="size-4 text-cyan-500 mr-2" />
        Copy
        <CommandShortcut className="text-md">⌘ + C</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  );
}
