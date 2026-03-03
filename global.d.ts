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
        columns?: { name: string; isPrimary: boolean; isForeign: boolean; dataType: string; references?: string }[];
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
      readQuery: (filePath: string) => Promise<{
        ok: boolean;
        content?: string;
        message?: string;
      }>;
      getSchemas: (payload: any) => Promise<{
        ok: boolean;
        schemas?: { name: string; tableCount: number }[];
        message?: string;
      }>;
      getTables: (connection: any, schema: string) => Promise<{
        ok: boolean;
        tables?: { name: string; size: number; columnCount: number; indexCount: number }[];
        message?: string;
      }>;
      getFileStats: (filePaths: string[]) => Promise<{
        ok: boolean;
        stats?: { filePath: string; size: number; mtimeMs: number; ok: boolean }[];
        message?: string;
      }>;
      onAppCloseRequest: (handler: () => void) => void;
      removeAppCloseRequest: (handler: () => void) => void;
      confirmClose: () => Promise<{ ok: boolean }>;
      cancelClose: () => Promise<{ ok: boolean }>;
      openExternal: (url: string) => Promise<void>;
      showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
      writeFileContent: (payload: { filePath: string; content: string }) => Promise<{ ok: boolean; message?: string }>;
      showItemInFolder: (filePath: string) => Promise<{ ok: boolean }>;
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;
      dumpPostgres: (options: any) => Promise<DumpResult | null>;
      showOpenDialog: (options: any) => Promise<any>;
      getFullMetadata: (payload: any) => Promise<{
        ok: boolean;
        metadata?: {
          name: string;
          tableCount: number;
          tables: {
            name: string;
            size: number;
            columnCount: number;
            indexCount: number;
            columns: {
              name: string;
              isPrimary: boolean;
              isForeign: boolean;
              dataType: string;
              references?: string;
            }[];
            indexes: string[];
          }[];
        }[];
        message?: string;
      }>;
    };
    updater: UpdaterAPI;
  }
  interface UpdaterAPI {
    onUpdateAvailable: (cb: (info: { version: string }) => void) => void;
    onUpdateNotAvailable: (cb: () => void) => void;
    onDownloadProgress: (cb: (progress: { percent: number }) => void) => void;
    onUpdateDownloaded: (cb: () => void) => void;
    onError: (cb: (msg: string) => void) => void;
    startDownload: () => void;
    installUpdate: () => void;
    checkForUpdates: () => void;
  }
  interface GlobalThis {
    electron?: Window["electron"];
    updater?: Window["updater"];
  }
}


export { };
