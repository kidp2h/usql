const fs = require("node:fs");
const { dialog } = require("electron");

function registerFsHandlers(ipcMain) {
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

  ipcMain.handle("read-query", async (_event, filePath) => {
    if (!filePath) {
      return { ok: false, message: "Missing file path" };
    }

    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      return { ok: true, content };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Read failed",
      };
    }
  });

  ipcMain.handle("get-file-stats", async (_event, filePaths) => {
    if (!Array.isArray(filePaths)) {
      return { ok: false, message: "Invalid file paths" };
    }

    try {
      const stats = await Promise.all(
        filePaths.map(async (filePath) => {
          try {
            const s = await fs.promises.stat(filePath);
            return { filePath, size: s.size, mtimeMs: s.mtimeMs, ok: true };
          } catch (_e) {
            return { filePath, ok: false };
          }
        }),
      );
      return { ok: true, stats };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Stats failed",
      };
    }
  });
}

module.exports = { registerFsHandlers };
