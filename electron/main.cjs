const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { registerWindowHandlers } = require("./handlers/window.cjs");
const { registerDbHandlers } = require("./handlers/db.cjs");
const { registerFsHandlers } = require("./handlers/fs.cjs");
const { registerExportHandlers } = require("./handlers/export.cjs");
const { setupAutoUpdater } = require("./autoupdater.cjs");

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
    icon: path.join(__dirname, "../assets/icon.png"),
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

// Initialize Handlers
registerWindowHandlers(ipcMain);
registerDbHandlers(ipcMain);
registerFsHandlers(ipcMain);
registerExportHandlers(ipcMain);

// App lifecycle
app.whenReady().then(async () => {
  const devUrl = process.env.ELECTRON_START_URL;
  const { url } = devUrl ? { url: devUrl } : await startStaticServer();

  const mainWindow = createWindow(url);
  setupAutoUpdater(mainWindow);

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

