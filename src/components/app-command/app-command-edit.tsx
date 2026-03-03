import { Sparkles, Copy } from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { Shortcut } from "../ui/kbd";

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
        <Shortcut shortcut="⌘ + L" />
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("copy"); }}>
        <Copy className="size-4 text-cyan-500 mr-2" />
        Copy
        <Shortcut shortcut="⌘ + C" />
      </CommandItem>
    </CommandGroup>
  );
}
