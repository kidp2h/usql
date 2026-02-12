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
  getLspStatus: () => ipcRenderer.invoke("get-lsp-status"), // Changed from getLspPort
});

// LSP API - IPC Communication
contextBridge.exposeInMainWorld("electronLSP", {
  /**
   * Send data to LSP server in main process
   * @param {string} data - JSON stringified LSP message
   */
  sendToLSP: (data) => {
    try {
      ipcRenderer.send('client-to-lsp', data);
    } catch (error) {
      console.error('[Preload] Error sending to LSP:', error);
    }
  },

  /**
   * Receive data from LSP server
   * @param {Function} callback - Handler for LSP messages
   * @returns {Function} - Cleanup function to remove listener
   */
  onLSPMessage: (callback) => {
    const handler = (event, data) => {
      try {
        callback(data);
      } catch (error) {
        console.error('[Preload] Error in LSP message handler:', error);
      }
    };

    ipcRenderer.on('lsp-to-client', handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('lsp-to-client', handler);
    };
  },

  /**
   * Check if LSP is available
   * @returns {boolean}
   */
  isAvailable: () => {
    return true;
  },
});

console.log('[Preload] electronLSP API exposed');