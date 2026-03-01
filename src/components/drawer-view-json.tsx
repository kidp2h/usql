import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { QueryEditor } from "./query-editor/query-editor";

type DrawerViewJsonProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  json: string;
};

export function DrawerViewJson({
  open,
  onOpenChange,
  json,
}: DrawerViewJsonProps) {
  return (
    <Drawer direction="bottom" open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>View JSON</DrawerTitle>
          <DrawerDescription>Formatted JSON</DrawerDescription>
        </DrawerHeader>

        <div className="no-scrollbar overflow-y-auto px-4 h-300">
          <QueryEditor
            readonly={true}
            language="json"
            value={json}
            onChange={() => { }}
            documentUri={`inmemory://model/view.sql`}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
