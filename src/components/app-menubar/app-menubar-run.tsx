import { Play, Activity } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { useGlobalEvents } from "@/hooks/use-global-events";

export const AppMenubarRun = () => {
  const { dispatchCommand } = useGlobalEvents();
  return (
    <MenubarMenu>
      <MenubarTrigger>Run</MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={() => dispatchCommand("execute")}>
          <Play className="size-4 text-emerald-500" />
          Execute
          <Kbd className="ml-auto text-xs font-bold">⌘ + Enter</Kbd>
        </MenubarItem>
        <MenubarItem onSelect={() => dispatchCommand("explain")}>
          <Activity className="size-4 text-amber-500" />
          Explain Analyze
          <Kbd className="ml-auto text-xs font-bold">⌘ + ⇧ + Enter</Kbd>
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
};
