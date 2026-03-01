import * as React from "react";
import { useEvent } from "./use-event";

interface UseKeyboardProps {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  onKeyDown: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export function useKeyboard({
  key,
  ctrlKey = false,
  metaKey = false,
  shiftKey = false,
  altKey = false,
  onKeyDown,
  preventDefault = true,
  stopPropagation = false,
}: UseKeyboardProps) {
  const handleKeyDown = useEvent((event: KeyboardEvent) => {
    const isControlOrMeta = ctrlKey || metaKey ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
    const isShift = event.shiftKey === shiftKey;
    const isAlt = event.altKey === altKey;
    const isKeyMatch = event.key.toLowerCase() === key.toLowerCase();

    if (
      isControlOrMeta &&
      isShift &&
      isAlt &&
      isKeyMatch
    ) {
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }
      console.log("Keyboard event", event);
      onKeyDown(event);
    }
  });

  React.useEffect(() => {
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
