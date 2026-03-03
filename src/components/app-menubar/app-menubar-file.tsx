import { FilePlus, FolderOpen, Save, Layers, Sparkles, X, Activity, Check, SaveIcon, SaveAll } from "lucide-react";
import { Shortcut } from "@/components/ui/kbd";
import { MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useTabStore } from "@/stores/tab-store";
import { MdOutlineSaveAs } from "react-icons/md";

export const AppMenubarFile = () => {
  const { dispatchCommand } = useGlobalEvents();
  const isAutoSaveEnabled = useTabStore((state) => state.isAutoSaveEnabled);
  const setAutoSaveEnabled = useTabStore((state) => state.setAutoSaveEnabled);

  return (
    <MenubarMenu>
      <MenubarTrigger>File</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={() => dispatchCommand("open-file")}>
          <FolderOpen className="size-4 text-sky-500" />
          Open File
          <Shortcut shortcut="⌘ + O" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("save")}>
          <Save className="size-4 text-emerald-500" />
          Save
          <Shortcut shortcut="⌘ + S" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("save-as")}>
          <FilePlus className="size-4 text-emerald-400" />
          Save As
          <Shortcut shortcut="⌘ + ⇧ + S" />
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem
          onSelect={(e) => {
            e.preventDefault(); // Keep menu open for toggling
            setAutoSaveEnabled(!isAutoSaveEnabled);
          }}
          className="flex items-center"
        >
          <SaveAll className="size-4 text-amber-500" />
          <span>Auto Save</span>
          {isAutoSaveEnabled && (
            <span className="ml-auto text-primary">
              <Check className="size-5" />
            </span>
          )}
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem onSelect={() => dispatchCommand("close-all-tabs")}>
          <Layers className="size-4 text-orange-500" />
          Close All Tabs
          <Shortcut shortcut="⌘ + ⇧ + W" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("format")}>
          <Sparkles className="size-4 text-violet-500" />
          Format
          <Shortcut shortcut="⌘ + L" />
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem onSelect={() => dispatchCommand("quit")}>
          <X className="size-4 text-red-500" />
          Quit
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  )
}