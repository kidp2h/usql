export const events = {
  dispatchCommand: (type: string, payload?: any) => {
    globalThis.dispatchEvent(
      new CustomEvent("usql:command", { detail: { type, ...payload } }),
    );
  },
  dispatchAppearance: (type: string, payload?: any) => {
    globalThis.dispatchEvent(
      new CustomEvent("usql:appearance", { detail: { type, ...payload } }),
    );
  },
  dispatchViewComments: (
    connectionId: string,
    connectionName: string,
    schema: string,
    table: string,
  ) => {
    globalThis.dispatchEvent(
      new CustomEvent("usql:view-comments", {
        detail: {
          connectionId,
          connectionName,
          schema,
          table,
        },
      }),
    );
  },
};
