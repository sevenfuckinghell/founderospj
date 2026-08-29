# Founder OS — Running on Windows

Three ways to run it, from fastest to most "installed".

---

## Option A — Install as a Windows app (no build, ~10 seconds)

The console is PWA-installable from Edge or Chrome:

1. Open the app URL in **Microsoft Edge** or **Google Chrome**
2. Click the **install icon** in the address bar (small monitor with a down arrow)
   — or Menu → **Apps → Install Founder OS**
3. It now launches from the Start Menu in its own window, with a taskbar entry

This runs the exact production build, offline-capable, with the OS taskbar icon.

---

## Option B — Build the native `.exe` installer (recommended for teams)

Produces a real Windows installer (`Founder OS Setup 4.2.0.exe`) plus a
portable executable, via Electron.

**Prerequisites**
- [Node.js 20 LTS](https://nodejs.org) (check with `node -v`)
- Windows 10/11

**One-click build**
```
Double-click:  scripts\build-desktop.bat
```

**Or manually**
```powershell
npm install              # web dependencies
npm run build            # production bundle -> dist\
cd desktop
npm install              # Electron + electron-builder
npm run dist             # build web + package Windows installer
```

**Output**: `desktop\release\`
- `Founder OS Setup 4.2.0.exe` — NSIS installer (Start Menu + Desktop shortcuts)
- `Founder OS 4.2.0.exe` — portable, runs from anywhere

> First packaging run downloads the Electron binaries (~100 MB).
> Windows SmartScreen may say "Windows protected your PC" for the unsigned
> build — click **More info → Run anyway**.

---

## Option C — Run the dev server

```
Double-click:  scripts\run-local.bat
```
Then open `http://localhost:5173`. Hot-reloads on edit. `Ctrl+Shift+I` opens
DevTools inside the Electron shell (`cd desktop && npm start`).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm: command not found` | Install Node.js 20 LTS, restart the terminal |
| PowerShell blocks `.bat` scripts | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or double-click the `.bat` from Explorer instead |
| Electron download stalls | Corporate proxy — set `ELECTRON_MIRROR` or `HTTPS_PROXY` env vars |
| Blank window after build | Ensure `npm run build` ran before packaging (the `.bat` handles this) |
| Antivirus flags the `.exe` | Expected for unsigned builds; sign with a code-signing cert for distribution |

---

## Where things live

```
founder-os/
├── dist/                      production web build (packaged into the exe)
├── desktop/
│   ├── main.cjs               Electron main process
│   ├── preload.cjs            sandboxed bridge
│   └── package.json           electron-builder config (NSIS + portable)
├── scripts/
│   ├── run-local.bat          dev server, one click
│   └── build-desktop.bat      full .exe build, one click
└── public/manifest.webmanifest  PWA install (Option A)
```

The desktop shell is deliberately thin — the entire product lives in the web
build, so the browser, PWA and `.exe` always run identical code.
