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
  executeQuery: (payload) => ipcRenderer.invoke("execute-query", payload),
  saveQuery: (payload) => ipcRenderer.invoke("save-query", payload),
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
});

