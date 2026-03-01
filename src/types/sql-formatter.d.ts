declare module "sql-formatter" {
  export function format(
    query: string,
    options?: {
      language?: string;
      tabWidth?: number;
      keywordCase?: "upper" | "lower" | "preserve";
      linesBetweenQueries?: number;
    },
  ): string;
}
