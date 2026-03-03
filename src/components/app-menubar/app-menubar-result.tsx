import { Download, Braces, EyeOff } from "lucide-react";
import { Kbd, Shortcut } from "@/components/ui/kbd";
import { MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { useGlobalEvents } from "@/hooks/use-global-events";

export const AppMenubarResult = () => {
  const { dispatchCommand } = useGlobalEvents();
  return (
    <MenubarMenu>
      <MenubarTrigger>Result</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={() => dispatchCommand("result-export-csv")}>
          <Download className="size-4 text-emerald-500" />
          Export CSV
          <Shortcut shortcut="⌘ + ⇧ + C" />
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("result-export-json")}>
          <Braces className="size-4 text-sky-500" />
          Export JSON
          <Shortcut shortcut="⌘ + ⇧ + J" />
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
