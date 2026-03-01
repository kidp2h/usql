import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandSeparator } from "../ui/command";
import { FileCommandGroup } from "./app-command-file";
import { RunCommandGroup } from "./app-command-run";
import { ResultCommandGroup } from "./app-command-result";
import { ViewCommentsCommandGroup } from "./app-command-view-comments";
import { HelpCommandGroup } from "./app-command-help";
import { Kbd } from "../ui/kbd";
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
      <CommandInput placeholder="Type a command or search. Press Escape to close" />
      <CommandList>
        <CommandEmpty className="font-medium m-2">
          No result found
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
          <Kbd className="ml-2 font-medium text-xs">Enter</Kbd>
        </div>
        <div className="flex flex-row gap-0.5 items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground">Navigation</span>
          <Kbd className="ml-2 font-medium text-xs">↑</Kbd>
          <Kbd className="ml-2 font-medium text-xs">↓</Kbd>
        </div>
      </div>
    </CommandDialog>
  )
}