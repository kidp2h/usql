declare module "*.css" { }

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

declare global {
  interface Window {
    electron: {
      ping: () => string;
      testConnection: (payload: {
        dbType: "postgres" | "mysql" | "mssql" | "sqlite";
        host: string;
        port: string;
        database: string;
        username: string;
        password: string;
        ssl: boolean;
        readOnly: boolean;
        name: string;
      }) => Promise<{ ok: boolean; message?: string }>;
      getSchemas: (payload: {
        dbType: "postgres" | "mysql" | "mssql" | "sqlite";
        host: string;
        port: string;
        database: string;
        username: string;
        password: string;
        ssl: boolean;
        readOnly: boolean;
        name: string;
      }) => Promise<{ ok: boolean; schemas?: string[]; message?: string }>;
      getTables: (
        payload: {
          dbType: "postgres" | "mysql" | "mssql" | "sqlite";
          host: string;
          port: string;
          database: string;
          username: string;
          password: string;
          ssl: boolean;
          readOnly: boolean;
          name: string;
        },
        schema: string,
      ) => Promise<{ ok: boolean; tables?: string[]; message?: string }>;
      getColumns: (
        payload: {
          dbType: "postgres" | "mysql" | "mssql" | "sqlite";
          host: string;
          port: string;
          database: string;
          username: string;
          password: string;
          ssl: boolean;
          readOnly: boolean;
          name: string;
        },
        schema: string,
        table: string,
      ) => Promise<{
        ok: boolean;
        columns?: { name: string; isPrimary: boolean; isForeign: boolean; dataType: string }[];
        message?: string;
      }>;
      getIndexes: (
        payload: {
          dbType: "postgres" | "mysql" | "mssql" | "sqlite";
          host: string;
          port: string;
          database: string;
          username: string;
          password: string;
          ssl: boolean;
          readOnly: boolean;
          name: string;
        },
        schema: string,
        table: string,
      ) => Promise<{ ok: boolean; indexes?: string[]; message?: string }>;
      executeQuery: (payload: {
        dbType: "postgres" | "mysql" | "mssql" | "sqlite";
        host: string;
        port: string;
        database: string;
        username: string;
        password: string;
        ssl: boolean;
        readOnly: boolean;
        name: string;
        sql: string;
      }) => Promise<{
        ok: boolean;
        rows?: Record<string, unknown>[];
        rowCount?: number;
        message?: string;
      }>;
      saveQuery: (payload: {
        content: string;
        suggestedName?: string;
        filePath?: string;
        forceDialog?: boolean;
      }) => Promise<{
        ok: boolean;
        canceled?: boolean;
        filePath?: string;
        message?: string;
      }>;
      onAppCloseRequest: (handler: () => void) => void;
      removeAppCloseRequest: (handler: () => void) => void;
      confirmClose: () => Promise<{ ok: boolean }>;
      cancelClose: () => Promise<{ ok: boolean }>;
      openExternal: (url: string) => Promise<void>;
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;
    };
  }

  interface GlobalThis {
    electron?: Window["electron"];
  }
}

export { };
