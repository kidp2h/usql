import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { QueryEditor } from "./query/query-editor";

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
            readOnly={true}
            value={json}
            onChange={() => { }}
            language="json"
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
