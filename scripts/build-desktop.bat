@echo off
title Founder OS - Windows desktop build
echo.
echo  FOUNDER OS - building the Windows desktop app
echo  Requires: Node.js 20 LTS (https://nodejs.org)
echo.
echo  [1/4] Installing web dependencies...
call npm install
if errorlevel 1 goto :fail
echo.
echo  [2/4] Building production web bundle...
call npm run build
if errorlevel 1 goto :fail
echo.
echo  [3/4] Installing Electron shell...
cd desktop
call npm install
if errorlevel 1 goto :fail
echo.
echo  [4/4] Packaging installer (this can take a few minutes)...
call npx electron-builder --win
if errorlevel 1 goto :fail
echo.
echo  DONE. Your installer is in: desktop\release\
echo    - "Founder OS Setup 4.2.0.exe"  (installer)
echo    - "Founder OS 4.2.0.exe"        (portable)
echo.
pause
exit /b 0

:fail
echo.
echo  Build failed. See messages above.
pause
exit /b 1
