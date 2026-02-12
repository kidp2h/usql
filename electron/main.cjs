const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { Duplex } = require("stream");
const {
  testHandlers,
  schemaHandlers,
  tableHandlers,
  columnHandlers,
  indexHandlers,
  queryHandlers,
} = require("./db/test-handlers.cjs");
const { createSQLLanguageServer } = require('../lsp/sql.cjs');

const isMac = process.platform === "darwin";
const lspState = {
  connection: null,
  readerStream: null,
  writerStream: null,
  ready: false,
};

// Custom Duplex Stream cho IPC
class IPCStream extends Duplex {
  constructor(channel) {
    super();
    this.channel = channel;
    this.webContents = null;
  }

  setWebContents(webContents) {
    this.webContents = webContents;
  }

  _write(chunk, encoding, callback) {
    if (this.webContents && !this.webContents.isDestroyed()) {
      try {
        this.webContents.send(this.channel, chunk.toString('utf-8'));
        callback();
      } catch (error) {
        console.error('[LSP] Error writing to IPC:', error);
        callback(error);
      }
    } else {
      callback(new Error('WebContents is destroyed'));
    }
  }

  _read(size) {
    // Data will be pushed via receive()
  }

  receive(data) {
    try {
      this.push(Buffer.from(data, 'utf-8'));
    } catch (error) {
      console.error('[LSP] Error receiving IPC data:', error);
    }
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
      return "text/javascript";
    case ".json":
      return "application/json";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    case ".woff2":
      return "font/woff2";
    case ".woff":
      return "font/woff";
    default:
      return "application/octet-stream";
  }
}

function startStaticServer() {
  const outDir = path.join(__dirname, "..", "out");

  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end();
      return;
    }

    const urlPath = req.url.split("?")[0];
    const safePath = path
      .normalize(decodeURIComponent(urlPath))
      .replace(/^\.\.[\\/]/, "");
    const filePath = path.join(outDir, safePath);

    const finalPath = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
      ? filePath
      : path.join(outDir, "index.html");

    fs.readFile(finalPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }

      res.writeHead(200, { "Content-Type": getContentType(finalPath) });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

function createWindow(startUrl) {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(startUrl);

  // Start LSP khi window đã load xong
  win.webContents.on('did-finish-load', () => {
    startLspServer(win.webContents);
  });

  return win;
}

function startLspServer(webContents) {
  if (lspState.ready) {
    console.log('[LSP] Server already running');
    return;
  }

  console.log('[LSP] Starting SQL Language Server with IPC...');

  try {
    // Tạo IPC streams
    lspState.readerStream = new IPCStream('lsp-to-client');
    lspState.writerStream = new IPCStream('lsp-to-client');

    lspState.readerStream.setWebContents(webContents);
    lspState.writerStream.setWebContents(webContents);

    // Handle messages từ renderer process
    ipcMain.removeAllListeners('client-to-lsp');
    ipcMain.on('client-to-lsp', (event, data) => {
      if (lspState.readerStream) {
        lspState.readerStream.receive(data);
      }
    });

    // Configuration cho SQL Language Server
    const config = {
      dialect: 'generic', // hoặc 'mysql', 'postgres', 'sqlite3', 'mssql'
      connections: [],
    };

    // Tạo SQL Language Server với IPC transport
    lspState.connection = createSQLLanguageServer({
      reader: lspState.readerStream,
      writer: lspState.writerStream,
    }, config);

    lspState.ready = true;
    console.log('[LSP] SQL Language Server started successfully via IPC');

  } catch (error) {
    console.error('[LSP] Failed to start SQL Language Server:', error);
    lspState.ready = false;
  }
}

function cleanupLSP() {
  console.log('[LSP] Cleaning up LSP Server...');
  
  if (lspState.connection) {
    try {
      lspState.connection.dispose();
    } catch (error) {
      console.error('[LSP] Error disposing LSP connection:', error);
    }
    lspState.connection = null;
  }

  if (lspState.readerStream) {
    lspState.readerStream.destroy();
    lspState.readerStream = null;
  }

  if (lspState.writerStream) {
    lspState.writerStream.destroy();
    lspState.writerStream = null;
  }

  ipcMain.removeAllListeners('client-to-lsp');
  lspState.ready = false;
}

// Database handlers
ipcMain.handle("test-connection", async (_event, payload) => {
  if (!payload || !payload.dbType) {
    return { ok: false, message: "Missing database type" };
  }

  const handler = testHandlers[payload.dbType];
  if (!handler) {
    return { ok: false, message: "Unsupported database type" };
  }

  return handler(payload);
});

ipcMain.handle("get-schemas", async (_event, payload) => {
  if (!payload || !payload.dbType) {
    return { ok: false, message: "Missing database type" };
  }

  const handler = schemaHandlers[payload.dbType];
  if (!handler) {
    return { ok: false, message: "Unsupported database type" };
  }

  return handler(payload);
});

ipcMain.handle("get-tables", async (_event, payload) => {
  if (!payload || !payload.connection || !payload.schema) {
    return { ok: false, message: "Missing table request payload" };
  }

  const handler = tableHandlers[payload.connection.dbType];
  if (!handler) {
    return { ok: false, message: "Unsupported database type" };
  }

  return handler(payload.connection, payload.schema);
});

ipcMain.handle("get-columns", async (_event, payload) => {
  if (!payload || !payload.connection || !payload.schema || !payload.table) {
    return { ok: false, message: "Missing column request payload" };
  }

  const handler = columnHandlers[payload.connection.dbType];
  if (!handler) {
    return { ok: false, message: "Unsupported database type" };
  }

  return handler(payload.connection, payload.schema, payload.table);
});

ipcMain.handle("get-indexes", async (_event, payload) => {
  if (!payload || !payload.connection || !payload.schema || !payload.table) {
    return { ok: false, message: "Missing index request payload" };
  }

  const handler = indexHandlers[payload.connection.dbType];
  if (!handler) {
    return { ok: false, message: "Unsupported database type" };
  }

  return handler(payload.connection, payload.schema, payload.table);
});

ipcMain.handle("execute-query", async (_event, payload) => {
  if (!payload || !payload.dbType || !payload.sql) {
    return { ok: false, message: "Missing query payload" };
  }

  const handler = queryHandlers[payload.dbType];
  if (!handler) {
    return { ok: false, message: "Unsupported database type" };
  }

  return handler(payload, payload.sql);
});

// LSP status handler (thay cho get-lsp-port)
ipcMain.handle("get-lsp-status", async () => {
  try {
    console.log('[LSP] get-lsp-status request');
    
    if (!lspState.ready) {
      return { ok: false, message: "LSP server not ready" };
    }

    console.log('[LSP] get-lsp-status response: ready');
    return { ok: true, ready: true, transport: 'ipc' };
  } catch (error) {
    console.error('[LSP] get-lsp-status error', error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to get LSP status",
    };
  }
});

// App lifecycle
app.whenReady().then(async () => {
  const devUrl = process.env.ELECTRON_START_URL;
  const { url } = devUrl ? { url: devUrl } : await startStaticServer();

  createWindow(url);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(url);
    }
  });
});

app.on("window-all-closed", () => {
  if (!isMac) {
    cleanupLSP();
    app.quit();
  }
});

app.on("before-quit", () => {
  cleanupLSP();
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled rejection:', reason);
});