const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {
  testHandlers,
  schemaHandlers,
  tableHandlers,
  columnHandlers,
  indexHandlers,
  queryHandlers,
} = require("./db/handlers.cjs");
const isMac = process.platform === "darwin";

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

    const finalPath =
      fs.existsSync(filePath) && fs.statSync(filePath).isFile()
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
    minWidth: 1366,
    minHeight: 768,
    maxWidth: 1920,
    maxHeight: 1080,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(startUrl);
  win.maximize();

  win.on("close", (event) => {
    const allowClose = win.__allowClose === true;
    if (allowClose) {
      return;
    }

    event.preventDefault();
    event.returnValue = false;

    if (win.__pendingClose) {
      return;
    }

    win.__pendingClose = true;
    win.webContents.send("app-close-request");
  });

  return win;
}

ipcMain.handle("confirm-close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return { ok: false };
  }

  win.__allowClose = true;
  win.__pendingClose = false;
  win.close();
  return { ok: true };
});

ipcMain.handle("cancel-close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return { ok: false };
  }

  win.__allowClose = false;
  win.__pendingClose = false;
  return { ok: true };
});

ipcMain.handle("window-minimize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.minimize();
  }
  return { ok: true };
});

ipcMain.handle("window-maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
  return { ok: true };
});

ipcMain.handle("window-close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.__allowClose = true;
    win.close();
  }
  return { ok: true };
});

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

ipcMain.handle("save-query", async (_event, payload) => {
  if (!payload || typeof payload.content !== "string") {
    return { ok: false, message: "Missing query content" };
  }

  if (payload.filePath && !payload.forceDialog) {
    try {
      await fs.promises.writeFile(payload.filePath, payload.content, "utf8");
      return { ok: true, filePath: payload.filePath };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Save failed",
      };
    }
  }

  const result = await dialog.showSaveDialog({
    title: "Save SQL",
    defaultPath: payload.suggestedName || payload.filePath || "query.sql",
    filters: [
      { name: "SQL", extensions: ["sql"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { ok: true, canceled: true };
  }

  try {
    await fs.promises.writeFile(result.filePath, payload.content, "utf8");
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Save failed",
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
    app.quit();
  }
});

// Error handling
process.on("uncaughtException", (error) => {
  console.error("[Main] Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, _promise) => {
  console.error("[Main] Unhandled rejection:", reason);
});
