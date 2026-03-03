import * as React from "react";
import { useSidebarStore } from "@/stores/v2/sidebar-store";

export interface CommentsContext {
  connectionId: string;
  schema: string;
  table: string;
}

export function useCommentsModal() {
  const connections = useSidebarStore((state) => state.connections);

  const [open, setOpen] = React.useState(false);
  const [context, setContext] = React.useState<CommentsContext | null>(null);
  const [data, setData] = React.useState<Array<{ column_name: string; comment: string | null }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const handleViewComments = React.useCallback(
    async (ctx: { connectionId: string; connectionName: string; schema?: string; table?: string }) => {
      if (!ctx.schema || !ctx.table || !window.electron?.executeQuery) return;

      setContext({ connectionId: ctx.connectionId, schema: ctx.schema, table: ctx.table });
      setOpen(true);
      setLoading(true);
      setError(undefined);
      setData([]);

      try {
        const connection = connections.find((item) => item.id === ctx.connectionId);
        if (!connection) throw new Error("Connection not found");

        const query = `SELECT
    column_name,
    col_description('${ctx.schema}.${ctx.table}'::regclass, ordinal_position) AS comment
FROM information_schema.columns
WHERE table_schema = '${ctx.schema}'
  AND table_name = '${ctx.table}'
ORDER BY ordinal_position;`;

        const result = await window.electron.executeQuery({ ...connection, sql: query } as any);

        if (result.ok && result.rows) {
          setData(result.rows as Array<{ column_name: string; comment: string | null }>);
        } else {
          setError(result.message || "Failed to fetch comments");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    },
    [connections],
  );

  return { open, setOpen, context, data, loading, error, handleViewComments };
}