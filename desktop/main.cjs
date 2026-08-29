/* ------------------------------------------------------------------ */
/* Founder OS — Electron shell (Windows / macOS / Linux)               */
/* Loads the production web build from ../dist. Packaged builds read   */
/* the app from resources/ via electron-builder's extraResources.      */
/* ------------------------------------------------------------------ */
const { app, BrowserWindow, shell, Menu, globalShortcut } = require("electron");
const path = require("path");

const isPackaged = app.isPackaged;
const DIST = isPackaged
  ? path.join(process.resourcesPath, "dist")
  : path.join(__dirname, "..", "dist");

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1080,
    minHeight: 640,
    backgroundColor: "#0a1016",
    title: "Founder OS",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(DIST, "index.html"));

  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  /* external links (docs, OAuth) open in the default browser */
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  win.on("closed", () => { win = null; });
}

app.whenReady().then(() => {
  createWindow();

  /* Ctrl+Shift+I toggles devtools in dev builds only */
  if (!isPackaged) {
    globalShortcut.register("CommandOrControl+Shift+I", () => {
      if (win) win.webContents.toggleDevTools();
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => globalShortcut.unregisterAll());
