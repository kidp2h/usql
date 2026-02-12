const { contextBridge, ipcRenderer } = require("electron");

console.log('[Preload] Loading...');

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
});