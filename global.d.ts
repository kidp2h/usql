declare module "*.css" {}

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
        schema: string
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
        table: string
      ) => Promise<{
        ok: boolean;
        columns?: { name: string; isPrimary: boolean; isForeign: boolean }[];
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
        table: string
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
      getLspStatus: () => Promise<{ ok: boolean; ready?: boolean; transport?: string; message?: string }>;

    };
    electronLSP: {
      sendToLSP: (data: string) => void;
      onLSPMessage: (callback: (data: string) => void) => () => void;
      isAvailable: () => boolean;
  };
  }

  interface GlobalThis {
    electron?: Window["electron"];
  }
}

export {};

