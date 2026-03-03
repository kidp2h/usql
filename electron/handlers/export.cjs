const { dialog, shell } = require("electron");
const fs = require("node:fs");
const { dumpPostgres } = require("../lib/dump.cjs");

function registerExportHandlers(ipcMain) {
  ipcMain.handle("show-save-dialog", async (_event, options) => {
    return dialog.showSaveDialog(options);
  });

  ipcMain.handle("show-open-dialog", async (_event, options) => {
    return dialog.showOpenDialog(options);
  });

  ipcMain.handle(
    "write-file-content",
    async (_event, { filePath, content }) => {
      try {
        await fs.promises.writeFile(filePath, content, "utf8");
        return { ok: true };
      } catch (error) {
        return { ok: false, message: error.message };
      }
    },
  );

  ipcMain.handle("show-item-in-folder", async (_event, filePath) => {
    shell.showItemInFolder(filePath);
    return { ok: true };
  });

  ipcMain.handle("dump:postgres", async (event, options) => {
    return dumpPostgres(options, (line) => {
      event.sender.send("dump:progress", line);
    });
  });
}

module.exports = { registerExportHandlers };
