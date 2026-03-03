import * as React from "react";
import { Command, Option, ArrowBigUp, Mouse, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1.5 font-sans text-[11px] font-medium select-none border border-black/10 dark:border-white/10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]",
        "[[data-slot=shortcut]_svg]:!size-3 [&_svg]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

function Shortcut({ shortcut, className }: { shortcut: string; className?: string }) {
  // Split by " + " or just space
  const parts = shortcut.split(/\s*\+\s*/);

  return (
    <KbdGroup className={cn("ml-auto", className)} data-slot="shortcut">
      {parts.map((part, i) => {
        const symbol = part.trim();
        let content: React.ReactNode = symbol;

        if (symbol === "⌘" || symbol.toUpperCase() === "CMD") {
          content = <Command className="!size-3" />;
        } else if (symbol === "⌥" || symbol.toUpperCase() === "ALT" || symbol.toUpperCase() === "OPT") {
          content = <Option className="!size-3" />;
        } else if (symbol === "⇧" || symbol.toUpperCase() === "SHIFT") {
          content = <ArrowBigUp className="!size-3" />;
        } else if (symbol === "Ctrl") {
          content = "Ctrl";
        } else if (symbol === "Mouse Up") {
          content = <ArrowUp className="!size-3" />;
        } else if (symbol === "Mouse Down") {
          content = <ArrowDown className="!size-3" />;
        }

        return (
          <React.Fragment key={i}>
            <Kbd>{content}</Kbd>
            {i < parts.length - 1 && <span className="text-[10px] text-muted-foreground/50">+</span>}
          </React.Fragment>
        );
      })}
    </KbdGroup>
  );
}

export { Kbd, KbdGroup, Shortcut };
