import { FilePlus, FolderOpen, Save, Layers, SquareX, FileX, Sparkles, X } from "lucide-react";
import { Kbd, Shortcut } from "@/components/ui/kbd";
import { MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { useGlobalEvents } from "@/hooks/use-global-events";

export const AppMenubarFile = () => {
  const { dispatchCommand } = useGlobalEvents();
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