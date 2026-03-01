import * as React from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function useEvent<T extends (...args: any[]) => any>(callback: T): T {
  const ref = React.useRef<T>(callback);

  useIsomorphicLayoutEffect(() => {
    ref.current = callback;
  });

  return React.useCallback((...args: Parameters<T>) => {
    return ref.current(...args);
  }, []) as T;
}
