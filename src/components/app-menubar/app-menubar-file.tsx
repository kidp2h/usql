import { FilePlus, FolderOpen, Save, Layers, SquareX, FileX, Sparkles, X } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
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
          <Kbd className="ml-auto text-xs font-bold">⌘ + O</Kbd>
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("save")}>
          <Save className="size-4 text-emerald-500" />
          Save
          <Kbd className="ml-auto text-xs font-bold">⌘ + S</Kbd>
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("save-as")}>
          <FilePlus className="size-4 text-emerald-400" />
          Save As
          <Kbd className="ml-auto text-xs font-bold">⌘ + ⇧ + S</Kbd>
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem onSelect={() => dispatchCommand("close-all-tabs")}>
          <Layers className="size-4 text-orange-500" />
          Close All Tabs
          <Kbd className="ml-auto text-xs font-bold">⌘ + ⇧ + W</Kbd>
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("format")}>
          <Sparkles className="size-4 text-violet-500" />
          Format
          <Kbd className="ml-auto text-xs font-bold">⌘ + L</Kbd>
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