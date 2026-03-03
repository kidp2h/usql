import { Download, Braces, EyeOff } from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { Shortcut } from "../ui/kbd";

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
        <Shortcut shortcut="⌘ + ⇧ + C" />
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("result-export-json"); }}>
        <Braces className="size-4 text-sky-500 mr-2" />
        Export JSON
        <Shortcut shortcut="⌘ + ⇧ + J" />
      </CommandItem>
    </CommandGroup>
  );
}
