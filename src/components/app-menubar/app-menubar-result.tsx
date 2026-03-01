import { Download, Braces, EyeOff } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
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
          <Kbd className="ml-auto text-xs font-bold">⌘ + ⇧ + C</Kbd>
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("result-export-json")}>
          <Braces className="size-4 text-sky-500" />
          Export JSON
          <Kbd className="ml-auto text-xs font-bold">⌘ + ⇧ + J</Kbd>
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem
          onSelect={() => dispatchCommand("result-show-all-columns")}
        >
          <EyeOff className="size-4 text-slate-500" />
          Show All Columns
          <Kbd className="ml-auto text-xs font-bold">⌘ + ⇧ + H</Kbd>
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
