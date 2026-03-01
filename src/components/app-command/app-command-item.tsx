import * as React from "react";
import { CommandItem } from "@/components/ui/command";

interface AppCommandItemProps extends React.ComponentPropsWithoutRef<typeof CommandItem> {
  setOpen: (open: boolean) => void;
  onSelect?: (value: string) => void;
}

export const AppCommandItem = React.forwardRef<
  React.ElementRef<typeof CommandItem>,
  AppCommandItemProps
>(({ onSelect, setOpen, ...props }, ref) => {
  return (
    <CommandItem
      ref={ref}
      onSelect={(value) => {
        if (onSelect) {
          onSelect(value);
        }
        setOpen(false);
      }}
      {...props}
    />
  );
});

AppCommandItem.displayName = "AppCommandItem";
