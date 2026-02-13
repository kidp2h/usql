import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import React from "react"
import { QueryEditor } from "./query-editor/query-editor"

type DrawerViewJsonProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  json: string
}

export function DrawerViewJson({ open, onOpenChange, json }: DrawerViewJsonProps) {
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
                    language="sql"
                    value={json}
                    onChange={() => {}}
                    documentUri={`inmemory://model/view.sql`}
                />
        </div>

      </DrawerContent>
    </Drawer>
  )
}
