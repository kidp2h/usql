
import { Download, Braces, EyeOff } from "lucide-react";
import { CommandGroup, CommandShortcut } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";

interface BaseCommandGroupProps {
  setOpen: (open: boolean) => void;
}

export function ResultCommandGroup({ setOpen }: BaseCommandGroupProps) {
  const { dispatchCommand } = useGlobalEvents();
  return (
    <CommandGroup heading="Result">
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("result-export-csv"); }}>
        <Download className="size-4 text-emerald-500 mr-2" />
        Export CSV
        <CommandShortcut className="text-md">⌘ + ⇧ + C</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("result-export-json"); }}>
        <Braces className="size-4 text-sky-500 mr-2" />
        Export JSON
        <CommandShortcut className="text-md">⌘ + ⇧ + J</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("result-show-all-columns"); }}>
        <EyeOff className="size-4 text-slate-500 mr-2" />
        Show All Columns
        <CommandShortcut className="text-md">⌘ + ⇧ + H</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  );
}
