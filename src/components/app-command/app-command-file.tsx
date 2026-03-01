
import { FolderOpen, Save, FilePlus, Layers, SquareX, FileX, X, Sparkles, Settings2, PanelLeft, ZoomIn, ZoomOut, RotateCcw, Sun, Moon } from "lucide-react";
import { CommandGroup, CommandShortcut } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";

interface FileCommandGroupProps {
  setOpen: (open: boolean) => void;
  setShowSettingsDialog: (open: boolean) => void;
}

export function FileCommandGroup({ setOpen, setShowSettingsDialog }: FileCommandGroupProps) {
  const { dispatchCommand, dispatchAppearance } = useGlobalEvents();
  const { toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  return (
    <CommandGroup heading="File">
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("open-file"); }}>
        <FolderOpen className="size-4 text-sky-500 mr-2" />
        Open File
        <CommandShortcut className="text-md">⌘ + O</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("save"); }}>
        <Save className="size-4 text-emerald-500 mr-2" />
        Save
        <CommandShortcut className="text-md">⌘ + S</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("save-as"); }}>
        <FilePlus className="size-4 text-emerald-400 mr-2" />
        Save As
        <CommandShortcut className="text-md">⌘ + ⇧ + S</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("close-all-tabs"); }}>
        <Layers className="size-4 text-orange-500 mr-2" />
        Close All Tabs
        <CommandShortcut className="text-md">⌘ + ⇧ + W</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("format"); }}>
        <Sparkles className="size-4 text-violet-500 mr-2" />
        Format
        <CommandShortcut className="text-md">⌘ + L</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { setShowSettingsDialog(true); }}>
        <Settings2 className="size-4 text-purple-500 mr-2" />
        Settings
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchCommand("quit"); }}>
        <X className="size-4 text-red-500 mr-2" />
        Quit
        <CommandShortcut className="text-md">⌘ + Q</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { toggleSidebar(); }}>
        <PanelLeft className="size-4 text-sky-500 mr-2" />
        Toggle Sidebar
        <CommandShortcut className="text-md">⌘ + B</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchAppearance("zoom-in"); }}>
        <ZoomIn className="size-4 text-emerald-500 mr-2" />
        Increase Font Size
        <CommandShortcut className="text-md">⌘ + +</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchAppearance("zoom-out"); }}>
        <ZoomOut className="size-4 text-orange-500 mr-2" />
        Decrease Font Size
        <CommandShortcut className="text-md">⌘ + -</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchAppearance("zoom-reset"); }}>
        <RotateCcw className="size-4 text-slate-500 mr-2" />
        Reset Font Size
        <CommandShortcut className="text-md">⌘ + 0</CommandShortcut>
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { toggleTheme(); }}>
        {theme === "dark" ? (
          <Sun className="size-4 text-amber-500 mr-2" />
        ) : (
          <Moon className="size-4 text-indigo-400 mr-2" />
        )}
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
        <CommandShortcut className="text-md">⌘ + ⇧ + D</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  );
}
