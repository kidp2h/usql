const { BrowserWindow } = require("electron");

function registerWindowHandlers(ipcMain) {
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
}

module.exports = { registerWindowHandlers };
