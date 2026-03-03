const { contextBridge, ipcRenderer, shell } = require("electron");

console.log("[Preload] Loading...");

// Database & App APIs
contextBridge.exposeInMainWorld("electron", {
  ping: () => "pong",
  testConnection: (payload) => ipcRenderer.invoke("test-connection", payload),
  getSchemas: (payload) => ipcRenderer.invoke("get-schemas", payload),
  getTables: (connection, schema) =>
    ipcRenderer.invoke("get-tables", { connection, schema }),
  getColumns: (connection, schema, table) =>
    ipcRenderer.invoke("get-columns", { connection, schema, table }),
  getIndexes: (connection, schema, table) =>
    ipcRenderer.invoke("get-indexes", { connection, schema, table }),
  getFullMetadata: (payload) =>
    ipcRenderer.invoke("get-full-metadata", payload),
  executeQuery: (payload) => ipcRenderer.invoke("execute-query", payload),
  saveQuery: (payload) => ipcRenderer.invoke("save-query", payload),
  readQuery: (filePath) => ipcRenderer.invoke("read-query", filePath),
  getFileStats: (filePaths) => ipcRenderer.invoke("get-file-stats", filePaths),
  onAppCloseRequest: (handler) => {
    ipcRenderer.on("app-close-request", handler);
    return () => ipcRenderer.removeListener("app-close-request", handler);
  },
  removeAppCloseRequest: (handler) => {
    ipcRenderer.removeListener("app-close-request", handler);
  },
  confirmClose: () => ipcRenderer.invoke("confirm-close"),
  cancelClose: () => ipcRenderer.invoke("cancel-close"),
  openExternal: (url) => shell.openExternal(url),
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowClose: () => ipcRenderer.invoke("window-close"),
  showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),
  writeFileContent: (payload) =>
    ipcRenderer.invoke("write-file-content", payload),
  showItemInFolder: (filePath) =>
    ipcRenderer.invoke("show-item-in-folder", filePath),
  showOpenDialog: (options) => ipcRenderer.invoke("show-open-dialog", options),
  dumpPostgres: (options) => ipcRenderer.invoke("dump:postgres", options),
});

contextBridge.exposeInMainWorld("updater", {
  onUpdateAvailable: (handler) =>
    ipcRenderer.on("update-available", (_, info) => handler(info)),
  onDownloadProgress: (handler) =>
    ipcRenderer.on("download-progress", (_, progress) => handler(progress)),
  onUpdateDownloaded: (handler) =>
    ipcRenderer.on("update-downloaded", () => handler()),
  onError: (handler) =>
    ipcRenderer.on("update-error", (_, error) => handler(error)),
});

