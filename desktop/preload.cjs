/* Founder OS — preload bridge. Exposes only the platform flag;
   the console itself runs fully sandboxed with contextIsolation. */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("founderOSPlatform", {
  shell: "electron",
  platform: process.platform,
  version: process.versions.electron,
});
