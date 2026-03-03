import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandSeparator } from "../ui/command";
import { FileCommandGroup } from "./app-command-file";
import { RunCommandGroup } from "./app-command-run";
import { ResultCommandGroup } from "./app-command-result";
import { ViewCommentsCommandGroup } from "./app-command-view-comments";
import { HelpCommandGroup } from "./app-command-help";
import { SearchX } from "lucide-react";
import { Kbd, Shortcut } from "../ui/kbd";
import { useKeyboard } from "@/hooks/use-keyboard";

export const AppCommand = ({
  open,
  setOpen,
  setShowSettingsDialog,
  setShowAboutDialog,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  setShowSettingsDialog: (open: boolean) => void;
  setShowAboutDialog: (open: boolean) => void;
}) => {
  useKeyboard({
    key: "p",
    ctrlKey: true,
    metaKey: true,
    shiftKey: true,
    onKeyDown: () => setOpen(true),
  });
  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
      <CommandInput
        placeholder="Search for commands..."
        suffix={
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Press</span>
            <Kbd className="h-5 min-w-5 px-1 bg-muted/50 border-muted-foreground/20 text-[10px] shadow-none mr-1">Esc</Kbd>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">to close</span>
          </div>
        }
      />
      <CommandList>
        <CommandEmpty className="py-12 text-center flex flex-col items-center justify-center gap-3 select-none">
          <div className="bg-muted rounded-full p-4 animate-in fade-in zoom-in duration-300">
            <SearchX className="size-8 text-muted-foreground stroke-[1.5]" />
          </div>
          <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150 fill-mode-both">
            <p className="text-sm font-semibold tracking-tight">No results found</p>
            <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed mx-auto">
              We couldn't find any commands matching your search. Try another keyword.
            </p>
          </div>
        </CommandEmpty>

        <FileCommandGroup setOpen={setOpen} setShowSettingsDialog={setShowSettingsDialog} />
        <CommandSeparator />
        <RunCommandGroup setOpen={setOpen} />
        <CommandSeparator />
        <ResultCommandGroup setOpen={setOpen} />
        <CommandSeparator />
        <ViewCommentsCommandGroup setOpen={setOpen} />
        <CommandSeparator />
        <HelpCommandGroup setOpen={setOpen} setShowAboutDialog={setShowAboutDialog} />

      </CommandList>
      <CommandSeparator />
      <div className="p-2 flex flex-row gap-3 items-center justify-end">
        <div className="flex flex-row gap-0.5 items-center">
          <span className="text-xs font-medium text-muted-foreground">Execute</span>
          <Shortcut shortcut="Enter" className="pl-1" />
        </div>
        <div className="flex flex-row gap-0.5 items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground">Navigation</span>
          <Shortcut shortcut="↑" className="pl-1" />
          <Shortcut shortcut="↓" className="pl-1" />
        </div>
      </div>
    </CommandDialog>
  )
}