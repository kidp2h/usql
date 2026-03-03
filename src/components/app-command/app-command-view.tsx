import { Settings2, PanelLeft, ZoomIn, ZoomOut, RotateCcw, Sun, Moon } from "lucide-react";
import { CommandGroup } from "@/components/ui/command";
import { AppCommandItem as CommandItem } from "./app-command-item";
import { useTheme } from "@/hooks/use-theme";
import { useSidebar } from "@/components/ui/sidebar";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { Shortcut } from "../ui/kbd";

interface ViewCommandGroupProps {
  setOpen: (open: boolean) => void;
  setShowSettingsDialog: (open: boolean) => void;
}

export function ViewCommandGroup({ setOpen, setShowSettingsDialog }: ViewCommandGroupProps) {
  const { toggleSidebar } = useSidebar();
  const { dispatchAppearance } = useGlobalEvents();
  const { theme, toggleTheme } = useTheme();

  return (
    <CommandGroup heading="View">
      <CommandItem setOpen={setOpen} onSelect={() => { setShowSettingsDialog(true); }}>
        <Settings2 className="size-4 text-purple-500 mr-2" />
        Settings
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { toggleSidebar(); }}>
        <PanelLeft className="size-4 text-sky-500 mr-2" />
        Toggle Sidebar
        <Shortcut shortcut="⌘ + B" />
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchAppearance("zoom-in"); }}>
        <ZoomIn className="size-4 text-emerald-500 mr-2" />
        Increase Font Size
        <Shortcut shortcut="⌘ + Mouse Up" />
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchAppearance("zoom-out"); }}>
        <ZoomOut className="size-4 text-orange-500 mr-2" />
        Decrease Font Size
        <Shortcut shortcut="⌘ + Mouse Down" />
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { dispatchAppearance("zoom-reset"); }}>
        <RotateCcw className="size-4 text-slate-500 mr-2" />
        Reset Font Size
        <Shortcut shortcut="⌘ + 0" />
      </CommandItem>
      <CommandItem setOpen={setOpen} onSelect={() => { toggleTheme(); }}>
        {theme === "dark" ? (
          <Sun className="size-4 text-amber-500 mr-2" />
        ) : (
          <Moon className="size-4 text-indigo-400 mr-2" />
        )}
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
        <Shortcut shortcut="⌘ + ⇧ + D" />
      </CommandItem>
    </CommandGroup>
  );
}
