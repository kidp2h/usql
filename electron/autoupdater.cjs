const { autoUpdater } = require("electron-updater"); // ✅
const { ipcMain } = require("electron");
const log = require("electron-log");

// Cấu hình log
autoUpdater.logger = log;
autoUpdater.autoDownload = false; // Hỏi user trước khi tải

function setupAutoUpdater(win) {
  // Kiểm tra update khi app khởi động
  autoUpdater.checkForUpdates();

  // Có update mới
  autoUpdater.on("update-available", (info) => {
    win.webContents.send("update-available", info);
  });

  // Không có update
  autoUpdater.on("update-not-available", () => {
    win.webContents.send("update-not-available");
  });

  // Tiến trình tải
  autoUpdater.on("download-progress", (progress) => {
    win.webContents.send("download-progress", progress);
  });

  // Tải xong
  autoUpdater.on("update-downloaded", () => {
    win.webContents.send("update-downloaded");
  });

  // Lỗi
  autoUpdater.on("error", (err) => {
    win.webContents.send("update-error", err.message);
  });

  // Nhận lệnh từ renderer
  ipcMain.on("start-download", () => autoUpdater.downloadUpdate());
  ipcMain.on("install-update", () => autoUpdater.quitAndInstall());
  ipcMain.on("check-for-updates", () => autoUpdater.checkForUpdates());
}

module.exports = { setupAutoUpdater };
