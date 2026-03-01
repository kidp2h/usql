export type QueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  error?: string;
};
