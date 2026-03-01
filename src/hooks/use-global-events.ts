import { useEvent } from "./use-event";
import { events as globalEvents } from "@/lib/events";

export function useGlobalEvents() {
  const dispatchCommand = useEvent((type: string, payload?: any) => {
    globalEvents.dispatchCommand(type, payload);
  });

  const dispatchAppearance = useEvent((type: string, payload?: any) => {
    globalEvents.dispatchAppearance(type, payload);
  });

  const dispatchViewComments = useEvent(
    (
      connectionId: string,
      connectionName: string,
      schema: string,
      table: string,
    ) => {
      globalEvents.dispatchViewComments(
        connectionId,
        connectionName,
        schema,
        table,
      );
    },
  );

  return {
    dispatchCommand,
    dispatchAppearance,
    dispatchViewComments,
  };
}
