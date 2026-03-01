import { Info } from "lucide-react";
import { MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { useGlobalEvents } from "@/hooks/use-global-events";

export const AppMenubarHelp = () => {
  const { dispatchCommand } = useGlobalEvents();
  return (
    <MenubarMenu>
      <MenubarTrigger>Help</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={() => dispatchCommand("open-about")}>
          <Info className="size-4 text-slate-500" />
          About
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
